# Docker Installation Troubleshooting

## Problem: MongoDB Repository Error

When installing Docker, you encounter:
```
E: The repository 'https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 Release' does not have a Release file.
```

## Quick Fix

**On your server, run these commands:**

```bash
# 1. Remove the problematic MongoDB repository
sudo rm -f /etc/apt/sources.list.d/mongodb*.list
sudo rm -f /usr/share/keyrings/mongodb*.gpg

# 2. Update apt
sudo apt-get update

# 3. Now install Docker
curl -fsSL https://get.docker.com | sh

# 4. Add your user to docker group
sudo usermod -aG docker $USER

# 5. Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 6. Log out and log back in, then test
docker run hello-world
```

## Or Use the Automated Script

Transfer `fix-docker-install.sh` to your server and run:

```bash
./fix-docker-install.sh
```

## Why This Happens

- You had MongoDB repository configured for Ubuntu Noble (24.04)
- MongoDB 7.0 doesn't officially support Ubuntu 24.04 yet
- The Docker installer runs `apt-get update` which fails due to this broken repository
- We'll install MongoDB via Docker instead, so we don't need this repository

## After Docker is Installed

1. **Verify Docker is working:**
   ```bash
   docker --version
   docker compose version
   docker run hello-world
   ```

2. **Proceed with deployment:**
   ```bash
   ./deploy-server.sh
   ```

## MongoDB in Docker

Don't worry about removing the MongoDB repository - you'll be running MongoDB in a Docker container, which is:
- ✅ Easier to manage
- ✅ Isolated from the system
- ✅ Easy to backup and restore
- ✅ Version-controlled in docker-compose.yml

## Manual MongoDB Removal (If Needed)

If you have MongoDB installed and want to remove it:

```bash
# Stop MongoDB service
sudo systemctl stop mongod

# Remove MongoDB packages
sudo apt-get purge mongodb-org*

# Remove data (BACKUP FIRST!)
sudo rm -rf /var/log/mongodb
sudo rm -rf /var/lib/mongodb

# Remove configuration
sudo rm /etc/mongod.conf
```

## Alternative: Fix MongoDB Repository for Noble

If you need system MongoDB (not recommended):

```bash
# Use the Jammy (22.04) repository instead
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
```

But for this application, **use Docker MongoDB** instead (already configured in docker-compose.yml).
