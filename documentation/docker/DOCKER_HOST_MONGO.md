# Using Docker with Existing MongoDB

This configuration allows Docker to use your existing MongoDB installation (with all your data) instead of running MongoDB in a container.

## ✅ Your Data is Safe

- **Data location**: `/var/lib/mongodb` (not in the apt repository)
- **The apt repository**: Just for installing/updating MongoDB software
- **Fixing the repo**: Won't affect your data at all

## 🔧 Option 1: Fix MongoDB Repository (Recommended)

The MongoDB repo error is because Ubuntu 24.04 (Noble) isn't officially supported yet. Use the Ubuntu 22.04 (Jammy) repository instead:

```bash
# On your server

# 1. Remove the broken Noble repository
sudo rm -f /etc/apt/sources.list.d/mongodb*.list

# 2. Add the Jammy repository (works on Noble)
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Update apt (should work now)
sudo apt-get update

# 4. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
```

## 🐳 Option 2: Remove MongoDB Repo, Keep MongoDB Running

If you don't need to update MongoDB, just remove the repo:

```bash
# Remove the repository (MongoDB software stays installed)
sudo rm -f /etc/apt/sources.list.d/mongodb*.list
sudo rm -f /usr/share/keyrings/mongodb*.gpg

# Update apt
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose-plugin
```

## 📝 Configure Docker to Use Host MongoDB

### 1. Update .env file

```bash
# MongoDB Connection - Use host MongoDB
# For Linux: use 127.0.0.1 or localhost
# Docker will connect via host.docker.internal (mapped in compose file)
MONGODB_URI=mongodb://127.0.0.1:27017/production

# If MongoDB has authentication:
# MONGODB_URI=mongodb://username:password@127.0.0.1:27017/production?authSource=admin

MONGO_DATABASE=production
```

### 2. Deploy with Host MongoDB

```bash
# Use the special compose file for host MongoDB
docker-compose -f docker-compose.host-mongo.yml up -d

# Or add to package.json
npm run docker:host
```

### 3. Verify Connection

```bash
# Check if app can connect to MongoDB
docker-compose -f docker-compose.host-mongo.yml logs -f app

# Should see successful MongoDB connection messages
```

## 🔍 Check Your Current MongoDB

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB version
mongod --version

# Check data location
sudo ls -lh /var/lib/mongodb

# Test connection
mongosh --eval "db.runCommand({ connectionStatus: 1 })"

# List databases
mongosh --eval "show dbs"
```

## 📊 Two Deployment Options

### Option A: Docker App + Host MongoDB (Recommended)

**Pros:**
- ✅ Keep all your existing data
- ✅ No data migration needed
- ✅ Keep your MongoDB configuration
- ✅ Simpler setup

**Deploy:**
```bash
docker-compose -f docker-compose.host-mongo.yml up -d
```

### Option B: Full Docker Stack (App + MongoDB)

**Pros:**
- ✅ Everything containerized
- ✅ Easier backups
- ✅ Portable setup

**Requires:**
- Export data from host MongoDB
- Import into Docker MongoDB
- More setup steps

**Deploy:**
```bash
docker-compose up -d
```

## 🔄 Migration Script (If You Choose Full Docker)

If you later want to move to full Docker:

```bash
# 1. Export from host MongoDB
mongodump --uri="mongodb://127.0.0.1:27017/production" --out=./backup

# 2. Start Docker MongoDB
docker-compose up -d mongodb

# 3. Import to Docker MongoDB
docker cp ./backup regform-mongodb:/data/backup
docker-compose exec mongodb mongorestore \
  -u admin -p YOUR_PASSWORD \
  --authenticationDatabase admin \
  --db production \
  /data/backup/production

# 4. Start app
docker-compose up -d app
```

## 📝 Updated NPM Scripts

Add to package.json:

```json
"scripts": {
  "docker:host": "docker-compose -f docker-compose.host-mongo.yml up -d",
  "docker:host:down": "docker-compose -f docker-compose.host-mongo.yml down",
  "docker:host:logs": "docker-compose -f docker-compose.host-mongo.yml logs -f"
}
```

## 🚀 Quick Start with Host MongoDB

```bash
# 1. Fix MongoDB repository (or remove it)
sudo rm -f /etc/apt/sources.list.d/mongodb*.list
sudo apt-get update

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Log out and back in

# 4. Configure .env
cp .env.docker .env
nano .env
# Set: MONGODB_URI=mongodb://127.0.0.1:27017/production

# 5. Deploy with host MongoDB
docker-compose -f docker-compose.host-mongo.yml build
docker-compose -f docker-compose.host-mongo.yml up -d

# 6. Check logs
docker-compose -f docker-compose.host-mongo.yml logs -f
```

## 🐛 Troubleshooting

### Can't connect to host MongoDB from Docker

```bash
# Check MongoDB is listening on all interfaces
sudo nano /etc/mongod.conf

# Find and update:
net:
  bindIp: 127.0.0.1,0.0.0.0

# Restart MongoDB
sudo systemctl restart mongod

# Check if listening
sudo netstat -tulpn | grep 27017
```

### Connection refused

```bash
# Allow Docker to connect to host
sudo ufw allow from 172.17.0.0/16 to any port 27017

# Or if using iptables
sudo iptables -A INPUT -s 172.17.0.0/16 -p tcp --dport 27017 -j ACCEPT
```

### Test connection from Docker

```bash
# Start a test container
docker run --rm -it --add-host=host.docker.internal:host-gateway mongo:6.0 mongosh "mongodb://host.docker.internal:27017/production"
```

## ✅ Summary

1. **Your data is safe** - it's in `/var/lib/mongodb`, not the apt repository
2. **Fix the repo** - Use Jammy repository on Noble, or remove it entirely
3. **Install Docker** - After fixing the repo issue
4. **Use host MongoDB** - Deploy with `docker-compose.host-mongo.yml`
5. **No data migration** - Everything stays where it is

You can keep your MongoDB installation and data exactly as it is, and just run the app in Docker!
