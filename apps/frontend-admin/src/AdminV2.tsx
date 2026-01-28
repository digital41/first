// ============================================
// KLY GROUPE - ADMIN SAV INDUSTRIEL V2 PRO
// Version connectée au backend réel - Améliorée
// ============================================

import React, { useState, useEffect, useMemo, createContext, useContext, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Ticket as TicketIcon, Users, Settings, Bell, Search, Plus, Eye, Edit3,
  Trash2, CheckCircle, Clock, AlertTriangle, XCircle, ChevronRight, ChevronDown,
  Calendar, Wrench, FileText, BarChart3,
  Building2, Phone, Mail, User, LogOut, Menu, X, RefreshCw, Download, Upload,
  MessageSquare, Send, Paperclip, Zap, Filter,
  Timer, ArrowUpRight, ArrowDownRight, Image,
  Shield, Cog, Save, PlayCircle, Copy,
  Lock, Eye as EyeIcon, EyeOff, UserPlus, Sparkles, Brain,
  File, FolderOpen, History,
  Workflow, FastForward, AlertCircle, Activity, Target,
  ShieldCheck, UserCog, Headphones, MoreHorizontal, ExternalLink,
  Loader2, UserCircle, ChevronLeft, Hash
} from 'lucide-react';

// Import des services API réels
import { AdminApi, TokenStorage, ApiError } from './services/api';
import { adminSocketService } from './services/socket';
import {
  Ticket, TicketMessage, User as UserType, TicketStatus, TicketPriority, IssueType,
  UserRole, Notification as NotificationType, TicketStats, Attachment, Brand
} from './types';

// ============================================
// TYPES ADDITIONNELS V2
// ============================================

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  isActive: boolean;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ============================================
// LABELS
// ============================================

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Ouvert',
  [TicketStatus.IN_PROGRESS]: 'En cours',
  [TicketStatus.WAITING_CUSTOMER]: 'Attente client',
  [TicketStatus.RESOLVED]: 'Résolu',
  [TicketStatus.CLOSED]: 'Fermé',
  [TicketStatus.ESCALATED]: 'Escaladé',
  [TicketStatus.REOPENED]: 'Réouvert',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Basse',
  [TicketPriority.MEDIUM]: 'Moyenne',
  [TicketPriority.HIGH]: 'Haute',
  [TicketPriority.URGENT]: 'Urgente',
};

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  [IssueType.TECHNICAL]: 'Technique',
  [IssueType.DELIVERY]: 'Livraison',
  [IssueType.BILLING]: 'Facturation',
  [IssueType.OTHER]: 'Autre',
};

// ============================================
// CONFIGURATION DES RÔLES
// ============================================

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; permissions: string[] }> = {
  [UserRole.ADMIN]: { label: 'Administrateur', color: 'bg-purple-100 text-purple-800', icon: <ShieldCheck className="w-4 h-4" />, permissions: ['*'] },
  [UserRole.SUPERVISOR]: { label: 'Superviseur', color: 'bg-blue-100 text-blue-800', icon: <UserCog className="w-4 h-4" />, permissions: ['tickets', 'assign', 'reports', 'team'] },
  [UserRole.AGENT]: { label: 'Agent', color: 'bg-green-100 text-green-800', icon: <Headphones className="w-4 h-4" />, permissions: ['tickets', 'messages', 'customers'] },
  [UserRole.CUSTOMER]: { label: 'Client', color: 'bg-gray-100 text-gray-800', icon: <User className="w-4 h-4" />, permissions: ['tickets.own'] },
};

// ============================================
// TEMPLATES D'AUTOMATISATION
// ============================================

const AUTOMATION_TEMPLATES = [
  { id: 'tpl1', name: 'Auto-assignation par compétence', description: 'Assigne automatiquement les tickets techniques aux agents techniques', trigger: 'ticket.created', conditions: ['issueType = TECHNICAL'], actions: ['assign.by_skill'] },
  { id: 'tpl2', name: 'Escalade priorité haute', description: 'Escalade automatiquement les tickets haute priorité non traités après 4h', trigger: 'ticket.idle.4h', conditions: ['priority = HIGH', 'status = OPEN'], actions: ['escalate', 'notify.supervisor'] },
  { id: 'tpl3', name: 'Auto-fermeture tickets résolus', description: 'Ferme automatiquement les tickets résolus sans réponse après 7 jours', trigger: 'ticket.resolved.7days', conditions: ['no_response'], actions: ['close', 'send.survey'] },
  { id: 'tpl4', name: 'Notification client', description: 'Envoie un email au client quand le statut change', trigger: 'ticket.status_changed', conditions: [], actions: ['email.customer', 'sms.customer'] },
];

const TRIGGER_LABELS: Record<string, string> = {
  'ticket.created': 'Création de ticket',
  'ticket.updated': 'Mise à jour de ticket',
  'ticket.status_changed': 'Changement de statut',
  'ticket.resolved': 'Ticket résolu',
  'ticket.closed': 'Ticket fermé',
  'ticket.idle.4h': 'Ticket inactif 4h',
  'ticket.waiting.3days': 'En attente 3 jours',
  'ticket.resolved.7days': 'Résolu depuis 7 jours',
  'sla.warning': 'Alerte SLA',
  'sla.breach': 'SLA dépassé',
};

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  'assign.least_workload': { label: 'Assigner (moins de charge)', icon: 'user', color: 'blue' },
  'assign.by_skill': { label: 'Assigner (par compétence)', icon: 'user', color: 'blue' },
  'notify.supervisor': { label: 'Notifier superviseur', icon: 'bell', color: 'purple' },
  'notify.team': { label: 'Notifier équipe', icon: 'users', color: 'purple' },
  'notify.assigned': { label: 'Notifier agent assigné', icon: 'bell', color: 'purple' },
  'notify.agent': { label: 'Notifier agent', icon: 'bell', color: 'purple' },
  'escalate': { label: 'Escalader', icon: 'alert', color: 'red' },
  'close': { label: 'Fermer ticket', icon: 'check', color: 'green' },
  'send.survey': { label: 'Envoyer enquête satisfaction', icon: 'star', color: 'yellow' },
  'send.reminder': { label: 'Envoyer rappel', icon: 'mail', color: 'orange' },
  'email.customer': { label: 'Email au client', icon: 'mail', color: 'blue' },
  'sms.customer': { label: 'SMS au client', icon: 'phone', color: 'green' },
};

// Quick responses templates organisés par catégorie
interface QuickResponse {
  id: string;
  title: string;
  content: string;
  category: 'accueil' | 'information' | 'technique' | 'cloture' | 'escalade';
  shortcut?: string;
  tags?: string[];
}

const QUICK_RESPONSE_CATEGORIES = {
  accueil: { label: 'Accueil', icon: 'hand-wave', color: 'text-blue-600 bg-blue-50' },
  information: { label: 'Informations', icon: 'info', color: 'text-amber-600 bg-amber-50' },
  technique: { label: 'Technique', icon: 'wrench', color: 'text-purple-600 bg-purple-50' },
  cloture: { label: 'Clôture', icon: 'check', color: 'text-green-600 bg-green-50' },
  escalade: { label: 'Escalade', icon: 'alert', color: 'text-red-600 bg-red-50' },
};

const QUICK_RESPONSES: QuickResponse[] = [
  // Accueil
  {
    id: '1',
    category: 'accueil',
    title: 'Accusé de réception',
    shortcut: 'ar',
    content: 'Bonjour {{customerName}},\n\nNous avons bien reçu votre demande concernant "{{ticketTitle}}" et la traitons en priorité.\n\nUn technicien vous contactera sous peu.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['accueil', 'réception']
  },
  {
    id: '2',
    category: 'accueil',
    title: 'Prise en charge',
    shortcut: 'pc',
    content: 'Bonjour {{customerName}},\n\nJe prends en charge votre demande immédiatement. Je vais analyser la situation et vous recontacte très rapidement.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['accueil', 'prise en charge']
  },

  // Demande d'informations
  {
    id: '3',
    category: 'information',
    title: 'Demande d\'informations générales',
    shortcut: 'di',
    content: 'Bonjour {{customerName}},\n\nPour traiter votre demande efficacement, pourriez-vous nous fournir les informations suivantes :\n\n• Numéro de série de l\'équipement\n• Description détaillée du problème\n• Photos si possible\n\nMerci de votre coopération.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['information', 'détails']
  },
  {
    id: '4',
    category: 'information',
    title: 'Demande numéro de série',
    shortcut: 'ns',
    content: 'Bonjour {{customerName}},\n\nPour identifier précisément votre équipement, pourriez-vous nous communiquer le numéro de série ?\n\nVous le trouverez généralement sur une étiquette à l\'arrière ou sous l\'appareil.\n\nMerci,\nÉquipe SAV KLY',
    tags: ['série', 'identification']
  },
  {
    id: '5',
    category: 'information',
    title: 'Demande de photos',
    shortcut: 'ph',
    content: 'Bonjour {{customerName}},\n\nPour mieux comprendre le problème, pourriez-vous nous envoyer quelques photos :\n\n• Une vue d\'ensemble de l\'équipement\n• Un gros plan sur la zone défaillante\n• Le code erreur affiché (si applicable)\n\nCela nous aidera à préparer l\'intervention.\n\nMerci,\nÉquipe SAV KLY',
    tags: ['photos', 'images']
  },

  // Technique
  {
    id: '6',
    category: 'technique',
    title: 'Intervention planifiée',
    shortcut: 'ip',
    content: 'Bonjour {{customerName}},\n\nSuite à votre demande, une intervention a été planifiée.\n\nNotre technicien vous contactera pour confirmer le créneau horaire qui vous convient.\n\nMerci de vous assurer que l\'équipement est accessible.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['intervention', 'planification']
  },
  {
    id: '7',
    category: 'technique',
    title: 'Solution à tester',
    shortcut: 'st',
    content: 'Bonjour {{customerName}},\n\nVoici une solution à tester avant notre intervention :\n\n1. Éteignez complètement l\'équipement\n2. Attendez 30 secondes\n3. Redémarrez l\'appareil\n\nSi le problème persiste, merci de nous le signaler.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['solution', 'redémarrage']
  },
  {
    id: '8',
    category: 'technique',
    title: 'Pièce en commande',
    shortcut: 'cmd',
    content: 'Bonjour {{customerName}},\n\nSuite au diagnostic effectué, nous avons commandé la pièce nécessaire à la réparation.\n\nDélai de réception estimé : 3 à 5 jours ouvrés.\n\nNous vous recontacterons dès réception pour planifier l\'intervention.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['commande', 'pièce', 'délai']
  },
  {
    id: '9',
    category: 'technique',
    title: 'Demande de garantie',
    shortcut: 'gar',
    content: 'Bonjour {{customerName}},\n\nPour vérifier la prise en charge sous garantie, pourriez-vous nous fournir :\n\n• La facture d\'achat ou le bon de livraison\n• La date d\'installation de l\'équipement\n\nMerci,\nÉquipe SAV KLY',
    tags: ['garantie', 'facture']
  },

  // Clôture
  {
    id: '10',
    category: 'cloture',
    title: 'Ticket résolu',
    shortcut: 'ok',
    content: 'Bonjour {{customerName}},\n\nVotre demande a été traitée avec succès.\n\nN\'hésitez pas à nous recontacter si vous avez d\'autres questions.\n\nMerci de votre confiance.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['résolu', 'succès']
  },
  {
    id: '11',
    category: 'cloture',
    title: 'Intervention terminée',
    shortcut: 'it',
    content: 'Bonjour {{customerName}},\n\nL\'intervention sur votre équipement a été réalisée avec succès.\n\nVotre appareil est maintenant opérationnel. Nous vous invitons à le tester et à nous signaler tout dysfonctionnement.\n\nMerci de votre confiance.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['intervention', 'terminée']
  },
  {
    id: '12',
    category: 'cloture',
    title: 'Demande de feedback',
    shortcut: 'fb',
    content: 'Bonjour {{customerName}},\n\nNous espérons que notre intervention vous a donné satisfaction.\n\nVotre avis nous est précieux ! N\'hésitez pas à nous faire part de vos retours.\n\nMerci de votre confiance.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['feedback', 'satisfaction']
  },

  // Escalade
  {
    id: '13',
    category: 'escalade',
    title: 'Escalade technique',
    shortcut: 'et',
    content: 'Bonjour {{customerName}},\n\nVotre dossier nécessite une analyse approfondie par notre équipe technique spécialisée.\n\nJe transmets immédiatement votre demande à nos experts qui vous recontacteront dans les plus brefs délais.\n\nMerci de votre patience.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['escalade', 'expert']
  },
  {
    id: '14',
    category: 'escalade',
    title: 'Retard intervention',
    shortcut: 'ri',
    content: 'Bonjour {{customerName}},\n\nJe vous prie de nous excuser pour ce retard dans le traitement de votre demande.\n\nNous mettons tout en œuvre pour résoudre votre problème au plus vite. Un responsable vous contactera personnellement.\n\nMerci de votre compréhension.\n\nCordialement,\nÉquipe SAV KLY',
    tags: ['retard', 'excuse']
  },
];

// ============================================
// SERVICE IA - RÉPONSES AUTOMATIQUES
// ============================================

interface AIResponseContext {
  ticketTitle: string;
  ticketDescription?: string;
  issueType: IssueType;
  priority: TicketPriority;
  customerName?: string;
  lastCustomerMessage?: string;
  messageCount: number;
}

const AIResponseService = {
  // Réponses par type de problème
  responses: {
    [IssueType.TECHNICAL]: {
      greeting: (name: string) => `Bonjour${name ? ` ${name}` : ''} 👋,\n\nJe suis l'assistant IA du service SAV KLY. J'ai bien reçu votre demande technique et je vais essayer de vous aider.`,
      followUp: [
        "Pour mieux comprendre votre problème, pourriez-vous me préciser :\n\n1. Le modèle exact de l'équipement concerné\n2. Depuis quand ce problème se produit-il ?\n3. Y a-t-il un message d'erreur affiché ?",
        "Avez-vous essayé de redémarrer l'équipement ? Parfois, un simple redémarrage peut résoudre certains problèmes techniques.",
        "Je vous suggère de vérifier les points suivants :\n\n✅ Connexions électriques\n✅ Câbles et raccordements\n✅ Paramètres de configuration\n\nSi le problème persiste, un technicien vous contactera.",
      ],
      solutions: {
        'redémarrage': "Le redémarrage est souvent une solution efficace. Voici la procédure :\n\n1. Éteignez complètement l'équipement\n2. Débranchez l'alimentation pendant 30 secondes\n3. Rebranchez et rallumez\n\nLe problème est-il résolu ?",
        'erreur': "Pour les messages d'erreur, je vous recommande :\n\n1. Notez le code d'erreur exact\n2. Consultez le manuel utilisateur section \"Dépannage\"\n3. Si l'erreur persiste, envoyez-moi une photo de l'écran\n\nJe transmettrai au technicien si nécessaire.",
        'panne': "Je comprends que votre équipement est en panne. Pour accélérer le diagnostic :\n\n1. L'équipement s'allume-t-il ?\n2. Y a-t-il des voyants allumés ?\n3. Entendez-vous des bruits anormaux ?\n\nCes informations m'aideront à orienter l'intervention.",
        'installation': "Pour l'installation, voici les étapes générales :\n\n1. Vérifiez que tous les composants sont présents\n2. Suivez le guide de démarrage rapide\n3. Connectez l'alimentation en dernier\n\nRencontrez-vous un problème à une étape précise ?",
      },
    },
    [IssueType.DELIVERY]: {
      greeting: (name: string) => `Bonjour${name ? ` ${name}` : ''} 👋,\n\nJe suis l'assistant IA du service SAV KLY. Je vois que votre demande concerne une livraison. Je vais vous aider.`,
      followUp: [
        "Pour suivre votre commande, pourriez-vous me communiquer :\n\n1. Votre numéro de commande (BC)\n2. La date de commande approximative\n3. L'adresse de livraison prévue",
        "Je vérifie le statut de votre livraison. En attendant, avez-vous reçu un email de confirmation avec un numéro de suivi ?",
        "Votre colis devrait être en cours d'acheminement. Je vérifie avec notre service logistique et vous recontacte rapidement avec plus d'informations.",
      ],
      solutions: {
        'retard': "Je comprends votre inquiétude concernant le retard. Je vérifie immédiatement le statut de votre commande auprès de notre service logistique. Vous recevrez une mise à jour sous peu.",
        'colis': "Pour localiser votre colis, j'aurais besoin de :\n\n1. Numéro de commande\n2. Nom et adresse de livraison\n\nJe contacte le transporteur pour obtenir des informations précises.",
        'manquant': "Si des articles sont manquants dans votre livraison :\n\n1. Vérifiez le bon de livraison joint\n2. Certains articles peuvent être expédiés séparément\n\nJe vérifie si un second envoi est prévu.",
        'endommagé': "Je suis désolé d'apprendre que votre colis est arrivé endommagé. Voici la procédure :\n\n1. Prenez des photos des dommages\n2. Conservez l'emballage d'origine\n3. Je lance une réclamation transporteur\n\nNous organiserons un remplacement rapidement.",
      },
    },
    [IssueType.BILLING]: {
      greeting: (name: string) => `Bonjour${name ? ` ${name}` : ''} 👋,\n\nJe suis l'assistant IA du service SAV KLY. Votre demande concerne la facturation. Je vais vous aider à résoudre cette question.`,
      followUp: [
        "Pour traiter votre demande de facturation, pourriez-vous préciser :\n\n1. Le numéro de facture concerné\n2. La nature de votre demande (erreur, duplicata, avoir...)\n3. Le montant en question si applicable",
        "Je consulte votre dossier. Pouvez-vous me confirmer le nom de l'entreprise ou le code client associé à cette facture ?",
        "Votre demande a été enregistrée. Notre service comptabilité la traitera dans les 48h ouvrées. Vous recevrez une confirmation par email.",
      ],
      solutions: {
        'erreur': "Pour toute erreur de facturation :\n\n1. Je note votre signalement\n2. Notre service comptable vérifiera\n3. Un avoir sera émis si nécessaire\n\nPouvez-vous préciser l'erreur constatée ?",
        'duplicata': "Pour obtenir un duplicata de facture :\n\n1. Indiquez le numéro de facture\n2. Ou la période concernée\n\nJe transmets votre demande au service comptabilité qui vous l'enverra par email sous 24h.",
        'paiement': "Concernant votre paiement :\n\n1. Nos coordonnées bancaires figurent sur la facture\n2. Le délai de paiement standard est de 30 jours\n\nAvez-vous besoin d'un échéancier particulier ?",
        'avoir': "Pour une demande d'avoir :\n\n1. Précisez le motif (retour, erreur, geste commercial)\n2. Indiquez la facture d'origine\n\nJe transmets au service concerné pour validation.",
      },
    },
    [IssueType.OTHER]: {
      greeting: (name: string) => `Bonjour${name ? ` ${name}` : ''} 👋,\n\nJe suis l'assistant IA du service SAV KLY. Je vais essayer de répondre à votre demande.`,
      followUp: [
        "Pour mieux vous aider, pourriez-vous détailler votre demande ? S'agit-il :\n\n• D'un problème technique ?\n• D'une question sur une commande ?\n• D'une demande commerciale ?\n• D'autre chose ?",
        "J'ai bien noté votre demande. Pouvez-vous me donner plus de détails pour que je puisse vous orienter vers le bon service ?",
        "Votre demande nécessite l'intervention d'un de nos conseillers. Je la transmets immédiatement et vous serez recontacté rapidement.",
      ],
      solutions: {
        'information': "Je peux vous fournir des informations sur :\n\n• Nos produits et services\n• Vos commandes en cours\n• Nos garanties\n• Nos coordonnées\n\nQue souhaitez-vous savoir ?",
        'contact': "Voici nos coordonnées :\n\n📞 Téléphone : +33 1 XX XX XX XX\n📧 Email : sav@kly-groupe.com\n🕐 Horaires : Lun-Ven 9h-18h\n\nPuis-je vous aider autrement ?",
        'garantie': "Concernant la garantie :\n\n• Durée standard : 2 ans\n• Extension disponible\n• Pièces et main d'œuvre incluses\n\nAvez-vous votre numéro de série ?",
      },
    },
  },

  // Génère une réponse contextuelle
  generateResponse(context: AIResponseContext): { response: string; shouldEscalate: boolean; confidence: number } {
    const typeResponses = this.responses[context.issueType] || this.responses[IssueType.OTHER];
    const customerFirstName = context.customerName?.split(' ')[0];

    // Premier message - salutation
    if (context.messageCount === 0) {
      return {
        response: typeResponses.greeting(customerFirstName || ''),
        shouldEscalate: false,
        confidence: 95,
      };
    }

    // Analyser le dernier message du client pour trouver une solution
    const lastMessage = (context.lastCustomerMessage || '').toLowerCase();

    // Chercher des mots-clés pour des solutions spécifiques
    for (const [keyword, solution] of Object.entries(typeResponses.solutions)) {
      if (lastMessage.includes(keyword)) {
        return {
          response: solution,
          shouldEscalate: false,
          confidence: 85,
        };
      }
    }

    // Réponses de suivi génériques basées sur le nombre de messages
    const followUpIndex = Math.min(context.messageCount - 1, typeResponses.followUp.length - 1);
    const followUp = typeResponses.followUp[followUpIndex];

    // Si on a épuisé les réponses de suivi, escalader
    if (context.messageCount > typeResponses.followUp.length + 1) {
      return {
        response: "Je vous remercie pour ces informations. Votre demande nécessite l'expertise d'un de nos techniciens. Je transfère votre dossier à notre équipe qui vous contactera très rapidement.\n\n🔄 Transfert en cours vers un conseiller...",
        shouldEscalate: true,
        confidence: 60,
      };
    }

    return {
      response: followUp,
      shouldEscalate: false,
      confidence: 75,
    };
  },

  // Vérifie si on doit escalader
  shouldEscalateToHuman(context: AIResponseContext, aiResponseCount: number): boolean {
    // Escalader si trop d'échanges
    if (aiResponseCount >= 3) return true;
    // Escalader si priorité urgente
    if (context.priority === TicketPriority.URGENT) return true;
    // Escalader si mots-clés critiques
    const criticalKeywords = ['urgent', 'grave', 'danger', 'sécurité', 'avocat', 'juridique', 'plainte'];
    const message = (context.lastCustomerMessage || '').toLowerCase();
    return criticalKeywords.some(kw => message.includes(kw));
  },
};

// ============================================
// UTILITAIRES
// ============================================

const formatDateTime = (date: string | Date): string => new Date(date).toLocaleString('fr-FR');
const formatTime = (date: string | Date): string => new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatFileSize = (bytes?: number): string => {
  if (!bytes || isNaN(bytes)) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(' ').filter(n => n.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    const localPart = email.split('@')[0];
    return localPart.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const getStatusColor = (status: TicketStatus): string => ({
  [TicketStatus.OPEN]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TicketStatus.WAITING_CUSTOMER]: 'bg-purple-100 text-purple-800 border-purple-200',
  [TicketStatus.RESOLVED]: 'bg-green-100 text-green-800 border-green-200',
  [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800 border-gray-200',
  [TicketStatus.ESCALATED]: 'bg-red-100 text-red-800 border-red-200',
  [TicketStatus.REOPENED]: 'bg-pink-100 text-pink-800 border-pink-200',
}[status] || 'bg-gray-100 text-gray-800');

const getPriorityColor = (priority: TicketPriority): string => ({
  [TicketPriority.LOW]: 'bg-slate-100 text-slate-600',
  [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-600',
  [TicketPriority.HIGH]: 'bg-orange-100 text-orange-600',
  [TicketPriority.URGENT]: 'bg-red-100 text-red-700 animate-pulse',
}[priority] || 'bg-gray-100 text-gray-600');

// ============================================
// CONTEXTES
// ============================================

interface AuthContextType {
  user: UserType | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
const useAuth = () => { const c = useContext(AuthContext); if (!c) throw new Error('useAuth error'); return c; };

// Types pour les paramètres d'application
type AppLanguage = 'fr' | 'en';
type AppTheme = 'classic' | 'blue' | 'green';

// Système de traduction
const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  fr: {
    // Sidebar
    'sidebar.dashboard': 'Vue d\'ensemble',
    'sidebar.tickets': 'TICKETS',
    'sidebar.allTickets': 'Tous les tickets',
    'sidebar.openTickets': 'Tickets ouverts',
    'sidebar.closedTickets': 'Tickets fermés',
    'sidebar.clients': 'CLIENTS',
    'sidebar.clientsList': 'Liste des clients',
    'sidebar.admin': 'ADMINISTRATION',
    'sidebar.users': 'Utilisateurs',
    'sidebar.automation': 'Automatisation',
    'sidebar.analytics': 'Analytics',
    'sidebar.settings': 'Paramètres',
    'sidebar.brands': 'Marques',
    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.welcome': 'Bienvenue',
    'dashboard.totalTickets': 'Total tickets',
    'dashboard.openTickets': 'Tickets ouverts',
    'dashboard.resolvedTickets': 'Tickets résolus',
    'dashboard.avgResolution': 'Temps moyen',
    // Tickets
    'tickets.title': 'Gestion des tickets',
    'tickets.new': 'Nouveau ticket',
    'tickets.search': 'Rechercher...',
    'tickets.status': 'Statut',
    'tickets.priority': 'Priorité',
    'tickets.assignedTo': 'Assigné à',
    'tickets.created': 'Créé le',
    'tickets.updated': 'Mis à jour',
    // Settings
    'settings.title': 'Paramètres',
    'settings.general': 'Général',
    'settings.language': 'Langue de l\'interface',
    'settings.languageDesc': 'Sélectionnez la langue d\'affichage',
    'settings.theme': 'Thème de couleur',
    'settings.themeDesc': 'Personnalisez l\'apparence de la sidebar',
    'settings.company': 'Informations entreprise',
    'settings.companyName': 'Nom de l\'entreprise',
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée',
  },
  en: {
    // Sidebar
    'sidebar.dashboard': 'Overview',
    'sidebar.tickets': 'TICKETS',
    'sidebar.allTickets': 'All tickets',
    'sidebar.openTickets': 'Open tickets',
    'sidebar.closedTickets': 'Closed tickets',
    'sidebar.clients': 'CLIENTS',
    'sidebar.clientsList': 'Client list',
    'sidebar.admin': 'ADMINISTRATION',
    'sidebar.users': 'Users',
    'sidebar.automation': 'Automation',
    'sidebar.analytics': 'Analytics',
    'sidebar.settings': 'Settings',
    'sidebar.brands': 'Brands',
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.totalTickets': 'Total tickets',
    'dashboard.openTickets': 'Open tickets',
    'dashboard.resolvedTickets': 'Resolved tickets',
    'dashboard.avgResolution': 'Avg time',
    // Tickets
    'tickets.title': 'Ticket management',
    'tickets.new': 'New ticket',
    'tickets.search': 'Search...',
    'tickets.status': 'Status',
    'tickets.priority': 'Priority',
    'tickets.assignedTo': 'Assigned to',
    'tickets.created': 'Created',
    'tickets.updated': 'Updated',
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.language': 'Interface language',
    'settings.languageDesc': 'Select display language',
    'settings.theme': 'Color theme',
    'settings.themeDesc': 'Customize sidebar appearance',
    'settings.company': 'Company info',
    'settings.companyName': 'Company name',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
  },
};

// Theme styles with CSS values for runtime application - Couleurs SAV Pro
const THEME_STYLES: Record<AppTheme, {
  name: string;
  description: string;
  sidebarBg: string;
  logoBg: string;
  activeBg: string;
  accentColor: string;
  accentHover: string;
  borderColor: string;
  hoverBg: string;
  textMuted: string;
  isLight?: boolean; // Pour les thèmes clairs (texte sombre)
}> = {
  classic: {
    name: 'Classique Clair',
    description: 'Style épuré et lumineux',
    sidebarBg: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
    logoBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    activeBg: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    accentColor: '#3b82f6',
    accentHover: '#2563eb',
    borderColor: 'rgba(226, 232, 240, 1)',
    hoverBg: 'rgba(241, 245, 249, 1)',
    textMuted: 'rgba(100, 116, 139, 1)',
    isLight: true,
  },
  blue: {
    name: 'Bleu Professionnel',
    description: 'Style classique et fiable',
    sidebarBg: 'linear-gradient(180deg, #1e293b 0%, #0f172a 50%, #0c1426 100%)',
    logoBg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    activeBg: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
    accentColor: '#60a5fa',
    accentHover: '#93c5fd',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    hoverBg: 'rgba(37, 99, 235, 0.2)',
    textMuted: 'rgba(148, 163, 184, 0.7)',
  },
  green: {
    name: 'Turquoise Frais',
    description: 'Style moderne et dynamique',
    sidebarBg: '#115e59',
    logoBg: '#14b8a6',
    activeBg: '#0d9488',
    accentColor: '#5eead4',
    accentHover: '#99f6e4',
    borderColor: 'rgba(94, 234, 212, 0.25)',
    hoverBg: 'rgba(20, 184, 166, 0.25)',
    textMuted: 'rgba(167, 243, 208, 0.85)',
  },
};

interface AdminContextType {
  currentView: string;
  setCurrentView: (v: string) => void;
  selectedTicket: Ticket | null;
  setSelectedTicket: (t: Ticket | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (c: boolean) => void;
  notifications: NotificationType[];
  unreadNotifications: number;
  unreadByTicket: Map<string, number>;
  hasUnreadForTicket: (ticketId: string) => boolean;
  markNotificationsAsRead: (ids: string[]) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  humanTakeoverAlert: { ticketId: string; ticketNumber: string; customerName: string } | null;
  clearHumanTakeoverAlert: () => void;
  showAIAssistant: boolean;
  setShowAIAssistant: (s: boolean) => void;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  users: UserType[];
  stats: TicketStats | null;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  autoAssignTickets: () => Promise<void>;
  // App settings
  appTheme: AppTheme;
  setAppTheme: (t: AppTheme) => void;
  appLanguage: AppLanguage;
  setAppLanguage: (l: AppLanguage) => void;
  // Translation function
  t: (key: string) => string;
}
const AdminContext = createContext<AdminContextType | null>(null);
const useAdmin = () => { const c = useContext(AdminContext); if (!c) throw new Error('useAdmin error'); return c; };

// ============================================
// COMPOSANTS UI
// ============================================

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '', type = 'button', title }) => {
  const v = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    success: 'bg-green-600 text-white hover:bg-green-700'
  };
  const s = { xs: 'px-2 py-1 text-xs', sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${s[size]} ${className}`}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''} ${className}`}>
    {children}
  </div>
);

const Input: React.FC<{
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}> = ({ type = 'text', placeholder, value, defaultValue, onChange, className = '', icon, disabled, readOnly, onKeyDown }) => (
  <div className="relative">
    {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>}
    <input type={type} placeholder={placeholder} value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled} readOnly={readOnly} onKeyDown={onKeyDown}
      className={`block w-full rounded-lg border border-gray-300 bg-white py-2.5 ${icon ? 'pl-10' : 'pl-4'} pr-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 transition-all duration-200 ${className}`} />
  </div>
);

const Textarea: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  className?: string;
}> = ({ placeholder, value, onChange, onKeyDown, rows = 3, className = '' }) => (
  <textarea placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} rows={rows}
    className={`block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all duration-200 ${className}`} />
);

const Select: React.FC<{
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className = '' }) => (
  <select value={value} onChange={onChange}
    className={`block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${className}`}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className={`relative bg-white rounded-2xl shadow-2xl ${sizes[size]} w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}>
          <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
};

const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="border-b border-gray-200 overflow-x-auto">
    <nav className="flex space-x-1 px-1 min-w-max">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-all duration-200 ${activeTab === t.id ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'} rounded-t-lg`}>
          {t.icon}{t.label}{t.count !== undefined && <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{t.count}</span>}
        </button>
      ))}
    </nav>
  </div>
);

const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  onClick?: () => void;
  subtitle?: string;
}> = ({ title, value, icon, trend, color = 'blue', onClick, subtitle }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  };
  return (
    <Card className={`p-5 group ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl transition-colors duration-200 ${colors[color]}`}>{icon}</div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
};

// ============================================
// CHART COMPONENTS - Data Visualization
// ============================================

// Donut Chart Component
const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}> = ({ data, size = 180, thickness = 35, showLegend = true, centerLabel, centerValue }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={thickness} />
          {data.map((segment, i) => {
            const percentage = total > 0 ? segment.value / total : 0;
            const strokeLength = percentage * circumference;
            const offset = currentOffset;
            currentOffset += strokeLength;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700 ease-out"
              />
            );
          })}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && <span className="text-2xl font-bold text-gray-900">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-gray-500">{centerLabel}</span>}
          </div>
        )}
      </div>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-2">
          {data.filter(d => d.value > 0).map((segment, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="text-gray-600">{segment.label}</span>
              <span className="font-semibold">{segment.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Area Line Chart Component
const AreaLineChart: React.FC<{
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  gradientId?: string;
}> = ({ data, width = 350, height = 180, color = '#3b82f6', gradientId = 'areaGradient' }) => {
  if (data.length < 2) return <div className="text-gray-400 text-sm text-center py-8">Données insuffisantes</div>;

  const padding = { top: 20, right: 10, bottom: 35, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');
  const areaPath = `${linePath} L ${getX(data.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((r, i) => (
        <g key={i}>
          <line x1={padding.left} y1={getY(maxVal * r)} x2={width - padding.right} y2={getY(maxVal * r)} stroke="#e5e7eb" strokeDasharray={r === 0 ? "0" : "3,3"} />
          <text x={padding.left - 5} y={getY(maxVal * r) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{Math.round(maxVal * r)}</text>
        </g>
      ))}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.value)} r={4} fill="white" stroke={color} strokeWidth={2} className="transition-all" />
          <text x={getX(i)} y={height - 8} textAnchor="middle" className="text-[9px] fill-gray-500">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

// Vertical Bar Chart Component
const VerticalBarChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
}> = ({ data, width = 350, height = 200 }) => {
  if (data.length === 0) return null;
  const padding = { top: 25, right: 10, bottom: 40, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(40, (chartW / data.length) * 0.7);
  const gap = (chartW - barW * data.length) / (data.length + 1);

  return (
    <svg width={width} height={height}>
      {[0, 0.5, 1].map((r, i) => (
        <g key={i}>
          <line x1={padding.left} y1={padding.top + chartH * (1 - r)} x2={width - padding.right} y2={padding.top + chartH * (1 - r)} stroke="#e5e7eb" strokeDasharray={r === 0 ? "0" : "3,3"} />
          <text x={padding.left - 5} y={padding.top + chartH * (1 - r) + 4} textAnchor="end" className="text-[10px] fill-gray-400">{Math.round(maxVal * r)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padding.left + gap + i * (barW + gap);
        const barH = (d.value / maxVal) * chartH;
        const y = padding.top + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} className="transition-all duration-500" />
            <rect x={x} y={y} width={barW / 2} height={barH} rx={4} fill="rgba(255,255,255,0.2)" />
            {d.value > 0 && <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="text-[10px] font-semibold fill-gray-700">{d.value}</text>}
            <text x={x + barW / 2} y={height - 10} textAnchor="middle" className="text-[9px] fill-gray-500">{d.label.slice(0, 8)}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Horizontal Bar Chart
const HorizontalBarChart: React.FC<{
  data: { label: string; value: number; color: string; percent?: number }[];
  showPercent?: boolean;
}> = ({ data, showPercent = true }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">{d.label}</span>
            <span className="text-sm font-semibold text-gray-900">
              {d.value} {showPercent && d.percent !== undefined && <span className="text-gray-400 font-normal">({d.percent}%)</span>}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Mini Sparkline
const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({ data, color = '#3b82f6', width = 80, height = 24 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const getX = (i: number) => (i / (data.length - 1)) * width;
  const getY = (v: number) => height - (v / max) * height;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ');
  return (
    <svg width={width} height={height}>
      <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={color} fillOpacity={0.15} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1])} r={2} fill={color} />
    </svg>
  );
};

// ============================================
// LOGIN PAGE
// ============================================

const LoginPageV2: React.FC<{ onLogin: (email: string, password: string) => Promise<boolean> }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await onLogin(email, password);
      if (!success) setError('Identifiants invalides');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SAV Pro V2</h1>
          <p className="text-blue-200 mt-2">Gestion SAV Industrielle</p>
        </div>
        <Card className="p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm animate-in shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input type="email" placeholder="votre@email.fr" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail className="w-5 h-5" />} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock className="w-5 h-5" />} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <LogOut className="w-5 h-5 mr-2" />}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

// ============================================
// SIDEBAR
// ============================================

const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, tickets, appTheme, t } = useAdmin();
  const { user, hasPermission } = useAuth();
  const theme = THEME_STYLES[appTheme];

  // Check permissions
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === 'ADMIN';
  const canAccess = (permission: string | null) => !permission || isAdmin || hasPermission(permission);

  // Count tickets by status
  const openTicketsCount = tickets.filter(tk => tk.status === 'OPEN' || tk.status === 'REOPENED').length;

  // Menu sections structure with translations
  const menuSections = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: t('sidebar.dashboard'), icon: <LayoutDashboard className="w-5 h-5" />, permission: null },
      ]
    },
    {
      title: t('sidebar.tickets'),
      permission: 'tickets',
      items: [
        { id: 'tickets', label: t('sidebar.allTickets'), icon: <TicketIcon className="w-5 h-5" />, permission: 'tickets' },
        { id: 'tickets-open', label: t('sidebar.openTickets'), icon: <Clock className="w-5 h-5" />, permission: 'tickets', badge: openTicketsCount },
        { id: 'tickets-closed', label: t('sidebar.closedTickets'), icon: <CheckCircle className="w-5 h-5" />, permission: 'tickets' },
      ]
    },
    {
      title: t('sidebar.clients'),
      permission: 'tickets',
      items: [
        { id: 'clients', label: t('sidebar.clientsList'), icon: <UserCircle className="w-5 h-5" />, permission: 'tickets' },
      ]
    },
    {
      title: t('sidebar.admin'),
      permission: 'team',
      items: [
        { id: 'team', label: t('sidebar.users'), icon: <Users className="w-5 h-5" />, permission: 'team' },
        { id: 'automation', label: t('sidebar.automation'), icon: <Workflow className="w-5 h-5" />, permission: 'automation' },
        { id: 'analytics', label: t('sidebar.analytics'), icon: <BarChart3 className="w-5 h-5" />, permission: 'reports' },
        { id: 'brands', label: t('sidebar.brands'), icon: <FolderOpen className="w-5 h-5" />, permission: 'settings' },
        { id: 'settings', label: t('sidebar.settings'), icon: <Settings className="w-5 h-5" />, permission: 'settings' },
      ]
    },
  ];

  const handleMenuClick = (itemId: string) => {
    // Handle special ticket views
    if (itemId === 'tickets-open') {
      setCurrentView('tickets');
      // Will set filter via URL or state
      window.dispatchEvent(new CustomEvent('setTicketFilter', { detail: { status: 'OPEN' } }));
    } else if (itemId === 'tickets-closed') {
      setCurrentView('tickets');
      window.dispatchEvent(new CustomEvent('setTicketFilter', { detail: { status: 'CLOSED' } }));
    } else {
      setCurrentView(itemId);
      if (itemId === 'tickets') {
        window.dispatchEvent(new CustomEvent('setTicketFilter', { detail: { status: '' } }));
      }
    }
    setSidebarOpen(false);
  };

  // Couleurs de texte selon le thème (clair ou sombre)
  const textPrimary = theme.isLight ? '#1e293b' : '#ffffff';
  const textSecondary = theme.isLight ? '#475569' : '#cbd5e1';
  const textHover = theme.isLight ? '#0f172a' : '#ffffff';

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${theme.isLight ? 'shadow-lg' : ''}`}
        style={{ background: theme.sidebarBg }}
      >
        {/* Logo */}
        <div
          className={`flex items-center h-16 px-4 border-b ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
          style={{ borderColor: theme.borderColor }}
        >
          <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'}`}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: theme.logoBg }}
            >
              <Wrench className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="font-bold" style={{ color: textPrimary }}>SAV Pro</span>
                <span className="text-xs ml-1 font-semibold" style={{ color: theme.accentColor }}>V2</span>
              </div>
            )}
          </div>
          <button
            className="lg:hidden transition-colors"
            style={{ color: theme.accentColor }}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div
            className={`py-3 border-b ${sidebarCollapsed ? 'px-2' : 'px-4'}`}
            style={{ borderColor: theme.borderColor }}
          >
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`} title={sidebarCollapsed ? `${user.displayName} - ${ROLE_CONFIG[user.role]?.label || user.role}` : undefined}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center border"
                style={{ background: theme.isLight ? '#e2e8f0' : theme.hoverBg, borderColor: theme.borderColor }}
              >
                <span className="text-sm font-semibold" style={{ color: theme.accentColor }}>{getInitials(user.displayName, user.email)}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>{user.displayName}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{ROLE_CONFIG[user.role]?.label || user.role}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`py-4 overflow-y-auto h-[calc(100vh-10rem)] space-y-6 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {menuSections.map((section) => {
            // Check if user has access to this section
            if (section.permission && !canAccess(section.permission)) return null;

            // Filter items by permission
            const visibleItems = section.items.filter(item => canAccess(item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {!sidebarCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                    {section.title}
                  </h3>
                )}
                {sidebarCollapsed && (
                  <div className="w-8 h-px mx-auto mb-2" style={{ backgroundColor: theme.borderColor }} />
                )}
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = currentView === item.id ||
                      (item.id === 'tickets-open' && currentView === 'tickets') ||
                      (item.id === 'tickets-closed' && currentView === 'tickets');

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`w-full flex items-center rounded-lg text-sm font-medium group relative select-none outline-none focus:outline-none
                          ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                          ${currentView === item.id ? 'shadow-lg' : 'hover:bg-opacity-50'}`}
                        style={{
                          background: currentView === item.id ? theme.activeBg : 'transparent',
                          color: currentView === item.id ? '#ffffff' : textSecondary,
                          transition: 'all 0.15s ease',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (currentView !== item.id) {
                            e.currentTarget.style.background = theme.hoverBg;
                            e.currentTarget.style.color = textHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentView !== item.id) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = textSecondary;
                          }
                        }}
                      >
                        <span style={{ color: currentView === item.id ? '#ffffff' : theme.accentColor }} className="transition-colors">
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                              <span
                                className="px-2 py-0.5 text-xs font-semibold rounded-full"
                                style={currentView === item.id
                                  ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }
                                  : { backgroundColor: theme.isLight ? '#e2e8f0' : theme.hoverBg, color: theme.accentColor }
                                }
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                        {sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full text-white"
                            style={{ background: theme.logoBg }}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer with collapse toggle */}
        <div className="absolute bottom-0 left-0 right-0 border-t" style={{ borderColor: theme.borderColor }}>
          {/* Collapse toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center p-3 transition-colors"
            style={{ color: theme.accentColor }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.hoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
          {!sidebarCollapsed && (
            <div className="flex items-center justify-center gap-2 text-xs pb-3" style={{ color: theme.textMuted }}>
              <span>KLY Groupe</span>
              <span>•</span>
              <span>v2.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

// ============================================
// HEADER
// ============================================

const Header: React.FC = () => {
  const { setSidebarOpen, notifications, unreadNotifications, markNotificationsAsRead, markAllNotificationsAsRead, setShowAIAssistant, refreshData, isLoading, tickets, autoAssignTickets, setCurrentView, setSelectedTicket } = useAdmin();
  const { user, logout } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'messages' | 'sla' | 'system'>('all');
  const [showAllNotifs, setShowAllNotifs] = useState(false); // Afficher toutes les notifications
  const unassignedCount = tickets.filter(t => !t.assignedToId && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;

  // Filtrer les notifications selon l'onglet actif
  const filteredNotifications = useMemo(() => {
    switch (notifTab) {
      case 'messages':
        return notifications.filter(n => n.type === 'MESSAGE' || n.type === 'MENTION');
      case 'sla':
        return notifications.filter(n => n.type === 'SLA_WARNING' || n.type === 'SLA_BREACH');
      case 'system':
        return notifications.filter(n => n.type === 'SYSTEM' || n.type === 'ASSIGNMENT' || (!['MESSAGE', 'MENTION', 'SLA_WARNING', 'SLA_BREACH', 'TICKET_UPDATE'].includes(n.type)));
      default:
        return notifications;
    }
  }, [notifications, notifTab]);

  const handleAutoAssign = async () => {
    if (isAutoAssigning || unassignedCount === 0) return;
    setIsAutoAssigning(true);
    try {
      await autoAssignTickets();
    } finally {
      setIsAutoAssigning(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-gray-600 hover:text-gray-900" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
        <div className="hidden md:block">
          <Input placeholder="Rechercher tickets, clients..." icon={<Search className="w-5 h-5" />} className="w-80" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={refreshData} disabled={isLoading} className="hidden sm:flex">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <button
          onClick={handleAutoAssign}
          disabled={isAutoAssigning || unassignedCount === 0}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            unassignedCount > 0
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={unassignedCount > 0 ? `Assigner ${unassignedCount} ticket(s) automatiquement` : 'Aucun ticket à assigner'}
        >
          <Zap className={`w-4 h-4 ${isAutoAssigning ? 'animate-pulse' : ''}`} />
          <span>Auto-assign</span>
          {unassignedCount > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{unassignedCount}</span>
          )}
        </button>
        <Button variant="ghost" size="sm" onClick={() => setShowAIAssistant(true)} className="text-purple-600 hover:bg-purple-50">
          <Sparkles className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Assistant IA</span>
        </Button>
        <button className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => { setShowNotifs(!showNotifs); if (showNotifs) setShowAllNotifs(false); }}>
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
        </button>

        <div className="relative">
          <button className="flex items-center gap-3 pl-3 border-l border-gray-200 ml-2" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
              <p className="text-xs text-gray-500">{ROLE_CONFIG[user?.role || '']?.label}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">{user ? getInitials(user.displayName, user.email) : ''}</span>
            </div>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-14 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <User className="w-4 h-4 text-gray-400" />Mon profil
              </button>
              <button
                onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
              >
                <Settings className="w-4 h-4 text-gray-400" />Préférences
              </button>
              <hr className="my-1" />
              <button onClick={logout} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">
                <LogOut className="w-4 h-4" />Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      {showNotifs && (
        <div className="absolute right-2 sm:right-4 top-16 w-[calc(100vw-1rem)] sm:w-[420px] max-w-[420px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadNotifications > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">{unreadNotifications} nouvelle{unreadNotifications > 1 ? 's' : ''}</span>}
            </div>
            {unreadNotifications > 0 && <button onClick={() => markAllNotificationsAsRead()} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Tout marquer lu</button>}
          </div>

          {/* Tabs for notification types */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setNotifTab('all'); setShowAllNotifs(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${notifTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Toutes
            </button>
            <button
              onClick={() => { setNotifTab('messages'); setShowAllNotifs(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${notifTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Messages
            </button>
            <button
              onClick={() => { setNotifTab('sla'); setShowAllNotifs(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${notifTab === 'sla' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              SLA
            </button>
            <button
              onClick={() => { setNotifTab('system'); setShowAllNotifs(false); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${notifTab === 'system' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Système
            </button>
          </div>

          <div className={`${showAllNotifs ? 'max-h-[70vh]' : 'max-h-[400px]'} overflow-y-auto`}>
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {notifTab === 'all' ? 'Aucune notification' :
                   notifTab === 'messages' ? 'Aucun message' :
                   notifTab === 'sla' ? 'Aucune alerte SLA' :
                   'Aucune notification système'}
                </p>
              </div>
            ) : (
              <>
                {(showAllNotifs ? filteredNotifications : filteredNotifications.slice(0, 10)).map(n => {
                  // Trouver le ticket associé pour afficher son numéro
                  const relatedTicket = n.ticketId ? tickets.find(t => t.id === n.ticketId) : null;
                  // Utiliser ticketNumber de la notification, du payload, ou du ticket trouvé
                  const ticketNumber = n.ticketNumber || (n.payload?.ticketNumber as number) || relatedTicket?.ticketNumber;
                  const ticketTitleDisplay = n.ticketTitle || (n.payload?.ticketTitle as string) || relatedTicket?.title;

                  const getNotifIcon = () => {
                    switch(n.type) {
                      case 'MESSAGE': return <MessageSquare className="w-4 h-4 text-blue-500" />;
                      case 'SLA_WARNING': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
                      case 'SLA_BREACH': return <AlertCircle className="w-4 h-4 text-red-500" />;
                      case 'TICKET_UPDATE': return <TicketIcon className="w-4 h-4 text-green-500" />;
                      case 'MENTION': return <User className="w-4 h-4 text-purple-500" />;
                      default: return <Bell className="w-4 h-4 text-gray-400" />;
                    }
                  };
                  const getNotifLabel = () => {
                    switch(n.type) {
                      case 'MESSAGE': return 'Nouveau message';
                      case 'SLA_WARNING': return 'Alerte SLA';
                      case 'SLA_BREACH': return 'SLA dépassé';
                      case 'TICKET_UPDATE': return 'Ticket mis à jour';
                      case 'MENTION': return 'Vous avez été mentionné';
                      default: return 'Notification';
                    }
                  };
                  const getNotifColor = () => {
                    switch(n.type) {
                      case 'MESSAGE': return 'bg-blue-50 border-blue-200';
                      case 'SLA_WARNING': return 'bg-yellow-50 border-yellow-200';
                      case 'SLA_BREACH': return 'bg-red-50 border-red-200';
                      case 'TICKET_UPDATE': return 'bg-green-50 border-green-200';
                      case 'MENTION': return 'bg-purple-50 border-purple-200';
                      default: return 'bg-gray-50 border-gray-200';
                    }
                  };
                  const handleNotifClick = async () => {
                    // Mark as read
                    if (!n.isRead) {
                      markNotificationsAsRead([n.id]);
                    }
                    // Navigate to ticket if ticketId exists
                    if (n.ticketId) {
                      // Si le ticket est déjà chargé, l'utiliser
                      if (relatedTicket) {
                        setSelectedTicket(relatedTicket);
                        setCurrentView('tickets');
                      } else {
                        // Sinon, essayer de charger le ticket depuis l'API
                        try {
                          const ticket = await AdminApi.getTicketById(n.ticketId);
                          if (ticket) {
                            setSelectedTicket(ticket);
                            setCurrentView('tickets');
                          }
                        } catch (err) {
                          console.error('Erreur chargement ticket:', err);
                        }
                      }
                    }
                    setShowNotifs(false);
                  };

                  // Construire le texte d'affichage du ticket
                  const getTicketDisplay = () => {
                    if (ticketNumber) {
                      return `Ticket #${ticketNumber}`;
                    } else if (n.ticketId) {
                      return `Ticket #${n.ticketId.slice(0, 8)}`;
                    }
                    return null;
                  };

                  return (
                    <div key={n.id} onClick={handleNotifClick} className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getNotifColor()}`}>
                          {getNotifIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{getNotifLabel()}</p>
                            {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                          </div>
                          {n.title && <p className="text-xs text-gray-700 truncate">{n.title}</p>}
                          {n.body && <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>}
                          {n.ticketId && !n.title && (
                            <p className="text-xs text-blue-600 truncate font-medium">
                              {getTicketDisplay()}
                              {ticketTitleDisplay && <span className="text-gray-500 font-normal ml-1">- {ticketTitleDisplay.slice(0, 30)}{ticketTitleDisplay.length > 30 ? '...' : ''}</span>}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markNotificationsAsRead([n.id]); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Marquer comme lu"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {filteredNotifications.length > 10 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <button
                onClick={() => setShowAllNotifs(!showAllNotifs)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAllNotifs
                  ? 'Afficher moins'
                  : `Voir toutes les notifications (${filteredNotifications.length})`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

// ============================================
// AI ASSISTANT
// ============================================

const AIAssistant: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { tickets, stats } = useAdmin();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Générer le message d'accueil basé sur les vraies données
  const generateWelcomeMessage = useCallback(() => {
    if (!stats) return 'Bonjour ! Je suis votre assistant IA SAV. Chargement des données...';

    const openTickets = stats.byStatus?.OPEN || 0;
    const inProgressTickets = stats.byStatus?.IN_PROGRESS || 0;
    const urgentTickets = stats.byPriority?.URGENT || 0;
    const slaBreached = stats.slaBreached || 0;

    let welcome = `Bonjour ! Voici l'état actuel de votre SAV:\n\n`;
    welcome += `📊 **${stats.total} tickets** au total\n`;
    welcome += `🆕 ${openTickets} ouvert${openTickets > 1 ? 's' : ''} • ⚙️ ${inProgressTickets} en cours\n`;

    if (urgentTickets > 0) {
      welcome += `\n🔴 **${urgentTickets} ticket${urgentTickets > 1 ? 's' : ''} urgent${urgentTickets > 1 ? 's' : ''}** à traiter\n`;
    }
    if (slaBreached > 0) {
      welcome += `⚠️ **${slaBreached} SLA dépassé${slaBreached > 1 ? 's' : ''}**\n`;
    }

    welcome += `\nQue souhaitez-vous analyser ?`;
    return welcome;
  }, [stats]);

  // Initialiser avec le message d'accueil
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: generateWelcomeMessage(),
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, stats, generateWelcomeMessage, messages.length]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Analyser les tickets urgents
  const analyzeUrgentTickets = () => {
    const urgentTickets = tickets.filter(t => t.priority === 'URGENT' && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
    if (urgentTickets.length === 0) {
      return '✅ Aucun ticket urgent en attente. Tout est sous contrôle !';
    }

    let response = `🔴 **${urgentTickets.length} ticket${urgentTickets.length > 1 ? 's' : ''} urgent${urgentTickets.length > 1 ? 's' : ''}:**\n\n`;
    urgentTickets.slice(0, 5).forEach(t => {
      response += `• **#${t.ticketNumber}** - ${t.title.slice(0, 40)}${t.title.length > 40 ? '...' : ''}\n`;
      response += `  ${t.assignedTo ? `👤 ${t.assignedTo.displayName}` : '⚠️ Non assigné'} • ${STATUS_LABELS[t.status as TicketStatus]}\n`;
    });
    if (urgentTickets.length > 5) {
      response += `\n... et ${urgentTickets.length - 5} autre${urgentTickets.length - 5 > 1 ? 's' : ''}`;
    }
    return response;
  };

  // Analyser les SLA
  const analyzeSLA = () => {
    const breachedTickets = tickets.filter(t => t.slaBreached && t.status !== 'CLOSED' && t.status !== 'RESOLVED');
    const atRiskTickets = tickets.filter(t => {
      if (!t.slaDeadline || t.slaBreached) return false;
      const deadline = new Date(t.slaDeadline);
      const now = new Date();
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft < 4;
    });

    let response = `📈 **Analyse SLA:**\n\n`;

    if (breachedTickets.length > 0) {
      response += `🔴 **${breachedTickets.length} SLA dépassé${breachedTickets.length > 1 ? 's' : ''}:**\n`;
      breachedTickets.slice(0, 3).forEach(t => {
        response += `• #${t.ticketNumber} - ${t.title.slice(0, 30)}...\n`;
      });
      response += '\n';
    }

    if (atRiskTickets.length > 0) {
      response += `🟡 **${atRiskTickets.length} ticket${atRiskTickets.length > 1 ? 's' : ''} proche${atRiskTickets.length > 1 ? 's' : ''} du SLA:**\n`;
      atRiskTickets.slice(0, 3).forEach(t => {
        response += `• #${t.ticketNumber} - ${t.title.slice(0, 30)}...\n`;
      });
    }

    if (breachedTickets.length === 0 && atRiskTickets.length === 0) {
      response += '✅ Tous les SLA sont respectés. Excellent travail !';
    }

    return response;
  };

  // Analyser la charge de travail
  const analyzeWorkload = () => {
    const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'REOPENED');
    const unassigned = openTickets.filter(t => !t.assignedTo);
    const byType = {
      TECHNICAL: tickets.filter(t => t.issueType === 'TECHNICAL' && t.status !== 'CLOSED').length,
      DELIVERY: tickets.filter(t => t.issueType === 'DELIVERY' && t.status !== 'CLOSED').length,
      BILLING: tickets.filter(t => t.issueType === 'BILLING' && t.status !== 'CLOSED').length,
      OTHER: tickets.filter(t => t.issueType === 'OTHER' && t.status !== 'CLOSED').length,
    };

    let response = `📊 **Analyse de la charge:**\n\n`;
    response += `🆕 **${openTickets.length} ticket${openTickets.length > 1 ? 's' : ''} en attente**\n`;

    if (unassigned.length > 0) {
      response += `⚠️ ${unassigned.length} non assigné${unassigned.length > 1 ? 's' : ''}\n`;
    }

    response += `\n**Par type:**\n`;
    response += `🔧 Technique: ${byType.TECHNICAL}\n`;
    response += `🚚 Livraison: ${byType.DELIVERY}\n`;
    response += `💳 Facturation: ${byType.BILLING}\n`;
    response += `📋 Autre: ${byType.OTHER}\n`;

    if (unassigned.length > 0) {
      response += `\n💡 **Recommandation:** ${unassigned.length} ticket${unassigned.length > 1 ? 's' : ''} à assigner en priorité.`;
    }

    return response;
  };

  // Chercher un ticket spécifique
  const searchTicket = (query: string) => {
    const searchTerm = query.toLowerCase();
    const found = tickets.filter(t =>
      t.title.toLowerCase().includes(searchTerm) ||
      t.ticketNumber?.toString().includes(searchTerm) ||
      t.customer?.displayName?.toLowerCase().includes(searchTerm) ||
      t.contactName?.toLowerCase().includes(searchTerm) ||
      t.companyName?.toLowerCase().includes(searchTerm)
    );

    if (found.length === 0) {
      return `❌ Aucun ticket trouvé pour "${query}".\n\nEssayez avec un numéro de ticket, un nom de client ou un mot-clé.`;
    }

    let response = `🔍 **${found.length} résultat${found.length > 1 ? 's' : ''} pour "${query}":**\n\n`;
    found.slice(0, 5).forEach(t => {
      const clientName = t.customer?.displayName || t.contactName || t.companyName || 'Client';
      response += `• **#${t.ticketNumber}** - ${t.title.slice(0, 35)}${t.title.length > 35 ? '...' : ''}\n`;
      response += `  ${clientName} • ${STATUS_LABELS[t.status as TicketStatus]}\n`;
    });

    return response;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    const newUserMessage: AIMessage = { id: Date.now().toString(), role: 'user', content: userInput, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Préparer l'historique pour l'API (exclure le message d'accueil initial)
      const conversationHistory = messages
        .filter(m => m.id !== '1') // Exclure le message d'accueil
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Appel à l'API backend
      const result = await AdminApi.chatWithAI(userInput, conversationHistory);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Erreur AI chat:', error);
      // Fallback sur le traitement local en cas d'erreur
      let response: string;
      const inputLower = userInput.toLowerCase();

      if (inputLower.includes('urgent') || inputLower.includes('priorit')) {
        response = analyzeUrgentTickets();
      } else if (inputLower.includes('sla') || inputLower.includes('délai') || inputLower.includes('retard')) {
        response = analyzeSLA();
      } else if (inputLower.includes('charge') || inputLower.includes('workload') || inputLower.includes('répartition') || inputLower.includes('analyse') || inputLower.includes('stat')) {
        response = analyzeWorkload();
      } else if (inputLower.includes('cherch') || inputLower.includes('trouv') || inputLower.includes('search') || inputLower.startsWith('#')) {
        const searchQuery = userInput.replace(/^(cherche|trouve|search|#)\s*/i, '');
        response = searchTicket(searchQuery);
      } else {
        response = `Désolé, une erreur s'est produite. Réessayez avec:\n• "tickets urgents"\n• "analyse SLA"\n• "charge de travail"`;
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 w-full sm:w-[420px] h-[100dvh] sm:h-[560px] bg-white sm:rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold">Assistant IA</span>
            <p className="text-xs text-white/70">Analyse en temps réel</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {m.content.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                )}
              </div>
              <p className={`text-[10px] mt-2 ${m.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>{formatTime(m.timestamp)}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
        <div className="flex gap-2">
          <Input placeholder="Posez votre question..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-white" />
          <Button variant="primary" onClick={handleSend} className="px-4"><Send className="w-4 h-4" /></Button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => { setInput('tickets urgents'); setTimeout(handleSend, 100); }} className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors">🔴 Urgents</button>
          <button onClick={() => { setInput('analyse SLA'); setTimeout(handleSend, 100); }} className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700 transition-colors">⏱️ SLA</button>
          <button onClick={() => { setInput('charge de travail'); setTimeout(handleSend, 100); }} className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">📊 Charge</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// QUICK ACTIONS
// ============================================

const QuickActions: React.FC<{ ticket: Ticket; onUpdate: (u: Partial<Ticket>) => void }> = ({ ticket, onUpdate }) => {
  const { users } = useAdmin();

  const autoAssign = () => {
    const agents = users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.SUPERVISOR);
    if (agents.length > 0) {
      onUpdate({ assignedToId: agents[0].id });
    }
  };

  const nextStatus = () => {
    const flow: Partial<Record<TicketStatus, TicketStatus>> = {
      [TicketStatus.OPEN]: TicketStatus.IN_PROGRESS,
      [TicketStatus.IN_PROGRESS]: TicketStatus.RESOLVED,
      [TicketStatus.WAITING_CUSTOMER]: TicketStatus.IN_PROGRESS,
      [TicketStatus.RESOLVED]: TicketStatus.CLOSED,
      [TicketStatus.REOPENED]: TicketStatus.IN_PROGRESS,
    };
    const next = flow[ticket.status];
    if (next) onUpdate({ status: next });
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl mb-4">
      <span className="text-xs font-medium text-gray-500 w-full mb-1">Actions rapides</span>
      <Button variant="ghost" size="xs" onClick={autoAssign} disabled={!!ticket.assignedToId} className="bg-white border border-gray-200">
        <Zap className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />Auto-assigner
      </Button>
      <Button variant="ghost" size="xs" onClick={nextStatus} className="bg-white border border-gray-200">
        <FastForward className="w-3.5 h-3.5 mr-1.5 text-blue-500" />Avancer
      </Button>
      <Button variant="ghost" size="xs" onClick={() => onUpdate({ status: TicketStatus.ESCALATED })} className="bg-white border border-gray-200">
        <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-500" />Escalader
      </Button>
      <Button variant="ghost" size="xs" onClick={() => onUpdate({ status: TicketStatus.WAITING_CUSTOMER })} className="bg-white border border-gray-200">
        <Clock className="w-3.5 h-3.5 mr-1.5 text-purple-500" />Attente client
      </Button>
    </div>
  );
};

// ============================================
// CHAT PANEL AMÉLIORÉ
// ============================================

// Interface pour les messages IA locaux
interface AILocalMessage {
  id: string;
  content: string;
  timestamp: string;
  isAI: true;
  confidence?: number;
}

const ChatPanel: React.FC<{
  ticketId: string;
  ticket?: Ticket;
  initialMessage?: string;
  onMessageSent?: () => void;
}> = ({ ticketId, ticket, initialMessage, onMessageSent }) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<AILocalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showQuickResponses, setShowQuickResponses] = useState(false);
  const [quickResponseCategory, setQuickResponseCategory] = useState<string | null>(null);
  const [quickResponseSearch, setQuickResponseSearch] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickResponsesRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Filtrer les réponses rapides
  const filteredQuickResponses = useMemo(() => {
    return QUICK_RESPONSES.filter(qr => {
      const matchesCategory = !quickResponseCategory || qr.category === quickResponseCategory;
      const matchesSearch = !quickResponseSearch ||
        qr.title.toLowerCase().includes(quickResponseSearch.toLowerCase()) ||
        qr.content.toLowerCase().includes(quickResponseSearch.toLowerCase()) ||
        qr.shortcut?.toLowerCase().includes(quickResponseSearch.toLowerCase()) ||
        qr.tags?.some(t => t.toLowerCase().includes(quickResponseSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [quickResponseCategory, quickResponseSearch]);

  // Gérer le message initial de l'assistant IA
  useEffect(() => {
    if (initialMessage) {
      setNewMessage(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => { loadMessages(); }, [ticketId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiMessages, isAITyping]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = await AdminApi.getTicketMessages(ticketId);
      setMessages(data);

      // Si pas de messages et IA activée, générer une réponse initiale
      if (data.length === 0 && aiEnabled && ticket) {
        triggerAIResponse();
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAIResponse = async () => {
    if (!aiEnabled || !ticket) return;

    setIsAITyping(true);

    try {
      // Appel à l'API backend pour générer une réponse IA
      const response = await AdminApi.sendAIResponse(ticketId);

      const aiMessage: AILocalMessage = {
        id: `ai-${Date.now()}`,
        content: response.message,
        timestamp: new Date().toISOString(),
        isAI: true,
        confidence: response.confidence,
      };

      setAiMessages(prev => [...prev, aiMessage]);
      setAiResponseCount(prev => prev + 1);

      // Recharger les messages pour inclure la réponse IA sauvegardée
      await loadMessages();

      if (response.shouldEscalate) {
        setAiEnabled(false);
      }
    } catch (error) {
      console.error('Erreur génération réponse IA:', error);
      // Fallback sur la génération locale si l'API échoue
      const context = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        issueType: ticket.issueType,
        priority: ticket.priority,
        customerName: ticket.customer?.displayName || ticket.contactName || ticket.companyName,
        lastCustomerMessage: '',
        messageCount: messages.length + aiMessages.length,
      };

      const { response, shouldEscalate, confidence } = AIResponseService.generateResponse(context);

      const aiMessage: AILocalMessage = {
        id: `ai-${Date.now()}`,
        content: response,
        timestamp: new Date().toISOString(),
        isAI: true,
        confidence,
      };

      setAiMessages(prev => [...prev, aiMessage]);
      setAiResponseCount(prev => prev + 1);

      if (shouldEscalate) {
        setAiEnabled(false);
      }
    } finally {
      setIsAITyping(false);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && files.length === 0) || isSending) return;
    setIsSending(true);
    try {
      let attachmentIds: string[] = [];
      if (files.length > 0) {
        const uploaded = await AdminApi.uploadFiles(files);
        attachmentIds = uploaded.map(a => a.id);
      }

      const message = await AdminApi.sendMessage(ticketId, newMessage, isInternal, attachmentIds);
      setMessages([...messages, message]);
      setNewMessage('');
      setFiles([]);
      // Notifier que le message a été envoyé (pour réinitialiser le brouillon IA)
      onMessageSent?.();
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickResponse = (content: string) => {
    // Substituer les variables dynamiques
    let processedContent = content;
    if (ticket) {
      // Priorité : customer.displayName (compte client) > contactName > companyName > 'Client'
      // Le client est TOUJOURS disponible car c'est lui qui crée le ticket
      const customerName = ticket.customer?.displayName || ticket.contactName || ticket.companyName || 'Client';
      const customerEmail = ticket.customer?.email || ticket.contactEmail || '';
      const customerPhone = ticket.customer?.phone || ticket.contactPhone || '';

      processedContent = processedContent
        .replace(/\{\{customerName\}\}/g, customerName)
        .replace(/\{\{customerEmail\}\}/g, customerEmail)
        .replace(/\{\{customerPhone\}\}/g, customerPhone)
        .replace(/\{\{companyName\}\}/g, ticket.companyName || '')
        .replace(/\{\{ticketTitle\}\}/g, ticket.title || '')
        .replace(/\{\{ticketNumber\}\}/g, String(ticket.ticketNumber) || '')
        .replace(/\{\{equipmentModel\}\}/g, ticket.equipmentModel || 'votre équipement')
        .replace(/\{\{equipmentBrand\}\}/g, ticket.equipmentBrand || '')
        .replace(/\{\{serialNumber\}\}/g, ticket.serialNumber || '')
        .replace(/\{\{errorCode\}\}/g, ticket.errorCode || '');
    }
    setNewMessage(processedContent);
    setShowQuickResponses(false);
    setQuickResponseSearch('');
    setQuickResponseCategory(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Combiner et trier tous les messages
  const allMessages = useMemo(() => {
    const combined = [
      ...messages.map(m => ({ ...m, isAI: false as const })),
      ...aiMessages.map(m => ({ ...m, isAI: true as const, authorId: 'ai', author: null })),
    ];
    return combined.sort((a, b) => {
      const dateA = a.isAI ? new Date(a.timestamp) : new Date(a.createdAt);
      const dateB = b.isAI ? new Date(b.timestamp) : new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  }, [messages, aiMessages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-400px)] min-h-[400px] max-h-[700px] bg-gray-50 rounded-xl overflow-hidden">
      {/* AI Status bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">Assistant IA</span>
          {aiEnabled && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70">{aiResponseCount} réponse{aiResponseCount > 1 ? 's' : ''} IA</span>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${aiEnabled ? 'bg-green-400' : 'bg-white/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Légende des couleurs */}
      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-violet-600" />
          <span className="text-gray-600">IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          <span className="text-gray-600">Client</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
          <span className="text-gray-600">Vous</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
          <span className="text-gray-600">Opérateur</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-dashed border-slate-400" />
          <span className="text-gray-600">Note interne</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 && !isAITyping ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p className="text-sm">Aucun message</p>
            <p className="text-xs">L'IA va démarrer la conversation</p>
          </div>
        ) : (
          <>
            {allMessages.map(m => {
              const isAIMessage = m.isAI;
              const isOwnMessage = !isAIMessage && m.authorId === user?.id;
              const isInternalNote = !isAIMessage && (m as TicketMessage).isInternal;
              const authorRole = !isAIMessage ? (m as TicketMessage).author?.role : null;
              const isCustomerMessage = !isAIMessage && authorRole === 'CUSTOMER';
              const isOperatorMessage = !isAIMessage && !isOwnMessage && !isCustomerMessage && !isAIMessage;

              // Définir les styles selon le type de message
              const getMessageStyles = () => {
                if (isAIMessage) return {
                  bubble: 'bg-gradient-to-r from-purple-100 to-violet-100 border-2 border-purple-300',
                  avatar: 'bg-gradient-to-br from-purple-500 to-violet-600',
                  avatarIcon: <Brain className="w-4 h-4 text-white" />,
                  headerColor: 'text-purple-700',
                  timeColor: 'text-purple-500',
                  textColor: 'text-purple-900',
                  label: 'Assistant IA KLY',
                  labelIcon: <Sparkles className="w-3.5 h-3.5" />,
                };
                if (isInternalNote) return {
                  bubble: 'bg-gradient-to-r from-slate-100 to-gray-100 border-2 border-slate-400 border-dashed',
                  avatar: 'bg-slate-200',
                  avatarIcon: <Lock className="w-4 h-4 text-slate-600" />,
                  headerColor: 'text-slate-700',
                  timeColor: 'text-slate-500',
                  textColor: 'text-slate-800',
                  label: 'NOTE INTERNE',
                  labelIcon: <Lock className="w-3.5 h-3.5" />,
                };
                if (isCustomerMessage) return {
                  bubble: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300',
                  avatar: 'bg-gradient-to-br from-amber-400 to-orange-500',
                  avatarIcon: <User className="w-4 h-4 text-white" />,
                  headerColor: 'text-amber-700',
                  timeColor: 'text-amber-600',
                  textColor: 'text-amber-900',
                  label: 'Client',
                  labelIcon: <User className="w-3.5 h-3.5" />,
                };
                if (isOwnMessage) return {
                  bubble: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
                  avatar: 'bg-blue-200',
                  avatarIcon: null,
                  headerColor: 'text-white/90',
                  timeColor: 'text-white/70',
                  textColor: 'text-white',
                  label: 'Vous',
                  labelIcon: null,
                };
                // Autre opérateur
                return {
                  bubble: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300',
                  avatar: 'bg-gradient-to-br from-blue-500 to-indigo-600',
                  avatarIcon: <Headphones className="w-4 h-4 text-white" />,
                  headerColor: 'text-emerald-700',
                  timeColor: 'text-emerald-600',
                  textColor: 'text-emerald-900',
                  label: 'Opérateur',
                  labelIcon: <Headphones className="w-3.5 h-3.5" />,
                };
              };

              const styles = getMessageStyles();

              return (
                <div key={m.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  {/* Avatar */}
                  {!isOwnMessage && (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-2 flex-shrink-0 shadow-sm ${styles.avatar}`}>
                      {styles.avatarIcon || (
                        <span className="text-xs font-bold text-gray-700">
                          {getInitials((m as TicketMessage).author?.displayName, (m as TicketMessage).author?.email)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[75%] ${styles.bubble} rounded-2xl ${isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm'} p-4 shadow-sm`}>

                    {/* Badge type de message */}
                    {(isAIMessage || isInternalNote || isCustomerMessage || isOperatorMessage) && (
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${styles.headerColor} mb-2 pb-2 border-b ${
                        isAIMessage ? 'border-purple-200' :
                        isInternalNote ? 'border-slate-300' :
                        isCustomerMessage ? 'border-amber-200' :
                        'border-emerald-200'
                      }`}>
                        {styles.labelIcon}
                        <span>{isAIMessage ? 'Assistant IA KLY' : isCustomerMessage ? 'Client' : isInternalNote ? 'NOTE INTERNE' : (m as TicketMessage).author?.displayName || 'Opérateur'}</span>
                        {isAIMessage && (m as AILocalMessage).confidence && (
                          <span className="ml-auto text-purple-500 font-normal">
                            {(m as AILocalMessage).confidence}% confiance
                          </span>
                        )}
                      </div>
                    )}

                    {/* Header pour ses propres messages */}
                    {isOwnMessage && (
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${styles.headerColor}`}>Vous</span>
                        <span className={`text-[10px] ${styles.timeColor}`}>
                          {formatTime(m.isAI ? m.timestamp : m.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Timestamp pour les autres messages */}
                    {!isOwnMessage && (
                      <div className="flex justify-end mb-1">
                        <span className={`text-[10px] ${styles.timeColor}`}>
                          {formatTime(m.isAI ? m.timestamp : m.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${styles.textColor}`}>
                      {m.content}
                    </p>

                    {/* Attachments */}
                    {!isAIMessage && (m as TicketMessage).attachments && (m as TicketMessage).attachments!.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(m as TicketMessage).attachments!.map(att => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs ${isOwnMessage ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
                            <FileText className="w-4 h-4" />
                            <span className="truncate flex-1">{att.fileName}</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Avatar pour ses propres messages */}
                  {isOwnMessage && !isInternalNote && (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ml-2 flex-shrink-0 shadow-sm">
                      <span className="text-xs font-bold text-white">{getInitials(user?.displayName, user?.email)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Typing indicator */}
            {isAITyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mr-2 flex-shrink-0">
                  <Brain className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-purple-600">L'IA analyse et rédige...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick responses dropdown amélioré */}
      {showQuickResponses && (
        <div
          ref={quickResponsesRef}
          className="absolute bottom-24 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden"
          style={{ maxHeight: '400px' }}
        >
          {/* Header avec recherche */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Réponses rapides
              </h4>
              <button
                onClick={() => {
                  setShowQuickResponses(false);
                  setQuickResponseSearch('');
                  setQuickResponseCategory(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher ou tapez un raccourci (ar, pc, di...)"
                value={quickResponseSearch}
                onChange={e => setQuickResponseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Catégories */}
          <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setQuickResponseCategory(null)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                !quickResponseCategory
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tout
            </button>
            {Object.entries(QUICK_RESPONSE_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setQuickResponseCategory(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  quickResponseCategory === key
                    ? 'bg-blue-600 text-white'
                    : `${cat.color} hover:opacity-80`
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Liste des réponses */}
          <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
            {filteredQuickResponses.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune réponse trouvée</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredQuickResponses.map(qr => {
                  const catConfig = QUICK_RESPONSE_CATEGORIES[qr.category];
                  return (
                    <button
                      key={qr.id}
                      onClick={() => handleQuickResponse(qr.content)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{qr.title}</p>
                            {qr.shortcut && (
                              <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                /{qr.shortcut}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {qr.content.substring(0, 100).replace(/\{\{[^}]+\}\}/g, '...')}...
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                      </div>
                      {/* Aperçu au survol */}
                      <div className="hidden group-hover:block mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {qr.content
                          .replace(/\{\{customerName\}\}/g, ticket?.customer?.displayName || ticket?.contactName || ticket?.companyName || '[Client]')
                          .replace(/\{\{ticketTitle\}\}/g, ticket?.title || '[Titre]')
                          .replace(/\{\{ticketNumber\}\}/g, String(ticket?.ticketNumber) || '[N°]')
                          .replace(/\{\{equipmentModel\}\}/g, ticket?.equipmentModel || '[Équipement]')
                          .substring(0, 200)}
                        {qr.content.length > 200 && '...'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer avec info */}
          <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">
              Tapez <span className="font-mono bg-gray-200 px-1 rounded">/raccourci</span> pour filtrer • Les variables comme {`{{customerName}}`} seront remplacées automatiquement
            </p>
          </div>
        </div>
      )}

      {/* File preview */}
      {files.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-xs">
              <Paperclip className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 bg-white border-t border-gray-200">
        {/* Actions row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInternal(!isInternal)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={`relative w-10 h-5 rounded-full transition-colors ${isInternal ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isInternal ? 'translate-x-5' : ''}`} />
              </div>
              <Lock className={`w-4 h-4 ${isInternal ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-sm ${isInternal ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>Note interne</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowQuickResponses(!showQuickResponses)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
              <Zap className="w-3.5 h-3.5" />Réponses rapides
            </button>
          </div>
        </div>

        {/* Input + buttons */}
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*,.pdf,.doc,.docx" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Textarea
              placeholder={isInternal ? "Note interne (visible uniquement par l'équipe)..." : "Écrivez votre message... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim() || files.length > 0) {
                    handleSend();
                  }
                }
              }}
              rows={4}
              className={`pr-12 ${isInternal ? 'bg-indigo-50 border-indigo-200 focus:border-indigo-400' : ''}`}
            />
          </div>
          <Button variant={isInternal ? 'secondary' : 'primary'} onClick={handleSend} disabled={isSending || (!newMessage.trim() && files.length === 0)} className={`self-end ${isInternal ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}`}>
            {isSending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DOCUMENTS PANEL
// ============================================

const DocumentsPanel: React.FC<{ ticketId: string; attachments: Attachment[] }> = ({ ticketId, attachments }) => {
  const [documents, setDocuments] = useState<Attachment[]>(attachments);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger tous les documents (ticket + messages)
  useEffect(() => {
    const loadAllDocuments = async () => {
      try {
        setIsLoading(true);
        // Récupérer les messages du ticket pour avoir leurs pièces jointes
        const messages = await AdminApi.getTicketMessages(ticketId);

        // Collecter toutes les pièces jointes
        const messageAttachments = messages.flatMap(m => m.attachments || []);
        const allDocs = [...attachments, ...messageAttachments];

        // Dédupliquer par ID
        const uniqueDocs = allDocs.filter((doc, index, self) =>
          index === self.findIndex(d => d.id === doc.id)
        );

        setDocuments(uniqueDocs);
      } catch (error) {
        console.error('Erreur chargement documents:', error);
        setDocuments(attachments);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllDocuments();
  }, [ticketId, attachments]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-green-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-8 h-8 text-green-600" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      // Upload des fichiers via l'API
      const uploaded = await AdminApi.uploadFiles(files);
      setDocuments(prev => [...prev, ...uploaded]);
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await AdminApi.deleteAttachment(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Erreur suppression:', error);
      // Supprimer quand même localement si erreur API
      setDocuments(prev => prev.filter(d => d.id !== docId));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <div className="flex flex-col items-center">
          {isUploading ? (
            <>
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-blue-600 font-medium">Upload en cours...</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Glissez-déposez vos fichiers ici
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ou cliquez pour sélectionner (Images, PDF, Word, Excel)
              </p>
            </>
          )}
        </div>
      </div>

      {/* Liste des documents */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Documents ({documents.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all group"
              >
                <div className="flex-shrink-0">
                  {doc.mimeType.startsWith('image/') ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      <img src={doc.url} alt={doc.fileName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      {getFileIcon(doc.mimeType)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.sizeBytes)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Voir"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={doc.url}
                    download={doc.fileName}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3" />
          <p className="text-sm">Aucun document</p>
          <p className="text-xs mt-1">Ajoutez des documents en les déposant ci-dessus</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// TICKET DETAIL MODAL
// ============================================

// ============================================
// AI ASSISTANT PANEL (pour les opérateurs)
// ============================================

const AIAssistantPanel: React.FC<{ ticketId: string; ticket?: Ticket; onUseDraft: (draft: string) => void }> = ({ ticketId, ticket, onUseDraft }) => {
  // État pour le résumé IA
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    keyIssues: string[];
    customerMood: string;
    nextSteps: string[];
    resolutionProgress: number;
  } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Charger le résumé IA depuis l'API
  useEffect(() => {
    const loadAISummary = async () => {
      if (!ticketId) return;
      try {
        setIsLoadingSummary(true);
        setSummaryError(null);
        const data = await AdminApi.getConversationSummary(ticketId);
        setAiSummary(data);
      } catch (error) {
        console.error('Erreur chargement résumé IA:', error);
        setSummaryError('Impossible de charger le résumé IA');
      } finally {
        setIsLoadingSummary(false);
      }
    };
    loadAISummary();
  }, [ticketId]);

  if (!ticket) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Chargement des données du ticket...</p>
      </div>
    );
  }

  if (isLoadingSummary) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" />
        <p>L'IA analyse la conversation...</p>
        <p className="text-xs mt-2">Génération du résumé intelligent</p>
      </div>
    );
  }

  // Analyser les données du résumé IA - Priorité: compte client > contact > entreprise
  const customerName = ticket.customer?.displayName || ticket.contactName || ticket.companyName || 'Client';
  const customerFirstName = customerName.split(' ')[0];

  // Utiliser les données IA pour le sentiment
  const customerMood = aiSummary?.customerMood || 'Neutre';
  let sentimentEmoji = '😐';
  let sentimentColor = 'bg-gray-100 text-gray-700';

  if (customerMood.includes('Satisfait') || customerMood.includes('😊')) {
    sentimentEmoji = '😊';
    sentimentColor = 'bg-green-100 text-green-700';
  } else if (customerMood.includes('Frustré') || customerMood.includes('😤')) {
    sentimentEmoji = '😤';
    sentimentColor = 'bg-red-100 text-red-700';
  } else if (customerMood.includes('Mécontent') || customerMood.includes('😟')) {
    sentimentEmoji = '😟';
    sentimentColor = 'bg-orange-100 text-orange-700';
  } else if (customerMood.includes('attente') || customerMood.includes('⏳')) {
    sentimentEmoji = '⏳';
    sentimentColor = 'bg-yellow-100 text-yellow-700';
  }

  // Évaluation de l'urgence basée sur l'IA
  let urgencyLabel = 'Traitement standard';
  let urgencyIcon = '🟢';
  let urgencyColor = 'bg-green-50 border-green-200 text-green-800';

  if (ticket.priority === 'URGENT') {
    urgencyLabel = 'TRÈS URGENT - Traitement immédiat';
    urgencyIcon = '🔴';
    urgencyColor = 'bg-red-50 border-red-200 text-red-800';
  } else if (ticket.priority === 'HIGH') {
    urgencyLabel = 'Priorité haute - À traiter rapidement';
    urgencyIcon = '🟠';
    urgencyColor = 'bg-orange-50 border-orange-200 text-orange-800';
  } else if (customerMood.includes('Frustré') || customerMood.includes('😤')) {
    urgencyLabel = 'Attention requise - Client frustré';
    urgencyIcon = '🟡';
    urgencyColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
  }

  // Convertir les nextSteps IA en actions recommandées
  const getRecommendedActions = () => {
    if (aiSummary?.nextSteps && aiSummary.nextSteps.length > 0) {
      return aiSummary.nextSteps.map((step, idx) => ({
        action: step,
        priority: idx === 0 ? 'high' as const : idx === 1 ? 'medium' as const : 'low' as const,
      }));
    }

    // Fallback si pas de données IA
    const actions: { action: string; priority: 'high' | 'medium' | 'low' }[] = [];
    if (!ticket.assignedTo) {
      actions.push({ action: 'Assigner ce ticket à un technicien', priority: 'high' });
    }
    if (ticket.status === 'OPEN' || ticket.status === 'REOPENED') {
      actions.push({ action: 'Passer le ticket en "En cours"', priority: 'high' });
    }
    if (actions.length === 0) {
      actions.push({ action: 'Suivre le dossier et tenir le client informé', priority: 'low' });
    }
    return actions;
  };

  // Générer le brouillon de réponse contextuel
  const generateDraftResponse = () => {
    let draft = `Bonjour ${customerFirstName},\n\n`;

    // Adapter le ton selon l'humeur du client (depuis l'IA)
    const isFrustrated = customerMood.includes('Frustré') || customerMood.includes('😤');
    const isPositive = customerMood.includes('Satisfait') || customerMood.includes('😊');

    if (isFrustrated) {
      draft += `Je comprends votre frustration et je vous présente toutes mes excuses pour ce désagrément. Je fais de votre dossier une priorité.\n\n`;
    } else if (isPositive) {
      draft += `Je vous remercie pour votre retour.\n\n`;
    }

    // Contenu selon le type de problème et l'état
    switch (ticket.issueType) {
      case 'TECHNICAL':
        if (!ticket.serialNumber) {
          draft += `Afin de traiter votre demande au mieux, pourriez-vous me communiquer :\n`;
          draft += `- Le numéro de série de l'équipement\n`;
          if (!ticket.errorCode) {
            draft += `- Le code erreur affiché (si applicable)\n`;
          }
          draft += `\nCes informations me permettront d'établir un diagnostic précis.`;
        } else {
          draft += `J'ai bien pris note de votre demande concernant l'équipement ${ticket.equipmentModel ? `modèle ${ticket.equipmentModel} ` : ''}(S/N: ${ticket.serialNumber}).\n\n`;
          draft += `Je procède aux vérifications nécessaires et reviens vers vous rapidement avec une solution.`;
        }
        break;
      case 'DELIVERY':
        draft += `Je vérifie immédiatement le statut de votre livraison.\n\n`;
        draft += `Pourriez-vous me confirmer votre numéro de commande afin que je puisse accéder à votre dossier ?`;
        break;
      case 'BILLING':
        draft += `Je prends en charge votre demande concernant la facturation.\n\n`;
        draft += `Pourriez-vous me préciser le numéro de facture concerné ? Je consulte votre dossier et reviens vers vous dans les meilleurs délais.`;
        break;
      default:
        draft += `Je prends en charge votre demande et vous recontacterai dans les meilleurs délais avec une réponse.`;
    }

    draft += `\n\nCordialement,\nService SAV KLY Groupe`;
    return draft;
  };

  const recommendedActions = getRecommendedActions();
  const draftResponse = generateDraftResponse();

  return (
    <div className="space-y-6">
      {/* RÉSUMÉ EXÉCUTIF - Style Gmail */}
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-2xl p-6 border border-indigo-100">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
            <Brain className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Synthèse IA du ticket #{ticket.ticketNumber}</h3>
            <p className="text-sm text-gray-500">Résumé intelligent généré par l'assistant IA</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${sentimentColor}`}>
            <span className="text-xl">{sentimentEmoji}</span>
            <span className="font-semibold text-sm">{customerMood.replace(/[😊😤😟⏳😐]/g, '').trim() || 'Neutre'}</span>
          </div>
        </div>

        {/* Barre de progression */}
        {aiSummary && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progression vers résolution</span>
              <span className="font-semibold">{aiSummary.resolutionProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  aiSummary.resolutionProgress >= 75 ? 'bg-green-500' :
                  aiSummary.resolutionProgress >= 50 ? 'bg-blue-500' :
                  aiSummary.resolutionProgress >= 25 ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
                style={{ width: `${aiSummary.resolutionProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Bandeau urgence */}
        <div className={`rounded-xl p-4 border-2 ${urgencyColor} mb-5`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{urgencyIcon}</span>
            <div>
              <p className="font-bold">{urgencyLabel}</p>
              <p className="text-sm opacity-80">
                {ticket.status === 'OPEN' ? 'En attente de traitement' : STATUS_LABELS[ticket.status as TicketStatus]}
                {ticket.assignedTo ? ` • Assigné à ${ticket.assignedTo.displayName}` : ' • Non assigné'}
              </p>
            </div>
          </div>
        </div>

        {/* Résumé de la conversation par IA */}
        <div className="bg-white/70 rounded-xl p-4 border border-white mb-4">
          <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Résumé de la conversation
          </h4>
          <div className="text-sm text-gray-700 leading-relaxed">
            {summaryError ? (
              <p className="text-red-500">{summaryError}</p>
            ) : (
              <p>{aiSummary?.summary || 'Aucun résumé disponible'}</p>
            )}
          </div>
        </div>

        {/* Points clés identifiés par l'IA */}
        {aiSummary?.keyIssues && aiSummary.keyIssues.length > 0 && (
          <div className="bg-white/70 rounded-xl p-4 border border-white">
            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-600" />
              Points clés identifiés
            </h4>
            <ul className="space-y-1">
              {aiSummary.keyIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* GRILLE INFOS */}
      <div className="grid grid-cols-12 gap-6">
        {/* Colonne gauche */}
        <div className="col-span-5 space-y-4">
          {/* Infos client et ticket */}
          <Card className="p-5">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Informations
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-gray-900">{customerName}</span>
              </div>
              {ticket.companyName && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-500">Entreprise</span>
                  <span className="font-medium text-gray-900">{ticket.companyName}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Type</span>
                <Badge className={`${ticket.issueType === 'TECHNICAL' ? 'bg-purple-100 text-purple-700' : ticket.issueType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : ticket.issueType === 'BILLING' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {ISSUE_TYPE_LABELS[ticket.issueType as IssueType]}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Priorité</span>
                <Badge className={getPriorityColor(ticket.priority as TicketPriority)}>{PRIORITY_LABELS[ticket.priority as TicketPriority]}</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Statut</span>
                <Badge className={getStatusColor(ticket.status as TicketStatus)}>{STATUS_LABELS[ticket.status as TicketStatus]}</Badge>
              </div>
            </div>
          </Card>

          {/* Infos équipement */}
          {(ticket.serialNumber || ticket.errorCode || ticket.equipmentBrand || ticket.equipmentModel) && (
            <Card className="p-5">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-600" />
                Données équipement
              </h4>
              <div className="space-y-3 text-sm">
                {ticket.equipmentBrand && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Marque</span>
                    <span className="font-medium">{ticket.equipmentBrand}</span>
                  </div>
                )}
                {ticket.equipmentModel && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Modèle</span>
                    <span className="font-medium">{ticket.equipmentModel}</span>
                  </div>
                )}
                {ticket.serialNumber && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">N° série</span>
                    <span className="font-mono font-medium">{ticket.serialNumber}</span>
                  </div>
                )}
                {ticket.errorCode && (
                  <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">Code erreur</span>
                    <span className="font-mono font-medium text-red-600">{ticket.errorCode}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Actions recommandées */}
          <Card className="p-5">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Prochaines étapes
            </h4>
            <ul className="space-y-2">
              {recommendedActions.map((item, i) => (
                <li key={i} className={`flex items-start gap-3 p-2 rounded-lg ${item.priority === 'high' ? 'bg-red-50' : item.priority === 'medium' ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                  <span className="text-sm text-gray-700">{item.action}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Colonne droite - Brouillon */}
        <div className="col-span-7">
          <Card className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Réponse suggérée
              </h4>
              <span className="text-xs text-gray-400">Adaptée au contexte</span>
            </div>

            <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 mb-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {draftResponse}
              </pre>
            </div>

            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" onClick={() => onUseDraft(draftResponse)}>
                <Send className="w-4 h-4 mr-2" />
                Utiliser cette réponse
              </Button>
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(draftResponse)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Composant SLA Timer
const SLATimer: React.FC<{ deadline: string | Date | null; breached: boolean; compact?: boolean }> = ({ deadline, breached, compact = false }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'safe' | 'warning' | 'critical' | 'breached'>('safe');

  useEffect(() => {
    if (!deadline) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate.getTime() - now.getTime();

      if (breached || diff < 0) {
        setUrgencyLevel('breached');
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`-${hours}h${compact ? '' : ` ${minutes}m`}`);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours < 1) setUrgencyLevel('critical');
        else if (hours < 4) setUrgencyLevel('warning');
        else setUrgencyLevel('safe');

        setTimeLeft(`${hours}h${compact ? '' : ` ${minutes}m`}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [deadline, breached, compact]);

  if (!deadline) return null;

  const colors = {
    safe: 'bg-green-100 text-green-700 border-green-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    critical: 'bg-orange-100 text-orange-700 border-orange-300 animate-pulse',
    breached: 'bg-red-100 text-red-700 border-red-300',
  };

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${colors[urgencyLevel]}`}>
        <Timer className="w-3 h-3" />
        {timeLeft}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[urgencyLevel]}`}>
      <Timer className="w-4 h-4" />
      <span className="text-sm font-bold">{timeLeft}</span>
      <span className="text-xs opacity-75">{urgencyLevel === 'breached' ? 'Dépassé' : 'restant'}</span>
    </div>
  );
};

const TicketDetailModal: React.FC<{
  ticket: Ticket;
  onClose: () => void;
  onUpdate: (t: Ticket) => void;
}> = ({ ticket, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editedTicket, setEditedTicket] = useState(ticket);
  const [isSaving, setIsSaving] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(ticket.attachments?.length || 0);
  const [draftFromAI, setDraftFromAI] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const { users, refreshData } = useAdmin();
  const { user } = useAuth();

  // Agents disponibles pour transfert
  const availableAgents = users.filter(
    u => u.role !== UserRole.CUSTOMER && u.id !== editedTicket.assignedToId && u.isActive !== false
  );

  // Vérifier si le ticket m'appartient
  const isMyTicket = editedTicket.assignedToId === user?.id;

  // Charger le compte total des documents (ticket + messages)
  useEffect(() => {
    const loadDocumentsCount = async () => {
      try {
        const messages = await AdminApi.getTicketMessages(ticket.id);
        const messageAttachments = messages.flatMap(m => m.attachments || []);
        const ticketAttachments = ticket.attachments || [];
        const allIds = new Set([
          ...ticketAttachments.map(a => a.id),
          ...messageAttachments.map(a => a.id)
        ]);
        setDocumentsCount(allIds.size);
      } catch (error) {
        console.error('Erreur chargement count documents:', error);
      }
    };
    loadDocumentsCount();
  }, [ticket.id, ticket.attachments]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Ctrl+1-5 pour les onglets
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['details', 'messages', 'ai-assistant', 'documents', 'history'];
        setActiveTab(tabs[parseInt(e.key) - 1]);
      }
      // R pour résoudre
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (editedTicket.status !== TicketStatus.RESOLVED && editedTicket.status !== TicketStatus.CLOSED) {
          handleUpdate({ status: TicketStatus.RESOLVED });
        }
      }
      // E pour escalader
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (editedTicket.status !== TicketStatus.ESCALATED) {
          handleUpdate({ status: TicketStatus.ESCALATED });
        }
      }
      // Escape pour fermer
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedTicket.status]);

  const handleUpdate = async (updates: Partial<Ticket>) => {
    setIsSaving(true);
    try {
      const updated = await AdminApi.updateTicket(ticket.id, {
        status: updates.status,
        priority: updates.priority,
        assignedToId: updates.assignedToId,
        tags: updates.tags,
      });
      setEditedTicket(updated);
      onUpdate(updated);
    } catch (error) {
      console.error('Erreur mise à jour:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAgent) return;
    try {
      await AdminApi.requestTransfer(ticket.id, selectedAgent, transferReason);
      setShowTransferModal(false);
      setTransferReason('');
      setSelectedAgent('');
      alert('Demande de transfert envoyée avec succès !');
    } catch (error) {
      console.error('Erreur transfert:', error);
      alert('Erreur lors du transfert');
    }
  };

  const handleTakeOver = async () => {
    if (!user) return;
    await handleUpdate({ assignedToId: user.id });
  };

  const assignee = users.find(u => u.id === editedTicket.assignedToId);
  const ticketAge = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Modal isOpen={true} onClose={onClose} title="" size="full">
      {/* Header amélioré */}
      <div className="-mt-5 -mx-5 px-5 pb-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-lg font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">#{ticket.ticketRef || ticket.ticketNumber}</span>
              <Badge className={`${getStatusColor(editedTicket.status)} text-sm px-3 py-1`}>{STATUS_LABELS[editedTicket.status]}</Badge>
              <Badge className={`${getPriorityColor(editedTicket.priority)} text-sm px-3 py-1`}>{PRIORITY_LABELS[editedTicket.priority]}</Badge>
              <Badge className="bg-gray-100 text-gray-600 text-sm px-3 py-1">{ISSUE_TYPE_LABELS[editedTicket.issueType]}</Badge>
              {ticketAge > 0 && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{ticketAge}j</span>}
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {/* Client : compte ou contact */}
              {(ticket.customer || ticket.contactName || ticket.companyName) && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {ticket.customer?.displayName || ticket.contactName || ticket.companyName}
                </span>
              )}
              {ticket.companyName && ticket.customer && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {ticket.companyName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDateTime(ticket.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* SLA Timer */}
            <SLATimer deadline={ticket.slaDeadline || null} breached={editedTicket.slaBreached || false} />

            {/* Agent assigné */}
            {assignee ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{getInitials(assignee.displayName, assignee.email)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{assignee.displayName}</p>
                  <p className="text-[10px] text-gray-500">{ROLE_CONFIG[assignee.role]?.label}</p>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleTakeOver} className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">
                <User className="w-4 h-4 mr-1" />
                Prendre en charge
              </Button>
            )}
          </div>
        </div>

        {/* Barre d'actions rapides améliorée */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {/* Changements de statut rapides */}
          {editedTicket.status === TicketStatus.OPEN && (
            <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.IN_PROGRESS })} className="bg-blue-600 hover:bg-blue-700">
              <PlayCircle className="w-4 h-4 mr-1" />Démarrer
            </Button>
          )}
          {editedTicket.status === TicketStatus.IN_PROGRESS && (
            <>
              <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.RESOLVED })} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" />Résoudre <span className="ml-1 text-xs opacity-70">(R)</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.WAITING_CUSTOMER })} className="text-yellow-700 border-yellow-300 hover:bg-yellow-50">
                <Clock className="w-4 h-4 mr-1" />Attente client
              </Button>
            </>
          )}
          {editedTicket.status === TicketStatus.WAITING_CUSTOMER && (
            <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.IN_PROGRESS })} className="bg-blue-600 hover:bg-blue-700">
              <PlayCircle className="w-4 h-4 mr-1" />Reprendre
            </Button>
          )}
          {editedTicket.status === TicketStatus.RESOLVED && (
            <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.CLOSED })} className="text-gray-700">
              <XCircle className="w-4 h-4 mr-1" />Clôturer
            </Button>
          )}
          {(editedTicket.status === TicketStatus.RESOLVED || editedTicket.status === TicketStatus.CLOSED) && (
            <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.REOPENED })} className="text-orange-700 border-orange-300 hover:bg-orange-50">
              <RefreshCw className="w-4 h-4 mr-1" />Réouvrir
            </Button>
          )}

          <div className="h-6 w-px bg-gray-300 mx-1" />

          {/* Actions secondaires */}
          {editedTicket.status !== TicketStatus.ESCALATED && editedTicket.status !== TicketStatus.CLOSED && (
            <Button variant="ghost" size="sm" onClick={() => handleUpdate({ status: TicketStatus.ESCALATED })} className="text-red-600 hover:bg-red-50">
              <AlertTriangle className="w-4 h-4 mr-1" />Escalader <span className="ml-1 text-xs opacity-70">(E)</span>
            </Button>
          )}

          {isMyTicket && availableAgents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowTransferModal(true)} className="text-blue-600 hover:bg-blue-50">
              <ArrowUpRight className="w-4 h-4 mr-1" />Transférer
            </Button>
          )}

          <div className="flex-1" />

          {/* Priorité rapide */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map(p => (
              <button
                key={p}
                onClick={() => handleUpdate({ priority: p })}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  editedTicket.priority === p
                    ? getPriorityColor(p)
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={PRIORITY_LABELS[p]}
              >
                {p === 'URGENT' ? '🔴' : p === 'HIGH' ? '🟠' : p === 'MEDIUM' ? '🔵' : '⚪'}
              </button>
            ))}
          </div>

          {/* Raccourcis clavier hint */}
          <span className="text-[10px] text-gray-400 hidden lg:block">
            Ctrl+1-5: onglets • R: résoudre • E: escalader • Esc: fermer
          </span>
        </div>
      </div>

      {/* Modal de transfert */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              Transférer le ticket
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transférer à</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName} ({ROLE_CONFIG[agent.role]?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison (optionnel)</label>
                <textarea
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Pourquoi transférez-vous ce ticket ?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="primary" className="flex-1" onClick={handleTransfer} disabled={!selectedAgent}>
                Envoyer la demande
              </Button>
              <Button variant="secondary" onClick={() => setShowTransferModal(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      <QuickActions ticket={editedTicket} onUpdate={handleUpdate} />

      <Tabs
        tabs={[
          { id: 'details', label: 'Détails', icon: <FileText className="w-4 h-4" /> },
          { id: 'messages', label: 'Conversation', icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'ai-assistant', label: 'Assistant IA', icon: <Brain className="w-4 h-4" /> },
          { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" />, count: documentsCount },
          { id: 'history', label: 'Historique', icon: <History className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="mt-5">
        {activeTab === 'details' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
              {/* Timeline mini du statut */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Progression du ticket
                </h4>
                <div className="flex items-center gap-2">
                  {[
                    { status: 'OPEN', label: 'Ouvert', icon: <AlertCircle className="w-4 h-4" /> },
                    { status: 'IN_PROGRESS', label: 'En cours', icon: <PlayCircle className="w-4 h-4" /> },
                    { status: 'WAITING_CUSTOMER', label: 'Attente', icon: <Clock className="w-4 h-4" /> },
                    { status: 'RESOLVED', label: 'Résolu', icon: <CheckCircle className="w-4 h-4" /> },
                    { status: 'CLOSED', label: 'Fermé', icon: <XCircle className="w-4 h-4" /> },
                  ].map((step, i, arr) => {
                    const statusOrder = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
                    const currentIndex = statusOrder.indexOf(editedTicket.status);
                    const stepIndex = statusOrder.indexOf(step.status);
                    const isPast = stepIndex < currentIndex || (editedTicket.status === 'REOPENED' && step.status === 'OPEN');
                    const isCurrent = step.status === editedTicket.status || (editedTicket.status === 'REOPENED' && step.status === 'OPEN');
                    const isEscalated = editedTicket.status === 'ESCALATED';

                    return (
                      <React.Fragment key={step.status}>
                        <div
                          className={`flex flex-col items-center gap-1 ${
                            isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                            isPast ? 'bg-green-500 text-white' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {isPast && !isCurrent ? <CheckCircle className="w-4 h-4" /> : step.icon}
                          </div>
                          <span className="text-[10px] font-medium">{step.label}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`flex-1 h-1 rounded ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                {editedTicket.status === 'ESCALATED' && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Ticket escaladé - Attention requise</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description du problème</label>
                <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description || 'Aucune description fournie.'}</p>
                </div>
              </div>

              {/* Informations équipement si disponibles */}
              {(ticket.serialNumber || ticket.equipmentModel || ticket.equipmentBrand || ticket.errorCode) && (
                <Card className="p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Informations équipement
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ticket.equipmentBrand && (
                      <div>
                        <span className="text-xs text-gray-500">Marque</span>
                        <p className="font-medium text-gray-900">{ticket.equipmentBrand}</p>
                      </div>
                    )}
                    {ticket.equipmentModel && (
                      <div>
                        <span className="text-xs text-gray-500">Modèle</span>
                        <p className="font-medium text-gray-900">{ticket.equipmentModel}</p>
                      </div>
                    )}
                    {ticket.serialNumber && (
                      <div>
                        <span className="text-xs text-gray-500">N° de série</span>
                        <p className="font-mono font-medium text-gray-900">{ticket.serialNumber}</p>
                      </div>
                    )}
                    {ticket.errorCode && (
                      <div>
                        <span className="text-xs text-gray-500">Code erreur</span>
                        <p className="font-mono font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">{ticket.errorCode}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Gestion du ticket */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</label>
                  <Select
                    value={editedTicket.status}
                    onChange={e => handleUpdate({ status: e.target.value as TicketStatus })}
                    options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priorité</label>
                  <Select
                    value={editedTicket.priority}
                    onChange={e => handleUpdate({ priority: e.target.value as TicketPriority })}
                    options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigné à</label>
                <Select
                  value={editedTicket.assignedToId || ''}
                  onChange={e => handleUpdate({ assignedToId: e.target.value || undefined })}
                  options={users.filter(u => u.role !== UserRole.CUSTOMER).map(u => ({
                    value: u.id,
                    label: `${u.displayName} (${ROLE_CONFIG[u.role]?.label || u.role})`
                  }))}
                  placeholder="Non assigné"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Contact client amélioré */}
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client
                </h4>
                <div className="space-y-3">
                  {/* Afficher le compte client si disponible */}
                  {ticket.customer && (
                    <div className="flex items-center gap-2 p-2 bg-amber-100/50 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{getInitials(ticket.customer.displayName, ticket.customer.email)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ticket.customer.displayName}</p>
                        <p className="text-[10px] text-amber-600">Compte client</p>
                      </div>
                    </div>
                  )}
                  {ticket.companyName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-gray-900">{ticket.companyName}</span>
                    </div>
                  )}
                  {ticket.contactName && !ticket.customer && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-gray-700">{ticket.contactName}</span>
                    </div>
                  )}
                  {/* Téléphone : priorité au compte client, puis contact manuel */}
                  {(ticket.customer?.phone || ticket.contactPhone) && (
                    <a href={`tel:${ticket.customer?.phone || ticket.contactPhone}`} className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors group">
                      <Phone className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-blue-600 group-hover:underline">{ticket.customer?.phone || ticket.contactPhone}</span>
                      <span className="ml-auto text-xs text-gray-400">Appeler</span>
                    </a>
                  )}
                  {/* Email : priorité au compte client, puis contact manuel - un email par ligne */}
                  {(ticket.customer?.email || ticket.contactEmail) && (
                    <div className="space-y-1">
                      {(ticket.customer?.email || ticket.contactEmail || '').split(/[;,]/).map((email, idx) => {
                        const trimmedEmail = email.trim();
                        if (!trimmedEmail) return null;
                        return (
                          <a key={idx} href={`mailto:${trimmedEmail}`} className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors group">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 group-hover:underline">{trimmedEmail}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {!ticket.customer && !ticket.companyName && !ticket.contactName && <p className="text-sm text-amber-600">Contact non renseigné</p>}
                </div>
              </Card>

              {/* Agent assigné */}
              {assignee && (
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Agent assigné
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">{getInitials(assignee.displayName, assignee.email)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{assignee.displayName}</p>
                      <Badge className={`text-[10px] ${ROLE_CONFIG[assignee.role]?.color}`}>{ROLE_CONFIG[assignee.role]?.label}</Badge>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dates</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Créé</span>
                    <span className="text-gray-900">{formatDateTime(ticket.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mis à jour</span>
                    <span className="text-gray-900">{formatDateTime(ticket.updatedAt)}</span>
                  </div>
                  {ticket.slaDeadline && (
                    <div className={`flex justify-between ${ticket.slaBreached ? 'text-red-600' : ''}`}>
                      <span className="text-gray-500">SLA</span>
                      <span>{formatDateTime(ticket.slaDeadline)}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'messages' && <ChatPanel ticketId={ticket.id} ticket={ticket} initialMessage={draftFromAI} onMessageSent={() => setDraftFromAI('')} />}

        {activeTab === 'ai-assistant' && (
          <AIAssistantPanel
            ticketId={ticket.id}
            ticket={ticket}
            onUseDraft={(draft) => {
              setDraftFromAI(draft);
              setActiveTab('messages');
            }}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsPanel ticketId={ticket.id} attachments={ticket.attachments || []} />
        )}

        {activeTab === 'history' && (
          <div className="max-w-2xl">
            {ticket.history && ticket.history.length > 0 ? (
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
                {ticket.history.map(h => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-5 w-4 h-4 bg-white border-2 border-gray-300 rounded-full" />
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-900">{h.action}</p>
                      {h.field && <p className="text-xs text-gray-500 mt-1">{h.field}: {h.oldValue} → {h.newValue}</p>}
                      <p className="text-xs text-gray-400 mt-2">{formatDateTime(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <History className="w-12 h-12 mx-auto mb-3" />
                <p>Aucun historique disponible</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ============================================
// TICKET DETAIL PAGE (Full page view)
// ============================================

const TicketDetailPage: React.FC = () => {
  const { selectedTicket, setSelectedTicket, setCurrentView, users, setTickets } = useAdmin();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [editedTicket, setEditedTicket] = useState(selectedTicket!);
  const [isSaving, setIsSaving] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(selectedTicket?.attachments?.length || 0);
  const [draftFromAI, setDraftFromAI] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const ticket = selectedTicket!;

  // Agents disponibles pour transfert
  const availableAgents = users.filter(
    u => u.role !== UserRole.CUSTOMER && u.id !== editedTicket?.assignedToId && u.isActive !== false
  );

  const isMyTicket = editedTicket?.assignedToId === user?.id;

  // Charger le compte total des documents
  useEffect(() => {
    if (!ticket) return;
    const loadDocumentsCount = async () => {
      try {
        const messages = await AdminApi.getTicketMessages(ticket.id);
        const messageAttachments = messages.flatMap(m => m.attachments || []);
        const ticketAttachments = ticket.attachments || [];
        const allIds = new Set([
          ...ticketAttachments.map(a => a.id),
          ...messageAttachments.map(a => a.id)
        ]);
        setDocumentsCount(allIds.size);
      } catch (error) {
        console.error('Erreur chargement count documents:', error);
      }
    };
    loadDocumentsCount();
  }, [ticket?.id, ticket?.attachments]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['details', 'messages', 'ai-assistant', 'documents', 'history'];
        setActiveTab(tabs[parseInt(e.key) - 1]);
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && editedTicket?.status !== TicketStatus.RESOLVED) {
        e.preventDefault();
        handleUpdate({ status: TicketStatus.RESOLVED });
      }
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedTicket?.status]);

  const handleBack = () => {
    setSelectedTicket(null);
    setCurrentView('tickets');
  };

  const handleUpdate = async (updates: Partial<Ticket>) => {
    if (!ticket) return;
    setIsSaving(true);
    try {
      const updated = await AdminApi.updateTicket(ticket.id, {
        status: updates.status,
        priority: updates.priority,
        assignedToId: updates.assignedToId,
        tags: updates.tags,
      });
      setEditedTicket(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (error) {
      console.error('Erreur mise à jour:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAgent || !ticket) return;
    try {
      await AdminApi.requestTransfer(ticket.id, selectedAgent, transferReason);
      setShowTransferModal(false);
      setTransferReason('');
      setSelectedAgent('');
      alert('Demande de transfert envoyée avec succès !');
    } catch (error) {
      console.error('Erreur transfert:', error);
      alert('Erreur lors du transfert');
    }
  };

  const handleTakeOver = async () => {
    if (!user) return;
    await handleUpdate({ assignedToId: user.id });
  };

  if (!ticket || !editedTicket) return null;

  const assignee = users.find(u => u.id === editedTicket.assignedToId);
  const ticketAge = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const customerName = ticket.customer?.displayName || ticket.contactName || ticket.companyName || 'Client';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header avec retour */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              <span className="text-sm font-medium">Retour aux tickets</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-mono font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">#{ticket.ticketRef || ticket.ticketNumber}</span>
              <Badge className={`${getStatusColor(editedTicket.status)} text-sm px-3 py-1`}>{STATUS_LABELS[editedTicket.status]}</Badge>
              <Badge className={`${getPriorityColor(editedTicket.priority)} text-sm px-3 py-1`}>{PRIORITY_LABELS[editedTicket.priority]}</Badge>
              <Badge className="bg-gray-100 text-gray-600 text-sm px-3 py-1">{ISSUE_TYPE_LABELS[editedTicket.issueType]}</Badge>
              {ticketAge > 0 && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{ticketAge}j</span>}
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            <div className="flex-1" />
            <SLATimer deadline={ticket.slaDeadline || null} breached={editedTicket.slaBreached || false} />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h1>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {customerName}
              </span>
              {ticket.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {ticket.companyName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDateTime(ticket.createdAt)}
              </span>
            </div>

            {/* Agent assigné */}
            {assignee ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{getInitials(assignee.displayName, assignee.email)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{assignee.displayName}</p>
                  <p className="text-[10px] text-gray-500">{ROLE_CONFIG[assignee.role]?.label}</p>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleTakeOver} className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200">
                <User className="w-4 h-4 mr-1" />
                Prendre en charge
              </Button>
            )}
          </div>

          {/* Barre d'actions rapides */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {editedTicket.status === TicketStatus.OPEN && (
              <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.IN_PROGRESS })} className="bg-blue-600 hover:bg-blue-700">
                <PlayCircle className="w-4 h-4 mr-1" />Démarrer
              </Button>
            )}
            {editedTicket.status === TicketStatus.IN_PROGRESS && (
              <>
                <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.RESOLVED })} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-1" />Résoudre <span className="ml-1 text-xs opacity-70">(R)</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.WAITING_CUSTOMER })} className="text-yellow-700 border-yellow-300 hover:bg-yellow-50">
                  <Clock className="w-4 h-4 mr-1" />Attente client
                </Button>
              </>
            )}
            {editedTicket.status === TicketStatus.WAITING_CUSTOMER && (
              <Button variant="primary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.IN_PROGRESS })} className="bg-blue-600 hover:bg-blue-700">
                <PlayCircle className="w-4 h-4 mr-1" />Reprendre
              </Button>
            )}
            {editedTicket.status === TicketStatus.RESOLVED && (
              <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.CLOSED })} className="text-gray-700">
                <XCircle className="w-4 h-4 mr-1" />Clôturer
              </Button>
            )}
            {(editedTicket.status === TicketStatus.RESOLVED || editedTicket.status === TicketStatus.CLOSED) && (
              <Button variant="secondary" size="sm" onClick={() => handleUpdate({ status: TicketStatus.REOPENED })} className="text-orange-700 border-orange-300 hover:bg-orange-50">
                <RefreshCw className="w-4 h-4 mr-1" />Réouvrir
              </Button>
            )}

            <div className="h-6 w-px bg-gray-300 mx-1" />

            {editedTicket.status !== TicketStatus.ESCALATED && editedTicket.status !== TicketStatus.CLOSED && (
              <Button variant="ghost" size="sm" onClick={() => handleUpdate({ status: TicketStatus.ESCALATED })} className="text-red-600 hover:bg-red-50">
                <AlertTriangle className="w-4 h-4 mr-1" />Escalader
              </Button>
            )}

            {isMyTicket && availableAgents.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowTransferModal(true)} className="text-blue-600 hover:bg-blue-50">
                <ArrowUpRight className="w-4 h-4 mr-1" />Transférer
              </Button>
            )}

            <div className="flex-1" />

            {/* Priorité rapide */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleUpdate({ priority: p })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    editedTicket.priority === p
                      ? getPriorityColor(p)
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  title={PRIORITY_LABELS[p]}
                >
                  {p === 'URGENT' ? '🔴' : p === 'HIGH' ? '🟠' : p === 'MEDIUM' ? '🔵' : '⚪'}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-gray-400 hidden lg:block">
              Ctrl+1-5: onglets • R: résoudre • E: escalader • Esc: retour
            </span>
          </div>
        </div>
      </div>

      {/* Modal de transfert */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              Transférer le ticket
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transférer à</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.displayName} ({ROLE_CONFIG[agent.role]?.label})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Raison (optionnel)</label>
                <textarea
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Pourquoi transférez-vous ce ticket ?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="primary" className="flex-1" onClick={handleTransfer} disabled={!selectedAgent}>
                Envoyer la demande
              </Button>
              <Button variant="secondary" onClick={() => setShowTransferModal(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      <QuickActions ticket={editedTicket} onUpdate={handleUpdate} />

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden flex">
        {/* Zone principale */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4">
            <Tabs
              tabs={[
                { id: 'messages', label: 'Conversation', icon: <MessageSquare className="w-4 h-4" /> },
                { id: 'details', label: 'Détails', icon: <FileText className="w-4 h-4" /> },
                { id: 'ai-assistant', label: 'Assistant IA', icon: <Brain className="w-4 h-4" /> },
                { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" />, count: documentsCount },
                { id: 'history', label: 'Historique', icon: <History className="w-4 h-4" /> },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'messages' && (
              <ChatPanel ticketId={ticket.id} ticket={ticket} initialMessage={draftFromAI} onMessageSent={() => setDraftFromAI('')} />
            )}

            {activeTab === 'details' && (
              <div className="grid grid-cols-3 gap-6 max-w-5xl">
                <div className="col-span-2 space-y-5">
                  {/* Timeline mini du statut */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Progression du ticket
                    </h4>
                    <div className="flex items-center gap-2">
                      {[
                        { status: 'OPEN', label: 'Ouvert', icon: <AlertCircle className="w-4 h-4" /> },
                        { status: 'IN_PROGRESS', label: 'En cours', icon: <PlayCircle className="w-4 h-4" /> },
                        { status: 'WAITING_CUSTOMER', label: 'Attente', icon: <Clock className="w-4 h-4" /> },
                        { status: 'RESOLVED', label: 'Résolu', icon: <CheckCircle className="w-4 h-4" /> },
                        { status: 'CLOSED', label: 'Fermé', icon: <XCircle className="w-4 h-4" /> },
                      ].map((step, i, arr) => {
                        const statusOrder = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
                        const currentIndex = statusOrder.indexOf(editedTicket.status);
                        const stepIndex = statusOrder.indexOf(step.status);
                        const isPast = stepIndex < currentIndex || (editedTicket.status === 'REOPENED' && step.status === 'OPEN');
                        const isCurrent = step.status === editedTicket.status || (editedTicket.status === 'REOPENED' && step.status === 'OPEN');

                        return (
                          <React.Fragment key={step.status}>
                            <div
                              className={`flex flex-col items-center gap-1 ${
                                isCurrent ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-300'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                                isPast ? 'bg-green-500 text-white' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {isPast && !isCurrent ? <CheckCircle className="w-4 h-4" /> : step.icon}
                              </div>
                              <span className="text-[10px] font-medium">{step.label}</span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`flex-1 h-1 rounded ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {editedTicket.status === 'ESCALATED' && (
                      <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Ticket escaladé - Attention requise</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description du problème</label>
                    <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description || 'Aucune description fournie.'}</p>
                    </div>
                  </div>

                  {/* Équipement */}
                  {(ticket.serialNumber || ticket.equipmentModel || ticket.equipmentBrand || ticket.errorCode) && (
                    <Card className="p-4 bg-gradient-to-r from-slate-50 to-gray-50">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Informations équipement
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {ticket.equipmentBrand && (
                          <div>
                            <span className="text-xs text-gray-500">Marque</span>
                            <p className="font-medium text-gray-900">{ticket.equipmentBrand}</p>
                          </div>
                        )}
                        {ticket.equipmentModel && (
                          <div>
                            <span className="text-xs text-gray-500">Modèle</span>
                            <p className="font-medium text-gray-900">{ticket.equipmentModel}</p>
                          </div>
                        )}
                        {ticket.serialNumber && (
                          <div>
                            <span className="text-xs text-gray-500">N° de série</span>
                            <p className="font-mono font-medium text-gray-900">{ticket.serialNumber}</p>
                          </div>
                        )}
                        {ticket.errorCode && (
                          <div>
                            <span className="text-xs text-gray-500">Code erreur</span>
                            <p className="font-mono font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">{ticket.errorCode}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Gestion du ticket */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</label>
                      <Select
                        value={editedTicket.status}
                        onChange={e => handleUpdate({ status: e.target.value as TicketStatus })}
                        options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priorité</label>
                      <Select
                        value={editedTicket.priority}
                        onChange={e => handleUpdate({ priority: e.target.value as TicketPriority })}
                        options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigné à</label>
                    <Select
                      value={editedTicket.assignedToId || ''}
                      onChange={e => handleUpdate({ assignedToId: e.target.value || undefined })}
                      options={users.filter(u => u.role !== UserRole.CUSTOMER).map(u => ({
                        value: u.id,
                        label: `${u.displayName} (${ROLE_CONFIG[u.role]?.label || u.role})`
                      }))}
                      placeholder="Non assigné"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Contact client amélioré */}
                  <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Client
                    </h4>
                    <div className="space-y-3">
                      {/* Afficher le compte client si disponible */}
                      {ticket.customer && (
                        <div className="flex items-center gap-2 p-2 bg-amber-100/50 rounded-lg">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{getInitials(ticket.customer.displayName, ticket.customer.email)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{ticket.customer.displayName}</p>
                            <p className="text-[10px] text-amber-600">Compte client</p>
                          </div>
                        </div>
                      )}
                      {ticket.companyName && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-gray-900">{ticket.companyName}</span>
                        </div>
                      )}
                      {ticket.contactName && !ticket.customer && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-gray-700">{ticket.contactName}</span>
                        </div>
                      )}
                      {/* Téléphone : priorité au compte client, puis contact manuel */}
                      {(ticket.customer?.phone || ticket.contactPhone) && (
                        <a href={`tel:${ticket.customer?.phone || ticket.contactPhone}`} className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors group">
                          <Phone className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-blue-600 group-hover:underline">{ticket.customer?.phone || ticket.contactPhone}</span>
                          <span className="ml-auto text-xs text-gray-400">Appeler</span>
                        </a>
                      )}
                      {/* Email : priorité au compte client, puis contact manuel - un email par ligne */}
                      {(ticket.customer?.email || ticket.contactEmail) && (
                        <div className="space-y-1">
                          {(ticket.customer?.email || ticket.contactEmail || '').split(/[;,]/).map((email, idx) => {
                            const trimmedEmail = email.trim();
                            if (!trimmedEmail) return null;
                            return (
                              <a key={idx} href={`mailto:${trimmedEmail}`} className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors group">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-blue-600 group-hover:underline">{trimmedEmail}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {!ticket.customer && !ticket.companyName && !ticket.contactName && <p className="text-sm text-amber-600">Contact non renseigné</p>}
                    </div>
                  </Card>

                  {/* Agent assigné */}
                  {assignee && (
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Headphones className="w-4 h-4" />
                        Agent assigné
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">{getInitials(assignee.displayName, assignee.email)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{assignee.displayName}</p>
                          <Badge className={`text-[10px] ${ROLE_CONFIG[assignee.role]?.color}`}>{ROLE_CONFIG[assignee.role]?.label}</Badge>
                        </div>
                      </div>
                    </Card>
                  )}

                  <Card className="p-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dates</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Créé</span>
                        <span className="text-gray-900">{formatDateTime(ticket.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Mis à jour</span>
                        <span className="text-gray-900">{formatDateTime(ticket.updatedAt)}</span>
                      </div>
                      {ticket.slaDeadline && (
                        <div className={`flex justify-between ${ticket.slaBreached ? 'text-red-600' : ''}`}>
                          <span className="text-gray-500">SLA</span>
                          <span>{formatDateTime(ticket.slaDeadline)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'ai-assistant' && (
              <AIAssistantPanel
                ticketId={ticket.id}
                ticket={ticket}
                onUseDraft={(draft) => {
                  setDraftFromAI(draft);
                  setActiveTab('messages');
                }}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsPanel ticketId={ticket.id} attachments={ticket.attachments || []} />
            )}

            {activeTab === 'history' && (
              <div className="max-w-2xl">
                {ticket.history && ticket.history.length > 0 ? (
                  <div className="relative pl-8 space-y-6">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
                    {ticket.history.map(h => (
                      <div key={h.id} className="relative">
                        <div className="absolute -left-5 w-4 h-4 bg-white border-2 border-gray-300 rounded-full" />
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm font-medium text-gray-900">{h.action}</p>
                          {h.field && <p className="text-xs text-gray-500 mt-1">{h.field}: {h.oldValue} → {h.newValue}</p>}
                          <p className="text-xs text-gray-400 mt-2">{formatDateTime(h.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <History className="w-12 h-12 mx-auto mb-3" />
                    <p>Aucun historique disponible</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DASHBOARD VIEW
// ============================================

// ============================================
// AI AUTOBOT PANEL
// ============================================

const AIAutoBotPanel: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState({
    autoRespond: true,
    maxResponsesPerTicket: 3,
    escalateAfter: 2,
    workingHoursOnly: false,
    respondToTypes: ['TECHNICAL', 'DELIVERY', 'BILLING', 'OTHER'] as string[],
  });

  // Stats réelles depuis l'API
  const [aiStats, setAiStats] = useState({
    ticketsHandled: 0,
    ticketsResolved: 0,
    avgResponseTime: '< 1 min',
    satisfactionRate: 0,
    currentlyActive: 0,
  });

  // Conversations réelles depuis l'API
  const [recentAIConversations, setRecentAIConversations] = useState<Array<{
    id: string;
    ticketId: string;
    ticketNumber: number;
    ticketTitle: string;
    status: 'resolved' | 'escalated' | 'active';
    messages: number;
    resolvedWithoutHuman: boolean;
    lastActivity: string;
  }>>([]);

  // Charger les données au montage
  useEffect(() => {
    const loadAutoBotData = async () => {
      setIsLoading(true);
      try {
        const [statsData, conversationsData] = await Promise.all([
          AdminApi.getAutoBotStats(),
          AdminApi.getAutoBotConversations(10),
        ]);
        setAiStats(statsData);
        setRecentAIConversations(conversationsData);
      } catch (error) {
        console.error('Erreur chargement données AutoBot:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAutoBotData();
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Assistant IA AutoBot
                {isEnabled && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
              </h2>
              <p className="text-sm text-white/80">Résolution automatique des tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${isEnabled ? 'bg-green-400' : 'bg-white/30'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'translate-x-7' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
        {isLoading ? (
          <div className="col-span-5 flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <span className="ml-2 text-sm text-gray-500">Chargement des statistiques...</span>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{aiStats.ticketsHandled}</p>
              <p className="text-xs text-gray-500">Tickets traités</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{aiStats.ticketsResolved}</p>
              <p className="text-xs text-gray-500">Résolus par IA</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{aiStats.avgResponseTime}</p>
              <p className="text-xs text-gray-500">Temps réponse</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{aiStats.satisfactionRate}%</p>
              <p className="text-xs text-gray-500">Taux résolution</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{aiStats.currentlyActive}</p>
              <p className="text-xs text-gray-500">Conv. actives</p>
            </div>
          </>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-purple-50 border-b border-purple-100 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cog className="w-4 h-4" />
            Paramètres de l'IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Réponse auto</label>
                <button
                  onClick={() => setAiSettings(s => ({ ...s, autoRespond: !s.autoRespond }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${aiSettings.autoRespond ? 'bg-purple-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${aiSettings.autoRespond ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500">Répondre automatiquement aux nouveaux tickets</p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <label className="text-sm font-medium text-gray-700 block mb-2">Max réponses/ticket</label>
              <select
                value={aiSettings.maxResponsesPerTicket}
                onChange={(e) => setAiSettings(s => ({ ...s, maxResponsesPerTicket: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={1}>1 réponse</option>
                <option value={2}>2 réponses</option>
                <option value={3}>3 réponses</option>
                <option value={5}>5 réponses</option>
                <option value={10}>10 réponses</option>
              </select>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <label className="text-sm font-medium text-gray-700 block mb-2">Escalader après</label>
              <select
                value={aiSettings.escalateAfter}
                onChange={(e) => setAiSettings(s => ({ ...s, escalateAfter: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={1}>1 échange</option>
                <option value={2}>2 échanges</option>
                <option value={3}>3 échanges</option>
                <option value={5}>5 échanges</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Transférer à un humain si non résolu</p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Heures ouvrées</label>
                <button
                  onClick={() => setAiSettings(s => ({ ...s, workingHoursOnly: !s.workingHoursOnly }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${aiSettings.workingHoursOnly ? 'bg-purple-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${aiSettings.workingHoursOnly ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500">Actif uniquement 9h-18h</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent AI Conversations */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Conversations IA récentes</h3>
          <span className="text-xs text-gray-500">{recentAIConversations.length} ticket{recentAIConversations.length > 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              <span className="ml-2 text-sm text-gray-500">Chargement...</span>
            </div>
          ) : recentAIConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucune conversation IA pour le moment</p>
              <p className="text-xs text-gray-400 mt-1">Les conversations apparaîtront ici lorsque l'IA répondra aux tickets</p>
            </div>
          ) : (
            recentAIConversations.map(conv => (
              <div key={conv.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  conv.status === 'resolved' ? 'bg-green-100' :
                  conv.status === 'escalated' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  {conv.status === 'resolved' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                   conv.status === 'escalated' ? <ArrowUpRight className="w-5 h-5 text-orange-600" /> :
                   <MessageSquare className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">Ticket #{conv.ticketNumber}</span>
                    {conv.resolvedWithoutHuman && (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Résolu sans humain
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate" title={conv.ticketTitle}>
                    {conv.messages} message{conv.messages > 1 ? 's' : ''} IA • {conv.ticketTitle}
                  </p>
                </div>
                <Badge className={
                  conv.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  conv.status === 'escalated' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {conv.status === 'resolved' ? 'Résolu' :
                   conv.status === 'escalated' ? 'Escaladé' : 'En cours'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-t">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Comment ça fonctionne</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">1</div>
            <div>
              <p className="text-xs font-medium text-gray-800">Nouveau ticket</p>
              <p className="text-xs text-gray-500">L'IA analyse la demande</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">2</div>
            <div>
              <p className="text-xs font-medium text-gray-800">Réponse auto</p>
              <p className="text-xs text-gray-500">Propose une solution</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">3</div>
            <div>
              <p className="text-xs font-medium text-gray-800">Suivi client</p>
              <p className="text-xs text-gray-500">Continue l'échange</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">4</div>
            <div>
              <p className="text-xs font-medium text-gray-800">Escalade si besoin</p>
              <p className="text-xs text-gray-500">Transfère à un agent</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const DashboardView: React.FC = () => {
  const { tickets, stats, setShowAIAssistant, setCurrentView, setSelectedTicket, autoAssignTickets, users } = useAdmin();
  const { user } = useAuth();
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  // Vérifier si l'utilisateur est ADMIN ou SUPERVISOR (comparaison string pour compatibilité API)
  const isManagerRole = ['ADMIN', 'SUPERVISOR'].includes(user?.role as string);

  const openCount = stats?.byStatus?.[TicketStatus.OPEN] || 0;
  const inProgressCount = stats?.byStatus?.[TicketStatus.IN_PROGRESS] || 0;
  const breachedCount = stats?.slaBreached || 0;
  const unassignedCount = tickets.filter(t => !t.assignedToId && (t.status === TicketStatus.OPEN || t.status === TicketStatus.REOPENED)).length;

  // Tickets actifs = tous sauf RESOLVED et CLOSED (travail restant)
  const activeTicketsCount = (stats?.total || 0)
    - (stats?.byStatus?.[TicketStatus.RESOLVED] || 0)
    - (stats?.byStatus?.[TicketStatus.CLOSED] || 0);

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    await autoAssignTickets();
    setIsAutoAssigning(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord SAV</h1>
          <p className="text-gray-500">Vue d'ensemble en temps réel</p>
        </div>
        <div className="flex gap-2">
          {unassignedCount > 0 && (
            <Button variant="primary" size="sm" onClick={handleAutoAssign} disabled={isAutoAssigning} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
              {isAutoAssigning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Auto-assigner ({unassignedCount})
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowAIAssistant(true)}>
            <Sparkles className="w-4 h-4 mr-2" />Assistant IA
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCurrentView('tickets')}>
            <Plus className="w-4 h-4 mr-2" />Nouveau ticket
          </Button>
        </div>
      </div>

      {/* Alerte tickets non assignés */}
      {unassignedCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-800">{unassignedCount} ticket{unassignedCount > 1 ? 's' : ''} non assigné{unassignedCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-orange-600">Cliquez sur "Auto-assigner" pour les distribuer automatiquement</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleAutoAssign} disabled={isAutoAssigning} className="text-orange-700 hover:bg-orange-100">
            {isAutoAssigning ? 'Assignation...' : 'Assigner maintenant'}
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Tickets actifs" value={activeTicketsCount} icon={<TicketIcon className="w-6 h-6" />} color="purple" onClick={() => setCurrentView('tickets')} subtitle="À traiter" />
        <KPICard title="Tickets ouverts" value={openCount} icon={<Clock className="w-6 h-6" />} color="blue" subtitle="En attente de traitement" />
        <KPICard title="En cours" value={inProgressCount} icon={<Activity className="w-6 h-6" />} color="yellow" subtitle="Actuellement traités" />
        <KPICard title="SLA dépassés" value={breachedCount} icon={<AlertTriangle className="w-6 h-6" />} color="red" subtitle="Nécessitent attention" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets récents */}
        <Card className="lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tickets récents</h2>
            <Button variant="ghost" size="xs" onClick={() => setCurrentView('tickets')}>Voir tout<ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
          <div className="divide-y divide-gray-100">
            {tickets.slice(0, 5).map(t => (
              <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedTicket(t); setCurrentView('tickets'); }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono font-semibold text-blue-600">#{t.ticketRef || t.ticketNumber}</span>
                      <Badge className={getPriorityColor(t.priority)}>{PRIORITY_LABELS[t.priority]}</Badge>
                      {!t.assignedToId && <Badge className="bg-orange-100 text-orange-700 text-[10px]">Non assigné</Badge>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.customer?.displayName || t.companyName || t.contactName || 'Client'} • {formatDateTime(t.createdAt)}</p>
                  </div>
                  <Badge className={getStatusColor(t.status)}>{STATUS_LABELS[t.status]}</Badge>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="p-12 text-center">
                <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun ticket</p>
              </div>
            )}
          </div>
        </Card>

        {/* Stats & Team */}
        <div className="space-y-6">
          {/* Par priorité */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Par priorité</h3>
            <div className="space-y-3">
              {Object.entries(PRIORITY_LABELS).map(([priority, label]) => {
                const count = stats?.byPriority?.[priority as TicketPriority] || 0;
                const total = stats?.total || 1;
                const percentage = (count / total) * 100;
                return (
                  <div key={priority}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        priority === 'URGENT' ? 'bg-red-500' :
                        priority === 'HIGH' ? 'bg-orange-500' :
                        priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Équipe - Visible uniquement pour ADMIN et SUPERVISOR */}
          {isManagerRole && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Équipe disponible</h3>
              <div className="space-y-3">
                {users.filter(u => u.role !== UserRole.CUSTOMER).slice(0, 4).map(u => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">{getInitials(u.displayName, u.email)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{u.displayName}</p>
                      <p className="text-xs text-gray-500">{u._count?.assignedTickets || 0} tickets</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* AI AutoBot Panel - Visible uniquement pour ADMIN et SUPERVISOR */}
      {isManagerRole && <AIAutoBotPanel />}
    </div>
  );
};

// ============================================
// TICKET QUICK ACTIONS COMPONENT
// ============================================

const TicketQuickActions: React.FC<{
  ticket: Ticket;
  onUpdate: (updated: Ticket) => void;
  onView: () => void;
}> = ({ ticket, onUpdate, onView }) => {
  const { users } = useAdmin();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Agents disponibles pour le transfert (exclure le propriétaire actuel et soi-même)
  const availableAgents = users.filter(
    u => u.role !== UserRole.CUSTOMER && u.id !== ticket.assignedToId && u.id !== user?.id && u.isActive !== false
  );

  // Vérifier si le ticket m'appartient (pour autoriser le transfert)
  const isMyTicket = ticket.assignedToId === user?.id;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowTransferMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const updated = await AdminApi.updateTicket(ticket.id, { status: newStatus });
      onUpdate(updated);
      setShowMenu(false);
    } catch (error) {
      console.error('Erreur changement statut:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTransfer = async (toAgentId: string) => {
    if (isTransferring) return;
    setIsTransferring(true);
    try {
      await AdminApi.requestTransfer(ticket.id, toAgentId);
      setShowTransferMenu(false);
      setShowMenu(false);
      alert('Demande de transfert envoyée !');
    } catch (error) {
      console.error('Erreur transfert:', error);
      alert('Erreur lors du transfert');
    } finally {
      setIsTransferring(false);
    }
  };

  const quickActions = [
    { status: TicketStatus.IN_PROGRESS, label: 'Mettre en cours', icon: <PlayCircle className="w-4 h-4" />, color: 'text-blue-600', show: ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.REOPENED },
    { status: TicketStatus.WAITING_CUSTOMER, label: 'Attente client', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600', show: ticket.status === TicketStatus.IN_PROGRESS },
    { status: TicketStatus.RESOLVED, label: 'Résoudre', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', show: ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED },
    { status: TicketStatus.CLOSED, label: 'Fermer', icon: <XCircle className="w-4 h-4" />, color: 'text-gray-600', show: ticket.status === TicketStatus.RESOLVED },
    { status: TicketStatus.ESCALATED, label: 'Escalader', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', show: ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.ESCALATED },
    { status: TicketStatus.REOPENED, label: 'Réouvrir', icon: <RefreshCw className="w-4 h-4" />, color: 'text-orange-600', show: ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED },
  ];

  const availableActions = quickActions.filter(a => a.show);

  return (
    <div className="relative flex items-center gap-1" ref={menuRef}>
      <Button variant="ghost" size="xs" onClick={onView} title="Voir détails"><Eye className="w-4 h-4" /></Button>

      {/* Quick action buttons for common operations */}
      {ticket.status === TicketStatus.OPEN && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => handleStatusChange(TicketStatus.IN_PROGRESS)}
          disabled={isUpdating}
          className="text-blue-600 hover:bg-blue-50"
          title="Mettre en cours"
        >
          <PlayCircle className={`w-4 h-4 ${isUpdating ? 'animate-pulse' : ''}`} />
        </Button>
      )}
      {ticket.status === TicketStatus.IN_PROGRESS && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => handleStatusChange(TicketStatus.RESOLVED)}
          disabled={isUpdating}
          className="text-green-600 hover:bg-green-50"
          title="Résoudre"
        >
          <CheckCircle className={`w-4 h-4 ${isUpdating ? 'animate-pulse' : ''}`} />
        </Button>
      )}

      {/* More actions dropdown */}
      <Button variant="ghost" size="xs" onClick={() => setShowMenu(!showMenu)} title="Plus d'actions">
        <MoreHorizontal className="w-4 h-4" />
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Changer statut</p>
          </div>
          {availableActions.map(action => (
            <button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isUpdating}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${action.color} disabled:opacity-50`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          {availableActions.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Aucune action disponible</p>
          )}

          {/* Option de transfert */}
          {isMyTicket && availableAgents.length > 0 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase">Transférer à</p>
              </div>
              {showTransferMenu ? (
                <div className="max-h-40 overflow-y-auto">
                  {availableAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => handleTransfer(agent.id)}
                      disabled={isTransferring}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 text-gray-700 disabled:opacity-50"
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-blue-600">{getInitials(agent.displayName, agent.email)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{agent.displayName}</p>
                        <p className="text-[10px] text-gray-400">{agent.role}</p>
                      </div>
                      {isTransferring && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowTransferMenu(true)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Transférer ce ticket...
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// PAGINATION COMPONENT
// ============================================

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
  const pages = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (currentPage > 3) result.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        result.push(i);
      }
      if (currentPage < totalPages - 2) result.push('ellipsis');
      result.push(totalPages);
    }
    return result;
  }, [currentPage, totalPages]);

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Affichage <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> sur <span className="font-medium">{totalItems}</span>
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        {pages.map((page, i) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================
// DATE RANGE FILTER COMPONENT
// ============================================

const DateRangeFilter: React.FC<{
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}> = ({ dateFrom, dateTo, onChange }) => {
  const presets = [
    { label: "Aujourd'hui", getValue: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
    { label: '7 derniers jours', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 7); return [from.toISOString().split('T')[0], to.toISOString().split('T')[0]]; } },
    { label: 'Ce mois', getValue: () => { const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth(), 1); return [from.toISOString().split('T')[0], d.toISOString().split('T')[0]]; } },
    { label: 'Mois dernier', getValue: () => { const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth() - 1, 1); const to = new Date(d.getFullYear(), d.getMonth(), 0); return [from.toISOString().split('T')[0], to.toISOString().split('T')[0]]; } },
    { label: 'Cette année', getValue: () => { const d = new Date(); const from = new Date(d.getFullYear(), 0, 1); return [from.toISOString().split('T')[0], d.toISOString().split('T')[0]]; } },
  ];

  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange(e.target.value, dateTo)}
          className="text-sm border-none focus:ring-0 p-0 w-32"
          placeholder="Du"
        />
        <span className="text-gray-400">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onChange(dateFrom, e.target.value)}
          className="text-sm border-none focus:ring-0 p-0 w-32"
          placeholder="Au"
        />
      </div>
      <button
        onClick={() => setShowPresets(!showPresets)}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        title="Périodes prédéfinies"
      >
        <Clock className="w-4 h-4" />
      </button>
      {(dateFrom || dateTo) && (
        <button
          onClick={() => onChange('', '')}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
          title="Effacer les dates"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {showPresets && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => { const [from, to] = p.getValue(); onChange(from, to); setShowPresets(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// TICKETS VIEW
// ============================================

const TicketsView: React.FC = () => {
  const { tickets, setTickets, selectedTicket, setSelectedTicket, users, refreshData, autoAssignTickets, unreadByTicket, setCurrentView } = useAdmin();
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', assignedToId: '', dateFrom: '', dateTo: '', issueType: '' });
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());

  // Listen for filter changes from sidebar
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent<{ status: string }>) => {
      const { status } = event.detail;
      setFilters(f => ({ ...f, status }));
      setCurrentPage(1);
    };
    window.addEventListener('setTicketFilter', handleFilterChange as EventListener);
    return () => window.removeEventListener('setTicketFilter', handleFilterChange as EventListener);
  }, []);

  // Gestion de la sélection
  const toggleTicketSelection = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicketIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTicketIds.size === paginatedTickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(paginatedTickets.map(t => t.id)));
    }
  };

  const clearSelection = () => setSelectedTicketIds(new Set());

  // États pour les dropdowns d'actions groupées
  const [showBulkAssignDropdown, setShowBulkAssignDropdown] = useState(false);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  const [showBulkPriorityDropdown, setShowBulkPriorityDropdown] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Actions groupées
  const handleBulkAssign = async (agentId: string | null) => {
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedTicketIds).map(ticketId =>
        AdminApi.updateTicket(ticketId, { assignedToId: agentId })
      );
      await Promise.all(promises);
      await refreshData();
      clearSelection();
    } catch (error) {
      console.error('Erreur assignation groupée:', error);
    } finally {
      setIsBulkUpdating(false);
      setShowBulkAssignDropdown(false);
    }
  };

  const handleBulkStatus = async (status: TicketStatus) => {
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedTicketIds).map(ticketId =>
        AdminApi.updateTicket(ticketId, { status })
      );
      await Promise.all(promises);
      await refreshData();
      clearSelection();
    } catch (error) {
      console.error('Erreur changement statut groupé:', error);
    } finally {
      setIsBulkUpdating(false);
      setShowBulkStatusDropdown(false);
    }
  };

  const handleBulkPriority = async (priority: TicketPriority) => {
    setIsBulkUpdating(true);
    try {
      const promises = Array.from(selectedTicketIds).map(ticketId =>
        AdminApi.updateTicket(ticketId, { priority })
      );
      await Promise.all(promises);
      await refreshData();
      clearSelection();
    } catch (error) {
      console.error('Erreur changement priorité groupée:', error);
    } finally {
      setIsBulkUpdating(false);
      setShowBulkPriorityDropdown(false);
    }
  };

  // Ouvrir un ticket dans la modal
  const openTicketModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  // Ref pour suivre le statut précédent
  const prevStatusRef = useRef(filters.status);

  // Recharger les tickets quand on change de filtre de statut
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = filters.status;
    prevStatusRef.current = currentStatus;

    const loadFilteredTickets = async () => {
      // Si on filtre par RESOLVED ou CLOSED, charger ces tickets spécifiquement
      if (currentStatus === TicketStatus.RESOLVED || currentStatus === TicketStatus.CLOSED) {
        setIsLoadingFiltered(true);
        try {
          const res = await AdminApi.getTickets({ limit: 100, status: currentStatus as TicketStatus });
          setTickets(res.data || []);
        } catch (error) {
          console.error('Erreur chargement tickets filtrés:', error);
        } finally {
          setIsLoadingFiltered(false);
        }
      }
      // Si on revient de RESOLVED/CLOSED vers un autre filtre ou "tous", recharger les tickets actifs
      else if (prevStatus === TicketStatus.RESOLVED || prevStatus === TicketStatus.CLOSED) {
        refreshData();
      }
    };
    loadFilteredTickets();
  }, [filters.status]);

  const filteredTickets = useMemo(() => tickets.filter(t => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.assignedToId && t.assignedToId !== filters.assignedToId) return false;
    if (filters.issueType && t.issueType !== filters.issueType) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !(t.customer?.displayName?.toLowerCase().includes(filters.search.toLowerCase())) &&
        !(t.contactName?.toLowerCase().includes(filters.search.toLowerCase())) &&
        !(t.companyName?.toLowerCase().includes(filters.search.toLowerCase()))) return false;
    if (filters.dateFrom) {
      const ticketDate = new Date(t.createdAt).setHours(0,0,0,0);
      const fromDate = new Date(filters.dateFrom).setHours(0,0,0,0);
      if (ticketDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const ticketDate = new Date(t.createdAt).setHours(23,59,59,999);
      const toDate = new Date(filters.dateTo).setHours(23,59,59,999);
      if (ticketDate > toDate) return false;
    }
    return true;
  }), [tickets, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  const unassignedCount = tickets.filter(t => !t.assignedToId && (t.status === TicketStatus.OPEN || t.status === TicketStatus.REOPENED)).length;
  const activeFiltersCount = [filters.status, filters.priority, filters.assignedToId, filters.issueType, filters.dateFrom, filters.dateTo].filter(Boolean).length;

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    await autoAssignTickets();
    setIsAutoAssigning(false);
  };

  const handleTicketUpdate = (updated: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTicket(null);
  };

  const resetFilters = () => {
    setFilters({ status: '', priority: '', search: '', assignedToId: '', dateFrom: '', dateTo: '', issueType: '' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tickets SAV</h1>
            <p className="text-sm text-gray-500">{filteredTickets.length} ticket{filteredTickets.length > 1 ? 's' : ''} {activeFiltersCount > 0 && <span className="text-blue-600">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})</span>}</p>
          </div>
          <div className="flex gap-2">
            {unassignedCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleAutoAssign} disabled={isAutoAssigning} className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200 hover:from-yellow-200 hover:to-orange-200">
                {isAutoAssigning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Auto-assigner ({unassignedCount})
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={refreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />Actualiser
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />Nouveau
            </Button>
          </div>
        </div>

        {/* Filtres principaux */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Input placeholder="Rechercher titre, client..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} icon={<Search className="w-4 h-4" />} className="w-full sm:w-64" />
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} placeholder="Tous statuts" />
          <Select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} placeholder="Toutes priorités" />
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showAdvancedFilters || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Plus de filtres
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
            )}
          </button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="w-4 h-4 mr-1" />Réinitialiser
            </Button>
          )}
        </div>

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Agent assigné</label>
                <Select value={filters.assignedToId} onChange={e => setFilters(f => ({ ...f, assignedToId: e.target.value }))} options={users.filter(u => u.role !== UserRole.CUSTOMER).map(u => ({ value: u.id, label: u.displayName }))} placeholder="Tous agents" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type de problème</label>
                <Select value={filters.issueType} onChange={e => setFilters(f => ({ ...f, issueType: e.target.value }))} options={Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} placeholder="Tous types" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Période de création</label>
                <DateRangeFilter
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onChange={(from, to) => setFilters(f => ({ ...f, dateFrom: from, dateTo: to }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'actions groupées */}
      {selectedTicketIds.size > 0 && (
        <div className="mx-4 mb-2 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <span className="font-medium">{selectedTicketIds.size} ticket{selectedTicketIds.size > 1 ? 's' : ''} sélectionné{selectedTicketIds.size > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dropdown Assigner */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => { setShowBulkAssignDropdown(!showBulkAssignDropdown); setShowBulkStatusDropdown(false); setShowBulkPriorityDropdown(false); }}
                disabled={isBulkUpdating}
              >
                <UserPlus className="w-4 h-4 mr-1" />Assigner
              </Button>
              {showBulkAssignDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border z-50 py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleBulkAssign(null)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-gray-600"
                  >
                    Non assigné
                  </button>
                  {users.filter(u => ['ADMIN', 'SUPERVISOR', 'AGENT'].includes(u.role)).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => handleBulkAssign(agent.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                        {agent.displayName.charAt(0)}
                      </div>
                      <span className="text-gray-800">{agent.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Statut */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => { setShowBulkStatusDropdown(!showBulkStatusDropdown); setShowBulkAssignDropdown(false); setShowBulkPriorityDropdown(false); }}
                disabled={isBulkUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-1" />Statut
              </Button>
              {showBulkStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-xl border z-50 py-1">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatus(status as TicketStatus)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Badge className={getStatusColor(status as TicketStatus)}>{label}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Priorité */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => { setShowBulkPriorityDropdown(!showBulkPriorityDropdown); setShowBulkAssignDropdown(false); setShowBulkStatusDropdown(false); }}
                disabled={isBulkUpdating}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />Priorité
              </Button>
              {showBulkPriorityDropdown && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-white rounded-lg shadow-xl border z-50 py-1">
                  {Object.entries(PRIORITY_LABELS).map(([priority, label]) => (
                    <button
                      key={priority}
                      onClick={() => handleBulkPriority(priority as TicketPriority)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Badge className={getPriorityColor(priority as TicketPriority)}>{label}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton fermer */}
            <button
              onClick={clearSelection}
              className="ml-2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
              disabled={isBulkUpdating}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          {isBulkUpdating && (
            <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={paginatedTickets.length > 0 && selectedTicketIds.size === paginatedTickets.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priorité</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SLA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigné à</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedTickets.map(t => {
                  const assignee = users.find(u => u.id === t.assignedToId);
                  const unreadCount = unreadByTicket.get(t.id) || 0;
                  const isSelected = selectedTicketIds.has(t.id);
                  const clientName = t.customer?.displayName || t.companyName || t.contactName;
                  const clientEmail = t.customer?.email || t.contactEmail;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''} ${unreadCount > 0 ? 'bg-blue-50/30' : ''}`}
                      onClick={() => openTicketModal(t)}
                    >
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => toggleTicketSelection(t.id, e)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-blue-600">#{t.ticketRef || t.ticketNumber}</span>
                          {unreadCount > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded-full animate-pulse">
                              <Bell className="w-3 h-3" />
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-xs mt-1">{t.title}</p>
                        <p className="text-xs text-gray-400">{ISSUE_TYPE_LABELS[t.issueType]} • {formatDateTime(t.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {clientName ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{clientName}</p>
                            {clientEmail && <p className="text-xs text-gray-500 truncate max-w-[200px]">{clientEmail}</p>}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge className={getStatusColor(t.status)}>{STATUS_LABELS[t.status]}</Badge></td>
                      <td className="px-4 py-3"><Badge className={getPriorityColor(t.priority)}>{PRIORITY_LABELS[t.priority]}</Badge></td>
                      <td className="px-4 py-3">
                        {t.slaDeadline ? (
                          <SLATimer deadline={t.slaDeadline} breached={t.slaBreached || false} compact />
                        ) : (
                          <span className="text-xs text-gray-400">Pas de SLA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-[10px] font-bold text-white">{getInitials(assignee.displayName, assignee.email)}</span>
                            </div>
                            <span className="text-sm text-gray-700">{assignee.displayName}</span>
                          </div>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700">Non assigné</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openTicketModal(t)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ouvrir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Statistiques"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isLoadingFiltered && (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Chargement des tickets...</p>
            </div>
          )}
          {!isLoadingFiltered && filteredTickets.length === 0 && (
            <div className="p-12 text-center">
              <TicketIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun ticket trouvé</p>
              <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres</p>
            </div>
          )}
          {filteredTickets.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTickets.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          )}
        </Card>
      </div>

      {/* Modal de détail du ticket */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  );
};

// ============================================
// CLIENTS LIST VIEW
// ============================================

interface ClientWithTickets {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  createdAt: string;
  lastSeenAt: string | null;
  isActive: boolean;
  totalTickets: number;
  openTickets: number;
  lastTicket: {
    id: string;
    ticketNumber: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  } | null;
  recentTickets: Array<{
    id: string;
    ticketNumber: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

const ClientsListView: React.FC = () => {
  const { setCurrentView } = useAdmin();
  const [clients, setClients] = useState<ClientWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedClient, setSelectedClient] = useState<ClientWithTickets | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const result = await AdminApi.getClientsWithTickets({
        search: searchTerm || undefined,
        page,
        limit: 20,
      });
      setClients(result.clients);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liste des clients</h1>
          <p className="text-gray-500">Clients ayant ouvert un ou plusieurs tickets SAV</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">
            {pagination.total} client{pagination.total > 1 ? 's' : ''}
          </Badge>
          <Button variant="secondary" onClick={loadClients} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Clients list */}
      <Card>
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tickets</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernier ticket</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Inscrit le</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-600">
                            {client.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.displayName}</p>
                          <p className="text-xs text-gray-500">ID: {client.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${client.phone}`} className="text-gray-600 hover:text-gray-900">{client.phone}</a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700">{client.totalTickets} total</Badge>
                        {client.openTickets > 0 && (
                          <Badge className="bg-amber-100 text-amber-700">{client.openTickets} ouvert{client.openTickets > 1 ? 's' : ''}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.lastTicket ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">#{client.lastTicket.ticketNumber}</span>
                            <Badge className={getStatusColor(client.lastTicket.status as TicketStatus)}>
                              {STATUS_LABELS[client.lastTicket.status as TicketStatus] || client.lastTicket.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{client.lastTicket.title}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{formatDate(client.createdAt)}</div>
                      {client.lastSeenAt && (
                        <div className="text-xs text-gray-400">Vu le {formatDateTime(client.lastSeenAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} sur {pagination.totalPages} ({pagination.total} clients)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Client detail modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600">
                    {selectedClient.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedClient.displayName}</h2>
                  <p className="text-gray-500">{selectedClient.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Infos contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{selectedClient.email}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                  <p className="font-medium text-gray-900">{selectedClient.phone || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Inscrit le</p>
                  <p className="font-medium text-gray-900">{formatDateTime(selectedClient.createdAt)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Dernière activité</p>
                  <p className="font-medium text-gray-900">{selectedClient.lastSeenAt ? formatDateTime(selectedClient.lastSeenAt) : '-'}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600">{selectedClient.totalTickets}</p>
                  <p className="text-sm text-blue-600">Total tickets</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-3xl font-bold text-amber-600">{selectedClient.openTickets}</p>
                  <p className="text-sm text-amber-600">Tickets ouverts</p>
                </div>
              </div>

              {/* Recent tickets */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tickets récents</h3>
                <div className="space-y-2">
                  {selectedClient.recentTickets.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Aucun ticket</p>
                  ) : (
                    selectedClient.recentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedClient(null);
                          setCurrentView('tickets');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">#{ticket.ticketNumber}</span>
                            <Badge className={getStatusColor(ticket.status as TicketStatus)}>
                              {STATUS_LABELS[ticket.status as TicketStatus] || ticket.status}
                            </Badge>
                            <Badge className={getPriorityColor(ticket.priority as TicketPriority)}>
                              {PRIORITY_LABELS[ticket.priority as TicketPriority] || ticket.priority}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">{ticket.title}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// OTHER VIEWS (Team, Automation, Analytics, Settings)
// ============================================

const TeamView: React.FC = () => {
  const { users, refreshData } = useAdmin();
  const { hasPermission } = useAuth();
  // Filter staff users (not CUSTOMER) - check both enum and string formats
  const staffUsers = users.filter(u => u.role !== UserRole.CUSTOMER && u.role !== 'CUSTOMER');
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', email: '', role: 'AGENT', phone: '', isActive: true, password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const openEditModal = (user: UserType) => {
    setFormData({
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'AGENT',
      phone: user.phone || '',
      isActive: user.isActive !== false,
      password: '',
    });
    setShowPassword(false);
    setEditingUser(user);
  };

  const openCreateModal = () => {
    setFormData({ displayName: '', email: '', role: 'AGENT', phone: '', isActive: true, password: '' });
    setShowPassword(false);
    setShowCreateModal(true);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        await AdminApi.updateUser(editingUser.id, {
          displayName: formData.displayName,
          role: formData.role,
          phone: formData.phone || undefined,
          isActive: formData.isActive,
          password: formData.password || undefined,
        });
      } else {
        await AdminApi.createUser({
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          phone: formData.phone || undefined,
          password: formData.password || undefined,
        });
      }
      await refreshData();
      setEditingUser(null);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde utilisateur:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await AdminApi.deleteUser(userId);
      await refreshData();
      setEditingUser(null);
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Équipe</h1>
          <p className="text-gray-500">{staffUsers.length} membre{staffUsers.length > 1 ? 's' : ''}</p>
        </div>
        {hasPermission('*') && (
          <Button variant="primary" onClick={openCreateModal}>
            <UserPlus className="w-4 h-4 mr-2" />Ajouter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffUsers.map(u => (
          <Card
            key={u.id}
            className="p-5 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200"
            onClick={() => hasPermission('*') && openEditModal(u)}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">{getInitials(u.displayName, u.email)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{u.displayName}</h3>
                  <div className={`w-2.5 h-2.5 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`} title={u.isActive !== false ? 'Actif' : 'Inactif'} />
                </div>
                <p className="text-sm text-gray-500">{u.email}</p>
                <Badge className={`mt-2 ${ROLE_CONFIG[u.role]?.color}`}>{ROLE_CONFIG[u.role]?.icon}{ROLE_CONFIG[u.role]?.label}</Badge>
              </div>
              {hasPermission('*') && (
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
            {u._count?.assignedTickets !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Tickets assignés</span>
                <span className="text-lg font-bold text-gray-900">{u._count.assignedTickets}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Modal Édition/Création Utilisateur */}
      {(editingUser || showCreateModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setEditingUser(null); setShowCreateModal(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button onClick={() => { setEditingUser(null); setShowCreateModal(false); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@kly.fr"
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  options={[
                    { value: 'AGENT', label: 'Agent' },
                    { value: 'SUPERVISOR', label: 'Superviseur' },
                    { value: 'ADMIN', label: 'Administrateur' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nouveau mot de passe' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Mot de passe'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {editingUser && (
                  <p className="mt-1 text-xs text-gray-500">Laissez vide pour conserver le mot de passe actuel</p>
                )}
              </div>

              {editingUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Compte actif</label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {editingUser && (
                <Button
                  variant="secondary"
                  onClick={() => handleDeleteUser(editingUser.id)}
                  className="text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setEditingUser(null); setShowCreateModal(false); }} className="flex-1">
                Annuler
              </Button>
              <Button variant="primary" onClick={handleSaveUser} disabled={saving || !formData.displayName || !formData.email} className="flex-1">
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingUser ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AutomationView: React.FC = () => {
  const [rules, setRules] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    trigger: string;
    conditions: Array<{ field: string; operator: string; value: unknown }>;
    actions: Array<{ type: string; params?: Record<string, unknown> }>;
    isActive: boolean;
    priority: number;
    _count?: { executions: number };
  }>>([]);
  const [stats, setStats] = useState<{
    activeRules: number;
    todayExecutions: number;
    autoAssignCount: number;
    notificationCount: number;
  }>({ activeRules: 0, todayExecutions: 0, autoAssignCount: 0, notificationCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger: 'TICKET_CREATED',
    conditions: [] as Array<{ field: string; operator: string; value: string }>,
    actions: [] as Array<{ type: string }>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les règles et stats au montage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rulesData, statsData] = await Promise.all([
        AdminApi.getAutomationRules(true),
        AdminApi.getAutomationStats(),
      ]);
      setRules(rulesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement automatisation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRule = async (id: string) => {
    try {
      const updated = await AdminApi.toggleAutomationRule(id);
      setRules(rules.map(r => r.id === id ? { ...r, isActive: updated.isActive } : r));
      // Mettre à jour les stats
      const newStats = await AdminApi.getAutomationStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erreur toggle règle:', error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    try {
      await AdminApi.deleteAutomationRule(id);
      setRules(rules.filter(r => r.id !== id));
      const newStats = await AdminApi.getAutomationStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erreur suppression règle:', error);
    }
  };

  const addFromTemplate = async (template: typeof AUTOMATION_TEMPLATES[0]) => {
    try {
      // Convertir les conditions et actions du template
      const conditions = template.conditions.map(c => {
        const parts = c.split(' ');
        return { field: parts[0], operator: 'eq', value: parts[2] || '' };
      });
      const actions = template.actions.map(a => ({ type: a }));

      // Mapper le trigger vers l'enum backend
      const triggerMap: Record<string, string> = {
        'ticket.created': 'TICKET_CREATED',
        'ticket.updated': 'TICKET_UPDATED',
        'ticket.status_changed': 'TICKET_STATUS_CHANGED',
        'ticket.resolved': 'TICKET_RESOLVED',
        'ticket.closed': 'TICKET_CLOSED',
        'ticket.idle.4h': 'TICKET_IDLE_4H',
        'ticket.waiting.3days': 'TICKET_WAITING_3DAYS',
        'ticket.resolved.7days': 'TICKET_RESOLVED_7DAYS',
        'sla.warning': 'SLA_WARNING',
        'sla.breach': 'SLA_BREACH',
      };

      const newRule = await AdminApi.createAutomationRule({
        name: template.name,
        description: template.description,
        trigger: triggerMap[template.trigger] || 'TICKET_CREATED',
        conditions,
        actions,
        isActive: false,
      });
      setRules([...rules, newRule]);
      setShowTemplates(false);
    } catch (error) {
      console.error('Erreur création règle depuis template:', error);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || newRule.actions.length === 0) {
      alert('Veuillez remplir le nom et ajouter au moins une action');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await AdminApi.createAutomationRule({
        name: newRule.name,
        description: newRule.description,
        trigger: newRule.trigger,
        conditions: newRule.conditions,
        actions: newRule.actions,
        isActive: true,
      });
      setRules([...rules, created]);
      setShowCreateModal(false);
      setNewRule({ name: '', description: '', trigger: 'TICKET_CREATED', conditions: [], actions: [] });
      const newStats = await AdminApi.getAutomationStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erreur création règle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCondition = (c: { field: string; operator: string; value: unknown }) => {
    const opLabels: Record<string, string> = { eq: '=', neq: '≠', gt: '>', lt: '<', gte: '≥', lte: '≤', contains: 'contient', in: 'dans' };
    return `${c.field} ${opLabels[c.operator] || c.operator} ${c.value}`;
  };

  const getActionLabel = (action: { type: string }) => {
    return ACTION_LABELS[action.type]?.label || action.type;
  };

  const getActionColor = (action: { type: string }) => {
    const color = ACTION_LABELS[action.type]?.color;
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colorMap[color || ''] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Mapping des triggers backend vers les labels
  const triggerLabelsBackend: Record<string, string> = {
    'TICKET_CREATED': 'Création de ticket',
    'TICKET_UPDATED': 'Mise à jour de ticket',
    'TICKET_STATUS_CHANGED': 'Changement de statut',
    'TICKET_RESOLVED': 'Ticket résolu',
    'TICKET_CLOSED': 'Ticket fermé',
    'TICKET_IDLE_4H': 'Ticket inactif 4h',
    'TICKET_WAITING_3DAYS': 'En attente 3 jours',
    'TICKET_RESOLVED_7DAYS': 'Résolu depuis 7 jours',
    'SLA_WARNING': 'Alerte SLA',
    'SLA_BREACH': 'SLA dépassé',
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Automatisation</h1>
          <p className="text-gray-500">{rules.length} règle{rules.length > 1 ? 's' : ''} • {stats.activeRules} active{stats.activeRules > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTemplates(!showTemplates)}>
            <Sparkles className="w-4 h-4 mr-2" />Templates
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Nouvelle règle
          </Button>
        </div>
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Templates prédéfinis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AUTOMATION_TEMPLATES.map(t => (
              <div key={t.id} className="bg-white rounded-lg p-4 border border-purple-200 hover:border-purple-400 transition-colors cursor-pointer" onClick={() => addFromTemplate(t)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{t.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{TRIGGER_LABELS[t.trigger] || t.trigger}</span>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-purple-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.activeRules}</p>
              <p className="text-xs text-green-600">Règles actives</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.todayExecutions}</p>
              <p className="text-xs text-blue-600">Exécutions aujourd'hui</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.autoAssignCount}</p>
              <p className="text-xs text-purple-600">Auto-assignations</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{stats.notificationCount}</p>
              <p className="text-xs text-orange-600">Notifications envoyées</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Rules list */}
      <div className="grid gap-4">
        {rules.map(r => (
          <Card key={r.id} className={`p-5 transition-all ${r.isActive ? 'border-l-4 border-l-green-500' : 'opacity-75'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${r.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Workflow className={`w-6 h-6 ${r.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    {r.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                    {r._count?.executions !== undefined && (
                      <span className="text-xs text-gray-400">{r._count.executions} exécution{r._count.executions > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                  <p className="text-sm text-gray-500 mt-1">
                    Déclencheur: <code className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{triggerLabelsBackend[r.trigger] || r.trigger}</code>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs text-gray-400">SI</span>
                    {r.conditions.length > 0 ? r.conditions.map((c, i) => (
                      <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg border border-yellow-200">{formatCondition(c)}</span>
                    )) : <span className="text-xs text-gray-400 italic">Toujours</span>}
                    <span className="text-gray-400">→</span>
                    <span className="text-xs text-gray-400">ALORS</span>
                    {r.actions.map((a, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-lg border ${getActionColor(a)}`}>
                        {getActionLabel(a)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleRule(r.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${r.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  title={r.isActive ? 'Désactiver' : 'Activer'}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.isActive ? 'translate-x-6' : ''}`} />
                </button>
                <Button variant="ghost" size="xs" onClick={() => deleteRule(r.id)} className="text-red-500 hover:bg-red-50" title="Supprimer"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card className="p-12 text-center">
          <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune règle d'automatisation</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre première règle ou utilisez un template</p>
          <Button variant="primary" className="mt-4" onClick={() => setShowTemplates(true)}>
            <Sparkles className="w-4 h-4 mr-2" />Voir les templates
          </Button>
        </Card>
      )}

      {/* Modal de création */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nouvelle règle d'automatisation" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la règle</label>
            <Input value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} placeholder="Ex: Auto-assignation tickets urgents" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <Input value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} placeholder="Description de la règle" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Déclencheur</label>
            <Select
              value={newRule.trigger}
              onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
              options={Object.entries(triggerLabelsBackend).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newRule.actions.map((a, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-lg border flex items-center gap-1 ${getActionColor(a)}`}>
                  {getActionLabel(a)}
                  <button onClick={() => setNewRule({ ...newRule, actions: newRule.actions.filter((_, idx) => idx !== i) })} className="ml-1 text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <Select
              value=""
              onChange={e => {
                if (e.target.value && !newRule.actions.find(a => a.type === e.target.value)) {
                  setNewRule({ ...newRule, actions: [...newRule.actions, { type: e.target.value }] });
                }
              }}
              options={Object.entries(ACTION_LABELS).map(([value, info]) => ({ value, label: info.label }))}
              placeholder="Ajouter une action..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleCreateRule} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer la règle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AnalyticsView: React.FC = () => {
  const { stats, tickets, users } = useAdmin();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filtrer les tickets selon les critères
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Filtre par date
    const now = new Date();
    const dateFilters: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    if (dateRange !== 'all' && dateFilters[dateRange]) {
      const cutoff = new Date(now.getTime() - dateFilters[dateRange] * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.createdAt) >= cutoff);
    }

    // Filtre par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filtre par priorité
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    // Filtre par type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.issueType === filterType);
    }

    // Filtre par agent
    if (filterAgent !== 'all') {
      filtered = filtered.filter(t => t.assignedToId === filterAgent);
    }

    return filtered;
  }, [tickets, dateRange, filterStatus, filterPriority, filterType, filterAgent]);

  // Calculer les stats filtrées
  const filteredStats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byIssueType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let slaBreached = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    filteredTickets.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      byIssueType[t.issueType] = (byIssueType[t.issueType] || 0) + 1;
      if (t.assignedToId) {
        byAgent[t.assignedToId] = (byAgent[t.assignedToId] || 0) + 1;
      }
      if (t.slaBreached) slaBreached++;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        totalResolutionTime += (updated - created) / (1000 * 60); // minutes
        resolvedCount++;
      }
    });

    return {
      total: filteredTickets.length,
      byStatus,
      byPriority,
      byIssueType,
      byAgent,
      slaBreached,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      resolvedCount,
    };
  }, [filteredTickets]);

  // Agents pour le filtre
  const agents = users.filter(u => ['AGENT', 'SUPERVISOR', 'ADMIN'].includes(u.role as string));

  // Export CSV
  const exportCSV = () => {
    const headers = ['N° Ticket', 'Titre', 'Statut', 'Priorité', 'Type', 'Client', 'Agent', 'Créé le', 'SLA dépassé'];
    const rows = filteredTickets.map(t => [
      t.ticketNumber || t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      STATUS_LABELS[t.status] || t.status,
      PRIORITY_LABELS[t.priority] || t.priority,
      ISSUE_TYPE_LABELS[t.issueType] || t.issueType,
      `"${(t.customer?.displayName || t.contactName || t.companyName || '').replace(/"/g, '""')}"`,
      `"${(t.assignedTo?.displayName || 'Non assigné').replace(/"/g, '""')}"`,
      new Date(t.createdAt).toLocaleDateString('fr-FR'),
      t.slaBreached ? 'Oui' : 'Non',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_tickets_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export JSON
  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      filters: { dateRange, filterStatus, filterPriority, filterType, filterAgent },
      summary: filteredStats,
      tickets: filteredTickets.map(t => ({
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        issueType: t.issueType,
        customer: t.customer?.displayName || t.contactName || t.companyName,
        agent: t.assignedTo?.displayName,
        createdAt: t.createdAt,
        slaBreached: t.slaBreached,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_tickets_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export rapport texte
  const exportReport = () => {
    const slaRate = filteredStats.total > 0 ? Math.round(((filteredStats.total - filteredStats.slaBreached) / filteredStats.total) * 100) : 0;
    const avgTime = filteredStats.avgResolutionTime > 0 ? `${Math.round(filteredStats.avgResolutionTime / 60)}h ${Math.round(filteredStats.avgResolutionTime % 60)}m` : 'N/A';

    let report = `RAPPORT ANALYTICS SAV PRO\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Date d'export: ${new Date().toLocaleString('fr-FR')}\n`;
    report += `Période: ${dateRange === 'all' ? 'Toutes les données' : `${dateRange.replace('d', ' jours').replace('y', ' an')}`}\n\n`;

    report += `RÉSUMÉ\n${'-'.repeat(30)}\n`;
    report += `Total tickets: ${filteredStats.total}\n`;
    report += `Taux SLA: ${slaRate}%\n`;
    report += `SLA dépassés: ${filteredStats.slaBreached}\n`;
    report += `Temps moyen résolution: ${avgTime}\n`;
    report += `Tickets résolus: ${filteredStats.resolvedCount}\n\n`;

    report += `PAR STATUT\n${'-'.repeat(30)}\n`;
    Object.entries(STATUS_LABELS).forEach(([status, label]) => {
      const count = filteredStats.byStatus[status] || 0;
      const pct = filteredStats.total > 0 ? Math.round((count / filteredStats.total) * 100) : 0;
      report += `${label}: ${count} (${pct}%)\n`;
    });

    report += `\nPAR PRIORITÉ\n${'-'.repeat(30)}\n`;
    Object.entries(PRIORITY_LABELS).forEach(([priority, label]) => {
      const count = filteredStats.byPriority[priority] || 0;
      const pct = filteredStats.total > 0 ? Math.round((count / filteredStats.total) * 100) : 0;
      report += `${label}: ${count} (${pct}%)\n`;
    });

    report += `\nPAR TYPE\n${'-'.repeat(30)}\n`;
    Object.entries(ISSUE_TYPE_LABELS).forEach(([type, label]) => {
      const count = filteredStats.byIssueType[type] || 0;
      const pct = filteredStats.total > 0 ? Math.round((count / filteredStats.total) * 100) : 0;
      report += `${label}: ${count} (${pct}%)\n`;
    });

    if (Object.keys(filteredStats.byAgent).length > 0) {
      report += `\nPAR AGENT\n${'-'.repeat(30)}\n`;
      Object.entries(filteredStats.byAgent).forEach(([agentId, count]) => {
        const agent = users.find(u => u.id === agentId);
        const pct = filteredStats.total > 0 ? Math.round((count / filteredStats.total) * 100) : 0;
        report += `${agent?.displayName || 'Inconnu'}: ${count} (${pct}%)\n`;
      });
    }

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_analytics_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const slaRate = filteredStats.total > 0 ? Math.round(((filteredStats.total - filteredStats.slaBreached) / filteredStats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Statistiques et métriques • {filteredStats.total} tickets</p>
        </div>
        <div className="relative">
          <Button variant="secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
            <Download className="w-4 h-4 mr-2" />Exporter
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <button onClick={exportCSV} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                Export CSV (Excel)
              </button>
              <button onClick={exportJSON} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Export JSON
              </button>
              <button onClick={exportReport} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Rapport texte
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          {/* Période */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="1y">1 an</option>
            <option value="all">Tout</option>
          </select>

          {/* Statut */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Priorité */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les types</option>
            {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Agent */}
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.displayName}</option>
            ))}
          </select>

          {/* Reset */}
          {(dateRange !== '30d' || filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all' || filterAgent !== 'all') && (
            <button
              onClick={() => {
                setDateRange('30d');
                setFilterStatus('all');
                setFilterPriority('all');
                setFilterType('all');
                setFilterAgent('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </Card>

      {/* KPIs filtrés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total filtré" value={filteredStats.total} icon={<TicketIcon className="w-6 h-6" />} color="purple" subtitle={dateRange === 'all' ? 'Historique complet' : `${dateRange.replace('d', ' jours').replace('y', ' an')}`} />
        <KPICard title="Taux SLA" value={`${slaRate}%`} icon={<Target className="w-6 h-6" />} color="green" subtitle="Respect des délais" />
        <KPICard title="Temps moyen" value={filteredStats.avgResolutionTime > 0 ? `${Math.round(filteredStats.avgResolutionTime / 60)}h` : 'N/A'} icon={<Timer className="w-6 h-6" />} color="blue" subtitle="Résolution" />
        <KPICard title="SLA dépassés" value={filteredStats.slaBreached} icon={<AlertTriangle className="w-6 h-6" />} color="red" subtitle="Hors délai" />
      </div>

      {/* Graphiques visuels - Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Donut - Par statut */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Répartition par statut</h3>
          <DonutChart
            data={[
              { label: 'Ouvert', value: filteredStats.byStatus['OPEN'] || 0, color: '#3b82f6' },
              { label: 'En cours', value: filteredStats.byStatus['IN_PROGRESS'] || 0, color: '#f59e0b' },
              { label: 'Attente', value: filteredStats.byStatus['WAITING_CUSTOMER'] || 0, color: '#8b5cf6' },
              { label: 'Résolu', value: filteredStats.byStatus['RESOLVED'] || 0, color: '#22c55e' },
              { label: 'Fermé', value: filteredStats.byStatus['CLOSED'] || 0, color: '#6b7280' },
              { label: 'Escaladé', value: filteredStats.byStatus['ESCALATED'] || 0, color: '#ef4444' },
            ].filter(d => d.value > 0)}
            centerValue={filteredStats.total}
            centerLabel="tickets"
          />
        </Card>

        {/* Donut - Par priorité */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Répartition par priorité</h3>
          <DonutChart
            data={[
              { label: 'Basse', value: filteredStats.byPriority['LOW'] || 0, color: '#9ca3af' },
              { label: 'Moyenne', value: filteredStats.byPriority['MEDIUM'] || 0, color: '#3b82f6' },
              { label: 'Haute', value: filteredStats.byPriority['HIGH'] || 0, color: '#f97316' },
              { label: 'Urgente', value: filteredStats.byPriority['URGENT'] || 0, color: '#ef4444' },
            ].filter(d => d.value > 0)}
            centerValue={`${slaRate}%`}
            centerLabel="SLA OK"
          />
        </Card>

        {/* Donut - Par type */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Répartition par type</h3>
          <DonutChart
            data={[
              { label: 'Technique', value: filteredStats.byIssueType['TECHNICAL'] || 0, color: '#8b5cf6' },
              { label: 'Livraison', value: filteredStats.byIssueType['DELIVERY'] || 0, color: '#3b82f6' },
              { label: 'Facturation', value: filteredStats.byIssueType['BILLING'] || 0, color: '#22c55e' },
              { label: 'Autre', value: filteredStats.byIssueType['OTHER'] || 0, color: '#6b7280' },
            ].filter(d => d.value > 0)}
            centerValue={filteredStats.resolvedCount}
            centerLabel="résolus"
          />
        </Card>
      </div>

      {/* Graphiques barres et tendances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Priorité */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tickets par priorité</h3>
          <div className="flex justify-center">
            <VerticalBarChart
              data={[
                { label: 'Basse', value: filteredStats.byPriority['LOW'] || 0, color: '#9ca3af' },
                { label: 'Moyenne', value: filteredStats.byPriority['MEDIUM'] || 0, color: '#3b82f6' },
                { label: 'Haute', value: filteredStats.byPriority['HIGH'] || 0, color: '#f97316' },
                { label: 'Urgente', value: filteredStats.byPriority['URGENT'] || 0, color: '#ef4444' },
              ]}
              width={320}
              height={200}
            />
          </div>
        </Card>

        {/* Tendance tickets par jour */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tendance des tickets (7 derniers jours)</h3>
          <div className="flex justify-center">
            <AreaLineChart
              data={(() => {
                const days = [];
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                  const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'short' });
                  const count = filteredTickets.filter(t => {
                    const ticketDate = new Date(t.createdAt);
                    return ticketDate.toDateString() === date.toDateString();
                  }).length;
                  days.push({ label: dayStr, value: count });
                }
                return days;
              })()}
              width={350}
              height={180}
              color="#8b5cf6"
              gradientId="trendGradient"
            />
          </div>
        </Card>

        {/* Performance agents - Horizontal bars */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Charge par agent</h3>
          {agents.length > 0 ? (
            <HorizontalBarChart
              data={agents.slice(0, 5).map((agent, i) => ({
                label: agent.displayName,
                value: filteredStats.byAgent[agent.id] || 0,
                color: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'][i % 5],
                percent: filteredStats.total > 0 ? Math.round(((filteredStats.byAgent[agent.id] || 0) / filteredStats.total) * 100) : 0,
              }))}
            />
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Aucun agent trouvé</p>
          )}
        </Card>

        {/* Types de problèmes - Horizontal bars */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Types de problèmes</h3>
          <HorizontalBarChart
            data={[
              { label: 'Technique', value: filteredStats.byIssueType['TECHNICAL'] || 0, color: '#8b5cf6', percent: filteredStats.total > 0 ? Math.round(((filteredStats.byIssueType['TECHNICAL'] || 0) / filteredStats.total) * 100) : 0 },
              { label: 'Livraison', value: filteredStats.byIssueType['DELIVERY'] || 0, color: '#3b82f6', percent: filteredStats.total > 0 ? Math.round(((filteredStats.byIssueType['DELIVERY'] || 0) / filteredStats.total) * 100) : 0 },
              { label: 'Facturation', value: filteredStats.byIssueType['BILLING'] || 0, color: '#22c55e', percent: filteredStats.total > 0 ? Math.round(((filteredStats.byIssueType['BILLING'] || 0) / filteredStats.total) * 100) : 0 },
              { label: 'Autre', value: filteredStats.byIssueType['OTHER'] || 0, color: '#6b7280', percent: filteredStats.total > 0 ? Math.round(((filteredStats.byIssueType['OTHER'] || 0) / filteredStats.total) * 100) : 0 },
            ]}
          />
        </Card>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Tickets ouverts</p>
              <p className="text-2xl font-bold text-blue-900">{(filteredStats.byStatus['OPEN'] || 0) + (filteredStats.byStatus['REOPENED'] || 0)}</p>
            </div>
            <Sparkline data={[3, 5, 4, 7, 6, 8, (filteredStats.byStatus['OPEN'] || 0)]} color="#3b82f6" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">En traitement</p>
              <p className="text-2xl font-bold text-amber-900">{filteredStats.byStatus['IN_PROGRESS'] || 0}</p>
            </div>
            <Sparkline data={[2, 4, 3, 5, 4, 6, (filteredStats.byStatus['IN_PROGRESS'] || 0)]} color="#f59e0b" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Résolus</p>
              <p className="text-2xl font-bold text-green-900">{filteredStats.resolvedCount}</p>
            </div>
            <Sparkline data={[5, 7, 6, 8, 9, 7, filteredStats.resolvedCount]} color="#22c55e" />
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">SLA dépassés</p>
              <p className="text-2xl font-bold text-red-900">{filteredStats.slaBreached}</p>
            </div>
            <Sparkline data={[1, 2, 1, 3, 2, 1, filteredStats.slaBreached]} color="#ef4444" />
          </div>
        </Card>
      </div>

      {/* Tableau récapitulatif */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Détail des tickets filtrés</h3>
          <span className="text-sm text-gray-500">{filteredStats.total} résultats</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N°</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priorité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.slice(0, 10).map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{t.ticketRef || t.ticketNumber || t.id.slice(0, 6)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">{t.title}</td>
                  <td className="px-4 py-3"><Badge className={getStatusColor(t.status)}>{STATUS_LABELS[t.status]}</Badge></td>
                  <td className="px-4 py-3"><Badge className={getPriorityColor(t.priority)}>{PRIORITY_LABELS[t.priority]}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ISSUE_TYPE_LABELS[t.issueType]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.assignedTo?.displayName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTickets.length > 10 && (
            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
              + {filteredTickets.length - 10} autres tickets • Exportez pour voir la liste complète
            </div>
          )}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun ticket ne correspond aux filtres sélectionnés</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ============================================
// GENERAL SETTINGS TAB (Language & Theme)
// ============================================

// Theme preview styles - uses THEME_STYLES for consistency
const getThemePreview = (key: AppTheme) => ({
  sidebar: THEME_STYLES[key].sidebarBg,
  logo: THEME_STYLES[key].logoBg,
});

const GeneralSettingsTab: React.FC = () => {
  const { appTheme, setAppTheme, appLanguage, setAppLanguage, t } = useAdmin();

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900">{t('settings.general')}</h2>

      {/* Language Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('settings.language')}</h3>
          <p className="text-xs text-gray-500 mb-3">{t('settings.languageDesc')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {([
            { code: 'fr' as AppLanguage, name: 'Français', flag: '🇫🇷' },
            { code: 'en' as AppLanguage, name: 'English', flag: '🇬🇧' },
          ]).map(({ code, name, flag }) => (
            <button
              key={code}
              onClick={() => setAppLanguage(code)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2
                ${appLanguage === code
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <span className="text-3xl">{flag}</span>
              <span className={`text-sm font-medium ${appLanguage === code ? 'text-blue-700' : 'text-gray-700'}`}>
                {name}
              </span>
              {appLanguage === code && (
                <CheckCircle className="w-4 h-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('settings.theme')}</h3>
          <p className="text-xs text-gray-500 mb-3">{t('settings.themeDesc')}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['classic', 'blue', 'green'] as AppTheme[]).map((key) => {
            const themeInfo = THEME_STYLES[key];
            const preview = getThemePreview(key);
            return (
              <button
                key={key}
                onClick={() => setAppTheme(key)}
                className={`p-4 rounded-xl border-2 transition-all duration-200
                  ${appTheme === key
                    ? 'border-blue-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                {/* Theme preview with inline styles */}
                <div
                  className={`h-16 rounded-lg mb-3 flex items-center justify-center ${themeInfo.isLight ? 'border border-gray-200' : ''}`}
                  style={{ background: preview.sidebar }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                    style={{ background: preview.logo }}
                  >
                    <Wrench className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className={`text-sm font-medium ${appTheme === key ? 'text-blue-700' : 'text-gray-700'}`}>
                  {themeInfo.name}
                </span>
                <span className="block text-xs text-gray-500 mt-1">{themeInfo.description}</span>
                {appTheme === key && (
                  <div className="flex justify-center mt-2">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Company Info (read-only for now) */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Informations entreprise</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Nom de l'entreprise</label>
            <Input value="KLY GROUPE" className="mt-1" readOnly />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email support</label>
            <Input value="support@kly.fr" className="mt-1" readOnly />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Les changements de langue et de thème sont appliqués immédiatement et sauvegardés automatiquement.
      </div>
    </div>
  );
};

// ============================================
// VUE: Gestion des Marques (Base de connaissances)
// ============================================

const BrandsView: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    folderUrl: '',
    websiteUrl: '',
    isActive: true,
  });

  // Charger les marques
  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AdminApi.getBrands();
      setBrands(data);
    } catch (error) {
      console.error('Erreur chargement marques:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Ouvrir modal création
  const handleCreate = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      description: '',
      logoUrl: '',
      folderUrl: '',
      websiteUrl: '',
      isActive: true,
    });
    setShowModal(true);
  };

  // Ouvrir modal édition
  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logoUrl: brand.logoUrl || '',
      folderUrl: brand.folderUrl || '',
      websiteUrl: brand.websiteUrl || '',
      isActive: brand.isActive,
    });
    setShowModal(true);
  };

  // Sauvegarder (création ou mise à jour)
  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (editingBrand) {
        await AdminApi.updateBrand(editingBrand.id, formData);
      } else {
        await AdminApi.createBrand(formData);
      }
      await loadBrands();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde marque:', error);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer une marque
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette marque ?')) return;

    setDeleting(id);
    try {
      await AdminApi.deleteBrand(id);
      await loadBrands();
    } catch (error) {
      console.error('Erreur suppression marque:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Toggle actif/inactif
  const handleToggleActive = async (brand: Brand) => {
    try {
      await AdminApi.updateBrand(brand.id, { isActive: !brand.isActive });
      await loadBrands();
    } catch (error) {
      console.error('Erreur toggle marque:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des marques</h1>
          <p className="text-gray-500 mt-1">Base de connaissances - Fiches techniques par marque</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une marque
        </Button>
      </div>

      {/* Liste des marques */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Aucune marque</h3>
          <p className="text-gray-500 mt-1">Commencez par ajouter une marque</p>
          <Button variant="primary" className="mt-4" onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une marque
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className={`bg-white rounded-xl border p-5 hover:shadow-lg transition-all ${
                brand.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="w-12 h-12 object-contain rounded-lg border border-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                    {!brand.isActive && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(brand)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    disabled={deleting === brand.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleting === brand.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {brand.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{brand.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {brand.folderUrl && (
                  <a
                    href={brand.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Fiches techniques
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {brand.websiteUrl && (
                  <a
                    href={brand.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Site web
                  </a>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Mis à jour le {new Date(brand.updatedAt).toLocaleDateString('fr-FR')}
                </span>
                <button
                  onClick={() => handleToggleActive(brand)}
                  className={`text-xs font-medium ${
                    brand.isActive
                      ? 'text-green-600 hover:text-green-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {brand.isActive ? 'Actif' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBrand ? 'Modifier la marque' : 'Ajouter une marque'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la marque *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Bosch, Siemens..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Description optionnelle..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  Lien dossier fiches techniques
                </label>
                <input
                  type="url"
                  value={formData.folderUrl}
                  onChange={(e) => setFormData({ ...formData, folderUrl: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://sharepoint.com/... ou https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lien vers le dossier SharePoint, Google Drive ou autre contenant les fiches techniques
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL du logo
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web officiel
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.marque.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Marque active (visible pour les utilisateurs)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingBrand ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, refreshUser } = useAuth();
  const { refreshData } = useAdmin();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const token = localStorage.getItem('kly_admin_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName: profileForm.displayName, phone: profileForm.phone }),
      });
      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      // Refresh user data from backend
      await refreshUser();
      setProfileMessage({ type: 'success', text: 'Profil mis à jour avec succès' });
      refreshData();
    } catch (err) {
      setProfileMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const token = localStorage.getItem('kly_admin_access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du changement de mot de passe');
      }
      setPasswordMessage({ type: 'success', text: 'Mot de passe changé avec succès' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="w-full lg:w-64 p-4 h-fit overflow-x-auto">
          <nav className="flex lg:flex-col gap-1 lg:gap-0 lg:space-y-1 min-w-max lg:min-w-0">
            {[
              { id: 'profile', label: 'Mon profil', icon: <User className="w-4 h-4" /> },
              { id: 'security', label: 'Sécurité', icon: <Shield className="w-4 h-4" /> },
              { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
              { id: 'general', label: 'Général', icon: <Settings className="w-4 h-4" /> },
              { id: 'sla', label: 'SLA', icon: <Timer className="w-4 h-4" /> },
            ].map(i => (
              <button key={i.id} onClick={() => setActiveTab(i.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === i.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                {i.icon}{i.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="flex-1 p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-lg font-semibold">Mon profil</h2>

              {/* Avatar section */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user?.displayName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <Badge className="mt-1 bg-blue-100 text-blue-700">{ROLE_CONFIG[user?.role || '']?.label || user?.role}</Badge>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom d'affichage</label>
                  <Input
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    className="mt-2"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input value={user?.email || ''} disabled readOnly className="mt-2 bg-gray-50 text-gray-500" />
                  <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Téléphone</label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-2"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                {profileMessage && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${profileMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {profileMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-sm">{profileMessage.text}</span>
                  </div>
                )}

                <Button type="submit" variant="primary" disabled={profileSaving}>
                  {profileSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-lg font-semibold">Sécurité</h2>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Changer le mot de passe
                </h3>

                <div>
                  <label className="text-sm font-medium text-gray-700">Mot de passe actuel</label>
                  <div className="relative mt-2">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Entrez votre mot de passe actuel"
                    />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
                  <div className="relative mt-2">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Minimum 8 caractères"
                    />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                  <div className="relative mt-2">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Répétez le nouveau mot de passe"
                    />
                    <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordMessage && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {passwordMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-sm">{passwordMessage.text}</span>
                  </div>
                )}

                <Button type="submit" variant="primary" disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}>
                  {passwordSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                  Changer le mot de passe
                </Button>
              </form>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-medium text-amber-800 mb-2">Conseils de sécurité</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Utilisez un mot de passe unique d'au moins 8 caractères</li>
                  <li>• Combinez lettres, chiffres et caractères spéciaux</li>
                  <li>• Ne partagez jamais votre mot de passe</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <GeneralSettingsTab />
          )}

          {activeTab === 'sla' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Configuration SLA</h2>
              <div className="space-y-4">
                {Object.entries(PRIORITY_LABELS).map(([priority, label]) => (
                  <div key={priority} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <Badge className={getPriorityColor(priority as TicketPriority)}>{label}</Badge>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500">Première réponse (h)</label>
                        <Input type="number" defaultValue={priority === 'URGENT' ? '1' : priority === 'HIGH' ? '2' : '4'} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Résolution (h)</label>
                        <Input type="number" defaultValue={priority === 'URGENT' ? '4' : priority === 'HIGH' ? '8' : '24'} className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="primary"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <div className="space-y-3">
                {['Nouveau ticket', 'Ticket assigné', 'Message reçu', 'SLA proche', 'SLA dépassé'].map(notif => (
                  <div key={notif} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700">{notif}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-6 flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Cog className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-500 mt-2">Cette fonctionnalité sera bientôt disponible</p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AdminV2: React.FC = () => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App state
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // App settings (persisted in localStorage)
  const [appTheme, setAppTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('kly_app_theme');
    return (saved as AppTheme) || 'blue';
  });
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('kly_app_language');
    return (saved as AppLanguage) || 'fr';
  });

  // Persist theme and language changes
  useEffect(() => {
    localStorage.setItem('kly_app_theme', appTheme);
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem('kly_app_language', appLanguage);
  }, [appLanguage]);

  // Translation function
  const t = useCallback((key: string): string => {
    return TRANSLATIONS[appLanguage]?.[key] || TRANSLATIONS.fr[key] || key;
  }, [appLanguage]);

  // Data state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Notification state
  const seenNotifIds = useRef<Set<string>>(new Set());
  const [humanTakeoverAlert, setHumanTakeoverAlert] = useState<{ ticketId: string; ticketNumber: string; customerName: string } | null>(null);

  // Computed: unread notifications count
  const unreadNotifications = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Computed: map of ticketId -> unread count
  const unreadByTicket = useMemo(() => {
    const map = new Map<string, number>();
    notifications.filter(n => !n.isRead && n.ticketId).forEach(n => {
      const current = map.get(n.ticketId!) || 0;
      map.set(n.ticketId!, current + 1);
    });
    return map;
  }, [notifications]);

  const hasUnreadForTicket = useCallback((ticketId: string) => unreadByTicket.has(ticketId), [unreadByTicket]);

  const markNotificationsAsRead = useCallback(async (ids: string[]) => {
    try {
      await AdminApi.markNotificationsAsRead(ids);
      setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await AdminApi.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const clearHumanTakeoverAlert = useCallback(() => setHumanTakeoverAlert(null), []);

  // Check existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (TokenStorage.isAuthenticated()) {
        try {
          const user = await AdminApi.getCurrentUser();
          if (user.role !== UserRole.CUSTOMER) {
            setCurrentUser(user);
            setIsAuthenticated(true);
          } else {
            TokenStorage.clear();
          }
        } catch (error) {
          console.error('Session invalide:', error);
          TokenStorage.clear();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect socket
    adminSocketService.connect();

    // Handle new notifications
    const handleNewNotification = (data: unknown) => {
      const incoming = data as Record<string, unknown>;
      const notifId = incoming.id as string;

      // Avoid duplicates
      if (seenNotifIds.current.has(notifId)) {
        console.log('[AdminSocket] Duplicate notification ignored:', notifId);
        return;
      }

      console.log('[AdminSocket] New notification received:', notifId, incoming);
      seenNotifIds.current.add(notifId);

      const notif: NotificationType = {
        id: notifId,
        type: incoming.type as NotificationType['type'],
        ticketId: incoming.ticketId as string | undefined,
        title: incoming.title as string | undefined,
        body: incoming.body as string | undefined,
        isRead: false,
        createdAt: incoming.createdAt as string || new Date().toISOString(),
      };

      setNotifications(prev => [notif, ...prev]);

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {}
    };

    // Handle GPT to human transfer
    const handleHumanTakeover = (data: unknown) => {
      const incoming = data as { ticketId: string; ticketNumber: string; customerName?: string; message?: string };
      console.log('[AdminSocket] Human takeover alert:', incoming);

      setHumanTakeoverAlert({
        ticketId: incoming.ticketId,
        ticketNumber: incoming.ticketNumber || 'N/A',
        customerName: incoming.customerName || 'Client',
      });

      // Play alert sound
      try {
        const audio = new Audio('/alert.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    };

    // Handle ticket updates
    const handleTicketUpdate = (data: unknown) => {
      const updated = data as Ticket;
      console.log('[AdminSocket] Ticket update:', updated.id);
      setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    };

    // Handle new message on ticket
    const handleNewMessage = (data: unknown) => {
      const message = data as { ticketId: string; message: TicketMessage };
      console.log('[AdminSocket] New message for ticket:', message.ticketId);
      setTickets(prev => prev.map(t => {
        if (t.id === message.ticketId) {
          return { ...t, messages: [...(t.messages || []), message.message] };
        }
        return t;
      }));
    };

    adminSocketService.on('notification', handleNewNotification);
    adminSocketService.on('admin:human_takeover', handleHumanTakeover);
    adminSocketService.on('ticket:updated', handleTicketUpdate);
    adminSocketService.on('message:new', handleNewMessage);

    return () => {
      adminSocketService.off('notification', handleNewNotification);
      adminSocketService.off('admin:human_takeover', handleHumanTakeover);
      adminSocketService.off('ticket:updated', handleTicketUpdate);
      adminSocketService.off('message:new', handleNewMessage);
    };
  }, [isAuthenticated]);

  const refreshData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const [ticketsResult, usersResult, statsResult, notifsResult] = await Promise.allSettled([
        AdminApi.getTickets({
          limit: 100,
          excludeStatus: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
        }),
        AdminApi.getUsers(),
        AdminApi.getTicketStats(),
        AdminApi.getNotifications(),
      ]);

      // Handle tickets
      if (ticketsResult.status === 'fulfilled') {
        setTickets(ticketsResult.value.data || []);
      } else {
        console.error('Erreur chargement tickets:', ticketsResult.reason);
      }

      // Handle users
      if (usersResult.status === 'fulfilled') {
        setUsers(usersResult.value || []);
      } else {
        console.error('Erreur chargement users:', usersResult.reason);
      }

      // Handle stats
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else {
        console.error('Erreur chargement stats:', statsResult.reason);
      }

      // Handle notifications
      if (notifsResult.status === 'fulfilled') {
        const notifs = notifsResult.value || [];
        seenNotifIds.current = new Set(notifs.map((n: NotificationType) => n.id));
        setNotifications(notifs);
      } else {
        console.error('Erreur chargement notifications:', notifsResult.reason);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const autoAssignTickets = useCallback(async () => {
    const unassigned = tickets.filter(t => !t.assignedToId && (t.status === TicketStatus.OPEN || t.status === TicketStatus.REOPENED));
    const agents = users.filter(u => u.role === UserRole.AGENT || u.role === UserRole.SUPERVISOR);

    if (unassigned.length === 0 || agents.length === 0) return;

    // Simple round-robin assignment
    let agentIndex = 0;
    for (const ticket of unassigned) {
      const agent = agents[agentIndex % agents.length];
      try {
        await AdminApi.updateTicket(ticket.id, { assignedToId: agent.id, status: TicketStatus.IN_PROGRESS });
      } catch (error) {
        console.error('Erreur assignation ticket:', ticket.id, error);
      }
      agentIndex++;
    }

    // Refresh data after assignment
    await refreshData();
  }, [tickets, users, refreshData]);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await AdminApi.login(email, password);
      if (response.user.role === UserRole.CUSTOMER) {
        TokenStorage.clear();
        throw new ApiError('Accès réservé au personnel autorisé.', 403, 'ACCESS_DENIED');
      }
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await AdminApi.logout();
    } catch (error) {
      console.error('Erreur logout:', error);
    }
    // Disconnect socket
    adminSocketService.disconnect();
    seenNotifIds.current.clear();

    setCurrentUser(null);
    setIsAuthenticated(false);
    setTickets([]);
    setUsers([]);
    setStats(null);
    setNotifications([]);
    setHumanTakeoverAlert(null);
  };

  const handleRefreshUser = async () => {
    try {
      const user = await AdminApi.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur refresh user:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    const permissions = ROLE_CONFIG[currentUser.role]?.permissions || [];
    return permissions.includes('*') || permissions.includes(permission);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'tickets': return <TicketsView />;
      case 'clients': return <ClientsListView />;
      case 'team': return <TeamView />;
      case 'automation': return <AutomationView />;
      case 'analytics': return <AnalyticsView />;
      case 'brands': return <BrandsView />;
      case 'settings': return <SettingsView />;
      default: return <PlaceholderView title={currentView.charAt(0).toUpperCase() + currentView.slice(1)} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <Wrench className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPageV2 onLogin={handleLogin} />;
  }

  return (
    <AuthContext.Provider value={{ user: currentUser, isAuthenticated, login: handleLogin, logout: handleLogout, hasPermission, refreshUser: handleRefreshUser }}>
      <AdminContext.Provider value={{
        currentView, setCurrentView,
        selectedTicket, setSelectedTicket,
        sidebarOpen, setSidebarOpen,
        sidebarCollapsed, setSidebarCollapsed,
        notifications,
        unreadNotifications,
        unreadByTicket,
        hasUnreadForTicket,
        markNotificationsAsRead,
        markAllNotificationsAsRead,
        humanTakeoverAlert,
        clearHumanTakeoverAlert,
        showAIAssistant, setShowAIAssistant,
        tickets, setTickets,
        users,
        stats,
        refreshData,
        isLoading: dataLoading,
        autoAssignTickets,
        appTheme, setAppTheme,
        appLanguage, setAppLanguage,
        t
      }}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto">{renderView()}</main>
          </div>
          <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />

          {/* Human Takeover Alert Modal */}
          {humanTakeoverAlert && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={clearHumanTakeoverAlert} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center animate-pulse">
                    <Headphones className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Prise en charge requise</h3>
                    <p className="text-sm text-gray-500">L'IA transfère ce ticket</p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 mb-4 border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>{humanTakeoverAlert.customerName}</strong> a besoin d'une assistance humaine sur le ticket <strong>#{humanTakeoverAlert.ticketNumber}</strong>.
                  </p>
                  <p className="text-xs text-orange-600 mt-2">L'assistant IA a déterminé qu'un opérateur doit prendre le relais.</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    onClick={() => {
                      setSelectedTicket(tickets.find(t => t.id === humanTakeoverAlert.ticketId) || null);
                      setCurrentView('tickets');
                      clearHumanTakeoverAlert();
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Prendre en charge
                  </Button>
                  <Button variant="secondary" onClick={clearHumanTakeoverAlert}>
                    Plus tard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminContext.Provider>
    </AuthContext.Provider>
  );
};

export default AdminV2;
