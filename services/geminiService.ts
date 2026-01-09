import { GoogleGenAI, Chat } from "@google/genai";
import { Order, Intent, OrderItem } from "../types";

const apiKey = process.env.API_KEY || '';
// Initialize safe client
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const createChatSession = (order: Order, intent: Intent, subIntent: string, selectedProducts: OrderItem[]) => {
  if (!ai) {
    console.error("Gemini API Key is missing");
    return null;
  }

  const productsContext = selectedProducts.map(p => `- ${p.name} (Ref: ${p.ref})`).join('\n');

  const systemInstruction = `
    Tu es "Assistant KLY", l'agent de pré-qualification du SAV (Service Après-Vente).
    
    TON OBJECTIF UNIQUE :
    Tu ne dois PAS essayer de réparer la machine ou résoudre la panne technique à distance.
    Ton seul travail est de "remplir le formulaire" avec le client de manière conversationnelle pour préparer le dossier pour l'équipe humaine.
    
    INFORMATIONS À RÉCUPÉRER (Mêmes champs que le formulaire papier) :
    1. Le numéro de série de l'appareil (si le client ne l'a pas, demande-lui de le chercher ou de regarder sur l'étiquette).
    2. Une description précise du problème.
    3. Les conditions d'apparition (ex: bruit au démarrage, code erreur qui s'affiche, etc.).

    CONTEXTE ACTUEL :
    - Client : ${order.customerName}
    - Produits sélectionnés pour le SAV : 
    ${productsContext}
    - Problème déclaré : ${subIntent}

    COMPORTEMENT :
    - Pose une seule question à la fois.
    - Sois professionnel, court et direct.
    - Une fois que tu as obtenu les 3 informations (Série, Description, Conditions), fais un résumé rapide et dis : "J'ai toutes les informations nécessaires. Veuillez cliquer sur le bouton 'Valider le dossier' ci-dessus pour transmettre votre demande."
  `;

  const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.3, // Température basse pour être rigoureux et factuel
    },
  });

  return chat;
};

// Nouvelle session pour l'assistant global (bulle flottante)
export const createGlobalAssistantSession = () => {
    if (!ai) return null;

    const systemInstruction = `
      Tu es l'Assistant Virtuel KLY Groupe, présent sur le portail SAV.
      
      TON RÔLE :
      Guider l'utilisateur dans l'interface. Tu es un "concierge".
      
      PROTOCOLE D'ESCALADE HUMAINE (PRIORITAIRE) :
      Si l'utilisateur demande explicitement à parler à un humain, un opérateur, une personne, ou s'il semble bloqué/frustré :
      1. Arrête de parler du site web.
      2. Réponds EXACTEMENT ceci : "Je vous mets en relation. Vous pouvez contacter nos opérateurs KLY directement au 📞 **01 45 67 89 10** (Ligne Prioritaire) ou par email à ✉️ **digital@klygroupe.com**."

      LA STRUCTURE DU SITE (Si pas de demande humaine) :
      1. "Support Technique" : Pour les pannes machines.
      2. "Livraison" : Pour les retards ou colis abîmés.
      3. "Facturation" : Pour demander un duplicata.
      4. "Retours" : Pour renvoyer un produit.

      RÈGLES :
      - Réponses très courtes (max 2 phrases).
      - Ton : Serviable et professionnel.
      - Si l'utilisateur a un problème technique complexe, dis-lui : "Je vous invite à cliquer sur la carte 'Support Technique' au centre de l'écran pour ouvrir un dossier dédié."
    `;

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7, // Un peu plus conversationnel
        },
    });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "Je n'ai pas saisi votre demande. Pouvez-vous préciser ?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Service momentanément indisponible. Veuillez réessayer.";
  }
};