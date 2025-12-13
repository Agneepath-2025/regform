# RegForm Scripts

Automation scripts for deployment, backup, and maintenance.

## 📚 Complete Documentation

**Backup & Restore System:** See [../documentation/BACKUP_RESTORE_SYSTEM.md](../documentation/BACKUP_RESTORE_SYSTEM.md) for:
- Complete setup guide
- Usage examples
- Security best practices
- Troubleshooting
- Disaster recovery procedures

## Quick Reference

```bash
# Local development setup
./setup-local.sh

# Production deployment
./deploy.sh

# Manual backup
./backup.sh

# Restore from backup
./restore.sh

# Setup automated backups
./setup-backup.sh
```

## Scripts Overview

### `setup-local.sh`
**Purpose:** Set up local development environment

**Usage:**
```bash
./setup-local.sh
```

**What it does:**
- Checks Docker/MongoDB installation
- Creates `.env.local` file
- Starts MongoDB container
- Installs dependencies
- Runs development server

---

### `deploy.sh`
**Purpose:** Deploy to production server

**Usage:**
```bash
./deploy.sh
```

**What it does:**
1. Cleans build artifacts
2. Restores git conflicts
3. Pulls latest code
4. Installs dependencies
5. Builds Next.js app
6. Restarts PM2

**Location:** `/mnt/HC_Volume_103871510/host/regform/scripts/deploy.sh`

---

### `backup.sh`
**Purpose:** Automated backup system

**Usage:**
```bash
./backup.sh
```

**What it backs up:**
- MongoDB database (compressed)
- User-uploaded files
- Configuration files

**Storage:**
- **Local:** `/mnt/HC_Volume_103871510/backups/regform/` (30 days)
- **Google Drive:** `gdrive:Backups/RegForm/` (90 days)

**Location:** `/mnt/HC_Volume_103871510/host/regform/scripts/backup.sh`

---

### `restore.sh`
**Purpose:** Interactive backup restoration

**Usage:**
```bash
./restore.sh
```

**Menu Options:**
1. Restore MongoDB only
2. Restore uploaded files only
3. Restore both MongoDB and files
4. Download backup from Google Drive
5. List available backups
6. Exit

**Features:**
- Lists backups with timestamps and sizes
- Safety confirmations before overwriting
- Automatic backup of current data before restore
- Download from Google Drive

**Location:** `/mnt/HC_Volume_103871510/host/regform/scripts/restore.sh`

---

### `setup-backup.sh`
**Purpose:** One-time automated backup setup

**Usage:**
```bash
./setup-backup.sh
```

**What it does:**
1. Makes scripts executable
2. Checks rclone installation
3. Creates cron job for automated backups
4. Optionally runs initial backup

**Backup Frequency Options:**
- Every 6 hours
- Every 12 hours  
- Daily at 2 AM (recommended)
- Twice daily (2 AM & 2 PM)
- Custom schedule

**Location:** `/mnt/HC_Volume_103871510/host/regform/scripts/setup-backup.sh`

---

## Prerequisites

### Local Development
```bash
# Docker Desktop (for MongoDB)
# OR
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Node.js 18+
node --version
```

### Production Server
```bash
# MongoDB tools
sudo apt install mongodb-org-tools

# rclone for Google Drive
curl https://rclone.org/install.sh | sudo bash
rclone config  # Setup 'gdrive' remote

# PM2 process manager
npm install -g pm2
```

## Server Paths

| Component | Path |
|-----------|------|
| **Application** | `/mnt/HC_Volume_103871510/host/regform` |
| **Scripts** | `/mnt/HC_Volume_103871510/host/regform/scripts` |
| **Backups** | `/mnt/HC_Volume_103871510/backups/regform` |
| **Uploads** | `/mnt/HC_Volume_103871510/host/StrapiMongoDB/public/uploads` |

## Monitoring

### View Logs
```bash
# Backup logs
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/backup_*.log

# Cron logs
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/cron.log

# PM2 logs
pm2 logs regform
```

### Check Status
```bash
# List recent backups
ls -lht /mnt/HC_Volume_103871510/backups/regform/mongodb/*/*.tar.gz | head -5

# Check Google Drive sync
rclone lsf gdrive:Backups/RegForm/mongodb/ | tail -5

# Verify cron jobs
crontab -l | grep backup

# PM2 status
pm2 status
```

## Troubleshooting

### Deployment Issues
```bash
# Check PM2
pm2 status
pm2 logs regform --lines 50

# Restart app
pm2 restart regform

# Manual build
cd /mnt/HC_Volume_103871510/host/regform
npm install
npm run build
```

### Backup Issues
```bash
# Check disk space
df -h /mnt/HC_Volume_103871510

# Test MongoDB
mongosh mongodb://127.0.0.1:27017/production --eval "db.stats()"

# Clean old backups
find /mnt/HC_Volume_103871510/backups/regform -name "*.tar.gz" -mtime +7 -delete
```

### rclone Issues
```bash
# Test connection
rclone lsf gdrive:

# Reconnect
rclone config reconnect gdrive:

# Manual upload test
rclone copy /path/to/file gdrive:Backups/RegForm/test/
```

## Documentation

- **[BACKUP_SYSTEM.md](../BACKUP_SYSTEM.md)** - Complete backup system documentation
- **[QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - Quick command reference
- **[README.md](../README.md)** - Main project documentation

## First-Time Setup on Server

```bash
# Navigate to scripts
cd /mnt/HC_Volume_103871510/host/regform/scripts

# Make all scripts executable
chmod +x *.sh

# Setup automated backups
./setup-backup.sh

# Test backup manually
./backup.sh

# Verify backup was created
ls -lh /mnt/HC_Volume_103871510/backups/regform/mongodb/*/
```

---

**Need help?** Check logs first, then review detailed documentation in parent directory.
