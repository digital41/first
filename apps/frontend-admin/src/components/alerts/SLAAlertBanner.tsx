import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  X,
  ChevronRight,
} from 'lucide-react';
import { SLAAlert, SLAAlertLevel } from '../../lib/slaAlertTypes';

// ============================================
// SLA ALERT BANNER COMPONENT
// ============================================
// Bannière d'alerte affichée en haut de la page

interface SLAAlertBannerProps {
  alerts: SLAAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
  onTicketClick?: (ticketId: string) => void;
  maxVisible?: number;
}

const SLAAlertBanner: React.FC<SLAAlertBannerProps> = ({
  alerts,
  onDismiss,
  onDismissAll,
  onTicketClick,
  maxVisible = 3,
}) => {
  // Filtrer uniquement les alertes non-acquittées
  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  if (activeAlerts.length === 0) return null;

  // Trier par sévérité (breached > danger > warning)
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const severity: Record<SLAAlertLevel, number> = {
      ok: 0,
      warning: 1,
      danger: 2,
      breached: 3,
    };
    return severity[b.level] - severity[a.level];
  });

  const visibleAlerts = sortedAlerts.slice(0, maxVisible);
  const hiddenCount = sortedAlerts.length - maxVisible;

  // Déterminer la couleur de la bannière selon l'alerte la plus critique
  const mostCritical = sortedAlerts[0];
  const bannerColors: Record<SLAAlertLevel, string> = {
    ok: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-orange-50 border-orange-200',
    breached: 'bg-red-50 border-red-200',
  };

  const getLevelIcon = (level: SLAAlertLevel) => {
    switch (level) {
      case 'breached':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-600" />;
    }
  };

  const getLevelTextColor = (level: SLAAlertLevel) => {
    const colors: Record<SLAAlertLevel, string> = {
      ok: 'text-green-700',
      warning: 'text-yellow-700',
      danger: 'text-orange-700',
      breached: 'text-red-700',
    };
    return colors[level];
  };

  return (
    <div
      className={`px-4 py-3 border-b ${bannerColors[mostCritical.level]} transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Alerts */}
          <div className="flex-1 flex items-center space-x-4 overflow-x-auto">
            {visibleAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className={`flex items-center space-x-2 flex-shrink-0 ${
                  index > 0 ? 'pl-4 border-l border-current/20' : ''
                }`}
              >
                {getLevelIcon(alert.level)}
                <button
                  onClick={() => onTicketClick?.(alert.ticketId)}
                  className={`text-sm font-medium ${getLevelTextColor(
                    alert.level
                  )} hover:underline flex items-center space-x-1`}
                >
                  <span className="max-w-xs truncate">{alert.ticketTitle}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className={`text-xs ${getLevelTextColor(alert.level)} opacity-75`}>
                  {alert.message}
                </span>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="p-1 hover:bg-black/5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {hiddenCount > 0 && (
              <span className="text-sm text-slate-600 flex-shrink-0">
                +{hiddenCount} autre{hiddenCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Dismiss All */}
          <button
            onClick={onDismissAll}
            className="ml-4 px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-white/50 rounded transition-colors flex-shrink-0"
          >
            Tout fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SLAAlertBanner;
