import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',
  
  // Admin
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'admin@cryptohub.com',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
};

// Validation
if (!config.databaseUrl && config.nodeEnv === 'production') {
  throw new Error('DATABASE_URL is required in production');
}

if (config.jwt.secret === 'fallback-secret-change-in-production' && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
