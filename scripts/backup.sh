#!/bin/bash
# Automated Backup System for MongoDB and Uploaded Files
# Backs up to: 1) Local server directory, 2) Google Drive
# Location: /mnt/HC_Volume_103871510/host/regform/scripts/backup.sh

set -e  # Exit on error

# ============================================
# Configuration
# ============================================

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Paths - work with both production and local
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/regform}"
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}"
DB_NAME="${DB_NAME:-production}"
UPLOAD_PATH="${UPLOAD_PATH:-$PROJECT_DIR/public/uploads}"

# Google Drive (using rclone)
GDRIVE_REMOTE="${GDRIVE_REMOTE:-agneepath-gdrive:server-backups}"

# Keep only N most recent backups
KEEP_COUNT=2

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

# Collect config files that exist
CONFIG_FILES=""
for file in .env.production .env.local package.json next.config.ts tsconfig.json; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        CONFIG_FILES="$CONFIG_FILES $file"
    fi
done

if command -v gpg &> /dev/null; then
    if [ -z "$CONFIG_BACKUP_PASSPHRASE" ]; then
        log "⚠️  CONFIG_BACKUP_PASSPHRASE not set. Skipping encrypted config backup."
    else
        cd "$PROJECT_DIR"
        tar -cz $CONFIG_FILES 2>/dev/null | \
            gpg --batch --yes --passphrase "$CONFIG_BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 -o "$CONFIG_BACKUP_PATH"
        if [ $? -eq 0 ]; then
            CONFIG_SIZE=$(du -h "$CONFIG_BACKUP_PATH" | cut -f1)
            log "✅ Encrypted config backup completed: $(basename "$CONFIG_BACKUP_PATH") ($CONFIG_SIZE)"
        else
            log "⚠️  Encrypted config backup failed"
        fi
    fi
else
    log "⚠️  gpg not found, skipping encrypted config backup"
fi

# Validate MongoDB backup
log "🔍 Validating MongoDB backup..."
if [ -f "$BACKUP_DIR/mongodb/$DATE_DIR/mongodb_${TIMESTAMP}.tar.gz" ]; then
    if tar -tzf "$BACKUP_DIR/mongodb/$DATE_DIR/mongodb_${TIMESTAMP}.tar.gz" >/dev/null 2>&1; then
        log "✅ MongoDB backup validated"
    else
        log "❌ MongoDB backup is corrupted!"
        exit 1
    fi
fi

# ============================================
# 4. Upload to Google Drive (using rclone)
# ============================================

log "☁️  Uploading backups to Google Drive"

if command -v rclone &> /dev/null; then
    # Check if remote is configured
    if ! rclone listremotes | grep -q "^${GDRIVE_REMOTE%%:*}:"; then
        log "⚠️  rclone remote '$GDRIVE_REMOTE' not configured. Skipping Google Drive upload."
        log "💡 Configure: rclone config"
    else
        # Upload MongoDB backup
        log "📤 Uploading MongoDB backup..."
        if rclone copy "$BACKUP_DIR/mongodb/$DATE_DIR/mongodb_${TIMESTAMP}.tar.gz" \
            "$GDRIVE_REMOTE/mongodb/$DATE_DIR/" --transfers 4 --checkers 8 2>&1 | tee -a "$LOG_FILE" | tail -1; then
            log "✅ MongoDB backup uploaded to Google Drive"
        else
            log "❌ Failed to upload MongoDB backup to Google Drive"
        fi
        
        # Upload files backup
        if [ -f "$UPLOADS_BACKUP_PATH" ]; then
            log "📤 Uploading uploads backup..."
            if rclone copy "$UPLOADS_BACKUP_PATH" \
                "$GDRIVE_REMOTE/uploads/$DATE_DIR/" --transfers 4 --checkers 8 2>&1 | tee -a "$LOG_FILE" | tail -1; then
                log "✅ Uploads backup uploaded to Google Drive"
            else
                log "❌ Failed to upload files backup to Google Drive"
            fi
        fi
        
        # Upload config backup
        if [ -f "$CONFIG_BACKUP_PATH" ]; then
            log "📤 Uploading config backup..."
            if rclone copy "$CONFIG_BACKUP_PATH" \
                "$GDRIVE_REMOTE/config/" --transfers 4 --checkers 8 2>&1 | tee -a "$LOG_FILE" | tail -1; then
                log "✅ Config backup uploaded to Google Drive"
            else
                log "❌ Failed to upload config backup to Google Drive"
            fi
        fi
    fi
else
    log "⚠️  rclone not installed. Skipping Google Drive upload."
    log "💡 Install: curl https://rclone.org/install.sh | sudo bash"
    log "💡 Configure: rclone config"
fi

# ============================================
# 5. Cleanup Old Backups (Keep only 2 most recent)
# ============================================

log "🧹 Cleaning up old local backups (keeping only $KEEP_COUNT most recent)"

# Function to delete old backups (portable across Linux/macOS)
cleanup_old_backups() {
    local dir="$1"
    local pattern="$2"
    local keep=$KEEP_COUNT
    
    if [ ! -d "$dir" ]; then
        return
    fi
    
    # Use ls -t for sorting by modification time (works on both Linux and macOS)
    find "$dir" -name "$pattern" -type f | 
        xargs ls -t 2>/dev/null | 
        tail -n +$((keep + 1)) | 
        xargs rm -f 2>/dev/null || true
}

# Clean each backup type
cleanup_old_backups "$BACKUP_DIR/mongodb" "*.tar.gz"
cleanup_old_backups "$BACKUP_DIR/uploads" "*.tar.gz"
cleanup_old_backups "$BACKUP_DIR" "config_*.tar.gz*"

MONGO_COUNT=$(find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f 2>/dev/null | wc -l | tr -d ' ')
UPLOADS_COUNT=$(find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f 2>/dev/null | wc -l | tr -d ' ')

log "📊 Local backups retained: $MONGO_COUNT MongoDB, $UPLOADS_COUNT uploads"

# ============================================
# 6. Cleanup Old Backups (Google Drive - Keep only 2)
# ============================================

if command -v rclone &> /dev/null; then
    log "🧹 Cleaning up old Google Drive backups (keeping only 2 most recent)"
    
    # Function to keep only N most recent files in rclone remote
    cleanup_gdrive_folder() {
        local remote_path="$1"
        local keep_count=2
        
        # List files with timestamps, sort, and delete old ones
        rclone lsf "$remote_path" --format "tp" 2>/dev/null | sort -rn | tail -n +$((keep_count + 1)) | while read line; do
            filename=$(echo "$line" | cut -f2-)
            if [ -n "$filename" ]; then
                rclone delete "$remote_path/$filename" 2>/dev/null || true
            fi
        done
    }
    
    # Clean each backup type
    cleanup_gdrive_folder "$GDRIVE_REMOTE/mongodb/$DATE_DIR"
    cleanup_gdrive_folder "$GDRIVE_REMOTE/uploads/$DATE_DIR"
    cleanup_gdrive_folder "$GDRIVE_REMOTE/config"
    
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
