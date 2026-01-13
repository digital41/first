import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

// ============================================
// SINGLETON PRISMA CLIENT
// ============================================

// Évite les multiples instances en développement (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}

// ============================================
// CONNEXION ET DÉCONNEXION
// ============================================

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée');
  } catch (error) {
    console.error('❌ Erreur connexion base de données:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Base de données déconnectée');
}
