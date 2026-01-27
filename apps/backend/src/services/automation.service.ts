import { prisma } from '../config/database.js';
import type { AutomationTrigger, Prisma, Ticket, TicketPriority, TicketStatus, IssueType } from '@prisma/client';
import { notifyTicketAssigned, notifyStatusChange, notifySlaWarning } from './notification.service.js';

// ============================================
// TYPES
// ============================================

interface AutomationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: string | number | boolean | string[];
}

interface AutomationAction {
  type: string;
  params?: Record<string, unknown>;
}

// ============================================
// SERVICE: AUTOMATION RULES CRUD
// ============================================

export const AutomationService = {
  /**
   * Get all automation rules
   */
  async getRules(includeInactive = false) {
    const where: Prisma.AutomationRuleWhereInput = includeInactive ? {} : { isActive: true };

    return prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        _count: {
          select: { executions: true },
        },
      },
    });
  },

  /**
   * Get a single rule by ID
   */
  async getRuleById(id: string) {
    return prisma.automationRule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
        executions: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
    });
  },

  /**
   * Create a new automation rule
   */
  async createRule(data: {
    name: string;
    description?: string;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    isActive?: boolean;
    priority?: number;
    createdById?: string;
  }) {
    return prisma.automationRule.create({
      data: {
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        conditions: data.conditions as Prisma.InputJsonValue,
        actions: data.actions as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  },

  /**
   * Update an automation rule
   */
  async updateRule(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      trigger: AutomationTrigger;
      conditions: AutomationCondition[];
      actions: AutomationAction[];
      isActive: boolean;
      priority: number;
    }>
  ) {
    const updateData: Prisma.AutomationRuleUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.trigger !== undefined) updateData.trigger = data.trigger;
    if (data.conditions !== undefined) updateData.conditions = data.conditions as Prisma.InputJsonValue;
    if (data.actions !== undefined) updateData.actions = data.actions as Prisma.InputJsonValue;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.priority !== undefined) updateData.priority = data.priority;

    return prisma.automationRule.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  },

  /**
   * Delete an automation rule
   */
  async deleteRule(id: string) {
    return prisma.automationRule.delete({
      where: { id },
    });
  },

  /**
   * Toggle rule active status
   */
  async toggleRule(id: string) {
    const rule = await prisma.automationRule.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!rule) return null;

    return prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    });
  },

  /**
   * Get automation statistics
   */
  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [
      totalRules,
      activeRules,
      todayExecutions,
      weekExecutions,
      executionsByAction,
    ] = await Promise.all([
      prisma.automationRule.count(),
      prisma.automationRule.count({ where: { isActive: true } }),
      prisma.automationExecution.count({
        where: { executedAt: { gte: startOfToday } },
      }),
      prisma.automationExecution.count({
        where: { executedAt: { gte: startOfWeek } },
      }),
      prisma.automationExecution.groupBy({
        by: ['ruleId'],
        where: { executedAt: { gte: startOfToday } },
        _count: true,
      }),
    ]);

    // Get rules with their actions to count by action type
    const rulesWithExecutions = await prisma.automationRule.findMany({
      where: {
        id: { in: executionsByAction.map(e => e.ruleId) },
      },
      select: { id: true, actions: true },
    });

    let autoAssignCount = 0;
    let notificationCount = 0;

    for (const rule of rulesWithExecutions) {
      const actions = rule.actions as AutomationAction[];
      const execCount = executionsByAction.find(e => e.ruleId === rule.id)?._count || 0;

      for (const action of actions) {
        if (action.type.startsWith('assign')) {
          autoAssignCount += execCount;
        }
        if (action.type.startsWith('notify') || action.type.startsWith('email') || action.type.startsWith('sms')) {
          notificationCount += execCount;
        }
      }
    }

    return {
      totalRules,
      activeRules,
      todayExecutions,
      weekExecutions,
      autoAssignCount,
      notificationCount,
    };
  },

  /**
   * Get execution history
   */
  async getExecutionHistory(options: {
    ruleId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { ruleId, limit = 50, offset = 0 } = options;

    const where: Prisma.AutomationExecutionWhereInput = ruleId ? { ruleId } : {};

    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          rule: {
            select: { id: true, name: true, trigger: true },
          },
        },
      }),
      prisma.automationExecution.count({ where }),
    ]);

    return { executions, total };
  },
};

// ============================================
// SERVICE: AUTOMATION EXECUTION ENGINE
// ============================================

export const AutomationEngine = {
  /**
   * Process rules for a given trigger and ticket
   */
  async processRules(trigger: AutomationTrigger, ticket: Ticket) {
    try {
      // Get all active rules for this trigger
      const rules = await prisma.automationRule.findMany({
        where: {
          trigger,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });

      console.log(`[Automation] Processing ${rules.length} rules for trigger ${trigger} on ticket #${ticket.ticketNumber}`);

      for (const rule of rules) {
        try {
          const conditions = rule.conditions as AutomationCondition[];
          const actions = rule.actions as AutomationAction[];

          // Check if all conditions are met
          const conditionsMet = await this.evaluateConditions(conditions, ticket);

          if (conditionsMet) {
            console.log(`[Automation] Rule "${rule.name}" matched, executing actions...`);

            // Execute all actions
            for (const action of actions) {
              await this.executeAction(action, ticket);
            }

            // Log successful execution
            await prisma.automationExecution.create({
              data: {
                ruleId: rule.id,
                ticketId: ticket.id,
                success: true,
                details: { trigger, conditionsChecked: conditions.length, actionsExecuted: actions.length },
              },
            });
          }
        } catch (error) {
          console.error(`[Automation] Error executing rule "${rule.name}":`, error);

          // Log failed execution
          await prisma.automationExecution.create({
            data: {
              ruleId: rule.id,
              ticketId: ticket.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
    } catch (error) {
      console.error('[Automation] Error processing rules:', error);
    }
  },

  /**
   * Evaluate conditions against a ticket
   */
  async evaluateConditions(conditions: AutomationCondition[], ticket: Ticket): Promise<boolean> {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const value = this.getTicketFieldValue(condition.field, ticket);
      const targetValue = condition.value;

      let conditionMet = false;

      switch (condition.operator) {
        case 'eq':
          conditionMet = value === targetValue;
          break;
        case 'neq':
          conditionMet = value !== targetValue;
          break;
        case 'gt':
          conditionMet = typeof value === 'number' && value > (targetValue as number);
          break;
        case 'lt':
          conditionMet = typeof value === 'number' && value < (targetValue as number);
          break;
        case 'gte':
          conditionMet = typeof value === 'number' && value >= (targetValue as number);
          break;
        case 'lte':
          conditionMet = typeof value === 'number' && value <= (targetValue as number);
          break;
        case 'contains':
          conditionMet = typeof value === 'string' && value.includes(targetValue as string);
          break;
        case 'in':
          conditionMet = Array.isArray(targetValue) && targetValue.includes(value as string);
          break;
      }

      if (!conditionMet) return false;
    }

    return true;
  },

  /**
   * Get a field value from a ticket
   */
  getTicketFieldValue(field: string, ticket: Ticket): string | number | boolean | null {
    const fieldMap: Record<string, () => string | number | boolean | null> = {
      'priority': () => ticket.priority,
      'status': () => ticket.status,
      'issueType': () => ticket.issueType,
      'assignedToId': () => ticket.assignedToId,
      'customerId': () => ticket.customerId,
      'slaBreached': () => ticket.slaBreached,
      'title': () => ticket.title,
      'description': () => ticket.description,
    };

    const getter = fieldMap[field];
    return getter ? getter() : null;
  },

  /**
   * Execute a single action
   */
  async executeAction(action: AutomationAction, ticket: Ticket) {
    console.log(`[Automation] Executing action: ${action.type}`);

    switch (action.type) {
      case 'assign.least_workload':
        await this.assignToLeastWorkload(ticket);
        break;

      case 'assign.by_skill':
        await this.assignBySkill(ticket);
        break;

      case 'notify.supervisor':
        await this.notifySupervisors(ticket, 'Alerte automatisation');
        break;

      case 'notify.team':
        await this.notifyTeam(ticket, 'Alerte automatisation');
        break;

      case 'notify.assigned':
        if (ticket.assignedToId) {
          await notifyTicketAssigned(ticket.id, ticket.assignedToId, ticket.title);
        }
        break;

      case 'escalate':
        await this.escalateTicket(ticket);
        break;

      case 'close':
        await this.closeTicket(ticket);
        break;

      case 'send.reminder':
        // TODO: Implement email reminder
        console.log(`[Automation] Would send reminder for ticket #${ticket.ticketNumber}`);
        break;

      case 'send.survey':
        // TODO: Implement satisfaction survey
        console.log(`[Automation] Would send survey for ticket #${ticket.ticketNumber}`);
        break;

      case 'email.customer':
        // TODO: Implement customer email
        console.log(`[Automation] Would email customer for ticket #${ticket.ticketNumber}`);
        break;

      default:
        console.warn(`[Automation] Unknown action type: ${action.type}`);
    }
  },

  /**
   * Assign ticket to agent with least workload
   */
  async assignToLeastWorkload(ticket: Ticket) {
    // Get all agents with their active ticket count
    const agents = await prisma.user.findMany({
      where: {
        role: { in: ['AGENT', 'SUPERVISOR'] },
        isActive: true,
      },
      include: {
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { notIn: ['RESOLVED', 'CLOSED'] },
              },
            },
          },
        },
      },
    });

    if (agents.length === 0) return;

    // Find agent with least tickets
    const leastLoaded = agents.reduce((min, agent) =>
      agent._count.assignedTickets < min._count.assignedTickets ? agent : min
    );

    // Assign ticket
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: leastLoaded.id,
        status: 'IN_PROGRESS',
      },
    });

    // Notify agent
    await notifyTicketAssigned(ticket.id, leastLoaded.id, ticket.title);

    console.log(`[Automation] Assigned ticket #${ticket.ticketNumber} to ${leastLoaded.displayName}`);
  },

  /**
   * Assign ticket based on issue type skill
   */
  async assignBySkill(ticket: Ticket) {
    // For now, same as least_workload
    // In future, could use agent skill tags
    await this.assignToLeastWorkload(ticket);
  },

  /**
   * Notify all supervisors
   */
  async notifySupervisors(ticket: Ticket, message: string) {
    const supervisors = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPERVISOR'] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const supervisor of supervisors) {
      await notifySlaWarning(ticket.id, supervisor.id, ticket.title, 0);
    }
  },

  /**
   * Notify entire team
   */
  async notifyTeam(ticket: Ticket, message: string) {
    const team = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPERVISOR', 'AGENT'] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const member of team) {
      await notifySlaWarning(ticket.id, member.id, ticket.title, 0);
    }
  },

  /**
   * Escalate a ticket
   */
  async escalateTicket(ticket: Ticket) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'ESCALATED' },
    });

    // Notify supervisors
    await this.notifySupervisors(ticket, `Ticket #${ticket.ticketNumber} escaladé`);
  },

  /**
   * Close a ticket
   */
  async closeTicket(ticket: Ticket) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });
  },
};

// ============================================
// TRIGGER MAPPING FOR EVENTS
// ============================================

export const triggerFromEvent = (event: string): AutomationTrigger | null => {
  const mapping: Record<string, AutomationTrigger> = {
    'ticket.created': 'TICKET_CREATED',
    'ticket.updated': 'TICKET_UPDATED',
    'ticket.status_changed': 'TICKET_STATUS_CHANGED',
    'ticket.resolved': 'TICKET_RESOLVED',
    'ticket.closed': 'TICKET_CLOSED',
    'sla.warning': 'SLA_WARNING',
    'sla.breach': 'SLA_BREACH',
  };

  return mapping[event] || null;
};
