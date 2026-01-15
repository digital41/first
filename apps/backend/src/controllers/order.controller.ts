import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { SageService } from '../services/sage.service.js';

// ============================================
// CONTROLLER COMMANDES
// ============================================

/**
 * GET /api/orders
 * Liste les commandes
 * - Clients: commandes SAGE par code client
 * - Agents/Admins: toutes les commandes (base locale)
 */
export async function getOrders(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { role, customerCode } = req.user;
    const { search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));

    // ============================================
    // CLIENTS: Récupérer les commandes depuis SAGE
    // ============================================
    if (role === 'CUSTOMER') {
      if (!customerCode) {
        res.json({
          success: true,
          data: [],
          meta: { page: 1, limit: limitNum, total: 0, totalPages: 0 },
          message: 'Aucun code client associé',
        });
        return;
      }

      // Récupérer les commandes SAGE
      const sageOrders = await SageService.getCustomerOrders(customerCode);

      // Récupérer les lignes de commande pour chaque commande
      const ordersWithLines = await Promise.all(
        sageOrders.map(async (order) => {
          const lines = await SageService.getOrderLines(order.documentNumber);
          // Transformer pour le frontend (utilise orderNumber au lieu de documentNumber)
          return {
            ...order,
            orderNumber: order.documentNumber,
            lines,
          };
        })
      );

      // Pagination côté serveur (les commandes SAGE sont déjà limitées)
      const total = ordersWithLines.length;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedOrders = ordersWithLines.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        data: paginatedOrders,
        source: 'SAGE',
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
      return;
    }

    // ============================================
    // STAFF: Commandes depuis la base locale
    // ============================================
    const skip = (pageNum - 1) * limitNum;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { customerEmail: { contains: search as string, mode: 'insensitive' } },
        { customerCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          tickets: {
            select: { id: true, status: true, priority: true, title: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      source: 'LOCAL',
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Get Orders Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * GET /api/orders/:id
 * Détails d'une commande
 * - Pour clients: peut être un numéro de commande SAGE
 * - Pour staff: ID local ou numéro de commande
 */
export async function getOrderById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { role, customerCode } = req.user;

    // ============================================
    // CLIENTS: Récupérer depuis SAGE par numéro de commande
    // ============================================
    if (role === 'CUSTOMER' && customerCode) {
      // Le paramètre :id est en fait le numéro de commande SAGE
      const sageOrder = await SageService.getOrderByNumber(id);

      if (!sageOrder) {
        res.status(404).json({ success: false, error: 'Commande non trouvée dans SAGE' });
        return;
      }

      // Vérifier que la commande appartient au client
      if (sageOrder.customerCode !== customerCode) {
        res.status(403).json({ success: false, error: 'Accès refusé' });
        return;
      }

      // Récupérer les lignes de commande
      const lines = await SageService.getOrderLines(id);

      res.json({
        success: true,
        data: { ...sageOrder, lines },
        source: 'SAGE',
      });
      return;
    }

    // ============================================
    // STAFF: Base locale (par ID ou numéro)
    // ============================================
    let order = await prisma.order.findUnique({
      where: { id },
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            issueType: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        lines: true,
      },
    });

    // Si pas trouvé par ID, essayer par numéro de commande
    if (!order) {
      order = await prisma.order.findUnique({
        where: { orderNumber: id },
        include: {
          tickets: {
            select: {
              id: true,
              status: true,
              priority: true,
              issueType: true,
              title: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          lines: true,
        },
      });
    }

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    res.json({ success: true, data: order, source: 'LOCAL' });
  } catch (error) {
    console.error('[Get Order By ID Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * GET /api/orders/number/:orderNumber
 * Rechercher une commande par son numéro
 */
export async function getOrderByNumber(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const orderNumber = req.params.orderNumber as string;
    const { role } = req.user;

    // Seuls admins et staff peuvent rechercher
    if (role === 'CUSTOMER') {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('[Get Order By Number Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}

/**
 * POST /api/orders/lookup
 * Recherche publique d'une commande par numéro + email
 * Utilisé pour l'authentification client sans compte
 */
export async function lookupOrder(
  req: AuthenticatedRequest & { body: { orderNumber: string; email: string } },
  res: Response
): Promise<void> {
  try {
    const { orderNumber, email } = req.body;

    if (!orderNumber || !email) {
      res.status(400).json({
        success: false,
        error: 'Numéro de commande et email requis',
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            priority: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        error: 'Commande non trouvée',
      });
      return;
    }

    // Vérifier que l'email correspond
    if (
      !order.customerEmail ||
      order.customerEmail.toLowerCase() !== email.toLowerCase()
    ) {
      res.status(403).json({
        success: false,
        error: "L'email ne correspond pas à cette commande",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerEmail: order.customerEmail,
          createdAt: order.createdAt,
        },
        tickets: order.tickets,
      },
    });
  } catch (error) {
    console.error('[Lookup Order Error]', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}
