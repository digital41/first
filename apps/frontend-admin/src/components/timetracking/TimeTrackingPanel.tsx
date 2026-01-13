import React, { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Timer,
  User,
} from 'lucide-react';
import useTicketTimer from '../../hooks/useTicketTimer';
import {
  formatDuration,
  formatDurationLong,
  TimeEntry,
} from '../../lib/timeTrackingTypes';

// ============================================
// TIME TRACKING PANEL COMPONENT
// ============================================
// Panneau complet de suivi du temps pour un ticket

interface TimeTrackingPanelProps {
  ticketId: string;
  agentId: string;
  agentName?: string;
  variant?: 'sidebar' | 'modal' | 'inline';
}

const TimeTrackingPanel: React.FC<TimeTrackingPanelProps> = ({
  ticketId,
  agentId,
  agentName,
  variant = 'sidebar',
}) => {
  const {
    isRunning,
    currentTime,
    stats,
    start,
    stop,
    toggle,
    reset,
    addManualEntry,
    deleteEntry,
    entries,
  } = useTicketTimer({ ticketId, agentId, agentName });

  const [showHistory, setShowHistory] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const handleAddManual = () => {
    const minutes = parseInt(manualMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    addManualEntry(minutes * 60, manualDescription || undefined);
    setManualMinutes('');
    setManualDescription('');
    setShowManualForm(false);
  };

  const totalDisplayTime = stats.totalTime + (isRunning ? currentTime : 0);

  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={toggle}
          className={`
            inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              isRunning
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }
          `}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span className="tabular-nums">{formatDuration(currentTime)}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Démarrer</span>
            </>
          )}
        </button>

        {stats.totalTime > 0 && (
          <span className="text-xs text-slate-500">
            Total: {formatDuration(totalDisplayTime)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
          <Timer className="w-5 h-5 text-indigo-600" />
          <span>Suivi du temps</span>
        </h3>
      </div>

      {/* Timer principal */}
      <div className="p-4">
        {/* Affichage du temps */}
        <div className="text-center mb-4">
          <div
            className={`text-4xl font-bold tabular-nums ${
              isRunning ? 'text-green-600' : 'text-slate-800'
            }`}
          >
            {formatDuration(isRunning ? currentTime : 0)}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isRunning ? 'Session en cours' : 'Chronomètre arrêté'}
          </p>
        </div>

        {/* Boutons de contrôle */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          <button
            onClick={toggle}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
              transition-all duration-200
              ${
                isRunning
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }
            `}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Démarrer</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Ajouter manuellement"
          >
            <Plus className="w-5 h-5" />
          </button>

          {stats.totalTime > 0 && (
            <button
              onClick={() => {
                if (confirm('Réinitialiser tout le temps enregistré ?')) {
                  reset();
                }
              }}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Réinitialiser"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Formulaire d'ajout manuel */}
        {showManualForm && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="number"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Minutes"
                min="1"
                className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-500">min</span>
            </div>
            <input
              type="text"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowManualForm(false)}
                className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleAddManual}
                disabled={!manualMinutes || parseInt(manualMinutes, 10) <= 0}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-lg font-semibold text-slate-800 tabular-nums">
              {formatDuration(totalDisplayTime)}
            </div>
            <div className="text-xs text-slate-500">Temps total</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <div className="text-lg font-semibold text-slate-800">
              {stats.sessionCount}
            </div>
            <div className="text-xs text-slate-500">Sessions</div>
          </div>
        </div>

        {/* Historique */}
        {entries.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span>Historique ({entries.length})</span>
              {showHistory ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {entries
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <TimeEntryItem
                      key={entry.id}
                      entry={entry}
                      onDelete={() => deleteEntry(entry.id)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// TIME ENTRY ITEM
// ============================================

interface TimeEntryItemProps {
  entry: TimeEntry;
  onDelete: () => void;
}

const TimeEntryItem: React.FC<TimeEntryItemProps> = ({ entry, onDelete }) => {
  const startDate = new Date(entry.startTime);

  return (
    <div
      className={`p-2 rounded-lg text-sm ${
        entry.isActive
          ? 'bg-green-50 border border-green-200'
          : 'bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700 tabular-nums">
            {formatDuration(entry.duration)}
          </span>
          {entry.isActive && (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
              Active
            </span>
          )}
        </div>
        {!entry.isActive && (
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{startDate.toLocaleDateString('fr-FR')}</span>
        {entry.agentName && (
          <span className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{entry.agentName}</span>
          </span>
        )}
      </div>
      {entry.description && (
        <p className="mt-1 text-xs text-slate-600 truncate">
          {entry.description}
        </p>
      )}
    </div>
  );
};

export default TimeTrackingPanel;
