#!/bin/bash
# ============================================
# Script de sauvegarde automatique - KLY SAV
# ============================================
# Usage: ./backup.sh
# Cron: 0 2 * * * /opt/kly-sav/scripts/backup.sh

set -e

# Configuration
BACKUP_DIR="/opt/kly-sav/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="kly-sav-db"
DB_NAME="kly_sav"
DB_USER="kly_user"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Créer le répertoire de backup
mkdir -p "$BACKUP_DIR"

log "Démarrage de la sauvegarde..."

# ============================================
# 1. Sauvegarde PostgreSQL
# ============================================
log "Sauvegarde de la base de données PostgreSQL..."

BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Base de données sauvegardée: $BACKUP_FILE ($SIZE)"
else
    error "Échec de la sauvegarde de la base de données"
    exit 1
fi

# ============================================
# 2. Sauvegarde des uploads
# ============================================
log "Sauvegarde des fichiers uploadés..."

UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$DATE.tar.gz"

docker run --rm \
    -v kly-sav_uploads_data:/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf /backup/uploads_backup_$DATE.tar.gz -C /data .

if [ -f "$UPLOADS_BACKUP" ]; then
    SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
    log "Uploads sauvegardés: $UPLOADS_BACKUP ($SIZE)"
else
    warn "Pas de fichiers uploads à sauvegarder"
fi

# ============================================
# 3. Nettoyage des anciennes sauvegardes
# ============================================
log "Nettoyage des sauvegardes de plus de $RETENTION_DAYS jours..."

DELETED=$(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED" -gt 0 ]; then
    log "$DELETED ancienne(s) sauvegarde(s) supprimée(s)"
fi

# ============================================
# 4. Résumé
# ============================================
log "============================================"
log "Sauvegarde terminée avec succès!"
log "============================================"
log "Fichiers créés:"
ls -lh "$BACKUP_DIR"/*_$DATE* 2>/dev/null || true
log "============================================"
log "Espace disque utilisé par les backups:"
du -sh "$BACKUP_DIR"
log "============================================"

# Optionnel: Notification par email ou webhook
# curl -X POST "https://hooks.slack.com/services/XXX" \
#     -H 'Content-type: application/json' \
#     -d '{"text":"✅ Backup KLY SAV terminé avec succès"}'
