import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Book,
  FileText,
  Wrench,
  Settings,
  AlertTriangle,
  ChevronRight,
  Download,
  ExternalLink
} from 'lucide-react';
import { knowledgeApi } from '@/services/api';
import { cn } from '@/utils/helpers';

interface Article {
  title: string;
  content: string;
  category: string;
}

const CATEGORIES = [
  {
    id: 'guides',
    label: 'Guides de démarrage',
    description: 'Apprenez à utiliser vos équipements',
    icon: Book,
    color: 'blue',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Entretien et maintenance préventive',
    icon: Wrench,
    color: 'green',
  },
  {
    id: 'troubleshooting',
    label: 'Dépannage',
    description: 'Résoudre les problèmes courants',
    icon: AlertTriangle,
    color: 'orange',
  },
  {
    id: 'configuration',
    label: 'Configuration',
    description: 'Paramétrage et personnalisation',
    icon: Settings,
    color: 'purple',
  },
];

const FEATURED_ARTICLES = [
  {
    title: 'Guide de démarrage rapide',
    description: 'Première mise en service de votre équipement industriel',
    category: 'guides',
    readTime: '5 min',
  },
  {
    title: 'Calendrier de maintenance préventive',
    description: 'Programme de maintenance recommandé pour optimiser la durée de vie',
    category: 'maintenance',
    readTime: '8 min',
  },
  {
    title: 'Codes d\'erreur et solutions',
    description: 'Liste complète des codes d\'erreur et comment les résoudre',
    category: 'troubleshooting',
    readTime: '10 min',
  },
  {
    title: 'Configuration des paramètres avancés',
    description: 'Personnalisez les paramètres selon vos besoins de production',
    category: 'configuration',
    readTime: '7 min',
  },
];

const DOCUMENTS = [
  { name: 'Manuel utilisateur complet', format: 'PDF', size: '4.2 MB' },
  { name: 'Guide de maintenance', format: 'PDF', size: '2.1 MB' },
  { name: 'Fiches techniques produits', format: 'PDF', size: '1.8 MB' },
  { name: 'Schémas électriques', format: 'PDF', size: '3.5 MB' },
];

export function KnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await knowledgeApi.search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    const cat = CATEGORIES.find((c) => c.id === category);
    return cat?.color || 'gray';
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Base de connaissances</h1>
        <p className="text-primary-100 mb-6">
          Retrouvez toute la documentation technique et les guides d'utilisation.
        </p>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher dans la documentation..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        {/* Search results */}
        {search.length >= 2 && (
          <div className="mt-4 bg-white rounded-xl p-4 text-gray-900 max-w-xl">
            {isSearching ? (
              <p className="text-gray-500">Recherche en cours...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500">Aucun résultat trouvé</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  >
                    <p className="font-medium text-gray-900">{result.title}</p>
                    <p className="text-sm text-gray-500 truncate">{result.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categories */}
      <div>
        <h2 className="section-title mb-4">Catégories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center mb-4',
                    `bg-${category.color}-100`
                  )}
                >
                  <Icon className={`text-${category.color}-600`} size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{category.label}</h3>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured articles */}
      <div>
        <h2 className="section-title mb-4">Articles populaires</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {FEATURED_ARTICLES.map((article, index) => (
            <div
              key={index}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mb-2',
                      `bg-${getCategoryColor(article.category)}-100 text-${getCategoryColor(article.category)}-800`
                    )}
                  >
                    {CATEGORIES.find((c) => c.id === article.category)?.label}
                  </span>
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{article.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    <FileText className="inline mr-1" size={12} />
                    {article.readTime} de lecture
                  </p>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-primary-600 transition-colors shrink-0" size={20} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Downloadable documents */}
      <div>
        <h2 className="section-title mb-4">Documents téléchargeables</h2>
        <div className="card divide-y divide-gray-200">
          {DOCUMENTS.map((doc, index) => (
            <div
              key={index}
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.format} • {doc.size}
                  </p>
                </div>
              </div>
              <button className="btn-outline btn-sm">
                <Download size={16} className="mr-1" />
                Télécharger
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Help section */}
      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Besoin d'une assistance personnalisée ?
        </h2>
        <p className="text-gray-600 mb-6">
          Notre équipe technique est disponible pour vous accompagner.
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
