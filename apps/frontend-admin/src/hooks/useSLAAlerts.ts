import { useState, useEffect, useCallback, useRef } from 'react';
import { Ticket } from '../types';
import {
  SLAAlert,
  SLAAlertLevel,
  SLAConfig,
  loadSLAConfig,
  saveSLAConfig,
  calculateSLAStatus,
  generateAlert,
  getAcknowledgedAlerts,
  acknowledgeAlert as acknowledgeAlertStorage,
  playAlertSound,
  showBrowserNotification,
  requestNotificationPermission,
} from '../lib/slaAlertTypes';

// ============================================
// USE SLA ALERTS HOOK
// ============================================
// Hook pour gérer les alertes SLA en temps réel

interface UseSLAAlertsOptions {
  tickets: Ticket[];
  enabled?: boolean;
  onAlertTriggered?: (alert: SLAAlert) => void;
}

interface UseSLAAlertsReturn {
  // Alertes
  alerts: SLAAlert[];
  activeAlerts: SLAAlert[];
  acknowledgedCount: number;

  // Actions
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAll: () => void;
  dismissAlert: (alertId: string) => void;
  clearAll: () => void;

  // Configuration
  config: SLAConfig;
  updateConfig: (updates: Partial<SLAConfig>) => void;

  // État
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const useSLAAlerts = ({
  tickets,
  enabled = true,
  onAlertTriggered,
}: UseSLAAlertsOptions): UseSLAAlertsReturn => {
  const [alerts, setAlerts] = useState<SLAAlert[]>([]);
  const [config, setConfig] = useState<SLAConfig>(loadSLAConfig);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [hasPermission, setHasPermission] = useState(false);

  const lastAlertLevels = useRef<Map<string, SLAAlertLevel>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vérifier la permission de notification au montage
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Fonction de vérification des SLA
  const checkSLAs = useCallback(() => {
    if (!isEnabled || tickets.length === 0) return;

    const acknowledgedIds = getAcknowledgedAlerts();
    const newAlerts: SLAAlert[] = [];

    tickets.forEach((ticket) => {
      if (!ticket.slaDeadline) return;

      // Ignorer les tickets fermés/résolus
      if (['CLOSED', 'RESOLVED'].includes(ticket.status)) return;

      const { level, timeRemaining } = calculateSLAStatus(ticket, config);

      // Ne pas créer d'alerte pour les tickets OK
      if (level === 'ok') {
        lastAlertLevels.current.delete(ticket.id);
        return;
      }

      const previousLevel = lastAlertLevels.current.get(ticket.id);

      // Créer une alerte si:
      // 1. C'est une nouvelle alerte (pas de niveau précédent)
      // 2. Le niveau a empiré
      const shouldAlert =
        !previousLevel ||
        getLevelSeverity(level) > getLevelSeverity(previousLevel);

      if (shouldAlert) {
        const alert = generateAlert(ticket, level, timeRemaining);

        // Vérifier si déjà acknowledged
        const baseAlertId = `alert-${ticket.id}`;
        const isAcknowledged = acknowledgedIds.some((id) =>
          id.startsWith(baseAlertId)
        );

        if (!isAcknowledged) {
          alert.acknowledged = false;
          newAlerts.push(alert);

          // Jouer le son si activé
          if (config.soundEnabled) {
            playAlertSound(level);
          }

          // Notification navigateur si activée
          if (config.notificationsEnabled && hasPermission) {
            showBrowserNotification(alert);
          }

          // Callback
          onAlertTriggered?.(alert);
        }
      }

      lastAlertLevels.current.set(ticket.id, level);
    });

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...prev, ...newAlerts]);
    }
  }, [tickets, config, isEnabled, hasPermission, onAlertTriggered]);

  // Démarrer l'intervalle de vérification
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Vérification initiale
    checkSLAs();

    // Intervalle de vérification
    intervalRef.current = setInterval(checkSLAs, config.checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, config.checkInterval, checkSLAs]);

  // Actions
  const acknowledgeAlert = useCallback((alertId: string) => {
    acknowledgeAlertStorage(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const acknowledgeAll = useCallback(() => {
    alerts.forEach((alert) => {
      if (!alert.acknowledged) {
        acknowledgeAlertStorage(alert.id);
      }
    });
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  }, [alerts]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
    lastAlertLevels.current.clear();
  }, []);

  const updateConfig = useCallback((updates: Partial<SLAConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      saveSLAConfig(newConfig);
      return newConfig;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  // Computed
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedCount = alerts.filter((a) => a.acknowledged).length;

  return {
    alerts,
    activeAlerts,
    acknowledgedCount,
    acknowledgeAlert,
    acknowledgeAll,
    dismissAlert,
    clearAll,
    config,
    updateConfig,
    isEnabled,
    setEnabled: setIsEnabled,
    hasPermission,
    requestPermission,
  };
};

// Helper pour comparer la sévérité des niveaux
const getLevelSeverity = (level: SLAAlertLevel): number => {
  const severities: Record<SLAAlertLevel, number> = {
    ok: 0,
    warning: 1,
    danger: 2,
    breached: 3,
  };
  return severities[level];
};

export default useSLAAlerts;
