#!/bin/bash
BACKUP_DIR="$HOME/backups/regform"
MAX_AGE_HOURS=48

# Check last backup age
LAST_BACKUP=$(find "$BACKUP_DIR/mongodb" -name "*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LAST_BACKUP" ]; then
    echo "❌ No backups found!"
    exit 1
fi

BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LAST_BACKUP")))
HOURS=$((BACKUP_AGE / 3600))

if [ $HOURS -gt $MAX_AGE_HOURS ]; then
    echo "⚠️ Last backup is $HOURS hours old (older than $MAX_AGE_HOURS hours)"
    exit 1
else
    echo "✅ Backup is recent ($HOURS hours old)"
fi