# Local Development Guide

This guide will help you set up and run the RegForm application locally on your machine.

## Quick Start

```bash
# 1. Run the automated setup script
npm run local:setup

# 2. Install dependencies (if not already done)
npm install

# 3. Start the development server
npm run dev

# 4. Open your browser
open http://localhost:3000
```

## Manual Setup

### 1. Start MongoDB

**Option A: Using Docker (Recommended)**
```bash
# Start MongoDB container
npm run db:start

# Verify it's running
npm run db:logs
```

**Option B: Using Homebrew**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

### 2. Configure Environment

```bash
# Copy the local environment template
cp .env.local.example .env.local

# Edit with your settings (if needed)
# Default values should work for local development
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Environment Files

| File | Purpose | Used When |
|------|---------|-----------|
| `.env.local` | Local development | `npm run dev` |
| `.env` | Docker deployment | `docker-compose up` |
| `.env.production` | Production server | Server deployment |

## MongoDB Configuration

### Local Development
- **Connection**: `mongodb://127.0.0.1:27017/production`
- **No authentication** required (safe for local only)
- **Container name**: `regform-mongodb-dev`
- **Port**: 27017

### Docker Commands

```bash
# Start MongoDB
npm run db:start

# Stop MongoDB (keeps data)
npm run db:stop

# View logs
npm run db:logs

# Reset database (⚠️ DELETES ALL DATA)
npm run db:reset
```

## Development Workflow

### 1. Daily Development
```bash
# Start MongoDB if not running
npm run db:start

# Start dev server
npm run dev

# Make your changes
# Hot reload will update automatically
```

### 2. Testing Changes
```bash
# Run a production build locally
npm run test:build

# Or just build
npm run build
```

### 3. Stopping Services
```bash
# Stop dev server: Ctrl + C in terminal

# Stop MongoDB
npm run db:stop
```

## vs Production Docker Setup

| Aspect | Local Dev | Production Docker |
|--------|-----------|-------------------|
| MongoDB | No auth | Username/password |
| Host | 127.0.0.1 | Service name (mongodb) |
| Port | 3000 | 7000 |
| Env File | .env.local | .env |
| Hot Reload | ✅ Yes | ❌ No |
| Container | MongoDB only | App + MongoDB |

## Common Issues

### Port 27017 already in use
```bash
# Find what's using the port
lsof -i :27017

# If it's another MongoDB, stop it
brew services stop mongodb-community

# Or kill the process
kill -9 <PID>
```

### Port 3000 already in use
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### MongoDB connection errors
```bash
# Check if container is running
docker ps | grep regform-mongodb-dev

# Restart MongoDB
npm run db:reset

# Check logs for errors
npm run db:logs
```

### Missing environment variables
```bash
# Make sure .env.local exists
ls -la .env.local

# If not, create it
cp .env.local.example .env.local
```

## Additional Tools

### MongoDB Client (mongosh)
```bash
# Install
brew install mongosh

# Connect to local DB
mongosh mongodb://127.0.0.1:27017/production

# List databases
show dbs

# Use production database
use production

# Show collections
show collections

# Query users
db.users.find().pretty()
```

### MongoDB Compass (GUI)
Download from: https://www.mongodb.com/products/compass

**Connection String**: `mongodb://127.0.0.1:27017/production`

## Next Steps

- See [DOCKER.md](DOCKER.md) for production deployment
- See [README.md](README.md) for API documentation
- See [PAYMENT_VERIFICATION_SETUP.md](documentation/PAYMENT_VERIFICATION_SETUP.md) for webhook setup

## Getting Help

If you encounter issues:
1. Check the logs: `npm run db:logs`
2. Try resetting: `npm run db:reset`
3. Check environment: `cat .env.local`
4. Verify Docker: `docker ps`
