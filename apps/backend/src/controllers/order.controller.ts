import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthenticatedRequest } from '../types/index.js';

// ============================================
// CONTROLLER COMMANDES
// ============================================

/**
 * GET /api/orders
 * Liste les commandes
 * - Agents/Admins: toutes les commandes
 * - Clients: recherche par email
 */
export async function getOrders(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { role, email } = req.user;
    const { search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    // Clients ne voient que leurs propres commandes
    if (role === 'CUSTOMER') {
      where.customerEmail = { equals: email, mode: 'insensitive' };
    } else if (search) {
      // Admins/Agents peuvent rechercher toutes les commandes
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { customerEmail: { contains: search as string, mode: 'insensitive' } },
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
 */
export async function getOrderById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { role, email } = req.user;

    const order = await prisma.order.findUnique({
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
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Commande non trouvée' });
      return;
    }

    // Clients ne peuvent voir que leurs propres commandes
    if (role === 'CUSTOMER' && order.customerEmail?.toLowerCase() !== email?.toLowerCase()) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    res.json({ success: true, data: order });
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
