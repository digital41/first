import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  AlertCircle,
  PlusCircle,
  FileText,
  ChevronRight,
  Receipt,
  ShoppingCart,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { ordersApi } from '@/services/api';
import { Order } from '@/types';
import { PageLoading, EmptyState } from '@/components/common';
import { formatDate, formatDateTime, cn } from '@/utils/helpers';

// Labels de statut SAGE
const SAGE_STATUS_LABELS: Record<string, string> = {
  'DEVIS': 'Devis',
  'EN_COURS': 'En cours',
  'EN_PREPARATION': 'En préparation',
  'LIVREE': 'Livrée',
  'FACTUREE': 'Facturée',
  'RETOUR': 'Retour',
  'AVOIR': 'Avoir',
  'INCONNU': 'Inconnu',
};

// Types de documents SAGE
const DOC_TYPE_LABELS: Record<number, string> = {
  0: 'Devis',
  1: 'Bon de Commande',
  2: 'Bon de Préparation',
  3: 'Bon de Livraison',
  4: 'Bon de Retour',
  5: 'Avoir',
  6: 'Facture',
  7: 'Facture',
};

/**
 * Vérifie si une date est valide (pas la date NULL de SAGE 1753-01-01)
 */
const isValidSageDate = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  // Vérifier si la date est valide et n'est pas la date NULL de SAGE (1753)
  return !isNaN(date.getTime()) && date.getFullYear() > 1753;
};

/**
 * Retourne la date de livraison appropriée selon le type de document SAGE
 * - BC (docType=1): Bon de commande → date de livraison prévue
 * - PL (docType=2): Commande en préparation → date de livraison prévue
 * - BL (docType=3): Commande livrée → date création BL = date livraison
 * - BR (docType=4): Bon de retour → date du retour
 * - AVOIR (docType=5): Avoir → date de l'avoir
 * - FA (docType=6/7): Facture → date de facturation
 */
const getDeliveryDateInfo = (order: Order): { date: string | null; label: string } => {
  const docType = order.docType || 0;

  // Pour BL (type 3) : La date du BL est la date de livraison effective
  if (docType === 3) {
    if (isValidSageDate(order.orderDate)) {
      return { date: order.orderDate!, label: 'Livré le' };
    }
    if (isValidSageDate(order.createdAt)) {
      return { date: order.createdAt!, label: 'Livré le' };
    }
  }

  // Pour PL/BP (type 2) : En préparation, la date de commande est la date prévue
  if (docType === 2) {
    if (isValidSageDate(order.deliveryDate)) {
      return { date: order.deliveryDate!, label: 'Livraison prévue le' };
    }
    if (isValidSageDate(order.orderDate)) {
      return { date: order.orderDate!, label: 'Livraison prévue le' };
    }
  }

  // Pour BR (type 4) : Bon de retour
  if (docType === 4) {
    if (isValidSageDate(order.orderDate)) {
      return { date: order.orderDate!, label: 'Retour du' };
    }
  }

  // Pour AVOIR (type 5) : Avoir financier
  if (docType === 5) {
    if (isValidSageDate(order.orderDate)) {
      return { date: order.orderDate!, label: 'Avoir du' };
    }
  }

  // Pour FA (type 6 ou 7) : Facture
  if (docType === 6 || docType === 7) {
    if (isValidSageDate(order.orderDate)) {
      return { date: order.orderDate!, label: 'Facturé le' };
    }
  }

  // Pour BC (type 1) ou autres : Utiliser deliveryDate si valide
  if (isValidSageDate(order.deliveryDate)) {
    return { date: order.deliveryDate!, label: 'Livraison prévue le' };
  }

  // Fallback: pas de date valide
  return { date: null, label: '' };
};

// Nombre de commandes par page (pagination infinie)
const ORDERS_PER_PAGE = 5;

// Orders List Page
export function OrdersListPage() {
  const currentYear = new Date().getFullYear();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReturns, setShowReturns] = useState(false); // Afficher retours/avoirs
  const [selectedYear, setSelectedYear] = useState(currentYear); // Année sélectionnée
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Années disponibles (année courante et année précédente)
  const availableYears = [currentYear, currentYear - 1];

  const [totalOrders, setTotalOrders] = useState(0);

  // Fonction pour charger les commandes (première page ou refresh)
  const fetchOrders = useCallback(async (forceRefresh = false, includeReturns = false, year?: number) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      }
      const response = await ordersApi.getAllPaginated(1, ORDERS_PER_PAGE, forceRefresh, includeReturns, year);
      setOrders(response.data || []);
      setTotalOrders(response.meta.total);
      setCurrentPage(1);
      // Il y a plus de commandes si la page actuelle * limit < total
      setHasMore(response.data.length > 0 && response.data.length < response.meta.total);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      setTotalOrders(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Charger plus de commandes (pagination infinie)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await ordersApi.getAllPaginated(nextPage, ORDERS_PER_PAGE, false, showReturns, selectedYear);
      if (response.data && response.data.length > 0) {
        setOrders(prev => [...prev, ...response.data]);
        setCurrentPage(nextPage);
        // Vérifier s'il reste des commandes à charger
        const loadedCount = orders.length + response.data.length;
        setHasMore(loadedCount < response.meta.total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more orders:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore, showReturns, selectedYear, orders.length]);

  // Chargement initial et quand l'année change
  useEffect(() => {
    setIsLoading(true);
    setOrders([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchOrders(false, showReturns, selectedYear);
  }, [fetchOrders, showReturns, selectedYear]);

  // Rafraîchir les données depuis SAGE
  const handleRefresh = () => {
    setOrders([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchOrders(true, showReturns, selectedYear);
  };

  // Toggle retours/avoirs
  const handleToggleReturns = () => {
    const newValue = !showReturns;
    setShowReturns(newValue);
  };

  // Changer d'année
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'FACTUREE':
      case 'DELIVERED':
      case 'LIVRÉE':
        return <Receipt className="text-green-500" size={18} />;
      case 'LIVREE':
      case 'SHIPPED':
      case 'EXPÉDIÉE':
        return <Truck className="text-blue-500" size={18} />;
      case 'EN_PREPARATION':
        return <Package className="text-orange-500" size={18} />;
      case 'EN_COURS':
      case 'PROCESSING':
      case 'EN TRAITEMENT':
        return <Clock className="text-yellow-500" size={18} />;
      case 'RETOUR':
        return <ArrowLeft className="text-purple-500" size={18} />;
      case 'AVOIR':
        return <CreditCard className="text-indigo-500" size={18} />;
      case 'DEVIS':
        return <FileText className="text-gray-500" size={18} />;
      case 'CANCELLED':
      case 'ANNULÉE':
        return <AlertCircle className="text-red-500" size={18} />;
      default:
        return <ShoppingCart className="text-gray-500" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'FACTUREE':
        return 'bg-green-100 text-green-800';
      case 'LIVREE':
      case 'DELIVERED':
      case 'LIVRÉE':
        return 'bg-blue-100 text-blue-800';
      case 'EN_PREPARATION':
        return 'bg-orange-100 text-orange-800';
      case 'EN_COURS':
      case 'PROCESSING':
      case 'EN TRAITEMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETOUR':
        return 'bg-purple-100 text-purple-800';
      case 'AVOIR':
        return 'bg-indigo-100 text-indigo-800';
      case 'DEVIS':
        return 'bg-gray-100 text-gray-600';
      case 'CANCELLED':
      case 'ANNULÉE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return SAGE_STATUS_LABELS[status.toUpperCase()] || status;
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Mes commandes</h1>
          <p className="page-subtitle">
            Consultez l'historique de vos commandes et leur statut de livraison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {/* Sélecteur d'année */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  selectedYear === year
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Toggle Retours/Avoirs */}
          <button
            onClick={handleToggleReturns}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showReturns
                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            )}
            title={showReturns ? 'Masquer les retours et avoirs' : 'Afficher les retours et avoirs'}
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Retours/Avoirs</span>
          </button>

          {/* Bouton Actualiser */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-outline flex items-center justify-center gap-2"
            title="Actualiser les données depuis SAGE"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          title="Aucune commande"
          description="Vous n'avez pas encore de commande associée à votre compte."
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order) => (
            <Link
              key={order.orderNumber}
              to={`/orders/${order.orderNumber}`}
              className="card p-3 sm:p-4 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon - hidden on very small screens */}
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-lg items-center justify-center flex-shrink-0">
                  {getStatusIcon(order.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Icon on mobile */}
                        <div className="sm:hidden w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(order.status)}
                        </div>
                        <h3 className="font-semibold text-gray-900 break-all">{order.orderNumber}</h3>
                      </div>
                      {order.docType && (
                        <p className="text-xs text-primary-600 font-medium mt-1">
                          {DOC_TYPE_LABELS[order.docType] || 'Document'}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {order.createdAt
                          ? `Créé le ${formatDateTime(order.createdAt)}`
                          : order.orderDate
                            ? `Date: ${formatDate(order.orderDate)}`
                            : 'Date non disponible'}
                      </p>
                      {order.companyName && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{order.companyName}</p>
                      )}
                      {/* Afficher le nombre de lignes de commande */}
                      {order.lines && order.lines.length > 0 && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {order.lines.length} article{order.lines.length > 1 ? 's' : ''}
                        </p>
                      )}
                      {order.items && order.items.length > 0 && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          {order.items.length} article{order.items.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Right side - status and price */}
                    <div className="flex items-center flex-shrink-0">
                      <div className="text-right">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium',
                            getStatusColor(order.status)
                          )}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                        {order.totalAmount !== undefined && order.totalAmount !== null && (
                          <p className="text-sm sm:text-lg font-semibold text-gray-900 mt-1 whitespace-nowrap">
                            {Number(order.totalAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € <span className="text-xs text-gray-500">HT</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="text-gray-400 ml-2 sm:ml-4 flex-shrink-0" size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Bouton "Voir plus" pour pagination infinie */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="btn-outline flex items-center justify-center gap-2 px-6 py-3"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Package size={18} />
                    Voir plus de commandes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Message fin de liste */}
          {!hasMore && orders.length > 0 && (
            <p className="text-center text-sm text-gray-500 pt-4">
              {orders.length === totalOrders
                ? `Toutes les commandes ont été chargées (${totalOrders} au total)`
                : `${orders.length} commandes affichées sur ${totalOrders}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Order Detail Page
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const response = await ordersApi.getById(id);
        setOrder(response);
      } catch (error) {
        console.error('Error fetching order:', error);
        navigate('/orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  // Télécharger la facture en PDF
  const handleDownloadInvoice = async () => {
    if (!order?.orderNumber) return;

    setIsDownloading(true);
    try {
      await ordersApi.downloadInvoice(order.orderNumber);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!order) {
    return null;
  }

  // Statut SAGE: EN_PREPARATION -> 0, LIVREE -> 1, FACTUREE -> 2
  const getStatusStep = (status: string): number => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'EN_PREPARATION':
      case 'EN_COURS':
      case 'PENDING':
      case 'PROCESSING':
        return 0;
      case 'LIVREE':
      case 'SHIPPED':
      case 'EXPÉDIÉE':
        return 1;
      case 'FACTUREE':
      case 'DELIVERED':
      case 'LIVRÉE':
        return 2;
      default:
        return 0;
    }
  };

  const currentStep = getStatusStep(order.status);

  // Lignes de commande (SAGE ou local)
  const orderLines = order.lines || [];
  const orderItems = order.items || [];
  const hasLines = orderLines.length > 0 || orderItems.length > 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} className="mr-1" />
          Retour aux commandes
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="page-title break-words">{order.orderNumber}</h1>
            {order.docType && (
              <p className="text-sm text-primary-600 font-medium mb-1">
                {DOC_TYPE_LABELS[order.docType] || 'Document'}
              </p>
            )}
            <p className="page-subtitle">
              {order.createdAt
                ? `Créé le ${formatDateTime(order.createdAt)}`
                : order.orderDate
                  ? `Date: ${formatDate(order.orderDate)}`
                  : 'Date non disponible'}
            </p>
            {order.companyName && (
              <p className="text-gray-600 mt-1 break-words">{order.companyName}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Bouton télécharger PDF */}
            <button
              onClick={handleDownloadInvoice}
              disabled={isDownloading}
              className="btn-outline flex items-center justify-center w-full sm:w-auto"
            >
              {isDownloading ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Download size={18} className="mr-2" />
              )}
              {isDownloading ? 'Téléchargement...' : 'Télécharger PDF'}
            </button>

            {/* Bouton signaler problème */}
            <Link
              to={`/orders/${order.orderNumber}/ticket`}
              className="btn-primary flex items-center justify-center w-full sm:w-auto"
            >
              <PlusCircle size={18} className="mr-2" />
              Signaler un problème
            </Link>
          </div>
        </div>
      </div>

      {/* Status tracker - Adapté pour SAGE */}
      <div className="card p-4 sm:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 sm:mb-6">Statut de la commande</h2>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-4 sm:top-5 left-6 right-6 sm:left-0 sm:right-0 h-0.5 bg-gray-200">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </div>

          {/* Steps - Adapté pour SAGE (BP, BL, FA) */}
          <div className="relative flex justify-between">
            {[
              { label: 'En préparation', shortLabel: 'Préparation', icon: Package, status: 'EN_PREPARATION' },
              { label: 'Livrée', shortLabel: 'Livrée', icon: Truck, status: 'LIVREE' },
              { label: 'Facturée', shortLabel: 'Facturée', icon: Receipt, status: 'FACTUREE' },
            ].map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;

              // Déterminer la date de transformation pour chaque étape
              // - Préparation: bpDate (date du BP) ou createdAt si c'est un BP (docType=2)
              // - Livrée: blDate (date du BL) ou createdAt si c'est un BL (docType=3)
              // - Facturée: faDate (date de la FA) ou createdAt si c'est une FA (docType=6,7)
              let stepDate: string | undefined;
              if (index === 0) {
                // Préparation: utiliser bpDate ou createdAt si docType=2
                stepDate = order.bpDate || (order.docType === 2 ? order.createdAt : undefined);
              } else if (index === 1) {
                // Livrée: utiliser blDate ou createdAt si docType=3
                stepDate = order.blDate || (order.docType === 3 ? order.createdAt : undefined);
              } else if (index === 2) {
                // Facturée: utiliser faDate ou createdAt si docType=6 ou 7
                stepDate = order.faDate || ((order.docType === 6 || order.docType === 7) ? order.createdAt : undefined);
              }

              return (
                <div key={step.label} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center z-10',
                      isCompleted
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    )}
                  >
                    <Icon size={16} className="sm:hidden" />
                    <Icon size={20} className="hidden sm:block" />
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs sm:text-sm text-center max-w-[70px] sm:max-w-none',
                      isCurrent ? 'font-semibold text-primary-600' : 'text-gray-600'
                    )}
                  >
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                  {/* Date de transformation pour cette étape */}
                  {stepDate && isCompleted && (
                    <span className="mt-1 text-[10px] sm:text-xs text-gray-500 text-center max-w-[80px] sm:max-w-none">
                      {formatDateTime(stepDate)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(() => {
          const deliveryInfo = getDeliveryDateInfo(order);
          if (deliveryInfo.date) {
            return (
              <p className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-600">
                <Calendar className="inline mr-1" size={16} />
                {deliveryInfo.label} {formatDate(deliveryInfo.date)}
              </p>
            );
          }
          return null;
        })()}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Order details - Support SAGE lines */}
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Détails de la commande</h2>

          {hasLines ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Lignes SAGE */}
              {orderLines.map((line, index) => (
                <div key={`line-${line.lineNumber || index}`} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 break-words">{line.productName}</p>
                      {line.productCode && (
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">Réf: {line.productCode}</p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500">
                        Qté: {Number(line.quantity).toLocaleString('fr-FR')}
                        {line.unitPrice > 0 && (
                          <span className="ml-2">× {Number(line.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                        )}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900 text-right whitespace-nowrap">
                      {Number(line.totalHT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                </div>
              ))}

              {/* Lignes locales (items) */}
              {orderItems.map((item, index) => (
                <div key={`item-${item.id || index}`} className="py-3 border-b border-gray-100 last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 break-words">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">Réf: {item.productSku}</p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-500">Qté: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900 text-right whitespace-nowrap">
                      {item.totalPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                </div>
              ))}

              {/* Total */}
              {order.totalAmount !== undefined && order.totalAmount !== null && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-base sm:text-lg font-semibold">
                    <span>Total HT</span>
                    <span>{Number(order.totalAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Aucun détail disponible pour cette commande.</p>
          )}
        </div>

        {/* Shipping info */}
        <div className="space-y-4 sm:space-y-6">
          {/* Delivery address */}
          {order.shippingAddress && (
            <div className="card p-4 sm:p-6">
              <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                <MapPin size={18} className="mr-2 text-gray-400 flex-shrink-0" />
                Adresse de livraison
              </h2>
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line break-words">{order.shippingAddress}</p>
            </div>
          )}

          {/* Contact info */}
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Informations client</h2>
            <dl className="space-y-3 text-sm sm:text-base">
              {order.customerCode && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Code client</dt>
                  <dd className="text-gray-900 font-mono break-all">{order.customerCode}</dd>
                </div>
              )}
              {order.companyName && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Société</dt>
                  <dd className="text-gray-900 break-words">{order.companyName}</dd>
                </div>
              )}
              {order.customerName && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Nom</dt>
                  <dd className="text-gray-900 break-words">{order.customerName}</dd>
                </div>
              )}
              {order.customerEmail && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Email</dt>
                  <dd className="text-gray-900 break-all">{order.customerEmail}</dd>
                </div>
              )}
              {order.customerPhone && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Téléphone</dt>
                  <dd className="text-gray-900">{order.customerPhone}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrdersListPage;
