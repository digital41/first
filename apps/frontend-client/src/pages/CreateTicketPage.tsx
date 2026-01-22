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
import { cn, formatFileSize, formatDate } from '@/utils/helpers';

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

// Problèmes prédéfinis par type (pour pré-remplissage)
const PREDEFINED_ISSUES: Record<IssueType, string[]> = {
  [IssueType.DELIVERY]: [
    'Ma commande n\'est pas encore arrivée',
    'Le colis est arrivé endommagé',
    'Il manque des articles dans ma livraison',
    'J\'ai reçu le mauvais produit',
  ],
  [IssueType.TECHNICAL]: [
    'Le produit ne fonctionne pas',
    'Le produit est arrivé cassé',
    'Il manque des pièces ou accessoires',
    'Le produit affiche un code erreur',
  ],
  [IssueType.BILLING]: [
    'Le montant facturé est incorrect',
    'Je souhaite un avoir',
    'Je n\'ai pas reçu ma facture',
    'Demande de remboursement',
  ],
  [IssueType.OTHER]: [
    'Question sur l\'utilisation du produit',
    'Demande de documentation',
    'Autre demande',
  ],
};

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // État pour pré-remplissage intelligent
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [predefinedIssue, setPredefinedIssue] = useState<string>('');
  const [customDescription, setCustomDescription] = useState('');

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

  // Générer le titre automatiquement
  const generateTitle = (): string => {
    const typeLabel = ISSUE_TYPES.find(t => t.value === formData.issueType)?.label || 'Demande';

    if (selectedOrder) {
      const productInfo = selectedProducts.length > 0
        ? ` - ${selectedProducts.length} produit(s)`
        : '';
      return `${typeLabel} - Commande ${selectedOrder.orderNumber}${productInfo}`;
    }

    return predefinedIssue || `${typeLabel}`;
  };

  // Générer la description avec tout le contexte
  const generateDescription = (): string => {
    const parts: string[] = [];

    // Problème signalé
    if (predefinedIssue) {
      parts.push(`Problème signalé: ${predefinedIssue}`);
    }

    if (customDescription.trim()) {
      parts.push(`\nDétails supplémentaires:\n${customDescription}`);
    }

    // Produits concernés (si commande sélectionnée)
    if (selectedProducts.length > 0 && selectedOrder?.lines) {
      const productDetails = selectedOrder.lines
        .filter(line => selectedProducts.includes(line.productCode))
        .map(line => `- ${line.productName} (Réf: ${line.productCode}, Qté: ${line.quantity})`)
        .join('\n');
      parts.push(`\nProduits concernés:\n${productDetails}`);
    }

    // Équipement technique
    if (formData.serialNumber) {
      parts.push(`\nN° de série: ${formData.serialNumber}`);
    }
    if (formData.errorCode) {
      parts.push(`Code erreur: ${formData.errorCode}`);
    }

    // Contexte complet de la commande (pour l'IA)
    if (selectedOrder) {
      parts.push('\n\n---\n📋 INFORMATIONS COMMANDE SAGE (contexte pour le support):');
      parts.push(`\n• N° Commande: ${selectedOrder.orderNumber}`);
      parts.push(`• Statut: ${selectedOrder.status}`);

      if (selectedOrder.orderDate) {
        parts.push(`• Date commande: ${formatDate(selectedOrder.orderDate)}`);
      }
      if (selectedOrder.deliveryDate) {
        parts.push(`• Date livraison prévue: ${formatDate(selectedOrder.deliveryDate)}`);
      }
      if (selectedOrder.totalAmount !== undefined) {
        parts.push(`• Montant total HT: ${Number(selectedOrder.totalAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`);
      }

      if (selectedOrder.customerCode) {
        parts.push(`\n👤 CLIENT: ${selectedOrder.customerCode}`);
      }
      if (selectedOrder.companyName) {
        parts.push(`• Société: ${selectedOrder.companyName}`);
      }

      // Liste des produits
      const orderLines = selectedOrder.lines || [];
      if (orderLines.length > 0) {
        parts.push(`\n📦 CONTENU (${orderLines.length} article${orderLines.length > 1 ? 's' : ''}):`);
        orderLines.forEach((line, index) => {
          parts.push(`${index + 1}. ${line.productName} (Réf: ${line.productCode}, Qté: ${line.quantity})`);
        });
      }
    }

    return parts.join('\n');
  };

  // Toggle sélection produit
  const toggleProductSelection = (productCode: string) => {
    setSelectedProducts(prev =>
      prev.includes(productCode)
        ? prev.filter(p => p !== productCode)
        : [...prev, productCode]
    );
  };

  // Calcul du nombre total d'étapes (simplifié à 4)
  // Flux: 1. Commande & Produits -> 2. Type -> 3. Détails -> 4. Envoi
  const getTotalSteps = () => {
    return 4;
  };

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const response = await ordersApi.getAll();
        setOrders(response);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoadingOrders(false);
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
    // Générer automatiquement titre et description
    const finalTitle = formData.title.trim() || generateTitle();
    const finalDescription = generateDescription() || formData.description;

    if (!finalTitle || (!predefinedIssue && !customDescription.trim() && !formData.description.trim())) {
      setError('Veuillez décrire votre problème');
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
        title: finalTitle,
        description: finalDescription,
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
  // ÉTAPE 1: Sélection de la commande ET des produits
  // ============================================
  const renderOrderStep = () => {
    const orderLines = selectedOrder?.lines || [];
    const showProductSelection = selectedOrder && orderLines.length > 0;

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Package className="text-blue-600 sm:hidden" size={24} />
            <Package className="text-blue-600 hidden sm:block" size={32} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {showProductSelection ? 'Commande et produits' : 'Concerne une commande ?'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {showProductSelection
              ? 'Sélectionnez les produits concernés.'
              : 'Sélectionnez la commande concernée.'}
          </p>
        </div>

        {loadingOrders ? (
          <div className="flex justify-center py-6 sm:py-8">
            <Loading size="md" />
          </div>
        ) : !showProductSelection ? (
          // Sélection de la commande
          orders.length > 0 ? (
            <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto -mx-1 px-1">
              {orders.slice(0, 10).map((order) => {
                const isSelected = selectedOrder?.orderNumber === order.orderNumber;
                return (
                  <button
                    key={order.orderNumber}
                    onClick={() => {
                      setSelectedOrder(order);
                      setFormData((prev) => ({ ...prev, orderId: order.orderNumber }));
                      setSelectedProducts([]); // Reset product selection
                    }}
                    className={cn(
                      'w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{order.orderNumber}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString('fr-FR') : 'N/A'}
                          {order.totalAmount && (
                            <span className="hidden sm:inline"> • {order.totalAmount.toLocaleString('fr-FR')} €</span>
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="text-primary-600 shrink-0" size={20} />
                      )}
                    </div>
                    {order.lines && order.lines.length > 0 && (
                      <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2 line-clamp-2">
                        {order.lines.slice(0, 2).map(l => l.productName).join(', ')}
                        {order.lines.length > 2 && ` +${order.lines.length - 2}`}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Package className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="text-sm sm:text-base">Aucune commande trouvée</p>
              <p className="text-xs sm:text-sm mt-1">Continuez avec une demande générale</p>
            </div>
          )
        ) : (
          // Sélection des produits (commande déjà sélectionnée)
          <>
            {/* Commande sélectionnée */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-2">
              <div className="flex items-center min-w-0 flex-1">
                <Package className="text-blue-600 mr-2 shrink-0" size={16} />
                <span className="text-xs sm:text-sm text-blue-800 truncate">
                  <strong>{selectedOrder?.orderNumber}</strong>
                  {selectedOrder?.orderDate && (
                    <span className="text-blue-600 ml-1 sm:ml-2 hidden sm:inline">
                      du {new Date(selectedOrder.orderDate).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedProducts([]);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
              >
                Changer
              </button>
            </div>

            {/* Liste des produits */}
            <div>
              <label className="label text-sm">Produit(s) concerné(s)</label>
              <div className="space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto -mx-1 px-1">
                {orderLines.map((line, index) => {
                  const isSelected = selectedProducts.includes(line.productCode);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleProductSelection(line.productCode)}
                      className={cn(
                        'w-full p-3 sm:p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2">{line.productName}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            Réf: {line.productCode} <span className="hidden sm:inline">•</span> <span className="sm:inline block sm:ml-0">Qté: {line.quantity}</span>
                          </p>
                        </div>
                        <div className={cn(
                          'w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center shrink-0 ml-2 sm:ml-3 transition-colors',
                          isSelected
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300'
                        )}>
                          {isSelected && <CheckCircle className="text-white" size={14} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedProducts.length > 0 && (
                <p className="text-xs sm:text-sm text-primary-600 font-medium mt-2 sm:mt-3">
                  {selectedProducts.length} produit(s) sélectionné(s)
                </p>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          {!showProductSelection && orders.length > 0 ? (
            <>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setFormData((prev) => ({ ...prev, orderId: '' }));
                  setSelectedProducts([]);
                  handleNext();
                }}
                className="btn-outline flex-1 text-sm sm:text-base py-2.5 sm:py-3"
              >
                Non, demande générale
              </button>
              <button
                onClick={() => {
                  // Si la commande n'a pas de produits, passer directement à l'étape suivante
                  if (selectedOrder && (!selectedOrder.lines || selectedOrder.lines.length === 0)) {
                    handleNext();
                  }
                  // Sinon on reste sur cette étape pour afficher les produits
                }}
                disabled={!selectedOrder}
                className="btn-primary flex-1 text-sm sm:text-base py-2.5 sm:py-3"
              >
                Continuer
                <ArrowRight size={16} className="ml-1.5 sm:ml-2 sm:w-[18px] sm:h-[18px]" />
              </button>
            </>
          ) : showProductSelection ? (
            <button
              onClick={handleNext}
              className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-3"
            >
              Continuer
              <ArrowRight size={16} className="ml-1.5 sm:ml-2 sm:w-[18px] sm:h-[18px]" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn-primary w-full text-sm sm:text-base py-2.5 sm:py-3"
            >
              Continuer
              <ArrowRight size={16} className="ml-1.5 sm:ml-2 sm:w-[18px] sm:h-[18px]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // ÉTAPE 2: Type de problème
  // ============================================
  const renderTypeStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <HelpCircle className="text-amber-600 sm:hidden" size={24} />
          <HelpCircle className="text-amber-600 hidden sm:block" size={32} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Comment vous aider ?
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Sélectionnez la catégorie de votre demande.
        </p>
      </div>

      {/* Afficher la commande sélectionnée */}
      {selectedOrder && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0 flex-1">
            <Package className="text-blue-600 mr-2 shrink-0" size={16} />
            <span className="text-xs sm:text-sm text-blue-800 truncate">
              <strong>{selectedOrder.orderNumber}</strong>
              {selectedProducts.length > 0 && (
                <span className="ml-1 sm:ml-2 text-blue-600">
                  • {selectedProducts.length} produit(s)
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() => setStep(1)}
            className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
          >
            Modifier
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {ISSUE_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = formData.issueType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => setFormData((prev) => ({ ...prev, issueType: type.value }))}
              className={cn(
                'p-3 sm:p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3',
                type.bgColor
              )}>
                <Icon className={type.textColor} size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">{type.label}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t gap-3">
        <button onClick={handleBack} className="btn-outline text-sm sm:text-base py-2 sm:py-2.5">
          <ArrowLeft size={16} className="mr-1.5 sm:mr-2" />
          Retour
        </button>
        <button onClick={handleNext} className="btn-primary text-sm sm:text-base py-2 sm:py-2.5">
          Continuer
          <ArrowRight size={16} className="ml-1.5 sm:ml-2" />
        </button>
      </div>
    </div>
  );

  // ============================================
  // ÉTAPE 3: Détails (équipement si technique + description)
  // ============================================
  const renderDetailsStep = () => {
    const issueType = formData.issueType;
    const predefinedOptions = PREDEFINED_ISSUES[issueType] || [];
    const isTechnical = issueType === IssueType.TECHNICAL;

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center mb-4 sm:mb-6">
          <div className={cn(
            'w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4',
            isTechnical ? 'bg-purple-100' : 'bg-primary-100'
          )}>
            {isTechnical ? (
              <>
                <Settings className="text-purple-600 sm:hidden" size={24} />
                <Settings className="text-purple-600 hidden sm:block" size={32} />
              </>
            ) : (
              <>
                <FileText className="text-primary-600 sm:hidden" size={24} />
                <FileText className="text-primary-600 hidden sm:block" size={32} />
              </>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Détails de votre demande
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            {isTechnical
              ? 'Décrivez le problème rencontré.'
              : 'Sélectionnez le problème et ajoutez des détails.'}
          </p>
        </div>

        {/* Afficher la commande et produits sélectionnés */}
        {selectedOrder && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center justify-between mb-1 gap-2">
              <div className="flex items-center min-w-0 flex-1">
                <Package className="text-blue-600 mr-2 shrink-0" size={16} />
                <span className="text-xs sm:text-sm text-blue-800 truncate">
                  <strong>{selectedOrder.orderNumber}</strong>
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
              >
                Modifier
              </button>
            </div>
            {selectedProducts.length > 0 && selectedOrder.lines && (
              <p className="text-[11px] sm:text-xs text-blue-700 line-clamp-2">
                {selectedProducts.length} produit(s) : {selectedOrder.lines
                  .filter(l => selectedProducts.includes(l.productCode))
                  .map(l => l.productName)
                  .join(', ')
                }
              </p>
            )}
          </div>
        )}

        {/* Sélection du problème prédéfini */}
        <div>
          <label className="label">Quel est le problème ? <span className="text-red-500">*</span></label>
          <div className="space-y-2">
            {predefinedOptions.map((issue, index) => (
              <button
                key={index}
                onClick={() => setPredefinedIssue(issue)}
                className={cn(
                  'w-full p-3 rounded-xl border-2 text-left transition-all',
                  predefinedIssue === issue
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 text-sm">{issue}</span>
                  {predefinedIssue === issue && (
                    <CheckCircle className="text-primary-600 shrink-0" size={18} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Informations équipement (TECHNIQUE uniquement) */}
        {isTechnical && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-purple-800 flex items-center gap-2">
              <Settings size={16} />
              Informations équipement (optionnel)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Numéro de série */}
              <div className="md:col-span-2">
                <label className="label text-sm flex items-center gap-2">
                  <Hash size={14} className="text-gray-400" />
                  Numéro de série
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="Ex: SN-2024-ABC123"
                  className="input text-sm"
                />
              </div>

              {/* Marque */}
              <div>
                <label className="label text-sm">Marque</label>
                <select
                  value={formData.equipmentBrand}
                  onChange={(e) => setFormData((prev) => ({ ...prev, equipmentBrand: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="">Sélectionner</option>
                  {EQUIPMENT_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Modèle */}
              <div>
                <label className="label text-sm">Modèle</label>
                <input
                  type="text"
                  value={formData.equipmentModel}
                  onChange={(e) => setFormData((prev) => ({ ...prev, equipmentModel: e.target.value }))}
                  placeholder="Ex: KLY-3000 Pro"
                  className="input text-sm"
                />
              </div>

              {/* Code erreur */}
              <div className="md:col-span-2">
                <label className="label text-sm flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-500" />
                  Code d'erreur affiché
                </label>
                <input
                  type="text"
                  value={formData.errorCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, errorCode: e.target.value }))}
                  placeholder="Ex: E-404, ERR_MOTOR_01"
                  className="input text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Description supplémentaire */}
        <div>
          <label className="label">Détails supplémentaires (optionnel)</label>
          <textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Ajoutez des informations complémentaires si nécessaire..."
            className="input min-h-[80px] resize-y"
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {customDescription.length}/2000 caractères
          </p>
        </div>

        {/* Priority */}
        <div>
          <label className="label">Niveau d'urgence</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFormData((prev) => ({ ...prev, priority: option.value }))}
                className={cn(
                  'p-2 rounded-lg border-2 text-center transition-all',
                  formData.priority === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-medium text-xs">{option.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="label">Pièces jointes (optionnel)</label>
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-4 text-center transition-colors',
              files.length >= 5 ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
            )}
          >
            {files.length < 5 ? (
              <label className="cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-sm text-gray-600 font-medium">
                  Ajouter des fichiers
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
              <p className="text-sm text-gray-500">Max atteint</p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center min-w-0">
                    <FileText className="text-gray-400 shrink-0" size={16} />
                    <span className="ml-2 text-xs text-gray-700 truncate">{file.name}</span>
                    <span className="ml-2 text-xs text-gray-500 shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 sm:pt-6 border-t gap-3">
          <button onClick={handleBack} className="btn-outline text-sm sm:text-base py-2 sm:py-2.5">
            <ArrowLeft size={16} className="mr-1.5 sm:mr-2" />
            Retour
          </button>
          <button
            onClick={handleNext}
            disabled={!predefinedIssue}
            className="btn-primary text-sm sm:text-base py-2 sm:py-2.5"
          >
            Continuer
            <ArrowRight size={16} className="ml-1.5 sm:ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // ÉTAPE 4: Contact et validation (Envoi)
  // ============================================
  const renderFinalStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <CheckCircle className="text-green-600 sm:hidden" size={24} />
          <CheckCircle className="text-green-600 hidden sm:block" size={32} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Dernière étape !
        </h2>
        <p className="text-sm sm:text-base text-gray-600">
          Vérifiez vos informations et ajoutez un contact.
        </p>
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Résumé de votre demande</h3>

        {/* Commande liée */}
        {selectedOrder && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 flex items-center">
            <Package className="text-blue-600 mr-2 shrink-0" size={16} />
            <span className="text-xs sm:text-sm text-blue-800 truncate">
              <strong>{selectedOrder.orderNumber}</strong>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-1 sm:ml-2 font-medium">
              {ISSUE_TYPES.find(t => t.value === formData.issueType)?.label}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Priorité:</span>
            <span className="ml-1 sm:ml-2 font-medium">
              {PRIORITY_OPTIONS.find(p => p.value === formData.priority)?.label}
            </span>
          </div>
        </div>

        {/* Problème sélectionné */}
        {predefinedIssue && (
          <div className="text-xs sm:text-sm">
            <span className="text-gray-500">Problème:</span>
            <span className="ml-1 sm:ml-2 font-medium">{predefinedIssue}</span>
          </div>
        )}

        {/* Produits concernés */}
        {selectedProducts.length > 0 && selectedOrder?.lines && (
          <div className="text-xs sm:text-sm">
            <span className="text-gray-500">Produit(s):</span>
            <div className="mt-1 space-y-0.5 sm:space-y-1">
              {selectedOrder.lines
                .filter(line => selectedProducts.includes(line.productCode))
                .map((line, index) => (
                  <div key={index} className="ml-2 text-gray-700 line-clamp-1">
                    • {line.productName}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* N° de série (technique) */}
        {formData.serialNumber && (
          <div className="text-xs sm:text-sm">
            <span className="text-gray-500">N° série:</span>
            <span className="ml-1 sm:ml-2 font-medium">{formData.serialNumber}</span>
          </div>
        )}
        {formData.errorCode && (
          <div className="text-xs sm:text-sm">
            <span className="text-gray-500">Code erreur:</span>
            <span className="ml-1 sm:ml-2 font-medium text-orange-600">{formData.errorCode}</span>
          </div>
        )}

        {/* Détails supplémentaires */}
        {customDescription && (
          <div className="text-xs sm:text-sm">
            <span className="text-gray-500">Détails:</span>
            <p className="mt-1 ml-2 text-gray-700 whitespace-pre-wrap line-clamp-3">{customDescription}</p>
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Comment vous contacter ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="label text-sm">Email</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="votre@email.com"
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label text-sm">Téléphone</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))}
              placeholder="06 12 34 56 78"
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start p-3 sm:p-4 bg-red-50 rounded-lg">
          <AlertCircle className="text-red-500 shrink-0" size={16} />
          <p className="ml-2 text-xs sm:text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t gap-3">
        <button onClick={handleBack} className="btn-outline text-sm sm:text-base py-2 sm:py-2.5">
          <ArrowLeft size={16} className="mr-1.5 sm:mr-2" />
          Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary text-sm sm:text-base py-2 sm:py-2.5 px-4 sm:px-8"
        >
          {isSubmitting ? (
            <Loading size="sm" />
          ) : (
            <>
              <CheckCircle size={16} className="mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Envoyer ma demande</span>
              <span className="sm:hidden">Envoyer</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ============================================
  // RENDU CONDITIONNEL DES ÉTAPES (Flux simplifié 4 étapes)
  // ============================================
  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderOrderStep();     // Commande + Produits
      case 2:
        return renderTypeStep();      // Type de problème
      case 3:
        return renderDetailsStep();   // Détails (équipement si technique + description)
      case 4:
        return renderFinalStep();     // Contact + Envoi
      default:
        return null;
    }
  };

  // Labels fixes pour le flux simplifié en 4 étapes
  const getStepLabels = () => {
    return ['Commande', 'Type', 'Détails', 'Envoi'];
  };

  const totalSteps = getTotalSteps();
  const stepLabels = getStepLabels();

  return (
    <div className="max-w-2xl mx-auto fade-in px-1 sm:px-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => step > 1 ? handleBack() : navigate(-1)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
        >
          <ArrowLeft size={16} className="mr-1 shrink-0" />
          {step > 1 ? 'Retour' : 'Retour'}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Créer un ticket</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Notre équipe vous répondra rapidement.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center mb-2 sm:mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum, index) => (
          <React.Fragment key={stepNum}>
            {index > 0 && (
              <div className={cn(
                'flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded transition-colors',
                step > index ? 'bg-primary-600' : 'bg-gray-200'
              )} />
            )}
            <div className={cn(
              'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all shrink-0',
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
      <div className="flex justify-between mb-4 sm:mb-6 px-1">
        {stepLabels.map((label, index) => (
          <span
            key={index}
            className={cn(
              'text-[10px] sm:text-xs text-center flex-1',
              step >= index + 1 ? 'text-primary-600 font-medium' : 'text-gray-400'
            )}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Form card */}
      <div className="card p-4 sm:p-6 md:p-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
}

export default CreateTicketPage;
