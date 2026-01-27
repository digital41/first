// ============================================
// SERVICE IA CLIENT - Appels API sécurisés vers le backend
// ============================================
// Ce service communique avec le backend pour les fonctionnalités IA
// - Pas de clé API exposée côté client
// - Les données SAGE sont gérées côté serveur
// - Sécurité renforcée

import api from './api';

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

// Knowledge base pour réponses rapides côté client (optimisation UX)
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

class GeminiService {
  private chatHistory: ChatMessage[] = [];
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    // Le service est toujours disponible car il utilise le backend
    this.isInitialized = true;
    console.log('Client AI Service initialized (using backend API)');
    return true;
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

  // Generate response using backend API (secure)
  async chat(userMessage: string, context?: {
    orderNumber?: string;
    productName?: string;
    previousIssues?: string[];
  }): Promise<string> {
    // First, check knowledge base for quick answers (optimized UX)
    const diagnostic = this.analyzeIssue(userMessage);

    if (diagnostic && diagnostic.confidence > 0.4) {
      // High confidence match - return structured response immediately
      return this.formatDiagnosticResponse(diagnostic, userMessage);
    }

    // Call backend API for AI response
    try {
      const response = await api.post('/client/ai/chat', {
        message: userMessage,
        conversationHistory: this.chatHistory.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        })),
        context
      });

      if (response.data.success && response.data.data?.message) {
        const aiMessage = response.data.data.message;

        // Store in history
        this.chatHistory.push(
          { role: 'user', content: userMessage, timestamp: new Date() },
          { role: 'assistant', content: aiMessage, timestamp: new Date() }
        );

        return aiMessage;
      }

      // Fallback if API response is invalid
      return this.getSmartFallbackResponse(userMessage);

    } catch (error: unknown) {
      console.error('Error calling AI backend:', error);
      return this.getSmartFallbackResponse(userMessage);
    }
  }

  // Smart fallback that provides helpful responses without AI - Lumo persona
  private getSmartFallbackResponse(userMessage: string): string {
    const input = userMessage.toLowerCase();

    // Identity questions
    if (input.includes('qui es-tu') || input.includes('qui êtes-vous') || input.includes('c\'est quoi lumo') || input.includes('tu es qui')) {
      return "Je suis **Lumo** 🌟, l'agent IA autonome de KLY Groupe !\n\nJe suis là pour vous accompagner sur :\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n• 🌐 **Questions générales** - Équipements industriels, conseils\n\nQu'est-ce que je peux faire pour vous ?";
    }

    // Greetings
    if (input.includes('bonjour') || input.includes('salut') || input.includes('hello') || input.includes('bonsoir')) {
      return "Hey ! 👋 C'est Lumo, votre agent IA KLY Groupe.\n\nJe suis prêt à vous aider sur :\n• 🛒 Questions **commerciales** (produits, prix)\n• 📦 **Suivi Sage** (commandes, livraisons)\n• 🔧 Support **technique** (dépannage, maintenance)\n• 🌐 **Questions générales** sur l'industrie\n\nAllez-y, dites-moi ce qui vous amène !";
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
    return "Hmm, laissez-moi reformuler pour bien vous aider ! 🤔\n\n**Mes domaines d'expertise :**\n• 🛒 **Commercial** - Produits, tarifs, disponibilités\n• 📦 **Suivi Sage** - Commandes, livraisons, factures\n• 🔧 **Technique** - Dépannage, codes erreur, maintenance\n• 🌐 **Questions générales** - Équipements industriels, conseils\n\nPouvez-vous me donner plus de détails sur votre demande ?";
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
    // Also reset backend session
    api.post('/client/ai/reset').catch(() => {
      // Ignore errors - session will be recreated on next chat
    });
  }

  // Get chat history
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  // Check if service is available - always true since we use backend
  isAvailable(): boolean {
    return true;
  }

  // Create a ticket from the conversation
  async createTicket(): Promise<{
    success: boolean;
    ticketNumber?: string;
    contextualResponse?: string;
    error?: string
  }> {
    try {
      if (this.chatHistory.length < 2) {
        return {
          success: false,
          error: 'La conversation est trop courte pour créer un ticket'
        };
      }

      const response = await api.post('/client/ai/create-ticket', {
        conversationHistory: this.chatHistory.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      if (response.data.success && response.data.data) {
        return {
          success: true,
          ticketNumber: response.data.data.ticketNumber,
          // Réponse contextuelle générée par l'IA
          contextualResponse: response.data.data.contextualResponse
        };
      }

      return {
        success: false,
        error: response.data.error || 'Impossible de créer le ticket'
      };

    } catch (error: unknown) {
      console.error('Error creating ticket:', error);
      return {
        success: false,
        error: 'Erreur lors de la création du ticket'
      };
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
export type { ChatMessage, DiagnosticResult };
