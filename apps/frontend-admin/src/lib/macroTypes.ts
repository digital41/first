import { TicketStatus, TicketPriority } from '../types';

// ============================================
// MACRO TYPES & DEFINITIONS
// ============================================

/**
 * Action types available in a macro
 */
export type MacroActionType =
  | 'sendMessage'
  | 'addInternalNote'
  | 'changeStatus'
  | 'changePriority'
  | 'assignTo'
  | 'addTags'
  | 'removeTags';

/**
 * Single action in a macro
 */
export interface MacroAction {
  type: MacroActionType;
  value: string | string[] | null;
}

/**
 * Complete macro definition
 */
export interface Macro {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  actions: MacroAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  shortcut?: string; // Keyboard shortcut (e.g., "ctrl+1")
}

/**
 * Macro execution context
 */
export interface MacroContext {
  ticketId: string;
  currentStatus: TicketStatus;
  currentPriority: TicketPriority;
  currentAssigneeId?: string | null;
  currentTags: string[];
}

/**
 * Macro execution result
 */
export interface MacroExecutionResult {
  success: boolean;
  actionsExecuted: number;
  errors: string[];
}

/**
 * Predefined macro templates
 */
export const MACRO_TEMPLATES: Partial<Macro>[] = [
  {
    name: 'Accusé de réception',
    description: 'Envoie un message de confirmation et passe en cours',
    icon: 'mail',
    color: 'blue',
    actions: [
      {
        type: 'sendMessage',
        value: 'Bonjour,\n\nNous avons bien reçu votre demande et nous la traitons dans les plus brefs délais.\n\nCordialement,\nL\'équipe SAV',
      },
      {
        type: 'changeStatus',
        value: 'IN_PROGRESS',
      },
    ],
  },
  {
    name: 'Demande d\'informations',
    description: 'Demande des précisions au client',
    icon: 'help-circle',
    color: 'purple',
    actions: [
      {
        type: 'sendMessage',
        value: 'Bonjour,\n\nAfin de traiter au mieux votre demande, pourriez-vous nous fournir des informations complémentaires ?\n\nMerci d\'avance,\nL\'équipe SAV',
      },
      {
        type: 'changeStatus',
        value: 'WAITING_CUSTOMER',
      },
    ],
  },
  {
    name: 'Résolution rapide',
    description: 'Marque comme résolu avec message de clôture',
    icon: 'check-circle',
    color: 'green',
    actions: [
      {
        type: 'sendMessage',
        value: 'Bonjour,\n\nVotre problème a été résolu. N\'hésitez pas à nous recontacter si vous avez d\'autres questions.\n\nCordialement,\nL\'équipe SAV',
      },
      {
        type: 'changeStatus',
        value: 'RESOLVED',
      },
    ],
  },
  {
    name: 'Escalade urgente',
    description: 'Escalade le ticket et ajoute une note interne',
    icon: 'alert-triangle',
    color: 'red',
    actions: [
      {
        type: 'changeStatus',
        value: 'ESCALATED',
      },
      {
        type: 'changePriority',
        value: 'URGENT',
      },
      {
        type: 'addInternalNote',
        value: 'Ticket escaladé - nécessite une attention immédiate.',
      },
    ],
  },
  {
    name: 'Attente fournisseur',
    description: 'Ajoute une note interne pour suivi fournisseur',
    icon: 'clock',
    color: 'amber',
    actions: [
      {
        type: 'addInternalNote',
        value: 'En attente de réponse du fournisseur.',
      },
      {
        type: 'addTags',
        value: ['attente-fournisseur'],
      },
    ],
  },
];

/**
 * Available icons for macros
 */
export const MACRO_ICONS = [
  'mail', 'message-square', 'check-circle', 'alert-triangle',
  'clock', 'help-circle', 'user', 'users', 'tag', 'zap',
  'star', 'heart', 'thumbs-up', 'send', 'archive', 'folder',
];

/**
 * Available colors for macros
 */
export const MACRO_COLORS = [
  { name: 'Bleu', value: 'blue', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  { name: 'Vert', value: 'green', class: 'bg-green-100 text-green-700 border-green-200' },
  { name: 'Rouge', value: 'red', class: 'bg-red-100 text-red-700 border-red-200' },
  { name: 'Jaune', value: 'amber', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  { name: 'Violet', value: 'purple', class: 'bg-purple-100 text-purple-700 border-purple-200' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { name: 'Gris', value: 'slate', class: 'bg-slate-100 text-slate-700 border-slate-200' },
];

/**
 * Get color classes for a macro
 */
export function getMacroColorClasses(color?: string): string {
  const colorDef = MACRO_COLORS.find((c) => c.value === color);
  return colorDef?.class || MACRO_COLORS[0].class;
}
