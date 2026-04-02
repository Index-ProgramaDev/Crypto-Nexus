import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { config } from './index.js';
import ws from 'ws';

// Enable WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Create connection pool
const pool = new Pool({ connectionString: config.databaseUrl });

// Create Prisma adapter
const adapter = new PrismaNeon(pool);

// Prisma client with Neon adapter (optimized for serverless)
const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Connection test
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully (Neon)');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

export { prisma };
