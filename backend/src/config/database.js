import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

let prisma;
let isNeon = false;

// Detect if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';

async function createPrismaClient() {
  if (isVercel) {
    // Use Neon adapter for serverless environment
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const ws = await import('ws');
    
    neonConfig.webSocketConstructor = ws.WebSocket || ws.default;
    
    const pool = new Pool({ connectionString: config.databaseUrl });
    const adapter = new PrismaNeon(pool);
    
    isNeon = true;
    return new PrismaClient({
      adapter,
      log: ['error']
    });
  } else {
    // Standard Prisma client for local development
    return new PrismaClient({
      log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }
}

// Initialize prisma client
prisma = await createPrismaClient();

// Connection test
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log(`✅ Database connected successfully ${isNeon ? '(Neon Serverless)' : '(Standard)'}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

export { prisma };
