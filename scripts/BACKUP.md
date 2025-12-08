# Backup System Setup Guide

Complete guide to setting up automated backups for MongoDB and uploaded files.

## Prerequisites

### 1. Install MongoDB Tools
```bash
sudo apt-get update
sudo apt-get install mongodb-org-tools
```

### 2. Install rclone (for Google Drive sync)
```bash
curl https://rclone.org/install.sh | sudo bash
```

### 3. Configure Google Drive Access
```bash
rclone config
```

Follow these steps in the interactive prompt:
1. Choose: `n` (new remote)
2. Name: `gdrive`
3. Storage type: Choose `drive` (Google Drive)
4. Client ID & Secret: Press Enter (leave blank for default)
5. Scope: Choose `1` (Full access)
6. Root folder: Press Enter (leave blank)
7. Service Account: Press Enter (leave blank)
8. Advanced config: `n` (no)
9. Auto config: `y` (yes)
   - This will open a browser window
   - Login with your Google account
   - Grant access permissions
10. Shared drive: Press Enter (leave blank)
11. Confirm: `y` (yes)
12. Quit: `q`

**Verify connection:**
```bash
rclone lsf gdrive:
```

## One-Time Setup

### Run the setup script:
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
chmod +x setup-backup.sh
./setup-backup.sh
```

This will:
1. Make all scripts executable
2. Check for rclone installation
3. Prompt you to choose backup frequency
4. Create cron job for automated backups
5. Optionally run initial backup

### Backup Frequency Options:
- **Every 6 hours** - For high-traffic periods
- **Every 12 hours** - Moderate frequency
- **Daily at 2 AM** - Recommended for most cases
- **Twice daily** - 2 AM and 2 PM
- **Custom** - Your own cron schedule

## Manual Backup

Run backup anytime:
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./backup.sh
```

## What Gets Backed Up

### 1. MongoDB Database
- Database: `production`
- URI: `mongodb://127.0.0.1:27017/production`
- Compressed with `mongodump` and `tar`

### 2. Uploaded Files
- Location: `/mnt/HC_Volume_103871510/host/StrapiMongoDB/public/uploads`
- Includes: Photos, payment proofs, documents
- Compressed with `tar`

### 3. Configuration Files
- `.env.production`
- `package.json`
- `next.config.ts`

## Backup Locations

### Local Server
```
/mnt/HC_Volume_103871510/backups/regform/
├── mongodb/YYYY-MM/
│   └── mongodb_YYYYMMDD_HHMMSS.tar.gz
├── uploads/YYYY-MM/
│   └── uploads_YYYYMMDD_HHMMSS.tar.gz
├── config_YYYYMMDD_HHMMSS.tar.gz
└── logs/
    ├── backup_YYYYMMDD_HHMMSS.log
    └── cron.log
```

**Retention:** 30 days (automatically cleaned)

### Google Drive
```
gdrive:Backups/RegForm/
├── mongodb/YYYY-MM/
├── uploads/YYYY-MM/
└── config/
```

**Retention:** 90 days (automatically cleaned)

## Restoration

### Interactive Restoration Tool
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./restore.sh
```

**Menu Options:**
1. Restore MongoDB only
2. Restore uploaded files only
3. Restore both
4. Download from Google Drive first
5. List available backups
6. Exit

### Quick Restore Examples

**Restore latest backup:**
```bash
./restore.sh
# Choose: 5 (List backups)
# Note the filenames
# Run again, choose: 3 (Restore both)
```

**Restore from Google Drive:**
```bash
./restore.sh
# Choose: 4 (Download from Google Drive)
# Follow prompts
```

**Restore only database:**
```bash
./restore.sh
# Choose: 1 (Restore MongoDB only)
```

## Monitoring

### View Backup Logs
```bash
# Latest backup
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/backup_*.log | tail -1

# Cron execution log
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/cron.log
```

### Check Backup Status
```bash
# List recent local backups
ls -lht /mnt/HC_Volume_103871510/backups/regform/mongodb/*/*.tar.gz | head -5

# Check Google Drive backups
rclone lsf gdrive:Backups/RegForm/mongodb/ | tail -5

# View active cron jobs
crontab -l | grep backup
```

### Verify Backup Integrity
```bash
# Test MongoDB backup
tar -tzf /path/to/mongodb_backup.tar.gz | head

# Test uploads backup
tar -tzf /path/to/uploads_backup.tar.gz | head
```

## Troubleshooting

### Backup Script Fails

**Check disk space:**
```bash
df -h /mnt/HC_Volume_103871510
```

**Check MongoDB connection:**
```bash
mongosh mongodb://127.0.0.1:27017/production --eval "db.stats()"
```

**Check script permissions:**
```bash
ls -l /mnt/HC_Volume_103871510/host/regform/scripts/backup.sh
chmod +x /mnt/HC_Volume_103871510/host/regform/scripts/backup.sh
```

### rclone Upload Fails

**Test connection:**
```bash
rclone lsf gdrive:
```

**Reconnect if needed:**
```bash
rclone config reconnect gdrive:
```

**Check rclone config:**
```bash
rclone config show gdrive
```

### Out of Disk Space

**Clean old backups manually:**
```bash
# Remove backups older than 7 days
find /mnt/HC_Volume_103871510/backups/regform -name "*.tar.gz" -mtime +7 -delete
```

**Clean Google Drive manually:**
```bash
# List old files
rclone lsf --max-age 30d gdrive:Backups/RegForm/mongodb/

# Delete files older than 30 days
rclone delete --min-age 30d gdrive:Backups/RegForm/mongodb/
```

### Restore Fails

**Check MongoDB is running:**
```bash
systemctl status mongod
sudo systemctl start mongod
```

**Verify backup file exists:**
```bash
ls -lh /mnt/HC_Volume_103871510/backups/regform/mongodb/*/mongodb_*.tar.gz
```

**Check mongorestore is available:**
```bash
which mongorestore
mongorestore --version
```

## Configuration

### Modify Retention Periods

Edit `backup.sh`:
```bash
nano /mnt/HC_Volume_103871510/host/regform/scripts/backup.sh
```

Find and modify:
```bash
LOCAL_RETENTION_DAYS=30      # Local backup retention
GDRIVE_RETENTION_DAYS=90     # Google Drive retention
```

### Change Backup Schedule

Edit crontab:
```bash
crontab -e
```

Example schedules:
```bash
# Every 6 hours
0 */6 * * * /path/to/backup.sh

# Daily at 2 AM
0 2 * * * /path/to/backup.sh

# Twice daily (2 AM and 2 PM)
0 2,14 * * * /path/to/backup.sh

# Every weekday at 3 AM
0 3 * * 1-5 /path/to/backup.sh
```

### Disable Automated Backups

```bash
crontab -e
# Comment out the backup line with #
# #0 2 * * * /path/to/backup.sh
```

## Security Best Practices

1. **Restrict backup directory permissions:**
   ```bash
   chmod 700 /mnt/HC_Volume_103871510/backups/regform
   ```

2. **Keep Google Drive credentials secure:**
   - rclone stores credentials in `~/.config/rclone/rclone.conf`
   - Ensure only root/authorized users can access

3. **Monitor backup logs regularly:**
   - Check for failed backups
   - Verify Google Drive sync

4. **Test restoration periodically:**
   - Run test restore monthly
   - Verify data integrity

## Emergency Recovery

### Complete System Failure

1. **Install prerequisites** (MongoDB tools, rclone)
2. **Configure rclone** with same Google account
3. **Download latest backup from Google Drive:**
   ```bash
   mkdir -p /tmp/restore
   rclone copy gdrive:Backups/RegForm/ /tmp/restore/ --progress
   ```
4. **Restore MongoDB:**
   ```bash
   cd /tmp/restore/mongodb/
   tar -xzf mongodb_YYYYMMDD_HHMMSS.tar.gz
   mongorestore --uri="mongodb://127.0.0.1:27017/production" --db=production mongodb_YYYYMMDD_HHMMSS/production/
   ```
5. **Restore uploads:**
   ```bash
   cd /tmp/restore/uploads/
   tar -xzf uploads_YYYYMMDD_HHMMSS.tar.gz -C /mnt/HC_Volume_103871510/host/StrapiMongoDB/public/
   ```

## Maintenance

### Weekly Tasks
- Check backup logs for errors
- Verify Google Drive sync is working
- Monitor disk space usage

### Monthly Tasks
- Test restoration process
- Review retention policies
- Verify backup integrity

### Quarterly Tasks
- Update documentation if paths change
- Review and optimize backup schedule
- Test emergency recovery procedures

## Support

For issues:
1. Check logs in `/mnt/HC_Volume_103871510/backups/regform/logs/`
2. Review troubleshooting section above
3. Test scripts manually before automation
4. Verify all prerequisites are installed

---

**Last Updated:** December 2025
