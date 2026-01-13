# KLY SAV Backend API

Backend Node.js/TypeScript pour le système de gestion SAV KLY Groupe.

## Stack Technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Node.js** | 18+ | Runtime JavaScript |
| **TypeScript** | 5.6 | Typage statique |
| **Express** | 4.21 | Framework HTTP |
| **Prisma** | 5.22 | ORM (PostgreSQL) |
| **JWT** | 9.0 | Authentification |
| **Zod** | 3.23 | Validation des données |
| **Helmet** | 8.0 | Sécurité HTTP |

## Structure des Dossiers

```
src/
├── config/           # Configuration (env, database)
├── controllers/      # Logique des endpoints HTTP
├── middlewares/      # Auth, validation, erreurs
├── routes/           # Définition des routes Express
├── services/         # Logique métier
├── types/            # Types TypeScript partagés
├── utils/            # Fonctions utilitaires
└── app.ts            # Point d'entrée
```

## Installation

```bash
# Installer les dépendances
npm install

# Copier et configurer l'environnement
cp .env.example .env

# Générer le client Prisma
npm run db:generate

# Créer les tables (développement)
npm run db:push

# Ou créer une migration (production)
npm run db:migrate

# Peupler avec des données de test
npm run db:seed
```

## Démarrage

```bash
# Développement (hot reload)
npm run dev

# Production
npm run build
npm start
```

## Endpoints API

### Santé
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | État complet de l'API |
| GET | `/api/health/ready` | Readiness probe (K8s) |
| GET | `/api/health/live` | Liveness probe (K8s) |

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion client (BC/PL/BL) |
| POST | `/api/auth/admin/login` | Connexion admin |
| POST | `/api/auth/refresh` | Rafraîchir les tokens |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Infos utilisateur (auth) |

### Tickets
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/tickets` | Créer un ticket |
| GET | `/api/tickets` | Lister les tickets (auth) |
| GET | `/api/tickets/:id` | Détail d'un ticket |
| PUT | `/api/tickets/:id` | Modifier un ticket (staff) |
| GET | `/api/tickets/stats` | Statistiques (staff) |

## Variables d'Environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://...` |
| `JWT_ACCESS_SECRET` | Secret JWT access (32+ chars) | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Secret JWT refresh (32+ chars) | `openssl rand -base64 64` |
| `CORS_ORIGIN` | Origines autorisées | `http://localhost:3000` |

## Comptes de Test (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@klygroupe.com | Admin@2024! |
| Agent | sav@klygroupe.com | Agent@2024! |

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Compilation TypeScript |
| `npm start` | Serveur de production |
| `npm run db:generate` | Génère le client Prisma |
| `npm run db:push` | Applique le schéma (dev) |
| `npm run db:migrate` | Crée une migration |
| `npm run db:studio` | Interface Prisma Studio |
| `npm run db:seed` | Données de test |
