import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Truck,
  FileText,
  CreditCard,
  HelpCircle,
  Upload,
  X,
  CheckCircle,
  Loader2,
  ShoppingBag,
  Hash,
  Camera,
  MessageSquare,
} from 'lucide-react';
import { ticketsApi, ordersApi, uploadApi } from '@/services/api';
import { IssueType, TicketPriority, Order, OrderLine, CreateTicketInput } from '@/types';
import { PageLoading } from '@/components/common';
import { cn, formatFileSize, formatDate } from '@/utils/helpers';

// Types de problèmes spécifiques aux commandes
const ORDER_ISSUE_TYPES = [
  {
    value: IssueType.DELIVERY,
    label: 'Livraison',
    description: 'Retard, colis manquant ou endommagé',
    icon: Truck,
    color: 'bg-blue-100 text-blue-600',
    examples: ['Colis non reçu', 'Livraison en retard', 'Colis abîmé'],
  },
  {
    value: IssueType.TECHNICAL,
    label: 'Produit défectueux',
    description: 'Panne, dysfonctionnement, pièce cassée',
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-600',
    examples: ['Ne fonctionne pas', 'Pièce manquante', 'Défaut de fabrication'],
  },
  {
    value: IssueType.BILLING,
    label: 'Facturation',
    description: 'Erreur de prix, avoir, remboursement',
    icon: CreditCard,
    color: 'bg-green-100 text-green-600',
    examples: ['Erreur de montant', 'Demande d\'avoir', 'Double facturation'],
  },
  {
    value: IssueType.OTHER,
    label: 'Autre',
    description: 'Question, modification, autre demande',
    icon: HelpCircle,
    color: 'bg-gray-100 text-gray-600',
    examples: ['Question sur le produit', 'Modification commande'],
  },
];

// Problèmes prédéfinis par type
const PREDEFINED_ISSUES: Record<IssueType, string[]> = {
  [IssueType.DELIVERY]: [
    'Ma commande n\'est pas encore arrivée',
    'Le colis est arrivé endommagé',
    'Il manque des articles dans ma livraison',
    'J\'ai reçu le mauvais produit',
    'Le livreur n\'a pas trouvé mon adresse',
  ],
  [IssueType.TECHNICAL]: [
    'Le produit ne fonctionne pas',
    'Le produit est arrivé cassé',
    'Il manque des pièces ou accessoires',
    'Le produit fait un bruit anormal',
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
    'Modification de ma commande',
  ],
};

export function OrderTicketPage() {
  const navigate = useNavigate();
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Form state
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [predefinedIssue, setPredefinedIssue] = useState<string>('');
  const [customDescription, setCustomDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Load order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        navigate('/orders');
        return;
      }

      try {
        const response = await ordersApi.getById(orderNumber);
        setOrder(response);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Commande introuvable');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleProductSelection = (productCode: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productCode)
        ? prev.filter((p) => p !== productCode)
        : [...prev, productCode]
    );
  };

  const generateTitle = (): string => {
    if (!issueType || !order) return '';

    const typeLabel = ORDER_ISSUE_TYPES.find(t => t.value === issueType)?.label || 'Problème';
    const productInfo = selectedProducts.length > 0
      ? ` - ${selectedProducts.length} produit(s) concerné(s)`
      : '';

    return `${typeLabel} - Commande ${order.orderNumber}${productInfo}`;
  };

  const generateDescription = (): string => {
    const parts: string[] = [];

    // ============================================
    // SECTION 1: Problème signalé par le client
    // ============================================
    if (predefinedIssue) {
      parts.push(`Problème signalé: ${predefinedIssue}`);
    }

    if (customDescription.trim()) {
      parts.push(`\nDétails supplémentaires:\n${customDescription}`);
    }

    if (selectedProducts.length > 0 && order?.lines) {
      const productDetails = order.lines
        .filter(line => selectedProducts.includes(line.productCode))
        .map(line => `- ${line.productName} (Réf: ${line.productCode}, Qté: ${line.quantity})`)
        .join('\n');
      parts.push(`\nProduits concernés:\n${productDetails}`);
    }

    if (serialNumber) {
      parts.push(`\nN° de série: ${serialNumber}`);
    }

    if (errorCode) {
      parts.push(`Code erreur: ${errorCode}`);
    }

    // ============================================
    // SECTION 2: Contexte complet de la commande (pour l'IA)
    // ============================================
    if (order) {
      const contextParts: string[] = [];
      contextParts.push('\n\n---\n📋 INFORMATIONS COMMANDE SAGE (contexte pour le support):');

      // Informations générales
      contextParts.push(`\n• N° Commande: ${order.orderNumber}`);
      contextParts.push(`• Statut: ${order.status}`);

      // Type de document
      const docTypeLabels: Record<number, string> = {
        0: 'Devis', 1: 'Bon de Commande', 2: 'Bon de Préparation',
        3: 'Bon de Livraison', 4: 'Bon de Retour', 5: 'Avoir',
        6: 'Facture', 7: 'Facture'
      };
      if (order.docType !== undefined) {
        contextParts.push(`• Type document: ${docTypeLabels[order.docType] || 'Inconnu'}`);
      }

      // Dates
      if (order.orderDate) {
        contextParts.push(`• Date commande: ${formatDate(order.orderDate)}`);
      }
      if (order.deliveryDate) {
        contextParts.push(`• Date livraison prévue: ${formatDate(order.deliveryDate)}`);
      }
      if (order.createdAt) {
        contextParts.push(`• Créé le: ${formatDate(order.createdAt)}`);
      }

      // Dates de transformation (historique)
      if (order.bpDate) {
        contextParts.push(`• Préparation (BP): ${formatDate(order.bpDate)}`);
      }
      if (order.blDate) {
        contextParts.push(`• Livraison (BL): ${formatDate(order.blDate)}`);
      }
      if (order.faDate) {
        contextParts.push(`• Facturé (FA): ${formatDate(order.faDate)}`);
      }

      // Montants
      if (order.totalAmount !== undefined && order.totalAmount !== null) {
        contextParts.push(`• Montant total HT: ${Number(order.totalAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`);
      }

      // Client
      if (order.customerCode) {
        contextParts.push(`\n👤 CLIENT:`);
        contextParts.push(`• Code client: ${order.customerCode}`);
      }
      if (order.companyName) {
        contextParts.push(`• Société: ${order.companyName}`);
      }
      if (order.customerName) {
        contextParts.push(`• Nom: ${order.customerName}`);
      }

      // Adresse de livraison
      if (order.shippingAddress) {
        contextParts.push(`\n📍 ADRESSE LIVRAISON:\n${order.shippingAddress}`);
      }

      // Liste COMPLÈTE des produits de la commande
      const orderLines = order.lines || [];
      if (orderLines.length > 0) {
        contextParts.push(`\n📦 CONTENU DE LA COMMANDE (${orderLines.length} article${orderLines.length > 1 ? 's' : ''}):`);
        orderLines.forEach((line, index) => {
          contextParts.push(`${index + 1}. ${line.productName}`);
          contextParts.push(`   - Réf: ${line.productCode}`);
          contextParts.push(`   - Qté: ${line.quantity}`);
          if (line.unitPrice > 0) {
            contextParts.push(`   - Prix unitaire: ${Number(line.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`);
          }
          if (line.totalHT > 0) {
            contextParts.push(`   - Total HT: ${Number(line.totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`);
          }
        });
      }

      parts.push(contextParts.join('\n'));
    }

    return parts.join('\n');
  };

  const handleSubmit = async () => {
    if (!issueType || !order) {
      setError('Veuillez sélectionner un type de problème');
      return;
    }

    if (!predefinedIssue && !customDescription.trim()) {
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

      const ticketData: CreateTicketInput = {
        title: generateTitle(),
        description: generateDescription(),
        issueType,
        priority: issueType === IssueType.TECHNICAL ? TicketPriority.HIGH : TicketPriority.MEDIUM,
        orderId: order.orderNumber,
        serialNumber: serialNumber || undefined,
        errorCode: errorCode || undefined,
        attachments: attachmentIds,
      };

      const ticket = await ticketsApi.create(ticketData);
      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/tickets/${ticket.id}`, { state: { created: true } });
      }, 2000);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Demande envoyée !
        </h1>
        <p className="text-gray-600 mb-6">
          Votre ticket a été créé avec succès. Notre équipe vous répondra rapidement.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => navigate('/tickets')} className="btn-outline">
            Voir mes tickets
          </button>
          <button onClick={() => navigate('/orders')} className="btn-primary">
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <AlertTriangle className="mx-auto text-orange-500 mb-4" size={48} />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Commande introuvable</h1>
        <p className="text-gray-600 mb-6">
          Impossible de charger les détails de cette commande.
        </p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Retour aux commandes
        </button>
      </div>
    );
  }

  const orderLines = order.lines || [];

  return (
    <div className="max-w-3xl mx-auto pb-8 fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/orders/${orderNumber}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} className="mr-1" />
          Retour à la commande
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Signaler un problème</h1>
        <p className="text-gray-600 mt-1">
          Décrivez votre problème et nous vous aiderons rapidement.
        </p>
      </div>

      {/* Order Summary Card */}
      <div className="card p-4 mb-6 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Package className="text-primary-600" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
              <span className="px-2 py-0.5 bg-white rounded-full text-xs font-medium text-primary-700">
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {order.orderDate && `Commandé le ${formatDate(order.orderDate)}`}
              {order.totalAmount && ` • ${Number(order.totalAmount).toLocaleString('fr-FR')} € HT`}
            </p>
            {orderLines.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {orderLines.length} article{orderLines.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step 1: Issue Type Selection */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-bold text-sm">1</span>
          </div>
          <h2 className="font-semibold text-gray-900">Quel est le type de problème ?</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ORDER_ISSUE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = issueType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => {
                  setIssueType(type.value);
                  setPredefinedIssue('');
                }}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2',
                  type.color
                )}>
                  <Icon size={24} />
                </div>
                <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Product Selection (if order has lines) */}
      {issueType && orderLines.length > 0 && (
        <div className="card p-5 mb-4 fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-sm">2</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Quel(s) produit(s) est concerné ?</h2>
              <p className="text-sm text-gray-500">Sélectionnez un ou plusieurs produits (optionnel)</p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {orderLines.map((line: OrderLine, index: number) => {
              const isSelected = selectedProducts.includes(line.productCode);
              return (
                <button
                  key={`${line.productCode}-${index}`}
                  onClick={() => toggleProductSelection(line.productCode)}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3',
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
                    isSelected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  )}>
                    {isSelected && <CheckCircle className="text-white" size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{line.productName}</p>
                    <p className="text-xs text-gray-500">
                      Réf: {line.productCode} • Qté: {line.quantity}
                    </p>
                  </div>
                  <ShoppingBag className="text-gray-400" size={18} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Describe the issue */}
      {issueType && (
        <div className="card p-5 mb-4 fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-sm">{orderLines.length > 0 ? '3' : '2'}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Décrivez votre problème</h2>
              <p className="text-sm text-gray-500">Sélectionnez une option ou décrivez librement</p>
            </div>
          </div>

          {/* Quick selection buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PREDEFINED_ISSUES[issueType].map((issue) => (
              <button
                key={issue}
                onClick={() => setPredefinedIssue(predefinedIssue === issue ? '' : issue)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  predefinedIssue === issue
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {issue}
              </button>
            ))}
          </div>

          {/* Custom description */}
          <div>
            <label className="label flex items-center gap-2">
              <MessageSquare size={14} className="text-gray-400" />
              Détails supplémentaires
            </label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Décrivez plus en détail votre problème..."
              className="input min-h-[100px] resize-y"
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {customDescription.length}/1000
            </p>
          </div>

          {/* Technical fields */}
          {issueType === IssueType.TECHNICAL && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="label flex items-center gap-2">
                  <Hash size={14} className="text-gray-400" />
                  N° de série (si visible)
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Ex: SN-2024-ABC123"
                  className="input"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-500" />
                  Code erreur affiché
                </label>
                <input
                  type="text"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value)}
                  placeholder="Ex: E-404"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Photos/Files */}
      {issueType && (
        <div className="card p-5 mb-4 fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-sm">{orderLines.length > 0 ? '4' : '3'}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Ajouter des photos</h2>
              <p className="text-sm text-gray-500">Une photo aide souvent à mieux comprendre le problème</p>
            </div>
          </div>

          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
              files.length >= 5
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
            )}
          >
            {files.length < 5 ? (
              <label className="cursor-pointer block">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="text-gray-400" size={28} />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  Cliquez pour ajouter des photos
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG ou PDF • Max 5 fichiers
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf"
                />
              </label>
            ) : (
              <p className="text-sm text-gray-500">Nombre maximum de fichiers atteint</p>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative group bg-gray-50 rounded-lg p-2 flex items-center gap-2"
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <FileText className="text-gray-500" size={18} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertTriangle className="text-red-500 shrink-0" size={18} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit button */}
      {issueType && (
        <div className="flex items-center justify-between gap-4 fade-in">
          <button
            onClick={() => navigate(`/orders/${orderNumber}`)}
            className="btn-outline"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!predefinedIssue && !customDescription.trim())}
            className="btn-primary flex-1 sm:flex-none sm:min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <CheckCircle size={18} className="mr-2" />
                Envoyer ma demande
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default OrderTicketPage;
