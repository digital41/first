import { Router, type RequestHandler } from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import * as orderController from '../controllers/order.controller.js';

// ============================================
// ROUTES COMMANDES
// ============================================

const router = Router();

// POST /api/orders/lookup - Recherche publique (numéro + email)
// Cette route utilise optionalAuth car elle peut être utilisée
// par des clients non connectés pour vérifier leur commande
router.post('/lookup', optionalAuth as unknown as RequestHandler, orderController.lookupOrder as unknown as RequestHandler);

// Routes protégées
router.use(authenticate as unknown as RequestHandler);

// GET /api/orders - Liste des commandes
router.get('/', orderController.getOrders as unknown as RequestHandler);

// GET /api/orders/number/:orderNumber - Par numéro de commande
router.get('/number/:orderNumber', orderController.getOrderByNumber as unknown as RequestHandler);

// GET /api/orders/:id - Détail par ID
router.get('/:id', orderController.getOrderById as unknown as RequestHandler);

export default router;
