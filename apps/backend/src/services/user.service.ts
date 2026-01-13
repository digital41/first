import { prisma } from '../config/database.js';
import { hashPassword } from './auth.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { UserRole, Prisma } from '@prisma/client';

// ============================================
// SERVICE UTILISATEURS
// ============================================

export interface UserFilters {
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserDto {
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  phone?: string;
}

export interface UpdateUserDto {
  email?: string;
  displayName?: string;
  role?: UserRole;
  phone?: string;
  password?: string;
}

/**
 * Liste les utilisateurs avec filtres et pagination
 */
export async function listUsers(filters: UserFilters = {}) {
  const { role, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        displayName: true,
        role: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Récupère un utilisateur par ID
 */
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      displayName: true,
      role: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          tickets: true,
          assignedTickets: true,
          messages: true,
        },
      },
    },
  });

  if (!user) {
    throw AppError.notFound('Utilisateur non trouvé');
  }

  return user;
}

/**
 * Crée un nouvel utilisateur (staff)
 */
export async function createUser(data: CreateUserDto) {
  // Vérification email unique
  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw AppError.conflict('Cet email est déjà utilisé');
    }
  }

  // Hash du mot de passe si fourni
  let passwordHash: string | undefined;
  if (data.password) {
    passwordHash = await hashPassword(data.password);
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      phone: data.phone,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Met à jour un utilisateur
 */
export async function updateUser(id: string, data: UpdateUserDto) {
  // Vérification existence
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Utilisateur non trouvé');
  }

  // Vérification email unique si changement
  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) {
      throw AppError.conflict('Cet email est déjà utilisé');
    }
  }

  // Préparation des données
  const updateData: Prisma.UserUpdateInput = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      phone: true,
      displayName: true,
      role: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Supprime un utilisateur
 */
export async function deleteUser(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw AppError.notFound('Utilisateur non trouvé');
  }

  // Vérification qu'il n'y a pas de tickets assignés
  const assignedTickets = await prisma.ticket.count({
    where: {
      assignedToId: id,
      status: { notIn: ['CLOSED', 'RESOLVED'] },
    },
  });

  if (assignedTickets > 0) {
    throw AppError.badRequest(
      `Impossible de supprimer: ${assignedTickets} ticket(s) sont encore assignés à cet utilisateur`
    );
  }

  await prisma.user.delete({ where: { id } });
}

/**
 * Liste les agents disponibles (pour assignation)
 */
export async function getAvailableAgents() {
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ['AGENT', 'SUPERVISOR', 'ADMIN'] },
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      lastSeenAt: true,
      _count: {
        select: {
          assignedTickets: {
            where: {
              status: { notIn: ['CLOSED', 'RESOLVED'] },
            },
          },
        },
      },
    },
    orderBy: { displayName: 'asc' },
  });

  return agents.map((agent) => ({
    ...agent,
    activeTicketsCount: agent._count.assignedTickets,
    _count: undefined,
  }));
}

/**
 * Statistiques d'un agent
 */
export async function getAgentStats(agentId: string) {
  const [
    totalAssigned,
    openTickets,
    resolvedToday,
    avgResolutionTime,
  ] = await Promise.all([
    prisma.ticket.count({
      where: { assignedToId: agentId },
    }),
    prisma.ticket.count({
      where: {
        assignedToId: agentId,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
    }),
    prisma.ticket.count({
      where: {
        assignedToId: agentId,
        status: { in: ['CLOSED', 'RESOLVED'] },
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.ticket.aggregate({
      where: {
        assignedToId: agentId,
        status: { in: ['CLOSED', 'RESOLVED'] },
      },
      _avg: {
        satisfactionScore: true,
      },
    }),
  ]);

  return {
    totalAssigned,
    openTickets,
    resolvedToday,
    avgSatisfaction: avgResolutionTime._avg.satisfactionScore || null,
  };
}
