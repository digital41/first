import React, { useEffect, useState } from 'react';
import { Ticket, Intent, StatusHistory } from '../types';
import { ApiService } from '../services/api';
import { ClipboardList, Phone, Image as ImageIcon, User, Mail, Loader2, Search, Filter, X, CheckCircle, AlertOctagon, Clock, Eye, Download, Lock, Save, History, ArrowRight } from 'lucide-react';

interface AdminDashboardProps {
  onExit: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<Intent | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Internal Note State
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Reset note content when modal opens
  useEffect(() => {
    if (selectedTicket) {
        setNoteContent(selectedTicket.internalNotes || '');
    }
  }, [selectedTicket]);

  const loadData = async () => {
      setLoading(true);
      try {
        const data = await ApiService.getTickets();
        // Sort by newest first
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(sorted);
        setFilteredTickets(sorted);
      } catch (e) {
        console.error("Erreur dashboard", e);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    let result = tickets;

    if (statusFilter !== 'ALL') {
        result = result.filter(t => t.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
        result = result.filter(t => t.issueType === typeFilter);
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.id.toLowerCase().includes(lower) || 
            t.companyName.toLowerCase().includes(lower) ||
            t.contactName.toLowerCase().includes(lower) ||
            t.orderId.toLowerCase().includes(lower)
        );
    }

    setFilteredTickets(result);
  }, [tickets, statusFilter, typeFilter, searchTerm]);

  const handleStatusChange = async (ticketId: string, newStatus: 'OPEN' | 'RESOLVED') => {
      if (!selectedTicket) return;
      
      const oldStatus = selectedTicket.status;
      
      // Création de l'entrée d'historique
      const historyEntry: StatusHistory = {
          date: new Date(),
          oldStatus: oldStatus,
          newStatus: newStatus,
          changedBy: 'Admin'
      };

      const updatedTicket: Ticket = { 
          ...selectedTicket, 
          status: newStatus,
          history: [...(selectedTicket.history || []), historyEntry]
      };
      
      // Update in backend
      await ApiService.updateTicket(updatedTicket);
      
      // Update local state
      const updatedList = tickets.map(t => t.id === ticketId ? updatedTicket : t);
      setTickets(updatedList);
      setSelectedTicket(updatedTicket);
  };

  const handleSaveNote = async () => {
    if (!selectedTicket) return;
    setIsSavingNote(true);
    
    const updatedTicket = { ...selectedTicket, internalNotes: noteContent };
    
    try {
        await ApiService.updateTicket(updatedTicket);
        // Update local state
        const updatedList = tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t);
        setTickets(updatedList);
        setSelectedTicket(updatedTicket);
    } catch (e) {
        console.error("Erreur sauvegarde note", e);
    } finally {
        setIsSavingNote(false);
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
          default: return 'bg-slate-100 text-slate-800 border-slate-200';
      }
  };

  const getTypeIcon = (type: Intent) => {
      switch(type) {
          case Intent.TECHNICAL: return '🔧 Tech';
          case Intent.DELIVERY: return '🚚 Livraison';
          case Intent.INVOICE: return '📄 Facture';
          case Intent.RETURN: return '↩️ Retour';
          default: return '❓ Autre';
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white px-8 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
                <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">KLY <span className="font-light opacity-80">Admin</span></h1>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Centre de contrôle SAV</p>
            </div>
        </div>
        <div className="flex items-center space-x-6">
            <div className="text-right hidden md:block">
                <p className="text-sm font-medium">Administrateur</p>
                <p className="text-xs text-slate-400">digital@klygroupe.com</p>
            </div>
            <button 
                onClick={onExit} 
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-700 transition-colors"
            >
                Déconnexion
            </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Total Tickets</p>
                <p className="text-3xl font-bold text-slate-800">{tickets.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-blue-500 uppercase mb-2">En Cours</p>
                <p className="text-3xl font-bold text-blue-600">{tickets.filter(t => t.status === 'OPEN').length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-green-500 uppercase mb-2">Résolus</p>
                <p className="text-3xl font-bold text-green-600">{tickets.filter(t => t.status === 'RESOLVED').length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <p className="text-xs font-bold text-purple-500 uppercase mb-2">Avec Pièces Jointes</p>
                <p className="text-3xl font-bold text-purple-600">{tickets.filter(t => t.hasPhoto).length}</p>
            </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                    />
                </div>
                
                <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
                    >
                        <option value="ALL">Tous les statuts</option>
                        <option value="OPEN">En cours</option>
                        <option value="RESOLVED">Clôturés</option>
                    </select>
                </div>

                <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="text-sm border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer"
                    >
                        <option value="ALL">Tous les types</option>
                        <option value={Intent.TECHNICAL}>Technique</option>
                        <option value={Intent.DELIVERY}>Livraison</option>
                        <option value={Intent.INVOICE}>Facturation</option>
                        <option value={Intent.RETURN}>Retour</option>
                    </select>
                </div>
            </div>
            
            <button onClick={loadData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Actualiser">
                <Clock className="w-5 h-5" />
            </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                    <th className="p-4">ID & Date</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Rappel</th>
                    <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>Chargement des tickets...</td></tr>
                    ) : filteredTickets.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">Aucun ticket ne correspond à vos filtres.</td></tr>
                    ) : (
                        filteredTickets.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                                <div className="font-mono font-bold text-blue-600">{t.id}</div>
                                <div className="text-xs text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{t.companyName}</div>
                                <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                    <User className="w-3 h-3 mr-1" /> {t.contactName}
                                </div>
                            </td>
                            <td className="p-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                    {getTypeIcon(t.issueType)}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(t.status)}`}>
                                    {t.status === 'OPEN' ? 'EN COURS' : 'CLÔTURÉ'}
                                </span>
                            </td>
                            <td className="p-4">
                                {t.callbackSlot ? (
                                    <div className="flex items-center text-green-700 bg-green-50 px-2 py-1 rounded w-fit text-xs font-medium">
                                        <Phone className="w-3 h-3 mr-1" />
                                        {t.callbackSlot.split(' - ')[1] || t.callbackSlot}
                                    </div>
                                ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => setSelectedTicket(t)}
                                    className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-all"
                                    title="Voir les détails"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                            </td>
                            </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 sticky top-0 z-10">
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-2xl font-bold text-slate-800">Ticket {selectedTicket.id}</h2>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(selectedTicket.status)}`}>
                                  {selectedTicket.status === 'OPEN' ? 'EN COURS' : 'CLÔTURÉ'}
                              </span>
                          </div>
                          <p className="text-sm text-slate-500 flex items-center">
                              Créé le {new Date(selectedTicket.createdAt).toLocaleString()} par {selectedTicket.companyName}
                          </p>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 p-1">
                          <X className="w-6 h-6" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-8 space-y-8">
                      {/* Contact Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Client</h3>
                              <div className="space-y-2">
                                  <div className="flex items-center text-slate-700">
                                      <User className="w-4 h-4 mr-2 text-blue-500" />
                                      <span className="font-medium">{selectedTicket.contactName}</span>
                                  </div>
                                  <div className="flex items-center text-slate-600 text-sm">
                                      <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                      {selectedTicket.contactEmail}
                                  </div>
                                  <div className="flex items-center text-slate-600 text-sm">
                                      <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                      {selectedTicket.contactPhone}
                                  </div>
                              </div>
                          </div>
                          <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Commande</h3>
                              <div className="space-y-2">
                                  <div className="flex items-center text-slate-700">
                                      <ClipboardList className="w-4 h-4 mr-2 text-blue-500" />
                                      <span className="font-medium">Réf: {selectedTicket.orderId}</span>
                                  </div>
                                  <div className="flex items-center text-slate-600 text-sm">
                                      <AlertOctagon className="w-4 h-4 mr-2 text-slate-400" />
                                      Type: {selectedTicket.issueType}
                                  </div>
                                  <div className="flex items-center text-slate-600 text-sm">
                                      <Phone className="w-4 h-4 mr-2 text-green-500" />
                                      Rappel: <span className="font-bold ml-1">{selectedTicket.callbackSlot || 'Non défini'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Content */}
                      <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Description du problème</h3>
                          <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                              {selectedTicket.description}
                          </div>
                      </div>

                      {selectedTicket.hasPhoto && (
                          <div>
                               <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Pièces jointes</h3>
                               <div className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                                   <ImageIcon className="w-5 h-5 mr-2" />
                                   <span className="text-sm font-medium">Des fichiers sont attachés à ce ticket (voir serveur de stockage sécurisé).</span>
                               </div>
                          </div>
                      )}

                      {/* Internal Notes Section */}
                      <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200/60">
                         <div className="flex items-center justify-between mb-3">
                             <h3 className="text-sm font-bold text-yellow-800 flex items-center uppercase tracking-wide">
                                 <Lock className="w-4 h-4 mr-2" /> 
                                 Note Interne (Privé)
                             </h3>
                             {isSavingNote && <span className="text-xs text-yellow-600 italic">Enregistrement...</span>}
                         </div>
                         <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="w-full p-4 text-sm bg-white border border-yellow-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-yellow-400 outline-none min-h-[100px]"
                            placeholder="Ajoutez des notes privées pour l'équipe SAV ici..."
                         />
                         <div className="flex justify-end mt-3">
                            <button 
                                onClick={handleSaveNote}
                                disabled={isSavingNote || noteContent === selectedTicket.internalNotes}
                                className="flex items-center bg-yellow-100 hover:bg-yellow-200 text-yellow-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Enregistrer la note
                            </button>
                         </div>
                      </div>

                      {/* History Section */}
                      {selectedTicket.history && selectedTicket.history.length > 0 && (
                          <div className="border-t border-slate-100 pt-6">
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center">
                                  <History className="w-4 h-4 mr-2" />
                                  Historique du statut
                              </h3>
                              <div className="space-y-4">
                                  {selectedTicket.history.map((log, index) => (
                                      <div key={index} className="flex items-start">
                                          <div className="flex flex-col items-center mr-4">
                                              <div className="w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
                                              {index !== (selectedTicket.history!.length - 1) && <div className="w-0.5 bg-slate-100 h-full my-1"></div>}
                                          </div>
                                          <div className="bg-white border border-slate-100 rounded-lg p-3 flex-grow shadow-sm">
                                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                  <span>{new Date(log.date).toLocaleString()}</span>
                                                  <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">Admin</span>
                                              </div>
                                              <div className="flex items-center text-sm">
                                                  <span className={`font-medium ${log.oldStatus === 'OPEN' ? 'text-blue-600' : 'text-green-600'}`}>
                                                      {log.oldStatus === 'OPEN' ? 'EN COURS' : 'CLÔTURÉ'}
                                                  </span>
                                                  <ArrowRight className="w-4 h-4 mx-2 text-slate-300" />
                                                  <span className={`font-bold ${log.newStatus === 'OPEN' ? 'text-blue-600' : 'text-green-600'}`}>
                                                      {log.newStatus === 'OPEN' ? 'EN COURS' : 'CLÔTURÉ'}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                      {selectedTicket.status === 'OPEN' ? (
                          <button 
                            onClick={() => handleStatusChange(selectedTicket.id, 'RESOLVED')}
                            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                          >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marquer comme résolu
                          </button>
                      ) : (
                        <button 
                            onClick={() => handleStatusChange(selectedTicket.id, 'OPEN')}
                            className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Rouvrir le dossier
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Helper for icon in modal
function RotateCcw(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    )
  }

export default AdminDashboard;