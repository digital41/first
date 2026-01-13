import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { User, Ticket } from '../types';

// ============================================
// AGENT WORKLOAD WIDGET COMPONENT
// ============================================
// Affiche la charge de travail par agent
// Aide à la répartition équitable des tickets

interface AgentWorkload {
  agent: User;
  ticketCount: number;
  urgentCount: number;
  slaBreachedCount: number;
}

interface AgentWorkloadWidgetProps {
  agents: User[];
  tickets: Ticket[];
  onAssignToAgent?: (agentId: string) => void;
  onNavigateToUsers?: () => void;
  horizontal?: boolean;
}

const AgentWorkloadWidget: React.FC<AgentWorkloadWidgetProps> = ({
  agents,
  tickets,
  onAssignToAgent,
  onNavigateToUsers,
  horizontal = false,
}) => {
  const [workloads, setWorkloads] = useState<AgentWorkload[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    calculateWorkloads();
  }, [agents, tickets]);

  const calculateWorkloads = () => {
    const workloadMap = new Map<string, AgentWorkload>();

    // Initialize with all agents
    agents.forEach((agent) => {
      workloadMap.set(agent.id, {
        agent,
        ticketCount: 0,
        urgentCount: 0,
        slaBreachedCount: 0,
      });
    });

    // Count unassigned and calculate workloads
    let unassigned = 0;
    tickets.forEach((ticket) => {
      if (!ticket.assignedToId) {
        unassigned++;
        return;
      }

      const workload = workloadMap.get(ticket.assignedToId);
      if (workload) {
        workload.ticketCount++;
        if (ticket.priority === 'URGENT' || ticket.priority === 'HIGH') {
          workload.urgentCount++;
        }
        if (ticket.slaBreached) {
          workload.slaBreachedCount++;
        }
      }
    });

    setUnassignedCount(unassigned);
    setWorkloads(
      Array.from(workloadMap.values()).sort((a, b) => b.ticketCount - a.ticketCount)
    );
  };

  const getLoadColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count <= 3) return 'bg-green-500';
    if (count <= 6) return 'bg-yellow-500';
    if (count <= 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const maxTickets = Math.max(...workloads.map((w) => w.ticketCount), 1);
  const displayedWorkloads = isExpanded ? workloads : workloads.slice(0, horizontal ? 6 : 3);

  // Mode horizontal - barre en haut de la page
  if (horizontal) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-2 flex items-center justify-between">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">Charge agents</h3>
            </div>
            {unassignedCount > 0 && (
              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs">
                {unassignedCount} non assignés
              </span>
            )}
          </div>

          {/* Agents list - horizontal */}
          <div className="flex items-center space-x-4 flex-1 mx-6 overflow-x-auto">
            {displayedWorkloads.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun agent</p>
            ) : (
              displayedWorkloads.map((workload) => (
                <div
                  key={workload.agent.id}
                  className={`flex items-center space-x-2 px-2 py-1 rounded ${onAssignToAgent ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => onAssignToAgent?.(workload.agent.id)}
                >
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                    {workload.agent.displayName?.charAt(0) || '?'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    {workload.agent.displayName}
                  </span>
                  <div className="flex items-center space-x-1">
                    {workload.urgentCount > 0 && (
                      <span className="px-1 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded">
                        {workload.urgentCount}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getLoadColor(workload.ticketCount)} text-white`}>
                      {workload.ticketCount}
                    </span>
                  </div>
                </div>
              ))
            )}
            {workloads.length > 6 && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
              >
                +{workloads.length - 6} agents
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">
              {tickets.length} tickets
            </span>
            {onNavigateToUsers && (
              <button
                onClick={onNavigateToUsers}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Gérer les agents"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mode vertical - sidebar
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-full">
      {/* Header - Compact */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Charge agents</h3>
        </div>
        <div className="flex items-center space-x-1">
          {unassignedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-xs">
              {unassignedCount}
            </span>
          )}
          {onNavigateToUsers && (
            <button
              onClick={onNavigateToUsers}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Gérer les agents"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content - Compact */}
      <div className="p-2 space-y-2">
        {displayedWorkloads.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">Aucun agent</p>
        ) : (
          displayedWorkloads.map((workload) => (
            <div
              key={workload.agent.id}
              className={`group ${onAssignToAgent ? 'cursor-pointer hover:bg-slate-50 rounded transition-colors' : ''}`}
              onClick={() => onAssignToAgent?.(workload.agent.id)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center space-x-1.5">
                  <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-medium text-indigo-600">
                    {workload.agent.displayName?.charAt(0) || '?'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">
                    {workload.agent.displayName}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {workload.urgentCount > 0 && (
                    <span className="px-1 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded">
                      {workload.urgentCount}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-700">
                    {workload.ticketCount}
                  </span>
                </div>
              </div>

              {/* Progress bar - Smaller */}
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getLoadColor(workload.ticketCount)} transition-all duration-300`}
                  style={{ width: `${(workload.ticketCount / maxTickets) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}

        {/* Expand/Collapse button - Compact */}
        {workloads.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 py-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Moins</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>+{workloads.length - 3}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer - Compact */}
      <div className="px-2 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 text-center">
        {tickets.length} tickets | {workloads.length} agents
      </div>
    </div>
  );
};

export default AgentWorkloadWidget;
