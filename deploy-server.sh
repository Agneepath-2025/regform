#!/bin/bash

# Agneepath Server Deployment Script
# Use this script to deploy the Dockerized application on your server

set -e

echo "🚀 Agneepath Registration Form - Server Deployment"
echo "=================================================="
echo ""

# Configuration
REPO_URL="https://github.com/NEW-ORG/agneepath.git"  # Update this with your new repo URL
DEPLOY_PATH="/var/www/agneepath"  # Update with your deployment path
APP_PORT=7000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Do not run this script as root. Run as your regular user."
    exit 1
fi

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Install with: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    echo "Install with: sudo apt install git"
    exit 1
fi

print_success "All prerequisites met"
echo ""

# Ask for deployment mode
echo "Select deployment action:"
echo "1) Fresh deployment (first time)"
echo "2) Update existing deployment"
echo "3) Restore from backup"
echo ""
read -p "Enter choice (1, 2, or 3): " action

if [ "$action" = "1" ]; then
    # Fresh deployment
    echo ""
    echo "📦 Fresh Deployment"
    echo "==================="
    echo ""
    
    # Check if directory exists
    if [ -d "$DEPLOY_PATH" ]; then
        print_warning "Directory $DEPLOY_PATH already exists"
        read -p "Remove and continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            sudo rm -rf $DEPLOY_PATH
        else
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    # Create deployment directory
    echo "Creating deployment directory..."
    sudo mkdir -p $DEPLOY_PATH
    sudo chown $USER:$USER $DEPLOY_PATH
    
    # Clone repository
    echo "Cloning repository..."
    git clone $REPO_URL $DEPLOY_PATH/temp
    mv $DEPLOY_PATH/temp/regform/* $DEPLOY_PATH/
    rm -rf $DEPLOY_PATH/temp
    
    cd $DEPLOY_PATH
    print_success "Repository cloned"
    
    # Setup environment
    echo ""
    echo "Setting up environment variables..."
    if [ ! -f .env ]; then
        cp .env.docker .env
        print_warning "Created .env file from template"
        echo ""
        echo "⚠️  CRITICAL: Edit .env file with your credentials before continuing!"
        echo ""
        read -p "Press Enter after you've updated .env file..."
    fi
    
    # Build and start
    echo ""
    echo "Building Docker images..."
    docker-compose build
    
    echo "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
    
    echo ""
    echo "⏳ Waiting for services to be ready (30 seconds)..."
    sleep 30
    
    # Check status
    docker-compose ps
    
    echo ""
    print_success "Fresh deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Restore database if you have a backup"
    echo "2. Configure nginx reverse proxy (see MIGRATION_GUIDE.md)"
    echo "3. Set up SSL certificates with certbot"
    echo ""
    
elif [ "$action" = "2" ]; then
    # Update existing deployment
    echo ""
    echo "🔄 Updating Deployment"
    echo "====================="
    echo ""
    
    if [ ! -d "$DEPLOY_PATH" ]; then
        print_error "Deployment directory $DEPLOY_PATH does not exist"
        print_error "Use option 1 for fresh deployment"
        exit 1
    fi
    
    cd $DEPLOY_PATH
    
    # Backup current state
    echo "Creating backup..."
    BACKUP_DIR=~/agneepath-backup-$(date +%Y%m%d-%H%M%S)
    mkdir -p $BACKUP_DIR
    
    # Backup .env
    cp .env $BACKUP_DIR/
    
    # Backup uploads
    tar -czf $BACKUP_DIR/uploads.tar.gz public/uploads/ 2>/dev/null || true
    
    print_success "Backup created at $BACKUP_DIR"
    
    # Pull latest code
    echo "Pulling latest code..."
    git pull
    
    # Rebuild and restart
    echo "Rebuilding containers..."
    docker-compose build
    
    echo "Restarting services..."
    docker-compose up -d
    
    print_success "Deployment updated!"
    
    echo ""
    echo "Checking status..."
    sleep 10
    docker-compose ps
    
    echo ""
    echo "View logs with: cd $DEPLOY_PATH && docker-compose logs -f"
    
elif [ "$action" = "3" ]; then
    # Restore from backup
    echo ""
    echo "💾 Restore from Backup"
    echo "====================="
    echo ""
    
    read -p "Enter backup directory path: " backup_path
    
    if [ ! -d "$backup_path" ]; then
        print_error "Backup directory not found"
        exit 1
    fi
    
    cd $DEPLOY_PATH
    
    # Restore .env
    if [ -f "$backup_path/.env" ] || [ -f "$backup_path/.env.production.backup" ]; then
        echo "Restoring .env file..."
        cp $backup_path/.env* .env
        print_success "Environment file restored"
    fi
    
    # Restore uploads
    if [ -f "$backup_path/uploads"*.tar.gz ]; then
        echo "Restoring uploads..."
        tar -xzf $backup_path/uploads*.tar.gz -C public/
        print_success "Uploads restored"
    fi
    
    # Restore database
    if [ -d "$backup_path/backup-"* ] || [ -f "$backup_path/"*.archive ]; then
        echo ""
        echo "Starting MongoDB container..."
        docker-compose up -d mongodb
        sleep 20
        
        echo "Restoring database..."
        
        # Find backup directory or archive
        if [ -d "$backup_path/backup-"* ]; then
            BACKUP_DB=$(ls -d $backup_path/backup-* | head -1)
            docker cp $BACKUP_DB regform-mongodb:/data/restore
            
            read -p "Enter MongoDB admin password: " -s mongo_pass
            echo ""
            
            docker-compose exec mongodb mongorestore \
              -u admin \
              -p $mongo_pass \
              --authenticationDatabase admin \
              --db production \
              /data/restore/production
        fi
        
        print_success "Database restored"
    fi
    
    # Start all services
    echo ""
    echo "Starting all services..."
    docker-compose up -d
    
    print_success "Restore complete!"
    
else
    print_error "Invalid choice"
    exit 1
fi

echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🌐 Application should be available at:"
echo "   http://localhost:$APP_PORT"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    cd $DEPLOY_PATH && docker-compose logs -f"
echo "   Restart:      cd $DEPLOY_PATH && docker-compose restart"
echo "   Stop:         cd $DEPLOY_PATH && docker-compose down"
echo "   Status:       cd $DEPLOY_PATH && docker-compose ps"
echo ""
echo "📚 See MIGRATION_GUIDE.md for detailed instructions"
echo ""

print_success "Deployment script completed!"
