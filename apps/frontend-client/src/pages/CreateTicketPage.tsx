import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Wrench,
  Truck,
  FileText,
  HelpCircle,
  Package
} from 'lucide-react';
import { ticketsApi, ordersApi, uploadApi } from '@/services/api';
import { IssueType, TicketPriority, Order, CreateTicketInput } from '@/types';
import { Loading } from '@/components/common';
import { cn, formatFileSize } from '@/utils/helpers';

const ISSUE_TYPES = [
  {
    value: IssueType.TECHNICAL,
    label: 'Problème technique',
    description: 'Panne, dysfonctionnement, erreur',
    icon: Wrench,
    color: 'purple',
  },
  {
    value: IssueType.DELIVERY,
    label: 'Livraison',
    description: 'Retard, colis endommagé, erreur',
    icon: Truck,
    color: 'cyan',
  },
  {
    value: IssueType.BILLING,
    label: 'Facturation',
    description: 'Facture, paiement, avoir',
    icon: FileText,
    color: 'amber',
  },
  {
    value: IssueType.OTHER,
    label: 'Autre demande',
    description: 'Renseignement, autre sujet',
    icon: HelpCircle,
    color: 'gray',
  },
];

const PRIORITY_OPTIONS = [
  { value: TicketPriority.LOW, label: 'Basse', description: 'Peut attendre quelques jours' },
  { value: TicketPriority.MEDIUM, label: 'Moyenne', description: 'À traiter dans les 48h' },
  { value: TicketPriority.HIGH, label: 'Haute', description: 'Urgent, impact important' },
  { value: TicketPriority.URGENT, label: 'Urgente', description: 'Critique, blocage total' },
];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const [formData, setFormData] = useState<CreateTicketInput>({
    title: '',
    description: '',
    issueType: IssueType.OTHER,
    priority: TicketPriority.MEDIUM,
    orderId: '',
    contactEmail: '',
    contactPhone: '',
  });

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
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload files first
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const uploaded = await uploadApi.upload(files);
        attachmentIds = uploaded.map((a) => a.id);
      }

      // Create ticket
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

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Quel est le type de votre demande ?
        </h2>
        <p className="text-gray-600">
          Sélectionnez la catégorie qui correspond le mieux à votre problème.
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
                setStep(2);
              }}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center mb-3',
                `bg-${type.color}-100`
              )}>
                <Icon className={`text-${type.color}-600`} size={24} />
              </div>
              <h3 className="font-semibold text-gray-900">{type.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
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

      {/* Order selection */}
      {orders.length > 0 && (
        <div>
          <label className="label">Commande concernée (optionnel)</label>
          <select
            value={formData.orderId}
            onChange={(e) => setFormData((prev) => ({ ...prev, orderId: e.target.value }))}
            className="input"
          >
            <option value="">Sélectionner une commande</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.orderNumber} - {new Date(order.orderDate).toLocaleDateString('fr-FR')}
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
                'p-3 rounded-lg border text-center transition-colors',
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
            'border-2 border-dashed rounded-lg p-6 text-center',
            files.length >= 5 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-primary-400'
          )}
        >
          {files.length < 5 ? (
            <label className="cursor-pointer">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-600">
                Cliquez pour ajouter des fichiers
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max 5 fichiers, 10 Mo par fichier
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

        {/* File list */}
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

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Email de contact (optionnel)</label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="votre@email.com"
            className="input"
          />
        </div>
        <div>
          <label className="label">Téléphone (optionnel)</label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
            placeholder="06 12 34 56 78"
            className="input"
          />
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
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={() => setStep(1)}
          className="btn-outline"
        >
          <ArrowLeft size={18} className="mr-2" />
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
          className="btn-primary"
        >
          {isSubmitting ? (
            <Loading size="sm" />
          ) : (
            <>
              <CheckCircle size={18} className="mr-2" />
              Créer le ticket
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} className="mr-1" />
          Retour
        </button>
        <h1 className="page-title">Créer un ticket</h1>
        <p className="page-subtitle">
          Notre équipe vous répondra dans les plus brefs délais.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center mb-8">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
          'bg-primary-600 text-white'
        )}>
          1
        </div>
        <div className={cn(
          'flex-1 h-1 mx-2',
          step >= 2 ? 'bg-primary-600' : 'bg-gray-200'
        )} />
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
          step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
        )}>
          2
        </div>
      </div>

      {/* Form card */}
      <div className="card p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  );
}

export default CreateTicketPage;
