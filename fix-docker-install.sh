#!/bin/bash

# Docker Installation Fix Script
# Fixes MongoDB repository issues before installing Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🔧 Fixing MongoDB Repository and Installing Docker"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Do not run this script as root. Run as your regular user with sudo access."
    exit 1
fi

# Step 1: Check for MongoDB repository issues
echo "Step 1: Checking for problematic MongoDB repository..."

if grep -r "mongodb" /etc/apt/sources.list /etc/apt/sources.list.d/ 2>/dev/null | grep -q "noble"; then
    print_warning "Found MongoDB repository for Ubuntu Noble (24.04)"
    echo ""
    echo "The MongoDB repository needs to be removed or updated."
    echo "MongoDB 7.0 doesn't officially support Ubuntu 24.04 Noble yet."
    echo ""
    read -p "Remove MongoDB repository? (yes/no): " remove_mongo
    
    if [ "$remove_mongo" = "yes" ]; then
        echo "Removing MongoDB repository..."
        
        # Remove MongoDB repository files
        sudo rm -f /etc/apt/sources.list.d/mongodb*.list
        
        # Remove MongoDB key if it exists
        sudo rm -f /usr/share/keyrings/mongodb*.gpg
        
        print_success "MongoDB repository removed"
    else
        print_error "Cannot proceed without fixing the repository issue"
        exit 1
    fi
else
    print_success "No problematic MongoDB repository found"
fi

# Step 2: Clean and update apt
echo ""
echo "Step 2: Cleaning and updating apt..."
sudo apt-get clean
sudo apt-get update || {
    print_error "apt-get update failed. Checking for other issues..."
    echo ""
    echo "Run this to see which repositories are failing:"
    echo "  sudo apt-get update"
    exit 1
}

print_success "apt updated successfully"

# Step 3: Install Docker
echo ""
echo "Step 3: Installing Docker..."
echo ""

if command -v docker &> /dev/null; then
    print_warning "Docker is already installed"
    docker --version
    read -p "Reinstall Docker? (yes/no): " reinstall
    if [ "$reinstall" != "yes" ]; then
        print_success "Skipping Docker installation"
        exit 0
    fi
fi

echo "Downloading and running Docker installation script..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
echo "Adding $USER to docker group..."
sudo usermod -aG docker $USER

# Clean up
rm get-docker.sh

print_success "Docker installed successfully!"

# Step 4: Install Docker Compose
echo ""
echo "Step 4: Checking Docker Compose..."

if docker compose version &> /dev/null; then
    print_success "Docker Compose is already installed"
    docker compose version
else
    print_warning "Docker Compose plugin not found"
    echo "Installing Docker Compose plugin..."
    
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    
    print_success "Docker Compose installed"
fi

# Step 5: Verify installation
echo ""
echo "Step 5: Verifying installation..."
echo ""

docker --version
docker compose version

echo ""
print_success "Installation complete!"
echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in for group changes to take effect"
echo "   Or run: newgrp docker"
echo ""
echo "After logging back in, test with:"
echo "   docker run hello-world"
echo ""

# Optional: Start Docker service
echo "Starting Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

print_success "Docker service is running"

echo ""
echo "Next steps:"
echo "1. Log out and log back in (or run: newgrp docker)"
echo "2. Test Docker: docker run hello-world"
echo "3. Deploy application: ./deploy-server.sh"
echo ""
