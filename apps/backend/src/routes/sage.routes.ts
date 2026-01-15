// ============================================
// ROUTES SAGE - LECTURE SEULE
// ============================================
// Ces routes permettent de récupérer des données SAGE
// Elles sont optionnelles et ne cassent rien si SAGE n'est pas disponible

import { Router, Request, Response, RequestHandler } from 'express';
import { authenticate, requireStaff } from '../middlewares/auth.middleware.js';
import { SageService } from '../services/sage.service.js';
import { sageConfig } from '../config/sage.config.js';
import { getSyncStats, syncCustomerOrders, syncSageOrders } from '../services/sage-sync.service.js';

const router = Router();

// Toutes les routes SAGE nécessitent une authentification staff
router.use(authenticate as unknown as RequestHandler);
router.use(requireStaff as unknown as RequestHandler);

// ============================================
// GET /sage/status - État de la connexion SAGE
// ============================================
router.get('/status', (async (_req: Request, res: Response): Promise<void> => {
  try {
    const isAvailable = await SageService.isAvailable();
    const cacheStats = SageService.getCacheStats();

    res.json({
      success: true,
      data: {
        enabled: sageConfig.enabled,
        available: isAvailable,
        cache: cacheStats,
        message: !sageConfig.enabled
          ? 'SAGE désactivé dans la configuration'
          : isAvailable
            ? 'SAGE connecté et opérationnel'
            : 'SAGE configuré mais non accessible',
      },
    });
  } catch {
    res.json({
      success: true,
      data: {
        enabled: false,
        available: false,
        message: 'Erreur lors de la vérification SAGE',
      },
    });
  }
}) as RequestHandler);

// ============================================
// GET /sage/customer/:code - Récupérer un client SAGE
// ============================================
router.get('/customer/:code', (async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code as string;
    const customer = await SageService.getCustomer(code);

    if (!customer) {
      res.json({
        success: true,
        data: null,
        message: 'Client non trouvé dans SAGE ou SAGE non disponible',
      });
      return;
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch {
    res.json({
      success: true,
      data: null,
      message: 'Erreur lors de la récupération du client',
    });
  }
}) as RequestHandler);

// ============================================
// GET /sage/customer/:code/orders - Commandes d'un client
// ============================================
router.get('/customer/:code/orders', (async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code as string;
    const orders = await SageService.getCustomerOrders(code);

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch {
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Erreur lors de la récupération des commandes',
    });
  }
}) as RequestHandler);

// ============================================
// GET /sage/order/:number - Détails d'une commande
// ============================================
router.get('/order/:number', (async (req: Request, res: Response): Promise<void> => {
  try {
    const orderNumber = req.params.number as string;
    const order = await SageService.getOrderByNumber(orderNumber);

    if (!order) {
      res.json({
        success: true,
        data: null,
        message: 'Commande non trouvée dans SAGE',
      });
      return;
    }

    // Récupérer aussi les lignes de commande
    const lines = await SageService.getOrderLines(orderNumber);
    order.lines = lines;

    res.json({
      success: true,
      data: order,
    });
  } catch {
    res.json({
      success: true,
      data: null,
      message: 'Erreur lors de la récupération de la commande',
    });
  }
}) as RequestHandler);

// ============================================
// GET /sage/search/customers - Recherche de clients
// ============================================
router.get('/search/customers', (async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.length < 2) {
      res.json({
        success: true,
        data: [],
        message: 'Requête trop courte (minimum 2 caractères)',
      });
      return;
    }

    const customers = await SageService.searchCustomers(query, limit);

    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch {
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Erreur lors de la recherche',
    });
  }
}) as RequestHandler);

// ============================================
// ARTICLES
// ============================================

// GET /sage/article/:ref - Récupérer un article par référence
router.get('/article/:ref', (async (req: Request, res: Response): Promise<void> => {
  try {
    const reference = req.params.ref as string;
    const article = await SageService.getArticle(reference);

    if (!article) {
      res.json({
        success: true,
        data: null,
        message: 'Article non trouvé dans SAGE',
      });
      return;
    }

    // Récupérer le stock si disponible
    const stock = await SageService.getArticleStock(reference);
    if (stock !== null) {
      article.stockQuantity = stock;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch {
    res.json({
      success: true,
      data: null,
      message: 'Erreur lors de la récupération de l\'article',
    });
  }
}) as RequestHandler);

// GET /sage/search/articles - Recherche d'articles
router.get('/search/articles', (async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 30;

    if (!query || query.length < 2) {
      res.json({
        success: true,
        data: [],
        message: 'Requête trop courte (minimum 2 caractères)',
      });
      return;
    }

    const articles = await SageService.searchArticles(query, limit);

    res.json({
      success: true,
      data: articles,
      count: articles.length,
    });
  } catch {
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Erreur lors de la recherche d\'articles',
    });
  }
}) as RequestHandler);

// GET /sage/articles/family/:code - Articles d'une famille
router.get('/articles/family/:code', (async (req: Request, res: Response): Promise<void> => {
  try {
    const familyCode = req.params.code as string;
    const limit = parseInt(req.query.limit as string) || 100;

    const articles = await SageService.getArticlesByFamily(familyCode, limit);

    res.json({
      success: true,
      data: articles,
      count: articles.length,
    });
  } catch {
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Erreur lors de la récupération des articles',
    });
  }
}) as RequestHandler);

// GET /sage/article/:ref/stock - Stock d'un article
router.get('/article/:ref/stock', (async (req: Request, res: Response): Promise<void> => {
  try {
    const reference = req.params.ref as string;
    const stock = await SageService.getArticleStock(reference);

    res.json({
      success: true,
      data: {
        reference,
        stock: stock ?? 0,
        available: stock !== null,
      },
    });
  } catch {
    res.json({
      success: true,
      data: {
        reference: req.params.ref,
        stock: 0,
        available: false,
      },
      message: 'Erreur lors de la récupération du stock',
    });
  }
}) as RequestHandler);

// ============================================
// POST /sage/cache/clear - Vider le cache SAGE
// ============================================
router.post('/cache/clear', (async (_req: Request, res: Response): Promise<void> => {
  try {
    SageService.clearCache();
    res.json({
      success: true,
      message: 'Cache SAGE vidé avec succès',
    });
  } catch {
    res.json({
      success: false,
      message: 'Erreur lors du vidage du cache',
    });
  }
}) as RequestHandler);

// ============================================
// GET /sage/sync/stats - Statistiques de synchronisation
// ============================================
router.get('/sync/stats', (async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = getSyncStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch {
    res.json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
}) as RequestHandler);

// ============================================
// POST /sage/sync - Déclencher une synchronisation manuelle
// ============================================
router.post('/sync', (async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await syncSageOrders();
    res.json({
      success: true,
      data: stats,
      message: 'Synchronisation terminée',
    });
  } catch {
    res.json({
      success: false,
      message: 'Erreur lors de la synchronisation',
    });
  }
}) as RequestHandler);

// ============================================
// POST /sage/sync/customer/:code - Synchroniser un client spécifique
// ============================================
router.post('/sync/customer/:code', (async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.code as string;
    const result = await syncCustomerOrders(code);
    res.json({
      success: result.success,
      data: result,
    });
  } catch {
    res.json({
      success: false,
      message: 'Erreur lors de la synchronisation du client',
    });
  }
}) as RequestHandler);

export default router;
