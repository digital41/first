// ============================================
// TIME TRACKING TYPES & HELPERS
// ============================================
// Types et utilitaires pour le suivi du temps passé sur les tickets

export interface TimeEntry {
  id: string;
  ticketId: string;
  agentId: string;
  agentName?: string;
  startTime: string;
  endTime?: string;
  duration: number; // en secondes
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TicketTimeStats {
  totalTime: number; // en secondes
  entries: TimeEntry[];
  activeEntry?: TimeEntry;
  averageSessionTime: number;
  longestSession: number;
  sessionCount: number;
}

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'kly_time_entries';

export const loadTimeEntries = (): TimeEntry[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveTimeEntries = (entries: TimeEntry[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

// ============================================
// HELPERS
// ============================================

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
};

export const formatDurationLong = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} heure${hours > 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'Moins d\'une minute';
  }

  return parts.join(' et ');
};

export const getTimeEntriesForTicket = (
  entries: TimeEntry[],
  ticketId: string
): TimeEntry[] => {
  return entries.filter((e) => e.ticketId === ticketId);
};

export const calculateTicketTimeStats = (
  entries: TimeEntry[],
  ticketId: string
): TicketTimeStats => {
  const ticketEntries = getTimeEntriesForTicket(entries, ticketId);
  const activeEntry = ticketEntries.find((e) => e.isActive);

  const completedEntries = ticketEntries.filter((e) => !e.isActive && e.duration > 0);
  const totalTime = completedEntries.reduce((sum, e) => sum + e.duration, 0);

  const averageSessionTime =
    completedEntries.length > 0 ? totalTime / completedEntries.length : 0;

  const longestSession =
    completedEntries.length > 0
      ? Math.max(...completedEntries.map((e) => e.duration))
      : 0;

  return {
    totalTime,
    entries: ticketEntries,
    activeEntry,
    averageSessionTime: Math.round(averageSessionTime),
    longestSession,
    sessionCount: completedEntries.length,
  };
};

export const generateEntryId = (): string => {
  return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================
// TIME DISPLAY HELPERS
// ============================================

export const getTimeColor = (totalSeconds: number): string => {
  // Codes couleur selon le temps passé
  if (totalSeconds < 300) {
    // < 5 min
    return 'text-green-600 bg-green-50';
  } else if (totalSeconds < 900) {
    // < 15 min
    return 'text-blue-600 bg-blue-50';
  } else if (totalSeconds < 1800) {
    // < 30 min
    return 'text-yellow-600 bg-yellow-50';
  } else if (totalSeconds < 3600) {
    // < 1h
    return 'text-orange-600 bg-orange-50';
  } else {
    // >= 1h
    return 'text-red-600 bg-red-50';
  }
};

export const getTimeSeverity = (
  totalSeconds: number
): 'low' | 'normal' | 'medium' | 'high' | 'critical' => {
  if (totalSeconds < 300) return 'low';
  if (totalSeconds < 900) return 'normal';
  if (totalSeconds < 1800) return 'medium';
  if (totalSeconds < 3600) return 'high';
  return 'critical';
};
