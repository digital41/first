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
import { geminiService, ChatMessage, SageContext } from '@/services/geminiService';
import { ordersApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
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
  { id: 'commercial', label: 'Question produit', icon: '🛒' },
  { id: 'status', label: 'Suivi commande', icon: '📦' },
  { id: 'technical', label: 'Support technique', icon: '🔧' },
  { id: 'invoice', label: 'Facturation', icon: '💰' },
];

const SUGGESTIONS = [
  'Quel produit me conseilles-tu pour... ?',
  'Où en est ma commande ?',
  'Mon équipement affiche une erreur',
  'J\'ai besoin de ma facture',
];

export function SmartAssistant({
  isOpen,
  onClose,
  onEscalate,
  orderContext,
  minimized = false,
  onToggleMinimize
}: SmartAssistantProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sageData, setSageData] = useState<SageContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load SAGE orders for context
  useEffect(() => {
    const loadSageData = async () => {
      if (!user) return;
      try {
        const orders = await ordersApi.getAll(1, 20); // Get last 20 orders
        setSageData({
          customerName: user.displayName || user.email,
          customerCode: user.customerCode,
          orders: orders.map(o => ({
            orderNumber: o.orderNumber,
            status: o.status,
            totalAmount: o.totalAmount,
            orderDate: o.orderDate,
            items: o.lines?.map(l => ({
              productName: l.productName,
              quantity: l.quantity,
              unitPrice: l.unitPrice
            })) || o.items?.map(i => ({
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice
            }))
          }))
        });
      } catch (error) {
        console.warn('Could not load SAGE data for Lumo:', error);
      }
    };
    loadSageData();
  }, [user]);

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
            content: `Bonjour ! Je suis **Lumo**, votre assistant intelligent KLY Groupe. ✨\n\nJe suis là pour vous accompagner sur :\n• **Questions commerciales** - produits, tarifs, disponibilités\n• **Suivi client Sage** - commandes, livraisons, factures\n• **Support technique** - dépannage, codes erreur, guides\n\n**Comment puis-je vous aider aujourd'hui ?**`,
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
      // Pass SAGE data to Lumo for real data access
      const response = await geminiService.chat(messageText, {
        ...orderContext,
        sageData: sageData || undefined
      });

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
        content: 'Désolé, je rencontre un souci technique momentané. Vous pouvez créer un ticket pour qu\'un conseiller vous assiste directement.',
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
    const quickMessages: Record<string, string> = {
      commercial: 'J\'ai une question sur vos produits',
      status: 'Où en est ma commande ?',
      technical: 'J\'ai un problème technique avec mon équipement',
      invoice: 'J\'ai besoin d\'une facture'
    };
    handleSend(quickMessages[actionId]);
  };

  const handleEscalate = () => {
    const conversationSummary = messages
      .map(m => `${m.role === 'user' ? 'Client' : 'Lumo'}: ${m.content}`)
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
      content: '✨ Nouvelle conversation ! Je suis Lumo, prêt à vous aider. Comment puis-je vous accompagner ?',
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
    <div className="fixed inset-x-2 bottom-2 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 h-[calc(100vh-5rem)] sm:h-[600px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 sm:p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center mr-2 sm:mr-3 shrink-0">
            <Bot size={20} className="sm:hidden" />
            <Bot size={24} className="hidden sm:block" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base">Lumo</h3>
            <div className="flex items-center text-[10px] sm:text-xs text-primary-100">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse shrink-0" />
              <span className="truncate">Assistant IA KLY</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={handleReset}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <RotateCcw size={16} className="sm:hidden" />
            <RotateCcw size={18} className="hidden sm:block" />
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Minimize2 size={16} className="sm:hidden" />
            <Minimize2 size={18} className="hidden sm:block" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} className="sm:hidden" />
            <X size={18} className="hidden sm:block" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
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
                  <span className="text-xs text-primary-600 font-medium">Lumo</span>
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
                <span className="text-sm text-gray-500">Lumo réfléchit...</span>
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
        <div className="px-3 sm:px-4 py-2 border-t border-gray-100 bg-white shrink-0">
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-full text-[11px] sm:text-xs font-medium text-gray-700 hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap"
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
        <div className="px-3 sm:px-4 py-2 border-t border-gray-100 bg-orange-50 shrink-0">
          <button
            onClick={handleEscalate}
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-orange-700 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <MessageSquare size={14} className="mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Parler à un conseiller humain</span>
            <ArrowRight size={12} className="ml-1.5 sm:ml-2 shrink-0" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez votre question..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className={cn(
              'p-2 sm:p-2.5 rounded-full transition-all shrink-0',
              input.trim()
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400'
            )}
          >
            <Send size={16} className="sm:hidden" />
            <Send size={18} className="hidden sm:block" />
          </button>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center">
          Lumo - Assistant IA KLY Groupe
        </p>
      </div>
    </div>
  );
}

export default SmartAssistant;
