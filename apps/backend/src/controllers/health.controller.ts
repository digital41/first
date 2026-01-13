import type { Request, Response } from 'express';
import { prisma } from '../config/database.js';

// ============================================
// CONTROLLER DE SANTÉ
// ============================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs?: number;
      error?: string;
    };
  };
}

/**
 * GET /api/health
 * Vérifie l'état de santé de l'API
 */
export async function check(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: {
        status: 'down',
      },
    },
  };

  // Test de connexion à la base de données
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'up',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * GET /api/health/ready
 * Vérifie si l'API est prête à recevoir du trafic
 */
export async function ready(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
}

/**
 * GET /api/health/live
 * Vérifie si l'API est vivante (liveness probe)
 */
export function live(_req: Request, res: Response): void {
  res.status(200).json({ alive: true });
}
