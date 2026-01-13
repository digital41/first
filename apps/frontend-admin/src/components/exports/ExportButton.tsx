import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Ticket } from '../../types';
import {
  exportTickets,
  ExportFormat,
  ExportOptions,
} from '../../lib/exportHelpers';

// ============================================
// EXPORT BUTTON COMPONENT
// ============================================
// Bouton dropdown pour exporter les tickets

interface ExportButtonProps {
  tickets: Ticket[];
  disabled?: boolean;
  variant?: 'button' | 'dropdown' | 'icon';
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  tickets,
  disabled = false,
  variant = 'dropdown',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowDateFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    if (tickets.length === 0) {
      alert('Aucun ticket à exporter');
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        format,
        filename: `tickets_${new Date().toISOString().split('T')[0]}`,
      };

      // Ajouter le filtre de date si défini
      if (dateStart && dateEnd) {
        options.dateRange = {
          start: new Date(dateStart),
          end: new Date(dateEnd + 'T23:59:59'),
        };
      }

      // Petit délai pour montrer le loading
      await new Promise((resolve) => setTimeout(resolve, 300));

      exportTickets(tickets, options);
      setIsOpen(false);
      setShowDateFilter(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={() => handleExport('excel')}
        disabled={disabled || isExporting || tickets.length === 0}
        className={`p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Exporter en Excel"
      >
        {isExporting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={() => handleExport('excel')}
        disabled={disabled || isExporting || tickets.length === 0}
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Exporter</span>
      </button>
    );
  }

  // Variant: dropdown (default)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || tickets.length === 0}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Exporter</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          {/* Export Options */}
          <div className="p-2">
            <p className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
              Format d'export
            </p>

            <button
              onClick={() => handleExport('excel')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Excel (.xls)</p>
                <p className="text-xs text-slate-500">
                  Format tableur compatible
                </p>
              </div>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">CSV</p>
                <p className="text-xs text-slate-500">Format texte universel</p>
              </div>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5 text-red-600" />
              <div className="text-left">
                <p className="font-medium">PDF (Impression)</p>
                <p className="text-xs text-slate-500">
                  Ouvre la fenêtre d'impression
                </p>
              </div>
            </button>
          </div>

          {/* Date Filter */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <span className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Filtrer par date</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showDateFilter ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDateFilter && (
              <div className="px-4 pb-3 space-y-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {dateStart && dateEnd && (
                  <button
                    onClick={() => {
                      setDateStart('');
                      setDateEnd('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Effacer les dates
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {tickets.length} ticket{tickets.length > 1 ? 's' : ''} à exporter
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
