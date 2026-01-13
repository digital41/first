import { Router, type RequestHandler } from 'express';
import { upload } from '../config/multer.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as uploadController from '../controllers/upload.controller.js';

// ============================================
// ROUTES UPLOAD
// ============================================

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate as unknown as RequestHandler);

// POST /api/upload - Upload fichiers (max 5)
router.post('/', upload.array('files', 5), uploadController.uploadFiles as unknown as RequestHandler);

// GET /api/upload/:id - Infos d'un fichier
router.get('/:id', uploadController.getAttachment as unknown as RequestHandler);

// DELETE /api/upload/:id - Supprimer un fichier
router.delete('/:id', uploadController.deleteAttachment as unknown as RequestHandler);

export default router;
