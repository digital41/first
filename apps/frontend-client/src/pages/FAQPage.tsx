import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Wrench,
  Truck,
  CreditCard,
  MessageSquare,
  PlusCircle,
  Book,
  ExternalLink
} from 'lucide-react';
import { knowledgeApi } from '@/services/api';
import { cn } from '@/utils/helpers';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Toutes les questions', icon: HelpCircle },
  { id: 'general', label: 'Général', icon: Book },
  { id: 'technical', label: 'Technique', icon: Wrench },
  { id: 'delivery', label: 'Livraison', icon: Truck },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
];

export function FAQPage() {
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFAQ = async () => {
      try {
        const items = await knowledgeApi.getFAQ();
        setFaqItems(items);
      } catch (error) {
        console.error('Error fetching FAQ:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQ();
  }, []);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const filteredItems = faqItems.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="page-title text-3xl mb-2">Comment pouvons-nous vous aider ?</h1>
        <p className="page-subtitle">
          Consultez notre FAQ ou contactez notre équipe support.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <Icon size={16} className="mr-2" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* FAQ Items */}
      <div className="max-w-3xl mx-auto space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun résultat trouvé
            </h3>
            <p className="text-gray-500 mb-4">
              Essayez une autre recherche ou contactez notre support.
            </p>
            <Link to="/tickets/new" className="btn-primary">
              <MessageSquare size={18} className="mr-2" />
              Contacter le support
            </Link>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div key={index} className="card overflow-hidden">
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                {expandedItems.has(index) ? (
                  <ChevronUp className="text-gray-400 shrink-0" size={20} />
                ) : (
                  <ChevronDown className="text-gray-400 shrink-0" size={20} />
                )}
              </button>
              {expandedItems.has(index) && (
                <div className="px-4 pb-4 text-gray-600 border-t border-gray-100 pt-4">
                  <p className="whitespace-pre-line">{item.answer}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Contact CTA */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Vous n'avez pas trouvé votre réponse ?</h2>
          <p className="text-primary-100 mb-6">
            Notre équipe support est disponible pour vous aider du lundi au vendredi.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/tickets/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              <PlusCircle size={18} className="mr-2" />
              Créer un ticket
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              <MessageSquare size={18} className="mr-2" />
              Nous contacter
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Liens utiles</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/knowledge"
            className="card p-4 hover:shadow-md transition-shadow flex items-center"
          >
            <Book className="text-primary-600 mr-3" size={24} />
            <div>
              <p className="font-medium text-gray-900">Documentation</p>
              <p className="text-sm text-gray-500">Guides et manuels</p>
            </div>
          </Link>
          <Link
            to="/tickets"
            className="card p-4 hover:shadow-md transition-shadow flex items-center"
          >
            <MessageSquare className="text-primary-600 mr-3" size={24} />
            <div>
              <p className="font-medium text-gray-900">Mes tickets</p>
              <p className="text-sm text-gray-500">Suivre mes demandes</p>
            </div>
          </Link>
          <Link
            to="/orders"
            className="card p-4 hover:shadow-md transition-shadow flex items-center"
          >
            <Truck className="text-primary-600 mr-3" size={24} />
            <div>
              <p className="font-medium text-gray-900">Mes commandes</p>
              <p className="text-sm text-gray-500">Suivi de livraison</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default FAQPage;
