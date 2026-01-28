# Guide de Déploiement - KLY SAV

## Prérequis

- VPS Ubuntu 22.04+ (4 vCPU, 8 Go RAM recommandé)
- Docker et Docker Compose installés
- Nom de domaine configuré (DNS A records)

## 1. Installation sur le serveur

### 1.1 Connexion et préparation

```bash
# Se connecter au serveur
ssh user@votre-serveur

# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt install docker-compose-plugin -y

# Créer le répertoire de l'application
sudo mkdir -p /opt/kly-sav
sudo chown $USER:$USER /opt/kly-sav
```

### 1.2 Transférer les fichiers

```bash
# Depuis votre machine locale
scp -r . user@votre-serveur:/opt/kly-sav/
```

### 1.3 Configuration

```bash
cd /opt/kly-sav

# Copier et éditer le fichier d'environnement
cp .env.production.example .env.production

# Générer les secrets JWT
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"

# Éditer le fichier avec vos valeurs
nano .env.production
```

## 2. Configuration DNS

Créer les enregistrements DNS A suivants :

| Sous-domaine | Type | Valeur |
|--------------|------|--------|
| admin | A | IP_DU_SERVEUR |
| sav | A | IP_DU_SERVEUR |
| api | A | IP_DU_SERVEUR |

## 3. Configuration Nginx

```bash
# Remplacer YOUR_DOMAIN par votre domaine
sed -i 's/YOUR_DOMAIN/votredomaine/g' nginx/conf.d/kly-sav.conf
```

## 4. Certificats SSL (Let's Encrypt)

### 4.1 Premier lancement (HTTP uniquement)

```bash
# Créer une config temporaire sans SSL
cat > nginx/conf.d/temp.conf << 'EOF'
server {
    listen 80;
    server_name admin.votredomaine.com sav.votredomaine.com api.votredomaine.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
    }
}
EOF

# Lancer nginx temporairement
docker compose -f docker-compose.prod.yml up -d nginx
```

### 4.2 Obtenir les certificats

```bash
# Créer les répertoires
mkdir -p certbot/conf certbot/www

# Obtenir les certificats
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d admin.votredomaine.com \
  -d sav.votredomaine.com \
  -d api.votredomaine.com \
  --email votre@email.com \
  --agree-tos \
  --no-eff-email

# Supprimer la config temporaire
rm nginx/conf.d/temp.conf
```

## 5. Lancement

```bash
cd /opt/kly-sav

# Charger les variables d'environnement
export $(cat .env.production | grep -v '^#' | xargs)

# Construire et lancer tous les services
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier que tout fonctionne
docker compose -f docker-compose.prod.yml ps

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
```

## 6. Initialisation de la base de données

```bash
# Exécuter les migrations Prisma
docker exec kly-sav-backend npx prisma migrate deploy

# Créer le premier admin (optionnel - seed)
docker exec kly-sav-backend npx prisma db seed
```

## 7. Configuration des backups automatiques

```bash
# Rendre le script exécutable
chmod +x scripts/backup.sh

# Ajouter au cron (backup quotidien à 2h du matin)
crontab -e

# Ajouter cette ligne:
0 2 * * * /opt/kly-sav/scripts/backup.sh >> /var/log/kly-backup.log 2>&1
```

## 8. Commandes utiles

### Gestion des services

```bash
# Voir le statut
docker compose -f docker-compose.prod.yml ps

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Voir les logs d'un service
docker compose -f docker-compose.prod.yml logs -f backend

# Arrêter tous les services
docker compose -f docker-compose.prod.yml down

# Reconstruire et relancer
docker compose -f docker-compose.prod.yml up -d --build
```

### Base de données

```bash
# Accéder à PostgreSQL
docker exec -it kly-sav-db psql -U kly_user -d kly_sav

# Backup manuel
./scripts/backup.sh

# Restaurer un backup
./scripts/restore.sh 20240115_020000
```

### Mise à jour de l'application

```bash
cd /opt/kly-sav

# Récupérer les dernières modifications
git pull origin main

# Reconstruire et relancer
docker compose -f docker-compose.prod.yml up -d --build

# Exécuter les migrations si nécessaire
docker exec kly-sav-backend npx prisma migrate deploy
```

## 9. Monitoring

### Vérifier la santé des services

```bash
# Health check backend
curl http://localhost:3000/api/health

# Espace disque
df -h

# Utilisation mémoire
free -h

# Logs en temps réel
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

## 10. Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker compose -f docker-compose.prod.yml logs backend

# Vérifier la connexion à la base
docker exec kly-sav-backend npx prisma db push --dry-run
```

### Erreur de certificat SSL

```bash
# Renouveler manuellement
docker compose -f docker-compose.prod.yml run --rm certbot renew

# Recharger nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Base de données corrompue

```bash
# Restaurer le dernier backup
./scripts/restore.sh $(ls -t backups/db_backup_*.sql.gz | head -1 | sed 's/.*db_backup_//' | sed 's/.sql.gz//')
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                                │
│                    (Reverse Proxy)                           │
│                   Ports 80/443 SSL                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Admin    │  │  Client   │  │  Backend  │
│ Frontend  │  │ Frontend  │  │   API     │
│  (React)  │  │  (React)  │  │ (Node.js) │
└───────────┘  └───────────┘  └─────┬─────┘
                                    │
                      ┌─────────────┼─────────────┐
                      │             │             │
                      ▼             ▼             ▼
               ┌───────────┐ ┌───────────┐ ┌───────────┐
               │PostgreSQL │ │   Redis   │ │  Uploads  │
               │    DB     │ │  Cache    │ │  Volume   │
               └───────────┘ └───────────┘ └───────────┘
```

## Support

En cas de problème :
1. Vérifier les logs : `docker compose logs -f`
2. Vérifier l'espace disque : `df -h`
3. Vérifier la mémoire : `free -h`
4. Redémarrer les services : `docker compose restart`
