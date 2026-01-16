import PDFDocument from 'pdfkit';
import { SageService, type SageOrder } from './sage.service.js';

// ============================================
// SERVICE DE GÉNÉRATION DE FACTURES PDF
// Style KLY GROUPE - Format SAGE
// ============================================

// Informations de l'entreprise
const COMPANY_INFO = {
  name: 'KLY GROUPE',
  address: '103 RUE DE LA BONGARDE',
  postalCode: '92230',
  city: 'GENNEVILLIERS',
  phone: '01 41 32 39 45',
  fax: '01 41 32 39 46',
  siret: '123 456 789 00012', // À remplacer par le vrai numéro
  tvaIntra: 'FR 12 123456789', // À remplacer
  naf: '4669B', // À remplacer
  contact: 'Service Commercial',
};

interface InvoiceData {
  orderNumber: string;
  documentType: string;
  documentTypeLabel: string;
  customerCode: string;
  // Informations client
  companyName?: string;
  customerAddress?: string;
  customerAddressComplement?: string;
  customerPostalCode?: string;
  customerCity?: string;
  customerCountry?: string;
  customerPhone?: string;
  customerFax?: string;
  customerEmail?: string;
  customerSiret?: string;
  customerTvaIntra?: string;
  // Dates et références
  orderDate: Date;
  deliveryDate?: Date;
  customerRef?: string;
  // Adresse de livraison (si différente)
  deliveryName?: string;
  deliveryAddress?: string;
  deliveryComplement?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  // Totaux et TVA
  totalHT: number;
  totalTTC: number;
  taxRate?: number;
  // Conditions
  paymentCondition?: string;
  expeditionMode?: string;
  // Lignes
  lines: Array<{
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalHT: number;
    gencod?: string;
  }>;
}

/**
 * Génère un PDF de facture/bon de commande style SAGE
 */
export async function generateInvoicePDF(orderNumber: string, customerCode: string): Promise<Buffer> {
  console.log('[Invoice PDF Service] ====== DEBUT GENERATION PDF ======');
  console.log('[Invoice PDF Service] Commande:', orderNumber, 'Client:', customerCode);

  // Vider le cache pour s'assurer d'avoir les données fraîches
  SageService.clearCache();
  console.log('[Invoice PDF Service] Cache SAGE vidé');

  // Récupérer la commande directement par son numéro
  const order = await SageService.getOrderByNumber(orderNumber);

  if (!order) {
    console.log('[Invoice PDF Service] ERREUR: Commande non trouvée dans SAGE');
    throw new Error('Commande non trouvée dans SAGE');
  }

  console.log('[Invoice PDF Service] Commande trouvée:', {
    documentNumber: order.documentNumber,
    documentType: order.documentType,
    documentTypeLabel: order.documentTypeLabel,
    customerCode: order.customerCode
  });

  // Récupérer les lignes de commande SÉPARÉMENT avec le type de document
  // Important: Dans SAGE, il faut filtrer par DO_Piece ET DO_Type
  console.log('[Invoice PDF Service] Récupération des lignes avec DO_Type:', order.documentType);
  const lines = await SageService.getOrderLines(orderNumber, order.documentType);
  console.log('[Invoice PDF Service] Nombre de lignes récupérées:', lines.length);

  if (lines.length > 0) {
    console.log('[Invoice PDF Service] Première ligne:', JSON.stringify(lines[0]));
  } else {
    console.log('[Invoice PDF Service] ATTENTION: Aucune ligne trouvée!');
  }

  // Récupérer les infos client
  const customer = await SageService.getCustomer(customerCode);
  console.log('[Invoice PDF Service] Client:', customer?.companyName || 'Non trouvé');
  console.log('[Invoice PDF Service] Données client SAGE:', JSON.stringify(customer, null, 2));

  // Préparer les données de la facture avec toutes les infos SAGE
  const invoiceData: InvoiceData = {
    orderNumber: order.documentNumber,
    documentType: String(order.documentType),
    documentTypeLabel: getFullDocumentLabel(order.documentTypeLabel),
    customerCode: order.customerCode,
    // Informations client depuis SAGE
    companyName: customer?.companyName,
    customerAddress: customer?.address,
    customerAddressComplement: customer?.addressComplement,
    customerPostalCode: customer?.postalCode,
    customerCity: customer?.city,
    customerCountry: customer?.country,
    customerPhone: customer?.phone,
    customerFax: customer?.fax,
    customerEmail: customer?.email,
    customerSiret: customer?.siret,
    customerTvaIntra: customer?.tvaIntra,
    // Dates et références
    orderDate: order.orderDate,
    deliveryDate: isValidDate(order.deliveryDate) ? order.deliveryDate : undefined,
    customerRef: order.reference,
    // Adresse de livraison (depuis le document SAGE)
    deliveryName: order.deliveryName,
    deliveryAddress: order.deliveryAddress,
    deliveryComplement: order.deliveryComplement,
    deliveryPostalCode: order.deliveryPostalCode,
    deliveryCity: order.deliveryCity,
    deliveryCountry: order.deliveryCountry,
    // Totaux et TVA
    totalHT: order.totalHT,
    totalTTC: order.totalTTC,
    taxRate: order.taxRate1, // Taux TVA principal
    // Conditions
    paymentCondition: order.paymentCondition,
    expeditionMode: order.expeditionMode,
    // Lignes de commande
    lines: lines.map(l => ({
      productCode: l.productCode || '',
      productName: l.productName || '',
      quantity: l.quantity || 0,
      unitPrice: l.unitPrice || 0,
      totalHT: l.totalHT || 0,
    })),
  };

  console.log('[Invoice PDF Service] Données préparées, génération PDF avec', invoiceData.lines.length, 'lignes');

  return createPDF(invoiceData);
}

/**
 * Convertit le label court en label complet
 */
function getFullDocumentLabel(shortLabel: string): string {
  switch (shortLabel) {
    case 'BC': return 'Bon de Commande';
    case 'BL': return 'Bon de Livraison';
    case 'FA': return 'Facture';
    default: return shortLabel;
  }
}

/**
 * Vérifie si une date est valide (pas null, pas 1753)
 */
function isValidDate(date: Date | undefined | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  // SQL Server date par défaut est 1753-01-01
  return !isNaN(d.getTime()) && d.getFullYear() > 1900;
}

/**
 * Crée le document PDF style classique KLY GROUPE
 */
function createPDF(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        info: {
          Title: `${data.documentTypeLabel} ${data.orderNumber}`,
          Author: 'KLY Groupe',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 515; // A4 width - margins
      const leftMargin = 40;

      // ========================================
      // EN-TÊTE - Informations entreprise
      // ========================================

      // Cadre en-tête gauche (entreprise)
      doc
        .rect(leftMargin, 30, 250, 100)
        .stroke('#000000');

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(COMPANY_INFO.name, leftMargin + 10, 40);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(COMPANY_INFO.address, leftMargin + 10, 60)
        .text(`${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`, leftMargin + 10, 72)
        .text(`Tél : ${COMPANY_INFO.phone}`, leftMargin + 10, 88)
        .text(`Fax : ${COMPANY_INFO.fax}`, leftMargin + 10, 100);

      // Cadre en-tête droit (type document)
      doc
        .rect(leftMargin + 270, 30, 205, 100)
        .stroke('#000000');

      // Type de document en gras centré
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(data.documentTypeLabel.toUpperCase(), leftMargin + 270, 45, {
          width: 205,
          align: 'center'
        });

      // Numéro du document
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`N° ${data.orderNumber}`, leftMargin + 280, 70);

      // Date
      let infoY = 85;
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Date : ${formatDate(data.orderDate)}`, leftMargin + 280, infoY);
      infoY += 12;

      if (data.deliveryDate) {
        doc.text(`Livraison : ${formatDate(data.deliveryDate)}`, leftMargin + 280, infoY);
        infoY += 12;
      }

      if (data.customerRef) {
        doc.text(`Réf. client : ${data.customerRef}`, leftMargin + 280, infoY);
      }

      // ========================================
      // INFORMATIONS LÉGALES
      // ========================================
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`N° Siret : ${COMPANY_INFO.siret}`, leftMargin, 140)
        .text(`N° Intracommunautaire : ${COMPANY_INFO.tvaIntra}`, leftMargin, 152)
        .text(`N.A.F. : ${COMPANY_INFO.naf}`, leftMargin, 164);

      // ========================================
      // INFORMATIONS CLIENT
      // ========================================

      // Cadre adresse client
      doc
        .rect(leftMargin + 300, 140, 175, 80)
        .stroke('#000000');

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('LIVRAISON :', leftMargin + 310, 148);

      doc
        .fontSize(9)
        .font('Helvetica')
        .text(data.companyName || `Client ${data.customerCode}`, leftMargin + 310, 165);

      if (data.customerAddress) {
        doc.text(data.customerAddress, leftMargin + 310, 180);
      }
      if (data.customerPostalCode || data.customerCity) {
        doc.text(`${data.customerPostalCode || ''} ${data.customerCity || ''}`.trim(), leftMargin + 310, 195);
      }

      // Numéro de client
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Numéro de client : ${data.customerCode}`, leftMargin, 190);

      // ========================================
      // TABLEAU DES ARTICLES
      // ========================================
      const tableTop = 240;
      const colWidths = {
        ref: 80,
        designation: 200,
        qty: 50,
        unitPrice: 70,
        total: 75,
      };

      // En-tête du tableau avec fond gris
      doc
        .fillColor('#e0e0e0')
        .rect(leftMargin, tableTop, pageWidth, 20)
        .fill();

      // Bordure du header
      doc
        .strokeColor('#000000')
        .lineWidth(0.5)
        .rect(leftMargin, tableTop, pageWidth, 20)
        .stroke();

      // Textes en-tête
      let xPos = leftMargin;
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#000000');

      doc.text('Référence', xPos + 5, tableTop + 6);
      xPos += colWidths.ref;

      // Ligne verticale
      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
      doc.text('Désignation', xPos + 5, tableTop + 6);
      xPos += colWidths.designation;

      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
      doc.text('Qté', xPos + 5, tableTop + 6);
      xPos += colWidths.qty;

      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
      doc.text('Prix U. HT', xPos + 5, tableTop + 6);
      xPos += colWidths.unitPrice;

      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 20).stroke();
      doc.text('Total HT', xPos + 5, tableTop + 6);

      // Lignes du tableau
      let currentY = tableTop + 20;
      const lineHeight = 18;
      const maxY = 700; // Limite avant pied de page

      data.lines.forEach((line, index) => {
        // Vérifier si on a besoin d'une nouvelle page
        if (currentY > maxY) {
          // Fermer le tableau
          doc.rect(leftMargin, tableTop + 20, pageWidth, currentY - tableTop - 20).stroke();

          // Ajouter mention "A reporter"
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('À reporter', leftMargin + pageWidth - 100, currentY + 10);

          doc.addPage();
          currentY = 50;

          // Réafficher en-tête tableau sur nouvelle page
          doc
            .fillColor('#e0e0e0')
            .rect(leftMargin, currentY, pageWidth, 20)
            .fill();
          doc.rect(leftMargin, currentY, pageWidth, 20).stroke();

          xPos = leftMargin;
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#000000');

          doc.text('Référence', xPos + 5, currentY + 6);
          xPos += colWidths.ref;
          doc.moveTo(xPos, currentY).lineTo(xPos, currentY + 20).stroke();
          doc.text('Désignation', xPos + 5, currentY + 6);
          xPos += colWidths.designation;
          doc.moveTo(xPos, currentY).lineTo(xPos, currentY + 20).stroke();
          doc.text('Qté', xPos + 5, currentY + 6);
          xPos += colWidths.qty;
          doc.moveTo(xPos, currentY).lineTo(xPos, currentY + 20).stroke();
          doc.text('Prix U. HT', xPos + 5, currentY + 6);
          xPos += colWidths.unitPrice;
          doc.moveTo(xPos, currentY).lineTo(xPos, currentY + 20).stroke();
          doc.text('Total HT', xPos + 5, currentY + 6);

          currentY += 20;
        }

        // Alternance couleur fond
        if (index % 2 === 0) {
          doc
            .fillColor('#f9f9f9')
            .rect(leftMargin, currentY, pageWidth, lineHeight)
            .fill();
        }

        // Données de la ligne
        xPos = leftMargin;
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#000000');

        doc.text(line.productCode || '-', xPos + 5, currentY + 5, { width: colWidths.ref - 10 });
        xPos += colWidths.ref;

        doc.text(truncateText(line.productName, 45), xPos + 5, currentY + 5, { width: colWidths.designation - 10 });
        xPos += colWidths.designation;

        doc.text(String(line.quantity), xPos + 5, currentY + 5, { width: colWidths.qty - 10, align: 'right' });
        xPos += colWidths.qty;

        doc.text(formatCurrency(line.unitPrice), xPos + 5, currentY + 5, { width: colWidths.unitPrice - 10, align: 'right' });
        xPos += colWidths.unitPrice;

        doc.text(formatCurrency(line.totalHT), xPos + 5, currentY + 5, { width: colWidths.total - 10, align: 'right' });

        currentY += lineHeight;
      });

      // Fermer le cadre du tableau
      const tableHeight = currentY - tableTop - 20;
      doc
        .strokeColor('#000000')
        .rect(leftMargin, tableTop + 20, pageWidth, tableHeight)
        .stroke();

      // Lignes verticales du tableau
      xPos = leftMargin + colWidths.ref;
      doc.moveTo(xPos, tableTop + 20).lineTo(xPos, currentY).stroke();
      xPos += colWidths.designation;
      doc.moveTo(xPos, tableTop + 20).lineTo(xPos, currentY).stroke();
      xPos += colWidths.qty;
      doc.moveTo(xPos, tableTop + 20).lineTo(xPos, currentY).stroke();
      xPos += colWidths.unitPrice;
      doc.moveTo(xPos, tableTop + 20).lineTo(xPos, currentY).stroke();

      // ========================================
      // TOTAUX
      // ========================================
      const totalsY = currentY + 20;
      const totalsX = leftMargin + 330;

      // Cadre totaux
      doc
        .rect(totalsX, totalsY, 145, 70)
        .stroke();

      // Total HT
      doc
        .fontSize(9)
        .font('Helvetica')
        .text('Total HT :', totalsX + 10, totalsY + 10)
        .font('Helvetica-Bold')
        .text(formatCurrency(data.totalHT), totalsX + 80, totalsY + 10, { width: 55, align: 'right' });

      // TVA
      const tva = data.totalTTC - data.totalHT;
      doc
        .font('Helvetica')
        .text('TVA (20%) :', totalsX + 10, totalsY + 28)
        .font('Helvetica-Bold')
        .text(formatCurrency(tva), totalsX + 80, totalsY + 28, { width: 55, align: 'right' });

      // Total TTC avec fond
      doc
        .fillColor('#1a365d')
        .rect(totalsX, totalsY + 45, 145, 25)
        .fill();

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('TOTAL TTC :', totalsX + 10, totalsY + 52)
        .text(formatCurrency(data.totalTTC), totalsX + 80, totalsY + 52, { width: 55, align: 'right' });

      // Nombre d'articles
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`Nombre d'articles : ${data.lines.length}`, leftMargin, totalsY + 10);

      doc.text(`Nombre d'unités : ${data.lines.reduce((sum, l) => sum + l.quantity, 0)}`, leftMargin, totalsY + 25);

      // ========================================
      // PIED DE PAGE
      // ========================================
      const footerY = 780;

      doc
        .strokeColor('#cccccc')
        .moveTo(leftMargin, footerY)
        .lineTo(leftMargin + pageWidth, footerY)
        .stroke();

      doc
        .fontSize(7)
        .fillColor('#666666')
        .text(
          `${COMPANY_INFO.name} - ${COMPANY_INFO.address}, ${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`,
          leftMargin,
          footerY + 8,
          { align: 'center', width: pageWidth }
        )
        .text(
          `Tél: ${COMPANY_INFO.phone} - Fax: ${COMPANY_INFO.fax} - SIRET: ${COMPANY_INFO.siret}`,
          leftMargin,
          footerY + 18,
          { align: 'center', width: pageWidth }
        );

      // Numéro de page
      doc
        .fontSize(8)
        .text('Page 1', leftMargin + pageWidth - 50, footerY + 8);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// === HELPERS ===

function formatDate(date: Date | undefined | null): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime()) || d.getFullYear() < 1900) return '-';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0,00 €';
  }
  // Formater manuellement pour éviter les problèmes avec Intl.NumberFormat
  const fixed = amount.toFixed(2);
  const parts = fixed.split('.');
  const intPart = parts[0] || '0';
  const decPart = parts[1] || '00';
  // Ajouter les espaces pour les milliers
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedInt},${decPart} €`;
}

function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
