#!/bin/bash
# Restore Script for MongoDB and Uploaded Files

set -e  # Exit on error

# ============================================
# Configuration
# ============================================

BACKUP_DIR="/mnt/HC_Volume_103871510/backups/regform"
MONGODB_URI="mongodb://127.0.0.1:27017/production"
DB_NAME="production"
UPLOAD_PATH="/mnt/HC_Volume_103871510/host/StrapiMongoDB/public/uploads"
GDRIVE_REMOTE="gdrive:Backups/RegForm"

# ============================================
# Functions
# ============================================

list_backups() {
    echo "📋 Available Local Backups:"
    echo ""
    echo "MongoDB Backups:"
    find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | head -10 | while read timestamp path; do
        date=$(date -d @${timestamp%.*} "+%Y-%m-%d %H:%M:%S")
        size=$(du -h "$path" | cut -f1)
        echo "  $date - $(basename $path) ($size)"
    done
    
    echo ""
    echo "Uploads Backups:"
    find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f -printf "%T@ %p\n" | sort -rn | head -10 | while read timestamp path; do
        date=$(date -d @${timestamp%.*} "+%Y-%m-%d %H:%M:%S")
        size=$(du -h "$path" | cut -f1)
        echo "  $date - $(basename $path) ($size)"
    done
}

restore_mongodb() {
    local backup_file="$1"
    
    echo "🔄 Restoring MongoDB from: $(basename $backup_file)"
    
    # Extract backup
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$backup_file" -C "$TEMP_DIR"
    
    # Find the dump directory
    DUMP_DIR=$(find "$TEMP_DIR" -type d -name "$DB_NAME" | head -1)
    
    if [ -z "$DUMP_DIR" ]; then
        echo "❌ Error: Could not find database dump in backup"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Confirm restoration
    echo "⚠️  WARNING: This will OVERWRITE the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restoration cancelled"
        rm -rf "$TEMP_DIR"
        exit 0
    fi
    
    # Drop existing database
    echo "🗑️  Dropping existing database..."
    mongosh "$MONGODB_URI" --quiet --eval "db.dropDatabase()"
    
    # Restore from backup
    echo "📥 Restoring database..."
    if mongorestore --uri="$MONGODB_URI" --db="$DB_NAME" "$DUMP_DIR" --quiet; then
        echo "✅ MongoDB restored successfully"
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
    
    # Confirm restoration
    echo "⚠️  WARNING: This will OVERWRITE existing uploaded files!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restoration cancelled"
        exit 0
    fi
    
    # Backup current uploads
    if [ -d "$UPLOAD_PATH" ]; then
        BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        echo "📦 Backing up current uploads..."
        mv "$UPLOAD_PATH" "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}"
    fi
    
    # Extract uploads
    mkdir -p "$(dirname $UPLOAD_PATH)"
    if tar -xzf "$backup_file" -C "$(dirname $UPLOAD_PATH)"; then
        echo "✅ Uploads restored successfully"
    else
        echo "❌ Uploads restoration failed"
        # Restore backup
        if [ -d "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}" ]; then
            mv "${UPLOAD_PATH}_backup_${BACKUP_TIMESTAMP}" "$UPLOAD_PATH"
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
    mkdir -p "$(dirname $local_path)"
    
    echo "📥 Downloading from Google Drive..."
    if rclone copy "$GDRIVE_REMOTE/mongodb/$filename" "$(dirname $local_path)" --progress; then
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
echo "3) Restore both (from local backups)"
echo "4) Download from Google Drive first"
echo "5) List available backups"
echo "6) Exit"
echo ""
read -p "Enter choice [1-6]: " choice

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
    4)
        downloaded=$(download_from_gdrive)
        if [ -n "$downloaded" ]; then
            read -p "Restore this backup now? (yes/no): " restore_now
            if [ "$restore_now" = "yes" ]; then
                restore_mongodb "$downloaded"
            fi
        fi
        ;;
    5)
        list_backups
        ;;
    6)
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
