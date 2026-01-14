import type { Response } from 'express';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AttachmentContext } from '@prisma/client';

// ============================================
// CONTROLLER UPLOAD
// ============================================

/**
 * POST /api/upload
 * Upload un ou plusieurs fichiers
 */
export async function uploadFiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    const { ticketId, messageId, context } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni',
      });
      return;
    }

    // Déterminer le contexte
    const attachmentContext: AttachmentContext =
      context === 'MESSAGE' ? AttachmentContext.MESSAGE : AttachmentContext.TICKET;

    // Créer les attachments en BDD avec URL complète
    const baseUrl = config.server.baseUrl;
    const attachments = await Promise.all(
      files.map(async (file) => {
        return prisma.attachment.create({
          data: {
            context: attachmentContext,
            ticketId: ticketId || null,
            messageId: messageId || null,
            fileName: file.originalname, // Utiliser le nom original du fichier
            url: `${baseUrl}/uploads/${file.filename}`,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      data: attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        url: att.url,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
      })),
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload',
    });
  }
}

/**
 * GET /api/upload/:id
 * Récupère les infos d'un fichier
 */
export async function getAttachment(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        error: 'Fichier non trouvé',
      });
      return;
    }

    res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    console.error('[Get Attachment Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}

/**
 * DELETE /api/upload/:id
 * Supprime un fichier
 */
export async function deleteAttachment(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      res.status(404).json({
        success: false,
        error: 'Fichier non trouvé',
      });
      return;
    }

    // Supprimer de la BDD (le fichier physique reste pour l'instant)
    await prisma.attachment.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Fichier supprimé',
    });
  } catch (error) {
    console.error('[Delete Attachment Error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}
