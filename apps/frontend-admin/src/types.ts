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
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  issueType: IssueType;
  slaDeadline?: Date;
  slaBreached: boolean;
  tags: string[];
  customerId?: string;
  customer?: User;
  assignedToId?: string;
  assignedTo?: User;
  orderId?: string;
  order?: Order;
  attachments?: Attachment[];
  satisfactionScore?: number;
  history?: TicketHistory[];
  createdAt: Date;
  updatedAt: Date;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
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
  userId: string;
  type: NotificationType;
  ticketId?: string;
  messageId?: string;
  payload?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

// ============================================
// INTERFACES - Pagination & Filtres
// ============================================

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: TicketStatus;
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
