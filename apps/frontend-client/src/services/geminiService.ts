import { GoogleGenerativeAI, ChatSession, Content } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// System prompt for industrial SAV context
const SYSTEM_PROMPT = `Tu es un assistant virtuel expert pour le Service Après-Vente (SAV) industriel de KLY Groupe.

CONTEXTE:
- Tu aides les clients professionnels avec leurs équipements industriels
- Tu dois être précis, professionnel et efficace
- Tu parles français de manière formelle mais accessible

TES CAPACITÉS:
1. Diagnostic de pannes et dysfonctionnements
2. Guide de dépannage étape par étape
3. Informations sur les procédures de maintenance
4. Aide sur les commandes et livraisons
5. Questions sur la facturation

RÈGLES IMPORTANTES:
- Si tu ne peux pas résoudre le problème, suggère de créer un ticket
- Ne donne jamais d'informations techniques dangereuses
- Sois concis mais complet dans tes réponses
- Propose toujours des solutions pratiques
- Si le problème nécessite une intervention physique, oriente vers un ticket

TONALITÉ:
- Professionnel et courtois
- Empathique face aux problèmes
- Rassurant et confiant

FORMAT DE RÉPONSE:
- Utilise des listes à puces pour la clarté
- Propose des étapes numérotées pour les procédures
- Mets en évidence les points importants`;

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

    // Try different model names in order of preference
    const modelNames = ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

    for (const modelName of modelNames) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        this.chatSession = model.startChat({
          history: [{
            role: 'user',
            parts: [{ text: 'Tu es un assistant SAV industriel. ' + SYSTEM_PROMPT }]
          }, {
            role: 'model',
            parts: [{ text: 'Compris, je suis prêt à aider les clients du SAV KLY.' }]
          }],
          generationConfig: {
            maxOutputTokens: 1000,
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
      // Add context to the message
      let enhancedMessage = userMessage;
      if (context) {
        enhancedMessage = `[Contexte: ${context.orderNumber ? `Commande: ${context.orderNumber}` : ''} ${context.productName ? `Produit: ${context.productName}` : ''}]\n\n${userMessage}`;
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

  // Smart fallback that provides helpful responses without AI
  private getSmartFallbackResponse(userMessage: string): string {
    const input = userMessage.toLowerCase();

    // Greetings
    if (input.includes('bonjour') || input.includes('salut') || input.includes('hello') || input.includes('bonsoir')) {
      return "Bonjour ! Je suis l'assistant virtuel du SAV KLY. Comment puis-je vous aider aujourd'hui ?\n\nJe peux vous aider avec :\n- Les problèmes techniques\n- Les questions de livraison\n- La facturation\n- Créer un ticket de support";
    }

    // Thanks
    if (input.includes('merci') || input.includes('super') || input.includes('parfait')) {
      return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions. Je reste à votre disposition.";
    }

    // Human agent request
    if (input.includes('agent') || input.includes('humain') || input.includes('parler à quelqu')) {
      return "Je comprends que vous souhaitez parler à un agent. Pour une assistance personnalisée, je vous recommande de **créer un ticket**. Notre équipe vous répondra dans les plus brefs délais (généralement sous 24h).\n\n👉 Cliquez sur \"Créer un ticket\" dans le menu.";
    }

    // Ticket creation
    if (input.includes('créer') && input.includes('ticket')) {
      return "Pour créer un ticket :\n1. Cliquez sur **\"Nouveau ticket\"** dans le menu\n2. Sélectionnez le type de problème\n3. Décrivez votre situation\n4. Ajoutez des photos si nécessaire\n\nNotre équipe vous répondra rapidement !";
    }

    // Order/delivery tracking
    if (input.includes('commande') || input.includes('livraison') || input.includes('suivi') || input.includes('colis')) {
      return "Pour suivre votre commande :\n1. Accédez à **\"Mes commandes\"** dans le menu\n2. Cliquez sur la commande concernée\n3. Consultez le statut de livraison\n\nSi vous avez un problème de livraison (retard, colis endommagé), créez un ticket de type \"Livraison\".";
    }

    // Technical issues
    if (input.includes('panne') || input.includes('marche pas') || input.includes('fonctionne pas') || input.includes('problème technique')) {
      return "Pour un problème technique, voici les premières vérifications :\n\n1. **Alimentation** - Vérifiez que l'appareil est bien branché\n2. **Redémarrage** - Essayez d'éteindre et rallumer l'appareil\n3. **Voyants** - Notez les voyants allumés ou codes erreur\n\nSi le problème persiste, créez un ticket de type \"Technique\" avec une description détaillée.";
    }

    // Billing
    if (input.includes('facture') || input.includes('paiement') || input.includes('avoir') || input.includes('remboursement')) {
      return "Pour les questions de facturation :\n\n- **Factures** : Disponibles dans \"Mes commandes\" (téléchargement PDF)\n- **Avoir/Remboursement** : Créez un ticket de type \"Facturation\" avec le numéro de facture\n\nLes remboursements sont traités sous 5-10 jours ouvrés.";
    }

    // Default helpful response
    return "Je n'ai pas trouvé de réponse spécifique à votre question. Voici comment je peux vous aider :\n\n" +
      "📋 **Problème technique** - Diagnostic et dépannage\n" +
      "📦 **Livraison** - Suivi et réclamations\n" +
      "💰 **Facturation** - Factures et remboursements\n" +
      "🎫 **Ticket** - Créer une demande de support\n\n" +
      "Pouvez-vous préciser votre demande ou créer un ticket pour une assistance personnalisée ?";
  }

  private formatDiagnosticResponse(diagnostic: DiagnosticResult, originalQuery: string): string {
    const categoryLabels: Record<string, string> = {
      technical: 'Problème technique',
      delivery: 'Livraison',
      billing: 'Facturation'
    };

    let response = `Je comprends que vous rencontrez un problème de type **${categoryLabels[diagnostic.category] || diagnostic.category}**.\n\n`;

    response += `Voici les étapes à suivre :\n\n`;

    diagnostic.solutions.forEach((solution, index) => {
      response += `${index + 1}. ${solution}\n`;
    });

    if (diagnostic.needsTicket) {
      response += `\n---\n\n`;
      response += `Si ces étapes ne résolvent pas le problème, je vous recommande de **créer un ticket** pour qu'un de nos techniciens puisse vous assister.`;
    } else {
      response += `\n---\n\nCes informations devraient répondre à votre question. N'hésitez pas si vous avez besoin de précisions !`;
    }

    return response;
  }

  private getFallbackResponse(userMessage: string): string {
    const input = userMessage.toLowerCase();

    // Simple keyword matching for offline mode
    if (input.includes('bonjour') || input.includes('salut') || input.includes('hello')) {
      return "Bonjour ! Je suis l'assistant virtuel du SAV KLY. Comment puis-je vous aider aujourd'hui ?";
    }

    if (input.includes('merci')) {
      return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
    }

    if (input.includes('ticket') || input.includes('agent') || input.includes('humain')) {
      return "Je comprends que vous souhaitez parler à un agent. Vous pouvez créer un ticket et notre équipe vous répondra dans les plus brefs délais.";
    }

    return "Je comprends votre demande. Pour mieux vous aider, pourriez-vous me donner plus de détails sur votre problème ? Vous pouvez également créer un ticket pour une assistance personnalisée.";
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
export type { ChatMessage, DiagnosticResult };
