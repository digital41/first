// ============================================
// SERVICE SAGE 100 - LECTURE SEULE SÉCURISÉE
// ============================================
// Ce service ne fait que LIRE les données SAGE
// Il ne modifie JAMAIS rien dans SAGE
// Si SAGE est indisponible, retourne null (pas d'erreur)
//
// ⚠️ PROTECTION SAGE:
// - Toutes les requêtes utilisent WITH (NOLOCK) pour ne pas bloquer SAGE
// - Timeouts courts (5s connexion, 10s requête)
// - Pool de connexions limité (max 5)
// - Cache local pour réduire les requêtes

import { sageConfig, SAGE_TABLES, isSageConfigValid } from '../config/sage.config.js';

// Types pour mssql (optionnel - le module peut ne pas être installé)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MssqlModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlPool = any;

// Types pour les données SAGE
export interface SageCustomer {
  customerCode: string;        // CT_Num
  companyName: string;         // CT_Intitule
  contactName?: string;        // CT_Contact
  email?: string;              // CT_EMail
  phone?: string;              // CT_Telephone
  fax?: string;                // CT_Telecopie
  address?: string;            // CT_Adresse
  addressComplement?: string;  // CT_Complement
  postalCode?: string;         // CT_CodePostal
  city?: string;               // CT_Ville
  country?: string;            // CT_Pays
  siret?: string;              // CT_Siret
  tvaIntra?: string;           // CT_Identifiant (N° TVA intracommunautaire)
  paymentCondition?: string;   // CT_Condition (Conditions de règlement)
}

export interface SageOrder {
  documentNumber: string;      // DO_Piece
  documentType: number;        // DO_Type (1=BC, 3=BL, 6=FA)
  documentTypeLabel: string;   // BC, BL ou FA
  customerCode: string;        // DO_Tiers
  orderDate: Date;             // DO_Date
  deliveryDate?: Date;         // DO_DateLivr
  reference?: string;          // DO_Ref
  totalHT: number;             // DO_TotalHT
  totalTTC: number;            // DO_TotalTTC
  status: string;              // Dérivé
  lines?: SageOrderLine[];
  // Champs supplémentaires pour facturation
  expeditionMode?: string;     // DO_Expedit (mode d'expédition)
  paymentCondition?: string;   // DO_Condition (conditions de paiement)
  devise?: number;             // DO_Devise (devise)
  taxRate1?: number;           // DO_Taxe1 (taux TVA 1)
  taxRate2?: number;           // DO_Taxe2 (taux TVA 2)
  taxRate3?: number;           // DO_Taxe3 (taux TVA 3)
  // Adresse de livraison
  deliveryName?: string;       // DO_Nom (nom livraison)
  deliveryAddress?: string;    // DO_Adresse (adresse livraison)
  deliveryComplement?: string; // DO_Complement
  deliveryPostalCode?: string; // DO_CodePostal
  deliveryCity?: string;       // DO_Ville
  deliveryCountry?: string;    // DO_Pays
}

export interface SageOrderLine {
  lineNumber: number;          // DL_Ligne
  productCode: string;         // AR_Ref
  productName: string;         // DL_Design
  quantity: number;            // DL_Qte
  unitPrice: number;           // DL_PrixUnitaire
  totalHT: number;             // DL_MontantHT
}

export interface SageArticle {
  reference: string;           // AR_Ref (clé primaire)
  designation: string;         // AR_Design (nom de l'article)
  family: string;              // FA_CodeFamille (famille d'articles)
  priceHT: number;             // AR_PrixVen (prix de vente HT)
  priceTTC?: number;           // Prix TTC calculé
  stockQuantity?: number;      // AS_QteSto (stock disponible)
  barcode?: string;            // AR_CodeBarre
  weight?: number;             // AR_PoidsNet
  brand?: string;              // Marque (si disponible)
  isActive: boolean;           // AR_Sommeil (0 = actif)
}

// Cache simple en mémoire
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  if (!sageConfig.cacheEnabled) return;
  const ttl = sageConfig.cacheTTLMinutes * 60 * 1000;
  cache.set(key, { data, expires: Date.now() + ttl });
}

// Pool de connexion SQL Server (lazy init)
let sqlPool: SqlPool = null;
let mssql: MssqlModule = null;

async function getSqlPool(): Promise<SqlPool> {
  if (!isSageConfigValid()) {
    return null;
  }

  // Import dynamique de mssql (ne plante pas si non installé)
  if (!mssql) {
    try {
      // @ts-expect-error - mssql is optionally installed
      const mssqlModule = await import('mssql');
      // En ES modules, le module peut être dans .default
      mssql = mssqlModule.default || mssqlModule;
    } catch {
      console.warn('[SAGE] Module mssql non installé. SAGE désactivé.');
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
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    sqlPool = await new mssql.ConnectionPool(config).connect();
    console.log('[SAGE] Connexion établie avec succès');
    return sqlPool;
  } catch (error) {
    console.error('[SAGE] Erreur de connexion:', error instanceof Error ? error.message : 'Erreur inconnue');
    return null;
  }
}

// ============================================
// SERVICE PRINCIPAL - LECTURE SEULE
// ============================================

export const SageService = {
  /**
   * Vérifie si SAGE est disponible
   */
  async isAvailable(): Promise<boolean> {
    if (!isSageConfigValid()) return false;
    try {
      const pool = await getSqlPool();
      return pool !== null;
    } catch {
      return false;
    }
  },

  /**
   * Récupère un client par son code
   * Retourne null si non trouvé ou erreur (jamais d'exception)
   */
  async getCustomer(customerCode: string): Promise<SageCustomer | null> {
    if (!customerCode) return null;

    // Check cache first
    const cacheKey = `customer:${customerCode}`;
    const cached = getCached<SageCustomer>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return null;

      const result = await pool
        .request()
        .input('code', mssql.NVarChar, customerCode)
        .query(`
          SELECT TOP 1
            CT_Num as customerCode,
            CT_Intitule as companyName,
            CT_Contact as contactName,
            CT_EMail as email,
            CT_Telephone as phone,
            CT_Telecopie as fax,
            CT_Adresse as address,
            CT_Complement as addressComplement,
            CT_CodePostal as postalCode,
            CT_Ville as city,
            CT_Pays as country,
            CT_Siret as siret,
            CT_Identifiant as tvaIntra
          FROM ${SAGE_TABLES.COMPTET} WITH (NOLOCK)
          WHERE CT_Num = @code
        `);

      if (result.recordset.length === 0) return null;

      const customer: SageCustomer = result.recordset[0];
      setCache(cacheKey, customer);
      return customer;
    } catch (error) {
      console.error('[SAGE] Erreur getCustomer:', error instanceof Error ? error.message : 'Erreur');
      return null;
    }
  },

  /**
   * Récupère les commandes d'un client
   * Retourne tableau vide si erreur (jamais d'exception)
   */
  async getCustomerOrders(customerCode: string): Promise<SageOrder[]> {
    if (!customerCode) return [];

    // Check cache first
    const cacheKey = `orders:${customerCode}`;
    const cached = getCached<SageOrder[]>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return [];

      // Note: On exclut les BC (type 1) car ce sont des devis, pas des commandes validées
      // On ne garde que les BP (2), BL (3) et FA (6) des 12 derniers mois
      const result = await pool
        .request()
        .input('code', mssql.NVarChar, customerCode)
        .query(`
          SELECT
            DO_Piece as documentNumber,
            DO_Type as documentType,
            DO_Tiers as customerCode,
            DO_Date as orderDate,
            DO_DateLivr as deliveryDate,
            DO_Ref as reference,
            DO_TotalHT as totalHT,
            DO_TotalTTC as totalTTC
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Tiers = @code
          AND DO_Type IN (2, 3, 6)
          AND DO_Date >= DATEADD(year, -1, GETDATE())
          ORDER BY DO_Date DESC
        `);

      const orders: SageOrder[] = result.recordset.map((row: Record<string, unknown>) => ({
        documentNumber: row.documentNumber as string,
        documentType: row.documentType as number,
        documentTypeLabel: getDocumentTypeLabel(row.documentType as number),
        customerCode: row.customerCode as string,
        orderDate: row.orderDate as Date,
        deliveryDate: row.deliveryDate as Date | undefined,
        reference: row.reference as string | undefined,
        totalHT: row.totalHT as number || 0,
        totalTTC: row.totalTTC as number || 0,
        status: deriveOrderStatus(row.documentType as number),
      }));

      setCache(cacheKey, orders);
      return orders;
    } catch (error) {
      console.error('[SAGE] Erreur getCustomerOrders:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  /**
   * Récupère une commande par son numéro
   */
  async getOrderByNumber(orderNumber: string): Promise<SageOrder | null> {
    if (!orderNumber) return null;

    const cacheKey = `order:${orderNumber}`;
    const cached = getCached<SageOrder>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return null;

      // Note: Les colonnes LI_* peuvent ne pas exister selon la version de SAGE
      // On utilise uniquement les colonnes DO_* qui sont standards
      const result = await pool
        .request()
        .input('num', mssql.NVarChar, orderNumber)
        .query(`
          SELECT TOP 1
            DO_Piece as documentNumber,
            DO_Type as documentType,
            DO_Tiers as customerCode,
            DO_Date as orderDate,
            DO_DateLivr as deliveryDate,
            DO_Ref as reference,
            DO_TotalHT as totalHT,
            DO_TotalTTC as totalTTC,
            DO_Expedit as expeditionMode,
            DO_Condition as paymentCondition,
            DO_Devise as devise,
            DO_Taxe1 as taxRate1,
            DO_Taxe2 as taxRate2,
            DO_Taxe3 as taxRate3
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Piece = @num
        `);

      if (result.recordset.length === 0) return null;

      const row = result.recordset[0];
      const order: SageOrder = {
        documentNumber: row.documentNumber,
        documentType: row.documentType,
        documentTypeLabel: getDocumentTypeLabel(row.documentType),
        customerCode: row.customerCode,
        orderDate: row.orderDate,
        deliveryDate: row.deliveryDate,
        reference: row.reference,
        totalHT: row.totalHT || 0,
        totalTTC: row.totalTTC || 0,
        status: deriveOrderStatus(row.documentType),
        // Champs supplémentaires
        expeditionMode: row.expeditionMode,
        paymentCondition: row.paymentCondition,
        devise: row.devise,
        taxRate1: row.taxRate1,
        taxRate2: row.taxRate2,
        taxRate3: row.taxRate3,
        // Note: L'adresse de livraison sera récupérée depuis le client si nécessaire
      };

      setCache(cacheKey, order);
      return order;
    } catch (error) {
      console.error('[SAGE] Erreur getOrderByNumber:', error instanceof Error ? error.message : 'Erreur');
      return null;
    }
  },

  /**
   * Récupère les lignes d'une commande
   * @param orderNumber - Numéro de pièce (DO_Piece)
   * @param documentType - Type de document (1=BC, 3=BL, 6=FA) - optionnel mais recommandé
   */
  async getOrderLines(orderNumber: string, documentType?: number): Promise<SageOrderLine[]> {
    if (!orderNumber) return [];

    const cacheKey = `orderlines:${orderNumber}:${documentType || 'all'}`;
    const cached = getCached<SageOrderLine[]>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return [];

      console.log('[SAGE] ====== getOrderLines ======');
      console.log('[SAGE] Paramètres: DO_Piece =', orderNumber, '| DO_Type =', documentType);

      // Si on a le type de document, on filtre aussi par DO_Type
      // Car dans SAGE, le même DO_Piece peut exister pour différents types
      let query = `
        SELECT
          DL_Ligne as lineNumber,
          AR_Ref as productCode,
          DL_Design as productName,
          DL_Qte as quantity,
          DL_PrixUnitaire as unitPrice,
          DL_MontantHT as totalHT,
          DO_Type as docType
        FROM ${SAGE_TABLES.DOCLIGNE} WITH (NOLOCK)
        WHERE DO_Piece = @num
      `;

      if (documentType !== undefined) {
        query += ` AND DO_Type = @docType`;
      }

      query += ` ORDER BY DL_Ligne`;

      console.log('[SAGE] Requête SQL:', query.replace(/\s+/g, ' ').trim());

      const request = pool.request().input('num', mssql.NVarChar, orderNumber);

      if (documentType !== undefined) {
        request.input('docType', mssql.Int, documentType);
      }

      const result = await request.query(query);

      console.log('[SAGE] Résultat: ', result.recordset.length, 'lignes trouvées');
      if (result.recordset.length > 0) {
        console.log('[SAGE] Première ligne:', JSON.stringify(result.recordset[0]));
      }

      const lines: SageOrderLine[] = result.recordset;
      setCache(cacheKey, lines);
      return lines;
    } catch (error) {
      console.error('[SAGE] Erreur getOrderLines:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  /**
   * Recherche de clients par nom ou email
   */
  async searchCustomers(query: string, limit = 20): Promise<SageCustomer[]> {
    if (!query || query.length < 2) return [];

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return [];

      const result = await pool
        .request()
        .input('query', mssql.NVarChar, `%${query}%`)
        .input('limit', mssql.Int, limit)
        .query(`
          SELECT TOP (@limit)
            CT_Num as customerCode,
            CT_Intitule as companyName,
            CT_Contact as contactName,
            CT_EMail as email,
            CT_Telephone as phone
          FROM ${SAGE_TABLES.COMPTET} WITH (NOLOCK)
          WHERE CT_Intitule LIKE @query
             OR CT_EMail LIKE @query
             OR CT_Num LIKE @query
          ORDER BY CT_Intitule
        `);

      return result.recordset;
    } catch (error) {
      console.error('[SAGE] Erreur searchCustomers:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  // ============================================
  // ARTICLES
  // ============================================

  /**
   * Récupère un article par sa référence
   */
  async getArticle(reference: string): Promise<SageArticle | null> {
    if (!reference) return null;

    const cacheKey = `article:${reference}`;
    const cached = getCached<SageArticle>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return null;

      const result = await pool
        .request()
        .input('ref', mssql.NVarChar, reference)
        .query(`
          SELECT TOP 1
            AR_Ref as reference,
            AR_Design as designation,
            FA_CodeFamille as family,
            AR_PrixVen as priceHT,
            AR_CodeBarre as barcode,
            AR_PoidsNet as weight,
            AR_Sommeil as isSleeping
          FROM ${SAGE_TABLES.ARTICLE} WITH (NOLOCK)
          WHERE AR_Ref = @ref
        `);

      if (result.recordset.length === 0) return null;

      const row = result.recordset[0];
      const article: SageArticle = {
        reference: row.reference,
        designation: row.designation,
        family: row.family || '',
        priceHT: row.priceHT || 0,
        barcode: row.barcode,
        weight: row.weight,
        isActive: row.isSleeping === 0,
      };

      setCache(cacheKey, article);
      return article;
    } catch (error) {
      console.error('[SAGE] Erreur getArticle:', error instanceof Error ? error.message : 'Erreur');
      return null;
    }
  },

  /**
   * Recherche d'articles par référence, désignation ou code-barres
   */
  async searchArticles(query: string, limit = 30): Promise<SageArticle[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = `articles-search:${query}:${limit}`;
    const cached = getCached<SageArticle[]>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return [];

      const result = await pool
        .request()
        .input('query', mssql.NVarChar, `%${query}%`)
        .input('limit', mssql.Int, limit)
        .query(`
          SELECT TOP (@limit)
            AR_Ref as reference,
            AR_Design as designation,
            FA_CodeFamille as family,
            AR_PrixVen as priceHT,
            AR_CodeBarre as barcode,
            AR_PoidsNet as weight,
            AR_Sommeil as isSleeping
          FROM ${SAGE_TABLES.ARTICLE} WITH (NOLOCK)
          WHERE AR_Ref LIKE @query
             OR AR_Design LIKE @query
             OR AR_CodeBarre LIKE @query
          ORDER BY AR_Design
        `);

      const articles: SageArticle[] = result.recordset.map((row: Record<string, unknown>) => ({
        reference: row.reference as string,
        designation: row.designation as string,
        family: (row.family as string) || '',
        priceHT: (row.priceHT as number) || 0,
        barcode: row.barcode as string | undefined,
        weight: row.weight as number | undefined,
        isActive: row.isSleeping === 0,
      }));

      setCache(cacheKey, articles);
      return articles;
    } catch (error) {
      console.error('[SAGE] Erreur searchArticles:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  /**
   * Récupère les articles d'une famille
   */
  async getArticlesByFamily(familyCode: string, limit = 100): Promise<SageArticle[]> {
    if (!familyCode) return [];

    const cacheKey = `articles-family:${familyCode}:${limit}`;
    const cached = getCached<SageArticle[]>(cacheKey);
    if (cached) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return [];

      const result = await pool
        .request()
        .input('family', mssql.NVarChar, familyCode)
        .input('limit', mssql.Int, limit)
        .query(`
          SELECT TOP (@limit)
            AR_Ref as reference,
            AR_Design as designation,
            FA_CodeFamille as family,
            AR_PrixVen as priceHT,
            AR_CodeBarre as barcode,
            AR_PoidsNet as weight,
            AR_Sommeil as isSleeping
          FROM ${SAGE_TABLES.ARTICLE} WITH (NOLOCK)
          WHERE FA_CodeFamille = @family
            AND AR_Sommeil = 0
          ORDER BY AR_Design
        `);

      const articles: SageArticle[] = result.recordset.map((row: Record<string, unknown>) => ({
        reference: row.reference as string,
        designation: row.designation as string,
        family: (row.family as string) || '',
        priceHT: (row.priceHT as number) || 0,
        barcode: row.barcode as string | undefined,
        weight: row.weight as number | undefined,
        isActive: true,
      }));

      setCache(cacheKey, articles);
      return articles;
    } catch (error) {
      console.error('[SAGE] Erreur getArticlesByFamily:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  /**
   * Récupère le stock d'un article (si table F_ARTSTOCK disponible)
   */
  async getArticleStock(reference: string): Promise<number | null> {
    if (!reference) return null;

    const cacheKey = `stock:${reference}`;
    const cached = getCached<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return null;

      // Table F_ARTSTOCK contient le stock par dépôt
      const result = await pool
        .request()
        .input('ref', mssql.NVarChar, reference)
        .query(`
          SELECT SUM(AS_QteSto) as totalStock
          FROM F_ARTSTOCK WITH (NOLOCK)
          WHERE AR_Ref = @ref
        `);

      const stock = result.recordset[0]?.totalStock || 0;
      setCache(cacheKey, stock);
      return stock;
    } catch (error) {
      // Table peut ne pas exister selon config SAGE
      console.error('[SAGE] Erreur getArticleStock:', error instanceof Error ? error.message : 'Erreur');
      return null;
    }
  },

  /**
   * Vide le cache (utile pour forcer un refresh)
   */
  clearCache(): void {
    cache.clear();
    console.log('[SAGE] Cache vidé');
  },

  /**
   * Statistiques du cache
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: cache.size,
      enabled: sageConfig.cacheEnabled,
    };
  },
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function getDocumentTypeLabel(type: number): string {
  switch (type) {
    case SAGE_TABLES.DOC_TYPES.BC: return 'BC';
    case SAGE_TABLES.DOC_TYPES.BP: return 'BP';
    case SAGE_TABLES.DOC_TYPES.BL: return 'BL';
    case SAGE_TABLES.DOC_TYPES.FA: return 'FA';
    default: return 'DOC';
  }
}

function deriveOrderStatus(docType: number): string {
  switch (docType) {
    case SAGE_TABLES.DOC_TYPES.BC: return 'EN_COURS';
    case SAGE_TABLES.DOC_TYPES.BP: return 'EN_PREPARATION';
    case SAGE_TABLES.DOC_TYPES.BL: return 'LIVREE';
    case SAGE_TABLES.DOC_TYPES.FA: return 'FACTUREE';
    default: return 'INCONNU';
  }
}

export default SageService;
