import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  Zap,
  Shield,
  Clock,
  Award,
  ChevronRight,
  Play,
  Headphones
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GuidedJourney } from '@/components/smart/GuidedJourney';
import { SmartAssistant } from '@/components/smart/SmartAssistant';
import { cn } from '@/utils/helpers';

type ViewMode = 'home' | 'guided' | 'chat';

export function SmartHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);

  const handleGuidedComplete = (result: {
    resolved: boolean;
    needsTicket: boolean;
    ticketData?: {
      title: string;
      description: string;
      issueType: string;
      priority: string;
      tags: string[];
    };
  }) => {
    if (result.needsTicket && result.ticketData) {
      // Navigate to ticket creation with pre-filled data
      navigate('/tickets/new', {
        state: {
          prefill: result.ticketData
        }
      });
    } else if (result.resolved) {
      // Show success and return to home
      setTimeout(() => setViewMode('home'), 2000);
    }
  };

  const handleChatbotEscalate = (summary: string, context: Record<string, unknown>) => {
    navigate('/tickets/new', {
      state: {
        prefill: {
          title: 'Demande suite conversation avec Lumo',
          description: `Résumé de la conversation avec Lumo:\n\n${summary}`,
          issueType: 'OTHER',
          priority: 'MEDIUM'
        }
      }
    });
  };

  // Home view - Premium landing
  if (viewMode === 'home') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center mb-4">
              <div className="flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                <Sparkles size={14} className="mr-1" />
                Assistance intelligente
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Bonjour{user?.displayName ? `, ${user.displayName}` : ''} !
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Notre assistant intelligent peut résoudre 80% des problèmes en quelques clics.
              Décrivez votre situation et laissez-nous vous guider.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setViewMode('guided')}
                className="flex items-center justify-center px-6 py-4 bg-white text-primary-700 rounded-xl font-semibold hover:bg-primary-50 transition-all hover:scale-105 shadow-lg"
              >
                <Play size={20} className="mr-2" />
                Démarrer le diagnostic guidé
                <ArrowRight size={18} className="ml-2" />
              </button>
              <button
                onClick={() => setShowChatbot(true)}
                className="flex items-center justify-center px-6 py-4 bg-white/10 backdrop-blur text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                <Bot size={20} className="mr-2" />
                Discuter avec Lumo
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-primary-600">80%</div>
            <p className="text-sm text-gray-600 mt-1">Résolution automatique</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-primary-600">&lt;2min</div>
            <p className="text-sm text-gray-600 mt-1">Temps moyen</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-primary-600">24/7</div>
            <p className="text-sm text-gray-600 mt-1">Disponibilité</p>
          </div>
          <div className="card p-5 text-center">
            <div className="text-3xl font-bold text-primary-600">98%</div>
            <p className="text-sm text-gray-600 mt-1">Satisfaction</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Accès rapide</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => setViewMode('guided')}
              className="card p-6 text-left hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="text-orange-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Problème technique</h3>
              <p className="text-sm text-gray-500 mb-3">
                Panne, dysfonctionnement, code erreur
              </p>
              <span className="text-sm font-medium text-primary-600 flex items-center">
                Diagnostiquer <ChevronRight size={16} className="ml-1" />
              </span>
            </button>

            <button
              onClick={() => navigate('/orders')}
              className="card p-6 text-left hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Clock className="text-blue-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Suivi de commande</h3>
              <p className="text-sm text-gray-500 mb-3">
                Localisation, livraison, retard
              </p>
              <span className="text-sm font-medium text-primary-600 flex items-center">
                Suivre <ChevronRight size={16} className="ml-1" />
              </span>
            </button>

            <button
              onClick={() => navigate('/tickets')}
              className="card p-6 text-left hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="text-green-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Mes demandes</h3>
              <p className="text-sm text-gray-500 mb-3">
                Suivi de vos tickets en cours
              </p>
              <span className="text-sm font-medium text-primary-600 flex items-center">
                Voir <ChevronRight size={16} className="ml-1" />
              </span>
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Une expérience SAV nouvelle génération
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="text-primary-600" size={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Lumo - Assistant IA</h3>
              <p className="text-sm text-gray-600">
                Votre assistant technique & client, capable de répondre aux questions commerciales, suivi Sage et techniques produits.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-primary-600" size={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Diagnostic intelligent</h3>
              <p className="text-sm text-gray-600">
                Notre système analyse votre problème et vous guide vers la solution la plus adaptée.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Headphones className="text-primary-600" size={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Escalade fluide</h3>
              <p className="text-sm text-gray-600">
                Si besoin, un technicien qualifié prend le relais avec tout le contexte de votre demande.
              </p>
            </div>
          </div>
        </div>

        {/* Chatbot button (fixed) */}
        {!showChatbot && (
          <button
            onClick={() => setShowChatbot(true)}
            className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-40"
          >
            <div className="relative">
              <Bot size={24} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
          </button>
        )}

        {/* Chatbot */}
        <SmartAssistant
          isOpen={showChatbot}
          onClose={() => setShowChatbot(false)}
          onEscalate={handleChatbotEscalate}
          minimized={chatbotMinimized}
          onToggleMinimize={() => setChatbotMinimized(!chatbotMinimized)}
        />
      </div>
    );
  }

  // Guided journey view
  if (viewMode === 'guided') {
    return (
      <div className="min-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Diagnostic guidé</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Répondez aux questions pour trouver la solution à votre problème
            </p>
          </div>
          <button
            onClick={() => setViewMode('home')}
            className="text-sm text-gray-500 hover:text-gray-700 self-start sm:self-auto"
          >
            ← Retour à l'accueil
          </button>
        </div>

        <GuidedJourney
          onComplete={handleGuidedComplete}
          onOpenChatbot={() => {
            setViewMode('home');
            setShowChatbot(true);
          }}
        />

        {/* Chatbot button */}
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-40"
        >
          <div className="relative">
            <Bot size={24} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
        </button>

        <SmartAssistant
          isOpen={showChatbot}
          onClose={() => setShowChatbot(false)}
          onEscalate={handleChatbotEscalate}
          minimized={chatbotMinimized}
          onToggleMinimize={() => setChatbotMinimized(!chatbotMinimized)}
        />
      </div>
    );
  }

  return null;
}

export default SmartHomePage;
