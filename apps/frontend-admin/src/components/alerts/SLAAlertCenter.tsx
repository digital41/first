import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle,
  X,
  Settings,
  Volume2,
  VolumeX,
  ExternalLink,
} from 'lucide-react';
import {
  SLAAlert,
  SLAAlertLevel,
  SLAConfig,
  getSLALevelColor,
} from '../../lib/slaAlertTypes';

// ============================================
// SLA ALERT CENTER COMPONENT
// ============================================
// Centre de notifications pour les alertes SLA

interface SLAAlertCenterProps {
  alerts: SLAAlert[];
  activeAlerts: SLAAlert[];
  config: SLAConfig;
  onAcknowledge: (alertId: string) => void;
  onAcknowledgeAll: () => void;
  onDismiss: (alertId: string) => void;
  onClearAll: () => void;
  onUpdateConfig: (updates: Partial<SLAConfig>) => void;
  onTicketClick?: (ticketId: string) => void;
  hasPermission: boolean;
  onRequestPermission: () => Promise<boolean>;
}

const SLAAlertCenter: React.FC<SLAAlertCenterProps> = ({
  alerts,
  activeAlerts,
  config,
  onAcknowledge,
  onAcknowledgeAll,
  onDismiss,
  onClearAll,
  onUpdateConfig,
  onTicketClick,
  hasPermission,
  onRequestPermission,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLevelIcon = (level: SLAAlertLevel) => {
    const icons: Record<SLAAlertLevel, React.ReactNode> = {
      ok: <CheckCircle className="w-4 h-4" />,
      warning: <Clock className="w-4 h-4" />,
      danger: <AlertTriangle className="w-4 h-4" />,
      breached: <AlertCircle className="w-4 h-4" />,
    };
    return icons[level];
  };

  const getLevelBgColor = (level: SLAAlertLevel) => {
    const colors: Record<SLAAlertLevel, string> = {
      ok: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-orange-500',
      breached: 'bg-red-500',
    };
    return colors[level];
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${
            activeAlerts.length > 0
              ? 'text-red-600 hover:bg-red-50'
              : 'text-slate-600 hover:bg-slate-100'
          }
        `}
      >
        <Bell className="w-5 h-5" />
        {activeAlerts.length > 0 && (
          <>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
            </span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-75" />
          </>
        )}
      </button>

      {/* Alert Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Alertes SLA</h3>
              {activeAlerts.length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {activeAlerts.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {config.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-slate-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-700">Sons</span>
                </div>
                <button
                  onClick={() =>
                    onUpdateConfig({ soundEnabled: !config.soundEnabled })
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    config.soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                      config.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">Notifications</span>
                </div>
                {hasPermission ? (
                  <button
                    onClick={() =>
                      onUpdateConfig({
                        notificationsEnabled: !config.notificationsEnabled,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors ${
                      config.notificationsEnabled
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        config.notificationsEnabled
                          ? 'translate-x-5'
                          : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    onClick={onRequestPermission}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Activer
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Seuil d'alerte (minutes avant deadline)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={Math.round(config.warningThreshold / 60)}
                    onChange={(e) =>
                      onUpdateConfig({
                        warningThreshold: parseInt(e.target.value, 10) * 60,
                      })
                    }
                    min="5"
                    max="120"
                    className="w-16 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-500">min</span>
                </div>
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">Aucune alerte</p>
                <p className="text-sm text-slate-400">
                  Tous les SLA sont dans les temps
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors ${
                      alert.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Level Indicator */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getSLALevelColor(
                          alert.level
                        )}`}
                      >
                        {getLevelIcon(alert.level)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onTicketClick?.(alert.ticketId)}
                            className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate flex items-center space-x-1"
                          >
                            <span>{alert.ticketTitle}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </button>
                          {!alert.acknowledged && (
                            <button
                              onClick={() => onAcknowledge(alert.id)}
                              className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                              title="Marquer comme lu"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${getLevelBgColor(
                              alert.level
                            )} text-white`}
                          >
                            {alert.level === 'breached'
                              ? 'Dépassé'
                              : alert.level === 'danger'
                              ? 'Critique'
                              : 'Attention'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {alert.createdAt.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {activeAlerts.length} alerte(s) active(s)
              </span>
              <div className="flex items-center space-x-2">
                {activeAlerts.length > 0 && (
                  <button
                    onClick={onAcknowledgeAll}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button
                  onClick={onClearAll}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Effacer tout
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SLAAlertCenter;
