import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { AutomationService } from '../services/automation.service.js';
import type { AutomationTrigger } from '@prisma/client';

// ============================================
// CONTROLLER: AUTOMATION RULES
// ============================================

/**
 * GET /api/admin/automation/rules
 * List all automation rules
 */
export async function listRules(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rules = await AutomationService.getRules(includeInactive);

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('[Automation] Error listing rules:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des règles',
    });
  }
}

/**
 * GET /api/admin/automation/rules/:id
 * Get a single automation rule
 */
export async function getRule(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const rule = await AutomationService.getRuleById(id);

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Règle non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('[Automation] Error getting rule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la règle',
    });
  }
}

/**
 * POST /api/admin/automation/rules
 * Create a new automation rule
 */
export async function createRule(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { name, description, trigger, conditions, actions, isActive, priority } = req.body;

    if (!name || !trigger || !actions) {
      res.status(400).json({
        success: false,
        error: 'Nom, déclencheur et actions sont requis',
      });
      return;
    }

    const rule = await AutomationService.createRule({
      name,
      description,
      trigger: trigger as AutomationTrigger,
      conditions: conditions || [],
      actions,
      isActive,
      priority,
      createdById: req.user.id,
    });

    console.log(`[Automation] Rule "${name}" created by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Règle créée avec succès',
    });
  } catch (error) {
    console.error('[Automation] Error creating rule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la règle',
    });
  }
}

/**
 * PUT /api/admin/automation/rules/:id
 * Update an automation rule
 */
export async function updateRule(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, trigger, conditions, actions, isActive, priority } = req.body;

    const rule = await AutomationService.updateRule(id, {
      name,
      description,
      trigger: trigger as AutomationTrigger,
      conditions,
      actions,
      isActive,
      priority,
    });

    console.log(`[Automation] Rule "${rule.name}" updated by ${req.user.email}`);

    res.json({
      success: true,
      data: rule,
      message: 'Règle mise à jour',
    });
  } catch (error) {
    console.error('[Automation] Error updating rule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la règle',
    });
  }
}

/**
 * DELETE /api/admin/automation/rules/:id
 * Delete an automation rule
 */
export async function deleteRule(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    await AutomationService.deleteRule(id);

    console.log(`[Automation] Rule deleted by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Règle supprimée',
    });
  } catch (error) {
    console.error('[Automation] Error deleting rule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la règle',
    });
  }
}

/**
 * PUT /api/admin/automation/rules/:id/toggle
 * Toggle a rule's active status
 */
export async function toggleRule(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const rule = await AutomationService.toggleRule(id);

    if (!rule) {
      res.status(404).json({
        success: false,
        error: 'Règle non trouvée',
      });
      return;
    }

    console.log(`[Automation] Rule "${rule.name}" ${rule.isActive ? 'activated' : 'deactivated'} by ${req.user.email}`);

    res.json({
      success: true,
      data: rule,
      message: rule.isActive ? 'Règle activée' : 'Règle désactivée',
    });
  } catch (error) {
    console.error('[Automation] Error toggling rule:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du basculement de la règle',
    });
  }
}

/**
 * GET /api/admin/automation/stats
 * Get automation statistics
 */
export async function getStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const stats = await AutomationService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Automation] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
}

/**
 * GET /api/admin/automation/history
 * Get execution history
 */
export async function getExecutionHistory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const ruleId = req.query.ruleId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await AutomationService.getExecutionHistory({ ruleId, limit, offset });

    res.json({
      success: true,
      data: history.executions,
      meta: {
        total: history.total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[Automation] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
}
