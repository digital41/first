import React, { useState } from 'react';
import { Calendar, Camera, Check, Phone, User, Mail, Building2, Send, Loader2, Info, AlertCircle, X, FileVideo, FileImage, Package, FileText } from 'lucide-react';
import { MOCK_SLOTS } from '../constants';
import { Order, Intent, Ticket, OrderItem, IssueType, CreateTicketPayload, TicketPriority } from '../types';
import { ApiService } from '../services/api';

// Mapping Intent -> IssueType pour compatibilité
const intentToIssueType = (intent: Intent): IssueType => {
  switch (intent) {
    case Intent.TECHNICAL:
      return IssueType.TECHNICAL;
    case Intent.DELIVERY:
      return IssueType.DELIVERY;
    case Intent.INVOICE:
      return IssueType.BILLING;
    case Intent.RETURN:
    case Intent.NONE:
    default:
      return IssueType.OTHER;
  }
};

interface EscalationFormProps {
  order: Order;
  intent: Intent;
  selectedProducts: OrderItem[];
  chatHistory: string;
  onTicketCreated: (ticket: Ticket) => void;
}

const EscalationForm: React.FC<EscalationFormProps> = ({ order, intent, selectedProducts, chatHistory, onTicketCreated }) => {
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  
  // Champs techniques détaillés
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [conditions, setConditions] = useState('');
  
  // Champs Contact
  const [companyName, setCompanyName] = useState(order.customerName); 
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(''); // Pour afficher l'étape
  const [ticketId, setTicketId] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setUploadProgress('Préparation des données...');
    
    try {
        // 1. Upload des fichiers
        let uploadedUrls: string[] = [];
        if (files.length > 0) {
            setUploadProgress(`Téléchargement de ${files.length} fichier(s)...`);
            // On upload en parallèle pour aller plus vite
            const uploadPromises = files.map(file => ApiService.uploadFile(file));
            uploadedUrls = await Promise.all(uploadPromises);
        }

        setUploadProgress('Création du ticket...');

        // Compilation des informations techniques
        const productsList = selectedProducts.map(p => `- ${p.name} (Ref: ${p.ref})`).join('\n');
        
        // Construction des références croisées pour le ticket
        const referencesContext = `
Ref Commande (BC): ${order.orderNumber || order.id}
Ref PL (Packing List): ${order.plNumber || 'N/A'}
Ref BL (Livraison): ${order.blNumber || 'N/A'}
        `.trim();

        const compiledDescription = `
[RÉFÉRENCES DOSSIER]
${referencesContext}

[PRODUITS CONCERNÉS]
${productsList}

[MATÉRIEL]
Modèle / N° Série : ${serialNumber || 'Non spécifié'}

[CONDITIONS]
Conditions d'apparition : ${conditions}

[DESCRIPTION DÉTAILLÉE]
${description}

[CONTEXTE IA]
${chatHistory.substring(0, 800)}...
        `.trim();

      // 2. Création du ticket avec les métadonnées des fichiers
      const ticketPayload: CreateTicketPayload = {
        title: `SAV - ${companyName} - ${intentToIssueType(intent)}`,
        description: compiledDescription,
        issueType: intentToIssueType(intent),
        priority: TicketPriority.MEDIUM,
        orderId: order.id,
        companyName: companyName,
        contactName: contactName,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
        callbackSlot: selectedSlot,
        affectedProducts: selectedProducts.map(p => p.ref),
        attachments: uploadedUrls,
        tags: ['sav', 'portail-client'],
      };

      const result = await ApiService.createTicket(ticketPayload);

      setTicketId(result.data.id);
      setSubmitted(true);

      // Afficher un message si en mode fallback
      if (result.mode === 'fallback' && result.message) {
        console.info(result.message);
      }

      setTimeout(() => {
        onTicketCreated(result.data);
      }, 5000);

    } catch (error: unknown) {
      console.error("Erreur création ticket:", error);
      alert("Une erreur technique est survenue. Veuillez réessayer.");
    } finally {
      setIsSending(false);
      setUploadProgress('');
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-lg border border-green-100 animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Ticket {ticketId} Créé</h2>
        <div className="text-slate-600 space-y-2 mb-6">
          <p>Votre demande a été transmise à nos équipes techniques.</p>
          <p className="text-sm bg-slate-50 p-3 rounded border border-slate-200 inline-block text-left">
            <span className="block mb-1">✅ Notification envoyée à : <strong>digital@klygroupe.com</strong></span>
            <span className="block">✅ Confirmation envoyée à : <strong>{contactEmail}</strong></span>
          </p>
        </div>
        <button disabled className="text-sm text-slate-400 mt-4 cursor-wait">
          Retour à l'accueil dans quelques secondes...
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-slide-up">
      <div className="mb-8 border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <Phone className="w-6 h-6 mr-2 text-blue-600" />
          Finalisation du dossier SAV
        </h2>
        <p className="text-slate-500 mt-2">Dernière étape : détails techniques et coordonnées.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Rappel des références et produits (Affichage uniquement) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" />
                    <h4 className="font-bold text-slate-700 text-sm">Références Dossier</h4>
                </div>
                <div className="space-y-1 text-xs text-slate-600 font-mono">
                    <p><span className="text-slate-400 w-8 inline-block">BC:</span> {order.orderNumber || order.id}</p>
                    {order.plNumber && <p><span className="text-slate-400 w-8 inline-block">PL:</span> {order.plNumber}</p>}
                    {order.blNumber && <p><span className="text-slate-400 w-8 inline-block">BL:</span> {order.blNumber}</p>}
                </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center mb-2">
                    <Package className="w-4 h-4 text-slate-600 mr-2" />
                    <h4 className="font-bold text-slate-700 text-sm">Produits concernés</h4>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-600 max-h-20 overflow-y-auto">
                    {selectedProducts.map((p, i) => (
                        <li key={i} className="truncate">{p.name}</li>
                    ))}
                </ul>
            </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-5">
            <h3 className="font-semibold text-slate-700 flex items-center border-b border-slate-200 pb-2">
                <User className="w-5 h-5 mr-2 text-slate-500" /> Informations de contact
            </h3>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise demandeuse (Client) *</label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800 bg-white"
                        placeholder="Nom de la société"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom du contact *</label>
                    <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Ex: Jean Martin"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone *</label>
                    <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Ex: 06 12 34 56 78"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email professionnel *</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jean.martin@entreprise.com"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1">Le numéro de ticket sera envoyé à cette adresse.</p>
            </div>
        </div>

        {/* Technical Details Section */}
        <div className="space-y-5">
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h4 className="font-bold text-blue-900 flex items-center mb-3 text-sm">
                    <Info className="w-4 h-4 mr-2"/>
                    Merci de nous transmettre tous les éléments relatifs à la panne :
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-1 text-sm text-blue-800 mb-3">
                    <li>Une description détaillée du dysfonctionnement</li>
                    <li>Les conditions d’apparition</li>
                    <li>Le modèle ou numéro de série du matériel concerné</li>
                    <li>Des photos, vidéos, ou tout autre document utile</li>
                </ul>
                <p className="text-sm font-medium italic text-blue-700">
                    "Plus vous serez exhaustif, plus notre analyse sera rapide et précise."
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modèle / Numéro de série (Optionnel)</label>
                    <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Ex: DH-2000 / SN: 987654321"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                 </div>

                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Conditions d'apparition du problème *</label>
                    <textarea
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        placeholder="Ex: Le problème survient après 2h de fonctionnement, uniquement quand..."
                    />
                 </div>

                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description détaillée du dysfonctionnement *</label>
                    <textarea
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez précisément ce qui se passe..."
                    />
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Photos et vidéos (Optionnel)</label>
                 <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer relative group text-center bg-white">
                    <input 
                        type="file" 
                        accept="image/*,video/*" 
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" 
                    />
                    <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                    <p className="text-sm text-slate-600 font-medium">Glissez vos fichiers ou cliquez pour parcourir</p>
                    <p className="text-xs text-slate-400 mt-1">Photos, vidéos, documents...</p>
                </div>

                {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm animate-fade-in">
                                <div className="flex items-center overflow-hidden">
                                    {file.type.startsWith('video') ? 
                                        <FileVideo className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" /> : 
                                        <FileImage className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700 truncate font-medium">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Check className="w-4 h-4 text-green-500 mr-3" />
                                    <button 
                                        type="button" 
                                        onClick={() => removeFile(index)} 
                                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors z-20 relative"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Calendar Slots */}
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
             <Calendar className="w-4 h-4 mr-2" />
             Créneau de rappel souhaité *
           </label>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {MOCK_SLOTS.map((slot) => (
               <button
                 key={slot}
                 type="button"
                 onClick={() => setSelectedSlot(slot)}
                 className={`py-3 px-4 rounded-lg text-sm border transition-all ${
                   selectedSlot === slot 
                     ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200' 
                     : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                 }`}
               >
                 {slot}
               </button>
             ))}
           </div>
        </div>

        <button
          type="submit"
          disabled={!selectedSlot || !contactName || !contactEmail || !contactPhone || !conditions || !description || isSending}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg mt-8"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {uploadProgress || 'Traitement du dossier...'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Valider et Envoyer le dossier SAV
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EscalationForm;