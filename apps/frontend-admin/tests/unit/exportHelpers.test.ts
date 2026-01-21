import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatStatus,
  formatPriority,
  DEFAULT_EXPORT_COLUMNS,
} from '@/lib/exportHelpers';

describe('Export Helpers', () => {
  describe('formatStatus', () => {
    it('should format OPEN status', () => {
      expect(formatStatus('OPEN')).toBe('Ouvert');
    });

    it('should format IN_PROGRESS status', () => {
      expect(formatStatus('IN_PROGRESS')).toBe('En cours');
    });

    it('should format WAITING_CUSTOMER status', () => {
      expect(formatStatus('WAITING_CUSTOMER')).toBe('Attente client');
    });

    it('should format RESOLVED status', () => {
      expect(formatStatus('RESOLVED')).toBe('Résolu');
    });

    it('should format CLOSED status', () => {
      expect(formatStatus('CLOSED')).toBe('Fermé');
    });

    it('should format ESCALATED status', () => {
      expect(formatStatus('ESCALATED')).toBe('Escaladé');
    });

    it('should format REOPENED status', () => {
      expect(formatStatus('REOPENED')).toBe('Réouvert');
    });

    it('should return original value for unknown status', () => {
      expect(formatStatus('UNKNOWN' as any)).toBe('UNKNOWN');
    });
  });

  describe('formatPriority', () => {
    it('should format LOW priority', () => {
      expect(formatPriority('LOW')).toBe('Basse');
    });

    it('should format MEDIUM priority', () => {
      expect(formatPriority('MEDIUM')).toBe('Moyenne');
    });

    it('should format HIGH priority', () => {
      expect(formatPriority('HIGH')).toBe('Haute');
    });

    it('should format URGENT priority', () => {
      expect(formatPriority('URGENT')).toBe('Urgente');
    });

    it('should return original value for unknown priority', () => {
      expect(formatPriority('UNKNOWN' as any)).toBe('UNKNOWN');
    });
  });

  describe('DEFAULT_EXPORT_COLUMNS', () => {
    it('should have required columns', () => {
      const columnKeys = DEFAULT_EXPORT_COLUMNS.map((col) => col.key);

      expect(columnKeys).toContain('id');
      expect(columnKeys).toContain('title');
      expect(columnKeys).toContain('status');
      expect(columnKeys).toContain('priority');
      expect(columnKeys).toContain('createdAt');
    });

    it('should have labels for all columns', () => {
      DEFAULT_EXPORT_COLUMNS.forEach((col) => {
        expect(col.label).toBeDefined();
        expect(col.label.length).toBeGreaterThan(0);
      });
    });

    it('should have ID column formatter that truncates', () => {
      const idColumn = DEFAULT_EXPORT_COLUMNS.find((col) => col.key === 'id');
      expect(idColumn).toBeDefined();

      if (idColumn?.formatter) {
        const formatted = idColumn.formatter(
          '12345678901234567890',
          {} as any
        );
        expect(formatted).toBe('12345678');
      }
    });

    it('should have status column formatter', () => {
      const statusColumn = DEFAULT_EXPORT_COLUMNS.find(
        (col) => col.key === 'status'
      );
      expect(statusColumn).toBeDefined();

      if (statusColumn?.formatter) {
        const formatted = statusColumn.formatter('OPEN', {} as any);
        expect(formatted).toBe('Ouvert');
      }
    });

    it('should have priority column formatter', () => {
      const priorityColumn = DEFAULT_EXPORT_COLUMNS.find(
        (col) => col.key === 'priority'
      );
      expect(priorityColumn).toBeDefined();

      if (priorityColumn?.formatter) {
        const formatted = priorityColumn.formatter('HIGH', {} as any);
        expect(formatted).toBe('Haute');
      }
    });

    it('should have SLA column formatter', () => {
      const slaColumn = DEFAULT_EXPORT_COLUMNS.find(
        (col) => col.key === 'slaBreached'
      );
      expect(slaColumn).toBeDefined();

      if (slaColumn?.formatter) {
        expect(slaColumn.formatter(true, {} as any)).toBe('Dépassé');
        expect(slaColumn.formatter(false, {} as any)).toBe('OK');
      }
    });

    it('should have date column formatters', () => {
      const createdAtColumn = DEFAULT_EXPORT_COLUMNS.find(
        (col) => col.key === 'createdAt'
      );
      expect(createdAtColumn).toBeDefined();

      if (createdAtColumn?.formatter) {
        const formatted = createdAtColumn.formatter(
          '2024-01-15T10:00:00.000Z',
          {} as any
        );
        expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      }
    });

    it('should have assignedTo formatter with fallback', () => {
      const assignedColumn = DEFAULT_EXPORT_COLUMNS.find(
        (col) => col.key === 'assignedTo'
      );
      expect(assignedColumn).toBeDefined();

      if (assignedColumn?.formatter) {
        // With assignedTo
        const withAssigned = assignedColumn.formatter(null, {
          assignedTo: { displayName: 'John' },
        } as any);
        expect(withAssigned).toBe('John');

        // Without assignedTo
        const withoutAssigned = assignedColumn.formatter(null, {
          assignedTo: null,
        } as any);
        expect(withoutAssigned).toBe('Non assigné');
      }
    });
  });
});
