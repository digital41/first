import React, { useState } from 'react';
import { Loader2, ArrowLeft, Building2, FileText, Package, User, AlertTriangle } from 'lucide-react';
import { Intent, Order } from '../types';
import { ApiService, ApiMode } from '../services/api';

interface AuthContextualProps {
  intent: Intent;
  onAuthenticated: (order: Order, mode: ApiMode, message?: string) => void;
  onBack: () => void;
}

const AuthContextual: React.FC<AuthContextualProps> = ({ intent, onAuthenticated, onBack }) => {
  const [orderId, setOrderId] = useState('');
  const [plNumber, setPlNumber] = useState('');
  const [blNumber, setBlNumber] = useState('');

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  const isInvoice = intent === Intent.INVOICE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWarning('');

    // Validation : Au moins un champ doit être rempli
    if (!orderId.trim() && !plNumber.trim() && !blNumber.trim()) {
        setError("Veuillez renseigner au moins une référence pour continuer.");
        setLoading(false);
        return;
    }

    try {
      const result = await ApiService.login(orderId, plNumber, blNumber);

      // Afficher un avertissement en mode fallback mais continuer
      if (result.mode === 'fallback' && result.message) {
        setWarning(result.message);
        // Petit délai pour que l'utilisateur voie l'avertissement
        setTimeout(() => {
          onAuthenticated(result.data, result.mode, result.message);
        }, 1500);
      } else {
        onAuthenticated(result.data, result.mode);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'authentification";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getIntentTitle = () => {
    switch (intent) {
      case Intent.TECHNICAL: return "Identification du dossier technique";
      case Intent.DELIVERY: return "Recherche de l'expédition";
      case Intent.INVOICE: return "Espace Facturation";
      case Intent.RETURN: return "Dossier de retour";
      default: return "Identification Client Pro";
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-slide-up">
      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour
      </button>

      <div className="text-center mb-8">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{getIntentTitle()}</h2>
        <p className="text-slate-500 mt-2">
          {isInvoice 
            ? "Veuillez vous identifier pour accéder aux documents."
            : <span>Pour accéder à votre dossier, renseignez <span className="font-bold text-slate-700">l'une</span> des références ci-dessous.</span>
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* Champ Principal (Commande ou Facture/Client) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {isInvoice ? "Numéro de Facture ou Code Client" : "Numéro de Commande"}
          </label>
          <div className="relative group">
             {isInvoice ? (
                 <User className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
             ) : (
                 <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
             )}
             <input
                type="text"
                placeholder={isInvoice ? "Ex: FC-2023-001 ou KLY-CLIENT" : "Ex: BC1020230"}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase placeholder:normal-case"
             />
          </div>
        </div>

        {/* Champs PL et BL : Masqués si Facturation */}
        {!isInvoice && (
            <>
                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-medium">OU</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Numéro de PL (Packing List)</label>
                <div className="relative group">
                    <Package className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Ex: PL22025285"
                        value={plNumber}
                        onChange={(e) => setPlNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase placeholder:normal-case"
                    />
                </div>
                </div>

                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-medium">OU</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Numéro de BL (Bon de Livraison)</label>
                <div className="relative group">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Ex: BL1212202501"
                        value={blNumber}
                        onChange={(e) => setBlNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase placeholder:normal-case"
                    />
                </div>
                </div>
            </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center animate-fade-in">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {warning && (
          <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200 flex items-center animate-fade-in">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            {warning}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg transition-all flex justify-center items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accéder au dossier"}
        </button>
      </form>
    </div>
  );
};

export default AuthContextual;