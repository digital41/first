import { Router } from 'express';
import { authenticate, blockNonStaff, requireAdmin, requireStaff } from '../middlewares/index.js';
import * as ticketController from '../controllers/ticket.controller.js';
import * as userController from '../controllers/user.controller.js';
import * as messageController from '../controllers/message.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as slaController from '../controllers/sla.controller.js';
import * as cannedResponseController from '../controllers/canned-response.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { upload } from '../config/multer.js';

// ============================================
// ROUTES ADMIN (Espace Administration)
// ============================================
// Toutes les routes ici sont protégées par blockNonStaff
// Seuls ADMIN, SUPERVISOR, AGENT peuvent y accéder
// Préfixe: /api/admin

const router = Router();

// Middleware global: bloquer tout accès non-staff
router.use(authenticate, blockNonStaff);

// ============================================
// TICKETS ADMIN
// ============================================

// Liste tous les tickets (avec filtres)
router.get('/tickets', ticketController.list);

// Statistiques des tickets
router.get('/tickets/stats', ticketController.stats);

// Voir un ticket
router.get('/tickets/:id', ticketController.getOne);

// Mettre à jour un ticket (assignation, statut, priorité, etc.)
router.put('/tickets/:id', ticketController.update);

// ============================================
// MESSAGES ADMIN
// ============================================

// Voir les messages d'un ticket
router.get('/tickets/:ticketId/messages', messageController.getMessages);

// Envoyer un message dans un ticket
router.post('/tickets/:ticketId/messages', messageController.createMessage);

// Marquer un message comme lu
router.put('/messages/:id/read', messageController.markAsRead);

// ============================================
// UTILISATEURS (Admin uniquement)
// ============================================

// Liste des utilisateurs
router.get('/users', userController.listUsers);

// Liste des agents (pour assignation)
router.get('/agents', userController.getAvailableAgents);

// Détails d'un utilisateur
router.get('/users/:id', userController.getUserById);

// Statistiques d'un agent
router.get('/users/:id/stats', userController.getAgentStats);

// Créer un utilisateur staff
router.post('/users', requireAdmin, userController.createUser);

// Mettre à jour un utilisateur
router.put('/users/:id', requireAdmin, userController.updateUser);

// Supprimer un utilisateur
router.delete('/users/:id', requireAdmin, userController.deleteUser);

// ============================================
// NOTIFICATIONS
// ============================================

// Récupérer ses notifications
router.get('/notifications', notificationController.getNotifications);

// Nombre de non-lues
router.get('/notifications/unread-count', notificationController.getUnreadNotificationCount);

// Marquer comme lue(s)
router.put('/notifications/read', notificationController.markAsRead);

// Marquer toutes comme lues
router.put('/notifications/read-all', notificationController.markAllAsRead);

// ============================================
// SLA (Admin/Supervisor uniquement)
// ============================================

// Voir les configs SLA
router.get('/sla', slaController.listSlaConfigs);

// Mettre à jour une config SLA
router.put('/sla/:id', requireAdmin, slaController.updateSlaConfig);

// ============================================
// RÉPONSES PRÉDÉFINIES
// ============================================

// Liste des réponses
router.get('/canned-responses', cannedResponseController.listCannedResponses);

// Créer une réponse
router.post('/canned-responses', cannedResponseController.createCannedResponse);

// Mettre à jour une réponse
router.put('/canned-responses/:id', cannedResponseController.updateCannedResponse);

// Supprimer une réponse
router.delete('/canned-responses/:id', cannedResponseController.deleteCannedResponse);

// ============================================
// UPLOADS
// ============================================

// Upload de fichiers
router.post('/upload', upload.array('files', 5), uploadController.uploadFiles);

export default router;
