import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Minimize2,
  Maximize2,
  X,
  MessageSquare,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { geminiService, ChatMessage } from '@/services/geminiService';
import { cn } from '@/utils/helpers';

interface SmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalate: (summary: string, context: Record<string, unknown>) => void;
  orderContext?: {
    orderNumber?: string;
    productName?: string;
  };
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

const QUICK_ACTIONS = [
  { id: 'status', label: 'Suivre ma commande', icon: '📦' },
  { id: 'technical', label: 'Problème technique', icon: '🔧' },
  { id: 'invoice', label: 'Obtenir ma facture', icon: '📄' },
  { id: 'return', label: 'Retourner un produit', icon: '↩️' },
];

const SUGGESTIONS = [
  'Mon équipement ne démarre plus',
  'Ma livraison est en retard',
  'Je cherche ma facture',
  'J\'ai un code erreur',
];

export function SmartAssistant({
  isOpen,
  onClose,
  onEscalate,
  orderContext,
  minimized = false,
  onToggleMinimize
}: SmartAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Gemini
  useEffect(() => {
    const init = async () => {
      const success = await geminiService.initialize();
      setIsInitialized(success);

      // Add welcome message
      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: `Bonjour ! Je suis l'assistant virtuel KLY. 🤖\n\nJe suis là pour vous aider avec vos questions techniques, le suivi de vos commandes ou toute autre demande.\n\n**Comment puis-je vous aider ?**`,
            timestamp: new Date()
          }
        ]);
      }
    };
    init();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, minimized]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    setShowSuggestions(false);
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await geminiService.chat(messageText, orderContext);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if we should suggest escalation
      if (shouldSuggestEscalation(response)) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '💡 **Souhaitez-vous créer un ticket** pour qu\'un de nos techniciens vous assiste personnellement ?',
            timestamp: new Date()
          }]);
        }, 1000);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Désolé, je rencontre un problème technique. Vous pouvez créer un ticket pour une assistance personnalisée.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldSuggestEscalation = (response: string): boolean => {
    const escalationKeywords = [
      'technicien',
      'intervention',
      'créer un ticket',
      'persiste',
      'nécessaire',
      'remplacement'
    ];
    return escalationKeywords.some(keyword =>
      response.toLowerCase().includes(keyword)
    );
  };

  const handleQuickAction = (actionId: string) => {
    const messages: Record<string, string> = {
      status: 'Je voudrais suivre ma commande',
      technical: 'J\'ai un problème technique avec mon équipement',
      invoice: 'Je cherche à télécharger ma facture',
      return: 'Je souhaite retourner un produit'
    };
    handleSend(messages[actionId]);
  };

  const handleEscalate = () => {
    const conversationSummary = messages
      .map(m => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
      .join('\n');

    onEscalate(conversationSummary, {
      orderContext,
      messageCount: messages.length,
      startTime: messages[0]?.timestamp
    });
  };

  const handleReset = () => {
    geminiService.clearHistory();
    setMessages([{
      role: 'assistant',
      content: 'Conversation réinitialisée. Comment puis-je vous aider ?',
      timestamp: new Date()
    }]);
    setShowSuggestions(true);
  };

  const handleFeedback = (messageIndex: number, isPositive: boolean) => {
    // Store feedback for analytics
    console.log(`Feedback for message ${messageIndex}: ${isPositive ? 'positive' : 'negative'}`);
  };

  if (!isOpen) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggleMinimize}
          className="bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-105"
        >
          <div className="relative">
            <Bot size={24} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-semibold">Assistant KLY</h3>
            <div className="flex items-center text-xs text-primary-100">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
              En ligne • Propulsé par IA
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleReset}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minimize2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-1">
                  <Sparkles size={14} className="text-primary-500 mr-1" />
                  <span className="text-xs text-primary-600 font-medium">Assistant IA</span>
                </div>
              )}
              <div
                className={cn(
                  'text-sm whitespace-pre-wrap',
                  message.role === 'assistant' && 'prose prose-sm max-w-none'
                )}
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }}
              />

              {/* Feedback buttons for assistant messages */}
              {message.role === 'assistant' && index > 0 && (
                <div className="flex items-center justify-end mt-2 space-x-2">
                  <button
                    onClick={() => handleFeedback(index, true)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Utile"
                  >
                    <ThumbsUp size={14} />
                  </button>
                  <button
                    onClick={() => handleFeedback(index, false)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Pas utile"
                  >
                    <ThumbsDown size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin text-primary-500" />
                <span className="text-sm text-gray-500">Réflexion en cours...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && messages.length <= 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium flex items-center">
              <Lightbulb size={12} className="mr-1" />
              Suggestions
            </p>
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion)}
                className="block w-full text-left text-sm px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700 hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap"
              >
                <span className="mr-1">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escalate button */}
      {messages.length > 4 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-orange-50">
          <button
            onClick={handleEscalate}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <MessageSquare size={16} className="mr-2" />
            Parler à un conseiller humain
            <ArrowRight size={14} className="ml-2" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className={cn(
              'p-2.5 rounded-full transition-all',
              input.trim()
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400'
            )}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Propulsé par Google Gemini • Réponse instantanée 24/7
        </p>
      </div>
    </div>
  );
}

export default SmartAssistant;
