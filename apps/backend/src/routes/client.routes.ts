import { Router, type RequestHandler, type Response, type NextFunction } from 'express';
import { authenticate } from '../middlewares/index.js';
import * as ticketController from '../controllers/ticket.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as messageController from '../controllers/message.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import * as brandController from '../controllers/brand.controller.js';
import { upload } from '../config/multer.js';
import { ClientAIService } from '../services/client-ai.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

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

// ============================================
// MARQUES (Base de connaissances - Public)
// ============================================

// Liste des marques actives (pas besoin d'auth)
router.get('/brands', brandController.getAllBrands as unknown as RequestHandler);

// Détails d'une marque
router.get('/brands/:id', brandController.getBrandById as unknown as RequestHandler);

// ============================================
// ASSISTANT IA CLIENT (LUMO)
// ============================================

// Chat avec l'assistant IA LUMO (sécurisé côté serveur)
router.post('/ai/chat', auth, (async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { message, conversationHistory } = req.body as {
      message: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Le message est requis'
      });
      return;
    }

    const user = req.user;
    console.log(`[Client AI] Chat request from ${user.email}: "${message.slice(0, 50)}..."`);

    // Appeler le service AI avec le contexte utilisateur
    const response = await ClientAIService.chat(
      message,
      {
        userId: user.id,
        customerCode: user.customerCode || undefined,
        customerName: user.email, // Utilise l'email comme nom client
        email: user.email
      },
      conversationHistory || []
    );

    res.json({
      success: response.success,
      data: {
        message: response.message
      },
      error: response.error
    });
  } catch (error) {
    console.error('[Client AI Route] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la communication avec l\'assistant'
    });
  }
}) as unknown as RequestHandler);

// Réinitialiser la session de chat
router.post('/ai/reset', auth, (async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
  try {
    ClientAIService.clearSession(req.user.id);
    res.json({
      success: true,
      message: 'Session réinitialisée'
    });
  } catch (error) {
    console.error('[Client AI Reset] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation'
    });
  }
}) as unknown as RequestHandler);

// Créer un ticket SAV depuis la conversation LUMO
router.post('/ai/create-ticket', auth, (async (req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { conversationHistory } = req.body as {
      conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Historique de conversation requis (minimum 2 messages)'
      });
      return;
    }

    const user = req.user;
    console.log(`[Client AI] Ticket creation request from ${user.email}`);

    // Créer le ticket via le service AI
    const result = await ClientAIService.createTicketFromConversation(
      conversationHistory,
      {
        userId: user.id,
        customerCode: user.customerCode || undefined,
        customerName: user.email, // Utilise l'email comme nom client
        email: user.email
      }
    );

    if (result.success && result.ticket) {
      res.json({
        success: true,
        data: {
          ticketId: result.ticket.id,
          ticketNumber: result.ticket.ticketNumber,
          // Réponse contextuelle générée par l'IA
          contextualResponse: result.contextualResponse,
          message: `Ticket ${result.ticket.ticketNumber} créé avec succès !`
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Impossible de créer le ticket'
      });
    }
  } catch (error) {
    console.error('[Client AI Create Ticket] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du ticket'
    });
  }
}) as unknown as RequestHandler);

export default router;
