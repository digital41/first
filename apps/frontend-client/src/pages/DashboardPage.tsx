import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Package,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketsApi, ordersApi } from '@/services/api';
import { Ticket as TicketType, Order, TicketStats } from '@/types';
import { StatusBadge, PriorityBadge, PageLoading } from '@/components/common';
import { formatRelativeTime, formatTicketNumber } from '@/utils/helpers';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsResponse, ordersResponse] = await Promise.all([
          ticketsApi.getAll({ limit: 5 }),
          ordersApi.getAll(),
        ]);
        setRecentTickets(ticketsResponse?.data || []);
        setRecentOrders((ordersResponse || []).slice(0, 3));

        // Calculate stats from tickets
        const allTickets = await ticketsApi.getAll({ limit: 100 });
        const ticketsData = allTickets?.data || [];
        const calculatedStats: TicketStats = {
          total: allTickets?.meta?.total || ticketsData.length,
          open: ticketsData.filter(t => t.status === 'OPEN').length,
          inProgress: ticketsData.filter(t => t.status === 'IN_PROGRESS').length,
          waitingCustomer: ticketsData.filter(t => t.status === 'WAITING_CUSTOMER').length,
          resolved: ticketsData.filter(t => t.status === 'RESOLVED').length,
          closed: ticketsData.filter(t => t.status === 'CLOSED').length,
          slaBreached: ticketsData.filter(t => t.slaBreached).length,
        };
        setStats(calculatedStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <PageLoading />;
  }

  const activeTickets = (stats?.open || 0) + (stats?.inProgress || 0) + (stats?.waitingCustomer || 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Bonjour, {user?.displayName || 'Client'}
        </h1>
        <p className="text-primary-100 mb-4">
          Bienvenue dans votre espace SAV. Suivez vos demandes et commandes en temps réel.
        </p>
        <Link
          to="/tickets/new"
          className="inline-flex items-center px-4 py-2 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
        >
          <PlusCircle size={18} className="mr-2" />
          Nouveau ticket
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tickets actifs</p>
              <p className="text-2xl font-bold text-gray-900">{activeTickets}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Ticket className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-orange-600">{stats?.waitingCustomer || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Résolus</p>
              <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Pending actions alert */}
      {(stats?.waitingCustomer || 0) > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start">
          <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div className="ml-3">
            <h3 className="font-medium text-orange-800">Action requise</h3>
            <p className="text-sm text-orange-700 mt-1">
              Vous avez {stats?.waitingCustomer} ticket(s) en attente de votre réponse.
            </p>
            <Link
              to="/tickets?status=WAITING_CUSTOMER"
              className="text-sm font-medium text-orange-700 hover:text-orange-800 mt-2 inline-flex items-center"
            >
              Voir les tickets <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Recent tickets and orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="section-title">Tickets récents</h2>
            <Link
              to="/tickets"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
            >
              Tout voir <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTickets.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="mx-auto mb-2 text-gray-400" size={32} />
                <p>Aucun ticket pour le moment</p>
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-primary-600">
                          {formatTicketNumber(ticket.ticketNumber)}
                        </span>
                        <StatusBadge status={ticket.status} size="sm" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ticket.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(ticket.createdAt)}
                      </p>
                    </div>
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="section-title">Commandes récentes</h2>
            <Link
              to="/orders"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
            >
              Tout voir <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="mx-auto mb-2 text-gray-400" size={32} />
                <p>Aucune commande pour le moment</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(order.orderDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {order.status}
                      </span>
                      {order.totalAmount && (
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {order.totalAmount.toLocaleString('fr-FR')} €
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/tickets/new"
          className="card p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <PlusCircle className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Créer un ticket</p>
              <p className="text-xs text-gray-500">Nouvelle demande</p>
            </div>
          </div>
        </Link>

        <Link
          to="/faq"
          className="card p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <AlertCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">FAQ</p>
              <p className="text-xs text-gray-500">Questions fréquentes</p>
            </div>
          </div>
        </Link>

        <Link
          to="/orders"
          className="card p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
              <Package className="text-cyan-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Mes commandes</p>
              <p className="text-xs text-gray-500">Historique</p>
            </div>
          </div>
        </Link>

        <Link
          to="/contact"
          className="card p-4 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <MessageSquare className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Contact</p>
              <p className="text-xs text-gray-500">Nous joindre</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default DashboardPage;
