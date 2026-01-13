import type { Request } from 'express';
import type { User, UserRole } from '@prisma/client';

// ============================================
// TYPES JWT
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// REQUEST AUGMENTÉ
// ============================================

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// ============================================
// RÉPONSES API
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface LoginByReferenceDto {
  orderNumber?: string;
  plNumber?: string;
  blNumber?: string;
}

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface CreateTicketDto {
  orderId?: string;
  title: string;
  description?: string;
  issueType: 'TECHNICAL' | 'DELIVERY' | 'BILLING' | 'OTHER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags?: string[];
}

export interface UpdateTicketDto {
  status?: string;
  priority?: string;
  assignedToId?: string | null;
  title?: string;
  description?: string;
  tags?: string[];
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// SAFE USER (sans données sensibles)
// ============================================

export type SafeUser = Omit<User, 'passwordHash'>;
