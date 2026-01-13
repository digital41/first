import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TimeEntry,
  TicketTimeStats,
  loadTimeEntries,
  saveTimeEntries,
  calculateTicketTimeStats,
  generateEntryId,
} from '../lib/timeTrackingTypes';

// ============================================
// USE TICKET TIMER HOOK
// ============================================
// Hook pour gérer le chronomètre de temps passé sur un ticket

interface UseTicketTimerOptions {
  ticketId: string;
  agentId: string;
  agentName?: string;
  autoStart?: boolean;
}

interface UseTicketTimerReturn {
  // État
  isRunning: boolean;
  currentTime: number; // Temps écoulé en secondes pour la session active
  stats: TicketTimeStats;

  // Actions
  start: (description?: string) => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
  addManualEntry: (duration: number, description?: string) => void;
  deleteEntry: (entryId: string) => void;

  // Données
  entries: TimeEntry[];
  activeEntry: TimeEntry | undefined;
}

const useTicketTimer = ({
  ticketId,
  agentId,
  agentName,
  autoStart = false,
}: UseTicketTimerOptions): UseTicketTimerReturn => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Charger les entrées au montage
  useEffect(() => {
    const allEntries = loadTimeEntries();
    setEntries(allEntries);

    // Vérifier s'il y a une session active pour ce ticket
    const activeEntry = allEntries.find(
      (e) => e.ticketId === ticketId && e.isActive && e.agentId === agentId
    );

    if (activeEntry) {
      // Reprendre la session active
      const startTime = new Date(activeEntry.startTime);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setCurrentTime(elapsed);
      setIsRunning(true);
      startTimeRef.current = startTime;
    } else if (autoStart) {
      // Démarrer automatiquement si demandé
      startTimer();
    }
  }, [ticketId, agentId]);

  // Gérer l'intervalle du timer
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current.getTime()) / 1000
          );
          setCurrentTime(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Sauvegarder automatiquement avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning && startTimeRef.current) {
        // Mettre à jour l'entrée active avec le temps actuel
        const allEntries = loadTimeEntries();
        const updated = allEntries.map((e) => {
          if (e.ticketId === ticketId && e.isActive && e.agentId === agentId) {
            return {
              ...e,
              duration: Math.floor(
                (Date.now() - new Date(e.startTime).getTime()) / 1000
              ),
            };
          }
          return e;
        });
        saveTimeEntries(updated);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, ticketId, agentId]);

  const startTimer = useCallback(
    (description?: string) => {
      if (isRunning) return;

      const now = new Date();
      startTimeRef.current = now;

      const newEntry: TimeEntry = {
        id: generateEntryId(),
        ticketId,
        agentId,
        agentName,
        startTime: now.toISOString(),
        duration: 0,
        description,
        isActive: true,
        createdAt: now.toISOString(),
      };

      const allEntries = loadTimeEntries();
      const updated = [...allEntries, newEntry];
      saveTimeEntries(updated);
      setEntries(updated);
      setCurrentTime(0);
      setIsRunning(true);
    },
    [isRunning, ticketId, agentId, agentName]
  );

  const stopTimer = useCallback(() => {
    if (!isRunning || !startTimeRef.current) return;

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTimeRef.current.getTime()) / 1000
    );

    const allEntries = loadTimeEntries();
    const updated = allEntries.map((e) => {
      if (e.ticketId === ticketId && e.isActive && e.agentId === agentId) {
        return {
          ...e,
          endTime: endTime.toISOString(),
          duration,
          isActive: false,
        };
      }
      return e;
    });

    saveTimeEntries(updated);
    setEntries(updated);
    setIsRunning(false);
    setCurrentTime(0);
    startTimeRef.current = null;
  }, [isRunning, ticketId, agentId]);

  const toggle = useCallback(() => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  }, [isRunning, startTimer, stopTimer]);

  const reset = useCallback(() => {
    // Arrêter le timer si actif
    if (isRunning) {
      stopTimer();
    }

    // Supprimer toutes les entrées pour ce ticket
    const allEntries = loadTimeEntries();
    const filtered = allEntries.filter((e) => e.ticketId !== ticketId);
    saveTimeEntries(filtered);
    setEntries(filtered);
    setCurrentTime(0);
  }, [isRunning, ticketId, stopTimer]);

  const addManualEntry = useCallback(
    (duration: number, description?: string) => {
      const now = new Date();
      const startTime = new Date(now.getTime() - duration * 1000);

      const newEntry: TimeEntry = {
        id: generateEntryId(),
        ticketId,
        agentId,
        agentName,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        duration,
        description: description || 'Entrée manuelle',
        isActive: false,
        createdAt: now.toISOString(),
      };

      const allEntries = loadTimeEntries();
      const updated = [...allEntries, newEntry];
      saveTimeEntries(updated);
      setEntries(updated);
    },
    [ticketId, agentId, agentName]
  );

  const deleteEntry = useCallback((entryId: string) => {
    const allEntries = loadTimeEntries();
    const entryToDelete = allEntries.find((e) => e.id === entryId);

    // Si c'est l'entrée active, arrêter le timer
    if (entryToDelete?.isActive) {
      setIsRunning(false);
      setCurrentTime(0);
      startTimeRef.current = null;
    }

    const filtered = allEntries.filter((e) => e.id !== entryId);
    saveTimeEntries(filtered);
    setEntries(filtered);
  }, []);

  // Calculer les stats
  const stats = calculateTicketTimeStats(entries, ticketId);
  const activeEntry = entries.find(
    (e) => e.ticketId === ticketId && e.isActive && e.agentId === agentId
  );

  return {
    isRunning,
    currentTime,
    stats,
    start: startTimer,
    stop: stopTimer,
    toggle,
    reset,
    addManualEntry,
    deleteEntry,
    entries: entries.filter((e) => e.ticketId === ticketId),
    activeEntry,
  };
};

export default useTicketTimer;
