import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle,
  FileText,
  ChevronRight,
  Receipt,
  ShoppingCart,
  Download,
  Loader2
} from 'lucide-react';
import { ordersApi } from '@/services/api';
import { Order } from '@/types';
import { PageLoading, EmptyState } from '@/components/common';
import { formatDate, formatDateTime, cn } from '@/utils/helpers';

// Labels de statut SAGE
const SAGE_STATUS_LABELS: Record<string, string> = {
  'EN_COURS': 'En cours',
  'EN_PREPARATION': 'En préparation',
  'LIVREE': 'Livrée',
  'FACTUREE': 'Facturée',
  'INCONNU': 'Inconnu',
};

// Types de documents SAGE (BC type 1 exclu car ce sont des devis)
const DOC_TYPE_LABELS: Record<number, string> = {
  1: 'Bon de Commande',
  2: 'Bon de Préparation',  // PL
  3: 'Livraison',
  6: 'Facture',
};

// Orders List Page
export function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.getAll();
        setOrders(response || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

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
      <div>
        <h1 className="page-title">Mes commandes</h1>
        <p className="page-subtitle">
          Consultez l'historique de vos commandes et leur statut de livraison.
        </p>
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
                        {order.orderDate ? `Commandé le ${formatDate(order.orderDate)}` : 'Date non disponible'}
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
              {order.orderDate ? `Commandé le ${formatDateTime(order.orderDate)}` : 'Date non disponible'}
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
              to={`/tickets/new?orderNumber=${order.orderNumber}`}
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
                </div>
              );
            })}
          </div>
        </div>

        {order.deliveryDate && (
          <p className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-600">
            <Calendar className="inline mr-1" size={16} />
            Livraison prévue le {formatDate(order.deliveryDate)}
          </p>
        )}
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
