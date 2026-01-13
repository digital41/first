import React, { useState } from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronRight,
  ArrowRight,
  Loader2,
  Filter,
} from 'lucide-react';
import { Ticket } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import useTicketQueue from '../../hooks/useTicketQueue';
import QueueItem from './QueueItem';
import {
  QueueSection,
  getSectionLabel,
  getSectionColors,
} from '../../lib/queueHelpers';
import TicketDetail from '../TicketDetail';
import { AdminApi } from '../../services/api';

// ============================================
// OPERATOR QUEUE PAGE
// ============================================
// Inbox-style view for operators with smart prioritization

interface QueueSectionHeaderProps {
  section: QueueSection;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const QueueSectionHeader: React.FC<QueueSectionHeaderProps> = ({
  section,
  count,
  isExpanded,
  onToggle,
}) => {
  const colors = getSectionColors(section);
  const icons: Record<QueueSection, React.ReactNode> = {
    urgent: <AlertTriangle className="w-4 h-4" />,
    toProcess: <Inbox className="w-4 h-4" />,
    waitingCustomer: <Clock className="w-4 h-4" />,
    resolved: <CheckCircle className="w-4 h-4" />,
  };

  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center justify-between p-3 rounded-lg mb-2
        ${colors.bg} ${colors.text} border ${colors.border}
        hover:opacity-90 transition-opacity
      `}
    >
      <div className="flex items-center space-x-2">
        {icons[section]}
        <span className="font-semibold">{getSectionLabel(section)}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.bg}`}>
          {count}
        </span>
      </div>
      <ChevronRight
        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
      />
    </button>
  );
};

const OperatorQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<QueueSection>>(
    new Set(['urgent', 'toProcess'])
  );
  const [showOnlyMine, setShowOnlyMine] = useState(true);

  const {
    groupedTickets,
    currentTicket,
    nextTicket,
    totalCount,
    urgentCount,
    toProcessCount,
    isLoading,
    isFocusMode,
    error,
    refresh,
    selectTicket,
    goToNextTicket,
    toggleFocusMode,
  } = useTicketQueue({
    operatorId: showOnlyMine ? user?.id : undefined,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Load agents for ticket detail
  React.useEffect(() => {
    AdminApi.getAgents().then(setAgents).catch(console.error);
  }, []);

  const toggleSection = (section: QueueSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    selectTicket(updatedTicket);
    refresh();
  };

  // Focus mode: show only the current ticket
  if (isFocusMode && currentTicket) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Focus Mode Header */}
        <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-semibold">Mode Focus</span>
            <span className="text-indigo-200 text-sm">
              {urgentCount > 0 && `${urgentCount} urgent${urgentCount > 1 ? 's' : ''} restant${urgentCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {nextTicket && (
              <button
                onClick={goToNextTicket}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <span>Ticket suivant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleFocusMode}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Quitter le mode focus"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ticket Detail */}
        <TicketDetail
          ticket={currentTicket}
          agents={agents}
          onBack={() => {
            selectTicket(null);
            toggleFocusMode();
          }}
          onUpdate={handleTicketUpdate}
        />
      </div>
    );
  }

  // Show ticket detail in split view
  if (currentTicket && !isFocusMode) {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Queue sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800">Ma file</h2>
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center space-x-2 text-sm">
              {urgentCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-slate-500">{toProcessCount} a traiter</span>
            </div>
          </div>

          {/* Compact queue list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(['urgent', 'toProcess', 'waitingCustomer'] as QueueSection[]).map((section) => (
              <div key={section}>
                {groupedTickets[section].length > 0 && (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${getSectionColors(section).text}`}>
                      {getSectionLabel(section)} ({groupedTickets[section].length})
                    </p>
                    <div className="space-y-1.5 mb-4">
                      {groupedTickets[section].slice(0, 5).map((ticket) => (
                        <QueueItem
                          key={ticket.id}
                          ticket={ticket}
                          isActive={ticket.id === currentTicket.id}
                          isCompact
                          onClick={selectTicket}
                        />
                      ))}
                      {groupedTickets[section].length > 5 && (
                        <p className="text-xs text-slate-400 text-center py-1">
                          +{groupedTickets[section].length - 5} autres
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Next ticket button */}
          {nextTicket && (
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={goToNextTicket}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <span>Ticket suivant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Ticket detail */}
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => selectTicket(null)}
              className="text-slate-500 hover:text-slate-700 text-sm"
            >
              ← Retour a la file
            </button>
            <button
              onClick={toggleFocusMode}
              className="flex items-center space-x-2 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Mode focus</span>
            </button>
          </div>
          <TicketDetail
            ticket={currentTicket}
            agents={agents}
            onBack={() => selectTicket(null)}
            onUpdate={handleTicketUpdate}
          />
        </div>
      </div>
    );
  }

  // Main queue view
  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ma file d'attente</h1>
          <p className="text-slate-500 mt-1">
            {totalCount} ticket{totalCount !== 1 ? 's' : ''} au total
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter toggle */}
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
              ${showOnlyMine
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <Filter className="w-4 h-4" />
            <span>{showOnlyMine ? 'Mes tickets' : 'Tous les tickets'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Focus mode */}
          {nextTicket && (
            <button
              onClick={() => {
                selectTicket(nextTicket);
                toggleFocusMode();
              }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Mode Focus</span>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error.message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Queue sections */}
      {!isLoading && (
        <div className="space-y-4">
          {(['urgent', 'toProcess', 'waitingCustomer', 'resolved'] as QueueSection[]).map(
            (section) => {
              const tickets = groupedTickets[section];
              const isExpanded = expandedSections.has(section);

              if (tickets.length === 0 && section !== 'urgent') return null;

              return (
                <div key={section}>
                  <QueueSectionHeader
                    section={section}
                    count={tickets.length}
                    isExpanded={isExpanded}
                    onToggle={() => toggleSection(section)}
                  />

                  {isExpanded && tickets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {tickets.map((ticket) => (
                        <QueueItem
                          key={ticket.id}
                          ticket={ticket}
                          onClick={selectTicket}
                        />
                      ))}
                    </div>
                  )}

                  {isExpanded && tickets.length === 0 && section === 'urgent' && (
                    <div className="text-center py-8 text-slate-500 bg-green-50 rounded-lg mb-4">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p>Aucun ticket urgent</p>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
};

export default OperatorQueuePage;
