import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  MessageCircle,
  Sparkles,
  HeadphonesIcon,
  Package,
  Bell
} from 'lucide-react';
import { Ticket, TicketStatus } from '../../types';
import { ApiService } from '../../services/api';

/**
 * IDEAL CLIENT DASHBOARD
 *
 * Design Philosophy:
 * - Status-first: Show what's happening with their issues immediately
 * - Single clear action: "I need help" is the primary CTA
 * - Reassurance: Always show next steps and expected timelines
 * - Minimal cognitive load: Only show what matters
 */

interface ClientDashboardIdealProps {
  onNeedHelp: () => void;
  onViewTicket: (ticket: Ticket) => void;
}

const ClientDashboardIdeal: React.FC<ClientDashboardIdealProps> = ({
  onNeedHelp,
  onViewTicket
}) => {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveTicket();
  }, []);

  const loadActiveTicket = async () => {
    try {
      const response = await ApiService.getTickets();
      // Handle paginated response - extract data array
      const ticketsArray = Array.isArray(response) ? response : (response.data || []);
      // Get the most recent active ticket
      const active = ticketsArray
        .filter((t: Ticket) => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED)
        .sort((a: Ticket, b: Ticket) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      setActiveTicket(active || null);
    } catch (error) {
      console.error('Failed to load tickets', error);
    } finally {
      setLoading(false);
    }
  };

  // Get friendly status message
  const getStatusMessage = (status: TicketStatus): { message: string; subtext: string; color: string } => {
    switch (status) {
      case TicketStatus.OPEN:
        return {
          message: "Nous avons bien reçu votre demande",
          subtext: "Un technicien va la prendre en charge sous peu",
          color: "blue"
        };
      case TicketStatus.IN_PROGRESS:
        return {
          message: "Votre demande est en cours de traitement",
          subtext: "Notre équipe travaille activement sur votre dossier",
          color: "amber"
        };
      case TicketStatus.WAITING_CUSTOMER:
        return {
          message: "Nous attendons votre réponse",
          subtext: "Merci de nous fournir les informations demandées",
          color: "purple"
        };
      case TicketStatus.ESCALATED:
        return {
          message: "Votre dossier a été transmis à un expert",
          subtext: "Un spécialiste vous contactera rapidement",
          color: "red"
        };
      default:
        return {
          message: "Votre demande est en attente",
          subtext: "Nous reviendrons vers vous rapidement",
          color: "slate"
        };
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Greeting */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Espace Client KLY Groupe
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Comment pouvons-nous
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              vous aider ?
            </span>
          </h1>
        </div>

        {/* Active Ticket Status Card - If exists */}
        {!loading && activeTicket && (
          <div
            onClick={() => onViewTicket(activeTicket)}
            className="mb-8 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl transition-all group"
          >
            {/* Status Indicator Bar */}
            <div className={`h-2 ${
              activeTicket.status === TicketStatus.WAITING_CUSTOMER ? 'bg-purple-500' :
              activeTicket.status === TicketStatus.IN_PROGRESS ? 'bg-amber-500' :
              'bg-blue-500'
            }`} />

            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Status Badge */}
                  <div className="flex items-center mb-4">
                    {activeTicket.status === TicketStatus.WAITING_CUSTOMER ? (
                      <div className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full">
                        <Bell className="w-4 h-4 mr-2 animate-pulse" />
                        <span className="text-sm font-semibold">Action requise</span>
                      </div>
                    ) : (
                      <div className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm font-semibold">Demande en cours</span>
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {getStatusMessage(activeTicket.status).message}
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {getStatusMessage(activeTicket.status).subtext}
                  </p>

                  {/* Ticket Reference */}
                  <div className="flex items-center text-sm text-slate-400">
                    <Package className="w-4 h-4 mr-2" />
                    <span>Dossier {activeTicket.id}</span>
                    <span className="mx-2">•</span>
                    <span>Ouvert le {new Date(activeTicket.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {/* View Arrow */}
                <div className="ml-6 flex-shrink-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <button
            onClick={onNeedHelp}
            className="w-full p-8 md:p-10 text-left hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mr-6 group-hover:scale-105 transition-transform">
                  <HeadphonesIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-1">J'ai besoin d'aide</h3>
                  <p className="text-slate-500">Ouvrir une nouvelle demande d'assistance</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Secondary Action */}
          <button
            onClick={() => {/* Open ticket lookup */}}
            className="w-full p-6 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mr-4">
                <MessageCircle className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-slate-600 font-medium">J'ai déjà un dossier en cours</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Reassurance Footer */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center justify-center space-x-8 text-sm text-slate-400">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              <span>Réponse sous 2h</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              <span>Lun-Ven 8h-18h</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              <span>Équipe France</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Urgence ?{' '}
            <a href="tel:+33123456789" className="text-blue-600 font-semibold hover:underline">
              Appelez le +33 1 23 45 67 89
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardIdeal;
