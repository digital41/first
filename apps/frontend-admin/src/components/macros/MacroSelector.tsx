import React, { useState } from 'react';
import {
  Zap,
  ChevronDown,
  Check,
  Loader2,
  X,
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
import { Ticket } from '../../types';
import { Macro, MacroContext, getMacroColorClasses } from '../../lib/macroTypes';
import useMacros from '../../hooks/useMacros';

// ============================================
// MACRO SELECTOR COMPONENT
// ============================================
// Dropdown for operators to apply macros to tickets

interface MacroSelectorProps {
  ticket: Ticket;
  onMacroApplied?: (macro: Macro, success: boolean) => void;
  variant?: 'button' | 'dropdown' | 'inline';
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

const MacroSelector: React.FC<MacroSelectorProps> = ({
  ticket,
  onMacroApplied,
  variant = 'dropdown',
}) => {
  const { activeMacros, isExecuting, executeMacro } = useMacros();
  const [isOpen, setIsOpen] = useState(false);
  const [executingMacroId, setExecutingMacroId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    macroId: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Build context for macro execution
  const buildContext = (): MacroContext => ({
    ticketId: ticket.id,
    currentStatus: ticket.status,
    currentPriority: ticket.priority,
    currentAssigneeId: ticket.assignedToId,
    currentTags: ticket.tags || [],
  });

  // Handle macro click
  const handleMacroClick = async (macro: Macro) => {
    setExecutingMacroId(macro.id);
    setLastResult(null);

    try {
      const result = await executeMacro(macro.id, buildContext());

      setLastResult({
        macroId: macro.id,
        success: result.success,
        message: result.success
          ? `${result.actionsExecuted} action${result.actionsExecuted !== 1 ? 's' : ''} exécutée${result.actionsExecuted !== 1 ? 's' : ''}`
          : result.errors[0] || 'Erreur',
      });

      onMacroApplied?.(macro, result.success);

      // Auto-close after success
      if (result.success) {
        setTimeout(() => {
          setIsOpen(false);
          setLastResult(null);
        }, 1500);
      }
    } catch (error) {
      setLastResult({
        macroId: macro.id,
        success: false,
        message: 'Erreur lors de l\'exécution',
      });
    } finally {
      setExecutingMacroId(null);
    }
  };

  // Clear result
  const clearResult = () => {
    setLastResult(null);
  };

  if (activeMacros.length === 0) {
    return null;
  }

  // Inline variant - horizontal buttons
  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {activeMacros.slice(0, 4).map((macro) => {
          const IconComponent = ICON_COMPONENTS[macro.icon || 'zap'] || Zap;
          const isExecutingThis = executingMacroId === macro.id;
          const result = lastResult?.macroId === macro.id ? lastResult : null;

          return (
            <button
              key={macro.id}
              onClick={() => handleMacroClick(macro)}
              disabled={isExecuting}
              className={`
                flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
                transition-all duration-200
                ${result?.success
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : result?.success === false
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : getMacroColorClasses(macro.color)
                }
                ${isExecutingThis ? 'opacity-75' : ''}
                hover:shadow-sm disabled:opacity-50
              `}
            >
              {isExecutingThis ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : result?.success ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <IconComponent className="w-3.5 h-3.5" />
              )}
              <span>{macro.name}</span>
            </button>
          );
        })}

        {activeMacros.length > 4 && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            +{activeMacros.length - 4} autres
          </button>
        )}
      </div>
    );
  }

  // Button variant - single button that opens modal
  if (variant === 'button') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          <span>Macros</span>
        </button>

        {isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Appliquer une macro</h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setLastResult(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                {/* Result banner */}
                {lastResult && (
                  <div
                    className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
                      lastResult.success
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {lastResult.success ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      <span className="text-sm">{lastResult.message}</span>
                    </div>
                    <button onClick={clearResult} className="p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {activeMacros.map((macro) => {
                    const IconComponent = ICON_COMPONENTS[macro.icon || 'zap'] || Zap;
                    const isExecutingThis = executingMacroId === macro.id;

                    return (
                      <button
                        key={macro.id}
                        onClick={() => handleMacroClick(macro)}
                        disabled={isExecuting}
                        className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${getMacroColorClasses(
                              macro.color
                            )}`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{macro.name}</p>
                            {macro.description && (
                              <p className="text-xs text-slate-500">
                                {macro.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {isExecutingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Dropdown variant (default)
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
      >
        <Zap className="w-4 h-4 text-indigo-600" />
        <span className="text-slate-700">Macros</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setLastResult(null);
            }}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions rapides
              </p>
            </div>

            {/* Result banner */}
            {lastResult && (
              <div
                className={`px-3 py-2 flex items-center justify-between ${
                  lastResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {lastResult.success ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs">{lastResult.message}</span>
                </div>
              </div>
            )}

            <div className="py-1 max-h-64 overflow-y-auto">
              {activeMacros.map((macro) => {
                const IconComponent = ICON_COMPONENTS[macro.icon || 'zap'] || Zap;
                const isExecutingThis = executingMacroId === macro.id;

                return (
                  <button
                    key={macro.id}
                    onClick={() => handleMacroClick(macro)}
                    disabled={isExecuting}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-50 text-left"
                  >
                    <div
                      className={`p-1.5 rounded-lg ${getMacroColorClasses(macro.color)}`}
                    >
                      {isExecutingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <IconComponent className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {macro.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {macro.actions.length} action
                        {macro.actions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MacroSelector;
