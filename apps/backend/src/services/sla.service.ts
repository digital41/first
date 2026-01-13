import cron, { type ScheduledTask } from 'node-cron';
import { prisma } from '../config/database.js';
import { notifySlaWarning, notifySlaBreach } from './notification.service.js';
import { sendSlaWarningEmail, sendSlaBreachEmail } from './email.service.js';
import type { TicketPriority, IssueType } from '@prisma/client';

// ============================================
// SERVICE SLA
// ============================================

// Délais SLA par défaut (en minutes)
const DEFAULT_SLA_CONFIG: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
  URGENT: { firstResponse: 30, resolution: 240 },     // 30min / 4h
  HIGH: { firstResponse: 60, resolution: 480 },       // 1h / 8h
  MEDIUM: { firstResponse: 240, resolution: 1440 },   // 4h / 24h
  LOW: { firstResponse: 480, resolution: 2880 },      // 8h / 48h
};

/**
 * Récupère la configuration SLA pour une priorité/type
 */
export async function getSlaConfig(
  priority: TicketPriority,
  issueType?: IssueType
): Promise<{ firstResponseTime: number; resolutionTime: number }> {
  // Cherche d'abord avec issueType spécifique
  if (issueType) {
    const specificConfig = await prisma.slaConfig.findUnique({
      where: { priority_issueType: { priority, issueType } },
    });
    if (specificConfig) {
      return {
        firstResponseTime: specificConfig.firstResponseTime,
        resolutionTime: specificConfig.resolutionTime,
      };
    }
  }

  // Cherche config par priorité seule
  const priorityConfig = await prisma.slaConfig.findFirst({
    where: { priority, issueType: null },
  });

  if (priorityConfig) {
    return {
      firstResponseTime: priorityConfig.firstResponseTime,
      resolutionTime: priorityConfig.resolutionTime,
    };
  }

  // Utilise les valeurs par défaut
  return {
    firstResponseTime: DEFAULT_SLA_CONFIG[priority].firstResponse,
    resolutionTime: DEFAULT_SLA_CONFIG[priority].resolution,
  };
}

/**
 * Calcule la deadline SLA pour un ticket
 */
export async function calculateSlaDeadline(
  priority: TicketPriority,
  issueType: IssueType,
  createdAt: Date = new Date()
): Promise<Date> {
  const config = await getSlaConfig(priority, issueType);
  const deadline = new Date(createdAt);
  deadline.setMinutes(deadline.getMinutes() + config.resolutionTime);
  return deadline;
}

/**
 * Met à jour la deadline SLA d'un ticket
 */
export async function updateTicketSlaDeadline(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return;

  const deadline = await calculateSlaDeadline(
    ticket.priority,
    ticket.issueType,
    ticket.createdAt
  );

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { slaDeadline: deadline },
  });
}

/**
 * Vérifie les tickets proches de la deadline SLA
 * Envoie des avertissements aux agents
 */
export async function checkSlaWarnings(): Promise<void> {
  const warningThreshold = new Date();
  warningThreshold.setHours(warningThreshold.getHours() + 4); // 4h avant deadline

  const ticketsAtRisk = await prisma.ticket.findMany({
    where: {
      slaDeadline: {
        lte: warningThreshold,
        gt: new Date(),
      },
      slaBreached: false,
      status: {
        notIn: ['RESOLVED', 'CLOSED'],
      },
    },
    include: {
      assignedTo: true,
    },
  });

  console.log(`[SLA] ${ticketsAtRisk.length} tickets à risque trouvés`);

  for (const ticket of ticketsAtRisk) {
    if (!ticket.assignedTo || !ticket.slaDeadline) continue;

    const hoursRemaining = Math.ceil(
      (ticket.slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    // Notification temps réel
    await notifySlaWarning(
      ticket.id,
      ticket.assignedTo.id,
      ticket.title,
      hoursRemaining
    );

    // Email d'avertissement
    if (ticket.assignedTo.email) {
      await sendSlaWarningEmail({
        to: ticket.assignedTo.email,
        agentName: ticket.assignedTo.displayName,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        hoursRemaining,
      });
    }
  }
}

/**
 * Vérifie les violations SLA
 * Marque les tickets et notifie les superviseurs
 */
export async function checkSlaBreaches(): Promise<void> {
  const now = new Date();

  const breachedTickets = await prisma.ticket.findMany({
    where: {
      slaDeadline: {
        lt: now,
      },
      slaBreached: false,
      status: {
        notIn: ['RESOLVED', 'CLOSED'],
      },
    },
    include: {
      assignedTo: true,
    },
  });

  console.log(`[SLA] ${breachedTickets.length} violations détectées`);

  // Récupère les superviseurs pour les notifications
  const supervisors = await prisma.user.findMany({
    where: {
      role: { in: ['SUPERVISOR', 'ADMIN'] },
      email: { not: null },
    },
  });

  for (const ticket of breachedTickets) {
    // Marque le ticket comme en violation
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaBreached: true },
    });

    // Historique
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: 'UPDATED',
        field: 'slaBreached',
        oldValue: 'false',
        newValue: 'true',
        metadata: { reason: 'SLA deadline exceeded' },
      },
    });

    // Notification à l'agent assigné
    if (ticket.assignedTo) {
      await notifySlaBreach(ticket.id, ticket.assignedTo.id, ticket.title);
    }

    // Notification aux superviseurs
    for (const supervisor of supervisors) {
      if (supervisor.email) {
        await sendSlaBreachEmail({
          to: supervisor.email,
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          assignedAgent: ticket.assignedTo?.displayName,
          breachTime: now,
        });
      }
    }
  }
}

/**
 * Récupère les statistiques SLA
 */
export async function getSlaStats(period: 'day' | 'week' | 'month' = 'week') {
  const startDate = new Date();

  switch (period) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }

  const [totalTickets, breachedTickets, resolvedInTime] = await Promise.all([
    prisma.ticket.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
    prisma.ticket.count({
      where: {
        createdAt: { gte: startDate },
        slaBreached: true,
      },
    }),
    prisma.ticket.count({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['RESOLVED', 'CLOSED'] },
        slaBreached: false,
      },
    }),
  ]);

  const complianceRate = totalTickets > 0
    ? Math.round(((totalTickets - breachedTickets) / totalTickets) * 100)
    : 100;

  return {
    period,
    totalTickets,
    breachedTickets,
    resolvedInTime,
    pendingTickets: totalTickets - resolvedInTime - breachedTickets,
    complianceRate,
  };
}

// ============================================
// CRON JOBS
// ============================================

let slaWarningJob: ScheduledTask | null = null;
let slaBreachJob: ScheduledTask | null = null;

/**
 * Démarre les jobs cron SLA
 */
export function startSlaCronJobs(): void {
  // Vérification des avertissements toutes les 30 minutes
  slaWarningJob = cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Vérification avertissements SLA...');
    try {
      await checkSlaWarnings();
    } catch (error) {
      console.error('[Cron] Erreur checkSlaWarnings:', error);
    }
  });

  // Vérification des violations toutes les 15 minutes
  slaBreachJob = cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Vérification violations SLA...');
    try {
      await checkSlaBreaches();
    } catch (error) {
      console.error('[Cron] Erreur checkSlaBreaches:', error);
    }
  });

  console.log('[Cron] Jobs SLA démarrés');
}

/**
 * Arrête les jobs cron SLA
 */
export function stopSlaCronJobs(): void {
  if (slaWarningJob) {
    slaWarningJob.stop();
    slaWarningJob = null;
  }
  if (slaBreachJob) {
    slaBreachJob.stop();
    slaBreachJob = null;
  }
  console.log('[Cron] Jobs SLA arrêtés');
}
