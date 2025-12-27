# 🔄 Server Migration Guide - Old Repo to New Docker Deployment

This guide walks you through migrating from your current repository-based deployment to the new Docker containerized deployment after transferring to a new organization.

## 📋 Prerequisites

- SSH access to your server
- Docker and Docker Compose installed on server
- Access to the new repository location
- Backup of current database (we'll create this)

## 🗂️ Current Setup (Before Migration)

You currently have:
- Folder with git clone of the repo
- Running application (likely with PM2 or similar)
- MongoDB database with production data

## 🚀 Migration Steps

### Step 1: Backup Current Data

**SSH into your server and backup everything:**

```bash
# Navigate to current deployment
cd /path/to/current/agneepath/regform

# 1. Backup MongoDB database
mongodump --uri="mongodb://127.0.0.1:27017/production" --out=./backup-$(date +%Y%m%d)

# 2. Backup environment variables
cp .env.production .env.production.backup
cp .env.local .env.local.backup 2>/dev/null || true

# 3. Backup uploaded files
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/

# 4. Backup documents
tar -czf documents-backup-$(date +%Y%m%d).tar.gz public/documents/

# 5. Copy all backups to a safe location
mkdir -p ~/agneepath-backup-$(date +%Y%m%d)
cp -r backup-$(date +%Y%m%d) ~/agneepath-backup-$(date +%Y%m%d)/
cp .env.*.backup ~/agneepath-backup-$(date +%Y%m%d)/
cp *.tar.gz ~/agneepath-backup-$(date +%Y%m%d)/

echo "✅ Backups created in: ~/agneepath-backup-$(date +%Y%m%d)"
```

### Step 2: Stop Current Application

```bash
# If using PM2
pm2 stop all
pm2 delete all

# If using systemd
sudo systemctl stop agneepath

# If running manually, kill the process
pkill -f "next"

# If using Docker (old setup)
docker-compose down
```

### Step 3: Stop Current MongoDB (if running separately)

```bash
# If MongoDB is running as a service
sudo systemctl stop mongod

# If using Docker
docker stop <mongodb-container-name>
```

### Step 4: Remove Old Deployment Folder

```bash
# Navigate to parent directory
cd /path/to/parent

# Remove old folder (make sure backups are safe first!)
rm -rf agneepath

# Or rename it instead of deleting (safer)
mv agneepath agneepath-old-$(date +%Y%m%d)
```

### Step 5: Clone New Repository

```bash
# Clone from new organization
git clone https://github.com/NEW-ORG/agneepath.git
cd agneepath/regform

# Verify Docker files exist
ls -la | grep -E "Dockerfile|docker-compose"
```

### Step 6: Set Up Environment Variables

```bash
# Copy the Docker environment template
cp .env.docker .env

# Edit with your production values
nano .env

# Or copy from backup
cp ~/agneepath-backup-$(date +%Y%m%d)/.env.production.backup .env

# Important: Update these values for Docker
nano .env
```

**Required changes in `.env` for Docker:**

```bash
# MongoDB - Use these values for Docker network
MONGODB_URI=mongodb://admin:YOUR_PASSWORD@mongodb:27017/production?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DATABASE=production

# Application URLs - Update to your domain
NEXTAUTH_URL=https://yourdomain.com
ROOT_URL=https://yourdomain.com
API_URL=https://yourdomain.com/api

# CORS - Update to your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Port (if using nginx reverse proxy)
APP_PORT=7000

# Copy all other values from your backup
# (Google OAuth, Service Account, SMTP, Security keys, Admin emails, etc.)
```

### Step 7: Restore Uploaded Files

```bash
# Extract uploads backup
cd /path/to/new/agneepath/regform
mkdir -p public/uploads
cd public
tar -xzf ~/agneepath-backup-$(date +%Y%m%d)/uploads-backup-*.tar.gz
tar -xzf ~/agneepath-backup-$(date +%Y%m%d)/documents-backup-*.tar.gz

# Verify files
ls -la uploads/
ls -la documents/
```

### Step 8: Start Docker Services

```bash
cd /path/to/new/agneepath/regform

# Build and start containers
docker-compose build
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 9: Restore Database

```bash
# Wait for MongoDB to be ready (about 20 seconds)
sleep 20

# Copy backup into MongoDB container
docker cp ~/agneepath-backup-$(date +%Y%m%d)/backup-*/production regform-mongodb:/data/restore

# Restore database
docker-compose exec mongodb mongorestore \
  -u admin \
  -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --db production \
  /data/restore

# Verify data
docker-compose exec mongodb mongosh \
  -u admin \
  -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  production \
  --eval "db.users.countDocuments()"
```

### Step 10: Configure Reverse Proxy (Nginx)

**Update your nginx configuration:**

```nginx
# /etc/nginx/sites-available/agneepath
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

**Reload nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 11: Set Up Auto-Start (Optional)

**Create systemd service for Docker Compose:**

```bash
sudo nano /etc/systemd/system/agneepath-docker.service
```

**Service file content:**

```ini
[Unit]
Description=Agneepath Registration Form Docker Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/agneepath/regform
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable agneepath-docker
sudo systemctl start agnepath-docker
```

### Step 12: Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f app

# Test application
curl http://localhost:7000/api/health

# Test from outside
curl https://yourdomain.com/api/health

# Check database
docker-compose exec mongodb mongosh -u admin -p YOUR_PASSWORD --authenticationDatabase admin production
```

## 🔍 Verification Checklist

- [ ] All containers are running (`docker-compose ps`)
- [ ] MongoDB is healthy and has data
- [ ] Application responds on port 7000
- [ ] Nginx reverse proxy is working
- [ ] SSL certificates are valid
- [ ] Can login to admin portal
- [ ] Users data is present
- [ ] Forms data is present
- [ ] Payments data is present
- [ ] Uploaded files are accessible
- [ ] Email sending works
- [ ] Google Sheets sync works

## 🐛 Troubleshooting

### Containers won't start
```bash
docker-compose logs
docker-compose down -v
docker-compose up -d --build
```

### MongoDB connection failed
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify credentials
cat .env | grep MONGO

# Test connection
docker-compose exec mongodb mongosh -u admin -p YOUR_PASSWORD --authenticationDatabase admin
```

### Application crashes
```bash
# Check application logs
docker-compose logs -f app

# Restart application
docker-compose restart app

# Rebuild if needed
docker-compose up -d --build app
```

### Cannot access from outside
```bash
# Check nginx status
sudo systemctl status nginx
sudo nginx -t

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check if port is listening
netstat -tulpn | grep -E '80|443|7000'
```

### Database restore failed
```bash
# Try manual restore
docker cp ~/agneepath-backup-*/backup-* regform-mongodb:/tmp/
docker-compose exec mongodb bash
mongorestore -u admin -p YOUR_PASSWORD --authenticationDatabase admin --db production /tmp/backup-*/production
```

## 📊 Monitoring

### View logs in real-time
```bash
docker-compose logs -f
```

### Check resource usage
```bash
docker stats
```

### Check disk usage
```bash
docker system df
df -h
```

## 🔄 Future Updates

### Update application code
```bash
cd /path/to/agneepath/regform
git pull
docker-compose up -d --build
```

### Update Docker images
```bash
docker-compose pull
docker-compose up -d
```

## 🗂️ Backup Strategy Going Forward

**Set up automated daily backups:**

```bash
# Create backup script
nano ~/backup-agneepath.sh
```

**Backup script content:**

```bash
#!/bin/bash
BACKUP_DIR=~/agneepath-backups
DATE=$(date +%Y%m%d-%H%M%S)
KEEP_DAYS=7

mkdir -p $BACKUP_DIR

# Backup MongoDB
docker-compose -f /path/to/agneepath/regform/docker-compose.yml exec -T mongodb \
  mongodump -u admin -p YOUR_PASSWORD --authenticationDatabase admin --db production \
  --archive=/data/backup-$DATE.archive

docker cp regform-mongodb:/data/backup-$DATE.archive $BACKUP_DIR/

# Backup uploads
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz -C /path/to/agneepath/regform/public uploads

# Remove old backups
find $BACKUP_DIR -name "backup-*" -mtime +$KEEP_DAYS -delete
find $BACKUP_DIR -name "uploads-*" -mtime +$KEEP_DAYS -delete

echo "Backup completed: $DATE"
```

**Make executable and add to cron:**

```bash
chmod +x ~/backup-agneepath.sh

# Run daily at 2 AM
crontab -e
# Add: 0 2 * * * /home/youruser/backup-agneepath.sh >> /home/youruser/backup.log 2>&1
```

## 📝 Important Notes

1. **Security**: Never commit `.env` file with production credentials
2. **Backups**: Always backup before making changes
3. **Testing**: Test updates in development first
4. **Monitoring**: Set up uptime monitoring (UptimeRobot, etc.)
5. **SSL**: Keep SSL certificates updated (certbot auto-renewal)
6. **Updates**: Regularly update Docker images for security patches

## 🆘 Rollback Procedure

If something goes wrong:

```bash
# Stop new deployment
docker-compose down

# Restore old deployment
mv agneepath-old-$(date +%Y%m%d) agneepath
cd agneepath/regform

# Start old version
pm2 start ecosystem.config.js
# or however you were running it before

# Restore database from backup if needed
```

---

**Migration Date**: _______________  
**Performed By**: _______________  
**Status**: _______________  
**Notes**: _______________
