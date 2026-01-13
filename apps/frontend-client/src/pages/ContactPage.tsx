import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  PlusCircle,
  ExternalLink
} from 'lucide-react';

export function ContactPage() {
  return (
    <div className="space-y-8 fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="page-title text-3xl mb-2">Contactez-nous</h1>
        <p className="page-subtitle">
          Notre équipe est à votre disposition pour répondre à vos questions.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/tickets/new"
          className="card p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-start">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary-200 transition-colors">
              <PlusCircle className="text-primary-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Créer un ticket
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Pour toute demande technique ou commerciale, créez un ticket et nous vous répondrons rapidement.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-primary-600 mt-3">
                Créer un ticket
                <ExternalLink size={14} className="ml-1" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/faq"
          className="card p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-start">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
              <MessageSquare className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                FAQ
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Consultez notre FAQ pour trouver rapidement des réponses aux questions les plus fréquentes.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-green-600 mt-3">
                Voir la FAQ
                <ExternalLink size={14} className="ml-1" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Contact info */}
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nos coordonnées</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact details */}
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                <Phone className="text-primary-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Téléphone</h3>
                <p className="text-gray-600 mt-1">+33 1 23 45 67 89</p>
                <p className="text-sm text-gray-500 mt-1">
                  Service client disponible du lundi au vendredi
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                <Mail className="text-primary-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Email</h3>
                <p className="text-gray-600 mt-1">support@kly-groupe.com</p>
                <p className="text-sm text-gray-500 mt-1">
                  Réponse sous 24h ouvrées
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
                <MapPin className="text-primary-600" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Adresse</h3>
                <p className="text-gray-600 mt-1">
                  KLY Groupe<br />
                  123 Avenue de l'Industrie<br />
                  75001 Paris, France
                </p>
              </div>
            </div>
          </div>

          {/* Opening hours */}
          <div>
            <div className="flex items-center mb-4">
              <Clock className="text-primary-600 mr-2" size={20} />
              <h3 className="font-semibold text-gray-900">Horaires d'ouverture</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Lundi - Vendredi</span>
                <span className="font-medium text-gray-900">9h00 - 18h00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Samedi</span>
                <span className="font-medium text-gray-900">9h00 - 12h00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dimanche</span>
                <span className="text-gray-500">Fermé</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Support d'urgence 24/7 pour les clients premium
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Response times */}
      <div className="card p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nos engagements</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">24h</div>
            <p className="text-gray-600">Délai de première réponse</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">98%</div>
            <p className="text-gray-600">Taux de satisfaction client</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">72h</div>
            <p className="text-gray-600">Délai moyen de résolution</p>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4 shrink-0">
            <Phone className="text-orange-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-orange-900">Urgence technique</h3>
            <p className="text-orange-700 mt-1">
              Pour toute urgence nécessitant une intervention immédiate, appelez notre ligne d'urgence disponible 24/7 :
            </p>
            <p className="text-xl font-bold text-orange-900 mt-2">
              +33 1 23 45 67 00
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
