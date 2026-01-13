import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building2,
  Phone,
  Mail,
  FileText,
  Calendar,
  Camera,
  Send,
  Loader2,
  X,
  FileImage,
  FileVideo,
  AlertCircle,
  Package,
  HelpCircle
} from 'lucide-react';
import { Order, Intent, OrderItem, IssueType, TicketPriority, CreateTicketPayload, Ticket } from '../../types';
import { ApiService } from '../../services/api';
import { MOCK_SLOTS } from '../../constants';

interface TicketCreationWizardProps {
  order: Order;
  intent: Intent;
  selectedProducts: OrderItem[];
  chatHistory?: string;
  onTicketCreated: (ticket: Ticket) => void;
  onBack: () => void;
}

// Wizard steps
type WizardStep = 'contact' | 'problem' | 'schedule' | 'review';

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  { id: 'contact', title: 'Vos coordonnées', description: 'Informations de contact' },
  { id: 'problem', title: 'Le problème', description: 'Décrivez votre situation' },
  { id: 'schedule', title: 'RDV téléphonique', description: 'Choisissez un créneau' },
  { id: 'review', title: 'Confirmation', description: 'Vérifiez et envoyez' },
];

const intentToIssueType = (intent: Intent): IssueType => {
  switch (intent) {
    case Intent.TECHNICAL: return IssueType.TECHNICAL;
    case Intent.DELIVERY: return IssueType.DELIVERY;
    case Intent.INVOICE: return IssueType.BILLING;
    default: return IssueType.OTHER;
  }
};

const TicketCreationWizard: React.FC<TicketCreationWizardProps> = ({
  order,
  intent,
  selectedProducts,
  chatHistory = '',
  onTicketCreated,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    companyName: order.customerName || '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    serialNumber: '',
    conditions: '',
    description: '',
    selectedSlot: '',
    files: [] as File[],
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const updateFormData = (field: string, value: string | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      updateFormData('files', [...formData.files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    updateFormData('files', formData.files.filter((_, i) => i !== index));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'contact':
        return !!(formData.companyName && formData.contactName && formData.contactPhone && formData.contactEmail);
      case 'problem':
        return !!(formData.conditions && formData.description);
      case 'schedule':
        return !!formData.selectedSlot;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Upload files
      let uploadedUrls: string[] = [];
      if (formData.files.length > 0) {
        const uploadPromises = formData.files.map(file => ApiService.uploadFile(file));
        uploadedUrls = await Promise.all(uploadPromises);
      }

      // Build description
      const productsList = selectedProducts.map(p => `- ${p.name} (Ref: ${p.ref})`).join('\n');
      const referencesContext = `
Ref BC: ${order.orderNumber || order.id}
Ref PL: ${order.plNumber || 'N/A'}
Ref BL: ${order.blNumber || 'N/A'}
      `.trim();

      const compiledDescription = `
[RÉFÉRENCES DOSSIER]
${referencesContext}

[PRODUITS CONCERNÉS]
${productsList}

[MATÉRIEL]
Modèle / N° Série : ${formData.serialNumber || 'Non spécifié'}

[CONDITIONS]
${formData.conditions}

[DESCRIPTION]
${formData.description}

${chatHistory ? `[CONTEXTE IA]\n${chatHistory.substring(0, 500)}...` : ''}
      `.trim();

      const ticketPayload: CreateTicketPayload = {
        title: `SAV - ${formData.companyName} - ${intentToIssueType(intent)}`,
        description: compiledDescription,
        issueType: intentToIssueType(intent),
        priority: TicketPriority.MEDIUM,
        orderId: order.id,
        companyName: formData.companyName,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        callbackSlot: formData.selectedSlot,
        affectedProducts: selectedProducts.map(p => p.ref),
        attachments: uploadedUrls,
        tags: ['sav', 'portail-client'],
      };

      const result = await ApiService.createTicket(ticketPayload);
      onTicketCreated(result.data);
    } catch (error) {
      console.error('Error creating ticket:', error);
      setSubmitError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = idx < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div className="mt-2 text-center hidden md:block">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${idx < currentStepIndex ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-8">
          {/* Contact Step */}
          {currentStep === 'contact' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Vos coordonnées</h2>
                <p className="text-slate-500 mt-2">Pour que nous puissions vous recontacter</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Entreprise *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nom de votre société"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Votre nom *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => updateFormData('contactName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Prénom et nom"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => updateFormData('contactPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateFormData('contactEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Problem Step */}
          {currentStep === 'problem' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Décrivez le problème</h2>
                <p className="text-slate-500 mt-2">Plus vous êtes précis, plus nous serons efficaces</p>
              </div>

              {/* Product reminder */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center mb-2">
                  <Package className="w-4 h-4 text-slate-500 mr-2" />
                  <span className="text-sm font-medium text-slate-600">Produits concernés</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((p, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white text-slate-700 rounded-full text-sm border border-slate-200">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modèle / Numéro de série (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => updateFormData('serialNumber', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: DH-2000 / SN: 987654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dans quelles conditions apparaît le problème ? *
                  </label>
                  <textarea
                    value={formData.conditions}
                    onChange={(e) => updateFormData('conditions', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Ex: Après 2h de fonctionnement, au démarrage..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description détaillée *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Décrivez précisément le dysfonctionnement..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Camera className="w-4 h-4 inline mr-2" />
                    Photos ou vidéos (optionnel)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Glissez vos fichiers ici ou cliquez pour parcourir</p>
                    <p className="text-xs text-slate-400 mt-1">Photos, vidéos, documents</p>
                  </div>

                  {formData.files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center">
                            {file.type.startsWith('video') ? (
                              <FileVideo className="w-5 h-5 text-purple-500 mr-3" />
                            ) : (
                              <FileImage className="w-5 h-5 text-blue-500 mr-3" />
                            )}
                            <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Step */}
          {currentStep === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Choisissez un créneau</h2>
                <p className="text-slate-500 mt-2">Nous vous rappellerons à ce moment</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MOCK_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => updateFormData('selectedSlot', slot)}
                    className={`p-4 rounded-xl text-left border-2 transition-all ${
                      formData.selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${formData.selectedSlot === slot ? 'text-blue-700' : 'text-slate-700'}`}>
                        {slot}
                      </span>
                      {formData.selectedSlot === slot && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Un technicien vous contactera dans le créneau choisi pour analyser votre problème.
                </p>
              </div>
            </div>
          )}

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Récapitulatif</h2>
                <p className="text-slate-500 mt-2">Vérifiez les informations avant envoi</p>
              </div>

              <div className="space-y-4">
                {/* Contact Summary */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" /> Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Entreprise:</span>
                      <p className="font-medium text-slate-700">{formData.companyName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nom:</span>
                      <p className="font-medium text-slate-700">{formData.contactName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Téléphone:</span>
                      <p className="font-medium text-slate-700">{formData.contactPhone}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>
                      <p className="font-medium text-slate-700">{formData.contactEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Problem Summary */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> Problème
                  </h4>
                  <p className="text-sm text-slate-600 line-clamp-3">{formData.description}</p>
                  {formData.files.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">{formData.files.length} fichier(s) joint(s)</p>
                  )}
                </div>

                {/* Schedule Summary */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" /> Créneau de rappel
                  </h4>
                  <p className="text-blue-800 font-medium">{formData.selectedSlot}</p>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center px-5 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </button>

          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer ma demande
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continuer
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCreationWizard;
