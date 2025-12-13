# Backup & Restore System

Complete automated backup and restoration system for RegForm application including MongoDB database, uploaded files, and configuration.

## ✨ Features

- **Automated MongoDB backups** with GridFS support
- **File uploads backup** (payment proofs, etc.)
- **Encrypted configuration backups** (.env, package.json, etc.)
- **Google Drive sync** via rclone
- **Automatic cleanup** (keeps only 2 most recent backups)
- **Backup validation** before upload
- **Interactive restoration** with rollback support
- **Portable** - works on both Linux and macOS

## 📋 Prerequisites

### Required
- `mongodump` and `mongorestore` (MongoDB Database Tools)
- `mongosh` (MongoDB Shell)
- `tar`, `gzip` (usually pre-installed)

### Optional
- `gpg` - for encrypted config backups
- `rclone` - for Google Drive sync

### Installation

**MongoDB Tools (Linux):**
```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools mongodb-mongosh

# RHEL/CentOS
sudo yum install mongodb-database-tools mongodb-mongosh
```

**MongoDB Tools (macOS):**
```bash
brew tap mongodb/brew
brew install mongodb-database-tools mongodb-community-shell
```

**rclone (for Google Drive):**
```bash
# Linux
curl https://rclone.org/install.sh | sudo bash

# macOS
brew install rclone

# Configure
rclone config
# Choose: Google Drive
# Name: agneepath-gdrive
```

**GPG (for encrypted backups):**
```bash
# Linux
sudo apt-get install gnupg

# macOS
brew install gnupg
```

## 🚀 Quick Start

### Backup

```bash
# From project root
cd /path/to/regform/scripts

# Simple backup
./backup.sh

# With encrypted config
CONFIG_BACKUP_PASSPHRASE="your-secret-password" ./backup.sh

# Custom paths
BACKUP_DIR="/custom/backup/path" ./backup.sh
```

### Restore

```bash
cd /path/to/regform/scripts
./restore.sh

# Follow interactive menu:
# 1) Restore MongoDB only
# 2) Restore Uploads only  
# 3) Restore Config files
# 4) Restore MongoDB & Uploads
# 5) Download from Google Drive
# 6) List available backups
# 7) Exit
```

## ⚙️ Configuration

### Environment Variables

Scripts automatically detect paths but can be customized:

```bash
# Backup directories
export BACKUP_DIR="$HOME/backups/regform"

# MongoDB connection
export MONGODB_URI="mongodb://127.0.0.1:27017/production"
export DB_NAME="production"

# Upload directory
export UPLOAD_PATH="/path/to/uploads"

# Google Drive remote (rclone)
export GDRIVE_REMOTE="agneepath-gdrive:server-backups"

# Config encryption passphrase
export CONFIG_BACKUP_PASSPHRASE="your-secret-password"
```

### Cron Automation

**Daily backups at 2 AM:**
```bash
# Edit crontab
crontab -e

# Add this line (adjust path)
0 2 * * * CONFIG_BACKUP_PASSPHRASE="your-password" /home/user/regform/scripts/backup.sh >> /home/user/backups/regform/logs/cron.log 2>&1
```

**Weekly backups (Sunday 3 AM):**
```bash
0 3 * * 0 CONFIG_BACKUP_PASSPHRASE="your-password" /home/user/regform/scripts/backup.sh
```

## 📁 Backup Structure

```
$HOME/backups/regform/
├── mongodb/
│   └── 2025-12/
│       ├── mongodb_20251213_140530.tar.gz
│       └── mongodb_20251213_150620.tar.gz
├── uploads/
│   └── 2025-12/
│       ├── uploads_20251213_140530.tar.gz
│       └── uploads_20251213_150620.tar.gz
├── config_20251213_140530.tar.gz.gpg
├── config_20251213_150620.tar.gz.gpg
└── logs/
    ├── backup_20251213_140530.log
    └── backup_20251213_150620.log
```

## 🔧 Backup Script Details

### What Gets Backed Up

1. **MongoDB Database**
   - All collections (users, forms, payments, etc.)
   - GridFS files (payment proofs stored in DB)
   - Compressed with gzip

2. **Uploaded Files**
   - `public/uploads/` directory
   - All subdirectories and files
   - Compressed with gzip

3. **Configuration Files** (encrypted)
   - `.env.production`
   - `.env.local`
   - `package.json`
   - `next.config.ts`
   - `tsconfig.json`

### Backup Process

1. Create timestamped backup directories
2. Dump MongoDB database
3. Compress database dump
4. Archive uploaded files
5. Encrypt and backup config files
6. Validate backups
7. Upload to Google Drive (if rclone configured)
8. Clean up old backups (keep 2 most recent)
9. Clean up old Google Drive backups
10. Generate summary log

### Retention Policy

- **Local:** 2 most recent backups
- **Google Drive:** 2 most recent backups
- Older backups automatically deleted

## 🔄 Restore Script Details

### Safety Features

- **Validation:** Checks backup integrity before restoration
- **Confirmation:** Requires explicit "yes" to proceed
- **Backup:** Creates backup of current data before restore
- **Rollback:** Auto-rollback if restoration fails
- **Verification:** Verifies restoration completed successfully

### Restore Process

**MongoDB Restoration:**
1. Validate backup file integrity
2. Extract backup to temp directory
3. Show backup contents
4. Confirm restoration (with warning)
5. Drop existing database
6. Restore from backup
7. Verify collection count
8. Clean up temp files

**Uploads Restoration:**
1. Validate backup file integrity
2. Show backup contents
3. Confirm restoration (with warning)
4. Backup current uploads
5. Extract backup
6. Verify file count
7. Option to delete old backup
8. Auto-rollback on failure

**Config Restoration:**
1. Detect if encrypted (`.gpg` extension)
2. Decrypt with passphrase (if needed)
3. Show files to be restored
4. Confirm restoration
5. Copy files to project directory

## 🛡️ Security

### Encrypted Config Backups

Config files contain sensitive data (API keys, passwords). Encryption is **highly recommended** for production.

**Set encryption password:**
```bash
export CONFIG_BACKUP_PASSPHRASE="your-strong-password"
```

**Backup with encryption:**
```bash
CONFIG_BACKUP_PASSPHRASE="your-password" ./backup.sh
```

**Restore encrypted backup:**
```bash
./restore.sh
# Choose: 3) Restore Config Files
# Enter filename when prompted
# Enter decryption passphrase
```

### Best Practices

1. **Use strong passphrases** for config encryption
2. **Store passphrase securely** (password manager, vault)
3. **Restrict backup directory permissions:**
   ```bash
   chmod 700 $HOME/backups/regform
   ```
4. **Enable Google Drive for off-site backups**
5. **Test restoration regularly** (monthly recommended)
6. **Monitor backup logs** for failures
7. **Keep backups encrypted at rest**

## 🔍 Monitoring & Troubleshooting

### Check Backup Logs

```bash
# View latest backup log
tail -f ~/backups/regform/logs/backup_*.log | tail -1

# View all logs
ls -lt ~/backups/regform/logs/
```

### Common Issues

**1. mongodump not found**
```bash
# Install MongoDB Database Tools
sudo apt-get install mongodb-database-tools  # Linux
brew install mongodb-database-tools          # macOS
```

**2. Permission denied**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

**3. rclone remote not configured**
```bash
# Configure rclone
rclone config
# Add Google Drive remote named: agneepath-gdrive
```

**4. Backup failed - disk full**
```bash
# Check disk space
df -h

# Clean old backups manually
rm -rf ~/backups/regform/mongodb/2024-*
```

**5. Restore failed - wrong database name**
```bash
# Check database name in backup
tar -tzf backup.tar.gz | head

# Set correct database name
DB_NAME="your_db_name" ./restore.sh
```

### Verify Backups

**Test MongoDB backup:**
```bash
cd ~/backups/regform/mongodb/2025-12
tar -tzf mongodb_20251213_140530.tar.gz | head
```

**Test uploads backup:**
```bash
cd ~/backups/regform/uploads/2025-12
tar -tzf uploads_20251213_140530.tar.gz | head
```

**Test config backup (encrypted):**
```bash
gpg --decrypt config_20251213_140530.tar.gz.gpg | tar -tz
```

## 📊 Backup Statistics

### Check Backup Sizes

```bash
# Total backup size
du -sh ~/backups/regform

# Size by type
du -sh ~/backups/regform/mongodb
du -sh ~/backups/regform/uploads
```

### Count Backups

```bash
# MongoDB backups
find ~/backups/regform/mongodb -name "*.tar.gz" | wc -l

# Uploads backups
find ~/backups/regform/uploads -name "*.tar.gz" | wc -l

# Config backups
find ~/backups/regform -name "config_*.tar.gz*" | wc -l
```

## 🚨 Disaster Recovery

### Full System Restoration

1. **Fresh server setup:**
   ```bash
   # Install prerequisites
   sudo apt-get update
   sudo apt-get install mongodb-org mongodb-database-tools
   
   # Clone project
   git clone <repo-url> ~/regform
   cd ~/regform
   ```

2. **Download backups from Google Drive:**
   ```bash
   # Configure rclone
   rclone config
   
   # Download backups
   cd scripts
   ./restore.sh
   # Choose: 5) Download from Google Drive
   ```

3. **Restore in order:**
   ```bash
   ./restore.sh
   # 1) Restore MongoDB
   # 2) Restore Uploads
   # 3) Restore Config
   ```

4. **Verify restoration:**
   ```bash
   # Check database
   mongosh mongodb://127.0.0.1:27017/production --eval "db.stats()"
   
   # Check uploads
   ls -lh ~/regform/public/uploads
   
   # Check config
   cat ~/regform/.env.production | head
   ```

5. **Start application:**
   ```bash
   cd ~/regform
   npm install
   npm run build
   pm2 start ecosystem.config.js
   ```

## 📝 Notes

- Backups are incremental-friendly (organized by month)
- Scripts work on both production servers and local development
- All operations are logged for auditing
- Google Drive sync is optional but recommended
- Config encryption is optional but **strongly recommended** for production
- Scripts are idempotent - safe to run multiple times

## 🔗 Related Documentation

- [Quick Reference](./QUICK_REFERENCE.md) - Common commands
- [Payment Verification Setup](./PAYMENT_VERIFICATION_SETUP.md) - Google Sheets integration
- [scripts/BACKUP.md](../scripts/BACKUP.md) - Original backup documentation

---

**Last Updated:** December 13, 2025  
**Version:** 2.0
