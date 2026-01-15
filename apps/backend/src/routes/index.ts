import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import clientRoutes from './client.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import sageRoutes from './sage.routes.js';
import sageWriteRoutes from './sage-write.routes.js';

// ============================================
// ROUTEUR PRINCIPAL
// ============================================
//
// Structure des routes:
// - /api/health     -> Health checks (public)
// - /api/auth       -> Authentification (public)
// - /api/client/*   -> Espace client SAV (CUSTOMER)
// - /api/admin/*    -> Espace administration (ADMIN, SUPERVISOR, AGENT)
//

const router = Router();

// ============================================
// ROUTES PUBLIQUES
// ============================================

// Health checks
router.use('/health', healthRoutes);

// Authentification (client + admin)
router.use('/auth', authRoutes);

// ============================================
// ROUTES PROTÉGÉES
// ============================================

// Espace Client SAV
router.use('/client', clientRoutes);

// Espace Administration (staff uniquement)
router.use('/admin', adminRoutes);

// API IA (assistant intelligent)
router.use('/ai', aiRoutes);

// API SAGE (lecture seule, optionnelle)
router.use('/sage', sageRoutes);

// API SAGE V2 - Écriture (DÉSACTIVÉ par défaut, admin only)
router.use('/sage/write', sageWriteRoutes);

// ============================================
// ROUTE RACINE
// ============================================

router.get('/', (_req, res) => {
  res.json({
    name: 'KLY SAV API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      client: '/api/client (espace client)',
      admin: '/api/admin (staff uniquement)',
      sage: '/api/sage (lecture SAGE, optionnel)',
      sageWrite: '/api/sage/write (écriture SAGE V2, désactivé par défaut)',
    },
  });
});

// ============================================
// 404 - Route non trouvée
// ============================================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} non trouvée`,
    hint: 'Vérifiez le préfixe: /api/client/* ou /api/admin/*',
  });
});

export default router;
