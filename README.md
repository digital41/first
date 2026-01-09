<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# KLY Groupe SAV - Plateforme Service Client

Plateforme SAV intelligente automatisée avec resolution autonome et assistance IA Gemini.

## Prerequis

Avant de commencer, assurez-vous d'avoir installe:

| Outil | Version | Lien de telechargement |
|-------|---------|------------------------|
| **Node.js** | v18+ (recommande v20+) | [nodejs.org](https://nodejs.org/) |
| **npm** | v9+ (inclus avec Node.js) | - |

### Verifier l'installation

```bash
node --version
npm --version
```

## Installation

### 1. Cloner ou telecharger le projet

```bash
cd "c:\Users\henriela\OneDrive - KLY GROUPE\Bureau\DEV"
```

### 2. Installer les dependances

```bash
npm install
```

Cette commande installe automatiquement:

| Package | Version | Description |
|---------|---------|-------------|
| react | ^19.2.1 | Framework UI |
| react-dom | ^19.2.1 | Rendu DOM React |
| @google/genai | ^1.33.0 | API Google Gemini AI |
| @emailjs/browser | 3.12.1 | Envoi d'emails cote client |
| lucide-react | ^0.560.0 | Bibliotheque d'icones |
| vite | ^6.2.0 | Bundler et serveur de dev |
| typescript | ~5.8.2 | Langage type |

### 3. Configurer les variables d'environnement

Copiez le fichier d'exemple et configurez vos cles:

```bash
copy .env.example .env.local
```

Editez le fichier `.env.local` avec vos propres valeurs:

```env
# API Gemini (OBLIGATOIRE)
VITE_GEMINI_API_KEY=votre_cle_api_gemini

# EmailJS Configuration (pour l'envoi d'emails)
VITE_EMAILJS_SERVICE_ID=votre_service_id
VITE_EMAILJS_TEMPLATE_ID=votre_template_id
VITE_EMAILJS_PUBLIC_KEY=votre_public_key

# Admin Configuration
VITE_ADMIN_PASSWORD=votre_mot_de_passe_admin

# API Backend (optionnel)
VITE_API_URL=http://localhost:3000/api
```

### 4. Obtenir les cles API

#### Cle API Google Gemini (obligatoire)
1. Allez sur [Google AI Studio](https://ai.google.dev/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Get API Key"
4. Copiez la cle dans `VITE_GEMINI_API_KEY`

#### Configuration EmailJS (optionnel)
1. Creez un compte sur [EmailJS](https://www.emailjs.com/)
2. Configurez un service email (Gmail, Outlook, etc.)
3. Creez un template d'email
4. Recuperez vos identifiants dans le dashboard

## Commandes disponibles

```bash
# Demarrer le serveur de developpement (port 3000)
npm run dev

# Construire pour la production
npm run build

# Previsualiser la version de production
npm run preview
```

## Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur:
- Local: http://localhost:3000
- Reseau: http://votre-ip:3000

## Structure du projet

```
DEV/
├── components/           # Composants React
│   ├── AdminDashboard.tsx
│   ├── AuthContextual.tsx
│   ├── DecisionTree.tsx
│   ├── EscalationForm.tsx
│   ├── ErrorBoundary.tsx
│   ├── GlobalAssistant.tsx
│   ├── KLYChatbot.tsx
│   ├── ProductSelector.tsx
│   ├── SelfService.tsx
│   ├── SubDecision.tsx
│   └── TicketLookup.tsx
├── services/             # Services API et IA
│   ├── api.ts
│   └── geminiService.ts
├── App.tsx               # Composant principal
├── index.tsx             # Point d'entree
├── index.html            # Template HTML
├── constants.ts          # Constantes
├── types.ts              # Types TypeScript
├── vite.config.ts        # Configuration Vite
├── tsconfig.json         # Configuration TypeScript
├── package.json          # Dependances npm
├── .env.local            # Variables d'environnement
└── README.md             # Ce fichier
```

## Technologies utilisees

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Build**: Vite 6
- **IA**: Google Gemini API
- **Email**: EmailJS
- **Icones**: Lucide React

## Resolution des problemes

### Erreur "VITE_GEMINI_API_KEY is not defined"
Verifiez que le fichier `.env.local` existe et contient la cle API.

### Erreur "npm install" echoue
```bash
# Nettoyer le cache npm
npm cache clean --force

# Supprimer node_modules et reinstaller
rm -rf node_modules
npm install
```

### Le port 3000 est deja utilise
Modifiez le port dans `vite.config.ts` ou arretez le processus utilisant ce port.

## Liens utiles

- [Documentation Vite](https://vitejs.dev/)
- [Documentation React](https://react.dev/)
- [Google AI Studio](https://ai.google.dev/)
- [EmailJS Documentation](https://www.emailjs.com/docs/)

---

**KLY Groupe** - Service Client Intelligent
