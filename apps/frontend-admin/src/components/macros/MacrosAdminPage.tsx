import React, { useState } from 'react';
import {
  Plus,
  Zap,
  Edit2,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Loader2,
  BookOpen,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  User,
  Users,
  Tag,
  Star,
  Heart,
  ThumbsUp,
  Send,
  Archive,
  Folder,
} from 'lucide-react';
import { Macro, MACRO_TEMPLATES, getMacroColorClasses } from '../../lib/macroTypes';
import useMacros from '../../hooks/useMacros';
import MacroEditor from './MacroEditor';

// ============================================
// MACROS ADMIN PAGE
// ============================================
// Admin interface for managing macros

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

const MacrosAdminPage: React.FC = () => {
  const {
    macros,
    isLoading,
    createMacro,
    updateMacro,
    deleteMacro,
    duplicateMacro,
    toggleMacroActive,
    createFromTemplate,
  } = useMacros();

  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Handle save
  const handleSave = (macroData: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingMacro) {
      updateMacro(editingMacro.id, macroData);
    } else {
      createMacro(macroData);
    }
    setEditingMacro(null);
    setIsCreating(false);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    deleteMacro(id);
    setDeleteConfirmId(null);
  };

  // Handle duplicate
  const handleDuplicate = (id: string) => {
    const newMacro = duplicateMacro(id);
    if (newMacro) {
      setEditingMacro(newMacro);
    }
  };

  // Create from template
  const handleCreateFromTemplate = (index: number) => {
    const newMacro = createFromTemplate(index);
    setShowTemplates(false);
    setEditingMacro(newMacro);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Macros</h1>
          <p className="text-slate-500 mt-1">
            Créez des actions automatisées pour traiter les tickets plus rapidement
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle macro</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-800">{macros.length}</p>
          <p className="text-sm text-slate-500">Macros totales</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {macros.filter((m) => m.isActive).length}
          </p>
          <p className="text-sm text-slate-500">Macros actives</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-400">
            {macros.filter((m) => !m.isActive).length}
          </p>
          <p className="text-sm text-slate-500">Macros inactives</p>
        </div>
      </div>

      {/* Macros list */}
      {macros.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Aucune macro configurée
          </h3>
          <p className="text-slate-500 mb-6">
            Créez votre première macro pour automatiser le traitement des tickets
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Voir les templates
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Créer une macro
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {macros.map((macro) => {
            const IconComponent = ICON_COMPONENTS[macro.icon || 'zap'] || Zap;

            return (
              <div
                key={macro.id}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${
                  !macro.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${getMacroColorClasses(macro.color)}`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{macro.name}</h3>
                        {macro.description && (
                          <p className="text-sm text-slate-500">{macro.description}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMacroActive(macro.id)}
                      className={`p-1 rounded transition-colors ${
                        macro.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-slate-400 hover:bg-slate-100'
                      }`}
                      title={macro.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {macro.isActive ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  {/* Actions preview */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {macro.actions.map((action, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                      >
                        {action.type === 'sendMessage' && 'Message'}
                        {action.type === 'addInternalNote' && 'Note interne'}
                        {action.type === 'changeStatus' && `Statut: ${action.value}`}
                        {action.type === 'changePriority' && `Priorité: ${action.value}`}
                        {action.type === 'assignTo' && 'Assignation'}
                        {action.type === 'addTags' && 'Tags +'}
                        {action.type === 'removeTags' && 'Tags -'}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {macro.actions.length} action{macro.actions.length !== 1 ? 's' : ''}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDuplicate(macro.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Dupliquer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingMacro(macro)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(macro.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === macro.id && (
                  <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center justify-between">
                    <span className="text-sm text-red-600">Supprimer cette macro ?</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDelete(macro.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Templates de macros</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 gap-3">
                {MACRO_TEMPLATES.map((template, index) => {
                  const IconComponent =
                    ICON_COMPONENTS[template.icon || 'zap'] || Zap;

                  return (
                    <button
                      key={index}
                      onClick={() => handleCreateFromTemplate(index)}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${getMacroColorClasses(
                            template.color
                          )}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-800">
                            {template.name}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {template.description}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {template.actions?.length} action
                            {(template.actions?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor modal */}
      {(isCreating || editingMacro) && (
        <MacroEditor
          macro={editingMacro || undefined}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditingMacro(null);
          }}
        />
      )}
    </div>
  );
};

export default MacrosAdminPage;
