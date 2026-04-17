import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
// Import database functions
import { testConnection, disconnectDatabase, checkDatabaseHealth } from './config/database.js';
import { logger, logStream } from './config/logger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { initWebSocket } from './config/socket.js';

console.log('🚀 Starting server...');
console.log('📍 PORT:', config.port);
console.log('🔧 NODE_ENV:', config.nodeEnv);
console.log('🌐 CORS_ORIGIN:', config.corsOrigin);
console.log('💾 DATABASE_URL set:', process.env.DATABASE_URL ? 'YES' : 'NO');

// Import routes
import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/post.routes.js';
import commentRoutes from './routes/comment.routes.js';
import alertRoutes from './routes/alert.routes.js';
import userRoutes from './routes/user.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import followRoutes from './routes/follow.routes.js';
import chatRoutes from './routes/chat.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import path from 'path';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: logStream }));

// Rate limiting
app.use(apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
const apiPrefix = config.apiPrefix;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/posts`, postRoutes);
app.use(`${apiPrefix}/posts/:id/comments`, commentRoutes);
app.use(`${apiPrefix}/alerts`, alertRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/users`, followRoutes);
app.use(`${apiPrefix}/chat`, chatRoutes);
console.log('✅ Chat routes registered at:', `${apiPrefix}/chat`);
app.use(`${apiPrefix}/moderation`, moderationRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes);

// Static uploads serving with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  let server;
  let isHealthy = false;
  
  try {
    // Test database connection with retry logic
    const connectionResult = await testConnection();
    logger.info(`✅ [Server] Database connected after ${connectionResult.attempts} attempt(s)`);
    isHealthy = true;
    
  } catch (error) {
    logger.error('❌ [Server] Database connection failed:', {
      error: error.message,
      type: error.type || 'UNKNOWN',
      timestamp: error.timestamp
    });
    
    // Log critical failure but don't exit immediately in production
    // This allows for health checks and monitoring to detect the issue
    if (config.nodeEnv === 'production') {
      logger.warn('⚠️ [Server] Starting in DEGRADED mode - database unavailable');
      logger.warn('⚠️ [Server] API endpoints requiring database will return 503 errors');
    } else {
      logger.error('❌ [Server] Development mode - exiting due to DB connection failure');
      process.exit(1);
    }
  }
  
  try {
    // Start HTTP server regardless of DB health
    server = app.listen(config.port, () => {
      logger.info(`🚀 [Server] Running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📖 [Server] API Documentation: http://localhost:${config.port}${apiPrefix}`);
      
      if (!isHealthy) {
        logger.warn(`⚠️ [Server] WARNING: Database is NOT connected - service is degraded`);
      }
    });

    // Initialize WebSockets
    initWebSocket(server);
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    
    // Periodic health check to recover from transient failures
    if (isHealthy) {
      setInterval(async () => {
        const health = await checkDatabaseHealth();
        if (!health.healthy) {
          logger.warn('💔 [Server] Database health check failed', health.error);
        }
      }, 30000); // Check every 30 seconds
    }
    
  } catch (error) {
    logger.error('❌ [Server] Failed to start HTTP server:', error);
    process.exit(1);
  }
}

function gracefulShutdown(server) {
  logger.info('🛑 [Server] Received shutdown signal. Closing gracefully...');
  
  if (!server) {
    logger.info('👋 [Server] No active server to close');
    process.exit(0);
  }
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('✅ [Server] HTTP server closed');
    
    // Disconnect from database
    try {
      await disconnectDatabase();
    } catch (error) {
      logger.error('⚠️ [Server] Error during database disconnect:', error.message);
    }
    
    logger.info('👋 [Server] Process terminated gracefully');
    process.exit(0);
  });

  // Force shutdown after 15 seconds
  setTimeout(() => {
    logger.error('⏱️ [Server] Forced shutdown due to timeout');
    process.exit(1);
  }, 15000);
}

// Handle unhandled errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server only if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1') {
  console.log('▶️ Calling startServer()...');
  startServer().catch(err => {
    console.error('❌ Fatal error starting server:', err);
    process.exit(1);
  });
} else {
  console.log('ℹ️ Running in Vercel serverless mode - server auto-start disabled');
}

export default app;

// Vercel serverless handler
export async function handler(req, res) {
  return app(req, res);
}
