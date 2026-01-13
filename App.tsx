import React, { useState } from 'react';
import { Intent, Order, OrderItem } from './types';
import { ApiMode } from './services/api';
import { AuthProvider } from './contexts/AuthContext';
import DecisionTree from './components/DecisionTree';
import SubDecision from './components/SubDecision';
import AuthContextual from './components/AuthContextual';
import SelfService from './components/SelfService';
import KLYChatbot from './components/KLYChatbot';
import EscalationForm from './components/EscalationForm';
import TicketLookup from './components/TicketLookup';
import GlobalAssistant from './components/GlobalAssistant';
import ErrorBoundary from './components/ErrorBoundary';
import { WifiOff } from 'lucide-react';

// ============================================
// FRONTEND CLIENT SAV
// ============================================
// Ce frontend est réservé aux clients.
// L'administration est sur une application séparée.

enum Step {
  DECISION = 'DECISION',
  SUB_DECISION = 'SUB_DECISION',
  AUTH = 'AUTH',
  SELF_SERVICE = 'SELF_SERVICE',
  CHAT = 'CHAT',
  ESCALATION = 'ESCALATION',
  TICKET_LOOKUP = 'TICKET_LOOKUP',
  SUCCESS = 'SUCCESS',
}

const AppContent: React.FC = () => {
  const [step, setStep] = useState<Step>(Step.DECISION);
  const [intent, setIntent] = useState<Intent>(Intent.NONE);
  const [subIntent, setSubIntent] = useState<string>("");
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [chatHistory, setChatHistory] = useState('');
  const [apiMode, setApiMode] = useState<ApiMode>('online');

  // Step 1 -> 1.5 (Sub Decision)
  const handleDecision = (selectedIntent: Intent) => {
    setIntent(selectedIntent);
    setStep(Step.SUB_DECISION);
  };

  // Step 1 -> Ticket Lookup
  const handleLookup = () => {
    setStep(Step.TICKET_LOOKUP);
  };

  // Step 1.5 -> 2 (Auth)
  const handleSubDecision = (selectedSubIntent: string) => {
    setSubIntent(selectedSubIntent);
    setStep(Step.AUTH);
  };

  // Step 2 -> 3 (Self Service) DIRECTEMENT
  const handleAuthenticated = (order: Order, mode: ApiMode) => {
    setCurrentOrder(order);
    setSelectedProducts(order.items);
    setApiMode(mode);
    setStep(Step.SELF_SERVICE);
  };

  // Step 3 -> Success (Exit)
  const handleSelfResolved = () => {
    alert("Merci ! KLY Groupe reste à votre disposition.");
    window.location.reload();
  };

  // Step 3 -> 4 (Bot)
  const handleNotResolved = () => {
    setStep(Step.CHAT);
  };

  // Step 3 -> 5 (Formulaire)
  const handleManualTicket = () => {
    setChatHistory("[Dossier créé via formulaire direct - Pas d'historique de chat]");
    setStep(Step.ESCALATION);
  };

  // Step 4 -> 5
  const handleEscalate = (history: string) => {
    setChatHistory(history);
    setStep(Step.ESCALATION);
  };

  // Step 5 -> Finish
  const handleTicketCreated = () => {
    setTimeout(() => {
      setStep(Step.DECISION);
      setIntent(Intent.NONE);
      setSubIntent("");
      setCurrentOrder(null);
      setSelectedProducts([]);
    }, 5000);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 text-white sticky top-0 z-50 shadow-lg shadow-indigo-200/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setStep(Step.DECISION)}>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all border border-white/20 shadow-inner">
                <span className="font-extrabold text-xl tracking-tighter text-white">K</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight leading-none text-white">KLY<span className="font-light opacity-80">Groupe</span></span>
                <span className="text-[10px] uppercase tracking-widest opacity-90 font-semibold mt-0.5 text-blue-50">Espace Client Pro</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {apiMode === 'fallback' && (
              <div className="flex items-center space-x-1.5 bg-amber-500/20 text-amber-100 px-3 py-1.5 rounded-full text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Mode hors-ligne</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">

        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
           <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-teal-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-violet-200/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <ErrorBoundary>
        <div className="w-full max-w-5xl z-10 relative">

          {step === Step.DECISION && (
            <DecisionTree onSelect={handleDecision} onLookup={handleLookup} />
          )}

          {step === Step.TICKET_LOOKUP && (
            <TicketLookup onBack={() => setStep(Step.DECISION)} />
          )}

          {step === Step.SUB_DECISION && (
            <SubDecision
              intent={intent}
              onSelect={handleSubDecision}
              onBack={() => setStep(Step.DECISION)}
            />
          )}

          {step === Step.AUTH && (
            <AuthContextual
              intent={intent}
              onAuthenticated={handleAuthenticated}
              onBack={() => setStep(Step.SUB_DECISION)}
            />
          )}

          {step === Step.SELF_SERVICE && currentOrder && (
            <SelfService
              intent={intent}
              subIntent={subIntent}
              order={currentOrder}
              selectedProducts={selectedProducts}
              onResolved={handleSelfResolved}
              onNotResolved={handleNotResolved}
              onManualTicket={handleManualTicket}
            />
          )}

          {step === Step.CHAT && currentOrder && (
            <div className="animate-fade-in max-w-3xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">Assistant de Pré-qualification</h2>
                <p className="text-slate-500">Je constitue votre dossier technique avant transmission.</p>
              </div>
              <KLYChatbot
                order={currentOrder}
                intent={intent}
                subIntent={subIntent}
                selectedProducts={selectedProducts}
                onEscalate={handleEscalate}
              />
            </div>
          )}

          {step === Step.ESCALATION && currentOrder && (
            <EscalationForm
              order={currentOrder}
              intent={intent}
              selectedProducts={selectedProducts}
              chatHistory={chatHistory}
              onTicketCreated={handleTicketCreated}
            />
          )}

        </div>
        </ErrorBoundary>
      </main>

      {/* Global AI Assistant Bubble */}
      <GlobalAssistant />

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© 2024 KLY Groupe - Portail Client Professionnel</p>
      </footer>
    </div>
  );
};

// Wrapper avec AuthProvider (conservé pour la gestion des tokens client)
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
