import { Router, type RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as notificationController from '../controllers/notification.controller.js';

// ============================================
// ROUTES NOTIFICATIONS
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as unknown as RequestHandler);

// GET /api/notifications - Liste des notifications
router.get('/', notificationController.getNotifications as unknown as RequestHandler);

// GET /api/notifications/unread-count - Nombre non lues
router.get('/unread-count', notificationController.getUnreadNotificationCount as unknown as RequestHandler);

// PUT /api/notifications/read - Marquer comme lues
router.put('/read', notificationController.markAsRead as unknown as RequestHandler);

// PUT /api/notifications/read-all - Tout marquer comme lu
router.put('/read-all', notificationController.markAllAsRead as unknown as RequestHandler);

// DELETE /api/notifications/:id - Supprimer
router.delete('/:id', notificationController.deleteNotification as unknown as RequestHandler);

export default router;
