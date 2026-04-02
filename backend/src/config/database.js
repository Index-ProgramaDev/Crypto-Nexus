import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

// Prisma client with logging in development
const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

// Connection test
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

export { prisma };
