import React, { useState, useEffect } from 'react';
import { CheckCircle, FileText, Download, PlayCircle, Box, AlertCircle, ArrowRight, MessageSquare, ClipboardList, Package, Mail, User, Send, CreditCard, Printer, Copy } from 'lucide-react';
import { Intent, Order, OrderItem } from '../types';
import { ApiService } from '../services/api';

interface SelfServiceProps {
  intent: Intent;
  subIntent?: string; 
  order: Order;
  selectedProducts: OrderItem[];
  onNotResolved: () => void;
  onResolved: () => void;
  onManualTicket: () => void;
}

const SelfService: React.FC<SelfServiceProps> = ({ intent, subIntent, order, selectedProducts, onNotResolved, onResolved, onManualTicket }) => {
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // États formulaires
  const [invoiceNum, setInvoiceNum] = useState('');
  const [clientName, setClientName] = useState(order.customerName);
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [refs, setRefs] = useState('');

  // Initialisation des champs avec les données de la commande (BC, PL, BL)
  useEffect(() => {
      // Pour les formulaires où une référence est nécessaire, on concatène ce qu'on a
      const availableRefs = [
          order.id ? `BC: ${order.id}` : null, 
          order.plNumber ? `PL: ${order.plNumber}` : null, 
          order.blNumber ? `BL: ${order.blNumber}` : null
      ].filter(Boolean).join(', ');

      setRefs(availableRefs);
      
      // Pour la facture, si on a un ID de commande, on le propose comme référence par défaut
      // car le client ne connait pas forcément le n° de facture exact
      if (!invoiceNum) {
          setInvoiceNum(order.id);
      }
  }, [order]);

  const handleSendAdminEmail = async (type: 'DUPLICATA' | 'RELEVE' | 'ERREUR_PRIX') => {
    setLoading(true);
    try {
        await ApiService.sendAdministrativeEmail({
            type,
            clientName,
            email,
            invoiceNumber: type === 'ERREUR_PRIX' ? refs : invoiceNum,
            details
        });
        setEmailSent(true);
    } catch (error) {
        alert("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
        setLoading(false);
    }
  };

  const renderInvoiceContent = () => {
    if (emailSent) {
        return (
            <div className="text-center py-8 animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Demande envoyée !</h3>
                <p className="text-slate-500 mt-2">Notre service comptabilité a bien reçu votre demande sur <strong>digital@klygroupe.com</strong>.</p>
                <button onClick={onResolved} className="mt-6 text-blue-600 hover:underline">Retour à l'accueil</button>
            </div>
        );
    }

    switch (subIntent) {
        case 'duplicata':
            return (
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                        <FileText className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">Demande de Duplicata</h3>
                        <p className="text-sm text-slate-500">Recevez une copie de votre facture par email.</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de Facture ou BC *</label>
                            <input type="text" value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: FC-2023-001 ou BC..." />
                            <p className="text-xs text-slate-400 mt-1">Pré-rempli avec votre référence commande actuelle.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label>
                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email de réception *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="compta@votre-entreprise.com" />
                        </div>
                        <button 
                            onClick={() => handleSendAdminEmail('DUPLICATA')} 
                            disabled={!invoiceNum || !clientName || !email || loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? "Envoi..." : <><Send className="w-4 h-4 mr-2" /> Envoyer la demande</>}
                        </button>
                    </div>
                </div>
            );

        case 'releve':
            return (
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                        <ClipboardList className="w-12 h-12 text-violet-200 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-800">Relevé de Compte</h3>
                        <p className="text-sm text-slate-500">Obtenez la situation complète de votre compte client.</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Client *</label>
                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email de réception *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <button 
                            onClick={() => handleSendAdminEmail('RELEVE')} 
                            disabled={!clientName || !email || loading}
                            className="w-full bg-violet-600 text-white py-3 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? "Envoi..." : <><Send className="w-4 h-4 mr-2" /> Demander mon relevé</>}
                        </button>
                    </div>
                </div>
            );

        case 'rib':
            return (
                <div className="max-w-md mx-auto text-center">
                    <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden mb-6 text-left">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CreditCard className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold">K</div>
                                <span className="font-bold tracking-widest text-lg">KLY GROUPE</span>
                            </div>
                            <div className="space-y-4 font-mono text-sm">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">IBAN</p>
                                    <p className="text-lg tracking-wide">FR76 3000 3035 4000 1234 5678 901</p>
                                </div>
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase">BIC</p>
                                        <p>SOGE FR PP</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 uppercase">Banque</p>
                                        <p>SOCIÉTÉ GÉNÉRALE</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
                            <Printer className="w-4 h-4 mr-2" /> Imprimer
                        </button>
                        <button onClick={() => {navigator.clipboard.writeText("FR76 3000 3035 4000 1234 5678 901"); alert("IBAN copié !")}} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Copy className="w-4 h-4 mr-2" /> Copier
                        </button>
                    </div>
                </div>
            );

        case 'litige_prix':
            return (
                <div className="max-w-lg mx-auto">
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl mb-6 flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-800">
                            Vous avez constaté un écart de prix ou une remise manquante ? Remplissez ce formulaire pour avertir notre service commercial.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Références concernées (BC, PL, BL ou Facture) *</label>
                            <input type="text" value={refs} onChange={e => setRefs(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-slate-50" placeholder="Ex: BL12345, Facture FC-99..." />
                            <p className="text-xs text-slate-400 mt-1">Références issues de votre identification.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Votre Nom / Entreprise *</label>
                            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email de contact *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Détails de l'erreur *</label>
                            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} className="w-full px-4 py-2 border rounded-lg" placeholder="Ex: Le prix unitaire devrait être de..." />
                        </div>
                        <button 
                            onClick={() => handleSendAdminEmail('ERREUR_PRIX')} 
                            disabled={!refs || !clientName || !email || !details || loading}
                            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? "Envoi..." : <><Send className="w-4 h-4 mr-2" /> Signaler l'erreur</>}
                        </button>
                    </div>
                </div>
            );

        default:
            return (
                <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Accès Facturation</h3>
                    <p className="text-slate-500 mb-6">Veuillez sélectionner une option dans le menu précédent.</p>
                </div>
            );
    }
  };

  const renderContent = () => {
    switch (intent) {
      case Intent.DELIVERY:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
              <span className="font-semibold text-slate-700">Statut:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {order.status === 'DELIVERED' ? 'Livré' : 'En transit'}
              </span>
            </div>
            
            <div className="relative pt-6 pb-2">
               <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                 <div 
                    className="h-full bg-blue-600 transition-all duration-1000" 
                    style={{ width: order.status === 'DELIVERED' ? '100%' : '60%' }}
                 ></div>
               </div>
               <div className="flex justify-between text-xs text-slate-500 mt-2">
                 <span>Préparation</span>
                 <span>Expédition</span>
                 <span>Livraison</span>
               </div>
            </div>

            {order.trackingUrl && (
               <a href="#" className="block text-center text-blue-600 hover:underline font-medium">
                 Suivre sur le site du transporteur ({order.trackingUrl})
               </a>
            )}
          </div>
        );

      case Intent.INVOICE:
        return renderInvoiceContent();

      case Intent.TECHNICAL:
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800">Diagnostic rapide</h4>
                <p className="text-sm text-yellow-700 mt-1">Vérifications pour : {selectedProducts.map(p => p.name).join(', ')}.</p>
              </div>
            </div>

            <ul className="space-y-3">
              {['Redémarrer l\'appareil', 'Vérifier les branchements', 'Nettoyer le filtre'].map((item, idx) => (
                <li key={idx} className="flex items-center p-3 bg-white border rounded-lg hover:shadow-sm cursor-pointer">
                  <PlayCircle className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-slate-700">{item}</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                </li>
              ))}
            </ul>
          </div>
        );

      case Intent.RETURN:
        return (
          <div className="text-center py-6">
             <Box className="w-16 h-16 text-purple-200 mx-auto mb-4" />
             <h3 className="text-lg font-semibold text-slate-800">Politique de retour 30 jours</h3>
             <p className="text-slate-600 mt-2 mb-6">
               Vous êtes éligible au retour gratuit pour les articles sélectionnés.
             </p>
             <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700">
               Générer l'étiquette de retour
             </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-800 p-6 text-white">
          <h2 className="text-xl font-bold">Résolution Automatique</h2>
          <div className="flex flex-col gap-1 text-xs opacity-90 mb-4">
             <p className="font-mono">BC: {order.id}</p>
             {order.plNumber && <p className="font-mono">PL: {order.plNumber}</p>}
             {order.blNumber && <p className="font-mono">BL: {order.blNumber}</p>}
          </div>
          
          {/* Liste des produits sélectionnés */}
          <div className="space-y-2">
            {selectedProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center bg-slate-700/50 p-2 rounded-lg">
                    <img src={prod.imageUrl} alt="" className="w-8 h-8 rounded bg-white object-cover mr-3" />
                    <div className="text-xs">
                        <span className="block font-medium text-white">{prod.name}</span>
                        <span className="block text-slate-400">Ref: {prod.ref}</span>
                    </div>
                </div>
            ))}
          </div>
        </div>

        <div className="p-8">
          {renderContent()}
        </div>

        {/* N'afficher les options de sortie que si ce n'est pas le RIB (qui est une fin en soi) et si l'email n'a pas été envoyé */}
        {!emailSent && subIntent !== 'rib' && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
            <p className="text-slate-600 font-medium text-center">Cela a-t-il résolu votre problème ?</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* 1. Résolu */}
                <button 
                onClick={onResolved}
                className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-green-50 hover:text-green-700 hover:border-green-200 flex items-center justify-center transition-colors font-medium"
                >
                <CheckCircle className="w-4 h-4 mr-2" />
                Oui, merci
                </button>

                {/* 2. Chatbot (Conversationnel) */}
                <button 
                onClick={onNotResolved}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg flex items-center justify-center transition-all font-medium"
                >
                <MessageSquare className="w-4 h-4 mr-2" />
                Assistance IA
                </button>
                
                {/* 3. Formulaire (Classique) */}
                <button 
                onClick={onManualTicket}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 flex items-center justify-center transition-all font-medium"
                >
                <ClipboardList className="w-4 h-4 mr-2" />
                Formulaire SAV
                </button>
            </div>
            </div>
        )}
        
        {/* Bouton retour pour le RIB ou succès */}
        {(emailSent || subIntent === 'rib') && (
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                 <button onClick={onResolved} className="text-sm font-medium text-slate-500 hover:text-slate-800">Fermer et retourner à l'accueil</button>
             </div>
        )}
      </div>
    </div>
  );
};

export default SelfService;