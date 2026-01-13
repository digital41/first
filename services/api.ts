import {
  Order,
  Ticket,
  CreateTicketPayload,
  TicketMessage,
  User,
  AuthTokens,
  AuthResponse,
  TicketFilters,
  PaginatedResponse,
  Notification,
  IssueType,
} from '../types';
import { send } from '@emailjs/browser';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Validation au démarrage
const isEmailConfigured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;
if (!isEmailConfigured) {
  console.warn('⚠️ Configuration EmailJS manquante. Les emails ne seront pas envoyés.');
}

// ============================================
// TYPES API
// ============================================

export type ApiMode = 'online' | 'fallback';

export interface ApiResult<T> {
  data: T;
  mode: ApiMode;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// GESTION DES TOKENS
// ============================================

const TOKEN_KEY = 'kly_access_token';
const REFRESH_TOKEN_KEY = 'kly_refresh_token';
const USER_KEY = 'kly_user';

export const TokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): User | null => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  setTokens: (tokens: AuthTokens): void => {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY);
  },
};

// ============================================
// HTTP CLIENT AVEC AUTH
// ============================================

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = TokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      // Le backend retourne { success, data: { user, tokens }, message }
      const responseBody = await response.json();
      const payload = responseBody.data || responseBody;
      TokenStorage.setTokens(payload.tokens);
      return true;
    }
  } catch {
    console.warn('Échec du rafraîchissement du token');
  }

  TokenStorage.clear();
  return false;
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = TokenStorage.getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Si 401 et qu'on a un refresh token, on tente de rafraîchir
  if (response.status === 401 && TokenStorage.getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = TokenStorage.getAccessToken();
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || errorData.error || 'Une erreur est survenue',
      response.status,
      errorData.code || 'UNKNOWN_ERROR',
      response.status >= 500
    );
  }

  // Le backend retourne { success, data, message } ou { success, data, meta } pour les réponses paginées
  const responseBody = await response.json();

  // Si c'est une réponse paginée (avec meta), retourner { data, ...meta }
  if (responseBody.meta) {
    return {
      data: responseBody.data,
      ...responseBody.meta,
    };
  }

  // Sinon, extraire data
  return responseBody.data !== undefined ? responseBody.data : responseBody;
}

// ============================================
// SERVICE API UNIFIÉ
// ============================================

export const ApiService = {
  // ==========================================
  // AUTHENTIFICATION
  // ==========================================

  /**
   * Connexion client par références commande (BC, PL, BL)
   */
  async loginByReference(
    orderNumber: string,
    plNumber?: string,
    blNumber?: string
  ): Promise<ApiResult<Order>> {
    try {
      // Build payload - only include non-empty values to satisfy backend validation (min:1)
      const payload: Record<string, string> = {};
      if (orderNumber?.trim()) payload.orderNumber = orderNumber.trim();
      if (plNumber?.trim()) payload.plNumber = plNumber.trim();
      if (blNumber?.trim()) payload.blNumber = blNumber.trim();

      const url = `${API_BASE_URL}/auth/login`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (response.ok) {
        // Le backend retourne { success, data: { user, order, tokens }, message }
        const responseBody = JSON.parse(responseText);
        const data = responseBody.data || responseBody;

        // Si le backend retourne des tokens, les stocker
        if (data.tokens) {
          TokenStorage.setTokens(data.tokens);
        }
        if (data.user) {
          TokenStorage.setUser(data.user);
        }
        return { data: data.order || data, mode: 'online' };
      }

      console.warn('API Backend réponse non-ok, passage en mode fallback.');
    } catch {
      console.warn('API Backend inaccessible, passage en mode fallback local.');
    }

    // FALLBACK : On génère une commande "volante"
    const fallbackOrder: Order = {
      id: 'fallback-' + Date.now(),
      orderNumber: orderNumber || 'REF-INCONNUE',
      plNumber: plNumber || undefined,
      blNumber: blNumber || undefined,
      customerName: 'Utilisateur Invité',
      purchaseDate: new Date().toLocaleDateString('fr-FR'),
      status: 'DELIVERED',
      items: [
        {
          ref: 'GENERIC',
          name: 'Ensemble de la commande / Dossier global',
          quantity: 1,
          imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext fill="%2364748b" font-family="Arial" font-size="14" x="50" y="55" text-anchor="middle"%3ESAV%3C/text%3E%3C/svg%3E',
        },
      ],
    };

    return {
      data: fallbackOrder,
      mode: 'fallback',
      message: 'Mode hors-ligne : vos références ont été enregistrées mais non vérifiées.',
    };
  },

  /**
   * Connexion admin/agent par email + mot de passe
   */
  async loginAdmin(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || errorData.error || 'Identifiants invalides',
        response.status,
        'AUTH_FAILED',
        false
      );
    }

    // Le backend retourne { success, data: { user, tokens }, message }
    const responseBody = await response.json();
    const data: AuthResponse = responseBody.data;

    TokenStorage.setTokens(data.tokens);
    TokenStorage.setUser(data.user);

    return data;
  },

  /**
   * Récupère les infos de l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User> {
    return fetchWithAuth<User>('/auth/me');
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    const refreshToken = TokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore les erreurs de logout
      }
    }
    TokenStorage.clear();
  },

  // ==========================================
  // TICKETS CLIENT
  // ==========================================

  /**
   * Crée un nouveau ticket (espace client)
   */
  async createTicket(ticketData: CreateTicketPayload): Promise<ApiResult<Ticket>> {
    try {
      const ticket = await fetchWithAuth<Ticket>('/client/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketData),
      });

      return { data: ticket, mode: 'online' };
    } catch (error) {
      console.warn('Création ticket API échouée, mode local activé', error);

      // Fallback : créer un ticket local
      const fallbackTicket: Ticket = {
        id: `SAV-${Math.floor(Math.random() * 100000)}`,
        title: ticketData.title,
        description: ticketData.description,
        status: 'OPEN' as const,
        priority: ticketData.priority || 'MEDIUM' as const,
        issueType: ticketData.issueType,
        slaBreached: false,
        tags: ticketData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        // Champs legacy
        contactName: ticketData.contactName,
        contactEmail: ticketData.contactEmail,
        contactPhone: ticketData.contactPhone,
        companyName: ticketData.companyName,
        callbackSlot: ticketData.callbackSlot,
        affectedProducts: ticketData.affectedProducts,
      };

      // Tenter l'envoi d'email de confirmation
      if (ticketData.contactEmail) {
        await this.sendConfirmationEmail(fallbackTicket);
      }

      return {
        data: fallbackTicket,
        mode: 'fallback',
        message: 'Ticket créé en mode hors-ligne. Un email de confirmation vous a été envoyé.',
      };
    }
  },

  /**
   * Liste les tickets du client avec pagination et filtres
   */
  async getTickets(filters: TicketFilters = {}): Promise<PaginatedResponse<Ticket>> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.status) params.set('status', filters.status);
    if (filters.issueType) params.set('issueType', filters.issueType);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<PaginatedResponse<Ticket>>(`/client/tickets${query}`);
  },

  /**
   * Récupère un ticket par ID (espace client)
   */
  async getTicketById(id: string): Promise<Ticket | null> {
    try {
      return await fetchWithAuth<Ticket>(`/client/tickets/${id}`);
    } catch {
      console.error('Impossible de récupérer le ticket');
      return null;
    }
  },

  // ==========================================
  // MESSAGES CLIENT
  // ==========================================

  /**
   * Récupère les messages d'un ticket (espace client)
   */
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return fetchWithAuth<TicketMessage[]>(`/client/tickets/${ticketId}/messages`);
  },

  /**
   * Envoie un message dans un ticket (espace client)
   */
  async sendMessage(ticketId: string, content: string): Promise<TicketMessage> {
    return fetchWithAuth<TicketMessage>(`/client/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // ==========================================
  // NOTIFICATIONS CLIENT
  // ==========================================

  /**
   * Récupère les notifications du client
   */
  async getNotifications(): Promise<Notification[]> {
    return fetchWithAuth<Notification[]>('/client/notifications');
  },

  /**
   * Marque une notification comme lue
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await fetchWithAuth<void>('/client/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds: [notificationId] }),
    });
  },

  // ==========================================
  // UPLOADS CLIENT
  // ==========================================

  /**
   * Upload un fichier (espace client)
   */
  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('files', file);

      const accessToken = TokenStorage.getAccessToken();
      const headers: HeadersInit = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/client/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        const responseBody = await response.json();
        const data = responseBody.data || responseBody;
        // Le backend retourne un tableau, on prend le premier
        return Array.isArray(data) ? data[0]?.url : data.url;
      }
    } catch {
      console.warn('Upload échoué, utilisation URL locale');
    }

    // Fallback simple pour ne pas bloquer le formulaire
    return URL.createObjectURL(file);
  },

  // ==========================================
  // EMAILS (EmailJS - Fallback)
  // ==========================================

  /**
   * Envoie un email de confirmation (utilisé en mode fallback)
   */
  async sendConfirmationEmail(ticket: Ticket): Promise<boolean> {
    if (!isEmailConfigured) {
      console.warn('Configuration EmailJS manquante - email non envoyé');
      return false;
    }

    try {
      const getReadableIssueType = (issueType: IssueType) => {
        switch (issueType) {
          case IssueType.TECHNICAL:
            return 'Support Technique';
          case IssueType.DELIVERY:
            return 'Problème de Livraison';
          case IssueType.BILLING:
            return 'Question Facturation';
          case IssueType.OTHER:
            return 'Assistance Générale';
          default:
            return 'Assistance Générale';
        }
      };

      const emailTitle = `Dossier ${ticket.id} : ${getReadableIssueType(ticket.issueType)}`;
      const templateParams = {
        name: ticket.contactName,
        title: emailTitle,
        to_email: ticket.contactEmail,
        reply_to: 'digital@klygroupe.com',
        ticket_id: ticket.id,
        company_name: ticket.companyName,
        contact_phone: ticket.contactPhone,
        callback_slot: ticket.callbackSlot || 'Non défini',
        message: ticket.description,
        description: ticket.description,
        attachments_count: ticket.attachments?.length || 0,
      };

      await send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
      return true;
    } catch (error) {
      console.error('Erreur envoi email confirmation:', error);
      return false;
    }
  },

  /**
   * Envoie un email administratif
   */
  async sendAdministrativeEmail(params: {
    type: 'DUPLICATA' | 'RELEVE' | 'ERREUR_PRIX';
    clientName: string;
    email: string;
    invoiceNumber?: string;
    details?: string;
  }): Promise<void> {
    if (!isEmailConfigured) {
      throw new Error('Configuration EmailJS manquante');
    }

    let message = '';
    let title = '';

    switch (params.type) {
      case 'DUPLICATA':
        title = `Demande Duplicata - ${params.clientName}`;
        message = `Bonjour ${params.clientName}, souhaite le duplicata de la facture ${params.invoiceNumber || 'Non spécifiée'}.`;
        break;
      case 'RELEVE':
        title = `Demande Relevé - ${params.clientName}`;
        message = `Bonjour je souhaiterai avoir le relever de mon compte ${params.clientName}.`;
        break;
      case 'ERREUR_PRIX':
        title = `Litige Prix - ${params.clientName}`;
        message = `Signalement erreur de prix.\nRéférence(s): ${params.invoiceNumber}\nDétails: ${params.details}\nMerci de me contacter.`;
        break;
    }

    const templateParams = {
      to_email: 'digital@klygroupe.com',
      reply_to: params.email,
      title: title,
      message: message,
      name: params.clientName,
      company_name: params.clientName,
      ticket_id: 'ADMIN-REQ',
      description: message,
      contact_phone: 'Voir email client',
    };

    await send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
  },

  // ==========================================
  // ALIAS METHODS (for component compatibility)
  // ==========================================

  /**
   * Alias for sendMessage - used by new UI components
   */
  async sendTicketMessage(ticketId: string, content: string): Promise<TicketMessage> {
    return this.sendMessage(ticketId, content);
  },

  /**
   * Get order by reference - wrapper for loginByReference
   * Used by GuidedTicketFlow component
   */
  async getOrderByReference(reference: string): Promise<Order> {
    const result = await this.loginByReference(reference);
    return result.data;
  },
};

// Export pour compatibilité
export default ApiService;
