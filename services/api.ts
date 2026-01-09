import { Order, Ticket, Intent } from '../types';
import { send } from '@emailjs/browser';

// --- CONFIGURATION (via variables d'environnement) ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// --- TYPES POUR LA GESTION D'ERREURS ---
export type ApiMode = 'online' | 'fallback';

export interface ApiResult<T> {
  data: T;
  mode: ApiMode;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Validation au démarrage
const isEmailConfigured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;
if (!isEmailConfigured) {
  console.warn('⚠️ Configuration EmailJS manquante. Les emails ne seront pas envoyés.');
}

/**
 * SERVICE API UNIFIÉ (Mode Hybride / Résilient)
 */
export const ApiService = {
  
  // --- AUTHENTIFICATION ---

  async login(orderId: string, plNumber: string, blNumber: string): Promise<ApiResult<Order>> {
    try {
        // 1. Tentative de connexion réelle au Backend
        const response = await fetch(`${API_BASE_URL}/auth/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, plNumber, blNumber })
        });

        if (response.ok) {
            const data = await response.json();
            return { data, mode: 'online' };
        }
        // Si le serveur répond 404 (dossier introuvable) ou autre erreur, on passe au fallback
        console.warn("API Backend réponse non-ok, passage en mode fallback.");

    } catch (e) {
        // Si le serveur est éteint (Failed to fetch)
        console.warn("API Backend inaccessible, passage en mode fallback local.");
    }

    // 2. FALLBACK : On génère une commande "volante" avec les variables saisies
    const fallbackOrder: Order = {
        id: orderId || "REF-INCONNUE",
        plNumber: plNumber || undefined,
        blNumber: blNumber || undefined,
        customerName: "Utilisateur Invité",
        purchaseDate: new Date().toLocaleDateString('fr-FR'),
        status: 'DELIVERED',
        items: [
            {
                ref: "GENERIC",
                name: "Ensemble de la commande / Dossier global",
                quantity: 1,
                imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=100&q=80"
            }
        ]
    };

    return {
        data: fallbackOrder,
        mode: 'fallback',
        message: 'Mode hors-ligne : vos références ont été enregistrées mais non vérifiées.'
    };
  },

  // --- GESTION DES FICHIERS ---
  
  async uploadFile(file: File): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }
    } catch (e) {
        console.warn("Upload échoué, utilisation URL locale");
    }
    
    // Fallback simple pour ne pas bloquer le formulaire
    return URL.createObjectURL(file);
  },

  // --- GESTION DES TICKETS ---

  async createTicket(ticketData: Omit<Ticket, 'id' | 'createdAt' | 'status'>): Promise<ApiResult<Ticket>> {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });

        if (response.ok) {
            const data = await response.json();
            return { data, mode: 'online' };
        }
    } catch (e) {
        console.warn("Création ticket API échouée, mode local activé");
    }

    // Fallback : On simule la création du ticket pour que l'utilisateur ait sa confirmation
    const fallbackTicket: Ticket = {
        ...ticketData,
        id: `SAV-${Math.floor(Math.random() * 100000)}`,
        status: 'OPEN',
        createdAt: new Date(),
    };

    // On envoie quand même l'email de confirmation via EmailJS
    const emailSent = await this.sendConfirmationEmail(fallbackTicket);

    return {
        data: fallbackTicket,
        mode: 'fallback',
        message: emailSent
            ? 'Ticket créé en mode hors-ligne. Un email de confirmation vous a été envoyé.'
            : 'Ticket créé en mode hors-ligne. L\'email de confirmation n\'a pas pu être envoyé.'
    };
  },

  async getTickets(): Promise<Ticket[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("Impossible de récupérer les tickets");
    }
    return [];
  },

  async getTicketById(id: string): Promise<Ticket | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/${id}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("Impossible de récupérer le ticket");
    }
    return null;
  },

  async updateTicket(updatedTicket: Ticket): Promise<void> {
    try {
        await fetch(`${API_BASE_URL}/tickets/${updatedTicket.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify(updatedTicket)
        });
    } catch (e) {
        console.error("Update failed");
    }
  },

  // --- UTILITAIRES EMAIL (EmailJS) ---

  async sendConfirmationEmail(ticket: Ticket): Promise<boolean> {
    // Vérification de la configuration avant envoi
    if (!isEmailConfigured) {
        console.warn("Configuration EmailJS manquante - email non envoyé");
        return false;
    }

    try {
        const getReadableIntent = (intent: string) => {
            switch(intent) {
                case Intent.TECHNICAL: return 'Support Technique';
                case Intent.DELIVERY: return 'Problème de Livraison';
                case Intent.INVOICE: return 'Question Facturation';
                case Intent.RETURN: return 'Demande de Retour';
                default: return 'Assistance Générale';
            }
        };

        const emailTitle = `Dossier ${ticket.id} : ${getReadableIntent(ticket.issueType)}`;
        const templateParams = {
            name: ticket.contactName,
            title: emailTitle,
            to_email: ticket.contactEmail,
            reply_to: 'digital@klygroupe.com',
            ticket_id: ticket.id,
            company_name: ticket.companyName,
            contact_phone: ticket.contactPhone,
            callback_slot: ticket.callbackSlot || "Non défini",
            message: ticket.description,
            description: ticket.description,
            attachments_count: ticket.attachments?.length || 0
        };

        await send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
        return true;
    } catch (error) {
        console.error("Erreur envoi email confirmation:", error);
        return false;
    }
  },

  async sendAdministrativeEmail(params: {
    type: 'DUPLICATA' | 'RELEVE' | 'ERREUR_PRIX',
    clientName: string,
    email: string,
    invoiceNumber?: string,
    details?: string
  }): Promise<void> {
    try {
        let message = "";
        let title = "";

        switch (params.type) {
            case 'DUPLICATA':
                title = `Demande Duplicata - ${params.clientName}`;
                message = `Bonjour ${params.clientName}, souhaite le duplicata de la facture ${params.invoiceNumber || 'Non spécifiée'}.`;
                break;
            case 'RELEVE':
                title = `Demande Relevé - ${params.clientName}`;
                message = `Bonjour je souhaiterai avoir le relever de mon compte ${params.clientName}.`;
                break;
            case 'ERREUR_PRIX':
                title = `Litige Prix - ${params.clientName}`;
                message = `Signalement erreur de prix.\nRéférence(s): ${params.invoiceNumber}\nDétails: ${params.details}\nMerci de me contacter.`;
                break;
        }

        const templateParams = {
            to_email: 'digital@klygroupe.com', // Toujours vers le siège
            reply_to: params.email, // Pour pouvoir répondre au client
            title: title,
            message: message,
            name: params.clientName,
            company_name: params.clientName,
            ticket_id: `ADMIN-REQ`,
            description: message,
            contact_phone: "Voir email client"
        };

        await send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
    } catch (error) {
        console.error("Erreur envoi email administratif:", error);
        throw error;
    }
  }
};