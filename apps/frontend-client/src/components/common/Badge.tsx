import React from 'react';
import {
  TicketStatus,
  TicketPriority,
  IssueType,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS
} from '@/types';
import { cn } from '@/utils/helpers';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        STATUS_COLORS[status],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: TicketPriority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        PRIORITY_COLORS[priority],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

interface IssueTypeBadgeProps {
  issueType: IssueType;
  size?: 'sm' | 'md';
}

const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  [IssueType.TECHNICAL]: 'bg-purple-100 text-purple-800',
  [IssueType.DELIVERY]: 'bg-cyan-100 text-cyan-800',
  [IssueType.BILLING]: 'bg-amber-100 text-amber-800',
  [IssueType.OTHER]: 'bg-gray-100 text-gray-800',
};

export function IssueTypeBadge({ issueType, size = 'md' }: IssueTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        ISSUE_TYPE_COLORS[issueType],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {ISSUE_TYPE_LABELS[issueType]}
    </span>
  );
}

interface SLABadgeProps {
  deadline: string;
  isBreached: boolean;
}

export function SLABadge({ deadline, isBreached }: SLABadgeProps) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));

  if (isBreached) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        SLA dépassé
      </span>
    );
  }

  if (hoursLeft < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        En retard
      </span>
    );
  }

  if (hoursLeft < 4) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
        {hoursLeft}h restantes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
      {hoursLeft}h restantes
    </span>
  );
}

export default StatusBadge;
