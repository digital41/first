import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { JwtPayload, TokenPair, SafeUser } from '../types/index.js';
import type { User } from '@prisma/client';

// ============================================
// SERVICE D'AUTHENTIFICATION
// ============================================

const SALT_ROUNDS = 12;

/**
 * Génère une paire de tokens (access + refresh)
 */
export function generateTokenPair(user: Pick<User, 'id' | 'email' | 'role'>): TokenPair {
  const accessPayload: JwtPayload = {
    userId: user.id,
    email: user.email || '',
    role: user.role,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    userId: user.id,
    email: user.email || '',
    role: user.role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

/**
 * Connexion client par numéro de commande
 */
export async function loginByReference(
  orderNumber?: string
): Promise<{ user: SafeUser; order: unknown; tokens: TokenPair }> {
  if (!orderNumber) {
    throw AppError.badRequest('Numéro de commande requis');
  }

  // Recherche de la commande
  const order = await prisma.order.findUnique({
    where: { orderNumber },
  });

  if (!order) {
    throw AppError.notFound('Aucune commande trouvée avec ce numéro');
  }

  // Recherche ou création du client
  let user = order.customerEmail
    ? await prisma.user.findFirst({
        where: { email: order.customerEmail },
      })
    : null;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: order.customerEmail || `order-${order.id}@temp.klygroupe.com`,
        displayName: order.customerEmail?.split('@')[0] || `Client ${order.orderNumber}`,
        role: 'CUSTOMER',
      },
    });
  }

  // Mise à jour dernière visite
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  // Génération des tokens
  const tokens = generateTokenPair(user);

  // Retourne sans le hash du mot de passe
  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, order, tokens };
}

/**
 * Connexion admin/agent par email + mot de passe
 */
export async function loginAdmin(
  email: string,
  password: string
): Promise<{ user: SafeUser; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Identifiants incorrects');
  }

  if (!['ADMIN', 'AGENT', 'SUPERVISOR'].includes(user.role)) {
    throw AppError.forbidden("Ce compte n'a pas accès à l'administration");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw AppError.unauthorized('Identifiants incorrects');
  }

  // Mise à jour dernière visite
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  const tokens = generateTokenPair(user);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

/**
 * Rafraîchit les tokens (stateless - vérifie juste la validité)
 */
export async function refreshTokens(
  oldRefreshToken: string
): Promise<{ user: SafeUser; tokens: TokenPair }> {
  // Vérifie le token
  let payload: JwtPayload;
  try {
    payload = jwt.verify(oldRefreshToken, config.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw AppError.unauthorized('Refresh token invalide ou expiré');
  }

  if (payload.type !== 'refresh') {
    throw AppError.unauthorized('Type de token invalide');
  }

  // Récupère l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw AppError.unauthorized('Utilisateur non trouvé');
  }

  // Génère de nouveaux tokens
  const tokens = generateTokenPair(user);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

/**
 * Déconnexion (stateless - côté client uniquement)
 */
export async function logout(_refreshToken: string): Promise<void> {
  // Avec des JWT stateless, la déconnexion est gérée côté client
  // en supprimant les tokens du stockage local
}

/**
 * Crée un utilisateur admin/agent
 */
export async function createStaffUser(
  email: string,
  password: string,
  role: 'ADMIN' | 'AGENT' | 'SUPERVISOR',
  displayName: string
): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict('Cet email est déjà utilisé');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      displayName,
    },
  });

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Vérifie un mot de passe
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Hash un mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
