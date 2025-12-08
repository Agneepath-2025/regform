# Quick Reference Card

## Essential Commands

### Deployment
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts && ./deploy.sh
```

### Backup
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts && ./backup.sh
```

### Restore
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts && ./restore.sh
```

### First-Time Setup
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
chmod +x *.sh
./setup-backup.sh
```

---

## Quick Checks

### View Logs
```bash
# Backup logs
tail -f /mnt/HC_Volume_103871510/backups/regform/logs/backup_*.log

# PM2 logs
pm2 logs regform
```

### List Backups
```bash
ls -lht /mnt/HC_Volume_103871510/backups/regform/mongodb/*/*.tar.gz | head -5
```

### Check Disk Space
```bash
df -h /mnt/HC_Volume_103871510
```

### PM2 Status
```bash
pm2 status regform
pm2 restart regform
```

---

## File Locations

| Type | Path |
|------|------|
| **Application** | `/mnt/HC_Volume_103871510/host/regform` |
| **Scripts** | `/mnt/HC_Volume_103871510/host/regform/scripts` |
| **Backups** | `/mnt/HC_Volume_103871510/backups/regform` |
| **Uploads** | `/mnt/HC_Volume_103871510/host/StrapiMongoDB/public/uploads` |

---

## Emergency Procedures

### App Down
```bash
cd /mnt/HC_Volume_103871510/host/regform
pm2 restart regform
pm2 logs regform --lines 50
```

### Restore from Backup
```bash
cd /mnt/HC_Volume_103871510/host/regform/scripts
./restore.sh
# Choose option 3 (Restore both)
```

### Out of Disk Space
```bash
# Remove old backups
find /mnt/HC_Volume_103871510/backups/regform -name "*.tar.gz" -mtime +7 -delete

# Clean npm cache
npm cache clean --force

# Clean PM2 logs
pm2 flush
```

---

**📖 Full Documentation:** See `scripts/README.md` or `BACKUP_SYSTEM.md`
