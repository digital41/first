import { GoogleGenerativeAI, ChatSession, Content } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// System prompt for Lumo - VERSION FINALE OPTIMISÉE AVEC SAGE
const SYSTEM_PROMPT = `[IDENTITÉ]
Je suis Lumo, assistant IA de KLY Groupe (équipements industriels).

[STYLE]
- Ton: chaleureux, professionnel, empathique
- Langue: français uniquement
- Longueur: 2-4 phrases courtes, jamais plus de 80 mots
- Emojis: 1-2 max par message

[EXPERTISE]
Je peux aider sur: suivi commandes SAGE, problèmes techniques, création de tickets SAV.

[DONNÉES SAGE]
J'ai accès aux commandes du client (si fournies dans le contexte).
Je peux répondre sur: numéros de commande, montants, statuts, dates, articles commandés.
Si les données SAGE sont dans le contexte, je les utilise pour répondre précisément.
Si une info n'est pas dans le contexte fourni, je dis honnêtement que je ne l'ai pas.

[COMPORTEMENT]
1. Je réponds de façon CONCISE et COMPLÈTE
2. J'utilise les VRAIES données SAGE si disponibles
3. Je suis HONNÊTE si une info n'est pas disponible
4. Je termine TOUJOURS mes réponses proprement`;

// Interface pour le contexte SAGE
interface SageContext {
  orders?: Array<{
    orderNumber: string;
    status: string;
    totalAmount?: number;
    orderDate?: string;
    items?: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  customerName?: string;
  customerCode?: string;
}

// Knowledge base for common issues
const KNOWLEDGE_BASE = {
  technical: {
    powerIssues: {
      symptoms: ['ne démarre pas', 'pas d\'alimentation', 'voyant éteint', 'ne s\'allume pas'],
      solutions: [
        'Vérifiez que le câble d\'alimentation est correctement branché',
        'Contrôlez le disjoncteur ou fusible dédié',
        'Vérifiez que la prise électrique fonctionne avec un autre appareil',
        'Inspectez le câble d\'alimentation pour détecter d\'éventuels dommages',
        'Si le problème persiste, l\'alimentation interne peut être défectueuse'
      ],
      needsTicket: true,
      ticketPriority: 'HIGH'
    },
    overheating: {
      symptoms: ['surchauffe', 'trop chaud', 'température élevée', 'ventilateur bruyant'],
      solutions: [
        'Arrêtez immédiatement l\'équipement et laissez-le refroidir',
        'Vérifiez que les grilles de ventilation ne sont pas obstruées',
        'Nettoyez les filtres à air si présents',
        'Assurez-vous que l\'équipement n\'est pas exposé à une source de chaleur',
        'Vérifiez le bon fonctionnement du système de refroidissement'
      ],
      needsTicket: true,
      ticketPriority: 'URGENT'
    },
    errorCodes: {
      symptoms: ['code erreur', 'erreur', 'message d\'erreur', 'voyant rouge'],
      solutions: [
        'Notez le code erreur exact affiché',
        'Consultez le manuel utilisateur pour la signification',
        'Essayez un redémarrage complet de l\'équipement',
        'Vérifiez les connexions et câblages',
        'Si l\'erreur persiste, un diagnostic technique est nécessaire'
      ],
      needsTicket: true,
      ticketPriority: 'MEDIUM'
    },
    noise: {
      symptoms: ['bruit', 'bruyant', 'grincement', 'vibration', 'claquement'],
      solutions: [
        'Identifiez la source du bruit (moteur, ventilateur, etc.)',
        'Vérifiez que l\'équipement est stable et bien nivelé',
        'Inspectez les pièces mobiles pour détecter l\'usure',
        'Vérifiez le serrage des vis et fixations',
        'Un bruit anormal peut indiquer une usure nécessitant intervention'
      ],
      needsTicket: true,
      ticketPriority: 'MEDIUM'
    }
  },
  delivery: {
    delay: {
      symptoms: ['retard', 'en retard', 'pas reçu', 'livraison tardive'],
      solutions: [
        'Vérifiez le statut de votre commande dans votre espace client',
        'Le numéro de suivi vous permet de localiser votre colis',
        'Les délais peuvent être impactés par les conditions météo ou pics d\'activité',
        'Contactez-nous si le délai dépasse 48h la date prévue'
      ],
      needsTicket: false,
      ticketPriority: 'MEDIUM'
    },
    damaged: {
      symptoms: ['endommagé', 'cassé', 'abîmé', 'colis ouvert'],
      solutions: [
        'Photographiez immédiatement les dommages et l\'emballage',
        'Ne jetez pas l\'emballage, il servira de preuve',
        'Notez les dommages sur le bon de livraison si possible',
        'Créez un ticket avec les photos dans les 48h'
      ],
      needsTicket: true,
      ticketPriority: 'HIGH'
    },
    wrong: {
      symptoms: ['mauvais produit', 'erreur commande', 'pas le bon', 'article différent'],
      solutions: [
        'Vérifiez votre bon de commande pour confirmer l\'erreur',
        'Ne déballez pas le produit si possible',
        'Conservez tous les emballages d\'origine',
        'Nous procéderons à l\'échange sans frais'
      ],
      needsTicket: true,
      ticketPriority: 'HIGH'
    }
  },
  billing: {
    invoice: {
      symptoms: ['facture', 'facturation', 'document comptable'],
      solutions: [
        'Vos factures sont disponibles dans la section "Mes commandes"',
        'Vous pouvez les télécharger au format PDF',
        'Pour un duplicata, accédez à l\'historique des commandes',
        'Les factures sont envoyées par email à la validation de commande'
      ],
      needsTicket: false,
      ticketPriority: 'LOW'
    },
    refund: {
      symptoms: ['remboursement', 'avoir', 'crédit'],
      solutions: [
        'Les remboursements sont traités sous 5-10 jours ouvrés',
        'Vous recevrez un email de confirmation',
        'Le remboursement sera effectué sur le moyen de paiement initial',
        'Pour un avoir, il sera visible dans votre espace client'
      ],
      needsTicket: true,
      ticketPriority: 'MEDIUM'
    }
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DiagnosticResult {
  category: string;
  issue: string;
  solutions: string[];
  needsTicket: boolean;
  ticketPriority?: string;
  confidence: number;
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private chatSession: ChatSession | null = null;
  private chatHistory: ChatMessage[] = [];
  private isInitialized = false;

  constructor() {
    if (GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.genAI) {
      console.warn('Gemini API key not configured');
      return false;
    }

    // Try different model names in order of preference (based on Google's official model IDs)
    // gemini-3-flash-preview = Bleeding edge, gemini-2.5-flash = Stable/Production
    const modelNames = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const modelName of modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        this.chatSession = model.startChat({
          history: [{
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT }]
          }, {
            role: 'model',
            parts: [{ text: 'OK, je suis Lumo. Prêt à aider !' }]
          }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        });

        this.isInitialized = true;
        console.log(`Gemini initialized with model: ${modelName}`);
        return true;
      } catch (error) {
        console.warn(`Failed to initialize Gemini with model ${modelName}:`, error);
        continue;
      }
    }

    console.error('Failed to initialize Gemini with any model');
    return false;
  }

  // Analyze user input and find matching issues in knowledge base
  analyzeIssue(userInput: string): DiagnosticResult | null {
    const input = userInput.toLowerCase();
    let bestMatch: DiagnosticResult | null = null;
    let highestScore = 0;

    for (const [category, issues] of Object.entries(KNOWLEDGE_BASE)) {
      for (const [issueKey, issueData] of Object.entries(issues)) {
        const matchCount = issueData.symptoms.filter(symptom =>
          input.includes(symptom.toLowerCase())
        ).length;

        const score = matchCount / issueData.symptoms.length;

        if (score > highestScore && score > 0.2) {
          highestScore = score;
          bestMatch = {
            category,
            issue: issueKey,
            solutions: issueData.solutions,
            needsTicket: issueData.needsTicket,
            ticketPriority: issueData.ticketPriority,
            confidence: score
          };
        }
      }
    }

    return bestMatch;
  }

  // Generate response using Gemini AI
  async chat(userMessage: string, context?: {
    orderNumber?: string;
    productName?: string;
    previousIssues?: string[];
    sageData?: SageContext;
  }): Promise<string> {
    // First, check knowledge base for quick answers (lowered threshold for better local matching)
    const diagnostic = this.analyzeIssue(userMessage);

    if (diagnostic && diagnostic.confidence > 0.3) {
      // Match found in knowledge base - return structured response
      return this.formatDiagnosticResponse(diagnostic, userMessage);
    }

    // Try Gemini for complex queries (with fallback on failure)
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return this.getSmartFallbackResponse(userMessage);
      }
    }

    if (!this.chatSession) {
      return this.getSmartFallbackResponse(userMessage);
    }

    try {
      // Build enhanced message with SAGE context
      let enhancedMessage = userMessage;

      // Add SAGE data context if available
      if (context?.sageData) {
        const sageInfo: string[] = [];

        if (context.sageData.customerName) {
          sageInfo.push(`Client: ${context.sageData.customerName}`);
        }

        if (context.sageData.orders && context.sageData.orders.length > 0) {
          sageInfo.push(`\n📦 COMMANDES DU CLIENT (${context.sageData.orders.length} commandes):`);
          context.sageData.orders.slice(0, 10).forEach((order, i) => {
            sageInfo.push(`${i + 1}. ${order.orderNumber} - ${order.status} - ${order.totalAmount?.toFixed(2) || '?'}€ - ${order.orderDate || 'date inconnue'}`);
            if (order.items && order.items.length > 0) {
              order.items.slice(0, 3).forEach(item => {
                sageInfo.push(`   • ${item.productName} (x${item.quantity}) - ${item.unitPrice}€`);
              });
            }
          });
        }

        if (sageInfo.length > 0) {
          enhancedMessage = `[DONNÉES SAGE RÉELLES]\n${sageInfo.join('\n')}\n\n[QUESTION CLIENT]\n${userMessage}`;
        }
      } else if (context?.orderNumber) {
        enhancedMessage = `[Contexte: Commande ${context.orderNumber}]\n\n${userMessage}`;
      }

      const result = await this.chatSession.sendMessage(enhancedMessage);
      const response = result.response.text();

      // Store in history
      this.chatHistory.push(
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() }
      );

      return response;
    } catch (error: unknown) {
      // Handle rate limit errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        console.warn('Gemini rate limit reached, using fallback');
      } else {
        console.error('Gemini chat error:', error);
      }
      return this.getSmartFallbackResponse(userMessage);
    }
  }

  // Smart fallback that provides helpful responses without AI - Lumo persona
  private getSmartFallbackResponse(userMessage: string): string {
    const input = userMessage.toLowerCase();

    // Identity questions
    if (input.includes('qui es-tu') || input.includes('qui êtes-vous') || input.includes('c\'est quoi lumo') || input.includes('tu es qui')) {
      return "Je suis **Lumo** 🌟, l'agent IA autonome de KLY Groupe !\n\nJe suis là pour vous accompagner sur :\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n\nJe suis proactif, efficace et toujours là pour vous. Qu'est-ce que je peux faire pour vous ?";
    }

    // Greetings
    if (input.includes('bonjour') || input.includes('salut') || input.includes('hello') || input.includes('bonsoir')) {
      return "Hey ! 👋 C'est Lumo, votre agent IA KLY Groupe.\n\nJe suis prêt à vous aider sur :\n• 🛒 Questions **commerciales** (produits, prix)\n• 📦 **Suivi Sage** (commandes, livraisons)\n• 🔧 Support **technique** (dépannage, maintenance)\n\nAllez-y, dites-moi ce qui vous amène !";
    }

    // Thanks
    if (input.includes('merci') || input.includes('super') || input.includes('parfait') || input.includes('génial')) {
      return "Avec plaisir ! 😊 C'est mon job de vous faciliter la vie.\n\nN'hésitez pas si vous avez d'autres questions - je suis là 24/7 !";
    }

    // Human agent request
    if (input.includes('agent') || input.includes('humain') || input.includes('parler à quelqu') || input.includes('conseiller')) {
      return "Je comprends, parfois on a besoin de parler à un humain ! 🙂\n\nJe vais vous orienter vers l'équipe :\n\n1. **Créez un ticket** - Un technicien qualifié prendra le relais\n2. Tout notre échange sera transmis pour plus d'efficacité\n3. Réponse garantie sous **24h** (souvent plus rapide)\n\n👉 Voulez-vous que je prépare le ticket avec les infos de notre conversation ?";
    }

    // Ticket creation
    if (input.includes('créer') && input.includes('ticket')) {
      return "Parfait, je vous guide ! 📝\n\n**Pour créer votre ticket :**\n1. Menu → **\"Nouveau ticket\"**\n2. Choisissez le type de demande\n3. Décrivez votre situation\n4. Joignez des photos si utile\n\n💡 **Mon conseil** : Plus vous êtes précis, plus la réponse sera rapide !";
    }

    // Order/delivery tracking
    if (input.includes('commande') || input.includes('livraison') || input.includes('suivi') || input.includes('colis')) {
      return "📦 **Suivi de commande** - Je m'en occupe !\n\n**Pour voir votre commande :**\n1. Allez dans **\"Mes commandes\"**\n2. Cliquez sur la commande\n3. Tout le suivi est là (BC, BL, FA)\n\n**Un souci ?** Dites-moi :\n• Retard de livraison ?\n• Colis endommagé ?\n• Mauvais article ?\n\nJe suis là pour résoudre ça avec vous !";
    }

    // Technical issues
    if (input.includes('panne') || input.includes('marche pas') || input.includes('fonctionne pas') || input.includes('problème technique')) {
      return "🔧 **Mode dépannage activé !**\n\nAvant d'aller plus loin, vérifions ensemble :\n\n1. ⚡ **Alimentation** - L'appareil est bien branché ?\n2. 🔄 **Redémarrage** - On a essayé le classique off/on ?\n3. 🚨 **Voyants/Codes** - Il y a des messages d'erreur ?\n\nDonnez-moi plus de détails sur ce qui se passe, je vais analyser ça !";
    }

    // Error codes
    if (input.includes('code erreur') || input.includes('erreur') || input.includes('code e') || input.includes('erreur e')) {
      return "🔍 **Code erreur détecté !**\n\nDonnez-moi le code exact (ex: E01, ERR-42, etc.) et je vais :\n1. Vous expliquer ce qu'il signifie\n2. Vous guider pour le résoudre\n3. Vous dire si une intervention est nécessaire\n\nQuel est le code affiché ?";
    }

    // Billing
    if (input.includes('facture') || input.includes('paiement') || input.includes('avoir') || input.includes('remboursement')) {
      return "💰 **Questions facturation** - Je gère !\n\n• **Factures** → Disponibles dans \"Mes commandes\" (PDF)\n• **Avoir** → Visible sur votre espace client\n• **Remboursement** → Traité sous 5-10 jours\n\nVous cherchez une facture spécifique ? Donnez-moi le numéro de commande !";
    }

    // Products / Commercial
    if (input.includes('produit') || input.includes('prix') || input.includes('tarif') || input.includes('catalogue') || input.includes('disponible')) {
      return "🛒 **Questions commerciales** - Mon domaine !\n\nJe peux vous aider sur :\n• **Catalogue** - Trouver le bon produit\n• **Prix/Tarifs** - Infos tarifaires\n• **Disponibilité** - Stock et délais\n• **Recommandations** - Selon vos besoins\n\nQu'est-ce que vous recherchez exactement ?";
    }

    // Default helpful response - Lumo style
    return "Hmm, laissez-moi reformuler pour bien vous aider ! 🤔\n\n**Mes domaines d'expertise :**\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n\nPouvez-vous me donner plus de détails sur votre demande ?\n\n💡 Sinon, on peut toujours créer un **ticket** et un humain prendra le relais !";
  }

  private formatDiagnosticResponse(diagnostic: DiagnosticResult, originalQuery: string): string {
    const categoryLabels: Record<string, string> = {
      technical: '🔧 Problème technique',
      delivery: '📦 Livraison',
      billing: '💰 Facturation'
    };

    let response = `J'ai analysé votre situation - il s'agit d'un **${categoryLabels[diagnostic.category] || diagnostic.category}**.\n\n`;

    response += `**Voici mon plan d'action :**\n\n`;

    diagnostic.solutions.forEach((solution, index) => {
      response += `${index + 1}. ${solution}\n`;
    });

    if (diagnostic.needsTicket) {
      response += `\n---\n\n`;
      response += `💡 Si ça ne résout pas le souci, pas de panique ! On peut **créer un ticket** et un technicien prendra le relais avec tout le contexte de notre échange.`;
    } else {
      response += `\n---\n\n✅ Normalement, ça devrait résoudre votre problème. Dites-moi si vous avez besoin de plus de détails !`;
    }

    return response;
  }

  private getFallbackResponse(userMessage: string): string {
    const input = userMessage.toLowerCase();

    // Simple keyword matching for offline mode - Lumo persona
    if (input.includes('bonjour') || input.includes('salut') || input.includes('hello')) {
      return "Hey ! 👋 C'est Lumo. Comment puis-je vous aider ?";
    }

    if (input.includes('merci')) {
      return "Avec plaisir ! 😊 Je reste dispo si besoin !";
    }

    if (input.includes('ticket') || input.includes('agent') || input.includes('humain')) {
      return "Pas de souci ! Créez un ticket et un de nos experts vous contactera rapidement. 🎯";
    }

    return "Je suis Lumo ! 🌟 Donnez-moi plus de détails et je vais vous aider. Sinon, on peut créer un ticket ensemble !";
  }

  // Get suggestions based on user input
  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('panne') || lowerInput.includes('marche pas')) {
      suggestions.push('Mon équipement ne démarre plus');
      suggestions.push('J\'ai un code erreur');
      suggestions.push('Mon équipement fait un bruit anormal');
    }

    if (lowerInput.includes('livraison') || lowerInput.includes('commande')) {
      suggestions.push('Ma livraison est en retard');
      suggestions.push('J\'ai reçu un colis endommagé');
      suggestions.push('Ce n\'est pas le bon produit');
    }

    if (lowerInput.includes('facture') || lowerInput.includes('paiement')) {
      suggestions.push('Je cherche ma facture');
      suggestions.push('Je souhaite un remboursement');
      suggestions.push('Question sur le paiement');
    }

    return suggestions.slice(0, 3);
  }

  // Clear chat history
  clearHistory(): void {
    this.chatHistory = [];
    if (this.genAI && this.isInitialized) {
      this.initialize(); // Restart session
    }
  }

  // Get chat history
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  // Check if service is available
  isAvailable(): boolean {
    return !!GEMINI_API_KEY;
  }
}

export const geminiService = new GeminiService();
export default geminiService;
export type { ChatMessage, DiagnosticResult, SageContext };
