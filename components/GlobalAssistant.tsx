import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { Chat } from '@google/genai';
import { createGlobalAssistantSession, sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

const GlobalAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialisation unique
    const session = createGlobalAssistantSession();
    if (session) {
        chatRef.current = session;
        setMessages([{
            id: 'welcome',
            role: 'model',
            text: "Bonjour 👋 Je suis l'assistant KLY. Besoin d'aide pour naviguer ?",
            timestamp: new Date()
        }]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatRef.current) return;

    const userText = input;
    setInput('');
    
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        text: userText,
        timestamp: new Date()
    }]);

    setIsTyping(true);

    const response = await sendMessageToGemini(chatRef.current, userText);

    setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date()
    }]);
    
    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Fenêtre de Chat */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up flex flex-col h-[500px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Assistant KLY</h3>
                        <p className="text-[10px] text-slate-300">Guide Virtuel</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 scrollbar-hide">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-slate-200 rounded-full px-3 py-2 flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Une question ?"
                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                    type="submit" 
                    disabled={!input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
      )}

      {/* Bouton Flottant (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto group flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 transition-all duration-300 transform hover:scale-110 ${
            isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
        }`}
      >
        {isOpen ? (
            <X className="w-6 h-6 text-white" />
        ) : (
            <MessageCircle className="w-7 h-7 text-white" />
        )}
        
        {/* Notification dot if closed */}
        {!isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-slate-50 rounded-full animate-ping"></span>
        )}
        {!isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-slate-50 rounded-full"></span>
        )}
      </button>
    </div>
  );
};

export default GlobalAssistant;