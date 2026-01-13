// ============================================
// ENUMS - Alignés avec le backend Prisma
// ============================================

export enum Intent {
  TECHNICAL = 'TECHNICAL',
  DELIVERY = 'DELIVERY',
  INVOICE = 'BILLING', // Mappé vers BILLING côté backend
  RETURN = 'OTHER',    // Mappé vers OTHER côté backend
  NONE = 'OTHER'
}

export enum IssueType {
  TECHNICAL = 'TECHNICAL',
  DELIVERY = 'DELIVERY',
  BILLING = 'BILLING',
  OTHER = 'OTHER'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
  REOPENED = 'REOPENED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  MENTION = 'MENTION',
  TICKET_UPDATE = 'TICKET_UPDATE',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH'
}

// ============================================
// INTERFACES - Utilisateur
// ============================================

export interface User {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  role: UserRole;
  lastSeenAt?: Date;
  createdAt: Date;
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
  trackingUrl?: string;
  invoiceUrl?: string;
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

  // SLA
  slaDeadline?: Date;
  slaBreached: boolean;

  // Tags
  tags: string[];

  // Relations
  customerId?: string;
  customer?: User;
  assignedToId?: string;
  assignedTo?: User;
  orderId?: string;
  order?: Order;

  // Pièces jointes
  attachments?: Attachment[];

  // Satisfaction
  satisfactionScore?: number;

  // Historique
  history?: TicketHistory[];

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;

  // Champs legacy pour compatibilité formulaire
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  callbackSlot?: string;
  affectedProducts?: string[];
}

export interface CreateTicketPayload {
  title: string;
  description?: string;
  priority?: TicketPriority;
  issueType: IssueType;
  orderId?: string;
  tags?: string[];
  // Champs contact pour création sans compte
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;
  callbackSlot?: string;
  affectedProducts?: string[];
  attachments?: string[];
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
  readBy?: string[];
  attachments?: Attachment[];
  createdAt: Date;
}

// Pour le chatbot Gemini (local)
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
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

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface TicketFilters extends PaginationParams {
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