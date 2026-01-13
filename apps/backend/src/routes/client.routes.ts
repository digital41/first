import { Router } from 'express';
import { authenticate } from '../middlewares/index.js';
import * as ticketController from '../controllers/ticket.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as messageController from '../controllers/message.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { upload } from '../config/multer.js';

// ============================================
// ROUTES CLIENT (Espace SAV Client)
// ============================================
// Toutes les routes ici sont accessibles aux clients authentifiés
// Préfixe: /api/client

const router = Router();

// ============================================
// TICKETS CLIENT
// ============================================

// Créer un ticket (client)
router.post('/tickets', authenticate, ticketController.create);

// Voir ses propres tickets
router.get('/tickets', authenticate, ticketController.list);

// Voir un ticket spécifique (le middleware vérifie que c'est bien le sien)
router.get('/tickets/:id', authenticate, ticketController.getOne);

// ============================================
// MESSAGES CLIENT
// ============================================

// Voir les messages d'un ticket
router.get('/tickets/:ticketId/messages', authenticate, messageController.getMessages);

// Envoyer un message dans un ticket
router.post('/tickets/:ticketId/messages', authenticate, messageController.createMessage);

// ============================================
// COMMANDES CLIENT
// ============================================

// Rechercher ses commandes
router.get('/orders', authenticate, orderController.getOrders);

// Voir une commande spécifique
router.get('/orders/:id', authenticate, orderController.getOrderById);

// ============================================
// NOTIFICATIONS CLIENT
// ============================================

// Liste des notifications
router.get('/notifications', authenticate, notificationController.getNotifications);

// Nombre de non-lues
router.get('/notifications/unread-count', authenticate, notificationController.getUnreadNotificationCount);

// Marquer comme lue(s)
router.put('/notifications/read', authenticate, notificationController.markAsRead);

// Marquer toutes comme lues
router.put('/notifications/read-all', authenticate, notificationController.markAllAsRead);

// ============================================
// UPLOADS CLIENT
// ============================================

// Upload de fichiers (pièces jointes)
router.post('/upload', authenticate, upload.array('files', 5), uploadController.uploadFiles);

// Récupérer un fichier
router.get('/upload/:id', authenticate, uploadController.getAttachment);

export default router;
