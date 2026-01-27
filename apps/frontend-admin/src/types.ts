// ============================================
// ENUMS - Alignés avec le backend Prisma
// ============================================

export enum IssueType {
  TECHNICAL = 'TECHNICAL',
  DELIVERY = 'DELIVERY',
  BILLING = 'BILLING',
  OTHER = 'OTHER',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
  REOPENED = 'REOPENED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  MENTION = 'MENTION',
  TICKET_UPDATE = 'TICKET_UPDATE',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH',
}

// ============================================
// INTERFACES - Utilisateur
// ============================================

export interface User {
  id: string;
  email: string;
  phone?: string;
  displayName: string;
  role: UserRole | string;
  avatarUrl?: string;
  isActive?: boolean;
  lastSeenAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  // Stats from backend
  _count?: {
    assignedTickets?: number;
    tickets?: number;
    messages?: number;
  };
  activeTicketsCount?: number; // For available agents endpoint
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// INTERFACES - Commandes
// ============================================

export interface OrderItem {
  ref: string;
  name: string;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  plNumber?: string;
  blNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  purchaseDate: string;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'PROCESSING';
}

// ============================================
// INTERFACES - Tickets
// ============================================

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface TicketHistory {
  id: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  actor?: User;
  createdAt: Date;
}

export interface Ticket {
  id: string;
  ticketNumber?: number;
  ticketRef?: string; // Format: 26-0001 (année-numéro)
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  issueType: IssueType;
  slaDeadline?: Date | string;
  slaBreached: boolean;
  tags: string[];
  customerId?: string;
  customer?: User;
  assignedToId?: string;
  assignedTo?: User;
  orderId?: string;
  order?: Order;
  attachments?: Attachment[];
  messages?: TicketMessage[];
  satisfactionScore?: number;
  history?: TicketHistory[];
  createdAt: Date | string;
  updatedAt: Date | string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Informations équipement
  serialNumber?: string;
  equipmentModel?: string;
  equipmentBrand?: string;
  errorCode?: string;
  _count?: {
    messages?: number;
  };
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string | null;
  tags?: string[];
}

// ============================================
// INTERFACES - Messages
// ============================================

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  author?: User;
  content: string;
  isInternal?: boolean;
  readBy?: string[];
  attachments?: Attachment[];
  createdAt: Date;
}

// ============================================
// INTERFACES - Notifications
// ============================================

export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  ticketId?: string;
  ticketNumber?: number; // Numéro de ticket lisible
  ticketTitle?: string; // Titre du ticket
  messageId?: string;
  payload?: Record<string, unknown>;
  // For real-time notifications
  title?: string;
  body?: string;
  isRead: boolean;
  createdAt: Date | string;
}

// ============================================
// INTERFACES - Pagination & Filtres
// ============================================

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  excludeStatus?: TicketStatus[];
  issueType?: IssueType;
  priority?: TicketPriority;
  assignedToId?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// INTERFACES - Statistiques
// ============================================

export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  byIssueType: Record<IssueType, number>;
  slaBreached: number;
  avgResolutionTime?: number;
}

// ============================================
// INTERFACES - Réponses types
// ============================================

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
}

// ============================================
// ENUMS - Automation
// ============================================

export enum AutomationTrigger {
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_CLOSED = 'TICKET_CLOSED',
  TICKET_IDLE_4H = 'TICKET_IDLE_4H',
  TICKET_WAITING_3DAYS = 'TICKET_WAITING_3DAYS',
  TICKET_RESOLVED_7DAYS = 'TICKET_RESOLVED_7DAYS',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH',
}

// ============================================
// INTERFACES - Automation
// ============================================

export interface AutomationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: string | number | boolean | string[];
}

export interface AutomationAction {
  type: string;
  params?: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  priority: number;
  createdById?: string;
  createdBy?: {
    id: string;
    displayName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    executions: number;
  };
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  todayExecutions: number;
  weekExecutions: number;
  autoAssignCount: number;
  notificationCount: number;
}
