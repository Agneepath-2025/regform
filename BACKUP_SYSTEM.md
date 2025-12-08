# Automated Backup System Documentation

## Overview

Comprehensive backup system for RegForm application with dual backup locations:
- **Local Server**: Fast access, 30-day retention
- **Google Drive**: Cloud redundancy, 90-day retention

**All scripts located in:** `/mnt/HC_Volume_103871510/host/regform/scripts/`

## Components

### 1. `backup.sh` - Main Backup Script
Backs up:
- MongoDB database (compressed)
- Uploaded files (user submissions, photos, payment proofs)
- Configuration files (.env, package.json)

### 2. `restore.sh` - Interactive Restoration Tool
Features:
- List available backups
- Restore MongoDB
- Restore uploaded files
- Download from Google Drive
- Safety confirmations before overwriting

### 3. `setup-backup.sh` - Automated Setup
- Makes scripts executable
- Checks dependencies
- Creates cron jobs for automated backups
- Runs initial backup

## Installation

### On Server:

```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts

# Make setup script executable
chmod +x setup-backup.sh

# Run setup
./setup-backup.sh
```

### Install rclone (for Google Drive):

```bash
# Install
curl https://rclone.org/install.sh | sudo bash

# Configure Google Drive
rclone config
# Choose: n (new remote)
# Name: gdrive
# Type: drive (Google Drive)
# Follow OAuth flow
```

## Backup Schedule Options

1. **Every 6 hours** - High-frequency (for active registration periods)
2. **Every 12 hours** - Medium-frequency
3. **Daily at 2 AM** - Standard (recommended)
4. **Twice daily (2 AM & 2 PM)** - Balanced
5. **Custom** - Your own cron schedule

## Storage Locations

### Local Server:
```
/mnt/HC_Volume_103871510/backups/regform/
├── mongodb/
│   └── YYYY-MM/
│       └── mongodb_YYYYMMDD_HHMMSS.tar.gz
├── uploads/
│   └── YYYY-MM/
│       └── uploads_YYYYMMDD_HHMMSS.tar.gz
├── config_YYYYMMDD_HHMMSS.tar.gz
└── logs/
    ├── backup_YYYYMMDD_HHMMSS.log
    └── cron.log
```

### Google Drive:
```
Backups/RegForm/
├── mongodb/
│   └── YYYY-MM/
│       └── mongodb_YYYYMMDD_HHMMSS.tar.gz
├── uploads/
│   └── YYYY-MM/
│       └── uploads_YYYYMMDD_HHMMSS.tar.gz
└── config/
    └── config_YYYYMMDD_HHMMSS.tar.gz
```

## Manual Operations

### Run Backup Manually:
```bash
/mnt/HC_Volume_103871510/host/regform/scripts/backup.sh
```

### Restore from Backup:
```bash
/mnt/HC_Volume_103871510/host/regform/scripts/restore.sh
```

### View Backup Logs:
```bash
# Latest backup log
tail -f "$(ls -1t /mnt/HC_Volume_103871510/backups/regform/logs/backup_*.log | head -1)"

# Cron execution log
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/cron.log
```

### List Cron Jobs:
```bash
crontab -l
```

### Remove Cron Job:
```bash
crontab -e
# Delete the line with backup.sh
```

## Backup Retention

- **Local Server**: 30 days (configurable in backup.sh)
- **Google Drive**: 90 days (configurable in backup.sh)
- **Automatic cleanup**: Old backups deleted automatically

## Disk Space Estimates

**Per backup (approximate):**
- MongoDB: 50-500 MB (depends on data)
- Uploads: 1-10 GB (depends on submissions)
- Config: <1 MB

**Monthly storage (daily backups):**
- Local: ~300 GB (for 30 backups)
- Google Drive: ~900 GB (for 90 backups)

## Restoration Scenarios

### Scenario 1: Restore Latest Backup
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./restore.sh
# Choose: 5 (List backups)
# Note the latest filenames
# Run again, choose 3 (Restore both)
# Enter filenames
```

### Scenario 2: Restore from Google Drive
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./restore.sh
# Choose: 4 (Download from Google Drive)
# Select backup
# Confirm restoration
```

### Scenario 3: Restore Only Database
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./restore.sh
# Choose: 1 (Restore MongoDB only)
# Enter backup filename
```

## Monitoring

### Check Last Backup Status:
```bash
ls -lht /mnt/HC_Volume_103871510/backups/regform/mongodb/*/*.tar.gz | head -1
```

### Verify Backup Integrity:
```bash
# Test MongoDB backup
tar -tzf /path/to/mongodb_backup.tar.gz | head

# Test uploads backup
tar -tzf /path/to/uploads_backup.tar.gz | head
```

### Check Google Drive Sync:
```bash
rclone lsf gdrive:Backups/RegForm/mongodb/ | tail -5
```

## Troubleshooting

### Backup fails with "out of space":
```bash
# Check disk space
df -h /mnt/HC_Volume_103871510

# Clean old backups manually
find /mnt/HC_Volume_103871510/backups/regform -name "*.tar.gz" -mtime +7 -delete
```

### rclone upload fails:
```bash
# Test rclone connection
rclone lsf gdrive:

# Reconfigure if needed
rclone config reconnect gdrive:
```

### MongoDB restore fails:
```bash
# Check MongoDB is running
systemctl status mongod

# Check backup file integrity
tar -tzf /path/to/backup.tar.gz > /dev/null
```

## Security Notes

- **Encryption**: Backups are compressed but not encrypted
- **Permissions**: Ensure backup directory has restricted permissions (700)
- **Google Drive**: Uses OAuth, credentials stored securely by rclone
- **.env files**: Contain sensitive data, handle with care

## Configuration Variables

Edit these in `backup.sh`:

```bash
LOCAL_RETENTION_DAYS=30      # Keep local backups for 30 days
GDRIVE_RETENTION_DAYS=90     # Keep GDrive backups for 90 days
GDRIVE_REMOTE="gdrive:..."   # rclone remote name and path
```

## Support

For issues or questions:
1. Check logs in `/mnt/HC_Volume_103871510/backups/regform/logs/`
2. Verify cron execution: `grep CRON /var/log/syslog`
3. Test scripts manually first before automation
