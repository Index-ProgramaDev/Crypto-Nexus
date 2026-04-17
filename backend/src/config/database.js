import { PrismaClient } from '@prisma/client';
import { config } from './index.js';
import { logger } from './logger.js';

// ============================================================================
// PRODUCTION-GRADE DATABASE CONFIGURATION
// ============================================================================

// PrismaClient singleton - prevents multiple instances in development
let prisma;

if (!globalThis.__prisma) {
  globalThis.__prisma = new PrismaClient({
    log: config.nodeEnv === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
    // Neon-specific: optimize connection pooling for serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

prisma = globalThis.__prisma;

// ============================================================================
// DATABASE HEALTH CHECK
// ============================================================================

/**
 * Perform a lightweight health check query
 * Uses SELECT 1 for minimal overhead
 */
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, latency: null };
  } catch (error) {
    return { 
      healthy: false, 
      error: classifyError(error),
      retryable: isRetryableError(error)
    };
  }
}

// ============================================================================
// CONNECTION WITH RETRY LOGIC
// ============================================================================

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

/**
 * Exponential backoff delay calculation
 */
function getRetryDelay(attempt) {
  const delay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt),
    MAX_RETRY_DELAY_MS
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Classify database errors for appropriate handling
 */
function classifyError(error) {
  const errorCode = error.code || error.message;
  
  // Connection errors
  if (errorCode?.includes('P1001')) {
    return { 
      type: 'CONNECTION_REFUSED', 
      message: 'Cannot reach database server. Check DATABASE_URL and network.',
      retryable: true 
    };
  }
  
  if (errorCode?.includes('P1002')) {
    return { 
      type: 'CONNECTION_TIMEOUT', 
      message: 'Database connection timed out. Server may be under load.',
      retryable: true 
    };
  }
  
  // Authentication errors
  if (errorCode?.includes('P1000') || errorCode?.includes('28P01')) {
    return { 
      type: 'AUTHENTICATION_FAILED', 
      message: 'Invalid database credentials. Check username/password.',
      retryable: false 
    };
  }
  
  // SSL errors
  if (errorCode?.includes('SSL') || errorCode?.includes('self signed certificate')) {
    return { 
      type: 'SSL_ERROR', 
      message: 'SSL/TLS connection failed. Verify sslmode=require in DATABASE_URL.',
      retryable: false 
    };
  }
  
  // Neon-specific: paused database
  if (errorCode?.includes('P3005') || error.message?.includes('paused')) {
    return { 
      type: 'DATABASE_PAUSED', 
      message: 'Neon database is paused. It will auto-resume on first connection.',
      retryable: true 
    };
  }
  
  // Query timeout
  if (errorCode?.includes('P2024')) {
    return { 
      type: 'QUERY_TIMEOUT', 
      message: 'Query timed out. Consider optimizing or adding indexes.',
      retryable: true 
    };
  }
  
  // Default
  return { 
    type: 'UNKNOWN_ERROR', 
    message: error.message || 'Unknown database error',
    retryable: true 
  };
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error) {
  const classification = classifyError(error);
  return classification.retryable;
}

/**
 * Production-grade database connection with retry logic
 * 
 * Features:
 * - Exponential backoff retry
 * - Structured error logging
 * - Graceful degradation
 * - NeonDB auto-resume handling
 */
export async function testConnection(maxRetries = MAX_RETRIES) {
  logger.info('🔌 [Database] Initiating connection sequence...');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🔌 [Database] Connection attempt ${attempt + 1}/${maxRetries + 1}...`);
      
      // Test connection with timeout wrapper
      const connectPromise = prisma.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Verify connection with simple query
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      
      logger.info('✅ [Database] Connection established successfully (NeonDB)');
      logger.info(`📊 [Database] Connection URL host: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);
      
      return { 
        success: true, 
        attempts: attempt + 1,
        message: 'Database connected'
      };
      
    } catch (error) {
      const classification = classifyError(error);
      
      logger.warn(`⚠️ [Database] Attempt ${attempt + 1} failed:`, {
        errorType: classification.type,
        message: classification.message,
        code: error.code,
        retryable: classification.retryable
      });
      
      // Non-retryable errors should fail fast
      if (!classification.retryable) {
        logger.error('❌ [Database] Non-retryable error - aborting', classification);
        throw new DatabaseConnectionError(classification.message, classification.type, error);
      }
      
      // Last attempt failed
      if (attempt === maxRetries) {
        logger.error('❌ [Database] All retry attempts exhausted');
        throw new DatabaseConnectionError(
          `Failed to connect after ${maxRetries + 1} attempts: ${classification.message}`,
          classification.type,
          error
        );
      }
      
      // Calculate and apply delay
      const delayMs = getRetryDelay(attempt);
      logger.info(`⏳ [Database] Retrying in ${(delayMs / 1000).toFixed(1)}s...`);
      await sleep(delayMs);
    }
  }
}

/**
 * Custom error class for database connection failures
 */
export class DatabaseConnectionError extends Error {
  constructor(message, type, originalError) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Mask sensitive parts of DATABASE_URL for logging
 */
function maskDatabaseUrl(url) {
  if (!url) return 'NOT_SET';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:****@${parsed.hostname}:${parsed.port || '5432'}${parsed.pathname}`;
  } catch {
    return 'INVALID_URL_FORMAT';
  }
}

// ============================================================================
// LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Graceful disconnection with timeout
 */
export async function disconnectDatabase(timeoutMs = 5000) {
  logger.info('👋 [Database] Initiating graceful disconnect...');
  
  const disconnectPromise = prisma.$disconnect();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Disconnect timeout')), timeoutMs);
  });
  
  try {
    await Promise.race([disconnectPromise, timeoutPromise]);
    logger.info('✅ [Database] Disconnected gracefully');
  } catch (error) {
    logger.error('⚠️ [Database] Forced disconnect due to timeout');
    // Force disconnect
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Reconnect wrapper for recovery scenarios
 */
export async function reconnectDatabase() {
  logger.info('🔄 [Database] Attempting reconnection...');
  await disconnectDatabase();
  return await testConnection();
}

/**
 * Middleware to verify DB health before processing requests
 * Use for critical endpoints that require DB
 */
export function requireDatabaseHealth() {
  return async (req, res, next) => {
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      logger.error('� [Database] Health check failed for request', {
        path: req.path,
        method: req.method,
        error: health.error
      });
      
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'Database connection issue. Please retry.',
        retryAfter: 5
      });
    }
    
    next();
  };
}

export { prisma };
