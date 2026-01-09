export enum Intent {
  TECHNICAL = 'TECHNICAL',
  DELIVERY = 'DELIVERY',
  INVOICE = 'INVOICE',
  RETURN = 'RETURN',
  NONE = 'NONE'
}

export interface OrderItem {
  ref: string;
  name: string;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  plNumber?: string;
  blNumber?: string;
  customerName: string;
  items: OrderItem[]; // Liste des articles provenant de SAGE
  purchaseDate: string;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'PROCESSING';
  trackingUrl?: string;
  invoiceUrl?: string;
}

export interface StatusHistory {
  date: Date;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  companyName: string; 
  contactName: string; 
  contactEmail: string;
  contactPhone: string;
  issueType: Intent;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'PENDING';
  createdAt: Date;
  hasPhoto: boolean;
  attachments?: string[]; // URLs des fichiers stockés (S3/Azure)
  callbackSlot?: string;
  internalNotes?: string;
  affectedProducts?: string[]; // Liste des produits concernés
  history?: StatusHistory[]; // Historique des changements
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}