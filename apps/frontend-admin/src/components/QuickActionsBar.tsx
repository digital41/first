import React, { useState } from 'react';
import {
  UserPlus,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';
import { User, TicketStatus, TicketPriority } from '../types';

// ============================================
// QUICK ACTIONS BAR COMPONENT
// ============================================
// Barre d'actions en masse pour les tickets sélectionnés
// Apparaît quand au moins un ticket est sélectionné

interface QuickActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  agents: User[];
  onBulkAssign: (agentId: string, ticketIds: string[]) => Promise<void>;
  onBulkStatusChange: (status: TicketStatus, ticketIds: string[]) => Promise<void>;
  onBulkPriorityChange: (priority: TicketPriority, ticketIds: string[]) => Promise<void>;
  onClearSelection: () => void;
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  selectedCount,
  selectedIds,
  agents,
  onBulkAssign,
  onBulkStatusChange,
  onBulkPriorityChange,
  onClearSelection,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
      onClearSelection();
    } catch (error) {
      console.error('Erreur action en masse:', error);
      alert('Erreur lors de l\'action en masse');
    } finally {
      setIsLoading(false);
      setActiveDropdown(null);
    }
  };

  return (
    <div className="bg-indigo-600 text-white px-4 py-3 rounded-lg mb-4 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
      <div className="flex items-center space-x-4">
        <span className="font-medium">
          {selectedCount} ticket{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <div className="flex items-center space-x-2">
            {/* Assigner */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'assign' ? null : 'assign')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assigner</span>
              </button>
              {activeDropdown === 'assign' && (
                <div className="absolute top-full left-0 mt-1 bg-white text-slate-700 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px] z-50">
                  <button
                    onClick={() => handleAction(() => onBulkAssign('', selectedIds))}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm"
                  >
                    Retirer l'assignation
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAction(() => onBulkAssign(agent.id, selectedIds))}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm flex items-center space-x-2"
                    >
                      <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                        {agent.displayName?.charAt(0) || '?'}
                      </div>
                      <span>{agent.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Changer Statut */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Statut</span>
              </button>
              {activeDropdown === 'status' && (
                <div className="absolute top-full left-0 mt-1 bg-white text-slate-700 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] z-50">
                  {[
                    { value: 'OPEN', label: 'Ouvert', color: 'bg-blue-100 text-blue-700' },
                    { value: 'IN_PROGRESS', label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
                    { value: 'WAITING_CUSTOMER', label: 'Attente client', color: 'bg-purple-100 text-purple-700' },
                    { value: 'RESOLVED', label: 'Résolu', color: 'bg-green-100 text-green-700' },
                    { value: 'CLOSED', label: 'Fermé', color: 'bg-slate-100 text-slate-600' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleAction(() => onBulkStatusChange(status.value as TicketStatus, selectedIds))}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm flex items-center space-x-2"
                    >
                      <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Changer Priorité */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Priorité</span>
              </button>
              {activeDropdown === 'priority' && (
                <div className="absolute top-full left-0 mt-1 bg-white text-slate-700 rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] z-50">
                  {[
                    { value: 'LOW', label: 'Basse', color: 'bg-slate-100 text-slate-600' },
                    { value: 'MEDIUM', label: 'Moyenne', color: 'bg-blue-100 text-blue-600' },
                    { value: 'HIGH', label: 'Haute', color: 'bg-orange-100 text-orange-600' },
                    { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-600' },
                  ].map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() => handleAction(() => onBulkPriorityChange(priority.value as TicketPriority, selectedIds))}
                      className="w-full px-3 py-2 text-left hover:bg-slate-100 text-sm flex items-center space-x-2"
                    >
                      <span className={`px-2 py-0.5 rounded text-xs ${priority.color}`}>
                        {priority.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fermer */}
      <button
        onClick={onClearSelection}
        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        title="Annuler la sélection"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default QuickActionsBar;
