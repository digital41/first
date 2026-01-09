import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Calendar, User, Building2, AlertCircle, Loader2, History, ChevronRight, X } from 'lucide-react';
import { Ticket } from '../types';
import { ApiService } from '../services/api';

interface TicketLookupProps {
  onBack: () => void;
}

const TicketLookup: React.FC<TicketLookupProps> = ({ onBack }) => {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<Ticket | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
        try {
            const tickets = await ApiService.getTickets();
            // Sort by date desc
            const sorted = tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setHistory(sorted);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoadingHistory(false);
        }
    };
    loadHistory();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    
    setLoading(true);
    setResult(null);
    setError('');

    try {
        const ticket = await ApiService.getTicketById(ticketId);
        if (ticket) {
            setResult(ticket);
        } else {
            setError("Aucun dossier trouvé avec ce numéro.");
        }
    } catch (err) {
        setError("Erreur technique lors de la recherche.");
    } finally {
        setLoading(false);
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
      setTicketId(ticket.id);
      setResult(ticket);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearResult = () => {
      setResult(null);
      setTicketId('');
      setError('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-slide-up pb-12">
      <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center text-sm">
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour à l'accueil
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Suivi de dossier SAV</h2>
        <p className="text-slate-500 mb-6">Entrez le numéro de ticket reçu par email (ex: SAV-12345).</p>

        <form onSubmit={handleSearch} className="flex gap-4 mb-2">
          <div className="flex-1 relative">
             <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Numéro de dossier"
                className="w-full pl-4 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
             />
             {ticketId && (
                <button 
                    type="button" 
                    onClick={clearResult}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    <X className="w-4 h-4" />
                </button>
             )}
          </div>
          <button 
            type="submit" 
            disabled={loading || !ticketId.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </form>

        {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center animate-fade-in">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
            </div>
        )}
      </div>

      {result ? (
        <div className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-600 overflow-hidden animate-fade-in mb-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Dossier {result.id}</h3>
                    <div className="flex items-center text-sm text-slate-500 mt-1">
                        <Building2 className="w-3 h-3 mr-1" />
                        {result.companyName}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        result.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                        {result.status === 'OPEN' ? 'EN COURS' : result.status}
                    </span>
                    <button onClick={clearResult} className="text-xs text-slate-400 underline mt-2 hover:text-slate-600">
                        Fermer
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Demandeur</h4>
                    <div className="flex items-center text-slate-700">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        {result.contactName || 'Non spécifié'}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Rendez-vous téléphonique</h4>
                    <div className="flex items-center text-slate-700 bg-blue-50 p-2 rounded-lg inline-flex">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        <span className="font-medium text-blue-900">{result.callbackSlot || 'Non planifié'}</span>
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Description du problème</h4>
                    <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                        {result.description.split('---')[0]}
                    </p>
                </div>
            </div>
            <div className="bg-slate-50 p-4 text-center text-xs text-slate-400">
                Dossier ouvert le {new Date(result.createdAt).toLocaleDateString()} à {new Date(result.createdAt).toLocaleTimeString()}
            </div>
        </div>
      ) : (
          <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Vos demandes récentes
              </h3>
              
              {loadingHistory ? (
                  <div className="text-center py-8 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Chargement de l'historique...
                  </div>
              ) : history.length === 0 ? (
                  <div className="text-center py-8 bg-slate-100 rounded-xl border border-slate-200 text-slate-500">
                      Aucun dossier trouvé dans l'historique de cet appareil.
                  </div>
              ) : (
                  <div className="space-y-3">
                      {history.map((ticket) => (
                          <div 
                            key={ticket.id}
                            onClick={() => handleSelectTicket(ticket)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-center"
                          >
                              <div>
                                  <div className="flex items-center mb-1">
                                      <span className="font-mono font-bold text-blue-600 mr-3">{ticket.id}</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                                          ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                      }`}>
                                          {ticket.status === 'OPEN' ? 'En cours' : ticket.status}
                                      </span>
                                  </div>
                                  <div className="text-sm text-slate-700 font-medium">
                                      {ticket.issueType}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-1">
                                      {new Date(ticket.createdAt).toLocaleDateString()} • {ticket.companyName}
                                  </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default TicketLookup;