import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  FolderOpen,
  ExternalLink,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { brandsApi } from '@/services/api';
import { Brand } from '@/types';

export function KnowledgeBasePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const data = await brandsApi.getAll();
        setBrands(data);
      } catch (error) {
        console.error('Erreur chargement marques:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, []);

  // Filter brands by search
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase()) ||
    (brand.description && brand.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Base de connaissances</h1>
        <p className="text-primary-100 mb-6">
          Accédez aux fiches techniques et documentations par marque.
        </p>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher une marque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      {/* Brands Grid */}
      <div>
        <h2 className="section-title mb-4">Marques disponibles</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              {search ? 'Aucune marque trouvée' : 'Aucune marque disponible'}
            </h3>
            <p className="text-gray-500 mt-1">
              {search
                ? 'Essayez avec un autre terme de recherche'
                : 'Les fiches techniques seront bientôt disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                className="card p-5 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4 mb-4">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="w-14 h-14 object-contain rounded-lg border border-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {brand.name}
                    </h3>
                    {brand.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {brand.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {brand.folderUrl && (
                    <a
                      href={brand.folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors flex-1 justify-center"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Fiches techniques
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {brand.websiteUrl && (
                    <a
                      href={brand.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      title="Site officiel"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Besoin d'une assistance technique ?
        </h2>
        <p className="text-gray-600 mb-6">
          Notre équipe est disponible pour vous accompagner sur vos équipements.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/tickets/new" className="btn-primary">
            Créer un ticket
          </Link>
          <Link to="/faq" className="btn-outline">
            Consulter la FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeBasePage;
