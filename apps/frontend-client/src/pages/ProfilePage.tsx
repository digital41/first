import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Ticket as TicketIcon,
  Package,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketsApi, ordersApi } from '@/services/api';
import { Ticket, Order, TicketStatus } from '@/types';
import { formatRelativeTime, formatTicketNumber, cn } from '@/utils/helpers';

interface ProfileStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  totalOrders: number;
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    totalOrders: 0,
  });
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ticketsRes, orders] = await Promise.all([
          ticketsApi.getAll({ limit: 5 }),
          ordersApi.getAll(),
        ]);

        const tickets = ticketsRes.data || [];
        const openTickets = tickets.filter(
          (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS
        ).length;
        const resolvedTickets = tickets.filter(
          (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
        ).length;

        setStats({
          totalTickets: ticketsRes.meta?.total || tickets.length,
          openTickets,
          resolvedTickets,
          totalOrders: orders.length,
        });

        setRecentTickets(tickets.slice(0, 3));
        setRecentOrders(orders.slice(0, 3));
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-24" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-12 gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-white">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary-600">
                  {getInitials(user.displayName)}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 sm:mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-500">Client depuis {formatDate(user.createdAt)}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} className="mr-2" />
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations de contact</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <Mail className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <Phone className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Telephone</p>
              <p className="font-medium text-gray-900">
                {user.phoneNumber || 'Non renseigne'}
              </p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <Calendar className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Membre depuis</p>
              <p className="font-medium text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <User className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Identifiant</p>
              <p className="font-medium text-gray-900 font-mono text-sm">{user.id.slice(0, 12)}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <TicketIcon className="text-primary-500" size={20} />
            <span className="text-2xl font-bold text-gray-900">
              {isLoading ? '-' : stats.totalTickets}
            </span>
          </div>
          <p className="text-sm text-gray-500">Total tickets</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-orange-500" size={20} />
            <span className="text-2xl font-bold text-gray-900">
              {isLoading ? '-' : stats.openTickets}
            </span>
          </div>
          <p className="text-sm text-gray-500">En cours</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-2xl font-bold text-gray-900">
              {isLoading ? '-' : stats.resolvedTickets}
            </span>
          </div>
          <p className="text-sm text-gray-500">Resolus</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="text-blue-500" size={20} />
            <span className="text-2xl font-bold text-gray-900">
              {isLoading ? '-' : stats.totalOrders}
            </span>
          </div>
          <p className="text-sm text-gray-500">Commandes</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tickets recents</h2>
            <Link
              to="/tickets"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Voir tous
              <ChevronRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="text-center py-8">
              <TicketIcon className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">Aucun ticket</p>
              <Link to="/tickets/new" className="text-primary-600 text-sm hover:underline">
                Creer un ticket
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center mr-3',
                      ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED
                        ? 'bg-green-100'
                        : 'bg-orange-100'
                    )}
                  >
                    {ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED ? (
                      <CheckCircle className="text-green-600" size={16} />
                    ) : (
                      <Clock className="text-orange-600" size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatTicketNumber(ticket.ticketNumber)} - {formatRelativeTime(ticket.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" size={16} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Commandes recentes</h2>
            <Link
              to="/orders"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Voir toutes
              <ChevronRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg mr-3" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">Aucune commande</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Package className="text-blue-600" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(order.createdAt)}
                      {order.totalAmount && ` - ${order.totalAmount.toFixed(2)} EUR`}
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" size={16} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/tickets/new"
            className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <TicketIcon className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Nouveau ticket</p>
              <p className="text-xs text-gray-500">Creer une demande SAV</p>
            </div>
          </Link>

          <Link
            to="/faq"
            className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <HelpCircle className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">FAQ</p>
              <p className="text-xs text-gray-500">Questions frequentes</p>
            </div>
          </Link>

          <Link
            to="/contact"
            className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Phone className="text-green-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Contact</p>
              <p className="text-xs text-gray-500">Nous contacter</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
