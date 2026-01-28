#!/bin/bash
# ============================================
# Script de restauration - KLY SAV
# ============================================
# Usage: ./restore.sh <backup_date>
# Exemple: ./restore.sh 20240115_020000

set -e

# Configuration
BACKUP_DIR="/opt/kly-sav/backups"
DB_CONTAINER="kly-sav-db"
DB_NAME="kly_sav"
DB_USER="kly_user"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Vérifier les arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Exemple: $0 20240115_020000"
    echo ""
    echo "Backups disponibles:"
    ls -la "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | awk '{print $NF}' | sed 's/.*db_backup_//' | sed 's/.sql.gz//'
    exit 1
fi

BACKUP_DATE=$1
DB_BACKUP="$BACKUP_DIR/db_backup_$BACKUP_DATE.sql.gz"
UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$BACKUP_DATE.tar.gz"

# Vérifier que le backup existe
if [ ! -f "$DB_BACKUP" ]; then
    error "Backup non trouvé: $DB_BACKUP"
fi

log "============================================"
log "RESTAURATION KLY SAV"
log "============================================"
log "Date du backup: $BACKUP_DATE"
warn "ATTENTION: Cette opération va écraser les données actuelles!"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
    log "Restauration annulée."
    exit 0
fi

# ============================================
# 1. Restauration PostgreSQL
# ============================================
log "Restauration de la base de données..."

# Arrêter les connexions actives
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();" 2>/dev/null || true

# Supprimer et recréer la base
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restaurer
gunzip -c "$DB_BACKUP" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

log "Base de données restaurée!"

# ============================================
# 2. Restauration des uploads (optionnel)
# ============================================
if [ -f "$UPLOADS_BACKUP" ]; then
    log "Restauration des fichiers uploadés..."

    docker run --rm \
        -v kly-sav_uploads_data:/data \
        -v "$BACKUP_DIR":/backup \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads_backup_$BACKUP_DATE.tar.gz -C /data"

    log "Uploads restaurés!"
else
    warn "Pas de backup des uploads trouvé pour cette date"
fi

# ============================================
# 3. Redémarrer les services
# ============================================
log "Redémarrage des services..."

cd /opt/kly-sav
docker compose -f docker-compose.prod.yml restart backend

log "============================================"
log "Restauration terminée avec succès!"
log "============================================"
