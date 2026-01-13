import { Router } from 'express';
import authRoutes from './auth.routes.js';
import ticketRoutes from './ticket.routes.js';
import healthRoutes from './health.routes.js';
import uploadRoutes from './upload.routes.js';
import messageRoutes from './message.routes.js';
import orderRoutes from './order.routes.js';
import notificationRoutes from './notification.routes.js';
import userRoutes from './user.routes.js';
import slaRoutes from './sla.routes.js';
import cannedResponseRoutes from './canned-response.routes.js';

// ============================================
// ROUTEUR PRINCIPAL
// ============================================

const router = Router();

// Routes de santé (pas de préfixe pour /health)
router.use('/health', healthRoutes);

// Routes d'authentification
router.use('/auth', authRoutes);

// Routes des tickets
router.use('/tickets', ticketRoutes);

// Routes upload (fichiers)
router.use('/upload', uploadRoutes);

// Routes commandes
router.use('/orders', orderRoutes);

// Routes notifications
router.use('/notifications', notificationRoutes);

// Routes utilisateurs
router.use('/users', userRoutes);

// Routes SLA
router.use('/sla', slaRoutes);

// Routes réponses prédéfinies
router.use('/canned-responses', cannedResponseRoutes);

// Routes messages (montées à la racine car chemins mixtes)
router.use('/', messageRoutes);

// Route racine API
router.get('/', (_req, res) => {
  res.json({
    name: 'KLY SAV API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health',
  });
});

export default router;
