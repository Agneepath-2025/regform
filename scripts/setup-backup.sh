#!/bin/bash
# Setup automated backups with cron

SCRIPT_DIR="/mnt/HC_Volume_103871510/host/regform/scripts"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

echo "🔧 Setting up automated backup system..."

# Make scripts executable
chmod +x "$SCRIPT_DIR/backup.sh"
chmod +x "$SCRIPT_DIR/restore.sh"

echo "✅ Scripts made executable"

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo "⚠️  rclone is not installed. Google Drive backup will be skipped."
    echo "📝 To install rclone:"
    echo "   curl https://rclone.org/install.sh | sudo bash"
    echo "   rclone config  # Set up Google Drive remote named 'gdrive'"
else
    echo "✅ rclone is installed"
fi

# Add cron jobs
echo ""
echo "📅 Setting up cron jobs..."
echo ""
echo "Choose backup frequency:"
echo "1) Every 6 hours"
echo "2) Every 12 hours"
echo "3) Daily at 2 AM"
echo "4) Daily at 2 AM and 2 PM"
echo "5) Custom"
echo ""
read -p "Enter choice [1-5]: " freq_choice

case $freq_choice in
    1)
        CRON_SCHEDULE="0 */6 * * *"
        ;;
    2)
        CRON_SCHEDULE="0 */12 * * *"
        ;;
    3)
        CRON_SCHEDULE="0 2 * * *"
        ;;
    4)
        CRON_SCHEDULE="0 2,14 * * *"
        ;;
    5)
        echo "Enter cron schedule (e.g., '0 2 * * *' for daily at 2 AM):"
        read -p "Schedule: " CRON_SCHEDULE
        ;;
    *)
        echo "Invalid choice, using default: Daily at 2 AM"
        CRON_SCHEDULE="0 2 * * *"
        ;;
esac

# Create cron job
CRON_JOB="$CRON_SCHEDULE $BACKUP_SCRIPT >> /mnt/HC_Volume_103871510/backups/regform/logs/cron.log 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT") | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added: $CRON_SCHEDULE"
echo ""
echo "📋 Current cron jobs:"
crontab -l | grep -v "^#"
echo ""

# Run initial backup
echo ""
read -p "Run initial backup now? (yes/no): " run_now

if [ "$run_now" = "yes" ]; then
    echo "🔄 Running initial backup..."
    "$BACKUP_SCRIPT"
fi

echo ""
echo "✅ Backup system setup complete!"
echo ""
echo "📖 Usage:"
echo "   Manual backup:  $BACKUP_SCRIPT"
echo "   Restore backup: $SCRIPT_DIR/restore.sh"
echo "   View logs:      tail -f /mnt/HC_Volume_103871510/backups/regform/logs/backup_*.log"
echo "   Deploy app:     $SCRIPT_DIR/deploy.sh"
echo "   List cron jobs: crontab -l"
echo ""
