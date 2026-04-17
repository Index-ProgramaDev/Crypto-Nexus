import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/utils/auth.js';
import { logger } from '../src/config/logger.js';

/**
 * Seed database with initial data
 */
async function seed() {
  try {
    logger.info('🌱 Starting database seed...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@cryptohub.com' }
    });

    if (existingAdmin) {
      logger.info('Admin user already exists, skipping seed...');
      return;
    }

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@cryptohub.com',
        username: 'admin',
        passwordHash: adminPassword,
        role: 'admin',
        vipAccess: true,
        profile: {
          create: { fullName: 'Administrador' }
        }
      }
    });

    logger.info(`✅ Admin user created: ${admin.email}`);

    // Create sample users
    const sampleUsers = [
      { email: 'user@example.com', fullName: 'Usuário Normal', role: 'user' },
      { email: 'mentored@example.com', fullName: 'Mentorado', role: 'mentored' },
      { email: 'advanced@example.com', fullName: 'Trader Avançado', role: 'advanced' },
      { email: 'vip@example.com', fullName: 'Membro VIP', role: 'mentored', vipAccess: true }
    ];

    for (const userData of sampleUsers) {
      const password = await hashPassword('password123');
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.email.split('@')[0],
          passwordHash: password,
          role: userData.role,
          vipAccess: userData.vipAccess || false,
          profile: {
            create: { fullName: userData.fullName }
          }
        }
      });
      logger.info(`✅ Sample user created: ${user.email}`);
    }

    // Create sample posts
    const samplePosts = [
      {
        content: 'Bem-vindos ao CryptoHub! Esta é uma comunidade para traders e entusiastas de criptomoedas.',
        userId: admin.id,
        isPinned: true
      },
      {
        content: 'Dica importante: Sempre faça sua própria pesquisa antes de investir!',
        userId: admin.id
      },
      {
        content: 'Análise exclusiva para mentorados: BTC em suporte importante.',
        userId: admin.id
      },
      {
        content: '🚨 SINAL VIP: Entrada em ETH à $2,800 - Stop loss $2,650',
        userId: admin.id,
        isSignal: true,
        signalType: 'buy'
      }
    ];

    for (const postData of samplePosts) {
      const post = await prisma.post.create({
        data: {
          ...postData,
          status: 'active',
          likesCount: 0,
          commentsCount: 0
        }
      });
      logger.info(`✅ Sample post created: ${post.id}`);
    }

    // Removed alert creation as we do not have an Alert model

    logger.info('🎉 Database seed completed successfully!');

  } catch (error) {
    logger.error('❌ Database seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seed();

export { seed };
