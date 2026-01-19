import { Router, type RequestHandler } from 'express';
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

// Type casting pour les middlewares avec AuthenticatedRequest
const auth = authenticate as unknown as RequestHandler;

// ============================================
// TICKETS CLIENT
// ============================================

// Stats des tickets client (pour KPIs dashboard - inclut tous les statuts)
router.get('/tickets/my-stats', auth, ticketController.myStats as unknown as RequestHandler);

// Créer un ticket (client)
router.post('/tickets', auth, ticketController.create as unknown as RequestHandler);

// Voir ses propres tickets (exclut les résolus par défaut)
router.get('/tickets', auth, ticketController.list as unknown as RequestHandler);

// Voir un ticket spécifique (le middleware vérifie que c'est bien le sien)
router.get('/tickets/:id', auth, ticketController.getOne as unknown as RequestHandler);

// Mettre à jour un ticket (réouverture par le client)
router.put('/tickets/:id', auth, ticketController.update as unknown as RequestHandler);

// ============================================
// MESSAGES CLIENT
// ============================================

// Voir les messages d'un ticket
router.get('/tickets/:ticketId/messages', auth, messageController.getMessages as unknown as RequestHandler);

// Envoyer un message dans un ticket
router.post('/tickets/:ticketId/messages', auth, messageController.createMessage as unknown as RequestHandler);

// ============================================
// COMMANDES CLIENT
// ============================================

// Rechercher ses commandes
router.get('/orders', auth, orderController.getOrders as unknown as RequestHandler);

// Télécharger la facture/bon de commande en PDF
router.get('/orders/:orderNumber/invoice', auth, orderController.downloadInvoicePDF as unknown as RequestHandler);

// Voir une commande spécifique
router.get('/orders/:id', auth, orderController.getOrderById as unknown as RequestHandler);

// ============================================
// NOTIFICATIONS CLIENT
// ============================================

// Liste des notifications
router.get('/notifications', auth, notificationController.getNotifications as unknown as RequestHandler);

// Nombre de non-lues
router.get('/notifications/unread-count', auth, notificationController.getUnreadNotificationCount as unknown as RequestHandler);

// Marquer comme lue(s)
router.put('/notifications/read', auth, notificationController.markAsRead as unknown as RequestHandler);

// Marquer toutes comme lues
router.put('/notifications/read-all', auth, notificationController.markAllAsRead as unknown as RequestHandler);

// ============================================
// UPLOADS CLIENT
// ============================================

// Upload de fichiers (pièces jointes)
router.post('/upload', auth, upload.array('files', 5), uploadController.uploadFiles as unknown as RequestHandler);

// Récupérer un fichier
router.get('/upload/:id', auth, uploadController.getAttachment as unknown as RequestHandler);

export default router;
