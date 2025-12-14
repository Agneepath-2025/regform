# Docker Setup Guide

This project includes complete Docker containerization for both development and production environments.

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.docker.example .env
   ```

2. **Configure environment variables in `.env`:**
   - MongoDB credentials
   - Google OAuth credentials
   - Google Sheets API credentials
   - SMTP email settings
   - Webhook secret

3. **Build and run:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - App: http://localhost:7000
   - MongoDB: localhost:27017

## Docker Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### View logs
```bash
# All services
docker-compose logs -f

# App only
docker-compose logs -f app

# MongoDB only
docker-compose logs -f mongodb
```

### Reset everything (including volumes)
```bash
docker-compose down -v
```

## Architecture

### Multi-Stage Dockerfile
The Dockerfile uses three stages for optimal image size:
1. **deps**: Installs dependencies
2. **builder**: Builds the Next.js application
3. **runner**: Minimal production runtime (node:20-alpine)

### Services
- **app**: Next.js application (port 7000)
- **mongodb**: MongoDB 6.0 database (port 27017)

### Networks
All services run on a custom bridge network (`regform-network`) for secure inter-service communication.

### Volumes
- `mongodb_data`: Persistent MongoDB data
- `mongodb_config`: MongoDB configuration

## Environment Variables

### Required for Build Time
The following variables are needed during `docker-compose build`:
- None (Next.js builds in standalone mode without build-time env vars)

### Required for Runtime
All variables in `.env.docker.example` are required for the application to run properly.

### MongoDB Connection
When running in Docker, use the service name as hostname:
```
mongodb://admin:password@mongodb:27017/production?authSource=admin
```

## Production Deployment

For production, consider:

1. **Use secrets management:**
   ```yaml
   secrets:
     mongodb_password:
       file: ./secrets/mongodb_password.txt
   ```

2. **Add reverse proxy (nginx):**
   - SSL/TLS termination
   - Load balancing
   - Static file serving

3. **Health checks:**
   Already configured for both services

4. **Resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

## Troubleshooting

### Port already in use
If port 7000 or 27017 is in use, modify the ports in `docker-compose.yml`:
```yaml
ports:
  - "8080:7000"  # Map to different host port
```

### MongoDB authentication errors
Ensure `MONGODB_URI` matches the credentials in `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD`.

### Build fails
Clear Docker cache and rebuild:
```bash
docker-compose build --no-cache
```

### Container crashes
Check logs for specific errors:
```bash
docker-compose logs app
```

## Development Workflow

1. Make code changes locally
2. Rebuild and restart:
   ```bash
   docker-compose up --build
   ```
3. Test at http://localhost:7000

For faster iteration, you can mount local code as a volume (for development only):
```yaml
volumes:
  - ./src:/app/src
  - ./app:/app/app
```

## Maintenance

### Update dependencies
```bash
docker-compose exec app npm update
docker-compose restart app
```

### Database backup
```bash
docker-compose exec mongodb mongodump --out /tmp/backup
docker cp regform-mongodb:/tmp/backup ./mongodb-backup
```

### Database restore
```bash
docker cp ./mongodb-backup regform-mongodb:/tmp/backup
docker-compose exec mongodb mongorestore /tmp/backup
```
