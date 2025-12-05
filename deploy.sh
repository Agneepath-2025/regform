#!/bin/bash
# Deployment script for production server

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /mnt/HC_Volume_103871510/host/regform || exit 1

# Pull latest changes (if using git)
echo "📥 Fetching latest changes from repository..."
git fetch origin || echo "⚠️  Git fetch failed"

echo "📥 Pulling latest changes..."
git pull origin main || echo "⚠️  No git repository or pull failed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --omit=dev

# Build the application
echo "🔨 Building application..."
npm run build

# Restart with PM2
echo "🔄 Restarting application..."
pm2 restart regform

echo "✅ Deployment complete!"
echo "📊 Check logs with: pm2 logs regform"
