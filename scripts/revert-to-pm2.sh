#!/bin/bash

# ============================================
# Revert to PM2 Deployment Script
# ============================================
# This script stops Docker containers and restarts the application with PM2

set -e

echo "🔄 Reverting to PM2 deployment..."

# Navigate to app directory
cd ~/regform || cd /var/www/regform

echo "🛑 Stopping Docker containers..."
if docker-compose -f docker-compose.host-mongo.yml ps -q 2>/dev/null; then
  docker-compose -f docker-compose.host-mongo.yml down
  echo "✅ Docker containers stopped"
else
  echo "ℹ️  No Docker containers running"
fi

echo "📦 Installing dependencies..."
npm ci --production

echo "🔨 Building application..."
npm run build

echo "🚀 Starting application with PM2..."
pm2 restart regform || pm2 start npm --name regform -- start

echo "💾 Saving PM2 configuration..."
pm2 save

echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ Successfully reverted to PM2 deployment!"
echo ""
echo "Your application is now running with PM2 on port 3001"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status              - Check process status"
echo "  pm2 logs regform        - View logs"
echo "  pm2 restart regform     - Restart application"
echo "  pm2 stop regform        - Stop application"
echo "  pm2 delete regform      - Remove process"
