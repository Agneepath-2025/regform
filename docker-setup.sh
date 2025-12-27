#!/bin/bash

# Quick Docker Setup Script for Agneepath Registration Form
# This script helps set up the Docker environment quickly

set -e

echo "🐳 Agneepath Registration Form - Docker Setup"
echo "=============================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo "✅ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env file with your actual credentials:"
        echo "   - MongoDB password"
        echo "   - Google OAuth credentials"
        echo "   - Google Service Account key"
        echo "   - SMTP credentials"
        echo "   - Security keys (encryption, JWT, session)"
        echo "   - Admin emails"
        echo ""
        read -p "Press Enter after you've updated the .env file..."
    else
        echo "❌ .env.docker template not found!"
        exit 1
    fi
else
    echo "✅ .env file already exists"
    echo ""
fi

# Ask user which mode to run
echo "Select deployment mode:"
echo "1) Production (optimized build)"
echo "2) Development (with hot reload)"
echo ""
read -p "Enter choice (1 or 2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "🚀 Starting Production Environment..."
    echo ""
    
    # Build images
    echo "📦 Building Docker images..."
    docker-compose build
    
    # Start services
    echo "🎬 Starting services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check status
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    
    echo ""
    echo "✅ Production environment is running!"
    echo "   Application: http://localhost:7000"
    echo "   MongoDB: localhost:27017"
    echo ""
    echo "📝 View logs with: docker-compose logs -f"
    echo "🛑 Stop services with: docker-compose down"
    
elif [ "$mode" = "2" ]; then
    echo ""
    echo "🚀 Starting Development Environment..."
    echo ""
    
    # Build images
    echo "📦 Building Docker images..."
    docker-compose -f docker-compose.dev.full.yml build
    
    # Start services
    echo "🎬 Starting services..."
    docker-compose -f docker-compose.dev.full.yml up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check status
    echo ""
    echo "📊 Service Status:"
    docker-compose -f docker-compose.dev.full.yml ps
    
    echo ""
    echo "✅ Development environment is running!"
    echo "   Application: http://localhost:3000"
    echo "   MongoDB: localhost:27017"
    echo "   Hot reload: Enabled"
    echo ""
    echo "📝 View logs with: docker-compose -f docker-compose.dev.full.yml logs -f app-dev"
    echo "🛑 Stop services with: docker-compose -f docker-compose.dev.full.yml down"
    
else
    echo "❌ Invalid choice. Exiting."
    exit 1
fi

echo ""
echo "📚 For more information, see DOCKER_README.md"
