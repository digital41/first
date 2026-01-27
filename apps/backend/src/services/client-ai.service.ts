// ============================================
// SERVICE IA CLIENT - Chat LUMO sécurisé côté backend
// ============================================
// Ce service gère les conversations avec l'assistant LUMO
// - La clé API Gemini reste côté serveur (sécurisée)
// - Les données SAGE sont injectées côté serveur
// - Le frontend n'a pas accès direct à Gemini ni aux données sensibles

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, ChatSession } from '@google/generative-ai';
import { SageService, SageOrder } from './sage.service.js';
import * as ticketService from './ticket.service.js';
import type { IssueType, TicketPriority } from '@prisma/client';

// Configuration API Google Gemini
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';

// Initialiser le client Gemini
const genAI = GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(GOOGLE_AI_API_KEY) : null;

// Configuration de sécurité pour Gemini
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// System prompt pour LUMO (version optimisée avec recherche web)
const SYSTEM_PROMPT = `[IDENTITÉ]
Je suis Lumo, assistant IA de KLY Groupe (équipements industriels).

[STYLE]
- Ton: chaleureux, professionnel, empathique
- Langue: français uniquement
- Longueur: 2-4 phrases courtes, jamais plus de 100 mots
- Emojis: 1-2 max par message

[EXPERTISE PRINCIPALE]
- Suivi commandes SAGE (BC, BL, FA, montants, dates, articles)
- Support technique équipements industriels
- Création de tickets SAV
- Questions commerciales KLY Groupe

[CONNAISSANCES GÉNÉRALES]
Je peux aussi répondre à des questions générales grâce à mes connaissances:
- Informations sur les équipements industriels (pompes, compresseurs, outillage...)
- Conseils techniques et bonnes pratiques
- Questions générales sur les produits et technologies
- Actualités du secteur industriel

[DONNÉES SAGE]
Si les données SAGE du client sont dans le contexte, je les utilise en PRIORITÉ.
Pour les questions sur les commandes, factures, livraisons: je me base sur les VRAIES données.

[COMPORTEMENT]
1. Je réponds de façon CONCISE et COMPLÈTE
2. Pour les questions clients (commandes, factures): j'utilise les données SAGE
3. Pour les questions générales: j'utilise mes connaissances
4. Je suis HONNÊTE si une info n'est pas disponible
5. Je termine TOUJOURS mes réponses proprement`;

// Interface pour le contexte utilisateur
interface UserContext {
  userId: string;
  customerCode?: string;
  customerName?: string;
  email?: string;
}

// Interface pour l'historique de conversation
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Cache des sessions de chat par utilisateur
const chatSessions = new Map<string, {
  session: ChatSession;
  lastActivity: number;
}>();

// Nettoyer les sessions inactives (plus de 30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function cleanupSessions() {
  const now = Date.now();
  for (const [userId, data] of chatSessions.entries()) {
    if (now - data.lastActivity > SESSION_TIMEOUT) {
      chatSessions.delete(userId);
    }
  }
}

// Nettoyer les sessions toutes les 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);

// Formater les données SAGE pour le contexte IA
function formatSageOrdersForContext(orders: SageOrder[]): string {
  if (!orders || orders.length === 0) {
    return 'Aucune commande trouvée pour ce client.';
  }

  const lines: string[] = [];
  lines.push(`📦 COMMANDES DU CLIENT (${orders.length} commandes):`);

  orders.slice(0, 15).forEach((order, i) => {
    const dateStr = order.orderDate
      ? new Date(order.orderDate).toLocaleDateString('fr-FR')
      : 'date inconnue';
    const status = order.status || 'En cours';
    const total = order.totalTTC?.toFixed(2) || order.totalHT?.toFixed(2) || '?';

    lines.push(`${i + 1}. ${order.documentTypeLabel || 'DOC'} ${order.documentNumber} - ${status} - ${total}€ TTC - ${dateStr}`);

    if (order.lines && order.lines.length > 0) {
      order.lines.slice(0, 3).forEach(line => {
        lines.push(`   • ${line.productName} (x${line.quantity}) - ${line.unitPrice?.toFixed(2) || '?'}€`);
      });
      if (order.lines.length > 3) {
        lines.push(`   ... et ${order.lines.length - 3} autres articles`);
      }
    }
  });

  if (orders.length > 15) {
    lines.push(`... et ${orders.length - 15} autres commandes`);
  }

  return lines.join('\n');
}

// Knowledge base pour les réponses rapides (sans appel API)
const KNOWLEDGE_BASE = {
  greetings: {
    patterns: ['bonjour', 'salut', 'hello', 'bonsoir', 'coucou'],
    response: "Hey ! 👋 C'est Lumo, votre assistant IA KLY Groupe.\n\nJe suis prêt à vous aider sur :\n• 🛒 Questions **commerciales** (produits, prix)\n• 📦 **Suivi Sage** (commandes, livraisons)\n• 🔧 Support **technique** (dépannage, maintenance)\n• 🌐 **Questions générales** sur l'industrie\n\nQu'est-ce qui vous amène ?"
  },
  thanks: {
    patterns: ['merci', 'super', 'parfait', 'génial', 'top'],
    response: "Avec plaisir ! 😊 C'est mon job de vous faciliter la vie.\n\nN'hésitez pas si vous avez d'autres questions - je suis là 24/7 !"
  },
  identity: {
    patterns: ['qui es-tu', 'qui êtes-vous', "c'est quoi lumo", 'tu es qui'],
    response: "Je suis **Lumo** 🌟, l'agent IA autonome de KLY Groupe !\n\nJe suis là pour vous accompagner sur :\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n• 🌐 **Questions générales** - Équipements industriels, conseils\n\nQu'est-ce que je peux faire pour vous ?"
  },
  humanAgent: {
    patterns: ['agent', 'humain', 'parler à quelqu', 'conseiller'],
    response: "Je comprends, parfois on a besoin de parler à un humain ! 🙂\n\nJe vais vous orienter vers l'équipe :\n\n1. **Créez un ticket** - Un technicien qualifié prendra le relais\n2. Tout notre échange sera transmis pour plus d'efficacité\n3. Réponse garantie sous **24h** (souvent plus rapide)\n\n👉 Voulez-vous que je prépare le ticket avec les infos de notre conversation ?"
  }
};

// Vérifier si un message match un pattern de knowledge base
function checkKnowledgeBase(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  for (const category of Object.values(KNOWLEDGE_BASE)) {
    if (category.patterns.some(pattern => lowerMessage.includes(pattern))) {
      return category.response;
    }
  }

  return null;
}

// Mots-clés indiquant une question liée aux données SAGE du client
const SAGE_KEYWORDS = [
  'commande', 'commandes', 'ma commande', 'mes commandes',
  'facture', 'factures', 'ma facture', 'mes factures',
  'livraison', 'livraisons', 'ma livraison',
  'bon de commande', 'bc', 'bl', 'bon de livraison',
  'montant', 'prix de ma', 'combien j\'ai',
  'statut', 'où en est', 'suivi',
  'dernière commande', 'historique',
  'article commandé', 'ce que j\'ai commandé',
  'paiement', 'avoir', 'remboursement'
];

// ============================================
// SERVICE PRINCIPAL
// ============================================

export const ClientAIService = {
  /**
   * Vérifie si le service IA est disponible
   */
  isAvailable(): boolean {
    return !!GOOGLE_AI_API_KEY && !!genAI;
  },

  /**
   * Détecte si la question est liée aux données SAGE du client
   */
  isSageRelatedQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return SAGE_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  },

  /**
   * Génère une réponse pour le client
   */
  async chat(
    message: string,
    userContext: UserContext,
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Vérification du message
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return {
          success: false,
          message: '',
          error: 'Le message est requis'
        };
      }

      const trimmedMessage = message.trim();

      // 1. Vérifier d'abord la knowledge base pour réponses rapides
      const quickResponse = checkKnowledgeBase(trimmedMessage);
      if (quickResponse && conversationHistory.length < 2) {
        return {
          success: true,
          message: quickResponse
        };
      }

      // 2. Si pas de clé API, utiliser fallback
      if (!GOOGLE_AI_API_KEY || !genAI) {
        console.log('[Client AI] Pas de clé API Gemini, utilisation du fallback');
        return {
          success: true,
          message: this.getFallbackResponse(trimmedMessage)
        };
      }

      // 3. Détecter si la question concerne les données client (SAGE) ou une question générale
      const isSageRelatedQuestion = this.isSageRelatedQuestion(trimmedMessage);

      // 4. Récupérer les données SAGE seulement si pertinent
      let sageContext = '';
      if (userContext.customerCode && isSageRelatedQuestion) {
        try {
          const orders = await SageService.getCustomerOrders(userContext.customerCode);
          if (orders && orders.length > 0) {
            sageContext = formatSageOrdersForContext(orders);
          }
        } catch (error) {
          console.warn('[Client AI] Impossible de récupérer les données SAGE:', error);
        }
      }

      // 5. Construire le message enrichi avec le contexte approprié
      let enhancedMessage = trimmedMessage;
      if (sageContext) {
        enhancedMessage = `[DONNÉES SAGE RÉELLES]\nClient: ${userContext.customerName || userContext.email || 'Client'}\nCode client: ${userContext.customerCode || 'Non disponible'}\n\n${sageContext}\n\n[QUESTION CLIENT]\n${trimmedMessage}`;
      } else if (!isSageRelatedQuestion) {
        // Pour les questions générales, indiquer que LUMO peut utiliser ses connaissances
        enhancedMessage = `[QUESTION GÉNÉRALE - Utilise tes connaissances pour répondre]\n\n${trimmedMessage}`;
      }

      // 6. Obtenir ou créer une session de chat
      let chatSession: ChatSession;
      const sessionData = chatSessions.get(userContext.userId);

      if (sessionData) {
        chatSession = sessionData.session;
        sessionData.lastActivity = Date.now();
      } else {
        // Utiliser uniquement Gemini 2.5 Flash
        const GEMINI_MODEL = 'gemini-2.5-flash';
        let model = null;

        try {
          model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            safetySettings,
            generationConfig: {
              maxOutputTokens: 2000,
              temperature: 0.8,
            },
          });
          console.log(`[Client AI] Modèle initialisé: ${GEMINI_MODEL}`);
        } catch (error) {
          console.error(`[Client AI] Échec initialisation modèle ${GEMINI_MODEL}:`, error);
        }

        if (!model) {
          return {
            success: true,
            message: this.getFallbackResponse(trimmedMessage)
          };
        }

        // Construire l'historique pour la session
        const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Compris. Je suis Lumo, prêt à aider sur vos commandes SAGE et aussi à répondre à vos questions générales sur les équipements industriels !' }] }
        ];

        // Ajouter l'historique de conversation existant
        for (const msg of conversationHistory.slice(-6)) {
          history.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }

        chatSession = model.startChat({ history });
        chatSessions.set(userContext.userId, {
          session: chatSession,
          lastActivity: Date.now()
        });
      }

      // 6. Envoyer le message et obtenir la réponse
      const result = await chatSession.sendMessage(enhancedMessage);
      const response = result.response.text();

      if (!response) {
        return {
          success: true,
          message: this.getFallbackResponse(trimmedMessage)
        };
      }

      return {
        success: true,
        message: response
      };

    } catch (error) {
      console.error('[Client AI] Erreur:', error);

      // En cas d'erreur, utiliser le fallback
      return {
        success: true,
        message: this.getFallbackResponse(message)
      };
    }
  },

  /**
   * Réinitialise la session de chat d'un utilisateur
   */
  clearSession(userId: string): void {
    chatSessions.delete(userId);
  },

  /**
   * Réponse de secours si l'API n'est pas disponible
   */
  getFallbackResponse(message: string): string {
    const input = message.toLowerCase();

    // Vérifier la knowledge base
    const kbResponse = checkKnowledgeBase(message);
    if (kbResponse) return kbResponse;

    // Commandes/livraisons
    if (input.includes('commande') || input.includes('livraison') || input.includes('suivi')) {
      return "📦 **Suivi de commande** - Je m'en occupe !\n\n**Pour voir votre commande :**\n1. Allez dans **\"Mes commandes\"**\n2. Cliquez sur la commande\n3. Tout le suivi est là (BC, BL, FA)\n\nVous cherchez une commande en particulier ?";
    }

    // Technique
    if (input.includes('panne') || input.includes('marche pas') || input.includes('fonctionne pas')) {
      return "🔧 **Mode dépannage activé !**\n\nVérifions ensemble :\n\n1. ⚡ **Alimentation** - L'appareil est bien branché ?\n2. 🔄 **Redémarrage** - Avez-vous essayé off/on ?\n3. 🚨 **Voyants/Codes** - Y a-t-il des messages d'erreur ?\n\nDites-moi ce qui se passe !";
    }

    // Facturation
    if (input.includes('facture') || input.includes('paiement')) {
      return "💰 **Questions facturation** - Je gère !\n\n• **Factures** → Disponibles dans \"Mes commandes\" (PDF)\n• **Avoir** → Visible sur votre espace client\n• **Remboursement** → Traité sous 5-10 jours\n\nQuel document cherchez-vous ?";
    }

    // Ticket
    if (input.includes('ticket') || input.includes('créer')) {
      return "Parfait, je vous guide ! 📝\n\n**Pour créer votre ticket :**\n1. Menu → **\"Nouveau ticket\"**\n2. Choisissez le type de demande\n3. Décrivez votre situation\n\n💡 Plus vous êtes précis, plus la réponse sera rapide !";
    }

    // Réponse par défaut
    return "Hmm, laissez-moi reformuler pour bien vous aider ! 🤔\n\n**Mes domaines d'expertise :**\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n• 🌐 **Questions générales** - Équipements industriels, conseils\n\nPouvez-vous me donner plus de détails ?";
  },

  /**
   * Génère un résumé de conversation pour créer un ticket
   */
  async generateTicketSummary(
    conversationHistory: ConversationMessage[],
    userContext: UserContext
  ): Promise<{
    title: string;
    description: string;
    issueType: IssueType;
    priority: TicketPriority;
  }> {
    // Convertir l'historique en texte
    const conversationText = conversationHistory
      .map(m => `${m.role === 'user' ? 'Client' : 'Lumo'}: ${m.content}`)
      .join('\n');

    // Utiliser l'IA pour analyser et résumer si disponible
    if (genAI && GOOGLE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Analyse cette conversation entre un client et l'assistant LUMO de KLY Groupe (équipements industriels).
Génère un résumé structuré pour créer un ticket SAV.

CONVERSATION:
${conversationText}

CLIENT: ${userContext.customerName || userContext.email || 'Client'}

RÉPONDS UNIQUEMENT en JSON valide avec ce format exact (pas de markdown, pas de \`\`\`):
{
  "title": "Titre court et descriptif du problème (max 80 caractères)",
  "description": "Description détaillée incluant le contexte et les étapes déjà tentées",
  "issueType": "TECHNICAL" ou "DELIVERY" ou "BILLING" ou "OTHER",
  "priority": "LOW" ou "MEDIUM" ou "HIGH" ou "URGENT"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Nettoyer la réponse (enlever les éventuels backticks markdown)
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          title: parsed.title || 'Demande de support',
          description: parsed.description || conversationText,
          issueType: (['TECHNICAL', 'DELIVERY', 'BILLING', 'OTHER'].includes(parsed.issueType)
            ? parsed.issueType
            : 'OTHER') as IssueType,
          priority: (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(parsed.priority)
            ? parsed.priority
            : 'MEDIUM') as TicketPriority
        };
      } catch (error) {
        console.warn('[Client AI] Erreur génération résumé ticket:', error);
      }
    }

    // Fallback: analyse manuelle basique
    const lastUserMessages = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(' ');

    const lowerText = lastUserMessages.toLowerCase();

    // Détecter le type de problème
    let issueType: IssueType = 'OTHER';
    if (lowerText.includes('panne') || lowerText.includes('erreur') || lowerText.includes('marche pas') || lowerText.includes('technique')) {
      issueType = 'TECHNICAL';
    } else if (lowerText.includes('livraison') || lowerText.includes('colis') || lowerText.includes('retard')) {
      issueType = 'DELIVERY';
    } else if (lowerText.includes('facture') || lowerText.includes('paiement') || lowerText.includes('remboursement')) {
      issueType = 'BILLING';
    }

    // Détecter la priorité
    let priority: TicketPriority = 'MEDIUM';
    if (lowerText.includes('urgent') || lowerText.includes('bloqué') || lowerText.includes('arrêt')) {
      priority = 'HIGH';
    }

    return {
      title: lastUserMessages.slice(0, 80) || 'Demande de support client',
      description: `Conversation avec l'assistant LUMO:\n\n${conversationText}`,
      issueType,
      priority
    };
  },

  /**
   * Génère une réponse contextuelle après création du ticket
   */
  async generateContextualTicketResponse(
    conversationHistory: ConversationMessage[],
    ticketNumber: string,
    summary: { title: string; description: string; issueType: string; priority: string },
    userContext: UserContext
  ): Promise<string> {
    // Essayer de générer une réponse IA contextuelle
    if (genAI && GOOGLE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          }
        });

        const conversationText = conversationHistory
          .map(m => `${m.role === 'user' ? 'Client' : 'Lumo'}: ${m.content}`)
          .join('\n');

        const prompt = `Tu es Lumo, l'assistant IA de KLY Groupe (équipements industriels).
Un ticket SAV vient d'être créé pour le client suite à votre conversation.

CONVERSATION:
${conversationText}

TICKET CRÉÉ:
- Numéro: ${ticketNumber}
- Titre: ${summary.title}
- Type: ${summary.issueType}
- Priorité: ${summary.priority}
- Client: ${userContext.customerName || 'Client'}

GÉNÈRE une réponse personnalisée et utile qui:
1. Confirme la création du ticket avec le numéro
2. Résume CE QUE TU AS COMPRIS du problème du client (montre que tu as bien écouté)
3. Donne 1-2 conseils PRATIQUES et SPÉCIFIQUES liés à son problème (si c'est technique: vérifications à faire, si c'est livraison: comment suivre, etc.)
4. Explique les prochaines étapes (délai de réponse, où suivre le ticket)
5. Reste disponible pour d'autres questions

STYLE:
- Ton chaleureux et professionnel
- 150-200 mots maximum
- Utilise des emojis avec parcimonie (2-3 max)
- Utilise le markdown pour la mise en forme (**gras**, listes à puces)
- Sois SPÉCIFIQUE au problème du client, pas générique`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        if (response && response.length > 50) {
          return response;
        }
      } catch (error) {
        console.warn('[Client AI] Erreur génération réponse contextuelle:', error);
      }
    }

    // Fallback: réponse structurée basée sur le type de problème
    return this.generateFallbackTicketResponse(ticketNumber, summary, userContext);
  },

  /**
   * Génère une réponse de fallback basée sur le type de problème
   */
  generateFallbackTicketResponse(
    ticketNumber: string,
    summary: { title: string; issueType: string; priority: string },
    userContext: UserContext
  ): string {
    const customerName = userContext.customerName?.split(' ')[0] || 'Client';

    let specificAdvice = '';
    let emoji = '📋';

    switch (summary.issueType) {
      case 'TECHNICAL':
        emoji = '🔧';
        specificAdvice = `**En attendant notre réponse :**
• Vérifiez que l'équipement est bien alimenté et les connexions sont correctes
• Notez tout code erreur ou comportement anormal
• Si possible, prenez des photos du problème

Un technicien qualifié va analyser votre demande et vous proposera une solution adaptée.`;
        break;

      case 'DELIVERY':
        emoji = '📦';
        specificAdvice = `**En attendant notre réponse :**
• Vérifiez le statut de votre commande dans **"Mes commandes"**
• Si vous avez reçu un colis endommagé, conservez l'emballage et prenez des photos
• Le numéro de suivi (si disponible) peut vous aider à localiser votre colis

Notre équipe logistique va vérifier l'état de votre livraison.`;
        break;

      case 'BILLING':
        emoji = '💰';
        specificAdvice = `**En attendant notre réponse :**
• Vos factures sont disponibles en PDF dans **"Mes commandes"**
• Vérifiez les détails de la commande concernée
• Préparez les références des documents si vous en avez

Notre service comptabilité va traiter votre demande.`;
        break;

      default:
        emoji = '📋';
        specificAdvice = `**En attendant notre réponse :**
• Consultez la section **"Mes tickets"** pour suivre l'avancement
• Vous pouvez ajouter des informations complémentaires au ticket si nécessaire

Un membre de notre équipe va prendre en charge votre demande.`;
    }

    const priorityInfo = summary.priority === 'HIGH' || summary.priority === 'URGENT'
      ? '⚡ Votre demande est **prioritaire** et sera traitée en urgence.'
      : '📧 Vous recevrez une notification dès qu\'un technicien prendra en charge votre ticket.';

    return `${emoji} **Ticket ${ticketNumber} créé avec succès !**

${customerName}, j'ai bien enregistré votre demande concernant : **${summary.title}**

${specificAdvice}

---

${priorityInfo}

💡 Vous pouvez suivre l'avancement dans **"Mes tickets"** ou me poser d'autres questions ici !`;
  },

  /**
   * Crée un ticket SAV à partir de la conversation avec LUMO
   * L'Assistant IA KLY répond automatiquement dans les messages du ticket
   */
  async createTicketFromConversation(
    conversationHistory: ConversationMessage[],
    userContext: UserContext
  ): Promise<{ success: boolean; ticket?: { id: string; ticketNumber: string }; contextualResponse?: string; error?: string }> {
    try {
      if (!userContext.userId) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      if (conversationHistory.length < 2) {
        return { success: false, error: 'Conversation trop courte pour créer un ticket' };
      }

      // Générer le résumé du ticket
      const summary = await this.generateTicketSummary(conversationHistory, userContext);

      // Créer le ticket
      const ticket = await ticketService.createTicket(
        {
          title: summary.title,
          description: summary.description,
          issueType: summary.issueType,
          priority: summary.priority,
          tags: ['lumo', 'auto-generated']
        },
        userContext.userId
      );

      console.log(`[Client AI] Ticket créé: ${ticket.ticketNumber} pour ${userContext.email}`);

      // NOTE: L'Assistant IA KLY (ai.service.ts) répond automatiquement via triggerAIWelcome()
      // qui est appelé dans ticketService.createTicket() - pas besoin d'appeler AIService ici
      // Cela garantit que LUMO et l'Assistant IA KLY restent bien séparés :
      // - LUMO = widget chat client (client-ai.service.ts)
      // - Assistant IA KLY = réponses dans les tickets (ai.service.ts)

      // Générer une réponse contextuelle pour LUMO (confirmation de création)
      const ticketNumberStr = String(ticket.ticketNumber);
      const contextualResponse = await this.generateContextualTicketResponse(
        conversationHistory,
        ticketNumberStr,
        summary,
        userContext
      );

      return {
        success: true,
        ticket: {
          id: ticket.id,
          ticketNumber: ticketNumberStr
        },
        contextualResponse
      };

    } catch (error) {
      console.error('[Client AI] Erreur création ticket:', error);
      return {
        success: false,
        error: 'Impossible de créer le ticket. Veuillez réessayer.'
      };
    }
  }
};

export default ClientAIService;
