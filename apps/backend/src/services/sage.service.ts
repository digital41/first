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
  // Dates avec heures réelles (SAGE cbCreation/cbModification)
  createdAt?: Date;            // cbCreation - Date/heure de création du document
  updatedAt?: Date;            // cbModification - Date/heure de dernière modification
  // Historique des transformations (dates BP, BL, FA)
  bpDate?: Date;               // Date de création du BP (préparation)
  blDate?: Date;               // Date de création du BL (livraison)
  faDate?: Date;               // Date de création de la Facture
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
   * Recherche un client par son email dans SAGE
   * Utilisé pour lier automatiquement un compte Google au compte client SAGE
   */
  async searchCustomerByEmail(email: string): Promise<SageCustomer[] | null> {
    if (!email) return null;

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return null;

      const result = await pool
        .request()
        .input('email', mssql.NVarChar, email.toLowerCase())
        .query(`
          SELECT TOP 5
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
          WHERE LOWER(CT_EMail) = @email
            AND CT_Type = 0
        `);

      if (result.recordset.length === 0) return null;

      return result.recordset as SageCustomer[];
    } catch (error) {
      console.error('[SAGE] Erreur searchCustomerByEmail:', error instanceof Error ? error.message : 'Erreur');
      return null;
    }
  },

  /**
   * Récupère les commandes d'un client avec pagination SQL
   * Retourne tableau vide si erreur (jamais d'exception)
   * @param customerCode - Code client SAGE
   * @param forceRefresh - Si true, ignore le cache et fait une requête SAGE fraîche
   * @param includeReturns - Si true, inclut les retours (BR=4) et avoirs (5)
   * @param year - Année à filtrer (défaut: année en cours)
   * @param page - Numéro de page (1-indexed)
   * @param limit - Nombre de résultats par page
   * @returns { orders, total } - Commandes et nombre total
   */
  async getCustomerOrdersPaginated(
    customerCode: string,
    forceRefresh = false,
    includeReturns = false,
    year?: number,
    page = 1,
    limit = 5
  ): Promise<{ orders: SageOrder[]; total: number }> {
    if (!customerCode) return { orders: [], total: 0 };

    // Année par défaut: année en cours
    const filterYear = year || new Date().getFullYear();
    const offset = (page - 1) * limit;

    // Types par défaut: BP(2), BL(3), FA(6), FA_ARCH(7)
    // Si includeReturns: ajoute BR(4) et AVOIR(5)
    const docTypes = includeReturns ? '2, 3, 4, 5, 6, 7' : '2, 3, 6, 7';

    // Clé de cache pour le total (compte tous les documents de l'année)
    const countCacheKey = `orders-count:${customerCode}:${includeReturns ? 'with-returns' : 'standard'}:${filterYear}`;
    // Clé de cache pour la page
    const pageCacheKey = `orders-page:${customerCode}:${includeReturns ? 'with-returns' : 'standard'}:${filterYear}:${page}:${limit}`;

    // Vérifier le cache si pas de forceRefresh
    if (!forceRefresh) {
      const cachedTotal = getCached<number>(countCacheKey);
      const cachedOrders = getCached<SageOrder[]>(pageCacheKey);
      if (cachedTotal !== null && cachedOrders) {
        console.log(`[SAGE] getCustomerOrdersPaginated: CACHE HIT - page ${page}, ${cachedOrders.length} commandes, total=${cachedTotal}`);
        return { orders: cachedOrders, total: cachedTotal };
      }
    } else {
      console.log(`[SAGE] getCustomerOrdersPaginated: FORCE REFRESH`);
      cache.delete(countCacheKey);
      cache.delete(pageCacheKey);
    }

    console.log(`[SAGE] getCustomerOrdersPaginated(${customerCode}): page=${page}, limit=${limit}, year=${filterYear}, returns=${includeReturns}`);

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return { orders: [], total: 0 };

      // 1. Compter le total (requête rapide)
      const countResult = await pool
        .request()
        .input('code', mssql.NVarChar, customerCode)
        .input('year', mssql.Int, filterYear)
        .query(`
          SELECT COUNT(*) as total
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Tiers = @code
          AND DO_Type IN (${docTypes})
          AND YEAR(DO_Date) = @year
        `);

      const total = countResult.recordset[0].total || 0;
      console.log(`[SAGE] Total commandes pour ${filterYear}: ${total}`);

      // Si aucune commande, retourner vide
      if (total === 0) {
        setCache(countCacheKey, 0);
        return { orders: [], total: 0 };
      }

      // 2. Récupérer uniquement la page demandée avec OFFSET/FETCH
      const result = await pool
        .request()
        .input('code', mssql.NVarChar, customerCode)
        .input('year', mssql.Int, filterYear)
        .input('offset', mssql.Int, offset)
        .input('limit', mssql.Int, limit)
        .query(`
          SELECT
            DO_Piece as documentNumber,
            DO_Type as documentType,
            DO_Tiers as customerCode,
            DO_Date as orderDate,
            DO_DateLivr as deliveryDate,
            DO_Ref as reference,
            DO_TotalHT as totalHT,
            DO_TotalTTC as totalTTC,
            cbCreation as createdAt,
            cbModification as updatedAt
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Tiers = @code
          AND DO_Type IN (${docTypes})
          AND YEAR(DO_Date) = @year
          ORDER BY DO_Date DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      console.log(`[SAGE] Page ${page}: ${result.recordset.length} commandes récupérées`);

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
        createdAt: row.createdAt as Date | undefined,
        updatedAt: row.updatedAt as Date | undefined,
      }));

      // Mettre en cache
      setCache(countCacheKey, total);
      setCache(pageCacheKey, orders);

      return { orders, total };
    } catch (error) {
      console.error('[SAGE] Erreur getCustomerOrdersPaginated:', error instanceof Error ? error.message : 'Erreur');
      return { orders: [], total: 0 };
    }
  },

  /**
   * Récupère les commandes d'un client (version non paginée, pour compatibilité)
   * @deprecated Utiliser getCustomerOrdersPaginated pour de meilleures performances
   */
  async getCustomerOrders(customerCode: string, forceRefresh = false, includeReturns = false, year?: number): Promise<SageOrder[]> {
    // Déléguer à la version paginée avec une grande limite
    const { orders } = await this.getCustomerOrdersPaginated(customerCode, forceRefresh, includeReturns, year, 1, 1000);
    return orders;
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
            DO_Taxe3 as taxRate3,
            cbCreation as createdAt,
            cbModification as updatedAt
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Piece = @num
        `);

      if (result.recordset.length === 0) return null;

      const row = result.recordset[0];

      // Récupérer les dates de transformation (BL et FA liés)
      const relatedDates = await this.getRelatedDocumentDates(orderNumber, row.customerCode);

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
        // Dates avec heures réelles
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Dates de transformation (BP, BL et FA liés)
        bpDate: relatedDates.bpDate,
        blDate: relatedDates.blDate,
        faDate: relatedDates.faDate,
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
   * Récupère les dates de transformation d'un document (BP, BL et FA liés)
   * Dans SAGE, quand un document est transformé (BC -> BP -> BL -> FA),
   * les documents sont liés via DO_Ref ou partagent le même suffixe numérique
   * @param orderNumber - Numéro de pièce (ex: F26010226)
   * @param customerCode - Code client pour filtrer
   * @returns Les dates de création du BP, BL et FA liés (si trouvés)
   */
  async getRelatedDocumentDates(
    orderNumber: string,
    customerCode: string
  ): Promise<{ bpDate?: Date; blDate?: Date; faDate?: Date }> {
    if (!orderNumber || !customerCode) return {};

    // Vérifier le cache d'abord
    const cacheKey = `related-dates:${orderNumber}`;
    const cached = getCached<{ bpDate?: Date; blDate?: Date; faDate?: Date }>(cacheKey);
    if (cached) {
      console.log(`[SAGE] getRelatedDocumentDates(${orderNumber}): CACHE HIT`);
      return cached;
    }

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return {};

      // Extraire le suffixe numérique du document (ex: F26010226 -> 26010226)
      const numericSuffix = orderNumber.replace(/^[A-Za-z]+/, '');

      console.log(`[SAGE] getRelatedDocumentDates: Recherche documents liés pour ${orderNumber}`);

      // Stratégie 1: Chercher les documents qui référencent ce document (DO_Ref)
      // Stratégie 2: Chercher les documents avec le même suffixe numérique
      // Stratégie 3: Chercher le document référencé par ce document
      const result = await pool
        .request()
        .input('code', mssql.NVarChar, customerCode)
        .input('docNum', mssql.NVarChar, orderNumber)
        .input('suffix', mssql.NVarChar, numericSuffix ? `%${numericSuffix}` : '')
        .query(`
          SELECT DISTINCT
            DO_Piece as documentNumber,
            DO_Type as documentType,
            DO_Ref as reference,
            cbCreation as createdAt
          FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
          WHERE DO_Tiers = @code
          AND DO_Type IN (2, 3, 6, 7)
          AND DO_Piece != @docNum
          AND (
            -- Documents qui référencent notre document
            DO_Ref = @docNum
            -- Documents référencés par notre document (via sous-requête)
            OR DO_Piece IN (
              SELECT DO_Ref FROM ${SAGE_TABLES.DOCENTETE} WITH (NOLOCK)
              WHERE DO_Piece = @docNum AND DO_Ref IS NOT NULL AND DO_Ref != ''
            )
            -- Documents avec le même suffixe numérique
            ${numericSuffix ? 'OR DO_Piece LIKE @suffix' : ''}
          )
          ORDER BY DO_Type ASC
        `);

      let bpDate: Date | undefined;
      let blDate: Date | undefined;
      let faDate: Date | undefined;

      for (const row of result.recordset) {
        console.log(`[SAGE] Document lié trouvé: ${row.documentNumber} (type=${row.documentType}, ref=${row.reference}, created=${row.createdAt})`);
        if (row.documentType === 2 && !bpDate) {
          bpDate = row.createdAt;
        } else if (row.documentType === 3 && !blDate) {
          blDate = row.createdAt;
        } else if ((row.documentType === 6 || row.documentType === 7) && !faDate) {
          faDate = row.createdAt;
        }
      }

      console.log(`[SAGE] Dates trouvées: BP=${bpDate}, BL=${blDate}, FA=${faDate}`);
      const dates = { bpDate, blDate, faDate };
      setCache(cacheKey, dates);
      return dates;
    } catch (error) {
      console.error('[SAGE] Erreur getRelatedDocumentDates:', error instanceof Error ? error.message : 'Erreur');
      return {};
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

      const request = pool.request().input('num', mssql.NVarChar, orderNumber);

      if (documentType !== undefined) {
        request.input('docType', mssql.Int, documentType);
      }

      const result = await request.query(query);
      const lines: SageOrderLine[] = result.recordset;
      setCache(cacheKey, lines);
      return lines;
    } catch (error) {
      console.error('[SAGE] Erreur getOrderLines:', error instanceof Error ? error.message : 'Erreur');
      return [];
    }
  },

  /**
   * Récupère les lignes de PLUSIEURS commandes en une seule requête SQL
   * Optimisation: 1 requête au lieu de N requêtes
   * @param orders - Liste de { documentNumber, documentType }
   * @returns Map<documentNumber, SageOrderLine[]>
   */
  async getOrderLinesBatch(orders: Array<{ documentNumber: string; documentType: number }>): Promise<Map<string, SageOrderLine[]>> {
    const result = new Map<string, SageOrderLine[]>();
    if (!orders || orders.length === 0) return result;

    // Vérifier le cache pour chaque commande
    const uncachedOrders: Array<{ documentNumber: string; documentType: number }> = [];
    for (const order of orders) {
      const cacheKey = `orderlines:${order.documentNumber}:${order.documentType}`;
      const cached = getCached<SageOrderLine[]>(cacheKey);
      if (cached) {
        result.set(order.documentNumber, cached);
      } else {
        uncachedOrders.push(order);
      }
    }

    // Si tout est en cache, retourner directement
    if (uncachedOrders.length === 0) {
      console.log(`[SAGE] getOrderLinesBatch: CACHE HIT pour ${orders.length} commandes`);
      return result;
    }

    console.log(`[SAGE] getOrderLinesBatch: ${uncachedOrders.length}/${orders.length} commandes à charger depuis SAGE`);

    try {
      const pool = await getSqlPool();
      if (!pool || !mssql) return result;

      // Construire la requête avec UNION de conditions pour chaque document
      // Chaque document a son propre DO_Piece + DO_Type
      const conditions = uncachedOrders.map((_, i) =>
        `(DO_Piece = @piece${i} AND DO_Type = @type${i})`
      ).join(' OR ');

      const query = `
        SELECT
          DO_Piece as documentNumber,
          DL_Ligne as lineNumber,
          AR_Ref as productCode,
          DL_Design as productName,
          DL_Qte as quantity,
          DL_PrixUnitaire as unitPrice,
          DL_MontantHT as totalHT,
          DO_Type as docType
        FROM ${SAGE_TABLES.DOCLIGNE} WITH (NOLOCK)
        WHERE ${conditions}
        ORDER BY DO_Piece, DL_Ligne
      `;

      const request = pool.request();
      uncachedOrders.forEach((order, i) => {
        request.input(`piece${i}`, mssql.NVarChar, order.documentNumber);
        request.input(`type${i}`, mssql.Int, order.documentType);
      });

      const queryResult = await request.query(query);

      // Grouper les résultats par documentNumber
      const linesByDoc = new Map<string, SageOrderLine[]>();
      for (const row of queryResult.recordset) {
        const docNum = row.documentNumber as string;
        if (!linesByDoc.has(docNum)) {
          linesByDoc.set(docNum, []);
        }
        linesByDoc.get(docNum)!.push({
          lineNumber: row.lineNumber,
          productCode: row.productCode,
          productName: row.productName,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          totalHT: row.totalHT,
        });
      }

      // Mettre en cache et ajouter au résultat
      for (const order of uncachedOrders) {
        const lines = linesByDoc.get(order.documentNumber) || [];
        const cacheKey = `orderlines:${order.documentNumber}:${order.documentType}`;
        setCache(cacheKey, lines);
        result.set(order.documentNumber, lines);
      }

      console.log(`[SAGE] getOrderLinesBatch: ${queryResult.recordset.length} lignes récupérées pour ${uncachedOrders.length} commandes`);

      return result;
    } catch (error) {
      console.error('[SAGE] Erreur getOrderLinesBatch:', error instanceof Error ? error.message : 'Erreur');
      return result;
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
    case SAGE_TABLES.DOC_TYPES.DEVIS: return 'DEVIS';
    case SAGE_TABLES.DOC_TYPES.BC: return 'BC';
    case SAGE_TABLES.DOC_TYPES.BP: return 'BP';
    case SAGE_TABLES.DOC_TYPES.BL: return 'BL';
    case SAGE_TABLES.DOC_TYPES.BR: return 'BR';
    case SAGE_TABLES.DOC_TYPES.AVOIR: return 'AVOIR';
    case SAGE_TABLES.DOC_TYPES.FA: return 'FA';
    case SAGE_TABLES.DOC_TYPES.FA_ARCH: return 'FA';
    default: return 'DOC';
  }
}

function deriveOrderStatus(docType: number): string {
  switch (docType) {
    case SAGE_TABLES.DOC_TYPES.DEVIS: return 'DEVIS';
    case SAGE_TABLES.DOC_TYPES.BC: return 'EN_COURS';
    case SAGE_TABLES.DOC_TYPES.BP: return 'EN_PREPARATION';
    case SAGE_TABLES.DOC_TYPES.BL: return 'LIVREE';
    case SAGE_TABLES.DOC_TYPES.BR: return 'RETOUR';
    case SAGE_TABLES.DOC_TYPES.AVOIR: return 'AVOIR';
    case SAGE_TABLES.DOC_TYPES.FA: return 'FACTUREE';
    case SAGE_TABLES.DOC_TYPES.FA_ARCH: return 'FACTUREE';
    default: return 'INCONNU';
  }
}

export default SageService;
