// ============================================
// EXPORT HELPERS
// ============================================
// Utilitaires pour l'export de données en Excel/CSV/PDF

import { Ticket, TicketStatus, TicketPriority } from '../types';

// ============================================
// TYPES
// ============================================

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeFields?: (keyof Ticket)[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportColumn {
  key: keyof Ticket | string;
  label: string;
  formatter?: (value: unknown, ticket: Ticket) => string;
}

// ============================================
// DEFAULT COLUMNS
// ============================================

export const DEFAULT_EXPORT_COLUMNS: ExportColumn[] = [
  {
    key: 'id',
    label: 'ID',
    formatter: (value) => String(value).slice(0, 8),
  },
  {
    key: 'title',
    label: 'Titre',
  },
  {
    key: 'status',
    label: 'Statut',
    formatter: (value) => formatStatus(value as TicketStatus),
  },
  {
    key: 'priority',
    label: 'Priorité',
    formatter: (value) => formatPriority(value as TicketPriority),
  },
  {
    key: 'category',
    label: 'Catégorie',
  },
  {
    key: 'contactName',
    label: 'Client',
    formatter: (value, ticket) =>
      String(value || ticket.customer?.displayName || '-'),
  },
  {
    key: 'contactEmail',
    label: 'Email',
    formatter: (value, ticket) =>
      String(value || ticket.customer?.email || '-'),
  },
  {
    key: 'assignedTo',
    label: 'Assigné à',
    formatter: (_, ticket) =>
      ticket.assignedTo?.displayName || 'Non assigné',
  },
  {
    key: 'createdAt',
    label: 'Créé le',
    formatter: (value) =>
      new Date(value as string).toLocaleDateString('fr-FR'),
  },
  {
    key: 'updatedAt',
    label: 'Mis à jour le',
    formatter: (value) =>
      new Date(value as string).toLocaleDateString('fr-FR'),
  },
  {
    key: 'slaBreached',
    label: 'SLA',
    formatter: (value) => (value ? 'Dépassé' : 'OK'),
  },
];

// ============================================
// FORMATTERS
// ============================================

export const formatStatus = (status: TicketStatus): string => {
  const labels: Record<TicketStatus, string> = {
    OPEN: 'Ouvert',
    IN_PROGRESS: 'En cours',
    WAITING_CUSTOMER: 'Attente client',
    RESOLVED: 'Résolu',
    CLOSED: 'Fermé',
    ESCALATED: 'Escaladé',
    REOPENED: 'Réouvert',
  };
  return labels[status] || status;
};

export const formatPriority = (priority: TicketPriority): string => {
  const labels: Record<TicketPriority, string> = {
    LOW: 'Basse',
    MEDIUM: 'Moyenne',
    HIGH: 'Haute',
    URGENT: 'Urgente',
  };
  return labels[priority] || priority;
};

// ============================================
// CSV EXPORT
// ============================================

export const exportToCSV = (
  tickets: Ticket[],
  columns: ExportColumn[] = DEFAULT_EXPORT_COLUMNS,
  filename: string = 'tickets'
): void => {
  // En-têtes
  const headers = columns.map((col) => `"${col.label}"`).join(',');

  // Lignes de données
  const rows = tickets.map((ticket) => {
    return columns
      .map((col) => {
        const value = ticket[col.key as keyof Ticket];
        const formatted = col.formatter
          ? col.formatter(value, ticket)
          : String(value || '');
        // Échapper les guillemets et entourer de guillemets
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Combiner
  const csv = [headers, ...rows].join('\n');

  // Télécharger
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

// ============================================
// EXCEL EXPORT (XLSX via CSV avec BOM)
// ============================================

export const exportToExcel = (
  tickets: Ticket[],
  columns: ExportColumn[] = DEFAULT_EXPORT_COLUMNS,
  filename: string = 'tickets'
): void => {
  // En-têtes
  const headers = columns.map((col) => col.label).join('\t');

  // Lignes de données
  const rows = tickets.map((ticket) => {
    return columns
      .map((col) => {
        const value = ticket[col.key as keyof Ticket];
        const formatted = col.formatter
          ? col.formatter(value, ticket)
          : String(value || '');
        // Remplacer les tabs et retours à la ligne
        return formatted.replace(/[\t\n\r]/g, ' ');
      })
      .join('\t');
  });

  // Combiner avec BOM pour Excel
  const BOM = '\uFEFF';
  const content = BOM + [headers, ...rows].join('\n');

  // Télécharger comme .xls (TSV avec BOM fonctionne dans Excel)
  downloadFile(
    content,
    `${filename}.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
};

// ============================================
// PDF EXPORT (HTML to Print)
// ============================================

export const exportToPDF = (
  tickets: Ticket[],
  columns: ExportColumn[] = DEFAULT_EXPORT_COLUMNS,
  filename: string = 'tickets'
): void => {
  // Créer le contenu HTML pour impression
  const html = generatePrintableHTML(tickets, columns, filename);

  // Ouvrir dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Attendre le chargement avant d'imprimer
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

const generatePrintableHTML = (
  tickets: Ticket[],
  columns: ExportColumn[],
  title: string
): string => {
  const now = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tableHeaders = columns
    .map((col) => `<th>${col.label}</th>`)
    .join('');

  const tableRows = tickets
    .map((ticket) => {
      const cells = columns
        .map((col) => {
          const value = ticket[col.key as keyof Ticket];
          const formatted = col.formatter
            ? col.formatter(value, ticket)
            : String(value || '');
          return `<td>${escapeHTML(formatted)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} - Export</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #4F46E5;
    }
    .header h1 {
      font-size: 18px;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .header .meta {
      color: #64748b;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 8px 6px;
      border-bottom: 2px solid #e2e8f0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Export des tickets</h1>
    <p class="meta">Généré le ${now} - ${tickets.length} ticket(s)</p>
  </div>
  <table>
    <thead>
      <tr>${tableHeaders}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">
    KLY SAV - Document généré automatiquement
  </div>
</body>
</html>
  `.trim();
};

// ============================================
// UTILITIES
// ============================================

const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeHTML = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export const exportTickets = (
  tickets: Ticket[],
  options: ExportOptions
): void => {
  const filename =
    options.filename ||
    `tickets_${new Date().toISOString().split('T')[0]}`;

  // Filtrer par date si spécifié
  let filteredTickets = tickets;
  if (options.dateRange) {
    filteredTickets = tickets.filter((t) => {
      const created = new Date(t.createdAt);
      return (
        created >= options.dateRange!.start &&
        created <= options.dateRange!.end
      );
    });
  }

  switch (options.format) {
    case 'csv':
      exportToCSV(filteredTickets, undefined, filename);
      break;
    case 'excel':
      exportToExcel(filteredTickets, undefined, filename);
      break;
    case 'pdf':
      exportToPDF(filteredTickets, undefined, filename);
      break;
  }
};
