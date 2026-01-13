import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

// ============================================
// SLA COUNTDOWN COMPONENT
// ============================================
// Affiche le temps restant avant breach SLA
// S'intègre dans la liste des tickets

interface SLACountdownProps {
  deadline: Date | string | null;
  breached?: boolean;
}

type Urgency = 'safe' | 'warning' | 'critical' | 'breached';

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const SLACountdown: React.FC<SLACountdownProps> = ({ deadline, breached = false }) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [urgency, setUrgency] = useState<Urgency>('safe');

  useEffect(() => {
    if (!deadline || breached) {
      setUrgency(breached ? 'breached' : 'safe');
      return;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setUrgency('breached');
        setTimeRemaining(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds, total: diff });

      // Determine urgency level
      const hoursRemaining = diff / (1000 * 60 * 60);
      if (hoursRemaining <= 1) {
        setUrgency('critical');
      } else if (hoursRemaining <= 4) {
        setUrgency('warning');
      } else {
        setUrgency('safe');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [deadline, breached]);

  // Styles par niveau d'urgence
  const urgencyStyles: Record<Urgency, string> = {
    safe: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    critical: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
    breached: 'bg-red-100 text-red-800 border-red-300',
  };

  const IconComponent = urgency === 'breached' || urgency === 'critical'
    ? AlertTriangle
    : urgency === 'warning'
      ? AlertCircle
      : Clock;

  if (!deadline) {
    return (
      <span className="text-xs text-slate-400 italic">
        Pas de SLA
      </span>
    );
  }

  if (urgency === 'breached') {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${urgencyStyles.breached}`}>
        <AlertTriangle className="w-3 h-3" />
        <span>SLA Dépassé</span>
      </div>
    );
  }

  if (!timeRemaining) return null;

  const formatTime = () => {
    const { hours, minutes } = timeRemaining;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${timeRemaining.seconds}s`;
  };

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${urgencyStyles[urgency]}`}>
      <IconComponent className="w-3 h-3" />
      <span>{formatTime()}</span>
    </div>
  );
};

export default SLACountdown;
