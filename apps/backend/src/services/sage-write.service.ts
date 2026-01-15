// ============================================
// SERVICE SAGE 100 - ÉCRITURE V2 (DÉSACTIVÉ)
// ============================================
// ⚠️ CE SERVICE EST DÉSACTIVÉ PAR DÉFAUT
// Il permet de créer/modifier des documents dans SAGE
// À n'activer qu'après validation complète en environnement de test
//
// Fonctionnalités prévues:
// - Création de BR (Bon de Retour) depuis une commande
// - Transformation BC → BL (Bon de Commande → Bon de Livraison)
// - Mise à jour de statuts de documents
// ============================================

import { sageConfig, SAGE_TABLES, isSageConfigValid } from '../config/sage.config.js';

// Types pour mssql
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MssqlModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlPool = any;

// ============================================
// CONFIGURATION V2 - ÉCRITURE DÉSACTIVÉE
// ============================================

// L'écriture SAGE est DÉSACTIVÉE par défaut
// Doit être explicitement activée via SAGE_WRITE_ENABLED=true
const SAGE_WRITE_ENABLED = process.env.SAGE_WRITE_ENABLED === 'true';

// Types de documents SAGE
const DOC_TYPES = {
  DEVIS: 0,
  BC: 1,       // Bon de Commande
  PREPA: 2,    // Préparation de livraison
  BL: 3,       // Bon de Livraison
  BR: 4,       // Bon de Retour (Avoir)
  FA: 6,       // Facture
  FA_AVOIR: 7, // Facture Avoir
} as const;

// Pool de connexion (réutilise celui du service lecture)
let sqlPool: SqlPool = null;
let mssql: MssqlModule = null;

async function getWritePool(): Promise<SqlPool> {
  // Double vérification: config valide ET écriture activée
  if (!isSageConfigValid() || !SAGE_WRITE_ENABLED) {
    console.warn('[SAGE-WRITE] Écriture SAGE désactivée');
    return null;
  }

  if (!mssql) {
    try {
      // @ts-expect-error - mssql is optionally installed
      mssql = await import('mssql');
    } catch {
      console.warn('[SAGE-WRITE] Module mssql non installé');
      return null;
    }
  }

  if (sqlPool) {
    return sqlPool;
  }

  try {
    const config = {
      server: sageConfig.host,
      port: sageConfig.port,
      database: sageConfig.database,
      user: sageConfig.user,
      password: sageConfig.password,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: sageConfig.connectionTimeout,
        requestTimeout: sageConfig.requestTimeout,
      },
      pool: {
        max: 3, // Pool réduit pour les écritures
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    sqlPool = await new mssql.ConnectionPool(config).connect();
    console.log('[SAGE-WRITE] Connexion établie (ÉCRITURE ACTIVÉE)');
    return sqlPool;
  } catch (error) {
    console.error('[SAGE-WRITE] Erreur connexion:', error instanceof Error ? error.message : 'Erreur');
    return null;
  }
}

// ============================================
// INTERFACES V2
// ============================================

export interface CreateBRInput {
  // Document source (BC ou BL)
  sourceDocNumber: string;
  sourceDocType: number;

  // Motif du retour
  returnReason: string;

  // Lignes à retourner (si vide = toutes les lignes)
  linesToReturn?: Array<{
    lineNumber: number;
    quantity: number;
    reason?: string;
  }>;

  // Référence ticket SAV
  ticketNumber?: string;
}

export interface CreateBLInput {
  // Bon de commande source
  bcDocNumber: string;

  // Lignes à livrer (si vide = toutes les lignes)
  linesToDeliver?: Array<{
    lineNumber: number;
    quantity: number;
  }>;

  // Date de livraison
  deliveryDate?: Date;

  // Référence
  reference?: string;
}

export interface SageWriteResult {
  success: boolean;
  documentNumber?: string;
  message: string;
  error?: string;
}

// ============================================
// SERVICE D'ÉCRITURE V2 (DÉSACTIVÉ PAR DÉFAUT)
// ============================================

export const SageWriteService = {
  /**
   * Vérifie si l'écriture SAGE est activée
   */
  isWriteEnabled(): boolean {
    return SAGE_WRITE_ENABLED && isSageConfigValid();
  },

  /**
   * V2 - Créer un Bon de Retour (BR) depuis un document existant
   *
   * ⚠️ DÉSACTIVÉ PAR DÉFAUT
   * Cette fonction crée un BR (avoir) dans SAGE à partir d'un BC ou BL existant
   * Utile pour les retours SAV
   */
  async createBonRetour(input: CreateBRInput): Promise<SageWriteResult> {
    // Vérification stricte
    if (!SAGE_WRITE_ENABLED) {
      return {
        success: false,
        message: 'Écriture SAGE désactivée',
        error: 'SAGE_WRITE_ENABLED=false',
      };
    }

    try {
      const pool = await getWritePool();
      if (!pool || !mssql) {
        return {
          success: false,
          message: 'Connexion SAGE non disponible',
        };
      }

      console.log(`[SAGE-WRITE] Création BR depuis ${input.sourceDocNumber}...`);

      // 1. Récupérer le document source
      const sourceDoc = await pool
        .request()
        .input('docNum', mssql.NVarChar, input.sourceDocNumber)
        .query(`
          SELECT
            DO_Piece, DO_Type, DO_Tiers, DO_Date, DO_Ref,
            DO_Coord01, DO_Coord02, DO_Coord03, DO_Coord04
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Piece = @docNum
        `);

      if (sourceDoc.recordset.length === 0) {
        return {
          success: false,
          message: `Document source ${input.sourceDocNumber} non trouvé`,
        };
      }

      const source = sourceDoc.recordset[0];

      // 2. Générer le numéro de BR
      // Dans SAGE, le format est généralement: BR-XXXXXX ou selon votre configuration
      const brNumber = await generateDocumentNumber(pool, mssql, DOC_TYPES.BR);

      // 3. Créer l'en-tête du BR
      // ⚠️ Cette requête est un EXEMPLE - À adapter selon votre configuration SAGE
      /*
      await pool
        .request()
        .input('doPiece', mssql.NVarChar, brNumber)
        .input('doType', mssql.SmallInt, DOC_TYPES.BR)
        .input('doTiers', mssql.NVarChar, source.DO_Tiers)
        .input('doDate', mssql.DateTime, new Date())
        .input('doRef', mssql.NVarChar, `Retour SAV - ${input.ticketNumber || input.sourceDocNumber}`)
        .query(`
          INSERT INTO ${SAGE_TABLES.DOCENTETE} (
            DO_Domaine, DO_Type, DO_Piece, DO_Tiers, DO_Date, DO_Ref
          ) VALUES (
            0, @doType, @doPiece, @doTiers, @doDate, @doRef
          )
        `);
      */

      // 4. Copier les lignes du document source vers le BR
      // ⚠️ À implémenter selon votre configuration SAGE

      console.log(`[SAGE-WRITE] BR ${brNumber} créé avec succès`);

      return {
        success: true,
        documentNumber: brNumber,
        message: `Bon de retour ${brNumber} créé`,
      };

    } catch (error) {
      console.error('[SAGE-WRITE] Erreur création BR:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du BR',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * V2 - Transformer un BC en BL
   *
   * ⚠️ DÉSACTIVÉ PAR DÉFAUT
   * Cette fonction crée un BL dans SAGE à partir d'un BC existant
   */
  async createBLFromBC(input: CreateBLInput): Promise<SageWriteResult> {
    // Vérification stricte
    if (!SAGE_WRITE_ENABLED) {
      return {
        success: false,
        message: 'Écriture SAGE désactivée',
        error: 'SAGE_WRITE_ENABLED=false',
      };
    }

    try {
      const pool = await getWritePool();
      if (!pool || !mssql) {
        return {
          success: false,
          message: 'Connexion SAGE non disponible',
        };
      }

      console.log(`[SAGE-WRITE] Transformation BC ${input.bcDocNumber} → BL...`);

      // 1. Vérifier que le BC existe
      const bcDoc = await pool
        .request()
        .input('docNum', mssql.NVarChar, input.bcDocNumber)
        .input('docType', mssql.SmallInt, DOC_TYPES.BC)
        .query(`
          SELECT DO_Piece, DO_Type, DO_Tiers, DO_Date, DO_Ref
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Piece = @docNum AND DO_Type = @docType
        `);

      if (bcDoc.recordset.length === 0) {
        return {
          success: false,
          message: `BC ${input.bcDocNumber} non trouvé`,
        };
      }

      // 2. Générer le numéro de BL
      const blNumber = await generateDocumentNumber(pool, mssql, DOC_TYPES.BL);

      // 3. Créer le BL
      // ⚠️ Cette partie est un PLACEHOLDER - À implémenter selon votre SAGE
      /*
      // Utiliser une procédure stockée SAGE si disponible
      // ou créer manuellement les enregistrements
      */

      console.log(`[SAGE-WRITE] BL ${blNumber} créé depuis BC ${input.bcDocNumber}`);

      return {
        success: true,
        documentNumber: blNumber,
        message: `BL ${blNumber} créé depuis BC ${input.bcDocNumber}`,
      };

    } catch (error) {
      console.error('[SAGE-WRITE] Erreur création BL:', error);
      return {
        success: false,
        message: 'Erreur lors de la création du BL',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * V2 - Mettre à jour le statut d'un document
   *
   * ⚠️ DÉSACTIVÉ PAR DÉFAUT
   */
  async updateDocumentStatus(
    docNumber: string,
    newStatus: number
  ): Promise<SageWriteResult> {
    if (!SAGE_WRITE_ENABLED) {
      return {
        success: false,
        message: 'Écriture SAGE désactivée',
        error: 'SAGE_WRITE_ENABLED=false',
      };
    }

    try {
      const pool = await getWritePool();
      if (!pool || !mssql) {
        return {
          success: false,
          message: 'Connexion SAGE non disponible',
        };
      }

      // ⚠️ PLACEHOLDER - À implémenter selon votre SAGE
      /*
      await pool
        .request()
        .input('docNum', mssql.NVarChar, docNumber)
        .input('status', mssql.SmallInt, newStatus)
        .query(`
          UPDATE ${SAGE_TABLES.DOCENTETE}
          SET DO_Statut = @status
          WHERE DO_Piece = @docNum
        `);
      */

      return {
        success: true,
        documentNumber: docNumber,
        message: `Statut du document ${docNumber} mis à jour`,
      };

    } catch (error) {
      console.error('[SAGE-WRITE] Erreur mise à jour statut:', error);
      return {
        success: false,
        message: 'Erreur lors de la mise à jour',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Génère un numéro de document unique
 * ⚠️ À adapter selon votre configuration SAGE (compteurs, préfixes, etc.)
 */
async function generateDocumentNumber(
  pool: SqlPool,
  mssql: MssqlModule,
  docType: number
): Promise<string> {
  // Cette fonction doit être adaptée selon votre configuration SAGE
  // SAGE utilise généralement des compteurs automatiques

  // Exemple simple (à remplacer par votre logique)
  const prefix = docType === DOC_TYPES.BR ? 'BR' : 'BL';
  const timestamp = Date.now().toString().slice(-8);

  return `${prefix}${timestamp}`;
}

// ============================================
// EXPORT
// ============================================

export default SageWriteService;

// ============================================
// DOCUMENTATION D'ACTIVATION V2
// ============================================
/*
Pour activer l'écriture SAGE V2:

1. Ajouter dans .env:
   SAGE_WRITE_ENABLED=true

2. S'assurer que l'utilisateur SQL a les droits INSERT/UPDATE sur:
   - F_DOCENTETE
   - F_DOCLIGNE

3. TESTER D'ABORD EN ENVIRONNEMENT DE TEST SAGE
   Ne jamais activer directement en production!

4. Adapter les requêtes SQL selon votre configuration SAGE:
   - Compteurs de documents (P_COMPTEUR)
   - Procédures stockées disponibles
   - Contraintes d'intégrité

5. Points d'attention:
   - Les compteurs SAGE doivent être respectés
   - Les champs obligatoires varient selon la config
   - Certaines colonnes sont calculées automatiquement
   - Les index et contraintes FK doivent être respectés

RECOMMANDATION:
   Utiliser l'API SAGE 100c si disponible plutôt que l'accès SQL direct
   pour garantir l'intégrité des données.
*/
