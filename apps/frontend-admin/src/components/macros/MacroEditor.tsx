import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  User,
  Users,
  Tag,
  Zap,
  Star,
  Heart,
  ThumbsUp,
  Send,
  Archive,
  Folder,
} from 'lucide-react';
import {
  Macro,
  MacroAction,
  MacroActionType,
  MACRO_COLORS,
  MACRO_ICONS,
} from '../../lib/macroTypes';
import { TicketStatus, TicketPriority } from '../../types';

// ============================================
// MACRO EDITOR COMPONENT
// ============================================
// Form for creating and editing macros

interface MacroEditorProps {
  macro?: Macro;
  onSave: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ICON_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  'mail': Mail,
  'message-square': MessageSquare,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  'clock': Clock,
  'help-circle': HelpCircle,
  'user': User,
  'users': Users,
  'tag': Tag,
  'zap': Zap,
  'star': Star,
  'heart': Heart,
  'thumbs-up': ThumbsUp,
  'send': Send,
  'archive': Archive,
  'folder': Folder,
};

const ACTION_LABELS: Record<MacroActionType, string> = {
  sendMessage: 'Envoyer un message',
  addInternalNote: 'Ajouter une note interne',
  changeStatus: 'Changer le statut',
  changePriority: 'Changer la priorité',
  assignTo: 'Assigner à',
  addTags: 'Ajouter des tags',
  removeTags: 'Retirer des tags',
};

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'OPEN', label: 'Ouvert' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'WAITING_CUSTOMER', label: 'En attente client' },
  { value: 'ESCALATED', label: 'Escaladé' },
  { value: 'RESOLVED', label: 'Résolu' },
  { value: 'CLOSED', label: 'Fermé' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'LOW', label: 'Basse' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Haute' },
  { value: 'URGENT', label: 'Urgente' },
];

const MacroEditor: React.FC<MacroEditorProps> = ({ macro, onSave, onCancel }) => {
  const [name, setName] = useState(macro?.name || '');
  const [description, setDescription] = useState(macro?.description || '');
  const [icon, setIcon] = useState(macro?.icon || 'zap');
  const [color, setColor] = useState(macro?.color || 'blue');
  const [actions, setActions] = useState<MacroAction[]>(macro?.actions || []);
  const [isActive, setIsActive] = useState(macro?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  // Add new action
  const addAction = (type: MacroActionType) => {
    const newAction: MacroAction = { type, value: '' };
    if (type === 'addTags' || type === 'removeTags') {
      newAction.value = [];
    }
    setActions([...actions, newAction]);
  };

  // Update action value
  const updateActionValue = (index: number, value: string | string[] | null) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], value };
    setActions(updated);
  };

  // Remove action
  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  // Move action
  const moveAction = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === actions.length - 1)
    ) {
      return;
    }

    const updated = [...actions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setActions(updated);
  };

  // Handle save
  const handleSave = () => {
    if (!name.trim()) return;

    setIsSaving(true);

    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      actions,
      isActive,
    });
  };

  // Render action value input
  const renderActionValueInput = (action: MacroAction, index: number) => {
    switch (action.type) {
      case 'sendMessage':
      case 'addInternalNote':
        return (
          <textarea
            value={action.value as string || ''}
            onChange={(e) => updateActionValue(index, e.target.value)}
            placeholder="Contenu du message..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );

      case 'changeStatus':
        return (
          <select
            value={action.value as string || ''}
            onChange={(e) => updateActionValue(index, e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Sélectionner un statut...</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'changePriority':
        return (
          <select
            value={action.value as string || ''}
            onChange={(e) => updateActionValue(index, e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Sélectionner une priorité...</option>
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'assignTo':
        return (
          <input
            type="text"
            value={action.value as string || ''}
            onChange={(e) => updateActionValue(index, e.target.value || null)}
            placeholder="ID de l'agent (vide = désassigner)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );

      case 'addTags':
      case 'removeTags':
        return (
          <input
            type="text"
            value={Array.isArray(action.value) ? action.value.join(', ') : ''}
            onChange={(e) =>
              updateActionValue(
                index,
                e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
              )
            }
            placeholder="Tags séparés par des virgules..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );

      default:
        return null;
    }
  };

  const IconComponent = ICON_COMPONENTS[icon] || Zap;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {macro ? 'Modifier la macro' : 'Nouvelle macro'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic info */}
          <div className="space-y-4 mb-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom de la macro *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Accusé de réception"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description courte..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Icône
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MACRO_ICONS.map((iconName) => {
                    const Icon = ICON_COMPONENTS[iconName] || Zap;
                    return (
                      <button
                        key={iconName}
                        onClick={() => setIcon(iconName)}
                        className={`p-2 rounded-lg border transition-colors ${
                          icon === iconName
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-600'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MACRO_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        color === c.value
                          ? 'ring-2 ring-offset-2 ring-indigo-500'
                          : ''
                      } ${c.class}`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Aperçu:</p>
              <div
                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${
                  MACRO_COLORS.find((c) => c.value === color)?.class || ''
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="font-medium">{name || 'Nom de la macro'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Actions ({actions.length})
            </label>

            <div className="space-y-3">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {ACTION_LABELS[action.type]}
                      </span>
                    </div>
                    <button
                      onClick={() => removeAction(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {renderActionValueInput(action, index)}
                </div>
              ))}
            </div>

            {/* Add action */}
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Ajouter une action:</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACTION_LABELS) as MacroActionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => addAction(type)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    + {ACTION_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">Macro active</p>
              <p className="text-sm text-slate-500">
                Les macros inactives ne sont pas visibles pour les opérateurs
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MacroEditor;
