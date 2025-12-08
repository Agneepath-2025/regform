#!/bin/bash
# Deployment script for production server
# Location: /mnt/HC_Volume_103871510/host/regform/scripts/deploy.sh

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /mnt/HC_Volume_103871510/host/regform || exit 1

# Clean build artifacts and lock files
echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf package-lock.json

# Stash or restore local changes before pulling
echo "📋 Handling local changes..."
git restore deploy.sh pnpm-lock.yaml 2>/dev/null || true

# Pull latest changes
echo "📥 Fetching and pulling latest changes..."
git fetch
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Restart with PM2
echo "🔄 Restarting application..."
pm2 restart regform

echo "✅ Deployment complete!"
echo "📊 Check logs with: pm2 logs regform"
