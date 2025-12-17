const request = require('supertest');
const assert = require('assert');
const app = require('../index'); // Import the Express app

describe('GET /', () => {
  it('should return "Hello, My World!"', (done) => {
    request(app)
      .get('/')
      .expect(200)
      .end((err, res) => {
        assert.strictEqual(res.text, 'Hello, My World!');
        done(err);
      });
  });
});

#!/bin/bash

#############################################
# Script de purge avec monitoring d'espace
#############################################

# Configuration
TARGET_DIR="/apps/"
DAYS_OLD=90
LOGDIR="/var/log/cleanup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGFILE="$LOGDIR/cleanup_$TIMESTAMP.log"

# Création du répertoire de logs si nécessaire
mkdir -p "$LOGDIR"

# Fonction pour afficher et logger
log() {
    echo "$1" | tee -a "$LOGFILE"
}

# Fonction pour obtenir l'espace utilisé
get_space() {
    df -h "$TARGET_DIR" | awk 'NR==2 {print $3, $4, $5}'
}

# En-tête du log
log "============================================="
log "  Script de purge - $(date)"
log "============================================="
log "Répertoire cible : $TARGET_DIR"
log "Fichiers de plus de : $DAYS_OLD jours"
log ""

# Vérification que le répertoire existe
if [ ! -d "$TARGET_DIR" ]; then
    log "ERREUR : Le répertoire $TARGET_DIR n'existe pas!"
    exit 1
fi

# Capture de l'espace AVANT
log "--- ESPACE DISQUE AVANT LA PURGE ---"
SPACE_BEFORE=$(get_space)
log "Utilisé / Disponible / Utilisation%"
log "$SPACE_BEFORE"
log ""

# Liste des fichiers qui seront supprimés
log "--- ANALYSE DES FICHIERS À SUPPRIMER ---"
TEMP_LIST="$LOGDIR/files_to_delete_$TIMESTAMP.txt"
find "$TARGET_DIR" -mtime +$DAYS_OLD -ls > "$TEMP_LIST"

FILE_COUNT=$(wc -l < "$TEMP_LIST")
log "Nombre de fichiers/répertoires trouvés : $FILE_COUNT"

if [ "$FILE_COUNT" -eq 0 ]; then
    log "Aucun fichier à supprimer. Script terminé."
    exit 0
fi

# Calcul de l'espace total à libérer
SPACE_TO_FREE=$(find "$TARGET_DIR" -mtime +$DAYS_OLD -type f -exec du -ch {} + 2>/dev/null | grep total$ | awk '{print $1}')
log "Espace estimé à libérer : $SPACE_TO_FREE"
log ""

# Affichage d'un échantillon (10 premiers fichiers)
log "--- ÉCHANTILLON (10 premiers fichiers) ---"
head -10 "$TEMP_LIST" | tee -a "$LOGFILE"
log ""

# Demande de confirmation
read -p "Voulez-vous continuer avec la suppression ? (y/n) : " -n 1 -r
echo ""
echo "$REPLY" >> "$LOGFILE"

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Suppression annulée par l'utilisateur."
    exit 0
fi

# Suppression avec barre de progression
log "--- SUPPRESSION EN COURS ---"
log "Début : $(date)"

START_TIME=$(date +%s)

find "$TARGET_DIR" -depth -mtime +$DAYS_OLD -delete 2>&1 | tee -a "$LOGFILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "Fin : $(date)"
log "Durée : $DURATION secondes"
log ""

# Capture de l'espace APRÈS
log "--- ESPACE DISQUE APRÈS LA PURGE ---"
SPACE_AFTER=$(get_space)
log "Utilisé / Disponible / Utilisation%"
log "$SPACE_AFTER"
log ""

# Calcul de l'espace libéré
USED_BEFORE=$(df "$TARGET_DIR" | awk 'NR==2 {print $3}')
USED_AFTER=$(df "$TARGET_DIR" | awk 'NR==2 {print $3}')
FREED=$((USED_BEFORE - USED_AFTER))
FREED_HUMAN=$(echo "$FREED" | awk '{printf "%.2f GB", $1/1024/1024}')

log "--- RÉSUMÉ ---"
log "Fichiers supprimés : $FILE_COUNT"
log "Espace libéré : $FREED_HUMAN"
log "Log complet : $LOGFILE"
log "Liste des fichiers : $TEMP_LIST"
log ""
log "============================================="
log "  Purge terminée avec succès"
log "============================================="

# Affichage final à l'écran
echo ""
echo "✅ Purge terminée !"
echo "📊 Espace libéré : $FREED_HUMAN"
echo "📝 Log : $LOGFILE"






