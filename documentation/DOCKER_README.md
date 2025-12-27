# Docker Deployment Guide

This guide explains how to deploy the Agneepath Registration Form application using Docker.

## 📋 Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- At least 2GB of available RAM
- At least 5GB of available disk space

## 🚀 Quick Start

### 1. Production Deployment

```bash
# 1. Copy the environment file
cp .env.docker .env

# 2. Edit .env with your actual values
nano .env  # or use your preferred editor

# 3. Build and start the containers
docker-compose up -d

# 4. View logs
docker-compose logs -f app

# 5. Check status
docker-compose ps
```

The application will be available at `http://localhost:7000`

### 2. Development with Hot Reload

```bash
# Use the development compose file
docker-compose -f docker-compose.dev.full.yml up -d

# View logs
docker-compose -f docker-compose.dev.full.yml logs -f app-dev
```

The development server will be available at `http://localhost:3000`

## 📁 File Structure

```
regform/
├── Dockerfile                    # Production image
├── Dockerfile.dev                # Development image with hot reload
├── docker-compose.yml            # Production stack
├── docker-compose.dev.yml        # MongoDB only (existing)
├── docker-compose.dev.full.yml   # Full development stack
├── .dockerignore                 # Files to exclude from build
├── .env.docker                   # Environment template
└── DOCKER_README.md              # This file
```

## ⚙️ Configuration

### Required Environment Variables

Edit `.env` file with the following required values:

#### MongoDB
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DATABASE=production
```

#### Security Keys
```env
ENCRYPTION_KEY=your_32_char_key
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
```

#### Google Service Account
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_spreadsheet_id
```

#### Admin Emails
```env
NEXTAUTH_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## 🐳 Docker Commands

### Production

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f mongodb

# Execute commands in container
docker-compose exec app sh

# Rebuild after code changes
docker-compose up -d --build

# Remove containers and volumes
docker-compose down -v
```

### Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.full.yml up -d

# View logs with hot reload
docker-compose -f docker-compose.dev.full.yml logs -f app-dev

# Stop development environment
docker-compose -f docker-compose.dev.full.yml down
```

## 🔍 Health Checks

The application includes health checks:

- **MongoDB**: Checks database connectivity every 10s
- **App**: Checks HTTP endpoint every 30s

View health status:
```bash
docker-compose ps
```

## 💾 Data Persistence

Data is persisted in Docker volumes:

- `regform-mongodb-data`: Database files
- `regform-mongodb-config`: MongoDB configuration

Additionally, these directories are mounted:
- `./public/uploads`: User uploaded files
- `./public/documents`: Static documents

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong passwords** - Generate secure random passwords
3. **Limit exposed ports** - Only expose necessary ports
4. **Regular updates** - Keep base images updated
5. **Non-root user** - App runs as non-root user (nextjs)
6. **Network isolation** - Services communicate on isolated network

## 🐛 Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs app

# Check if MongoDB is ready
docker-compose logs mongodb

# Verify environment variables
docker-compose config
```

### Database connection issues

```bash
# Test MongoDB connectivity
docker-compose exec mongodb mongosh -u admin -p your_password --authenticationDatabase admin

# Check MongoDB logs
docker-compose logs mongodb
```

### Port already in use

```bash
# Change ports in .env
APP_PORT=8000  # Change from 7000
MONGODB_PORT=27018  # Change from 27017
```

### Reset everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker rmi regform-app regform-app-dev

# Start fresh
docker-compose up -d --build
```

## 📊 Monitoring

### View resource usage

```bash
# CPU and memory stats
docker stats

# Specific container
docker stats regform-app
```

### Check disk usage

```bash
# Docker disk usage
docker system df

# Detailed volume info
docker volume ls
docker volume inspect regform-mongodb-data
```

## 🔄 Updates and Maintenance

### Update application code

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
docker-compose up -d --build

# 3. Verify
docker-compose ps
docker-compose logs -f app
```

### Backup database

```bash
# Export database
docker-compose exec mongodb mongodump --db production --out /data/backup

# Copy backup out of container
docker cp regform-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore database

```bash
# Copy backup into container
docker cp ./mongodb-backup regform-mongodb:/data/restore

# Restore
docker-compose exec mongodb mongorestore --db production /data/restore/production
```

## 🌐 Production Deployment

For production deployment on a server:

1. **Use HTTPS** - Set up reverse proxy (nginx/traefik) with SSL
2. **Environment variables** - Use Docker secrets or encrypted files
3. **Monitoring** - Add logging and monitoring solutions
4. **Backups** - Set up automated database backups
5. **Updates** - Implement CI/CD pipeline

Example nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Notes

- The application uses Next.js standalone mode for optimized production builds
- MongoDB uses the official `mongo:6.0-ubi8` image
- Development mode includes hot reload for faster development
- All sensitive data should be in `.env` file (never committed)
- Logs are available via `docker-compose logs`

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `docker-compose config`
3. Ensure ports are available: `netstat -tuln | grep -E '7000|27017'`
4. Check disk space: `df -h`
5. Verify Docker resources: `docker system df`

For more help, refer to the main application documentation or open an issue.
