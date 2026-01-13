// ============================================
// SLA ALERT TYPES & HELPERS
// ============================================
// Types et utilitaires pour les alertes SLA en temps réel

import { Ticket, TicketPriority } from '../types';

// ============================================
// TYPES
// ============================================

export type SLAAlertLevel = 'ok' | 'warning' | 'danger' | 'breached';

export interface SLAAlert {
  id: string;
  ticketId: string;
  ticketTitle: string;
  level: SLAAlertLevel;
  timeRemaining: number; // en secondes, négatif si dépassé
  deadline: Date;
  priority: TicketPriority;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

export interface SLAConfig {
  warningThreshold: number; // secondes avant deadline pour warning (ex: 30 min = 1800)
  dangerThreshold: number; // secondes avant deadline pour danger (ex: 10 min = 600)
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  checkInterval: number; // ms entre chaque vérification
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  warningThreshold: 1800, // 30 minutes
  dangerThreshold: 600, // 10 minutes
  soundEnabled: true,
  notificationsEnabled: true,
  checkInterval: 30000, // 30 secondes
};

// ============================================
// STORAGE
// ============================================

const CONFIG_STORAGE_KEY = 'kly_sla_alert_config';
const ACKNOWLEDGED_STORAGE_KEY = 'kly_sla_acknowledged';

export const loadSLAConfig = (): SLAConfig => {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    return saved ? { ...DEFAULT_SLA_CONFIG, ...JSON.parse(saved) } : DEFAULT_SLA_CONFIG;
  } catch {
    return DEFAULT_SLA_CONFIG;
  }
};

export const saveSLAConfig = (config: Partial<SLAConfig>): void => {
  const current = loadSLAConfig();
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ ...current, ...config }));
};

export const getAcknowledgedAlerts = (): string[] => {
  try {
    const saved = localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const acknowledgeAlert = (alertId: string): void => {
  const acknowledged = getAcknowledgedAlerts();
  if (!acknowledged.includes(alertId)) {
    acknowledged.push(alertId);
    // Garder seulement les 100 derniers pour éviter de surcharger le storage
    const trimmed = acknowledged.slice(-100);
    localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify(trimmed));
  }
};

// ============================================
// HELPERS
// ============================================

export const calculateSLAStatus = (
  ticket: Ticket,
  config: SLAConfig = DEFAULT_SLA_CONFIG
): { level: SLAAlertLevel; timeRemaining: number } => {
  if (!ticket.slaDeadline) {
    return { level: 'ok', timeRemaining: Infinity };
  }

  // Si déjà breached selon le backend
  if (ticket.slaBreached) {
    const deadline = new Date(ticket.slaDeadline);
    const timeRemaining = Math.floor((deadline.getTime() - Date.now()) / 1000);
    return { level: 'breached', timeRemaining };
  }

  const deadline = new Date(ticket.slaDeadline);
  const now = new Date();
  const timeRemaining = Math.floor((deadline.getTime() - now.getTime()) / 1000);

  if (timeRemaining <= 0) {
    return { level: 'breached', timeRemaining };
  }

  if (timeRemaining <= config.dangerThreshold) {
    return { level: 'danger', timeRemaining };
  }

  if (timeRemaining <= config.warningThreshold) {
    return { level: 'warning', timeRemaining };
  }

  return { level: 'ok', timeRemaining };
};

export const generateAlert = (
  ticket: Ticket,
  level: SLAAlertLevel,
  timeRemaining: number
): SLAAlert => {
  const messages: Record<SLAAlertLevel, string> = {
    ok: 'SLA dans les temps',
    warning: `SLA bientôt expiré - ${formatTimeRemaining(timeRemaining)} restant`,
    danger: `SLA critique - ${formatTimeRemaining(timeRemaining)} restant`,
    breached: `SLA dépassé de ${formatTimeRemaining(Math.abs(timeRemaining))}`,
  };

  return {
    id: `alert-${ticket.id}-${Date.now()}`,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    level,
    timeRemaining,
    deadline: new Date(ticket.slaDeadline!),
    priority: ticket.priority,
    message: messages[level],
    createdAt: new Date(),
    acknowledged: false,
  };
};

export const formatTimeRemaining = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);

  if (absSeconds < 60) {
    return `${absSeconds}s`;
  }

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }

  return `${minutes}min`;
};

export const getSLALevelColor = (level: SLAAlertLevel): string => {
  const colors: Record<SLAAlertLevel, string> = {
    ok: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    danger: 'text-orange-600 bg-orange-50 border-orange-200',
    breached: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[level];
};

export const getSLALevelIcon = (level: SLAAlertLevel): string => {
  const icons: Record<SLAAlertLevel, string> = {
    ok: 'check-circle',
    warning: 'clock',
    danger: 'alert-triangle',
    breached: 'alert-circle',
  };
  return icons[level];
};

// ============================================
// SOUND ALERT
// ============================================

let audioContext: AudioContext | null = null;

export const playAlertSound = (level: SLAAlertLevel): void => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Fréquences différentes selon le niveau
    const frequencies: Record<SLAAlertLevel, number> = {
      ok: 0,
      warning: 440, // A4
      danger: 523, // C5
      breached: 659, // E5
    };

    if (frequencies[level] === 0) return;

    oscillator.frequency.value = frequencies[level];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Could not play alert sound:', error);
  }
};

// ============================================
// BROWSER NOTIFICATION
// ============================================

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showBrowserNotification = (alert: SLAAlert): void => {
  if (Notification.permission !== 'granted') return;

  const icons: Record<SLAAlertLevel, string> = {
    ok: '✅',
    warning: '⚠️',
    danger: '🔶',
    breached: '🔴',
  };

  new Notification(`${icons[alert.level]} SLA Alert`, {
    body: `${alert.ticketTitle}\n${alert.message}`,
    tag: alert.id,
    requireInteraction: alert.level === 'breached' || alert.level === 'danger',
  });
};
