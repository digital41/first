import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Date formatting
export function formatDate(date: string | Date, formatStr = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy à HH:mm', { locale: fr });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) {
    return `Aujourd'hui à ${format(d, 'HH:mm')}`;
  }

  if (isYesterday(d)) {
    return `Hier à ${format(d, 'HH:mm')}`;
  }

  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function formatMessageTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) {
    return format(d, 'HH:mm');
  }

  if (isYesterday(d)) {
    return `Hier ${format(d, 'HH:mm')}`;
  }

  return format(d, 'dd/MM HH:mm', { locale: fr });
}

// File size formatting
export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '-';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Protection contre les index hors limites
  if (i < 0 || i >= sizes.length) return '-';

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// String utilities
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Ticket number formatting - Format: SAV-XX-XXXX (année-numéro) ou SAV-XXXXX pour les anciens
export function formatTicketNumber(numberOrRef: string | number): string {
  // Si c'est déjà un ticketRef au format YY-XXXX, le préfixer avec SAV-
  if (typeof numberOrRef === 'string' && /^\d{2}-\d{4,}$/.test(numberOrRef)) {
    return `SAV-${numberOrRef}`;
  }
  // Sinon, c'est un ancien format numérique
  const num = typeof numberOrRef === 'string' ? parseInt(numberOrRef, 10) : numberOrRef;
  return `SAV-${String(num).padStart(5, '0')}`;
}

// Order number formatting
export function formatOrderNumber(number: string): string {
  return `CMD-${number}`;
}

// SLA time remaining
export function getSLATimeRemaining(deadline: string | Date): {
  hours: number;
  minutes: number;
  isOverdue: boolean;
  percentage: number;
} {
  const d = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const now = new Date();
  const diff = d.getTime() - now.getTime();

  const isOverdue = diff < 0;
  const absDiff = Math.abs(diff);

  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  // Assuming 24h SLA as baseline for percentage
  const totalSLA = 24 * 60 * 60 * 1000;
  const percentage = isOverdue ? 100 : Math.min(100, ((totalSLA - diff) / totalSLA) * 100);

  return { hours, minutes, isOverdue, percentage };
}

// Class name utility
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
}
