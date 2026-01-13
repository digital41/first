import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
}

const AgentWorkloadWidget: React.FC<AgentWorkloadWidgetProps> = ({
  agents,
  tickets,
  onAssignToAgent,
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

  const getLoadLabel = (count: number) => {
    if (count === 0) return 'Disponible';
    if (count <= 3) return 'Charge légère';
    if (count <= 6) return 'Charge normale';
    if (count <= 10) return 'Charge élevée';
    return 'Surchargé';
  };

  const maxTickets = Math.max(...workloads.map((w) => w.ticketCount), 1);
  const displayedWorkloads = isExpanded ? workloads : workloads.slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Charge agents</h3>
        </div>
        {unassignedCount > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-full text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{unassignedCount} non assigné{unassignedCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {displayedWorkloads.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-2">Aucun agent</p>
        ) : (
          displayedWorkloads.map((workload) => (
            <div
              key={workload.agent.id}
              className={`group ${onAssignToAgent ? 'cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors' : ''}`}
              onClick={() => onAssignToAgent?.(workload.agent.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600">
                    {workload.agent.displayName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {workload.agent.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {getLoadLabel(workload.ticketCount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {workload.slaBreachedCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                      {workload.slaBreachedCount} SLA
                    </span>
                  )}
                  {workload.urgentCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                      {workload.urgentCount} urgent
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {workload.ticketCount}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getLoadColor(workload.ticketCount)} transition-all duration-300`}
                  style={{ width: `${(workload.ticketCount / maxTickets) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}

        {/* Expand/Collapse button */}
        {workloads.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700 py-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Voir moins</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Voir {workloads.length - 3} de plus</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer - Summary */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Total: {tickets.length} tickets</span>
        <span>
          Moyenne: {workloads.length > 0
            ? Math.round(tickets.filter(t => t.assignedToId).length / workloads.length)
            : 0} / agent
        </span>
      </div>
    </div>
  );
};

export default AgentWorkloadWidget;
