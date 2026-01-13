import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  Truck,
  FileText,
  RotateCcw,
  Wrench,
  Camera,
  Phone,
  Send,
  Loader2,
  X,
  Sparkles,
  Calendar,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { Intent, Order, OrderItem, IssueType, TicketPriority, CreateTicketPayload, Ticket } from '../../types';
import { ApiService } from '../../services/api';
import { MOCK_SLOTS } from '../../constants';

/**
 * GUIDED TICKET FLOW - IDEAL VERSION
 *
 * Design Philosophy:
 * - One question at a time
 * - Big, clear choices
 * - Conversational tone
 * - Progress feels natural
 * - Success is celebrated
 */

interface GuidedTicketFlowProps {
  onComplete: (ticket: Ticket) => void;
  onCancel: () => void;
}

type FlowStep =
  | 'reference'
  | 'category'
  | 'problem'
  | 'contact'
  | 'schedule'
  | 'confirm'
  | 'success';

const CATEGORIES = [
  {
    id: Intent.TECHNICAL,
    title: "Un problème technique",
    description: "Ma machine ne fonctionne pas correctement",
    icon: Wrench,
    color: "blue"
  },
  {
    id: Intent.DELIVERY,
    title: "Une question de livraison",
    description: "Je n'ai pas reçu ma commande",
    icon: Truck,
    color: "green"
  },
  {
    id: Intent.INVOICE,
    title: "Une question de facturation",
    description: "J'ai besoin d'un duplicata ou d'un avoir",
    icon: FileText,
    color: "purple"
  },
  {
    id: Intent.RETURN,
    title: "Je souhaite retourner un produit",
    description: "Le produit ne correspond pas",
    icon: RotateCcw,
    color: "amber"
  },
];

const GuidedTicketFlow: React.FC<GuidedTicketFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<FlowStep>('reference');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Form data
  const [reference, setReference] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [category, setCategory] = useState<Intent | null>(null);
  const [problem, setProblem] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Scroll to top on step change
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleReferenceSubmit = async () => {
    if (!reference.trim()) return;

    try {
      // Try to fetch order
      const orderData = await ApiService.getOrderByReference(reference);
      setOrder(orderData);
      setStep('category');
    } catch (error) {
      // Create mock order for fallback
      setOrder({
        id: reference,
        orderNumber: reference,
        customerName: '',
        items: [],
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      setStep('category');
    }
  };

  const handleSubmit = async () => {
    if (!order || !category) return;

    setIsSubmitting(true);
    try {
      // Upload files
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        const uploadPromises = files.map(file => ApiService.uploadFile(file));
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const issueType = category === Intent.TECHNICAL ? IssueType.TECHNICAL :
                        category === Intent.DELIVERY ? IssueType.DELIVERY :
                        category === Intent.INVOICE ? IssueType.BILLING :
                        IssueType.OTHER;

      const payload: CreateTicketPayload = {
        title: `SAV - ${contactName || 'Client'} - ${issueType}`,
        description: `[RÉFÉRENCE]\n${reference}\n\n[PROBLÈME]\n${problem}`,
        issueType,
        priority: TicketPriority.MEDIUM,
        orderId: order.id,
        companyName: order.customerName || '',
        contactName,
        contactEmail,
        contactPhone,
        callbackSlot: selectedSlot,
        attachments: uploadedUrls,
        tags: ['sav', 'guided-flow'],
      };

      const result = await ApiService.createTicket(payload);
      setCreatedTicket(result.data);
      setStep('success');
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const renderStep = () => {
    switch (step) {
      case 'reference':
        return (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Commençons par votre commande
            </h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Entrez votre numéro de commande, bon de livraison ou packing list.
            </p>

            <div className="max-w-sm mx-auto">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: BC-12345 ou PL-67890"
                className="w-full px-6 py-4 text-lg text-center border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none mb-4"
                onKeyDown={(e) => e.key === 'Enter' && handleReferenceSubmit()}
                autoFocus
              />
              <button
                onClick={handleReferenceSubmit}
                disabled={!reference.trim()}
                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                Continuer
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>

            <p className="text-sm text-slate-400 mt-6">
              Vous trouverez ce numéro sur votre facture ou email de confirmation.
            </p>
          </div>
        );

      case 'category':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                De quoi s'agit-il ?
              </h2>
              <p className="text-slate-500">
                Sélectionnez la catégorie qui correspond à votre situation.
              </p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      setStep('problem');
                    }}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all flex items-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mr-5 ${
                      cat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      cat.color === 'green' ? 'bg-green-100 text-green-600' :
                      cat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 mb-1">{cat.title}</h3>
                      <p className="text-sm text-slate-500">{cat.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'problem':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Décrivez votre problème
              </h2>
              <p className="text-slate-500">
                Plus vous êtes précis, plus vite nous pourrons vous aider.
              </p>
            </div>

            <div className="max-w-lg mx-auto space-y-6">
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={5}
                placeholder="Expliquez-nous ce qui se passe..."
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none resize-none text-lg"
                autoFocus
              />

              {/* File Upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Ajouter des photos (optionnel)</p>
                <p className="text-xs text-slate-400 mt-1">Cliquez ou glissez-déposez</p>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center px-3 py-2 bg-slate-100 rounded-lg">
                      <span className="text-sm text-slate-700 truncate max-w-[150px]">{file.name}</span>
                      <button onClick={() => removeFile(idx)} className="ml-2 text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep('contact')}
                disabled={!problem.trim()}
                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                Continuer
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Comment vous joindre ?
              </h2>
              <p className="text-slate-500">
                Nous vous contacterons pour résoudre votre problème.
              </p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Votre nom</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Prénom et nom"
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none"
                />
              </div>

              <button
                onClick={() => setStep('schedule')}
                disabled={!contactName || !contactPhone || !contactEmail}
                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
              >
                Continuer
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Quand pouvons-nous vous rappeler ?
              </h2>
              <p className="text-slate-500">
                Choisissez le créneau qui vous convient.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="grid grid-cols-1 gap-3 mb-8">
                {MOCK_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                      selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Calendar className={`w-5 h-5 mr-3 ${selectedSlot === slot ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`font-medium ${selectedSlot === slot ? 'text-blue-700' : 'text-slate-700'}`}>
                        {slot}
                      </span>
                    </div>
                    {selectedSlot === slot && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedSlot}
                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                Vérifier et envoyer
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">
                Tout est prêt !
              </h2>
              <p className="text-slate-500">
                Vérifiez les informations et envoyez votre demande.
              </p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              {/* Summary Cards */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <p className="text-xs text-slate-400 uppercase font-medium mb-2">Référence</p>
                <p className="text-slate-800 font-medium">{reference}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5">
                <p className="text-xs text-slate-400 uppercase font-medium mb-2">Problème</p>
                <p className="text-slate-800 line-clamp-2">{problem}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5">
                <p className="text-xs text-slate-400 uppercase font-medium mb-2">Contact</p>
                <p className="text-slate-800">{contactName} • {contactPhone}</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <p className="text-xs text-blue-600 uppercase font-medium mb-2">Rendez-vous</p>
                <p className="text-blue-800 font-bold">{selectedSlot}</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6 shadow-lg shadow-green-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6 mr-3" />
                    Envoyer ma demande
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center animate-fade-in">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              C'est envoyé !
            </h2>
            <p className="text-slate-500 mb-2 max-w-md mx-auto">
              Votre demande a bien été transmise à notre équipe.
            </p>

            {createdTicket && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 max-w-sm mx-auto mb-8">
                <p className="text-sm text-blue-600 mb-1">Numéro de dossier</p>
                <p className="text-2xl font-bold text-blue-800">{createdTicket.id}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-6 max-w-md mx-auto mb-8">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center justify-center">
                <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                Prochaines étapes
              </h4>
              <ul className="text-left space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Un email de confirmation vous a été envoyé</span>
                </li>
                <li className="flex items-start">
                  <Clock className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Un technicien vous contactera au créneau choisi</span>
                </li>
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">Vous pouvez suivre votre dossier depuis cet espace</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => createdTicket && onComplete(createdTicket)}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Back Button (not on success) */}
      {step !== 'success' && step !== 'reference' && (
        <button
          onClick={() => {
            const steps: FlowStep[] = ['reference', 'category', 'problem', 'contact', 'schedule', 'confirm'];
            const currentIdx = steps.indexOf(step);
            if (currentIdx > 0) setStep(steps[currentIdx - 1]);
          }}
          className="absolute top-4 left-4 flex items-center text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </button>
      )}

      {/* Cancel Button */}
      {step !== 'success' && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {/* Progress Dots */}
      {step !== 'success' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
          {['reference', 'category', 'problem', 'contact', 'schedule', 'confirm'].map((s, idx) => {
            const steps: FlowStep[] = ['reference', 'category', 'problem', 'contact', 'schedule', 'confirm'];
            const currentIdx = steps.indexOf(step);
            return (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx <= currentIdx ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      )}

      <div className="w-full max-w-2xl">
        {renderStep()}
      </div>
    </div>
  );
};

export default GuidedTicketFlow;
