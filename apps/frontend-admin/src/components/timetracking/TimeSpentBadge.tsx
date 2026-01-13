import React from 'react';
import { Clock, Play, Pause } from 'lucide-react';
import { formatDuration, getTimeColor } from '../../lib/timeTrackingTypes';

// ============================================
// TIME SPENT BADGE COMPONENT
// ============================================
// Badge compact affichant le temps passé sur un ticket

interface TimeSpentBadgeProps {
  totalSeconds: number;
  isRunning?: boolean;
  currentSessionSeconds?: number;
  onClick?: () => void;
  variant?: 'compact' | 'detailed' | 'inline';
  showIcon?: boolean;
}

const TimeSpentBadge: React.FC<TimeSpentBadgeProps> = ({
  totalSeconds,
  isRunning = false,
  currentSessionSeconds = 0,
  onClick,
  variant = 'compact',
  showIcon = true,
}) => {
  const displayTime = isRunning
    ? totalSeconds + currentSessionSeconds
    : totalSeconds;

  const colorClass = getTimeColor(displayTime);

  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center space-x-1 text-xs ${
          isRunning ? 'text-green-600' : 'text-slate-500'
        }`}
      >
        {showIcon && <Clock className="w-3 h-3" />}
        <span>{formatDuration(displayTime)}</span>
        {isRunning && (
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg border
          transition-all duration-200
          ${
            isRunning
              ? 'bg-green-50 border-green-200 text-green-700'
              : `${colorClass} border-current/20`
          }
          ${onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}
        `}
      >
        {showIcon && (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isRunning ? 'bg-green-100' : 'bg-current/10'
            }`}
          >
            {isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>
        )}
        <div className="text-left">
          <div className="text-xs opacity-70">
            {isRunning ? 'En cours' : 'Temps total'}
          </div>
          <div className="font-semibold text-sm tabular-nums">
            {formatDuration(displayTime)}
          </div>
        </div>
        {isRunning && (
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
        )}
      </button>
    );
  }

  // Variant: compact (default)
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        transition-all duration-200 border
        ${
          isRunning
            ? 'bg-green-100 text-green-700 border-green-200'
            : `${colorClass} border-current/20`
        }
        ${onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}
      `}
    >
      {showIcon &&
        (isRunning ? (
          <Play className="w-3 h-3 fill-current" />
        ) : (
          <Clock className="w-3 h-3" />
        ))}
      <span className="tabular-nums">{formatDuration(displayTime)}</span>
      {isRunning && (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default TimeSpentBadge;
