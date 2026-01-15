// ============================================
// SERVICE IA - Réponses automatiques avec OpenAI GPT
// ============================================

import { PrismaClient, IssueType, TicketPriority, TicketStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Type pour la réponse OpenAI
interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Configuration API OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface TicketContext {
  ticketId: string;
  ticketNumber: number;
  title: string;
  description?: string | null;
  issueType: IssueType;
  priority: TicketPriority;
  status: TicketStatus;
  customerName?: string | null;
  companyName?: string | null;
  contactEmail?: string | null;
  conversationHistory: Array<{
    role: 'customer' | 'agent' | 'ai';
    content: string;
    timestamp: string;
  }>;
}

interface AIResponse {
  success: boolean;
  message: string;
  shouldEscalate: boolean;
  confidence: number;
  suggestedActions?: string[];
  offerHumanHelp: boolean; // Proposer de parler à un humain après 2 échanges
  extractedInfo?: ExtractedEquipmentInfo; // Informations extraites de la conversation
}

// Informations équipement extraites par l'IA
interface ExtractedEquipmentInfo {
  serialNumber?: string;
  equipmentModel?: string;
  equipmentBrand?: string;
  errorCode?: string;
}

// Prompt système pour l'IA SAV
const SYSTEM_PROMPT = `Tu es l'assistant IA du service après-vente (SAV) de KLY GROUPE, une entreprise industrielle française.

CONTEXTE:
- Tu réponds aux demandes clients de manière professionnelle et efficace
- Tu dois essayer de résoudre les problèmes simples sans intervention humaine
- Tu dois collecter les informations nécessaires pour les problèmes complexes
- Tu dois être empathique et rassurant

RÈGLES IMPORTANTES:
1. Réponds TOUJOURS en français
2. Sois CONCIS (max 100 mots, 3-4 phrases)
3. Utilise un ton professionnel mais chaleureux
4. Si tu ne peux pas résoudre le problème, indique clairement que tu transfères à un agent
5. Propose des solutions concrètes quand possible
6. Pose UNE seule question si besoin de précision

TYPES DE PROBLÈMES:
- TECHNICAL: Problèmes techniques sur équipements/machines
- DELIVERY: Questions sur livraisons et commandes
- BILLING: Facturation, paiements, avoirs
- OTHER: Autres demandes

FORMAT DE RÉPONSE:
Réponds directement au client sans utiliser de balises ou de formatage spécial.
Termine par une question ou une action concrète quand approprié.`;

export const AIService = {
  /**
   * Génère une réponse IA pour un ticket
   */
  async generateResponse(context: TicketContext): Promise<AIResponse> {
    try {
      // Construire le prompt avec le contexte du ticket
      const userPrompt = this.buildUserPrompt(context);

      // Si pas de clé API, utiliser le fallback local
      if (!OPENAI_API_KEY) {
        console.log('⚠️ Pas de clé API OpenAI, utilisation du fallback local');
        return this.generateLocalResponse(context);
      }

      // Appel à l'API OpenAI
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Modèle rapide et intelligent
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API OpenAI:', errorData);
        return this.generateLocalResponse(context);
      }

      const data = await response.json() as OpenAIResponse;
      const aiMessage = data.choices?.[0]?.message?.content || '';

      // Analyser si on doit escalader
      const shouldEscalate = this.shouldEscalate(aiMessage, context);

      // Proposer un humain après 2 échanges client
      const customerMessages = context.conversationHistory.filter(m => m.role === 'customer').length;
      const offerHumanHelp = customerMessages >= 2;

      return {
        success: true,
        message: aiMessage,
        shouldEscalate,
        confidence: shouldEscalate ? 60 : 85,
        suggestedActions: this.extractSuggestedActions(aiMessage),
        offerHumanHelp,
      };
    } catch (error) {
      console.error('Erreur génération réponse IA:', error);
      return this.generateLocalResponse(context);
    }
  },

  /**
   * Construit le prompt utilisateur avec le contexte
   */
  buildUserPrompt(context: TicketContext): string {
    let prompt = `TICKET #${context.ticketNumber}
Type: ${this.getIssueTypeLabel(context.issueType)}
Priorité: ${this.getPriorityLabel(context.priority)}
Statut: ${context.status}

Client: ${context.customerName || context.companyName || 'Client'}
${context.contactEmail ? `Email: ${context.contactEmail}` : ''}

SUJET: ${context.title}
${context.description ? `\nDESCRIPTION:\n${context.description}` : ''}`;

    if (context.conversationHistory.length > 0) {
      prompt += '\n\nHISTORIQUE DE LA CONVERSATION:';
      for (const msg of context.conversationHistory.slice(-5)) { // Derniers 5 messages
        const role = msg.role === 'customer' ? 'CLIENT' : msg.role === 'ai' ? 'IA' : 'AGENT';
        prompt += `\n\n[${role}]: ${msg.content}`;
      }
    }

    prompt += '\n\nGénère une réponse appropriée pour le client.';

    return prompt;
  },

  /**
   * Génère une réponse locale si pas d'API
   */
  generateLocalResponse(context: TicketContext): AIResponse {
    const customerName = context.customerName?.split(' ')[0] || '';
    const greeting = customerName ? `Bonjour ${customerName}` : 'Bonjour';

    let message: string;
    let shouldEscalate = false;

    // Compter les messages du client pour proposer un humain
    const customerMessages = context.conversationHistory.filter(m => m.role === 'customer').length;

    // Si c'est le premier message
    if (context.conversationHistory.length === 0) {
      switch (context.issueType) {
        case 'TECHNICAL':
          message = `${greeting}, j'ai bien reçu votre demande technique. Pourriez-vous me préciser le modèle de l'équipement et le code d'erreur affiché si applicable ?`;
          break;

        case 'DELIVERY':
          message = `${greeting}, je vois que votre demande concerne une livraison. Pourriez-vous me communiquer votre numéro de commande (BC) ?`;
          break;

        case 'BILLING':
          message = `${greeting}, votre demande concerne la facturation. Pourriez-vous me préciser le numéro de facture concerné ?`;
          break;

        default:
          message = `${greeting}, j'ai bien reçu votre demande. Pourriez-vous me donner plus de détails pour que je puisse vous aider ?`;
      }
    } else {
      // Messages de suivi basés sur l'historique
      const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
      const lastContent = (lastMessage?.content || '').toLowerCase();

      // Analyser le contenu pour des réponses contextuelles
      if (lastContent.includes('urgent') || lastContent.includes('grave') || context.priority === 'URGENT') {
        message = `Je comprends l'urgence. Je transfère votre dossier à un technicien qui vous contactera rapidement.`;
        shouldEscalate = true;
      } else if (lastContent.includes('merci') || lastContent.includes('résolu') || lastContent.includes('fonctionne')) {
        message = `Parfait, je suis ravi d'avoir pu vous aider ! N'hésitez pas à nous recontacter. Bonne journée !`;
      } else if (lastContent.includes('ne fonctionne pas') || lastContent.includes('toujours') || lastContent.includes('persiste')) {
        message = `Je comprends que le problème persiste. Je transfère votre dossier à notre équipe technique qui vous contactera sous 24h.`;
        shouldEscalate = true;
      } else if (context.conversationHistory.length >= 3) {
        message = `Merci pour ces informations. Votre demande nécessite l'expertise d'un technicien. Je transfère votre dossier.`;
        shouldEscalate = true;
      } else {
        message = `Merci pour ces précisions. Pourriez-vous me confirmer vos disponibilités pour une éventuelle intervention ?`;
      }
    }

    return {
      success: true,
      message,
      shouldEscalate,
      confidence: shouldEscalate ? 60 : 80,
      offerHumanHelp: customerMessages >= 1, // Proposer après le 2ème message (1 échange complet)
    };
  },

  /**
   * Détermine si on doit escalader à un humain
   */
  shouldEscalate(message: string, context: TicketContext): boolean {
    const escalateKeywords = ['transfert', 'agent', 'technicien', 'humain', 'spécialiste', 'intervention'];
    const messageLower = message.toLowerCase();

    // Vérifier les mots-clés d'escalade dans la réponse
    if (escalateKeywords.some(kw => messageLower.includes(kw))) {
      return true;
    }

    // Escalader si trop d'échanges
    if (context.conversationHistory.length >= 4) {
      return true;
    }

    // Escalader pour les urgences
    if (context.priority === 'URGENT') {
      return true;
    }

    return false;
  },

  /**
   * Extrait les actions suggérées de la réponse
   */
  extractSuggestedActions(message: string): string[] {
    const actions: string[] = [];

    if (message.includes('redémarr')) actions.push('Redémarrage équipement');
    if (message.includes('photo') || message.includes('image')) actions.push('Demande photo');
    if (message.includes('numéro de série')) actions.push('Demande numéro série');
    if (message.includes('intervention')) actions.push('Planifier intervention');
    if (message.includes('transfert') || message.includes('technicien')) actions.push('Escalade agent');

    return actions;
  },

  /**
   * Sauvegarde une réponse IA comme message dans le ticket
   */
  async saveAIMessage(ticketId: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      // Créer un utilisateur IA système s'il n'existe pas
      let aiUser = await prisma.user.findFirst({
        where: { email: 'ai-assistant@kly-groupe.com' },
      });

      if (!aiUser) {
        aiUser = await prisma.user.create({
          data: {
            email: 'ai-assistant@kly-groupe.com',
            displayName: 'Assistant IA KLY',
            role: 'AGENT',
          },
        });
      }

      // Sauvegarder le message
      await prisma.chatMessage.create({
        data: {
          ticketId,
          authorId: aiUser.id,
          content,
          isInternal: false,
          readBy: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      // Mettre à jour le ticket si nécessaire (ex: statut)
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });

    } catch (error) {
      console.error('Erreur sauvegarde message IA:', error);
      throw error;
    }
  },

  /**
   * Récupère le contexte complet d'un ticket pour l'IA
   */
  async getTicketContext(ticketId: string): Promise<TicketContext | null> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { author: true },
          },
        },
      });

      if (!ticket) return null;

      const conversationHistory = ticket.messages.map(m => ({
        role: (m.author?.email === 'ai-assistant@kly-groupe.com' ? 'ai' :
               m.author?.role === 'CUSTOMER' ? 'customer' : 'agent') as 'customer' | 'agent' | 'ai',
        content: m.content,
        timestamp: m.createdAt.toISOString(),
      }));

      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        issueType: ticket.issueType,
        priority: ticket.priority,
        status: ticket.status,
        customerName: ticket.contactName || ticket.customer?.displayName,
        companyName: ticket.companyName,
        contactEmail: ticket.contactEmail || ticket.customer?.email,
        conversationHistory,
      };
    } catch (error) {
      console.error('Erreur récupération contexte ticket:', error);
      return null;
    }
  },

  // ============================================
  // EXTRACTION D'INFORMATIONS ÉQUIPEMENT
  // ============================================

  /**
   * Extrait les informations d'équipement de la conversation
   */
  extractEquipmentInfo(conversationHistory: Array<{ role: string; content: string }>): ExtractedEquipmentInfo {
    const allText = conversationHistory.map(m => m.content).join(' ').toLowerCase();
    const extracted: ExtractedEquipmentInfo = {};

    // Patterns pour numéro de série
    const serialPatterns = [
      /(?:numéro de série|n°\s*série|serial|sn)[:\s]*([A-Z0-9\-]{5,20})/gi,
      /(?:série|serial)[:\s]*([A-Z0-9\-]{5,20})/gi,
      /\b([A-Z]{2,3}[\-]?\d{4,}[\-]?[A-Z0-9]*)\b/g, // Format type SN-2024-ABC123
    ];

    for (const pattern of serialPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        extracted.serialNumber = match[1].toUpperCase();
        break;
      }
    }

    // Patterns pour code erreur
    const errorPatterns = [
      /(?:code\s*(?:d')?erreur|erreur|error)[:\s]*([A-Z0-9\-_]{2,15})/gi,
      /\b(E[\-_]?\d{2,4})\b/gi, // E-404, E_123
      /\b(ERR[\-_]?[A-Z0-9]{2,10})\b/gi, // ERR_MOTOR_01
    ];

    for (const pattern of errorPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        extracted.errorCode = match[1].toUpperCase();
        break;
      }
    }

    // Patterns pour modèle
    const modelPatterns = [
      /(?:modèle|model)[:\s]*([A-Z0-9\-\s]{3,30})/gi,
      /\b(KLY[\-\s]?\d{3,4}[\s]?(?:Pro|Plus|Max)?)\b/gi, // KLY-3000 Pro
    ];

    for (const pattern of modelPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        extracted.equipmentModel = match[1].trim();
        break;
      }
    }

    // Patterns pour marque
    const brandPatterns = [
      /(?:marque|brand)[:\s]*([A-Za-z\s]{2,20})/gi,
    ];

    for (const pattern of brandPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        extracted.equipmentBrand = match[1].trim();
        break;
      }
    }

    // Détecter si KLY est mentionné comme marque
    if (!extracted.equipmentBrand && /\bkly\b/i.test(allText)) {
      extracted.equipmentBrand = 'KLY';
    }

    return extracted;
  },

  /**
   * Met à jour le ticket avec les informations extraites
   */
  async updateTicketWithExtractedInfo(
    ticketId: string,
    extractedInfo: ExtractedEquipmentInfo
  ): Promise<boolean> {
    try {
      // Ne mettre à jour que les champs qui sont vides dans le ticket
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          serialNumber: true,
          equipmentModel: true,
          equipmentBrand: true,
          errorCode: true,
        },
      });

      if (!ticket) return false;

      const updateData: Partial<ExtractedEquipmentInfo> = {};

      // Ne remplir que les champs vides
      if (extractedInfo.serialNumber && !ticket.serialNumber) {
        updateData.serialNumber = extractedInfo.serialNumber;
      }
      if (extractedInfo.equipmentModel && !ticket.equipmentModel) {
        updateData.equipmentModel = extractedInfo.equipmentModel;
      }
      if (extractedInfo.equipmentBrand && !ticket.equipmentBrand) {
        updateData.equipmentBrand = extractedInfo.equipmentBrand;
      }
      if (extractedInfo.errorCode && !ticket.errorCode) {
        updateData.errorCode = extractedInfo.errorCode;
      }

      // Si rien à mettre à jour, retourner
      if (Object.keys(updateData).length === 0) {
        return false;
      }

      // Mettre à jour le ticket
      await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
      });

      console.log(`[AI] Informations extraites et sauvegardées pour ticket ${ticketId}:`, updateData);
      return true;
    } catch (error) {
      console.error('Erreur mise à jour ticket avec infos extraites:', error);
      return false;
    }
  },

  // Helpers
  getIssueTypeLabel(type: IssueType): string {
    const labels: Record<IssueType, string> = {
      TECHNICAL: 'Technique',
      DELIVERY: 'Livraison',
      BILLING: 'Facturation',
      OTHER: 'Autre',
    };
    return labels[type] || 'Autre';
  },

  getPriorityLabel(priority: TicketPriority): string {
    const labels: Record<TicketPriority, string> = {
      LOW: 'Basse',
      MEDIUM: 'Moyenne',
      HIGH: 'Haute',
      URGENT: 'Urgente',
    };
    return labels[priority] || 'Moyenne';
  },

  // ============================================
  // ASSISTANT IA POUR OPÉRATEURS
  // ============================================

  /**
   * Génère une suggestion de réponse pour l'opérateur
   */
  async generateOperatorSuggestion(context: TicketContext, operatorQuery?: string): Promise<{
    success: boolean;
    suggestion: string;
    draftResponse: string;
    keyPoints: string[];
    recommendedActions: string[];
    customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    urgencyAssessment: string;
  }> {
    try {
      const operatorPrompt = this.buildOperatorPrompt(context, operatorQuery);

      // Si pas de clé API, utiliser le fallback local
      if (!OPENAI_API_KEY) {
        console.log('⚠️ Pas de clé API OpenAI, utilisation du fallback local pour opérateur');
        return this.generateLocalOperatorSuggestion(context);
      }

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1000,
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: OPERATOR_ASSISTANT_PROMPT,
            },
            {
              role: 'user',
              content: operatorPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        return this.generateLocalOperatorSuggestion(context);
      }

      const data = await response.json() as OpenAIResponse;
      const aiContent = data.choices?.[0]?.message?.content || '';

      // Parser la réponse structurée
      return this.parseOperatorResponse(aiContent, context);
    } catch (error) {
      console.error('Erreur génération suggestion opérateur:', error);
      return this.generateLocalOperatorSuggestion(context);
    }
  },

  /**
   * Construit le prompt pour l'assistant opérateur
   */
  buildOperatorPrompt(context: TicketContext, operatorQuery?: string): string {
    let prompt = `TICKET #${context.ticketNumber}
Type: ${this.getIssueTypeLabel(context.issueType)}
Priorité: ${this.getPriorityLabel(context.priority)}
Statut: ${context.status}

Client: ${context.customerName || context.companyName || 'Client'}
${context.contactEmail ? `Email: ${context.contactEmail}` : ''}

SUJET: ${context.title}
${context.description ? `\nDESCRIPTION INITIALE:\n${context.description}` : ''}`;

    if (context.conversationHistory.length > 0) {
      prompt += '\n\nHISTORIQUE DE LA CONVERSATION:';
      for (const msg of context.conversationHistory.slice(-10)) {
        const role = msg.role === 'customer' ? 'CLIENT' : msg.role === 'ai' ? 'IA' : 'AGENT';
        prompt += `\n\n[${role}]: ${msg.content}`;
      }
    }

    if (operatorQuery) {
      prompt += `\n\nQUESTION DE L'OPÉRATEUR: ${operatorQuery}`;
    }

    prompt += '\n\nAnalyse ce ticket et fournis une aide structurée à l\'opérateur.';

    return prompt;
  },

  /**
   * Parse la réponse de l'IA pour l'opérateur
   */
  parseOperatorResponse(aiContent: string, context: TicketContext): {
    success: boolean;
    suggestion: string;
    draftResponse: string;
    keyPoints: string[];
    recommendedActions: string[];
    customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    urgencyAssessment: string;
  } {
    const lastCustomerMessage = context.conversationHistory
      .filter(m => m.role === 'customer')
      .slice(-1)[0]?.content.toLowerCase() || '';

    let customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' = 'neutral';
    if (lastCustomerMessage.includes('merci') || lastCustomerMessage.includes('super')) {
      customerSentiment = 'positive';
    } else if (lastCustomerMessage.includes('urgent') || lastCustomerMessage.includes('inadmissible') || lastCustomerMessage.includes('toujours pas')) {
      customerSentiment = 'frustrated';
    } else if (lastCustomerMessage.includes('problème') || lastCustomerMessage.includes('ne fonctionne pas')) {
      customerSentiment = 'negative';
    }

    const lines = aiContent.split('\n').filter(l => l.trim());
    const keyPoints: string[] = [];
    const recommendedActions: string[] = [];
    let draftResponse = '';
    const suggestion = aiContent;

    let currentSection = '';
    for (const line of lines) {
      if (line.includes('POINTS CLÉS') || line.includes('Points clés')) {
        currentSection = 'keyPoints';
      } else if (line.includes('ACTIONS') || line.includes('Actions recommandées')) {
        currentSection = 'actions';
      } else if (line.includes('RÉPONSE') || line.includes('Brouillon') || line.includes('BROUILLON')) {
        currentSection = 'draft';
      } else if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
        const point = line.replace(/^[-•\d.]\s*/, '').trim();
        if (currentSection === 'keyPoints') {
          keyPoints.push(point);
        } else if (currentSection === 'actions') {
          recommendedActions.push(point);
        }
      } else if (currentSection === 'draft' && line.trim()) {
        draftResponse += line + '\n';
      }
    }

    if (!draftResponse) {
      draftResponse = aiContent;
    }

    return {
      success: true,
      suggestion,
      draftResponse: draftResponse.trim(),
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Analyser la demande du client', 'Vérifier l\'historique', 'Proposer une solution'],
      recommendedActions: recommendedActions.length > 0 ? recommendedActions : this.getDefaultActions(context),
      customerSentiment,
      urgencyAssessment: this.assessUrgency(context),
    };
  },

  /**
   * Génère une suggestion locale pour l'opérateur (fallback)
   */
  generateLocalOperatorSuggestion(context: TicketContext): {
    success: boolean;
    suggestion: string;
    draftResponse: string;
    keyPoints: string[];
    recommendedActions: string[];
    customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    urgencyAssessment: string;
  } {
    const customerName = context.customerName?.split(' ')[0] || 'le client';
    const lastCustomerMessage = context.conversationHistory
      .filter(m => m.role === 'customer')
      .slice(-1)[0]?.content.toLowerCase() || '';

    let customerSentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' = 'neutral';
    if (lastCustomerMessage.includes('merci') || lastCustomerMessage.includes('super')) {
      customerSentiment = 'positive';
    } else if (lastCustomerMessage.includes('urgent') || lastCustomerMessage.includes('inadmissible')) {
      customerSentiment = 'frustrated';
    } else if (lastCustomerMessage.includes('problème') || lastCustomerMessage.includes('ne fonctionne pas')) {
      customerSentiment = 'negative';
    }

    const keyPoints: string[] = [];
    const recommendedActions: string[] = [];
    let draftResponse = '';
    let suggestion = '';

    switch (context.issueType) {
      case 'TECHNICAL':
        keyPoints.push(
          'Vérifier si le numéro de série est renseigné',
          'Demander le code erreur si applicable',
          'Vérifier la date de garantie'
        );
        recommendedActions.push(
          'Consulter la base de connaissances',
          'Vérifier si intervention sur site nécessaire',
          'Proposer un diagnostic à distance'
        );
        draftResponse = `Bonjour ${customerName},\n\nJe prends en charge votre demande technique. Afin de vous aider au mieux, pourriez-vous me confirmer :\n- Le modèle exact de l'équipement\n- Le code erreur affiché (si applicable)\n- Depuis quand le problème se produit\n\nJe reste à votre disposition.\n\nCordialement`;
        suggestion = 'Ticket technique - Collecte d\'informations nécessaire avant diagnostic';
        break;

      case 'DELIVERY':
        keyPoints.push(
          'Vérifier le numéro de commande',
          'Consulter le suivi de livraison',
          'Vérifier les coordonnées de livraison'
        );
        recommendedActions.push(
          'Contacter le service logistique',
          'Vérifier le statut dans Sage',
          'Proposer un nouveau créneau si nécessaire'
        );
        draftResponse = `Bonjour ${customerName},\n\nJe comprends votre demande concernant la livraison. Je vérifie immédiatement le statut de votre commande et reviens vers vous avec les informations précises.\n\nCordialement`;
        suggestion = 'Demande de suivi livraison - Vérifier le statut dans le système';
        break;

      case 'BILLING':
        keyPoints.push(
          'Vérifier le numéro de facture',
          'Consulter l\'historique des paiements',
          'Vérifier les conditions de paiement'
        );
        recommendedActions.push(
          'Consulter la comptabilité si nécessaire',
          'Vérifier les éventuels avoirs',
          'Clarifier les échéances'
        );
        draftResponse = `Bonjour ${customerName},\n\nJe prends note de votre demande concernant la facturation. Pourriez-vous me préciser le numéro de facture concerné afin que je puisse étudier votre dossier ?\n\nCordialement`;
        suggestion = 'Demande facturation - Identifier la facture concernée';
        break;

      default:
        keyPoints.push(
          'Identifier le type exact de demande',
          'Vérifier l\'historique client',
          'Qualifier le niveau d\'urgence'
        );
        recommendedActions.push(
          'Catégoriser correctement le ticket',
          'Transférer au service approprié si nécessaire'
        );
        draftResponse = `Bonjour ${customerName},\n\nJe vous remercie de nous avoir contactés. Pourriez-vous me donner plus de détails sur votre demande afin que je puisse vous orienter vers le service le plus approprié ?\n\nCordialement`;
        suggestion = 'Demande générale - Qualification nécessaire';
    }

    if (customerSentiment === 'frustrated') {
      draftResponse = `Bonjour ${customerName},\n\nJe comprends parfaitement votre frustration et je m'excuse pour cette situation. Soyez assuré(e) que je fais de cette demande une priorité et que je m'engage à vous apporter une solution dans les plus brefs délais.\n\n` + draftResponse.split('\n\n').slice(1).join('\n\n');
      recommendedActions.unshift('⚠️ Traiter en priorité - Client frustré');
    }

    return {
      success: true,
      suggestion,
      draftResponse,
      keyPoints,
      recommendedActions,
      customerSentiment,
      urgencyAssessment: this.assessUrgency(context),
    };
  },

  assessUrgency(context: TicketContext): string {
    if (context.priority === 'URGENT') {
      return '🔴 TRÈS URGENT - Traitement immédiat requis';
    }
    if (context.priority === 'HIGH') {
      return '🟠 Priorité haute - À traiter rapidement';
    }
    const customerMessages = context.conversationHistory.filter(m => m.role === 'customer');
    if (customerMessages.length >= 3) {
      return '🟡 Attention - Plusieurs échanges sans résolution';
    }
    return '🟢 Normal - Traitement standard';
  },

  /**
   * Génère un résumé intelligent de la conversation via IA
   */
  async generateConversationSummary(context: TicketContext): Promise<{
    success: boolean;
    summary: string;
    keyIssues: string[];
    customerMood: string;
    nextSteps: string[];
    resolutionProgress: number; // 0-100
  }> {
    try {
      // Si pas de messages, retourner un résumé par défaut
      if (context.conversationHistory.length === 0) {
        return {
          success: true,
          summary: `Nouveau ticket créé par ${context.customerName || 'le client'}. ${context.description || 'Aucune description fournie.'}`,
          keyIssues: ['Ticket en attente de premier contact'],
          customerMood: 'En attente',
          nextSteps: ['Prendre connaissance de la demande', 'Contacter le client'],
          resolutionProgress: 0,
        };
      }

      // Si pas de clé API OpenAI, utiliser le fallback local
      if (!OPENAI_API_KEY) {
        return this.generateLocalConversationSummary(context);
      }

      // Construire le prompt pour le résumé
      const summaryPrompt = this.buildSummaryPrompt(context);

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 800,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: CONVERSATION_SUMMARY_PROMPT,
            },
            {
              role: 'user',
              content: summaryPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error('Erreur API OpenAI pour résumé');
        return this.generateLocalConversationSummary(context);
      }

      const data = await response.json() as OpenAIResponse;
      const aiContent = data.choices?.[0]?.message?.content || '';

      // Parser la réponse structurée
      return this.parseSummaryResponse(aiContent, context);
    } catch (error) {
      console.error('Erreur génération résumé:', error);
      return this.generateLocalConversationSummary(context);
    }
  },

  /**
   * Construit le prompt pour le résumé de conversation
   */
  buildSummaryPrompt(context: TicketContext): string {
    let prompt = `TICKET #${context.ticketNumber}
Type: ${this.getIssueTypeLabel(context.issueType)}
Priorité: ${this.getPriorityLabel(context.priority)}
Statut: ${context.status}
Client: ${context.customerName || context.companyName || 'Client'}

SUJET: ${context.title}
`;

    if (context.description) {
      prompt += `\nDESCRIPTION INITIALE:\n${context.description}\n`;
    }

    prompt += '\nHISTORIQUE DE LA CONVERSATION:\n';
    context.conversationHistory.forEach((msg, idx) => {
      const role = msg.role === 'customer' ? '👤 CLIENT' : msg.role === 'ai' ? '🤖 IA' : '👨‍💼 AGENT';
      prompt += `\n[${idx + 1}] ${role}:\n${msg.content}\n`;
    });

    return prompt;
  },

  /**
   * Parse la réponse du résumé IA
   */
  parseSummaryResponse(aiContent: string, context: TicketContext): {
    success: boolean;
    summary: string;
    keyIssues: string[];
    customerMood: string;
    nextSteps: string[];
    resolutionProgress: number;
  } {
    // Extraire les sections de la réponse
    const summaryMatch = aiContent.match(/\*\*RÉSUMÉ:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    const issuesMatch = aiContent.match(/\*\*PROBLÈMES IDENTIFIÉS:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    const moodMatch = aiContent.match(/\*\*ÉTAT DU CLIENT:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    const stepsMatch = aiContent.match(/\*\*PROCHAINES ÉTAPES:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    const progressMatch = aiContent.match(/\*\*PROGRESSION:\*\*\s*(\d+)/i);

    const summary = summaryMatch && summaryMatch[1] ? summaryMatch[1].trim() : aiContent.slice(0, 300);

    const keyIssues = issuesMatch && issuesMatch[1]
      ? issuesMatch[1].split(/[-•]\s*/).filter((s: string) => s.trim()).map((s: string) => s.trim())
      : ['Analyse de la demande en cours'];

    const customerMood = moodMatch && moodMatch[1] ? moodMatch[1].trim() : 'Non déterminé';

    const nextSteps = stepsMatch && stepsMatch[1]
      ? stepsMatch[1].split(/[-•\d.]\s*/).filter((s: string) => s.trim()).map((s: string) => s.trim())
      : ['Continuer le suivi'];

    const resolutionProgress = progressMatch && progressMatch[1] ? parseInt(progressMatch[1]) : this.estimateProgress(context);

    return {
      success: true,
      summary,
      keyIssues: keyIssues.slice(0, 5),
      customerMood,
      nextSteps: nextSteps.slice(0, 4),
      resolutionProgress: Math.min(100, Math.max(0, resolutionProgress)),
    };
  },

  /**
   * Génère un résumé local (fallback sans API)
   */
  generateLocalConversationSummary(context: TicketContext): {
    success: boolean;
    summary: string;
    keyIssues: string[];
    customerMood: string;
    nextSteps: string[];
    resolutionProgress: number;
  } {
    const customerName = context.customerName || context.companyName || 'Le client';
    const customerMessages = context.conversationHistory.filter(m => m.role === 'customer');
    const agentMessages = context.conversationHistory.filter(m => m.role === 'agent');
    const aiMessages = context.conversationHistory.filter(m => m.role === 'ai');
    const lastCustomerMsg = customerMessages.slice(-1)[0]?.content.toLowerCase() || '';

    // Construire le résumé
    let summary = '';
    if (context.description) {
      summary = `${customerName} a soumis une demande ${this.getIssueTypeLabel(context.issueType).toLowerCase()}: "${context.description.slice(0, 100)}${context.description.length > 100 ? '...' : ''}"`;
    } else {
      summary = `${customerName} a ouvert un ticket ${this.getIssueTypeLabel(context.issueType).toLowerCase()}.`;
    }

    if (customerMessages.length > 0) {
      summary += ` La conversation compte ${customerMessages.length} message(s) du client`;
      if (aiMessages.length > 0) summary += `, ${aiMessages.length} réponse(s) de l'IA`;
      if (agentMessages.length > 0) summary += `, ${agentMessages.length} intervention(s) d'agent`;
      summary += '.';
    }

    const lastCustomerMsgObj = customerMessages.slice(-1)[0];
    if (lastCustomerMsgObj) {
      const lastMsg = lastCustomerMsgObj.content;
      summary += ` Dernier message: "${lastMsg.slice(0, 80)}${lastMsg.length > 80 ? '...' : ''}"`;
    }

    // Identifier les problèmes clés
    const keyIssues: string[] = [];
    if (context.issueType === 'TECHNICAL') {
      keyIssues.push('Problème technique signalé');
      if (lastCustomerMsg.includes('erreur') || lastCustomerMsg.includes('error')) {
        keyIssues.push('Code erreur mentionné');
      }
      if (lastCustomerMsg.includes('ne fonctionne pas') || lastCustomerMsg.includes('bloqué')) {
        keyIssues.push('Équipement non fonctionnel');
      }
    } else if (context.issueType === 'DELIVERY') {
      keyIssues.push('Question sur livraison');
    } else if (context.issueType === 'BILLING') {
      keyIssues.push('Demande facturation');
    }
    if (keyIssues.length === 0) keyIssues.push('Demande à qualifier');

    // Déterminer l'humeur
    let customerMood = 'Neutre';
    if (lastCustomerMsg.includes('merci') || lastCustomerMsg.includes('super') || lastCustomerMsg.includes('parfait')) {
      customerMood = '😊 Satisfait';
    } else if (lastCustomerMsg.includes('urgent') || lastCustomerMsg.includes('inadmissible') || lastCustomerMsg.includes('inacceptable')) {
      customerMood = '😤 Frustré - Attention requise';
    } else if (lastCustomerMsg.includes('problème') || lastCustomerMsg.includes('ne fonctionne pas')) {
      customerMood = '😟 Mécontent';
    } else if (customerMessages.length >= 3) {
      customerMood = '⏳ En attente - Relance recommandée';
    }

    // Prochaines étapes
    const nextSteps: string[] = [];
    if (agentMessages.length === 0 && aiMessages.length === 0) {
      nextSteps.push('Prendre en charge la demande');
    }
    if (context.status === 'OPEN' || context.status === 'REOPENED') {
      nextSteps.push('Répondre au client');
    }
    if (context.issueType === 'TECHNICAL') {
      nextSteps.push('Collecter les informations techniques (modèle, N° série)');
    }
    if (customerMood.includes('Frustré')) {
      nextSteps.unshift('⚠️ Traiter en priorité - Client frustré');
    }
    if (nextSteps.length === 0) nextSteps.push('Continuer le suivi');

    return {
      success: true,
      summary,
      keyIssues,
      customerMood,
      nextSteps,
      resolutionProgress: this.estimateProgress(context),
    };
  },

  /**
   * Estime la progression vers la résolution
   */
  estimateProgress(context: TicketContext): number {
    let progress = 10; // Base: ticket créé

    if (context.conversationHistory.length > 0) progress += 15; // Premier échange

    const agentMessages = context.conversationHistory.filter(m => m.role === 'agent');
    if (agentMessages.length > 0) progress += 25; // Agent impliqué

    if (context.status === 'IN_PROGRESS') progress += 20;
    if (context.status === 'WAITING_CUSTOMER') progress += 30;
    if (context.status === 'RESOLVED') progress = 90;
    if (context.status === 'CLOSED') progress = 100;

    // Bonus si infos collectées
    const allContent = context.conversationHistory.map(m => m.content).join(' ').toLowerCase();
    if (allContent.includes('numéro de série') || allContent.match(/[A-Z0-9]{10,}/)) progress += 5;
    if (allContent.includes('erreur') || allContent.includes('error')) progress += 5;

    return Math.min(progress, 100);
  },

  getDefaultActions(context: TicketContext): string[] {
    const actions: string[] = [];
    if (context.issueType === 'TECHNICAL') {
      actions.push('Consulter la documentation technique');
      actions.push('Vérifier les tickets similaires');
    }
    if (!context.conversationHistory.length) {
      actions.push('Premier contact - Accuser réception');
    } else {
      actions.push('Relire l\'historique avant de répondre');
    }
    if (context.priority === 'URGENT' || context.priority === 'HIGH') {
      actions.push('Traitement prioritaire');
    }
    return actions;
  },
};

// Prompt système pour le résumé de conversation
const CONVERSATION_SUMMARY_PROMPT = `Tu es un assistant IA qui génère des résumés exécutifs pour les opérateurs du SAV KLY GROUPE.

TON RÔLE:
- Résumer la conversation de manière claire et actionnable
- Identifier les problèmes clés du client
- Évaluer l'état émotionnel du client
- Suggérer les prochaines étapes
- Évaluer la progression vers la résolution

FORMAT DE RÉPONSE (utilise EXACTEMENT ces sections):

**RÉSUMÉ:**
[2-4 phrases résumant la situation: qui est le client, quel est son problème, où en est-on]

**PROBLÈMES IDENTIFIÉS:**
- [Point clé 1]
- [Point clé 2]
- [Point clé 3 si applicable]

**ÉTAT DU CLIENT:**
[Un mot ou phrase avec emoji: 😊 Satisfait / 😐 Neutre / 😟 Mécontent / 😤 Frustré / ⏳ En attente]

**PROCHAINES ÉTAPES:**
- [Action 1]
- [Action 2]
- [Action 3 si applicable]

**PROGRESSION:**
[Nombre de 0 à 100 représentant le % de résolution. 0=nouveau, 25=en cours de qualification, 50=diagnostic en cours, 75=solution proposée, 100=résolu]

RÈGLES:
1. Sois CONCIS et FACTUEL
2. Utilise les emojis pour l'état client uniquement
3. Les prochaines étapes doivent être ACTIONNABLES
4. Tout en français`;

// Prompt système pour l'assistant opérateur
const OPERATOR_ASSISTANT_PROMPT = `Tu es un assistant IA qui aide les opérateurs du SAV KLY GROUPE à traiter les tickets clients.

TON RÔLE:
- Analyser le ticket et l'historique de conversation
- Identifier les points clés du problème
- Suggérer des actions à l'opérateur
- Proposer un brouillon de réponse professionnelle

FORMAT DE RÉPONSE (utilise ces sections):

**ANALYSE:**
Résumé rapide de la situation (2-3 phrases)

**POINTS CLÉS:**
- Point 1
- Point 2
- Point 3

**ACTIONS RECOMMANDÉES:**
- Action 1
- Action 2

**BROUILLON DE RÉPONSE:**
[Réponse professionnelle à copier/adapter]

RÈGLES:
1. Sois concis et actionnable
2. Adapte le ton à l'état émotionnel du client
3. Identifie si une escalade est nécessaire
4. Suggère des informations manquantes à collecter
5. Tout en français`;

// ============================================
// ASSISTANT IA GLOBAL (pour dashboard)
// ============================================

// Prompt système pour l'assistant global
const GLOBAL_ASSISTANT_PROMPT = `Tu es l'assistant IA du SAV KLY GROUPE. Tu aides les opérateurs et superviseurs à gérer efficacement leurs tickets.

CONTEXTE:
Tu as accès aux statistiques et données des tickets en temps réel. Tu dois être conversationnel, utile et proactif.

CE QUE TU PEUX FAIRE:
- Analyser les tendances des tickets
- Identifier les tickets prioritaires ou à risque SLA
- Donner des conseils pour améliorer la productivité
- Aider à comprendre les statistiques
- Suggérer des actions pour les tickets spécifiques
- Répondre aux questions sur les processus SAV

RÈGLES IMPORTANTES:
1. Réponds TOUJOURS en français
2. Sois concis mais complet (max 150 mots)
3. Utilise des emojis pertinents pour rendre le texte lisible
4. Mets en **gras** les informations importantes
5. Si tu mentionnes des tickets, cite leur numéro avec #
6. Sois proactif : suggère des actions quand pertinent
7. Si tu ne peux pas aider, dis-le clairement

TON STYLE:
- Professionnel mais amical
- Direct et actionnable
- Toujours constructif`;

interface GlobalContext {
  totalTickets: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  slaBreached: number;
  urgentTickets: Array<{ ticketNumber: number; title: string; status: string; assignedTo?: string }>;
  recentTickets: Array<{ ticketNumber: number; title: string; status: string; priority: string; createdAt: string }>;
  unassignedCount: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Service pour l'assistant IA global (dashboard)
 */
export const GlobalAIAssistant = {
  /**
   * Génère une réponse conversationnelle basée sur le contexte global
   */
  async generateResponse(
    userMessage: string,
    context: GlobalContext,
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Construire le prompt avec le contexte
      const contextPrompt = this.buildContextPrompt(context);

      // Si pas de clé API, utiliser le fallback local
      if (!OPENAI_API_KEY) {
        console.log('⚠️ Pas de clé API OpenAI, utilisation du fallback local pour assistant global');
        return this.generateLocalResponse(userMessage, context);
      }

      // Construire les messages pour l'API
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: GLOBAL_ASSISTANT_PROMPT },
        { role: 'user', content: `CONTEXTE ACTUEL DU SAV:\n${contextPrompt}` },
      ];

      // Ajouter l'historique de conversation (max 6 derniers messages)
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }

      // Ajouter le message actuel
      messages.push({ role: 'user', content: userMessage });

      // Appel à l'API OpenAI
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 500,
          temperature: 0.7,
          messages,
        }),
      });

      if (!response.ok) {
        console.error('Erreur API OpenAI pour assistant global');
        return this.generateLocalResponse(userMessage, context);
      }

      const data = await response.json() as OpenAIResponse;
      const aiMessage = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      console.error('Erreur assistant global:', error);
      return this.generateLocalResponse(userMessage, context);
    }
  },

  /**
   * Construit le prompt de contexte avec les données réelles
   */
  buildContextPrompt(context: GlobalContext): string {
    let prompt = `📊 STATISTIQUES EN TEMPS RÉEL:
- Total tickets: ${context.totalTickets}
- Ouverts: ${context.byStatus.OPEN || 0}
- En cours: ${context.byStatus.IN_PROGRESS || 0}
- En attente client: ${context.byStatus.WAITING_CUSTOMER || 0}
- Résolus: ${context.byStatus.RESOLVED || 0}
- Fermés: ${context.byStatus.CLOSED || 0}

📈 PAR PRIORITÉ:
- Urgent: ${context.byPriority.URGENT || 0}
- Haute: ${context.byPriority.HIGH || 0}
- Moyenne: ${context.byPriority.MEDIUM || 0}
- Basse: ${context.byPriority.LOW || 0}

🔧 PAR TYPE:
- Technique: ${context.byType.TECHNICAL || 0}
- Livraison: ${context.byType.DELIVERY || 0}
- Facturation: ${context.byType.BILLING || 0}
- Autre: ${context.byType.OTHER || 0}

⚠️ ALERTES:
- SLA dépassés: ${context.slaBreached}
- Non assignés: ${context.unassignedCount}`;

    if (context.urgentTickets.length > 0) {
      prompt += '\n\n🔴 TICKETS URGENTS:';
      context.urgentTickets.slice(0, 5).forEach(t => {
        prompt += `\n- #${t.ticketNumber}: ${t.title.slice(0, 40)}... (${t.status}${t.assignedTo ? `, assigné à ${t.assignedTo}` : ', NON ASSIGNÉ'})`;
      });
    }

    if (context.recentTickets.length > 0) {
      prompt += '\n\n📋 TICKETS RÉCENTS:';
      context.recentTickets.slice(0, 5).forEach(t => {
        prompt += `\n- #${t.ticketNumber}: ${t.title.slice(0, 40)}... (${t.priority}, ${t.status})`;
      });
    }

    return prompt;
  },

  /**
   * Génère une réponse locale (fallback si pas d'API)
   */
  generateLocalResponse(userMessage: string, context: GlobalContext): { success: boolean; message: string } {
    const input = userMessage.toLowerCase();
    let response = '';

    // Analyse des mots-clés pour déterminer l'intention
    if (input.includes('urgent') || input.includes('priorit') || input.includes('critique')) {
      const urgentCount = context.byPriority.URGENT || 0;
      if (urgentCount === 0) {
        response = '✅ **Bonne nouvelle !** Aucun ticket urgent en attente actuellement. Continuez à surveiller les nouveaux tickets entrants.';
      } else {
        response = `🔴 **${urgentCount} ticket${urgentCount > 1 ? 's' : ''} urgent${urgentCount > 1 ? 's' : ''}** en cours.\n\n`;
        if (context.urgentTickets.length > 0) {
          response += 'Voici les plus critiques:\n';
          context.urgentTickets.slice(0, 3).forEach(t => {
            response += `• **#${t.ticketNumber}** - ${t.title.slice(0, 35)}...\n`;
          });
          response += '\n💡 Je recommande de les traiter en priorité absolue.';
        }
      }
    } else if (input.includes('sla') || input.includes('délai') || input.includes('retard')) {
      if (context.slaBreached === 0) {
        response = '✅ **Excellent !** Tous les SLA sont respectés. Continuez comme ça !';
      } else {
        response = `⚠️ **${context.slaBreached} SLA dépassé${context.slaBreached > 1 ? 's' : ''}**\n\nCes tickets nécessitent une attention immédiate pour limiter l'impact client.\n\n💡 **Conseil:** Priorisez ces tickets et informez les clients du délai.`;
      }
    } else if (input.includes('assign') || input.includes('affect') || input.includes('distribu')) {
      if (context.unassignedCount === 0) {
        response = '✅ **Parfait !** Tous les tickets sont assignés. La charge est bien répartie.';
      } else {
        response = `📋 **${context.unassignedCount} ticket${context.unassignedCount > 1 ? 's' : ''} non assigné${context.unassignedCount > 1 ? 's' : ''}**\n\n💡 **Action recommandée:** Utilisez l'auto-assignation ou répartissez manuellement selon la charge de chaque agent.`;
      }
    } else if (input.includes('stat') || input.includes('résumé') || input.includes('aperçu') || input.includes('situation')) {
      const openTickets = (context.byStatus.OPEN || 0) + (context.byStatus.REOPENED || 0);
      const inProgress = context.byStatus.IN_PROGRESS || 0;
      response = `📊 **Situation actuelle du SAV:**\n\n`;
      response += `• **${context.totalTickets}** tickets au total\n`;
      response += `• **${openTickets}** en attente de traitement\n`;
      response += `• **${inProgress}** en cours\n`;
      if (context.slaBreached > 0) {
        response += `• ⚠️ **${context.slaBreached}** SLA dépassés\n`;
      }
      if (context.unassignedCount > 0) {
        response += `• 📋 **${context.unassignedCount}** non assignés\n`;
      }
      response += '\n💡 Besoin de détails sur un aspect particulier ?';
    } else if (input.includes('conseil') || input.includes('recommand') || input.includes('améliorer') || input.includes('productiv')) {
      response = '💡 **Conseils pour améliorer la productivité:**\n\n';
      if (context.unassignedCount > 0) {
        response += `1. **Assignez** les ${context.unassignedCount} tickets en attente\n`;
      }
      if (context.slaBreached > 0) {
        response += `2. **Traitez en priorité** les ${context.slaBreached} tickets hors SLA\n`;
      }
      if ((context.byPriority.URGENT || 0) > 0) {
        response += `3. **Focus sur les urgents** (${context.byPriority.URGENT} en attente)\n`;
      }
      response += `4. Utilisez les **réponses prédéfinies** pour gagner du temps\n`;
      response += `5. **Documentez** les résolutions pour la base de connaissances`;
    } else if (input.includes('bonjour') || input.includes('salut') || input.includes('hello')) {
      const openTickets = (context.byStatus.OPEN || 0) + (context.byStatus.REOPENED || 0);
      response = `👋 **Bonjour !** Je suis là pour vous aider.\n\n`;
      response += `📊 Actuellement: **${openTickets}** tickets à traiter`;
      if (context.slaBreached > 0) {
        response += `, dont **${context.slaBreached}** hors SLA`;
      }
      response += `.\n\n`;
      response += `Que puis-je faire pour vous ?\n• Analyser les tickets urgents\n• Voir les SLA\n• Donner des conseils`;
    } else if (input.includes('merci') || input.includes('super') || input.includes('parfait')) {
      response = '😊 Avec plaisir ! N\'hésitez pas si vous avez d\'autres questions. Je suis là pour vous aider à être plus efficace.';
    } else if (input.includes('aide') || input.includes('help') || input.includes('quoi')) {
      response = `🤖 **Je peux vous aider avec:**\n\n`;
      response += `• **"situation"** - Vue d'ensemble du SAV\n`;
      response += `• **"urgents"** - Tickets prioritaires\n`;
      response += `• **"SLA"** - Analyse des délais\n`;
      response += `• **"assignation"** - Tickets non assignés\n`;
      response += `• **"conseils"** - Recommandations productivité\n\n`;
      response += `Ou posez-moi directement votre question !`;
    } else {
      // Réponse générique intelligente
      const openTickets = (context.byStatus.OPEN || 0) + (context.byStatus.REOPENED || 0);
      response = `Je comprends votre question. Voici ce que je peux vous dire:\n\n`;
      response += `📊 **${openTickets}** tickets en attente actuellement`;
      if (context.slaBreached > 0) {
        response += ` (dont ${context.slaBreached} hors SLA)`;
      }
      response += `.\n\n`;
      response += `💡 Essayez de me demander:\n• "situation" pour un résumé\n• "urgents" pour les priorités\n• "conseils" pour des recommandations`;
    }

    return { success: true, message: response };
  },

  /**
   * Récupère le contexte global depuis la base de données
   */
  async getGlobalContext(): Promise<GlobalContext> {
    const [
      totalTickets,
      byStatus,
      byPriority,
      byType,
      slaBreached,
      urgentTickets,
      recentTickets,
      unassignedCount,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({ by: ['status'], _count: true }),
      prisma.ticket.groupBy({ by: ['priority'], _count: true }),
      prisma.ticket.groupBy({ by: ['issueType'], _count: true }),
      prisma.ticket.count({ where: { slaBreached: true, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.ticket.findMany({
        where: { priority: 'URGENT', status: { notIn: ['CLOSED', 'RESOLVED'] } },
        select: {
          ticketNumber: true,
          title: true,
          status: true,
          assignedTo: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.ticket.findMany({
        where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
        select: {
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.ticket.count({ where: { assignedToId: null, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
    ]);

    return {
      totalTickets,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
      byType: Object.fromEntries(byType.map(t => [t.issueType, t._count])),
      slaBreached,
      urgentTickets: urgentTickets.map(t => ({
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        assignedTo: t.assignedTo?.displayName,
      })),
      recentTickets: recentTickets.map(t => ({
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
      unassignedCount,
    };
  },
};

export default AIService;
