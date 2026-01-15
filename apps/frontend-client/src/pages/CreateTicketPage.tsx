import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Wrench,
  Truck,
  FileText,
  HelpCircle,
  Package,
  Settings,
  AlertTriangle,
  Hash
} from 'lucide-react';
import { ticketsApi, ordersApi, uploadApi } from '@/services/api';
import { IssueType, TicketPriority, Order, CreateTicketInput } from '@/types';
import { Loading } from '@/components/common';
import { cn, formatFileSize } from '@/utils/helpers';

const ISSUE_TYPES = [
  {
    value: IssueType.TECHNICAL,
    label: 'Problème technique',
    description: 'Panne, dysfonctionnement, erreur machine',
    icon: Wrench,
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
  {
    value: IssueType.DELIVERY,
    label: 'Livraison',
    description: 'Retard, colis endommagé, erreur',
    icon: Truck,
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-600',
  },
  {
    value: IssueType.BILLING,
    label: 'Facturation',
    description: 'Facture, paiement, avoir',
    icon: FileText,
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
  },
  {
    value: IssueType.OTHER,
    label: 'Autre demande',
    description: 'Renseignement, autre sujet',
    icon: HelpCircle,
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
];

const PRIORITY_OPTIONS = [
  { value: TicketPriority.LOW, label: 'Basse', description: 'Peut attendre quelques jours', color: 'gray' },
  { value: TicketPriority.MEDIUM, label: 'Moyenne', description: 'À traiter dans les 48h', color: 'blue' },
  { value: TicketPriority.HIGH, label: 'Haute', description: 'Urgent, impact important', color: 'orange' },
  { value: TicketPriority.URGENT, label: 'Urgente', description: 'Critique, blocage total', color: 'red' },
];

// Liste des marques d'équipements courantes
const EQUIPMENT_BRANDS = [
  'KLY',
  'Autre marque'
];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState<CreateTicketInput>({
    title: '',
    description: '',
    issueType: IssueType.OTHER,
    priority: TicketPriority.MEDIUM,
    orderId: '',
    contactEmail: '',
    contactPhone: '',
    // Champs équipement
    serialNumber: '',
    equipmentModel: '',
    equipmentBrand: '',
    errorCode: '',
  });

  // Calcul du nombre total d'étapes selon le type de problème
  const getTotalSteps = () => {
    if (formData.issueType === IssueType.TECHNICAL) {
      return 4; // Type -> Équipement -> Description -> Contact
    }
    return 3; // Type -> Description -> Contact
  };

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.getAll();
        setOrders(response);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchOrders();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const uploaded = await uploadApi.upload(files);
        attachmentIds = uploaded.map((a) => a.id);
      }

      const ticket = await ticketsApi.create({
        ...formData,
        attachments: attachmentIds,
      });

      navigate(`/tickets/${ticket.id}`, {
        state: { created: true },
      });
    } catch (err) {
      setError('Une erreur est survenue lors de la création du ticket');
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // ÉTAPE 1: Type de problème
  // ============================================
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Comment pouvons-nous vous aider ?
        </h2>
        <p className="text-gray-600">
          Sélectionnez la catégorie qui correspond le mieux à votre demande.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ISSUE_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.issueType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => {
                setFormData((prev) => ({ ...prev, issueType: type.value }));
                // Auto-avancer après sélection
                setTimeout(() => setStep(2), 200);
              }}
              className={cn(
                'p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg transform hover:scale-[1.02]',
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
                type.bgColor
              )}>
                <Icon className={type.textColor} size={28} />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{type.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ============================================
  // ÉTAPE 2: Informations équipement (TECHNIQUE uniquement)
  // ============================================
  const renderEquipmentStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="text-purple-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Informations sur l'équipement
        </h2>
        <p className="text-gray-600">
          Ces informations nous aident à diagnostiquer plus rapidement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Numéro de série */}
        <div className="md:col-span-2">
          <label className="label flex items-center gap-2">
            <Hash size={16} className="text-gray-400" />
            Numéro de série
          </label>
          <input
            type="text"
            value={formData.serialNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
            placeholder="Ex: SN-2024-ABC123"
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">
            Généralement situé sur une étiquette à l'arrière ou sous l'équipement
          </p>
        </div>

        {/* Marque */}
        <div>
          <label className="label flex items-center gap-2">
            <Package size={16} className="text-gray-400" />
            Marque
          </label>
          <select
            value={formData.equipmentBrand}
            onChange={(e) => setFormData((prev) => ({ ...prev, equipmentBrand: e.target.value }))}
            className="input"
          >
            <option value="">Sélectionner une marque</option>
            {EQUIPMENT_BRANDS.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        {/* Modèle */}
        <div>
          <label className="label flex items-center gap-2">
            <Settings size={16} className="text-gray-400" />
            Modèle
          </label>
          <input
            type="text"
            value={formData.equipmentModel}
            onChange={(e) => setFormData((prev) => ({ ...prev, equipmentModel: e.target.value }))}
            placeholder="Ex: KLY-3000 Pro"
            className="input"
          />
        </div>

        {/* Code erreur */}
        <div className="md:col-span-2">
          <label className="label flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            Code d'erreur affiché (si applicable)
          </label>
          <input
            type="text"
            value={formData.errorCode}
            onChange={(e) => setFormData((prev) => ({ ...prev, errorCode: e.target.value }))}
            placeholder="Ex: E-404, ERR_MOTOR_01"
            className="input"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button onClick={handleBack} className="btn-outline">
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </button>
        <button onClick={handleNext} className="btn-primary">
          Continuer
          <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );

  // ============================================
  // ÉTAPE: Description du problème
  // ============================================
  const renderDescriptionStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Décrivez votre demande
        </h2>
        <p className="text-gray-600">
          Plus vous nous donnez de détails, plus nous pourrons vous aider rapidement.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="label">
          Titre de votre demande <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Ex: Machine qui ne démarre plus"
          className="input"
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div>
        <label className="label">
          Description détaillée <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez le problème rencontré, les étapes pour le reproduire, les messages d'erreur..."
          className="input min-h-[150px] resize-y"
          maxLength={2000}
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.description.length}/2000 caractères
        </p>
      </div>

      {/* Order selection (for non-technical issues) */}
      {orders.length > 0 && (
        <div>
          <label className="label flex items-center gap-2">
            <Package size={16} className="text-gray-400" />
            Commande concernée (optionnel)
          </label>
          <select
            value={formData.orderId}
            onChange={(e) => setFormData((prev) => ({ ...prev, orderId: e.target.value }))}
            className="input"
          >
            <option value="">Sélectionner une commande</option>
            {orders.map((order) => (
              <option key={order.orderNumber} value={order.orderNumber}>
                {order.orderNumber} - {order.orderDate ? new Date(order.orderDate).toLocaleDateString('fr-FR') : 'N/A'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="label">Niveau d'urgence</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData((prev) => ({ ...prev, priority: option.value }))}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                formData.priority === option.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <p className="font-medium text-sm">{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="label">Pièces jointes (optionnel)</label>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
            files.length >= 5 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
          )}
        >
          {files.length < 5 ? (
            <label className="cursor-pointer">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-600 font-medium">
                Cliquez pour ajouter des fichiers
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Photos, documents - Max 5 fichiers, 10 Mo par fichier
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </label>
          ) : (
            <p className="text-sm text-gray-500">Nombre maximum de fichiers atteint</p>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center min-w-0">
                  <FileText className="text-gray-400 shrink-0" size={18} />
                  <span className="ml-2 text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="ml-2 text-xs text-gray-500 shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button onClick={handleBack} className="btn-outline">
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </button>
        <button
          onClick={handleNext}
          disabled={!formData.title.trim() || !formData.description.trim()}
          className="btn-primary"
        >
          Continuer
          <ArrowRight size={18} className="ml-2" />
        </button>
      </div>
    </div>
  );

  // ============================================
  // ÉTAPE FINALE: Contact et validation
  // ============================================
  const renderFinalStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Dernière étape !
        </h2>
        <p className="text-gray-600">
          Vérifiez vos informations et ajoutez un moyen de vous contacter.
        </p>
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Résumé de votre demande</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 font-medium">
              {ISSUE_TYPES.find(t => t.value === formData.issueType)?.label}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Priorité:</span>
            <span className="ml-2 font-medium">
              {PRIORITY_OPTIONS.find(p => p.value === formData.priority)?.label}
            </span>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Titre:</span>
          <span className="ml-2 font-medium">{formData.title}</span>
        </div>
        {formData.serialNumber && (
          <div className="text-sm">
            <span className="text-gray-500">N° de série:</span>
            <span className="ml-2 font-medium">{formData.serialNumber}</span>
          </div>
        )}
        {formData.errorCode && (
          <div className="text-sm">
            <span className="text-gray-500">Code erreur:</span>
            <span className="ml-2 font-medium text-orange-600">{formData.errorCode}</span>
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Comment vous contacter ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="votre@email.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
              placeholder="06 12 34 56 78"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start p-4 bg-red-50 rounded-lg">
          <AlertCircle className="text-red-500 shrink-0" size={18} />
          <p className="ml-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button onClick={handleBack} className="btn-outline">
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary px-8"
        >
          {isSubmitting ? (
            <Loading size="sm" />
          ) : (
            <>
              <CheckCircle size={18} className="mr-2" />
              Envoyer ma demande
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ============================================
  // RENDU CONDITIONNEL DES ÉTAPES
  // ============================================
  const renderCurrentStep = () => {
    if (step === 1) {
      return renderStep1();
    }

    if (formData.issueType === IssueType.TECHNICAL) {
      // Flow technique: 1 -> 2 (équipement) -> 3 (description) -> 4 (final)
      if (step === 2) return renderEquipmentStep();
      if (step === 3) return renderDescriptionStep();
      if (step === 4) return renderFinalStep();
    } else {
      // Flow standard: 1 -> 2 (description) -> 3 (final)
      if (step === 2) return renderDescriptionStep();
      if (step === 3) return renderFinalStep();
    }

    return null;
  };

  const totalSteps = getTotalSteps();

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => step > 1 ? handleBack() : navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} className="mr-1" />
          {step > 1 ? 'Étape précédente' : 'Retour'}
        </button>
        <h1 className="page-title">Créer un ticket</h1>
        <p className="page-subtitle">
          Notre équipe vous répondra dans les plus brefs délais.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum, index) => (
          <React.Fragment key={stepNum}>
            {index > 0 && (
              <div className={cn(
                'flex-1 h-1 mx-2 rounded transition-colors',
                step > index ? 'bg-primary-600' : 'bg-gray-200'
              )} />
            )}
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
              step >= stepNum
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-500'
            )}>
              {stepNum}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between mb-8 text-xs text-gray-500">
        <span className={cn(step >= 1 && 'text-primary-600 font-medium')}>Type</span>
        {formData.issueType === IssueType.TECHNICAL ? (
          <>
            <span className={cn(step >= 2 && 'text-primary-600 font-medium')}>Équipement</span>
            <span className={cn(step >= 3 && 'text-primary-600 font-medium')}>Description</span>
            <span className={cn(step >= 4 && 'text-primary-600 font-medium')}>Envoi</span>
          </>
        ) : (
          <>
            <span className={cn(step >= 2 && 'text-primary-600 font-medium')}>Description</span>
            <span className={cn(step >= 3 && 'text-primary-600 font-medium')}>Envoi</span>
          </>
        )}
      </div>

      {/* Form card */}
      <div className="card p-6 md:p-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

export default CreateTicketPage;
