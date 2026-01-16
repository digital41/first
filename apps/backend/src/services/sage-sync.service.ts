// ============================================
// SERVICE DE SYNCHRONISATION SAGE
// ============================================
// Synchronise automatiquement les données SAGE toutes les 5 minutes
// 100% lecture seule - aucune modification de données SAGE
// Tolère les erreurs - ne plante jamais l'application

import cron, { type ScheduledTask } from 'node-cron';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database.js';
import { SageService, type SageOrder, type SageOrderLine } from './sage.service.js';
import { sageConfig, isSageConfigValid } from '../config/sage.config.js';

// ============================================
// CONFIGURATION
// ============================================

// Nombre de jours à synchroniser (pour attraper les mises à jour)
const SYNC_DAYS_BACK = 7;

// Statistiques de la dernière synchronisation
interface SyncStats {
  lastSyncAt: Date | null;
  ordersCreated: number;
  ordersUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  errors: number;
  isRunning: boolean;
}

let syncStats: SyncStats = {
  lastSyncAt: null,
  ordersCreated: 0,
  ordersUpdated: 0,
  linesCreated: 0,
  linesUpdated: 0,
  errors: 0,
  isRunning: false,
};

// ============================================
// FONCTION PRINCIPALE DE SYNCHRONISATION
// ============================================

/**
 * Synchronise les commandes SAGE avec la base locale
 * Cette fonction ne lève jamais d'exception
 */
export async function syncSageOrders(): Promise<SyncStats> {
  // Éviter les exécutions simultanées
  if (syncStats.isRunning) {
    console.log('[SAGE-SYNC] Synchronisation déjà en cours, ignorée');
    return syncStats;
  }

  // Vérifier si SAGE est disponible
  if (!isSageConfigValid()) {
    console.log('[SAGE-SYNC] SAGE non configuré, synchronisation ignorée');
    return syncStats;
  }

  syncStats.isRunning = true;
  const startTime = Date.now();
  let created = 0;
  let updated = 0;
  let linesCreated = 0;
  let linesUpdated = 0;
  let errors = 0;

  try {
    console.log('[SAGE-SYNC] Démarrage de la synchronisation...');

    // Vérifier la disponibilité de SAGE
    const isAvailable = await SageService.isAvailable();
    if (!isAvailable) {
      console.log('[SAGE-SYNC] SAGE non disponible, synchronisation reportée');
      syncStats.isRunning = false;
      return syncStats;
    }

    // Récupérer tous les codes clients uniques de notre base
    const localOrders = await prisma.order.findMany({
      where: {
        customerCode: { not: null },
      },
      select: {
        customerCode: true,
      },
      distinct: ['customerCode'],
    });

    const customerCodes = localOrders
      .map((o) => o.customerCode)
      .filter((code): code is string => code !== null);

    console.log(`[SAGE-SYNC] ${customerCodes.length} clients à synchroniser`);

    // Pour chaque client, récupérer ses commandes SAGE
    for (const customerCode of customerCodes) {
      try {
        const sageOrders = await SageService.getCustomerOrders(customerCode);

        for (const sageOrder of sageOrders) {
          try {
            const result = await upsertOrder(sageOrder, customerCode);
            if (result.orderStatus === 'created') created++;
            if (result.orderStatus === 'updated') updated++;
            linesCreated += result.linesCreated;
            linesUpdated += result.linesUpdated;
          } catch (error) {
            errors++;
            console.error(
              `[SAGE-SYNC] Erreur upsert commande ${sageOrder.documentNumber}:`,
              error instanceof Error ? error.message : 'Erreur inconnue'
            );
          }
        }
      } catch (error) {
        errors++;
        console.error(
          `[SAGE-SYNC] Erreur sync client ${customerCode}:`,
          error instanceof Error ? error.message : 'Erreur inconnue'
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[SAGE-SYNC] Terminé en ${duration}ms - Commandes: ${created} créées, ${updated} màj | Lignes: ${linesCreated} créées, ${linesUpdated} màj | Erreurs: ${errors}`
    );

    // Mettre à jour les statistiques
    syncStats = {
      lastSyncAt: new Date(),
      ordersCreated: created,
      ordersUpdated: updated,
      linesCreated,
      linesUpdated,
      errors,
      isRunning: false,
    };

    return syncStats;
  } catch (error) {
    console.error(
      '[SAGE-SYNC] Erreur globale:',
      error instanceof Error ? error.message : 'Erreur inconnue'
    );
    syncStats.isRunning = false;
    syncStats.errors++;
    return syncStats;
  }
}

interface UpsertResult {
  orderStatus: 'created' | 'updated' | 'unchanged';
  linesCreated: number;
  linesUpdated: number;
}

/**
 * Crée ou met à jour une commande locale depuis SAGE
 * Synchronise également les lignes de commande
 */
async function upsertOrder(
  sageOrder: SageOrder,
  customerCode: string
): Promise<UpsertResult> {
  let orderStatus: 'created' | 'updated' | 'unchanged' = 'unchanged';
  let linesCreated = 0;
  let linesUpdated = 0;

  // Chercher si la commande existe déjà
  const existingOrder = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: sageOrder.documentNumber },
        { blNumber: sageOrder.documentNumber },
        { faNumber: sageOrder.documentNumber },
      ],
    },
  });

  // Préparer les données selon le type de document
  const orderData = {
    customerCode,
    orderDate: sageOrder.orderDate,
    deliveryDate: sageOrder.deliveryDate,
    totalAmount: sageOrder.totalHT,
    status: sageOrder.status,
    sageRef: sageOrder.reference,
  };

  let orderId: string;

  if (existingOrder) {
    // Mettre à jour les champs selon le type de document
    const updateData: Record<string, unknown> = { ...orderData };

    // Ajouter le numéro BL ou FA si c'est un nouveau type
    if (sageOrder.documentType === 3 && !existingOrder.blNumber) {
      updateData.blNumber = sageOrder.documentNumber;
    }
    if (sageOrder.documentType === 6 && !existingOrder.faNumber) {
      updateData.faNumber = sageOrder.documentNumber;
    }

    await prisma.order.update({
      where: { id: existingOrder.id },
      data: updateData,
    });

    orderId = existingOrder.id;
    orderStatus = 'updated';
  } else {
    // Créer une nouvelle commande
    const newOrderData: {
      orderNumber: string;
      blNumber?: string;
      faNumber?: string;
      customerCode: string;
      orderDate?: Date;
      deliveryDate?: Date;
      totalAmount?: number;
      status?: string;
      sageRef?: string;
    } = {
      ...orderData,
      orderNumber: sageOrder.documentNumber,
    };

    // Définir le bon champ selon le type de document
    if (sageOrder.documentType === 1) {
      newOrderData.orderNumber = sageOrder.documentNumber;
    } else if (sageOrder.documentType === 3) {
      newOrderData.orderNumber = sageOrder.documentNumber;
      newOrderData.blNumber = sageOrder.documentNumber;
    } else if (sageOrder.documentType === 6) {
      newOrderData.orderNumber = sageOrder.documentNumber;
      newOrderData.faNumber = sageOrder.documentNumber;
    }

    const newOrder = await prisma.order.create({
      data: newOrderData,
    });

    orderId = newOrder.id;
    orderStatus = 'created';
  }

  // Synchroniser les lignes de commande (avec DO_Type pour filtrer correctement)
  try {
    const sageLines = await SageService.getOrderLines(sageOrder.documentNumber, sageOrder.documentType);
    const lineResult = await syncOrderLines(orderId, sageLines);
    linesCreated = lineResult.created;
    linesUpdated = lineResult.updated;
  } catch (error) {
    console.error(
      `[SAGE-SYNC] Erreur sync lignes ${sageOrder.documentNumber}:`,
      error instanceof Error ? error.message : 'Erreur inconnue'
    );
  }

  return { orderStatus, linesCreated, linesUpdated };
}

/**
 * Synchronise les lignes d'une commande
 */
async function syncOrderLines(
  orderId: string,
  sageLines: SageOrderLine[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const sageLine of sageLines) {
    // Chercher si la ligne existe déjà
    const existingLine = await prisma.orderLine.findUnique({
      where: {
        orderId_lineNumber: {
          orderId,
          lineNumber: sageLine.lineNumber,
        },
      },
    });

    const lineData = {
      productCode: sageLine.productCode || null,
      productName: sageLine.productName,
      quantity: new Decimal(sageLine.quantity),
      unitPrice: sageLine.unitPrice ? new Decimal(sageLine.unitPrice) : null,
      totalHT: sageLine.totalHT ? new Decimal(sageLine.totalHT) : null,
    };

    if (existingLine) {
      await prisma.orderLine.update({
        where: { id: existingLine.id },
        data: lineData,
      });
      updated++;
    } else {
      await prisma.orderLine.create({
        data: {
          orderId,
          lineNumber: sageLine.lineNumber,
          ...lineData,
        },
      });
      created++;
    }
  }

  return { created, updated };
}

/**
 * Synchronise un client spécifique (utile pour refresh manuel)
 */
export async function syncCustomerOrders(customerCode: string): Promise<{
  success: boolean;
  ordersCreated: number;
  ordersUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  message: string;
}> {
  if (!isSageConfigValid()) {
    return {
      success: false,
      ordersCreated: 0,
      ordersUpdated: 0,
      linesCreated: 0,
      linesUpdated: 0,
      message: 'SAGE non configuré',
    };
  }

  try {
    const isAvailable = await SageService.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        ordersCreated: 0,
        ordersUpdated: 0,
        linesCreated: 0,
        linesUpdated: 0,
        message: 'SAGE non disponible',
      };
    }

    const sageOrders = await SageService.getCustomerOrders(customerCode);
    let ordersCreated = 0;
    let ordersUpdated = 0;
    let linesCreated = 0;
    let linesUpdated = 0;

    for (const sageOrder of sageOrders) {
      const result = await upsertOrder(sageOrder, customerCode);
      if (result.orderStatus === 'created') ordersCreated++;
      if (result.orderStatus === 'updated') ordersUpdated++;
      linesCreated += result.linesCreated;
      linesUpdated += result.linesUpdated;
    }

    return {
      success: true,
      ordersCreated,
      ordersUpdated,
      linesCreated,
      linesUpdated,
      message: `${sageOrders.length} commandes traitées`,
    };
  } catch (error) {
    return {
      success: false,
      ordersCreated: 0,
      ordersUpdated: 0,
      linesCreated: 0,
      linesUpdated: 0,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Retourne les statistiques de synchronisation
 */
export function getSyncStats(): SyncStats {
  return { ...syncStats };
}

// ============================================
// CRON JOB
// ============================================

let sageSyncJob: ScheduledTask | null = null;

/**
 * Démarre le job de synchronisation SAGE (toutes les 5 minutes)
 */
export function startSageSyncJob(): void {
  // Ne pas démarrer si SAGE n'est pas configuré
  if (!sageConfig.enabled) {
    console.log('[SAGE-SYNC] SAGE désactivé, job non démarré');
    return;
  }

  // Exécuter une première synchronisation au démarrage (après 30 secondes)
  setTimeout(async () => {
    console.log('[SAGE-SYNC] Synchronisation initiale...');
    try {
      await syncSageOrders();
    } catch (error) {
      console.error('[SAGE-SYNC] Erreur sync initiale:', error);
    }
  }, 30000);

  // Job toutes les 5 minutes
  sageSyncJob = cron.schedule('*/5 * * * *', async () => {
    console.log('[SAGE-SYNC] Synchronisation planifiée...');
    try {
      await syncSageOrders();
    } catch (error) {
      console.error('[SAGE-SYNC] Erreur sync planifiée:', error);
    }
  });

  console.log('[SAGE-SYNC] Job de synchronisation démarré (toutes les 5 minutes)');
}

/**
 * Arrête le job de synchronisation SAGE
 */
export function stopSageSyncJob(): void {
  if (sageSyncJob) {
    sageSyncJob.stop();
    sageSyncJob = null;
    console.log('[SAGE-SYNC] Job de synchronisation arrêté');
  }
}

export default {
  syncSageOrders,
  syncCustomerOrders,
  getSyncStats,
  startSageSyncJob,
  stopSageSyncJob,
};
