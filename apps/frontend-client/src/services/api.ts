import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  User,
  Ticket,
  Order,
  TicketMessage,
  Notification,
  PaginatedResponse,
  TicketFilters,
  TicketStats,
  AuthResponse,
  CreateTicketInput,
  SendMessageInput,
  Attachment
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Storage keys
const ACCESS_TOKEN_KEY = 'client_access_token';
const REFRESH_TOKEN_KEY = 'client_refresh_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Token management
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post<{
          success: boolean;
          data: { user: User; tokens: { accessToken: string; refreshToken: string } };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

// Backend response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Backend login response type
interface LoginResponseData {
  user: User;
  orders: Order[];
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  // Login with customer account code (SAGE 100)
  loginByCustomerCode: async (customerCode: string): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', { customerCode });

    const { user, tokens } = response.data.data;
    setTokens(tokens.accessToken, tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } finally {
      clearTokens();
    }
  },

  // Check if authenticated
  isAuthenticated: (): boolean => {
    return !!getAccessToken();
  },
};

// ============================================
// TICKETS API (Client endpoints)
// ============================================

export const ticketsApi = {
  // Create ticket
  create: async (data: CreateTicketInput): Promise<Ticket> => {
    const response = await api.post<ApiResponse<Ticket>>('/client/tickets', data);
    return response.data.data;
  },

  // Get all user tickets
  getAll: async (filters?: TicketFilters): Promise<PaginatedResponse<Ticket>> => {
    const params = new URLSearchParams();
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach((s) => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.issueType) params.append('issueType', filters.issueType);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    // Backend returns { success, data: Ticket[], meta: {...} } directly
    const response = await api.get<{ success: boolean; data: Ticket[]; meta: PaginatedResponse<Ticket>['meta'] }>(`/client/tickets?${params}`);
    return {
      data: response.data.data || [],
      meta: response.data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 },
    };
  },

  // Get single ticket
  getById: async (id: string): Promise<Ticket> => {
    const response = await api.get<ApiResponse<Ticket>>(`/client/tickets/${id}`);
    return response.data.data;
  },

  // Get ticket stats
  getStats: async (): Promise<TicketStats> => {
    const response = await api.get<ApiResponse<TicketStats>>('/tickets/stats');
    return response.data.data;
  },

  // Reopen ticket
  reopen: async (id: string): Promise<Ticket> => {
    const response = await api.put<ApiResponse<Ticket>>(`/client/tickets/${id}`, {
      status: 'REOPENED',
    });
    return response.data.data;
  },
};

// ============================================
// MESSAGES API
// ============================================

export const messagesApi = {
  // Get messages for a ticket
  getByTicketId: async (ticketId: string): Promise<TicketMessage[]> => {
    const response = await api.get<ApiResponse<TicketMessage[]>>(`/client/tickets/${ticketId}/messages`);
    return response.data.data || [];
  },

  // Send message
  send: async (ticketId: string, data: SendMessageInput): Promise<TicketMessage> => {
    const response = await api.post<ApiResponse<TicketMessage>>(`/client/tickets/${ticketId}/messages`, data);
    return response.data.data;
  },

  // Mark message as read
  markAsRead: async (messageId: string): Promise<void> => {
    await api.put(`/messages/${messageId}/read`);
  },
};

// ============================================
// ORDERS API (Support SAGE 100)
// ============================================

interface OrdersResponse {
  success: boolean;
  data: Order[];
  source?: 'SAGE' | 'LOCAL';
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ordersApi = {
  // Lookup order (public)
  lookup: async (orderNumber: string, email: string): Promise<Order> => {
    const response = await api.post<ApiResponse<Order>>('/orders/lookup', {
      orderNumber,
      email,
    });
    return response.data.data;
  },

  // Get user orders (from SAGE for customers)
  getAll: async (page = 1, limit = 50): Promise<Order[]> => {
    const response = await api.get<OrdersResponse>(`/client/orders?page=${page}&limit=${limit}`);
    return response.data.data || [];
  },

  // Get order by ID or order number (supports SAGE)
  getById: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/client/orders/${id}`);
    return response.data.data;
  },

  // Get order by number
  getByNumber: async (orderNumber: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/number/${orderNumber}`);
    return response.data.data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsApi = {
  // Get notifications
  getAll: async (): Promise<Notification[]> => {
    try {
      const response = await api.get<ApiResponse<Notification[]>>('/client/notifications');
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<ApiResponse<{ count: number }>>('/client/notifications/unread-count');
      return response.data.data?.count || 0;
    } catch {
      return 0;
    }
  },

  // Mark as read
  markAsRead: async (ids: string[]): Promise<void> => {
    await api.put('/client/notifications/read', { notificationIds: ids });
  },

  // Mark all as read
  markAllAsRead: async (): Promise<void> => {
    await api.put('/client/notifications/read-all');
  },
};

// ============================================
// FILE UPLOAD API
// ============================================

export const uploadApi = {
  // Upload files
  upload: async (files: File[]): Promise<Attachment[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<ApiResponse<Attachment[]>>('/client/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Get file
  getFile: async (id: string): Promise<string> => {
    const response = await api.get<ApiResponse<{ url: string }>>(`/client/upload/${id}`);
    return response.data.data.url;
  },
};

// ============================================
// KNOWLEDGE BASE API
// ============================================

export const knowledgeApi = {
  // Get FAQ by category
  getFAQ: async (category?: string): Promise<Array<{ question: string; answer: string; category: string }>> => {
    // This would typically come from an API, but for now we'll return static data
    const faqData = [
      {
        category: 'general',
        question: 'Comment suivre ma commande ?',
        answer: 'Vous pouvez suivre votre commande en vous connectant à votre espace client avec votre numéro de commande et votre email. Vous y trouverez le statut de livraison en temps réel.',
      },
      {
        category: 'general',
        question: 'Comment contacter le service client ?',
        answer: 'Vous pouvez nous contacter via le formulaire de création de ticket, par email à support@kly.com, ou par téléphone au 01 23 45 67 89.',
      },
      {
        category: 'technical',
        question: 'Mon équipement ne fonctionne plus, que faire ?',
        answer: 'Vérifiez d\'abord les branchements et consultez le guide de dépannage rapide. Si le problème persiste, créez un ticket en décrivant le problème rencontré.',
      },
      {
        category: 'technical',
        question: 'Comment effectuer une maintenance préventive ?',
        answer: 'Consultez notre guide de maintenance dans la section documentation. Nous recommandons une vérification mensuelle des composants principaux.',
      },
      {
        category: 'delivery',
        question: 'Quels sont les délais de livraison ?',
        answer: 'Les délais de livraison standard sont de 3 à 5 jours ouvrés. Pour les commandes urgentes, nous proposons une livraison express sous 24h.',
      },
      {
        category: 'delivery',
        question: 'Ma livraison est en retard, que faire ?',
        answer: 'Vérifiez le statut de votre commande dans votre espace client. Si la date de livraison estimée est dépassée, créez un ticket avec le type "Livraison".',
      },
      {
        category: 'billing',
        question: 'Comment obtenir une facture ?',
        answer: 'Vos factures sont disponibles dans la section "Mes commandes" de votre espace client. Vous pouvez les télécharger au format PDF.',
      },
      {
        category: 'billing',
        question: 'Comment demander un avoir ?',
        answer: 'Pour demander un avoir, créez un ticket avec le type "Facturation" en précisant le numéro de facture concerné et le motif de votre demande.',
      },
    ];

    if (category) {
      return faqData.filter((item) => item.category === category);
    }
    return faqData;
  },

  // Search knowledge base
  search: async (query: string): Promise<Array<{ title: string; content: string; category: string }>> => {
    // Simulate search - would typically be an API call
    const articles = [
      {
        title: 'Guide de démarrage rapide',
        content: 'Apprenez à configurer et utiliser votre équipement industriel en quelques étapes simples.',
        category: 'guides',
      },
      {
        title: 'Procédure de maintenance préventive',
        content: 'Suivez cette procédure mensuelle pour garantir le bon fonctionnement de vos équipements.',
        category: 'maintenance',
      },
      {
        title: 'Résolution des erreurs courantes',
        content: 'Liste des codes d\'erreur les plus fréquents et leurs solutions.',
        category: 'troubleshooting',
      },
    ];

    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.content.toLowerCase().includes(query.toLowerCase())
    );
  },
};

export default api;
