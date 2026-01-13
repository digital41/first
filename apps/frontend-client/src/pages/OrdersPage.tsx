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
  ChevronRight
} from 'lucide-react';
import { ordersApi } from '@/services/api';
import { Order } from '@/types';
import { PageLoading, EmptyState } from '@/components/common';
import { formatDate, formatDateTime, cn } from '@/utils/helpers';

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
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'livrée':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'shipped':
      case 'expédiée':
        return <Truck className="text-blue-500" size={18} />;
      case 'processing':
      case 'en traitement':
        return <Clock className="text-yellow-500" size={18} />;
      case 'cancelled':
      case 'annulée':
        return <AlertCircle className="text-red-500" size={18} />;
      default:
        return <Package className="text-gray-500" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'livrée':
        return 'bg-green-100 text-green-800';
      case 'shipped':
      case 'expédiée':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
      case 'en traitement':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'annulée':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card p-4 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Commandé le {formatDate(order.orderDate)}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {order.items.length} article{order.items.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center">
                  <div className="mr-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(order.status)
                      )}
                    >
                      {order.status}
                    </span>
                    {order.totalAmount && (
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {order.totalAmount.toLocaleString('fr-FR')} €
                      </p>
                    )}
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
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

  if (isLoading) {
    return <PageLoading />;
  }

  if (!order) {
    return null;
  }

  const getStatusStep = (status: string): number => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'en attente':
        return 0;
      case 'processing':
      case 'en traitement':
        return 1;
      case 'shipped':
      case 'expédiée':
        return 2;
      case 'delivered':
      case 'livrée':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = getStatusStep(order.status);

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

        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title">{order.orderNumber}</h1>
            <p className="page-subtitle">
              Commandé le {formatDateTime(order.orderDate)}
            </p>
          </div>
          <Link
            to={`/tickets/new?orderId=${order.id}`}
            className="btn-primary"
          >
            <PlusCircle size={18} className="mr-2" />
            Signaler un problème
          </Link>
        </div>
      </div>

      {/* Status tracker */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Suivi de livraison</h2>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {[
              { label: 'Commande reçue', icon: FileText },
              { label: 'En préparation', icon: Package },
              { label: 'Expédiée', icon: Truck },
              { label: 'Livrée', icon: CheckCircle },
            ].map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.label} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center z-10',
                      isCompleted
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-sm text-center',
                      isCurrent ? 'font-semibold text-primary-600' : 'text-gray-600'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {order.deliveryDate && (
          <p className="mt-6 text-center text-gray-600">
            <Calendar className="inline mr-1" size={16} />
            Livraison prévue le {formatDate(order.deliveryDate)}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order details */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Détails de la commande</h2>

          {order.items && order.items.length > 0 ? (
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    {item.productSku && (
                      <p className="text-sm text-gray-500">Réf: {item.productSku}</p>
                    )}
                    <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {item.totalPrice.toLocaleString('fr-FR')} €
                  </p>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{order.totalAmount?.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Aucun détail disponible</p>
          )}
        </div>

        {/* Shipping info */}
        <div className="space-y-6">
          {/* Delivery address */}
          {order.shippingAddress && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin size={18} className="mr-2 text-gray-400" />
                Adresse de livraison
              </h2>
              <p className="text-gray-700 whitespace-pre-line">{order.shippingAddress}</p>
            </div>
          )}

          {/* Contact info */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Informations de contact</h2>
            <dl className="space-y-3">
              {order.customerName && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Nom</dt>
                  <dd className="text-gray-900">{order.customerName}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 uppercase">Email</dt>
                <dd className="text-gray-900">{order.customerEmail}</dd>
              </div>
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
