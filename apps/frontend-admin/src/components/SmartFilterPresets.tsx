import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  AlertTriangle,
  User,
  Inbox,
  Filter,
  Plus,
  X,
  Star,
} from 'lucide-react';
import { TicketFilters, TicketStatus, TicketPriority } from '../types';

// ============================================
// SMART FILTER PRESETS COMPONENT
// ============================================
// Filtres prédéfinis et personnalisés pour accès rapide
// Stockés en localStorage

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  filters: TicketFilters;
  isCustom?: boolean;
  isFavorite?: boolean;
}

interface SmartFilterPresetsProps {
  currentFilters: TicketFilters;
  onApplyFilters: (filters: TicketFilters) => void;
  currentUserId?: string;
}

const STORAGE_KEY = 'kly_admin_filter_presets';

// Presets par défaut
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'urgent',
    name: 'Urgents',
    icon: 'alert',
    filters: { priority: TicketPriority.URGENT },
  },
  {
    id: 'sla-risk',
    name: 'SLA à risque',
    icon: 'clock',
    filters: { status: TicketStatus.OPEN }, // Would need backend support for SLA filtering
  },
  {
    id: 'unassigned',
    name: 'Non assignés',
    icon: 'inbox',
    filters: { assignedToId: 'unassigned' },
  },
  {
    id: 'my-tickets',
    name: 'Mes tickets',
    icon: 'user',
    filters: {}, // Will be filled with currentUserId
  },
  {
    id: 'open',
    name: 'Ouverts',
    icon: 'inbox',
    filters: { status: TicketStatus.OPEN },
  },
  {
    id: 'in-progress',
    name: 'En cours',
    icon: 'zap',
    filters: { status: TicketStatus.IN_PROGRESS },
  },
];

const SmartFilterPresets: React.FC<SmartFilterPresetsProps> = ({
  currentFilters,
  onApplyFilters,
  currentUserId,
}) => {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const customPresets = saved ? JSON.parse(saved) : [];
      setPresets([...DEFAULT_PRESETS, ...customPresets]);
    } catch {
      setPresets(DEFAULT_PRESETS);
    }
  };

  const saveCustomPresets = (customPresets: FilterPreset[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    let filters = { ...preset.filters };

    // Special handling for "my-tickets"
    if (preset.id === 'my-tickets' && currentUserId) {
      filters.assignedToId = currentUserId;
    }

    setActivePresetId(preset.id);
    onApplyFilters(filters);
  };

  const handleClearFilters = () => {
    setActivePresetId(null);
    onApplyFilters({});
  };

  const handleSaveCurrentFilters = () => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      icon: 'star',
      filters: currentFilters,
      isCustom: true,
    };

    const customPresets = presets.filter((p) => p.isCustom);
    customPresets.push(newPreset);
    saveCustomPresets(customPresets);

    setPresets([...DEFAULT_PRESETS, ...customPresets]);
    setNewPresetName('');
    setShowSaveModal(false);
    setActivePresetId(newPreset.id);
  };

  const handleDeletePreset = (presetId: string) => {
    const customPresets = presets.filter((p) => p.isCustom && p.id !== presetId);
    saveCustomPresets(customPresets);
    setPresets([...DEFAULT_PRESETS, ...customPresets]);

    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      alert: <AlertTriangle className="w-3.5 h-3.5" />,
      clock: <Clock className="w-3.5 h-3.5" />,
      inbox: <Inbox className="w-3.5 h-3.5" />,
      user: <User className="w-3.5 h-3.5" />,
      zap: <Zap className="w-3.5 h-3.5" />,
      star: <Star className="w-3.5 h-3.5" />,
      filter: <Filter className="w-3.5 h-3.5" />,
    };
    return icons[iconName] || icons.filter;
  };

  const hasActiveFilters = Object.keys(currentFilters).some(
    (key) => currentFilters[key as keyof TicketFilters]
  );

  // Sort: favorites first, then default, then custom
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (!a.isCustom && b.isCustom) return -1;
    if (a.isCustom && !b.isCustom) return 1;
    return 0;
  });

  return (
    <div className="mb-4">
      <div className="flex items-center flex-wrap gap-2">
        {/* Preset Buttons */}
        {sortedPresets.map((preset) => (
          <div key={preset.id} className="relative group">
            <button
              onClick={() => handleApplyPreset(preset)}
              className={`
                inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-200 border
                ${
                  activePresetId === preset.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }
              `}
            >
              {getIcon(preset.icon)}
              <span>{preset.name}</span>
              {preset.isFavorite && (
                <Star className="w-3 h-3 fill-current" />
              )}
            </button>

            {/* Delete button for custom presets */}
            {preset.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePreset(preset.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>
        )}

        {/* Save Current Filters */}
        {hasActiveFilters && !activePresetId && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sauvegarder</span>
          </button>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 w-80">
            <h4 className="font-semibold text-slate-800 mb-3">
              Sauvegarder ce filtre
            </h4>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nom du filtre..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCurrentFilters}
                disabled={!newPresetName.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SmartFilterPresets;
