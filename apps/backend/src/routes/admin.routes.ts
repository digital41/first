import { Router, type RequestHandler } from 'express';
import { authenticate, blockNonStaff, requireAdmin, requireStaff } from '../middlewares/index.js';
import * as ticketController from '../controllers/ticket.controller.js';
import * as userController from '../controllers/user.controller.js';
import * as messageController from '../controllers/message.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as slaController from '../controllers/sla.controller.js';
import * as cannedResponseController from '../controllers/canned-response.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import * as aiController from '../controllers/ai.controller.js';
import { upload } from '../config/multer.js';

// ============================================
// ROUTES ADMIN (Espace Administration)
// ============================================
// Toutes les routes ici sont protégées par blockNonStaff
// Seuls ADMIN, SUPERVISOR, AGENT peuvent y accéder
// Préfixe: /api/admin

const router = Router();

// Type casting pour les middlewares avec AuthenticatedRequest
const auth = authenticate as unknown as RequestHandler;
const staffOnly = blockNonStaff as unknown as RequestHandler;
const adminOnly = requireAdmin as unknown as RequestHandler;

// Middleware global: bloquer tout accès non-staff
router.use(auth, staffOnly);

// ============================================
// TICKETS ADMIN
// ============================================

// Liste tous les tickets (avec filtres)
router.get('/tickets', ticketController.list as unknown as RequestHandler);

// Créer un ticket (création manuelle par un agent/admin)
router.post('/tickets', ticketController.create as unknown as RequestHandler);

// Statistiques des tickets
router.get('/tickets/stats', ticketController.stats as unknown as RequestHandler);

// Voir un ticket
router.get('/tickets/:id', ticketController.getOne as unknown as RequestHandler);

// Mettre à jour un ticket (assignation, statut, priorité, etc.)
router.put('/tickets/:id', ticketController.update as unknown as RequestHandler);

// ============================================
// MESSAGES ADMIN
// ============================================

// Voir les messages d'un ticket
router.get('/tickets/:ticketId/messages', messageController.getMessages as unknown as RequestHandler);

// Envoyer un message dans un ticket
router.post('/tickets/:ticketId/messages', messageController.createMessage as unknown as RequestHandler);

// Marquer un message comme lu
router.put('/messages/:id/read', messageController.markAsRead as unknown as RequestHandler);

// ============================================
// UTILISATEURS (Admin uniquement)
// ============================================

// Liste des utilisateurs
router.get('/users', userController.listUsers as unknown as RequestHandler);

// Liste des agents (pour assignation)
router.get('/agents', userController.getAvailableAgents as unknown as RequestHandler);

// Détails d'un utilisateur
router.get('/users/:id', userController.getUserById as unknown as RequestHandler);

// Statistiques d'un agent
router.get('/users/:id/stats', userController.getAgentStats as unknown as RequestHandler);

// Créer un utilisateur staff
router.post('/users', adminOnly, userController.createUser as unknown as RequestHandler);

// Mettre à jour un utilisateur
router.put('/users/:id', adminOnly, userController.updateUser as unknown as RequestHandler);

// Supprimer un utilisateur
router.delete('/users/:id', adminOnly, userController.deleteUser as unknown as RequestHandler);

// ============================================
// NOTIFICATIONS
// ============================================

// Récupérer ses notifications
router.get('/notifications', notificationController.getNotifications as unknown as RequestHandler);

// Nombre de non-lues
router.get('/notifications/unread-count', notificationController.getUnreadNotificationCount as unknown as RequestHandler);

// Marquer comme lue(s)
router.put('/notifications/read', notificationController.markAsRead as unknown as RequestHandler);

// Marquer toutes comme lues
router.put('/notifications/read-all', notificationController.markAllAsRead as unknown as RequestHandler);

// ============================================
// SLA (Admin/Supervisor uniquement)
// ============================================

// Voir les configs SLA
router.get('/sla', slaController.listSlaConfigs as unknown as RequestHandler);

// Mettre à jour une config SLA
router.put('/sla/:id', adminOnly, slaController.updateSlaConfig as unknown as RequestHandler);

// ============================================
// RÉPONSES PRÉDÉFINIES
// ============================================

// Liste des réponses
router.get('/canned-responses', cannedResponseController.listCannedResponses as unknown as RequestHandler);

// Créer une réponse
router.post('/canned-responses', cannedResponseController.createCannedResponse as unknown as RequestHandler);

// Mettre à jour une réponse
router.put('/canned-responses/:id', cannedResponseController.updateCannedResponse as unknown as RequestHandler);

// Supprimer une réponse
router.delete('/canned-responses/:id', cannedResponseController.deleteCannedResponse as unknown as RequestHandler);

// ============================================
// UPLOADS
// ============================================

// Upload de fichiers
router.post('/upload', upload.array('files', 5), uploadController.uploadFiles as unknown as RequestHandler);

// ============================================
// ASSISTANT IA OPÉRATEUR
// ============================================

// Obtenir une suggestion IA pour un ticket
router.post('/ai/suggest/:ticketId', aiController.getAISuggestion as unknown as RequestHandler);

// Analyser rapidement un ticket
router.post('/ai/analyze/:ticketId', aiController.analyzeTicket as unknown as RequestHandler);

// Résumé intelligent de la conversation par IA
router.post('/ai/summary/:ticketId', aiController.getConversationSummary as unknown as RequestHandler);

// Chat avec l'assistant IA global
router.post('/ai/chat', aiController.chatWithGlobalAssistant as unknown as RequestHandler);

export default router;
