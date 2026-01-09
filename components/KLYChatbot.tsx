import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertTriangle, Loader2 } from 'lucide-react';
import { Chat } from '@google/genai';
import { Order, Intent, ChatMessage, OrderItem } from '../types';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';

interface KLYChatbotProps {
  order: Order;
  intent: Intent;
  subIntent: string;
  selectedProducts: OrderItem[];
  onEscalate: (history: string) => void;
}

const KLYChatbot: React.FC<KLYChatbotProps> = ({ order, intent, subIntent, selectedProducts, onEscalate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initError, setInitError] = useState(false);

  useEffect(() => {
    // Initialize Gemini Chat
    const session = createChatSession(order, intent, subIntent, selectedProducts);
    if (session) {
      chatSessionRef.current = session;
      const productNames = selectedProducts.map(p => p.name).join(', ');
      // Initial greeting from Bot
      const initialGreeting: ChatMessage = {
        id: 'init',
        role: 'model',
        text: `Bonjour ${order.customerName}. Je suis l'expert KLY. Je vois que vous avez déclaré : "${subIntent}" concernant : ${productNames}. Pouvez-vous me donner plus de détails techniques ?`,
        timestamp: new Date()
      };
      setMessages([initialGreeting]);
    } else {
      setInitError(true);
    }
  }, [order, intent, subIntent, selectedProducts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const replyText = await sendMessageToGemini(chatSessionRef.current, userMsg.text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: replyText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const getHistoryString = () => {
    return messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  };

  if (initError) {
    return (
      <div className="bg-red-50 p-6 rounded-lg text-center text-red-600">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
        <p>Le service d'IA est indisponible (Clé API manquante). Veuillez contacter le support standard.</p>
        <button onClick={() => onEscalate("")} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Ouvrir un ticket manuel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 rounded-full mr-3">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Support Expert KLY</h3>
            <p className="text-xs text-slate-300 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
              Disponible
            </p>
          </div>
        </div>
        <button 
          onClick={() => onEscalate(getHistoryString())}
          className="text-xs bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded transition-colors"
        >
          Parler à un humain
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-800 text-white rounded-br-none'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[10px] block mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Décrivez votre problème technique..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-slate-700 placeholder-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 disabled:hover:bg-blue-800 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KLYChatbot;