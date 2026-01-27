import {
  Ticket,
  TicketMessage,
  User,
  AuthTokens,
  AuthResponse,
  TicketFilters,
  PaginatedResponse,
  TicketStats,
  Notification,
  UpdateTicketPayload,
  CannedResponse,
  Attachment,
  AutomationRule,
} from '../types';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ============================================
// TYPES API
// ============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// GESTION DES TOKENS
// ============================================

const TOKEN_KEY = 'kly_admin_access_token';
const REFRESH_TOKEN_KEY = 'kly_admin_refresh_token';
const USER_KEY = 'kly_admin_user';

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

  // Si 401, tenter de rafraîchir le token
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
      errorData.code || 'UNKNOWN_ERROR'
    );
  }

  const responseBody = await response.json();

  // Gestion des réponses paginées
  if (responseBody.meta) {
    return {
      data: responseBody.data,
      ...responseBody.meta,
    } as T;
  }

  return responseBody.data !== undefined ? responseBody.data : responseBody;
}

// ============================================
// SERVICE API ADMIN
// ============================================

export const AdminApi = {
  // ==========================================
  // AUTHENTIFICATION
  // ==========================================

  async login(email: string, password: string): Promise<AuthResponse> {
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
        'AUTH_FAILED'
      );
    }

    const responseBody = await response.json();
    const data: AuthResponse = responseBody.data;

    TokenStorage.setTokens(data.tokens);
    TokenStorage.setUser(data.user);

    return data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await fetchWithAuth<{ user: User }>('/auth/me');
    return response.user;
  },

  async updateProfile(data: {
    displayName?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<User> {
    const response = await fetchWithAuth<{ user: User }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    // Update local storage with new user data
    TokenStorage.setUser(response.user);
    return response.user;
  },

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
        // Ignore
      }
    }
    TokenStorage.clear();
  },

  // ==========================================
  // TICKETS (Admin)
  // ==========================================

  async getTickets(filters: TicketFilters = {}): Promise<PaginatedResponse<Ticket>> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.status) params.set('status', filters.status);
    if (filters.excludeStatus && filters.excludeStatus.length > 0) {
      params.set('excludeStatus', filters.excludeStatus.join(','));
    }
    if (filters.issueType) params.set('issueType', filters.issueType);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.assignedToId) params.set('assignedToId', filters.assignedToId);
    if (filters.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth<PaginatedResponse<Ticket>>(`/admin/tickets${query}`);
  },

  async getTicketById(id: string): Promise<Ticket> {
    return fetchWithAuth<Ticket>(`/admin/tickets/${id}`);
  },

  async updateTicket(id: string, updates: UpdateTicketPayload): Promise<Ticket> {
    return fetchWithAuth<Ticket>(`/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getTicketStats(): Promise<TicketStats> {
    return fetchWithAuth<TicketStats>('/admin/tickets/stats');
  },

  async createTicket(data: {
    title: string;
    description?: string;
    issueType: string;
    priority?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    companyName?: string;
    tags?: string[];
  }): Promise<Ticket> {
    return fetchWithAuth<Ticket>('/admin/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ==========================================
  // TRANSFERT DE TICKETS
  // ==========================================

  async requestTransfer(ticketId: string, toAgentId: string, reason?: string): Promise<{
    id: string;
    ticketId: string;
    toAgentId: string;
  }> {
    return fetchWithAuth<{ id: string; ticketId: string; toAgentId: string }>(`/admin/tickets/${ticketId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toAgentId, reason }),
    });
  },

  async acceptTransfer(transferId: string): Promise<Ticket> {
    return fetchWithAuth<Ticket>(`/admin/transfers/${transferId}/accept`, {
      method: 'POST',
    });
  },

  async declineTransfer(transferId: string, reason?: string): Promise<void> {
    await fetchWithAuth<void>(`/admin/transfers/${transferId}/decline`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getPendingTransfers(): Promise<Array<{
    id: string;
    ticketId: string;
    ticketNumber: number;
    ticketTitle: string;
    fromAgentId: string;
    fromAgentName: string;
    reason?: string;
    createdAt: string;
  }>> {
    return fetchWithAuth<Array<{
      id: string;
      ticketId: string;
      ticketNumber: number;
      ticketTitle: string;
      fromAgentId: string;
      fromAgentName: string;
      reason?: string;
      createdAt: string;
    }>>('/admin/transfers/pending');
  },

  // ==========================================
  // MESSAGES (Admin)
  // ==========================================

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    const response = await fetchWithAuth<{ data: TicketMessage[] } | TicketMessage[]>(
      `/admin/tickets/${ticketId}/messages`
    );
    // Handle both paginated response {data: [...]} and direct array
    if (Array.isArray(response)) {
      return response;
    }
    return response.data || [];
  },

  async sendMessage(
    ticketId: string,
    content: string,
    isInternal = false,
    attachmentIds: string[] = []
  ): Promise<TicketMessage> {
    return fetchWithAuth<TicketMessage>(`/admin/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, isInternal, attachments: attachmentIds }),
    });
  },

  // ==========================================
  // UTILISATEURS (Admin)
  // ==========================================

  async getAgents(): Promise<User[]> {
    const response = await fetchWithAuth<{ agents: User[] }>('/admin/agents');
    return response.agents || [];
  },

  async getUsers(filters?: { role?: string; status?: string; search?: string }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithAuth<{ users: User[]; data?: User[]; pagination?: unknown } | User[]>(`/admin/users${query}`);

    // Handle different response formats
    if (Array.isArray(response)) return response;

    // Backend returns { users, pagination }
    if (response && typeof response === 'object') {
      if ('users' in response && Array.isArray(response.users)) {
        return response.users;
      }
      if ('data' in response && Array.isArray(response.data)) {
        return response.data;
      }
    }

    console.warn('[API] Unexpected getUsers response format:', response);
    return [];
  },

  async getUserById(userId: string): Promise<User> {
    const response = await fetchWithAuth<{ user: User }>(`/admin/users/${userId}`);
    return response.user;
  },

  async createUser(data: {
    email: string;
    displayName: string;
    password?: string;
    role: string;
    phone?: string;
  }): Promise<User> {
    const response = await fetchWithAuth<{ user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.user;
  },

  async updateUser(
    userId: string,
    data: {
      displayName?: string;
      role?: string;
      isActive?: boolean;
      phone?: string;
      password?: string;
    }
  ): Promise<User> {
    const response = await fetchWithAuth<{ user: User }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.user;
  },

  async deleteUser(userId: string): Promise<void> {
    await fetchWithAuth<void>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getAgentStats(agentId: string): Promise<{
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    activeTickets: number;
    slaComplianceRate: number;
  }> {
    const response = await fetchWithAuth<{ stats: unknown }>(`/admin/users/${agentId}/stats`);
    return response.stats as {
      totalTickets: number;
      resolvedTickets: number;
      avgResolutionTime: number;
      activeTickets: number;
      slaComplianceRate: number;
    };
  },

  // ==========================================
  // CLIENTS SAV (Admin)
  // ==========================================

  async getClientsWithTickets(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    clients: Array<{
      id: string;
      email: string;
      phone: string | null;
      displayName: string;
      createdAt: string;
      lastSeenAt: string | null;
      isActive: boolean;
      totalTickets: number;
      openTickets: number;
      lastTicket: {
        id: string;
        ticketNumber: number;
        title: string;
        status: string;
        priority: string;
        createdAt: string;
      } | null;
      recentTickets: Array<{
        id: string;
        ticketNumber: number;
        title: string;
        status: string;
        priority: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/admin/clients${queryString ? `?${queryString}` : ''}`;

    return fetchWithAuth(url);
  },

  // ==========================================
  // NOTIFICATIONS (Admin)
  // ==========================================

  async getNotifications(): Promise<Notification[]> {
    const response = await fetchWithAuth<{ data: Notification[] } | Notification[]>(
      '/admin/notifications'
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.data || [];
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await fetchWithAuth<void>('/admin/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds: [notificationId] }),
    });
  },

  async markNotificationsAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    await fetchWithAuth<void>('/admin/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds }),
    });
  },

  async markAllNotificationsAsRead(): Promise<void> {
    await fetchWithAuth<void>('/admin/notifications/read-all', {
      method: 'PUT',
    });
  },

  // ==========================================
  // RÉPONSES TYPES (Admin)
  // ==========================================

  async getCannedResponses(): Promise<CannedResponse[]> {
    return fetchWithAuth<CannedResponse[]>('/admin/canned-responses');
  },

  // ==========================================
  // UPLOAD DE FICHIERS (Admin)
  // ==========================================

  async uploadFiles(files: File[]): Promise<Attachment[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = TokenStorage.getAccessToken();
    const response = await fetch(`${API_BASE_URL}/admin/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError('Erreur lors de l\'upload', response.status, 'UPLOAD_ERROR');
    }

    const data = await response.json();
    return data.data || data.attachments || data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await fetchWithAuth<void>(`/admin/upload/${attachmentId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // IA - Assistant intelligent
  // ==========================================

  async generateAIResponse(ticketId: string, autoSave = false): Promise<{
    message: string;
    shouldEscalate: boolean;
    confidence: number;
    suggestedActions?: string[];
    saved: boolean;
  }> {
    return fetchWithAuth<{
      message: string;
      shouldEscalate: boolean;
      confidence: number;
      suggestedActions?: string[];
      saved: boolean;
    }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ ticketId, autoSave }),
    });
  },

  async sendAIResponse(ticketId: string): Promise<{
    message: string;
    shouldEscalate: boolean;
    confidence: number;
    suggestedActions?: string[];
  }> {
    return fetchWithAuth<{
      message: string;
      shouldEscalate: boolean;
      confidence: number;
      suggestedActions?: string[];
    }>(`/ai/respond/${ticketId}`, {
      method: 'POST',
    });
  },

  async analyzeCustomerMessage(ticketId: string, customerMessage: string): Promise<{
    suggestedResponse: string;
    shouldEscalate: boolean;
    confidence: number;
    suggestedActions?: string[];
  }> {
    return fetchWithAuth<{
      suggestedResponse: string;
      shouldEscalate: boolean;
      confidence: number;
      suggestedActions?: string[];
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ ticketId, customerMessage }),
    });
  },

  // ==========================================
  // SAGE API (Lecture seule - optionnel)
  // ==========================================

  /**
   * Vérifie le statut de la connexion SAGE
   */
  async getSageStatus(): Promise<{
    enabled: boolean;
    available: boolean;
    message: string;
  }> {
    try {
      const response = await fetchWithAuth<{
        enabled: boolean;
        available: boolean;
        message: string;
      }>('/sage/status');
      return response;
    } catch {
      return { enabled: false, available: false, message: 'Erreur connexion SAGE' };
    }
  },

  /**
   * Récupère un client SAGE par son code
   */
  async getSageCustomer(customerCode: string): Promise<{
    customerCode: string;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  } | null> {
    try {
      const response = await fetchWithAuth<{
        customerCode: string;
        companyName: string;
        contactName?: string;
        email?: string;
        phone?: string;
        address?: string;
        postalCode?: string;
        city?: string;
      } | null>(`/sage/customer/${customerCode}`);
      return response;
    } catch {
      return null;
    }
  },

  /**
   * Récupère les commandes d'un client SAGE
   */
  async getSageCustomerOrders(customerCode: string): Promise<Array<{
    documentNumber: string;
    documentType: number;
    documentTypeLabel: string;
    customerCode: string;
    orderDate: string;
    deliveryDate?: string;
    reference?: string;
    totalHT: number;
    totalTTC: number;
    status: string;
  }>> {
    try {
      const response = await fetchWithAuth<Array<{
        documentNumber: string;
        documentType: number;
        documentTypeLabel: string;
        customerCode: string;
        orderDate: string;
        deliveryDate?: string;
        reference?: string;
        totalHT: number;
        totalTTC: number;
        status: string;
      }>>(`/sage/customer/${customerCode}/orders`);
      return response || [];
    } catch {
      return [];
    }
  },

  /**
   * Récupère une commande SAGE par son numéro
   */
  async getSageOrder(orderNumber: string): Promise<{
    documentNumber: string;
    documentType: number;
    documentTypeLabel: string;
    customerCode: string;
    orderDate: string;
    deliveryDate?: string;
    reference?: string;
    totalHT: number;
    totalTTC: number;
    status: string;
    lines?: Array<{
      lineNumber: number;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalHT: number;
    }>;
  } | null> {
    try {
      const response = await fetchWithAuth<{
        documentNumber: string;
        documentType: number;
        documentTypeLabel: string;
        customerCode: string;
        orderDate: string;
        deliveryDate?: string;
        reference?: string;
        totalHT: number;
        totalTTC: number;
        status: string;
        lines?: Array<{
          lineNumber: number;
          productCode: string;
          productName: string;
          quantity: number;
          unitPrice: number;
          totalHT: number;
        }>;
      } | null>(`/sage/order/${orderNumber}`);
      return response;
    } catch {
      return null;
    }
  },

  /**
   * Recherche de clients SAGE
   */
  async searchSageCustomers(query: string): Promise<Array<{
    customerCode: string;
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
  }>> {
    try {
      if (!query || query.length < 2) return [];
      const response = await fetchWithAuth<Array<{
        customerCode: string;
        companyName: string;
        contactName?: string;
        email?: string;
        phone?: string;
      }>>(`/sage/search/customers?q=${encodeURIComponent(query)}`);
      return response || [];
    } catch {
      return [];
    }
  },

  // ==========================================
  // ASSISTANT IA OPÉRATEUR
  // ==========================================

  /**
   * Obtenir une suggestion IA pour un ticket
   */
  async getAISuggestion(ticketId: string, query?: string): Promise<{
    success: boolean;
    suggestion: string;
    draftResponse: string;
    keyPoints: string[];
    recommendedActions: string[];
    customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    urgencyAssessment: string;
  }> {
    // fetchWithAuth extracts .data automatically
    return fetchWithAuth<{
      success: boolean;
      suggestion: string;
      draftResponse: string;
      keyPoints: string[];
      recommendedActions: string[];
      customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
      urgencyAssessment: string;
    }>(`/admin/ai/suggest/${ticketId}`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  /**
   * Analyser rapidement un ticket
   */
  async analyzeTicket(ticketId: string): Promise<{
    ticketNumber: number;
    issueType: string;
    priority: string;
    sentiment: string;
    urgency: string;
    messageCount: number;
    customerMessageCount: number;
    extractedInfo: {
      serialNumber?: string;
      equipmentModel?: string;
      equipmentBrand?: string;
      errorCode?: string;
    };
    lastCustomerMessage: string | null;
  }> {
    // fetchWithAuth extracts .data automatically
    return fetchWithAuth<{
      ticketNumber: number;
      issueType: string;
      priority: string;
      sentiment: string;
      urgency: string;
      messageCount: number;
      customerMessageCount: number;
      extractedInfo: {
        serialNumber?: string;
        equipmentModel?: string;
        equipmentBrand?: string;
        errorCode?: string;
      };
      lastCustomerMessage: string | null;
    }>(`/admin/ai/analyze/${ticketId}`, {
      method: 'POST',
    });
  },

  /**
   * Résumé intelligent de la conversation par IA
   */
  async getConversationSummary(ticketId: string): Promise<{
    ticketNumber: number;
    summary: string;
    keyIssues: string[];
    customerMood: string;
    nextSteps: string[];
    resolutionProgress: number;
  }> {
    // fetchWithAuth extracts .data automatically
    return fetchWithAuth<{
      ticketNumber: number;
      summary: string;
      keyIssues: string[];
      customerMood: string;
      nextSteps: string[];
      resolutionProgress: number;
    }>(`/admin/ai/summary/${ticketId}`, {
      method: 'POST',
    });
  },

  /**
   * Suggestion IA avec streaming (réponse progressive)
   * Retourne un EventSource-like pour gérer les chunks
   */
  getAISuggestionStream(
    ticketId: string,
    query?: string,
    onChunk: (text: string) => void = () => {},
    onDone: () => void = () => {},
    onError: (error: string) => void = () => {}
  ): { abort: () => void } {
    const controller = new AbortController();
    const token = TokenStorage.getAccessToken();

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/ai/suggest-stream/${ticketId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          onError('Erreur de connexion au service IA');
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError('Streaming non supporté');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk' && data.content) {
                  onChunk(data.content);
                } else if (data.type === 'done') {
                  onDone();
                } else if (data.type === 'error') {
                  onError(data.error || 'Erreur IA');
                }
              } catch {
                // Ignorer les lignes mal formées
              }
            }
          }
        }

        onDone();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError('Erreur de connexion');
        }
      }
    })();

    return {
      abort: () => controller.abort(),
    };
  },

  // ==========================================
  // AI AUTOBOT (Statistiques et conversations)
  // ==========================================

  /**
   * Récupère les statistiques de l'AI AutoBot
   */
  async getAutoBotStats(): Promise<{
    ticketsHandled: number;
    ticketsResolved: number;
    avgResponseTime: string;
    satisfactionRate: number;
    currentlyActive: number;
  }> {
    return fetchWithAuth<{
      ticketsHandled: number;
      ticketsResolved: number;
      avgResponseTime: string;
      satisfactionRate: number;
      currentlyActive: number;
    }>('/ai/autobot/stats');
  },

  /**
   * Récupère les conversations IA récentes
   */
  async getAutoBotConversations(limit = 10): Promise<Array<{
    id: string;
    ticketId: string;
    ticketNumber: number;
    ticketTitle: string;
    status: 'resolved' | 'escalated' | 'active';
    messages: number;
    resolvedWithoutHuman: boolean;
    lastActivity: string;
  }>> {
    return fetchWithAuth<Array<{
      id: string;
      ticketId: string;
      ticketNumber: number;
      ticketTitle: string;
      status: 'resolved' | 'escalated' | 'active';
      messages: number;
      resolvedWithoutHuman: boolean;
      lastActivity: string;
    }>>(`/ai/autobot/conversations?limit=${limit}`);
  },

  /**
   * Chat conversationnel avec l'assistant IA global
   */
  async chatWithAI(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{
    message: string;
    context: {
      totalTickets: number;
      slaBreached: number;
      unassignedCount: number;
      urgentCount: number;
    };
  }> {
    // fetchWithAuth extracts .data automatically, so we get { message, context } directly
    const response = await fetchWithAuth<{
      message: string;
      context: {
        totalTickets: number;
        slaBreached: number;
        unassignedCount: number;
        urgentCount: number;
      };
    }>('/admin/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory }),
    });
    return response;
  },

  // ==========================================
  // AUTOMATION RULES
  // ==========================================

  /**
   * Get automation statistics
   */
  async getAutomationStats(): Promise<{
    totalRules: number;
    activeRules: number;
    todayExecutions: number;
    weekExecutions: number;
    autoAssignCount: number;
    notificationCount: number;
  }> {
    return fetchWithAuth('/admin/automation/stats');
  },

  /**
   * Get all automation rules
   */
  async getAutomationRules(includeInactive = true): Promise<AutomationRule[]> {
    const response = await fetchWithAuth<AutomationRule[]>(
      `/admin/automation/rules?includeInactive=${includeInactive}`
    );
    return response || [];
  },

  /**
   * Get a single automation rule
   */
  async getAutomationRule(id: string): Promise<AutomationRule> {
    return fetchWithAuth(`/admin/automation/rules/${id}`);
  },

  /**
   * Create a new automation rule
   */
  async createAutomationRule(data: {
    name: string;
    description?: string;
    trigger: string;
    conditions: Array<{ field: string; operator: string; value: unknown }>;
    actions: Array<{ type: string; params?: Record<string, unknown> }>;
    isActive?: boolean;
    priority?: number;
  }): Promise<AutomationRule> {
    return fetchWithAuth('/admin/automation/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an automation rule
   */
  async updateAutomationRule(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      trigger: string;
      conditions: Array<{ field: string; operator: string; value: unknown }>;
      actions: Array<{ type: string; params?: Record<string, unknown> }>;
      isActive: boolean;
      priority: number;
    }>
  ): Promise<AutomationRule> {
    return fetchWithAuth(`/admin/automation/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an automation rule
   */
  async deleteAutomationRule(id: string): Promise<void> {
    await fetchWithAuth(`/admin/automation/rules/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle automation rule active status
   */
  async toggleAutomationRule(id: string): Promise<AutomationRule> {
    return fetchWithAuth(`/admin/automation/rules/${id}/toggle`, {
      method: 'PUT',
    });
  },

  /**
   * Get automation execution history
   */
  async getAutomationHistory(options?: {
    ruleId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Array<{
      id: string;
      ruleId: string;
      ticketId: string | null;
      success: boolean;
      error: string | null;
      executedAt: string;
      rule: { id: string; name: string; trigger: string };
    }>;
    meta: { total: number; limit: number; offset: number };
  }> {
    const params = new URLSearchParams();
    if (options?.ruleId) params.set('ruleId', options.ruleId);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithAuth(`/admin/automation/history${query}`);
  },
};

export default AdminApi;
