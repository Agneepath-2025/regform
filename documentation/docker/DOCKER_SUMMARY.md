# 🐳 Docker Containerization - Quick Reference

The Agneepath Registration Form application has been fully containerized with Docker.

## 📦 What's Included

### Docker Files Created
- **`Dockerfile`** - Multi-stage production build (optimized)
- **`Dockerfile.dev`** - Development build with hot reload
- **`docker-compose.yml`** - Production stack (app + MongoDB)
- **`docker-compose.dev.full.yml`** - Development stack with hot reload
- **`docker-compose.dev.yml`** - MongoDB only (existing, preserved)
- **`.dockerignore`** - Excludes unnecessary files from builds
- **`.env.docker`** - Environment variables template
- **`docker-setup.sh`** - Quick setup script
- **`DOCKER_README.md`** - Comprehensive documentation

### Additional Files
- **`app/api/health/route.ts`** - Health check endpoint
- **`scripts/docker-healthcheck.sh`** - Health check script
- **Updated `package.json`** - Added Docker npm scripts

## 🚀 Quick Start

### Option 1: Using Setup Script (Recommended)
```bash
./docker-setup.sh
```

### Option 2: Manual Setup

#### Production
```bash
# 1. Copy environment file
cp .env.docker .env

# 2. Edit with your credentials
nano .env

# 3. Start services
npm run docker:up

# 4. View logs
npm run docker:logs
```

#### Development
```bash
# Start development with hot reload
npm run docker:dev

# View logs
npm run docker:dev:logs
```

## 🔧 NPM Scripts Added

| Script | Command | Description |
|--------|---------|-------------|
| `docker:build` | `docker-compose build` | Build production images |
| `docker:up` | `docker-compose up -d` | Start production stack |
| `docker:down` | `docker-compose down` | Stop production stack |
| `docker:logs` | `docker-compose logs -f` | View production logs |
| `docker:restart` | `docker-compose restart` | Restart production services |
| `docker:clean` | `docker-compose down -v` | Remove all containers & volumes |
| `docker:dev` | Start development stack | With hot reload |
| `docker:dev:down` | Stop development stack | - |
| `docker:dev:logs` | View development logs | - |

## 🌐 Access Points

### Production
- **Application**: http://localhost:7000
- **MongoDB**: localhost:27017

### Development
- **Application**: http://localhost:3000
- **MongoDB**: localhost:27017

## 📋 Required Environment Variables

Update these in `.env` file:

### Critical (Must Change)
- `MONGO_ROOT_PASSWORD` - MongoDB root password
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `GOOGLE_PRIVATE_KEY` - Service account private key
- `ENCRYPTION_KEY` - Data encryption key
- `JWT_SECRET` - JWT signing secret
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_ADMIN_EMAILS` - Admin email addresses

### Important
- `SMTP_PASS` - Email SMTP password
- `WEBHOOK_SECRET` - Webhook authentication
- `ALLOWED_ORIGINS` - CORS allowed origins

## 🏗️ Architecture

```
┌─────────────────────┐
│   Docker Network    │
│                     │
│  ┌──────────────┐  │
│  │   Next.js    │  │  Port 7000 (prod)
│  │     App      │◄─┼─ Port 3000 (dev)
│  │              │  │
│  └──────┬───────┘  │
│         │          │
│         ▼          │
│  ┌──────────────┐  │
│  │   MongoDB    │◄─┼─ Port 27017
│  │   Database   │  │
│  └──────────────┘  │
│                     │
└─────────────────────┘
```

## ✅ Features

- ✨ **Multi-stage builds** - Optimized production images
- 🔄 **Hot reload** - Fast development iteration
- 🏥 **Health checks** - Automatic container monitoring
- 💾 **Data persistence** - Volumes for database & uploads
- 🔒 **Security** - Non-root user, isolated network
- 📊 **Monitoring** - Built-in health endpoints
- 🚀 **Production ready** - Standalone Next.js build

## 🐛 Common Issues

### Port Already in Use
Edit `.env`:
```env
APP_PORT=8000  # Change from 7000
MONGODB_PORT=27018  # Change from 27017
```

### MongoDB Connection Failed
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify credentials in .env
# Ensure MONGO_ROOT_PASSWORD matches in both places
```

### Application Not Starting
```bash
# View detailed logs
docker-compose logs -f app

# Check if MongoDB is healthy
docker-compose ps
```

## 🧹 Cleanup

```bash
# Stop and remove everything
npm run docker:clean

# Remove images too
docker rmi regform-app regform-app-dev

# Remove volumes manually if needed
docker volume rm regform-mongodb-data regform-mongodb-config
```

## 📚 Documentation

For detailed information, see:
- **[DOCKER_README.md](DOCKER_README.md)** - Complete guide
- **[app/api/health/README.md](app/api/health/README.md)** - Health check API

## 🎯 Next Steps

1. **Production Deployment**:
   - Set up reverse proxy (nginx/traefik)
   - Configure SSL certificates
   - Set up automated backups
   - Configure monitoring & logging

2. **CI/CD**:
   - Add GitHub Actions for automated builds
   - Set up container registry
   - Implement automated testing

3. **Scaling**:
   - Add load balancer
   - Implement database replication
   - Set up caching layer (Redis)

## 💡 Tips

- Use `.env` for local development
- Use Docker secrets for production
- Regularly update base images for security
- Monitor container resource usage
- Set up automated backups for MongoDB
- Use volume backups before major updates

---

**Created**: December 27, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for deployment
