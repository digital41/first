import { PrismaClient, UserRole, TicketStatus, TicketPriority, IssueType, TicketAction, NotificationType, AttachmentContext } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================
  // 1. CLEAN DATABASE (optionnel, pour dev)
  // ============================================
  console.log('🧹 Cleaning existing data...');
  await prisma.cannedResponseUse.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.slaConfig.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // 2. USERS: 1 Admin + 2 Agents + 2 Customers
  // ============================================
  console.log('👥 Creating users...');

  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const agentPassword = await bcrypt.hash('Agent@2024!', 12);

  // Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@klygroupe.com',
      displayName: 'Admin KLY',
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
      phone: '+33 1 45 67 89 00',
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // Agent 1
  const agent1 = await prisma.user.create({
    data: {
      email: 'marie.dupont@klygroupe.com',
      displayName: 'Marie Dupont',
      role: UserRole.AGENT,
      passwordHash: agentPassword,
      phone: '+33 1 45 67 89 01',
    },
  });
  console.log(`  ✅ Agent: ${agent1.email}`);

  // Agent 2
  const agent2 = await prisma.user.create({
    data: {
      email: 'pierre.martin@klygroupe.com',
      displayName: 'Pierre Martin',
      role: UserRole.AGENT,
      passwordHash: agentPassword,
      phone: '+33 1 45 67 89 02',
    },
  });
  console.log(`  ✅ Agent: ${agent2.email}`);

  // Customer 1
  const customer1 = await prisma.user.create({
    data: {
      email: 'jean.bernard@acme.fr',
      displayName: 'Jean Bernard',
      role: UserRole.CUSTOMER,
      phone: '+33 6 12 34 56 78',
    },
  });
  console.log(`  ✅ Client: ${customer1.email}`);

  // Customer 2
  const customer2 = await prisma.user.create({
    data: {
      email: 'sophie.leroy@techsolutions.fr',
      displayName: 'Sophie Leroy',
      role: UserRole.CUSTOMER,
      phone: '+33 6 98 76 54 32',
    },
  });
  console.log(`  ✅ Client: ${customer2.email}`);

  // ============================================
  // 3. ORDERS
  // ============================================
  console.log('\n📦 Creating orders...');

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'BC-2024-001234',
      customerEmail: customer1.email,
      customerPhone: customer1.phone,
    },
  });
  console.log(`  ✅ Commande: ${order1.orderNumber}`);

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'BC-2024-005678',
      customerEmail: customer2.email,
      customerPhone: customer2.phone,
    },
  });
  console.log(`  ✅ Commande: ${order2.orderNumber}`);

  // ============================================
  // 4. SLA CONFIG
  // ============================================
  console.log('\n⏱️  Creating SLA configs...');

  await prisma.slaConfig.createMany({
    data: [
      { priority: TicketPriority.URGENT, firstResponseTime: 60, resolutionTime: 240 },    // 1h / 4h
      { priority: TicketPriority.HIGH, firstResponseTime: 240, resolutionTime: 1440 },    // 4h / 24h
      { priority: TicketPriority.MEDIUM, firstResponseTime: 480, resolutionTime: 2880 },  // 8h / 48h
      { priority: TicketPriority.LOW, firstResponseTime: 1440, resolutionTime: 4320 },    // 24h / 72h
    ],
  });
  console.log('  ✅ 4 règles SLA créées');

  // ============================================
  // 5. CANNED RESPONSES
  // ============================================
  console.log('\n📝 Creating canned responses...');

  const cannedGreeting = await prisma.cannedResponse.create({
    data: {
      title: 'Salutation standard',
      content: 'Bonjour,\n\nMerci de nous avoir contactés. Je vais étudier votre demande et reviens vers vous rapidement.\n\nCordialement,',
      tags: ['salutation', 'introduction'],
    },
  });

  const cannedTechnical = await prisma.cannedResponse.create({
    data: {
      title: 'Demande de diagnostic',
      content: 'Pour mieux comprendre le problème, pourriez-vous nous fournir :\n- Le numéro de série du produit\n- Une description détaillée du dysfonctionnement\n- Des photos si possible\n\nMerci !',
      tags: ['technique', 'diagnostic'],
    },
  });

  const cannedResolved = await prisma.cannedResponse.create({
    data: {
      title: 'Clôture ticket résolu',
      content: 'Votre demande a été traitée avec succès. N\'hésitez pas à nous recontacter si vous avez d\'autres questions.\n\nBonne journée !',
      tags: ['cloture', 'resolution'],
    },
  });
  console.log('  ✅ 3 réponses types créées');

  // ============================================
  // 6. TICKETS: 3 tickets
  // ============================================
  console.log('\n🎫 Creating tickets...');

  // Ticket 1: OPEN - Technical issue
  const ticket1 = await prisma.ticket.create({
    data: {
      title: 'Imprimante ne démarre plus',
      description: 'Mon imprimante Laser Pro X500 refuse de s\'allumer depuis ce matin. Le voyant reste éteint.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      issueType: IssueType.TECHNICAL,
      tags: ['imprimante', 'panne'],
      customerId: customer1.id,
      assignedToId: agent1.id,
      orderId: order1.id,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    },
  });
  console.log(`  ✅ Ticket #1: ${ticket1.title} (${ticket1.status})`);

  // Ticket 2: IN_PROGRESS - Delivery issue
  const ticket2 = await prisma.ticket.create({
    data: {
      title: 'Colis non reçu',
      description: 'Ma commande BC-2024-005678 aurait dû arriver il y a 3 jours mais je n\'ai rien reçu.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      issueType: IssueType.DELIVERY,
      tags: ['livraison', 'retard'],
      customerId: customer2.id,
      assignedToId: agent2.id,
      orderId: order2.id,
      slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // +48h
    },
  });
  console.log(`  ✅ Ticket #2: ${ticket2.title} (${ticket2.status})`);

  // Ticket 3: RESOLVED - Billing issue
  const ticket3 = await prisma.ticket.create({
    data: {
      title: 'Erreur de facturation',
      description: 'Le montant facturé ne correspond pas au devis initial. Il y a une différence de 150€.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.LOW,
      issueType: IssueType.BILLING,
      tags: ['facturation', 'erreur'],
      customerId: customer1.id,
      assignedToId: agent1.id,
      satisfactionScore: 5,
    },
  });
  console.log(`  ✅ Ticket #3: ${ticket3.title} (${ticket3.status})`);

  // ============================================
  // 7. TICKET HISTORY
  // ============================================
  console.log('\n📜 Creating ticket history...');

  // History for ticket1
  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket1.id,
      actorId: customer1.id,
      action: TicketAction.CREATED,
      metadata: { source: 'web' },
    },
  });

  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket1.id,
      actorId: admin.id,
      action: TicketAction.ASSIGNED,
      field: 'assignedToId',
      oldValue: null,
      newValue: agent1.id,
    },
  });

  // History for ticket2
  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket2.id,
      actorId: customer2.id,
      action: TicketAction.CREATED,
    },
  });

  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket2.id,
      actorId: agent2.id,
      action: TicketAction.STATUS_CHANGED,
      field: 'status',
      oldValue: TicketStatus.OPEN,
      newValue: TicketStatus.IN_PROGRESS,
    },
  });

  // History for ticket3
  await prisma.ticketHistory.create({
    data: {
      ticketId: ticket3.id,
      actorId: agent1.id,
      action: TicketAction.STATUS_CHANGED,
      field: 'status',
      oldValue: TicketStatus.IN_PROGRESS,
      newValue: TicketStatus.RESOLVED,
    },
  });
  console.log('  ✅ 5 entrées historique créées');

  // ============================================
  // 8. CHAT MESSAGES: 10 messages
  // ============================================
  console.log('\n💬 Creating chat messages...');

  // Messages for Ticket 1 (4 messages)
  await prisma.chatMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: customer1.id,
      content: 'Bonjour, mon imprimante ne s\'allume plus du tout depuis ce matin. J\'ai vérifié la prise électrique, tout semble OK.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent1.id,
      content: 'Bonjour M. Bernard, merci de nous avoir contactés. Avez-vous essayé de maintenir le bouton power pendant 10 secondes pour un reset ?',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: customer1.id,
      content: 'Oui, j\'ai essayé mais rien ne se passe. Le voyant reste éteint.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent1.id,
      content: 'Je comprends. Pouvez-vous me donner le numéro de série de l\'appareil ? Il se trouve à l\'arrière.',
    },
  });

  // Messages for Ticket 2 (4 messages)
  await prisma.chatMessage.create({
    data: {
      ticketId: ticket2.id,
      authorId: customer2.id,
      content: 'Bonjour, je n\'ai toujours pas reçu ma commande BC-2024-005678. Pouvez-vous vérifier ?',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket2.id,
      authorId: agent2.id,
      content: 'Bonjour Mme Leroy, je vérifie immédiatement le suivi de votre colis.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket2.id,
      authorId: agent2.id,
      content: 'Votre colis est actuellement bloqué au centre de tri de Lyon. Je contacte le transporteur pour accélérer la livraison.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket2.id,
      authorId: customer2.id,
      content: 'Merci pour votre réactivité. Avez-vous une estimation de délai ?',
    },
  });

  // Messages for Ticket 3 (2 messages)
  await prisma.chatMessage.create({
    data: {
      ticketId: ticket3.id,
      authorId: customer1.id,
      content: 'Bonjour, il y a une erreur sur ma facture. Le montant devrait être de 850€ et non 1000€.',
    },
  });

  await prisma.chatMessage.create({
    data: {
      ticketId: ticket3.id,
      authorId: agent1.id,
      content: 'Bonjour, vous avez raison. J\'ai corrigé la facture. Vous recevrez l\'avoir par email dans l\'heure. Toutes mes excuses pour ce désagrément.',
    },
  });

  console.log('  ✅ 10 messages créés');

  // ============================================
  // 9. NOTIFICATIONS: 2 notifications
  // ============================================
  console.log('\n🔔 Creating notifications...');

  await prisma.notification.create({
    data: {
      userId: agent1.id,
      type: NotificationType.TICKET_UPDATE,
      ticketId: ticket1.id,
      payload: {
        title: 'Nouveau ticket assigné',
        message: 'Le ticket "Imprimante ne démarre plus" vous a été assigné.',
      },
      isRead: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: customer1.id,
      type: NotificationType.MESSAGE,
      ticketId: ticket3.id,
      payload: {
        title: 'Ticket résolu',
        message: 'Votre ticket "Erreur de facturation" a été résolu.',
      },
      isRead: true,
    },
  });

  console.log('  ✅ 2 notifications créées');

  // ============================================
  // 10. CANNED RESPONSE USAGE
  // ============================================
  console.log('\n📋 Creating canned response usage...');

  await prisma.cannedResponseUse.create({
    data: {
      ticketId: ticket1.id,
      cannedResponseId: cannedGreeting.id,
      usedById: agent1.id,
    },
  });

  await prisma.cannedResponseUse.create({
    data: {
      ticketId: ticket3.id,
      cannedResponseId: cannedResolved.id,
      usedById: agent1.id,
    },
  });

  console.log('  ✅ 2 utilisations de réponses types');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║          🌱 SEEDING COMPLETE               ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Users:                                    ║');
  console.log('║  • Admin: admin@klygroupe.com              ║');
  console.log('║  • Agent: marie.dupont@klygroupe.com       ║');
  console.log('║  • Agent: pierre.martin@klygroupe.com      ║');
  console.log('║  • Client: jean.bernard@acme.fr            ║');
  console.log('║  • Client: sophie.leroy@techsolutions.fr   ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Password (admin/agents): Admin@2024!      ║');
  console.log('║                           Agent@2024!      ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Data created:                             ║');
  console.log('║  • 5 users (1 admin, 2 agents, 2 clients)  ║');
  console.log('║  • 2 orders                                ║');
  console.log('║  • 3 tickets                               ║');
  console.log('║  • 10 chat messages                        ║');
  console.log('║  • 5 history entries                       ║');
  console.log('║  • 2 notifications                         ║');
  console.log('║  • 4 SLA configs                           ║');
  console.log('║  • 3 canned responses                      ║');
  console.log('╚════════════════════════════════════════════╝');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
