import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateTokenPair } from './auth.service.js';
import { SageService } from './sage.service.js';
import type { TokenPair, SafeUser } from '../types/index.js';
import type { OAuthProvider } from '@prisma/client';

// ============================================
// SERVICE OAUTH (Google, Microsoft, etc.)
// ============================================

interface GoogleTokenPayload {
  sub: string;        // Google User ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface OAuthLoginResult {
  user: SafeUser;
  tokens: TokenPair;
  isNewUser: boolean;
  needsCustomerCode: boolean;  // Deprecated - toujours false maintenant
  mustChangePassword: boolean; // True si l'utilisateur doit changer son mot de passe
}

/**
 * Vérifie un ID token Google et retourne les informations utilisateur
 * Utilise l'API Google directement pour vérifier le token
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

  if (!GOOGLE_CLIENT_ID) {
    throw AppError.internal('Configuration Google OAuth manquante');
  }

  try {
    // Utiliser l'endpoint Google pour vérifier le token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!response.ok) {
      throw new Error('Token invalide');
    }

    const payload = await response.json() as GoogleTokenPayload & { aud: string };

    // Vérifier que le token est pour notre application
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      throw new Error('Token non destiné à cette application');
    }

    return payload;
  } catch (error) {
    console.error('[OAuth] Google token verification failed:', error);
    throw AppError.unauthorized('Token Google invalide ou expiré');
  }
}

/**
 * Connexion/Inscription via Google OAuth
 * SECURITE: Seuls les emails enregistrés dans SAGE peuvent se connecter
 * - Si l'utilisateur existe avec un code client, connecte
 * - Si trouvé dans SAGE par email, lie automatiquement et connecte
 * - Sinon, REFUSE la connexion (email non autorisé)
 */
export async function loginWithGoogle(idToken: string): Promise<OAuthLoginResult> {
  // 1. Vérifier le token Google
  const googleUser = await verifyGoogleToken(idToken);

  if (!googleUser.email_verified) {
    throw AppError.badRequest('L\'email Google n\'est pas vérifié');
  }

  const provider: OAuthProvider = 'GOOGLE';
  let isNewUser = false;
  const needsCustomerCode = false; // Toujours false car on refuse les comptes sans code

  // 2. Chercher si un compte social existe déjà
  const socialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: googleUser.sub,
      },
    },
    include: { user: true },
  });

  let user;

  if (socialAccount) {
    // Compte social existant
    user = socialAccount.user;

    // SECURITE: Vérifier que l'utilisateur a un code client
    if (!user.customerCode) {
      console.log(`[OAuth] REFUS: Compte existant sans code client SAGE: ${googleUser.email}`);
      throw AppError.forbidden(
        'Votre compte n\'est pas associé à un compte client. ' +
        'Seuls les clients enregistrés dans notre système peuvent accéder à l\'application. ' +
        'Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.'
      );
    }

    // Mettre à jour les infos du compte social
    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
    });
  } else {
    // Pas de compte social - chercher par email dans notre base
    user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Utilisateur existant avec cet email
      // SECURITE: Vérifier que l'utilisateur a un code client
      if (!user.customerCode) {
        console.log(`[OAuth] REFUS: Utilisateur existant sans code client SAGE: ${googleUser.email}`);
        throw AppError.forbidden(
          'Votre compte n\'est pas associé à un compte client. ' +
          'Seuls les clients enregistrés dans notre système peuvent accéder à l\'application. ' +
          'Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.'
        );
      }

      // Lier le compte Google
      await prisma.socialAccount.create({
        data: {
          provider,
          providerUserId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          userId: user.id,
        },
      });

      // Mettre à jour l'avatar si l'utilisateur n'en a pas
      if (!user.avatarUrl && googleUser.picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: googleUser.picture },
        });
      }
    } else {
      // Nouvel utilisateur - chercher dans SAGE par email
      const sageCustomers = await SageService.searchCustomerByEmail(googleUser.email);

      if (sageCustomers && sageCustomers.length > 0) {
        // Trouvé dans SAGE - créer l'utilisateur avec le code client
        const sageCustomer = sageCustomers[0];
        isNewUser = true;

        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            displayName: sageCustomer.companyName || googleUser.name || googleUser.email.split('@')[0],
            avatarUrl: googleUser.picture,
            role: 'CUSTOMER',
            customerCode: sageCustomer.customerCode,
            phone: sageCustomer.phone || null,
            socialAccounts: {
              create: {
                provider,
                providerUserId: googleUser.sub,
                email: googleUser.email,
                name: googleUser.name,
                avatarUrl: googleUser.picture,
              },
            },
          },
        });

        console.log(`[OAuth] Nouveau client lié automatiquement via email SAGE: ${sageCustomer.customerCode}`);
      } else {
        // SECURITE: Email non trouvé dans SAGE - REFUSER la connexion
        console.log(`[OAuth] REFUS: Email non trouvé dans SAGE: ${googleUser.email}`);
        throw AppError.forbidden(
          'Votre adresse email n\'est pas enregistrée dans notre système. ' +
          'Seuls les clients existants peuvent accéder à l\'application. ' +
          'Veuillez utiliser l\'adresse email associée à votre compte client ou contactez le support.'
        );
      }
    }
  }

  // 3. Mettre à jour la dernière connexion
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  // 4. Générer les tokens JWT
  const tokens = generateTokenPair(user);

  // 5. Retourner sans le hash du mot de passe
  const { passwordHash: _, ...safeUser } = user;

  return {
    user: safeUser,
    tokens,
    isNewUser,
    needsCustomerCode,
    mustChangePassword: user.mustChangePassword
  };
}

/**
 * Lie un compte utilisateur à un code client SAGE
 * Utilisé après une connexion Google pour rattacher au compte SAGE
 */
export async function linkToCustomerCode(
  userId: string,
  customerCode: string
): Promise<SafeUser> {
  const code = customerCode.toUpperCase().trim();

  // 1. Vérifier que le code client existe dans SAGE
  const sageCustomer = await SageService.getCustomer(code);

  if (!sageCustomer) {
    throw AppError.notFound('Code client non trouvé dans SAGE');
  }

  // 2. Vérifier que ce code n'est pas déjà utilisé par un autre utilisateur
  const existingUser = await prisma.user.findUnique({
    where: { customerCode: code },
  });

  if (existingUser && existingUser.id !== userId) {
    throw AppError.conflict(
      'Ce code client est déjà associé à un autre compte. ' +
      'Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.'
    );
  }

  // 3. Mettre à jour l'utilisateur avec le code client
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      customerCode: code,
      displayName: sageCustomer.companyName || undefined,
      phone: sageCustomer.phone || undefined,
    },
  });

  console.log(`[OAuth] Compte ${updatedUser.email} lié au code client SAGE: ${code}`);

  const { passwordHash: _, ...safeUser } = updatedUser;
  return safeUser;
}

/**
 * Lie un compte Google à un utilisateur existant
 */
export async function linkGoogleAccount(
  userId: string,
  idToken: string
): Promise<void> {
  const googleUser = await verifyGoogleToken(idToken);
  const provider: OAuthProvider = 'GOOGLE';

  // Vérifier que ce compte Google n'est pas déjà lié à un autre utilisateur
  const existingSocial = await prisma.socialAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider,
        providerUserId: googleUser.sub,
      },
    },
  });

  if (existingSocial && existingSocial.userId !== userId) {
    throw AppError.conflict('Ce compte Google est déjà lié à un autre utilisateur');
  }

  if (existingSocial) {
    // Déjà lié à cet utilisateur
    return;
  }

  // Créer le lien
  await prisma.socialAccount.create({
    data: {
      provider,
      providerUserId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      userId,
    },
  });

  // Mettre à jour l'avatar si l'utilisateur n'en a pas
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && !user.avatarUrl && googleUser.picture) {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: googleUser.picture },
    });
  }
}

/**
 * Délie un compte social d'un utilisateur
 */
export async function unlinkSocialAccount(
  userId: string,
  provider: OAuthProvider
): Promise<void> {
  // Vérifier que l'utilisateur a un autre moyen de se connecter
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      socialAccounts: true,
    },
  });

  if (!user) {
    throw AppError.notFound('Utilisateur non trouvé');
  }

  // S'assurer que l'utilisateur garde au moins un moyen de connexion
  const hasPassword = !!user.passwordHash;
  const hasCustomerCode = !!user.customerCode;
  const otherSocialAccounts = user.socialAccounts.filter(sa => sa.provider !== provider);

  if (!hasPassword && !hasCustomerCode && otherSocialAccounts.length === 0) {
    throw AppError.badRequest(
      'Impossible de délier ce compte : vous devez garder au moins un moyen de connexion'
    );
  }

  // Supprimer le lien
  await prisma.socialAccount.deleteMany({
    where: {
      userId,
      provider,
    },
  });
}

/**
 * Récupère les comptes sociaux liés à un utilisateur
 */
export async function getLinkedSocialAccounts(userId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
    select: {
      provider: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return accounts;
}
