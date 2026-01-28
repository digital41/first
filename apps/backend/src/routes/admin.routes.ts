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
import * as automationController from '../controllers/automation.controller.js';
import * as brandController from '../controllers/brand.controller.js';
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
// TRANSFERT DE TICKETS
// ============================================

// Demander un transfert de ticket
router.post('/tickets/:id/transfer', ticketController.requestTransfer as unknown as RequestHandler);

// Accepter un transfert
router.post('/transfers/:transferId/accept', ticketController.acceptTransfer as unknown as RequestHandler);

// Refuser un transfert
router.post('/transfers/:transferId/decline', ticketController.declineTransfer as unknown as RequestHandler);

// Voir les transferts en attente
router.get('/transfers/pending', ticketController.getPendingTransfers as unknown as RequestHandler);

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
// CLIENTS SAV
// ============================================

// Liste des clients ayant ouvert des tickets
router.get('/clients', userController.getClientsWithTickets as unknown as RequestHandler);

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

// Suggestion IA avec streaming (plus rapide)
router.post('/ai/suggest-stream/:ticketId', aiController.getAISuggestionStream as unknown as RequestHandler);

// Analyser rapidement un ticket
router.post('/ai/analyze/:ticketId', aiController.analyzeTicket as unknown as RequestHandler);

// Résumé intelligent de la conversation par IA
router.post('/ai/summary/:ticketId', aiController.getConversationSummary as unknown as RequestHandler);

// Chat avec l'assistant IA global
router.post('/ai/chat', aiController.chatWithGlobalAssistant as unknown as RequestHandler);

// ============================================
// AUTOMATISATION
// ============================================

// Statistiques d'automatisation
router.get('/automation/stats', automationController.getStats as unknown as RequestHandler);

// Historique des exécutions
router.get('/automation/history', automationController.getExecutionHistory as unknown as RequestHandler);

// Liste des règles d'automatisation
router.get('/automation/rules', automationController.listRules as unknown as RequestHandler);

// Créer une règle (Admin/Supervisor uniquement)
router.post('/automation/rules', requireStaff as unknown as RequestHandler, automationController.createRule as unknown as RequestHandler);

// Obtenir une règle
router.get('/automation/rules/:id', automationController.getRule as unknown as RequestHandler);

// Mettre à jour une règle (Admin/Supervisor uniquement)
router.put('/automation/rules/:id', requireStaff as unknown as RequestHandler, automationController.updateRule as unknown as RequestHandler);

// Supprimer une règle (Admin uniquement)
router.delete('/automation/rules/:id', adminOnly, automationController.deleteRule as unknown as RequestHandler);

// Activer/Désactiver une règle
router.put('/automation/rules/:id/toggle', requireStaff as unknown as RequestHandler, automationController.toggleRule as unknown as RequestHandler);

// ============================================
// MARQUES (Base de connaissances)
// ============================================

// Liste toutes les marques (incluant inactives)
router.get('/brands', brandController.getAllBrandsAdmin as unknown as RequestHandler);

// Créer une marque
router.post('/brands', adminOnly, brandController.createBrand as unknown as RequestHandler);

// Mettre à jour une marque
router.put('/brands/:id', adminOnly, brandController.updateBrand as unknown as RequestHandler);

// Supprimer une marque
router.delete('/brands/:id', adminOnly, brandController.deleteBrand as unknown as RequestHandler);

// Réordonner les marques
router.post('/brands/reorder', adminOnly, brandController.reorderBrands as unknown as RequestHandler);

export default router;
