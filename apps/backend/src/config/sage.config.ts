// ============================================
// CONFIGURATION SAGE 100 - LECTURE SEULE
// ============================================
// Connecteur sécurisé pour récupérer les données SAGE
// 100% lecture seule - aucune modification de données SAGE

export interface SageConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  // Timeouts de sécurité
  connectionTimeout: number;
  requestTimeout: number;
  // Options de résilience
  maxRetries: number;
  retryDelay: number;
  // Cache
  cacheEnabled: boolean;
  cacheTTLMinutes: number;
}

// Configuration par défaut (désactivé)
export const sageConfig: SageConfig = {
  // SAGE est DÉSACTIVÉ par défaut - doit être explicitement activé
  enabled: process.env.SAGE_ENABLED === 'true',

  // Connexion SQL Server
  host: process.env.SAGE_HOST || 'localhost',
  port: parseInt(process.env.SAGE_PORT || '1433', 10),
  database: process.env.SAGE_DATABASE || '',
  user: process.env.SAGE_USER || '',
  password: process.env.SAGE_PASSWORD || '',

  // Timeouts courts pour éviter de bloquer l'application
  connectionTimeout: parseInt(process.env.SAGE_CONNECTION_TIMEOUT || '5000', 10), // 5 secondes max
  requestTimeout: parseInt(process.env.SAGE_REQUEST_TIMEOUT || '10000', 10), // 10 secondes max

  // Résilience
  maxRetries: parseInt(process.env.SAGE_MAX_RETRIES || '2', 10),
  retryDelay: parseInt(process.env.SAGE_RETRY_DELAY || '1000', 10), // 1 seconde

  // Cache local pour réduire les requêtes SAGE
  cacheEnabled: process.env.SAGE_CACHE_ENABLED !== 'false', // Activé par défaut
  cacheTTLMinutes: parseInt(process.env.SAGE_CACHE_TTL || '30', 10), // 30 minutes par défaut
};

// Tables SAGE 100 (lecture seule)
export const SAGE_TABLES = {
  // Clients/Comptes
  COMPTET: 'F_COMPTET',

  // Documents de vente
  DOCENTETE: 'F_DOCENTETE',    // En-têtes (BC, BL, FA)
  DOCLIGNE: 'F_DOCLIGNE',      // Lignes de documents

  // Articles
  ARTICLE: 'F_ARTICLE',

  // Types de documents
  DOC_TYPES: {
    BC: 1,   // Bon de commande (devis - exclu de "mes commandes")
    BP: 2,   // Bon de préparation (PL)
    BL: 3,   // Bon de livraison
    FA: 6,   // Facture
  },
} as const;

// Vérification de la configuration
export function isSageConfigValid(): boolean {
  if (!sageConfig.enabled) return false;
  if (!sageConfig.host || !sageConfig.database) return false;
  if (!sageConfig.user || !sageConfig.password) return false;
  return true;
}

export function getSageConnectionString(): string {
  return `Server=${sageConfig.host},${sageConfig.port};Database=${sageConfig.database};User Id=${sageConfig.user};Password=${sageConfig.password};Encrypt=false;TrustServerCertificate=true`;
}
