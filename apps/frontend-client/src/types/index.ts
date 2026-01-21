// Enums
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
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

export enum IssueType {
  TECHNICAL = 'TECHNICAL',
  DELIVERY = 'DELIVERY',
  BILLING = 'BILLING',
  OTHER = 'OTHER'
}

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  MENTION = 'MENTION',
  TICKET_UPDATE = 'TICKET_UPDATE',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACH = 'SLA_BREACH'
}

export enum HistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ASSIGNED = 'ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  ESCALATED = 'ESCALATED',
  REOPENED = 'REOPENED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  NOTE_ADDED = 'NOTE_ADDED'
}

// User
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;           // Nom du champ backend
  phoneNumber?: string;     // Alias pour compatibilité
  customerCode?: string;    // Code client SAGE
  companyName?: string;     // Nom de la société
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order (compatible SAGE 100 et base locale)
export interface Order {
  id?: string;
  orderNumber: string;      // DO_Piece
  customerCode?: string;    // DO_Tiers (code client SAGE)
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  companyName?: string;     // CT_Intitule
  totalAmount?: number;     // DO_TotalHT
  status: string;           // Statut (EN_COURS, LIVREE, FACTUREE)
  docType?: number;         // Type de document SAGE (1=BC, 2=BP, 3=BL, 6=FA)
  orderDate?: string;       // DO_Date
  deliveryDate?: string;
  shippingAddress?: string;
  items?: OrderItem[];      // Lignes de commande (SageOrderLine[])
  lines?: OrderLine[];      // Lignes depuis SAGE
  createdAt?: string;       // cbCreation - Date/heure de création
  updatedAt?: string;       // cbModification - Date/heure de modification
  // Dates de transformation (historique du document)
  bpDate?: string;          // Date de création du BP lié (préparation)
  blDate?: string;          // Date de création du BL lié (livraison)
  faDate?: string;          // Date de création de la Facture liée
}

export interface OrderItem {
  id?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Ligne de commande SAGE
export interface OrderLine {
  lineNumber: number;       // DL_Ligne
  productCode: string;      // AR_Ref
  productName: string;      // DL_Design
  quantity: number;         // DL_Qte
  unitPrice: number;        // DL_PrixUnitaire
  totalHT: number;          // DL_MontantHT
}

// Ticket
export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  issueType: IssueType;
  customerId: string;
  customer?: User;
  assignedToId?: string;
  assignedTo?: User;
  orderId?: string;
  order?: Order;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  // Informations équipement
  serialNumber?: string;
  equipmentModel?: string;
  equipmentBrand?: string;
  errorCode?: string;
  // SLA et dates
  slaDeadline?: string;
  slaBreached: boolean;
  resolvedAt?: string;
  closedAt?: string;
  messages?: TicketMessage[];
  attachments?: Attachment[];
  history?: TicketHistory[];
  createdAt: string;
  updatedAt: string;
}

// Message
export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  author?: User;
  content: string;
  isInternal: boolean;
  isRead: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

// Attachment
export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  context: 'TICKET' | 'MESSAGE';
  ticketId?: string;
  messageId?: string;
  uploadedById?: string;
  createdAt: string;
}

// Ticket History
export interface TicketHistory {
  id: string;
  ticketId: string;
  actorId?: string;
  actor?: User;
  action: HistoryAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Notification
export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  ticketId?: string;
  ticket?: Ticket;
  messageId?: string;
  message?: TicketMessage;
  isRead: boolean;
  createdAt: string;
  // Champs pour les notifications temps réel
  title?: string;
  body?: string;
  payload?: {
    action?: string;
    title?: string;
    content?: string;
    senderName?: string;
    newStatus?: string;
    newPriority?: string;
    [key: string]: unknown;
  };
}

// Knowledge Base
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  viewCount: number;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

// API Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority;
  issueType?: IssueType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  slaBreached: number;
}

// Auth Types
export interface LoginCredentials {
  orderNumber: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  issueType: IssueType;
  priority?: TicketPriority;
  orderId?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  attachments?: string[];
  // Informations équipement
  serialNumber?: string;
  equipmentModel?: string;
  equipmentBrand?: string;
  errorCode?: string;
}

export interface SendMessageInput {
  content: string;
  attachments?: string[];
}

// Status Labels
export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Ouvert',
  [TicketStatus.IN_PROGRESS]: 'En cours',
  [TicketStatus.WAITING_CUSTOMER]: 'En attente client',
  [TicketStatus.RESOLVED]: 'Résolu',
  [TicketStatus.CLOSED]: 'Fermé',
  [TicketStatus.ESCALATED]: 'Escaladé',
  [TicketStatus.REOPENED]: 'Réouvert'
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Basse',
  [TicketPriority.MEDIUM]: 'Moyenne',
  [TicketPriority.HIGH]: 'Haute',
  [TicketPriority.URGENT]: 'Urgente'
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  [IssueType.TECHNICAL]: 'Technique',
  [IssueType.DELIVERY]: 'Livraison',
  [IssueType.BILLING]: 'Facturation',
  [IssueType.OTHER]: 'Autre'
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-blue-100 text-blue-800',
  [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
  [TicketStatus.WAITING_CUSTOMER]: 'bg-orange-100 text-orange-800',
  [TicketStatus.RESOLVED]: 'bg-green-100 text-green-800',
  [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800',
  [TicketStatus.ESCALATED]: 'bg-red-100 text-red-800',
  [TicketStatus.REOPENED]: 'bg-purple-100 text-purple-800'
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TicketPriority.URGENT]: 'bg-red-100 text-red-800'
};
