import { PrismaClient, UserRole, TicketPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with essential configuration...\n');

  // ============================================
  // 1. ADMIN USER (only if not exists)
  // ============================================
  console.log('👤 Creating admin user...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@klygroupe.com' },
  });

  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('Admin@2024!', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@klygroupe.com',
        displayName: 'Admin KLY',
        role: UserRole.ADMIN,
        passwordHash: adminPassword,
        phone: '+33 1 45 67 89 00',
      },
    });
    console.log(`  ✅ Admin créé: ${admin.email}`);
  } else {
    console.log(`  ⏭️  Admin existe déjà: ${existingAdmin.email}`);
  }

  // ============================================
  // 2. SLA CONFIG (only if not exists)
  // ============================================
  console.log('\n⏱️  Configuring SLA rules...');

  const existingSLA = await prisma.slaConfig.count();

  if (existingSLA === 0) {
    await prisma.slaConfig.createMany({
      data: [
        { priority: TicketPriority.URGENT, firstResponseTime: 60, resolutionTime: 240 },    // 1h / 4h
        { priority: TicketPriority.HIGH, firstResponseTime: 240, resolutionTime: 1440 },    // 4h / 24h
        { priority: TicketPriority.MEDIUM, firstResponseTime: 480, resolutionTime: 2880 },  // 8h / 48h
        { priority: TicketPriority.LOW, firstResponseTime: 1440, resolutionTime: 4320 },    // 24h / 72h
      ],
    });
    console.log('  ✅ 4 règles SLA créées');
  } else {
    console.log(`  ⏭️  ${existingSLA} règles SLA existent déjà`);
  }

  // ============================================
  // 3. CANNED RESPONSES (only if not exists)
  // ============================================
  console.log('\n📝 Creating default canned responses...');

  const existingResponses = await prisma.cannedResponse.count();

  if (existingResponses === 0) {
    await prisma.cannedResponse.create({
      data: {
        title: 'Salutation standard',
        content: 'Bonjour,\n\nMerci de nous avoir contactés. Je vais étudier votre demande et reviens vers vous rapidement.\n\nCordialement,',
        tags: ['salutation', 'introduction'],
      },
    });

    await prisma.cannedResponse.create({
      data: {
        title: 'Demande de diagnostic',
        content: 'Pour mieux comprendre le problème, pourriez-vous nous fournir :\n- Le numéro de série du produit\n- Une description détaillée du dysfonctionnement\n- Des photos si possible\n\nMerci !',
        tags: ['technique', 'diagnostic'],
      },
    });

    await prisma.cannedResponse.create({
      data: {
        title: 'Clôture ticket résolu',
        content: 'Votre demande a été traitée avec succès. N\'hésitez pas à nous recontacter si vous avez d\'autres questions.\n\nBonne journée !',
        tags: ['cloture', 'resolution'],
      },
    });
    console.log('  ✅ 3 réponses types créées');
  } else {
    console.log(`  ⏭️  ${existingResponses} réponses types existent déjà`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  🌱 SEED COMPLETE                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  ADMIN LOGIN:                                              ║');
  console.log('║  • Email: admin@klygroupe.com                              ║');
  console.log('║  • Password: Admin@2024!                                   ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Configuration créée:                                      ║');
  console.log('║  • 1 utilisateur admin                                     ║');
  console.log('║  • 4 règles SLA                                            ║');
  console.log('║  • 3 réponses types                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
