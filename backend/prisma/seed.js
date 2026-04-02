import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/auth.js';
import { logger } from '../config/logger.js';

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
        passwordHash: adminPassword,
        fullName: 'Administrador',
        role: 'admin',
        vipAccess: true
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
          passwordHash: password,
          fullName: userData.fullName,
          role: userData.role,
          vipAccess: userData.vipAccess || false
        }
      });
      logger.info(`✅ Sample user created: ${user.email}`);
    }

    // Create sample posts
    const samplePosts = [
      {
        content: 'Bem-vindos ao CryptoHub! Esta é uma comunidade para traders e entusiastas de criptomoedas.',
        authorEmail: 'admin@cryptohub.com',
        authorName: 'Administrador',
        accessLevel: 'public',
        isPinned: true
      },
      {
        content: 'Dica importante: Sempre faça sua própria pesquisa antes de investir!',
        authorEmail: 'admin@cryptohub.com',
        authorName: 'Administrador',
        accessLevel: 'public'
      },
      {
        content: 'Análise exclusiva para mentorados: BTC em suporte importante.',
        authorEmail: 'advanced@example.com',
        authorName: 'Trader Avançado',
        accessLevel: 'mentored'
      },
      {
        content: '🚨 SINAL VIP: Entrada em ETH à $2,800 - Stop loss $2,650',
        authorEmail: 'admin@cryptohub.com',
        authorName: 'Administrador',
        accessLevel: 'vip',
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

    // Create sample alerts
    const sampleAlerts = [
      {
        title: 'Bem-vindo ao CryptoHub!',
        message: 'Esta é a central de alertas. Aqui você receberá notificações importantes.',
        type: 'info',
        targetLevel: 'public'
      },
      {
        title: 'Nova sala VIP disponível',
        message: 'A sala VIP agora está disponível para membros com acesso VIP.',
        type: 'signal',
        targetLevel: 'vip'
      }
    ];

    for (const alertData of sampleAlerts) {
      const alert = await prisma.alert.create({
        data: alertData
      });
      logger.info(`✅ Sample alert created: ${alert.id}`);
    }

    logger.info('🎉 Database seed completed successfully!');

  } catch (error) {
    logger.error('❌ Database seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed };
