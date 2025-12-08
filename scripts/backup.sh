#!/bin/bash
# Automated Backup System for MongoDB and Uploaded Files
# Backs up to: 1) Local server directory, 2) Google Drive
# Location: /mnt/HC_Volume_103871510/host/regform/scripts/backup.sh

set -e  # Exit on error

# ============================================
# Configuration
# ============================================

# Paths
PROJECT_DIR="$HOME/regform"
BACKUP_DIR="$HOME/backups/regform"
MONGODB_URI="mongodb://127.0.0.1:27017/production"
DB_NAME="production"
UPLOAD_PATH="$HOME/regform/public/uploads"

# Google Drive (using rclone)
GDRIVE_REMOTE="agneepath-gdrive:server-backups"  # Configure rclone remote named 'agneepath-gdrive'

# Retention (days)
LOCAL_RETENTION_DAYS=30
GDRIVE_RETENTION_DAYS=90

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y-%m")

# ============================================
# Create Backup Directories
# ============================================

mkdir -p "$BACKUP_DIR/mongodb/$DATE_DIR"
mkdir -p "$BACKUP_DIR/uploads/$DATE_DIR"
mkdir -p "$BACKUP_DIR/logs"

LOG_FILE="$BACKUP_DIR/logs/backup_${TIMESTAMP}.log"

# ============================================
# Logging Function
# ============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=================================="
log "🔄 Starting Backup Process"
log "=================================="

# ============================================
# 1. MongoDB Backup
# ============================================

log "📊 Backing up MongoDB database: $DB_NAME"

MONGO_BACKUP_PATH="$BACKUP_DIR/mongodb/$DATE_DIR/mongodb_${TIMESTAMP}"

if mongodump --uri="$MONGODB_URI" --db="$DB_NAME" --out="$MONGO_BACKUP_PATH" --quiet; then
    # Compress the backup
    cd "$BACKUP_DIR/mongodb/$DATE_DIR"
    tar -czf "mongodb_${TIMESTAMP}.tar.gz" "mongodb_${TIMESTAMP}"
    rm -rf "mongodb_${TIMESTAMP}"
    
    MONGO_SIZE=$(du -h "mongodb_${TIMESTAMP}.tar.gz" | cut -f1)
    log "✅ MongoDB backup completed: mongodb_${TIMESTAMP}.tar.gz ($MONGO_SIZE)"
else
    log "❌ MongoDB backup failed!"
    exit 1
fi

# ============================================
# 2. Uploaded Files Backup
# ============================================

log "📁 Backing up uploaded files from: $UPLOAD_PATH"

if [ -d "$UPLOAD_PATH" ]; then
    UPLOADS_BACKUP_PATH="$BACKUP_DIR/uploads/$DATE_DIR/uploads_${TIMESTAMP}.tar.gz"
    
    if tar -czf "$UPLOADS_BACKUP_PATH" -C "$(dirname "$UPLOAD_PATH")" "$(basename "$UPLOAD_PATH")" 2>/dev/null; then
        UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP_PATH" | cut -f1)
        log "✅ Uploads backup completed: uploads_${TIMESTAMP}.tar.gz ($UPLOADS_SIZE)"
    else
        log "⚠️  Uploads backup failed or directory empty"
    fi
else
    log "⚠️  Upload directory not found: $UPLOAD_PATH"
fi

# ============================================
# 3. Backup Environment Config (encrypted)
# ============================================

log "⚙️  Backing up configuration files"

CONFIG_BACKUP_PATH="$BACKUP_DIR/config_${TIMESTAMP}.tar.gz.gpg"
cd "$PROJECT_DIR"

if command -v gpg &> /dev/null; then
    if [ -z "$CONFIG_BACKUP_PASSPHRASE" ]; then
        log "⚠️  CONFIG_BACKUP_PASSPHRASE not set. Skipping encrypted config backup."
    else
        tar -cz .env.production package.json next.config.ts 2>/dev/null | \
            gpg --batch --yes --passphrase "$CONFIG_BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 -o "$CONFIG_BACKUP_PATH"
        if [ $? -eq 0 ]; then
            log "✅ Encrypted config backup completed: $(basename "$CONFIG_BACKUP_PATH")"
        else
            log "⚠️  Encrypted config backup failed"
        fi
    fi
else
    log "⚠️  gpg not found, skipping encrypted config backup"
fi

# ============================================
# 4. Upload to Google Drive (using rclone)
# ============================================

log "☁️  Uploading backups to Google Drive"

if command -v rclone &> /dev/null; then
    # Upload MongoDB backup
    if rclone copy "$BACKUP_DIR/mongodb/$DATE_DIR/mongodb_${TIMESTAMP}.tar.gz" \
        "$GDRIVE_REMOTE/mongodb/$DATE_DIR/" --progress 2>&1 | tail -1 | tee -a "$LOG_FILE"; then
        log "✅ MongoDB backup uploaded to Google Drive"
    else
        log "❌ Failed to upload MongoDB backup to Google Drive"
    fi
    
    # Upload files backup
    if [ -f "$UPLOADS_BACKUP_PATH" ]; then
        if rclone copy "$UPLOADS_BACKUP_PATH" \
            "$GDRIVE_REMOTE/uploads/$DATE_DIR/" --progress 2>&1 | tail -1 | tee -a "$LOG_FILE"; then
            log "✅ Uploads backup uploaded to Google Drive"
        else
            log "❌ Failed to upload files backup to Google Drive"
        fi
    fi
    
    # Upload config backup
    if [ -f "$CONFIG_BACKUP_PATH" ]; then
        if rclone copy "$CONFIG_BACKUP_PATH" \
            "$GDRIVE_REMOTE/config/" --progress 2>&1 | tail -1 | tee -a "$LOG_FILE"; then
            log "✅ Config backup uploaded to Google Drive"
        else
            log "❌ Failed to upload config backup to Google Drive"
        fi
    fi
else
    log "⚠️  rclone not installed. Skipping Google Drive upload."
    log "💡 Install: curl https://rclone.org/install.sh | sudo bash"
    log "💡 Configure: rclone config"
fi

# ============================================
# 5. Cleanup Old Backups (Local)
# ============================================

log "🧹 Cleaning up old local backups (older than $LOCAL_RETENTION_DAYS days)"

# Clean MongoDB backups
find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f -mtime +$LOCAL_RETENTION_DAYS -delete 2>/dev/null || true
MONGO_COUNT=$(find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f | wc -l)

# Clean uploads backups
find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f -mtime +$LOCAL_RETENTION_DAYS -delete 2>/dev/null || true
UPLOADS_COUNT=$(find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f | wc -l)

# Clean config backups
find "$BACKUP_DIR" -name "config_*.tar.gz" -type f -mtime +$LOCAL_RETENTION_DAYS -delete 2>/dev/null || true

log "📊 Local backups retained: $MONGO_COUNT MongoDB, $UPLOADS_COUNT uploads"

# ============================================
# 6. Cleanup Old Backups (Google Drive)
# ============================================

if command -v rclone &> /dev/null; then
    log "🧹 Cleaning up old Google Drive backups (older than $GDRIVE_RETENTION_DAYS days)"
    
    # Clean old MongoDB backups on Google Drive
    rclone delete "$GDRIVE_REMOTE/mongodb" --min-age ${GDRIVE_RETENTION_DAYS}d 2>/dev/null || true
    
    # Clean old uploads backups on Google Drive
    rclone delete "$GDRIVE_REMOTE/uploads" --min-age ${GDRIVE_RETENTION_DAYS}d 2>/dev/null || true
    
    # Clean old config backups on Google Drive
    rclone delete "$GDRIVE_REMOTE/config" --min-age ${GDRIVE_RETENTION_DAYS}d 2>/dev/null || true
    
    log "✅ Google Drive cleanup completed"
fi

# ============================================
# 7. Summary
# ============================================

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "=================================="
log "✅ Backup Process Completed"
log "=================================="
log "📊 Summary:"
log "   - MongoDB backup: mongodb_${TIMESTAMP}.tar.gz"
log "   - Uploads backup: uploads_${TIMESTAMP}.tar.gz"
log "   - Total local storage used: $TOTAL_SIZE"
log "   - Log file: $LOG_FILE"
log "=================================="

# Send notification (optional - uncomment if you have a notification system)
# curl -X POST "YOUR_WEBHOOK_URL" \
#   -H "Content-Type: application/json" \
#   -d "{\"text\":\"✅ RegForm backup completed: $TIMESTAMP\"}"

exit 0
