import { useState, useEffect, useCallback } from 'react';
import {
  Macro,
  MacroAction,
  MacroContext,
  MacroExecutionResult,
  MACRO_TEMPLATES,
} from '../lib/macroTypes';
import { AdminApi } from '../services/api';

// ============================================
// USE MACROS HOOK
// ============================================
// Manages macro CRUD and execution

const STORAGE_KEY = 'kly_admin_macros';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load macros from localStorage
 */
function loadMacros(): Macro[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading macros:', e);
  }
  return [];
}

/**
 * Save macros to localStorage
 */
function saveMacros(macros: Macro[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(macros));
  } catch (e) {
    console.error('Error saving macros:', e);
  }
}

interface UseMacrosReturn {
  // Data
  macros: Macro[];
  activeMacros: Macro[];

  // State
  isLoading: boolean;
  isExecuting: boolean;
  error: Error | null;

  // CRUD
  createMacro: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => Macro;
  updateMacro: (id: string, updates: Partial<Macro>) => void;
  deleteMacro: (id: string) => void;
  duplicateMacro: (id: string) => Macro | null;
  toggleMacroActive: (id: string) => void;

  // Execution
  executeMacro: (macroId: string, context: MacroContext) => Promise<MacroExecutionResult>;

  // Templates
  createFromTemplate: (templateIndex: number) => Macro;
}

export function useMacros(): UseMacrosReturn {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load macros on mount
  useEffect(() => {
    const loaded = loadMacros();
    setMacros(loaded);
    setIsLoading(false);
  }, []);

  // Save macros when they change
  useEffect(() => {
    if (!isLoading) {
      saveMacros(macros);
    }
  }, [macros, isLoading]);

  // Active macros only
  const activeMacros = macros.filter((m) => m.isActive);

  // Create macro
  const createMacro = useCallback(
    (macroData: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>): Macro => {
      const now = new Date().toISOString();
      const newMacro: Macro = {
        ...macroData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };

      setMacros((prev) => [...prev, newMacro]);
      return newMacro;
    },
    []
  );

  // Update macro
  const updateMacro = useCallback((id: string, updates: Partial<Macro>): void => {
    setMacros((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, ...updates, updatedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  // Delete macro
  const deleteMacro = useCallback((id: string): void => {
    setMacros((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Duplicate macro
  const duplicateMacro = useCallback(
    (id: string): Macro | null => {
      const original = macros.find((m) => m.id === id);
      if (!original) return null;

      return createMacro({
        ...original,
        name: `${original.name} (copie)`,
        isActive: false,
      });
    },
    [macros, createMacro]
  );

  // Toggle active state
  const toggleMacroActive = useCallback((id: string): void => {
    setMacros((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, isActive: !m.isActive, updatedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  // Execute a single action
  const executeAction = async (
    action: MacroAction,
    context: MacroContext
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      switch (action.type) {
        case 'sendMessage':
          if (typeof action.value === 'string' && action.value.trim()) {
            await AdminApi.sendMessage(context.ticketId, action.value, false);
          }
          break;

        case 'addInternalNote':
          if (typeof action.value === 'string' && action.value.trim()) {
            await AdminApi.sendMessage(context.ticketId, action.value, true);
          }
          break;

        case 'changeStatus':
          if (typeof action.value === 'string') {
            await AdminApi.updateTicket(context.ticketId, {
              status: action.value as any,
            });
          }
          break;

        case 'changePriority':
          if (typeof action.value === 'string') {
            await AdminApi.updateTicket(context.ticketId, {
              priority: action.value as any,
            });
          }
          break;

        case 'assignTo':
          await AdminApi.updateTicket(context.ticketId, {
            assignedToId: action.value as string | null,
          });
          break;

        case 'addTags':
          if (Array.isArray(action.value)) {
            const newTags = [...new Set([...context.currentTags, ...action.value])];
            await AdminApi.updateTicket(context.ticketId, { tags: newTags });
          }
          break;

        case 'removeTags':
          if (Array.isArray(action.value)) {
            const newTags = context.currentTags.filter(
              (t) => !action.value?.includes(t)
            );
            await AdminApi.updateTicket(context.ticketId, { tags: newTags });
          }
          break;

        default:
          return { success: false, error: `Action inconnue: ${action.type}` };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      };
    }
  };

  // Execute macro
  const executeMacro = useCallback(
    async (macroId: string, context: MacroContext): Promise<MacroExecutionResult> => {
      const macro = macros.find((m) => m.id === macroId);
      if (!macro) {
        return { success: false, actionsExecuted: 0, errors: ['Macro non trouvée'] };
      }

      setIsExecuting(true);
      setError(null);

      const result: MacroExecutionResult = {
        success: true,
        actionsExecuted: 0,
        errors: [],
      };

      try {
        for (const action of macro.actions) {
          const actionResult = await executeAction(action, context);

          if (actionResult.success) {
            result.actionsExecuted++;
          } else {
            result.errors.push(actionResult.error || 'Erreur action');
            result.success = false;
          }
        }
      } catch (err) {
        result.success = false;
        result.errors.push(err instanceof Error ? err.message : 'Erreur execution');
        setError(err instanceof Error ? err : new Error('Erreur execution'));
      } finally {
        setIsExecuting(false);
      }

      return result;
    },
    [macros]
  );

  // Create from template
  const createFromTemplate = useCallback(
    (templateIndex: number): Macro => {
      const template = MACRO_TEMPLATES[templateIndex];
      if (!template) {
        throw new Error('Template non trouvé');
      }

      return createMacro({
        name: template.name || 'Nouvelle macro',
        description: template.description,
        icon: template.icon || 'zap',
        color: template.color || 'blue',
        actions: template.actions || [],
        isActive: true,
      });
    },
    [createMacro]
  );

  return {
    macros,
    activeMacros,
    isLoading,
    isExecuting,
    error,
    createMacro,
    updateMacro,
    deleteMacro,
    duplicateMacro,
    toggleMacroActive,
    executeMacro,
    createFromTemplate,
  };
}

export default useMacros;
