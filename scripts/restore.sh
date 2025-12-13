#!/bin/bash
# Restore Script for MongoDB and Uploaded Files
# Location: /mnt/HC_Volume_103871510/host/regform/scripts/restore.sh

set -e  # Exit on error

# ============================================
# Configuration
# ============================================

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Paths - work with both production and local
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/regform}"
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/production}"
DB_NAME="${DB_NAME:-production}"
UPLOAD_PATH="${UPLOAD_PATH:-$PROJECT_DIR/public/uploads}"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-agneepath-gdrive:server-backups}"

# ============================================
# Functions
# ============================================

list_backups() {
    echo "📋 Available Local Backups:"
    echo ""
    echo "MongoDB Backups:"
    if [ -d "$BACKUP_DIR/mongodb" ]; then
        find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}' | sort -r | head -10
    else
        echo "  No MongoDB backups found"
    fi
    
    echo ""
    echo "Uploads Backups:"
    if [ -d "$BACKUP_DIR/uploads" ]; then
        find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}' | sort -r | head -10
    else
        echo "  No uploads backups found"
    fi
    
    echo ""
    echo "Config Backups (encrypted):"
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -maxdepth 1 -name "config_*.tar.gz*" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}' | sort -r | head -10
    else
        echo "  No config backups found"
    fi
}

restore_config() {
    local backup_file="$1"
    local project_dir="${2:-$PROJECT_DIR}"
    
    echo "🔄 Restoring config from: $(basename $backup_file)"
    
    # Check if file is encrypted
    if [[ "$backup_file" == *.gpg ]]; then
        if ! command -v gpg &> /dev/null; then
            echo "❌ Error: gpg not found. Cannot decrypt config backup."
            exit 1
        fi
        
        # Prompt for passphrase
        echo "🔐 This backup is encrypted"
        read -sp "Enter decryption passphrase: " passphrase
        echo ""
        
        # Decrypt and extract
        TEMP_DIR=$(mktemp -d)
        if gpg --batch --yes --passphrase "$passphrase" --decrypt "$backup_file" | tar -xz -C "$TEMP_DIR" 2>/dev/null; then
            echo "✅ Config decrypted successfully"
            
            # Confirm restoration
            echo "⚠️  WARNING: This will OVERWRITE existing config files!"
            echo "   Files to restore:"
            ls -1 "$TEMP_DIR"
            read -p "Continue? (yes/no): " confirm
            
            if [ "$confirm" = "yes" ]; then
                cp -v "$TEMP_DIR"/* "$project_dir/"
                echo "✅ Config files restored successfully"
            else
                echo "❌ Restoration cancelled"
            fi
        else
            echo "❌ Decryption failed. Check your passphrase."
            rm -rf "$TEMP_DIR"
            exit 1
        fi
        
        rm -rf "$TEMP_DIR"
    else
        # Unencrypted backup
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$backup_file" -C "$TEMP_DIR"
        
        echo "⚠️  WARNING: This will OVERWRITE existing config files!"
        read -p "Continue? (yes/no): " confirm
        
        if [ "$confirm" = "yes" ]; then
            cp -v "$TEMP_DIR"/* "$project_dir/"
            echo "✅ Config files restored successfully"
        fi
        
        rm -rf "$TEMP_DIR"
    fi
}

restore_mongodb() {
    local backup_file="$1"
    
    echo "🔄 Restoring MongoDB from: $(basename $backup_file)"
    
    # Validate backup file exists
    if [ ! -f "$backup_file" ]; then
        echo "❌ Error: Backup file not found: $backup_file"
        exit 1
    fi
    
    # Validate backup is not corrupted
    echo "🔍 Validating backup file..."
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        echo "❌ Error: Backup file is corrupted or invalid"
        exit 1
    fi
    
    # Extract backup
    TEMP_DIR=$(mktemp -d)
    echo "📦 Extracting backup..."
    tar -xzf "$backup_file" -C "$TEMP_DIR"
    
    # Find the dump directory
    DUMP_DIR=$(find "$TEMP_DIR" -type d -name "$DB_NAME" | head -1)
    
    if [ -z "$DUMP_DIR" ]; then
        echo "❌ Error: Could not find database dump in backup"
        echo "   Expected database name: $DB_NAME"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Show what will be restored
    echo ""
    echo "Backup contains:"
    ls -lh "$DUMP_DIR"
    echo ""
    
    # Confirm restoration
    echo "⚠️  WARNING: This will OVERWRITE the current database!"
    echo "   Database: $DB_NAME"
    echo "   URI: $MONGODB_URI"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restoration cancelled"
        rm -rf "$TEMP_DIR"
        exit 0
    fi
    
    # Drop existing database
    echo "🗑️  Dropping existing database..."
    if mongosh "$MONGODB_URI" --quiet --eval "db.dropDatabase()" 2>&1 | grep -q "ok"; then
        echo "✅ Database dropped"
    else
        echo "⚠️  Could not drop database (may not exist)"
    fi
    
    # Restore from backup
    echo "📥 Restoring database..."
    if mongorestore --uri="$MONGODB_URI" --db="$DB_NAME" "$DUMP_DIR" --quiet; then
        echo "✅ MongoDB restored successfully"
        
        # Verify restoration
        echo "🔍 Verifying restoration..."
        COLLECTION_COUNT=$(mongosh "$MONGODB_URI" --quiet --eval "db.getCollectionNames().length")
        echo "   Collections restored: $COLLECTION_COUNT"
    else
        echo "❌ MongoDB restoration failed"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
}

restore_uploads() {
    local backup_file="$1"
    
    echo "🔄 Restoring uploads from: $(basename $backup_file)"
    
    # Validate backup file
    if [ ! -f "$backup_file" ]; then
        echo "❌ Error: Backup file not found: $backup_file"
        exit 1
    fi
    
    # Validate backup integrity
    echo "🔍 Validating backup file..."
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        echo "❌ Error: Backup file is corrupted or invalid"
        exit 1
    fi
    
    # Show backup contents
    echo ""
    echo "Backup contains:"
    tar -tzf "$backup_file" | head -10
    echo ""
    
    # Confirm restoration
    echo "⚠️  WARNING: This will OVERWRITE existing uploaded files!"
    echo "   Target directory: $UPLOAD_PATH"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit 0
    fi
    
    # Backup current uploads
    BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    if [ -d "$UPLOAD_PATH" ]; then
        echo "📦 Backing up current uploads..."
        mv "$UPLOAD_PATH" "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}"
        echo "   Backup saved to: ${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}"
    fi
    
    # Extract uploads
    mkdir -p "$(dirname "$UPLOAD_PATH")"
    echo "📥 Extracting uploads..."
    if tar -xzf "$backup_file" -C "$(dirname "$UPLOAD_PATH")"; then
        FILE_COUNT=$(find "$UPLOAD_PATH" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "✅ Uploads restored successfully"
        echo "   Files restored: $FILE_COUNT"
        
        # Ask if old backup should be deleted
        if [ -d "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}" ]; then
            read -p "Delete old backup? (yes/no): " delete_old
            if [ "$delete_old" = "yes" ]; then
                rm -rf "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}"
                echo "   Old backup deleted"
            fi
        fi
    else
        echo "❌ Uploads restoration failed"
        # Restore backup
        if [ -d "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}" ]; then
            echo "🔄 Rolling back to previous state..."
            rm -rf "$UPLOAD_PATH"
            mv "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}" "$UPLOAD_PATH"
            echo "   Rollback completed"
        fi
        exit 1
    fi
}

download_from_gdrive() {
    if ! command -v rclone &> /dev/null; then
        echo "❌ rclone is not installed"
        exit 1
    fi
    
    echo "☁️  Available Google Drive Backups:"
    echo ""
    
    rclone lsf "$GDRIVE_REMOTE/mongodb/" --recursive | head -10
    
    echo ""
    read -p "Enter the backup filename to download: " filename
    
    local local_path="$BACKUP_DIR/mongodb/restored/$filename"
    mkdir -p "$(dirname "$local_path")"
    
    echo "📥 Downloading from Google Drive..."
    if rclone copy "$GDRIVE_REMOTE/mongodb/$filename" "$(dirname "$local_path")" --progress; then
        echo "✅ Downloaded: $local_path"
        echo "$local_path"
    else
        echo "❌ Download failed"
        exit 1
    fi
}

# ============================================
# Main Script
# ============================================

echo "╔═══════════════════════════════════════╗"
echo "║   RegForm Backup Restoration Tool    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check if mongorestore is available
if ! command -v mongorestore &> /dev/null; then
    echo "❌ Error: mongorestore is not installed"
    echo "Install: sudo apt-get install mongodb-database-tools"
    exit 1
fi

# Menu
echo "Select restoration option:"
echo "1) Restore MongoDB (from local backup)"
echo "2) Restore Uploads (from local backup)"
echo "3) Restore Config Files (encrypted)"
echo "4) Restore both MongoDB & Uploads"
echo "5) Download from Google Drive first"
echo "6) List available backups"
echo "7) Exit"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        list_backups
        echo ""
        read -p "Enter MongoDB backup filename: " mongo_file
        if [ -f "$BACKUP_DIR/mongodb/$mongo_file" ]; then
            restore_mongodb "$BACKUP_DIR/mongodb/$mongo_file"
        else
            # Try to find it
            found=$(find "$BACKUP_DIR/mongodb" -name "*$mongo_file*" -type f | head -1)
            if [ -n "$found" ]; then
                restore_mongodb "$found"
            else
                echo "❌ Backup file not found"
            fi
        fi
        ;;
    2)
        list_backups
        echo ""
        read -p "Enter uploads backup filename: " uploads_file
        if [ -f "$BACKUP_DIR/uploads/$uploads_file" ]; then
            restore_uploads "$BACKUP_DIR/uploads/$uploads_file"
        else
            found=$(find "$BACKUP_DIR/uploads" -name "*$uploads_file*" -type f | head -1)
            if [ -n "$found" ]; then
                restore_uploads "$found"
            else
                echo "❌ Backup file not found"
            fi
        fi
        ;;
    3)
        list_backups
        echo ""
        read -p "Enter config backup filename (e.g., config_20251208_082443.tar.gz.gpg): " config_file
        if [ -f "$BACKUP_DIR/$config_file" ]; then
            restore_config "$BACKUP_DIR/$config_file"
        else
            found=$(find "$BACKUP_DIR" -maxdepth 1 -name "*$config_file*" -type f | head -1)
            if [ -n "$found" ]; then
                restore_config "$found"
            else
                echo "❌ Config backup file not found"
            fi
        fi
        ;;
    4)
        list_backups
        echo ""
        read -p "Enter MongoDB backup filename: " mongo_file
        read -p "Enter uploads backup filename: " uploads_file
        
        mongo_path=$(find "$BACKUP_DIR/mongodb" -name "*$mongo_file*" -type f | head -1)
        uploads_path=$(find "$BACKUP_DIR/uploads" -name "*$uploads_file*" -type f | head -1)
        
        if [ -n "$mongo_path" ] && [ -n "$uploads_path" ]; then
            restore_mongodb "$mongo_path"
            restore_uploads "$uploads_path"
        else
            echo "❌ One or more backup files not found"
        fi
        ;;
    5)
        downloaded=$(download_from_gdrive)
        if [ -n "$downloaded" ]; then
            read -p "Restore this backup now? (yes/no): " restore_now
            if [ "$restore_now" = "yes" ]; then
                restore_mongodb "$downloaded"
            fi
        fi
        ;;
    6)
        list_backups
        ;;
    7)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
