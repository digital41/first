// ============================================
// ROUTES SAGE V2 - ÉCRITURE (DÉSACTIVÉES)
// ============================================
// ⚠️ CES ROUTES SONT DÉSACTIVÉES PAR DÉFAUT
// Elles ne fonctionnent que si SAGE_WRITE_ENABLED=true
//
// À n'activer qu'après tests complets en environnement SAGE de test

import { Router, Request, Response, RequestHandler } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';
import { SageWriteService, CreateBRInput, CreateBLInput } from '../services/sage-write.service.js';

const router = Router();

// ============================================
// MIDDLEWARE: Vérification écriture activée
// ============================================
const checkWriteEnabled: RequestHandler = (_req, res, next) => {
  if (!SageWriteService.isWriteEnabled()) {
    res.status(403).json({
      success: false,
      error: 'Écriture SAGE désactivée',
      message: 'Pour activer, définir SAGE_WRITE_ENABLED=true dans .env (après tests)',
    });
    return;
  }
  next();
};

// Toutes les routes V2 nécessitent:
// 1. Authentification
// 2. Être ADMIN (sécurité maximale)
// 3. SAGE_WRITE_ENABLED=true
router.use(authenticate as unknown as RequestHandler);
router.use(requireAdmin as unknown as RequestHandler);
router.use(checkWriteEnabled);

// ============================================
// GET /sage/write/status - État du service V2
// ============================================
router.get('/status', (async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      writeEnabled: SageWriteService.isWriteEnabled(),
      message: 'Service d\'écriture SAGE V2 actif',
      warning: '⚠️ Les modifications SAGE sont irréversibles',
    },
  });
}) as RequestHandler);

// ============================================
// POST /sage/write/br - Créer un Bon de Retour
// ============================================
router.post('/br', (async (req: Request, res: Response): Promise<void> => {
  try {
    const input: CreateBRInput = req.body;

    // Validation basique
    if (!input.sourceDocNumber) {
      res.status(400).json({
        success: false,
        error: 'sourceDocNumber requis',
      });
      return;
    }

    const result = await SageWriteService.createBonRetour(input);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message,
      });
    }
  } catch (error) {
    console.error('[SAGE-WRITE] Erreur route BR:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}) as RequestHandler);

// ============================================
// POST /sage/write/bl - Créer un BL depuis BC
// ============================================
router.post('/bl', (async (req: Request, res: Response): Promise<void> => {
  try {
    const input: CreateBLInput = req.body;

    // Validation basique
    if (!input.bcDocNumber) {
      res.status(400).json({
        success: false,
        error: 'bcDocNumber requis',
      });
      return;
    }

    const result = await SageWriteService.createBLFromBC(input);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message,
      });
    }
  } catch (error) {
    console.error('[SAGE-WRITE] Erreur route BL:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}) as RequestHandler);

// ============================================
// PUT /sage/write/status/:docNumber - Maj statut
// ============================================
router.put('/status/:docNumber', (async (req: Request, res: Response): Promise<void> => {
  try {
    const docNumber = req.params.docNumber as string;
    const { status } = req.body as { status: number };

    if (!docNumber) {
      res.status(400).json({
        success: false,
        error: 'docNumber requis',
      });
      return;
    }

    if (typeof status !== 'number') {
      res.status(400).json({
        success: false,
        error: 'status (number) requis',
      });
      return;
    }

    const result = await SageWriteService.updateDocumentStatus(docNumber, status);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message,
      });
    }
  } catch (error) {
    console.error('[SAGE-WRITE] Erreur route status:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}) as RequestHandler);

export default router;
