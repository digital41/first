import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/database.js';

// Types for mocked prisma
const mockPrisma = prisma as unknown as {
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

// Mock WebSocket
vi.mock('../../src/websocket/index.js', () => ({
  sendNotificationToUser: vi.fn(),
  broadcastTicketUpdate: vi.fn(),
  broadcastTicketAssigned: vi.fn(),
  broadcastAITyping: vi.fn(),
  broadcastNewMessage: vi.fn(),
  notifyHumanTakeover: vi.fn(),
  broadcastHumanTakeoverToAdmins: vi.fn(),
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification and send via WebSocket', async () => {
      const mockNotification = {
        id: 'notif-001',
        userId: 'user-001',
        type: 'TICKET_UPDATE',
        ticketId: 'ticket-001',
        messageId: null,
        payload: { action: 'assigned', title: 'Test', ticketNumber: 1001 },
        isRead: false,
        createdAt: new Date(),
      };

      const mockTicket = {
        ticketNumber: 1001,
        title: 'Test Ticket',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { createNotification } = await import('../../src/services/notification.service.js');
      const { sendNotificationToUser } = await import('../../src/websocket/index.js');

      await createNotification({
        userId: 'user-001',
        type: 'TICKET_UPDATE',
        ticketId: 'ticket-001',
        payload: { action: 'assigned', title: 'Test' },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-001',
            type: 'TICKET_UPDATE',
            ticketId: 'ticket-001',
          }),
        })
      );

      expect(sendNotificationToUser).toHaveBeenCalledWith(
        'user-001',
        expect.objectContaining({
          id: 'notif-001',
          type: 'TICKET_UPDATE',
        })
      );
    });

    it('should create notification without ticketId', async () => {
      const mockNotification = {
        id: 'notif-002',
        userId: 'user-001',
        type: 'MESSAGE',
        ticketId: null,
        messageId: null,
        payload: { title: 'System update' },
        isRead: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { createNotification } = await import('../../src/services/notification.service.js');

      await createNotification({
        userId: 'user-001',
        type: 'MESSAGE',
        payload: { title: 'System update' },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      // Should not try to find ticket if no ticketId
      expect(mockPrisma.ticket.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('notifyStatusChange', () => {
    it('should notify user of status change', async () => {
      const mockNotification = {
        id: 'notif-003',
        userId: 'user-001',
        type: 'TICKET_UPDATE',
        ticketId: 'ticket-001',
        payload: {
          action: 'status_changed',
          title: 'Statut mis à jour',
          content: 'Le ticket "Test" est maintenant: En cours.',
          newStatus: 'IN_PROGRESS',
        },
        isRead: false,
        createdAt: new Date(),
      };

      const mockTicket = {
        ticketNumber: 1001,
        title: 'Test',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { notifyStatusChange } = await import('../../src/services/notification.service.js');

      await notifyStatusChange('ticket-001', 'user-001', 'IN_PROGRESS', 'Test');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-001',
            ticketId: 'ticket-001',
          }),
        })
      );
    });
  });

  describe('notifyTicketAssigned', () => {
    it('should notify agent of new assignment', async () => {
      const mockNotification = {
        id: 'notif-004',
        userId: 'agent-001',
        type: 'TICKET_UPDATE',
        ticketId: 'ticket-001',
        payload: {
          action: 'assigned',
          title: 'Nouveau ticket assigné',
          content: 'Le ticket "Problem X" vous a été assigné.',
        },
        isRead: false,
        createdAt: new Date(),
      };

      const mockTicket = {
        ticketNumber: 1002,
        title: 'Problem X',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { notifyTicketAssigned } = await import('../../src/services/notification.service.js');

      await notifyTicketAssigned('ticket-001', 'agent-001', 'Problem X');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'agent-001',
            ticketId: 'ticket-001',
          }),
        })
      );
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return user unread notifications sorted by date', async () => {
      const notifications = [
        {
          id: 'notif-001',
          userId: 'user-001',
          type: 'TICKET_UPDATE',
          isRead: false,
          createdAt: new Date('2024-01-15T10:00:00'),
        },
        {
          id: 'notif-002',
          userId: 'user-001',
          type: 'MESSAGE',
          isRead: false,
          createdAt: new Date('2024-01-14T10:00:00'),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      const { getUnreadNotifications } = await import('../../src/services/notification.service.js');

      const result = await getUnreadNotifications('user-001');

      expect(result).toHaveLength(2);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-001',
            isRead: false,
          },
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('markNotificationsAsRead', () => {
    it('should mark notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const { markNotificationsAsRead } = await import('../../src/services/notification.service.js');

      const count = await markNotificationsAsRead(['notif-001'], 'user-001');

      expect(count).toBe(1);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['notif-001'] },
            userId: 'user-001',
          },
          data: { isRead: true },
        })
      );
    });

    it('should mark multiple notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const { markNotificationsAsRead } = await import('../../src/services/notification.service.js');

      const count = await markNotificationsAsRead(['notif-001', 'notif-002', 'notif-003'], 'user-001');

      expect(count).toBe(3);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalled();
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 10 });

      const { markAllNotificationsAsRead } = await import('../../src/services/notification.service.js');

      const count = await markAllNotificationsAsRead('user-001');

      expect(count).toBe(10);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-001',
            isRead: false,
          },
          data: { isRead: true },
        })
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const { getUnreadCount } = await import('../../src/services/notification.service.js');

      const count = await getUnreadCount('user-001');

      expect(count).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-001',
          isRead: false,
        },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const { getUnreadCount } = await import('../../src/services/notification.service.js');

      const count = await getUnreadCount('user-001');

      expect(count).toBe(0);
    });
  });

  describe('notifyNewMessage', () => {
    it('should notify user of new message', async () => {
      const mockNotification = {
        id: 'notif-005',
        userId: 'user-001',
        type: 'MESSAGE',
        ticketId: 'ticket-001',
        messageId: 'msg-001',
        isRead: false,
        createdAt: new Date(),
      };

      const mockTicket = {
        ticketNumber: 1003,
        title: 'Help Request',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { notifyNewMessage } = await import('../../src/services/notification.service.js');

      await notifyNewMessage('ticket-001', 'msg-001', 'user-001', 'Support Agent', 'Help Request');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-001',
            type: 'MESSAGE',
            ticketId: 'ticket-001',
            messageId: 'msg-001',
          }),
        })
      );
    });
  });

  describe('notifySlaWarning', () => {
    it('should notify agent of SLA warning', async () => {
      const mockNotification = {
        id: 'notif-006',
        userId: 'agent-001',
        type: 'SLA_WARNING',
        ticketId: 'ticket-001',
        isRead: false,
        createdAt: new Date(),
      };

      const mockTicket = {
        ticketNumber: 1004,
        title: 'Urgent Issue',
      };

      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const { notifySlaWarning } = await import('../../src/services/notification.service.js');

      await notifySlaWarning('ticket-001', 'agent-001', 'Urgent Issue', 2);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'agent-001',
            type: 'SLA_WARNING',
            ticketId: 'ticket-001',
          }),
        })
      );
    });
  });
});
