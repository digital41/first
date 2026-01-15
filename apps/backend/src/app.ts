import express, { type Express } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';
import { initializeSocket } from './websocket/index.js';
import { startSlaCronJobs, stopSlaCronJobs } from './services/sla.service.js';
import { startSageSyncJob, stopSageSyncJob } from './services/sage-sync.service.js';
import { verifyEmailConfig } from './services/email.service.js';
import { UPLOAD_DIR } from './config/multer.js';

// ============================================
// APPLICATION EXPRESS + HTTP SERVER
// ============================================

const app: Express = express();
const httpServer = createServer(app);

// Initialiser Socket.io
const io = initializeSocket(httpServer);

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Sécurité HTTP headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting global
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      success: false,
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Parsing JSON et URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers uploadés avec headers CORS appropriés
const uploadsPath = path.resolve(UPLOAD_DIR);
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsPath));

// Logging des requêtes en développement
if (config.isDevelopment) {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

app.use(config.server.apiPrefix, routes);

// ============================================
// GESTION DES ERREURS
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function bootstrap(): Promise<void> {
  try {
    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.resolve(UPLOAD_DIR);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 Dossier uploads créé: ${uploadsDir}`);
    }

    // Connexion à la base de données
    await connectDatabase();

    // Vérification configuration email
    await verifyEmailConfig();

    // Démarrage des jobs cron SLA
    startSlaCronJobs();

    // Démarrage de la synchronisation SAGE (toutes les 5 minutes)
    startSageSyncJob();

    // Démarrage du serveur HTTP + WebSocket
    httpServer.listen(config.server.port, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║         KLY SAV Backend API                ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║  🚀 HTTP:    http://localhost:${config.server.port}         ║`);
      console.log(`║  🔌 WS:      ws://localhost:${config.server.port}           ║`);
      console.log(`║  📚 API:     http://localhost:${config.server.port}/api     ║`);
      console.log(`║  🏥 Health:  http://localhost:${config.server.port}/api/health ║`);
      console.log(`║  🌍 Env:     ${config.env.padEnd(27)}║`);
      console.log('╚════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

// ============================================
// GESTION DES SIGNAUX DE TERMINAISON
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n📴 Signal ${signal} reçu. Arrêt en cours...`);

  // Arrêt des jobs cron
  stopSlaCronJobs();
  stopSageSyncJob();

  // Déconnexion base de données
  await disconnectDatabase();

  console.log('👋 Serveur arrêté proprement');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Lancement
bootstrap();

export default app;
