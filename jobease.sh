#!/bin/bash

###############################################################################
# JobEase Management Script
###############################################################################
# Simplified management script for JobEase Docker containers
# 
# Usage: ./jobease.sh [command]
#
# Commands:
#   start       - Start all services
#   stop        - Stop all services
#   restart     - Restart all services
#   status      - Show status of all services
#   logs        - Show logs (all or specific service)
#   rebuild     - Rebuild and restart services
#   clean       - Remove all containers, volumes, and images
#   backup      - Backup MySQL database
#   restore     - Restore MySQL database from backup
#   health      - Run health checks
#   stats       - Show resource usage
#   shell       - Open shell in a container
#   help        - Show this help message
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name
PROJECT_NAME="jobease"

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_requirements() {
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env file not found!"
        print_info "Creating .env from template..."
        if [ -f "env.template" ]; then
            cp env.template .env
            print_success ".env file created from template"
            print_warning "Please edit .env file with your actual credentials before starting services"
            echo ""
            echo "Required API keys:"
            echo "  1. Gemini API: https://makersuite.google.com/app/apikey"
            echo "  2. Cloudinary: https://cloudinary.com"
            echo "  3. Google OAuth: https://console.cloud.google.com"
            echo "  4. Telegram API: https://my.telegram.org/apps"
            echo "  5. Gmail App Password: https://myaccount.google.com/apppasswords"
            echo ""
            exit 1
        else
            print_error "env.template not found. Cannot create .env file."
            exit 1
        fi
    fi
}

###############################################################################
# Main Commands
###############################################################################

cmd_start() {
    print_header "Starting JobEase Services"
    check_requirements
    
    print_info "Building and starting containers..."
    docker-compose up -d --build
    
    echo ""
    print_success "All services started successfully!"
    echo ""
    print_info "Waiting for services to initialize..."
    sleep 10
    
    cmd_status
    
    echo ""
    print_info "Access the application:"
    echo "  Frontend:    http://localhost:5173"
    echo "  Backend API: http://localhost:8080/api"
    echo "  MySQL:       localhost:3307"
    echo ""
    print_info "View logs with: ./jobease.sh logs"
}

cmd_stop() {
    print_header "Stopping JobEase Services"
    
    print_info "Stopping all containers..."
    docker-compose down
    
    print_success "All services stopped successfully!"
}

cmd_restart() {
    print_header "Restarting JobEase Services"
    
    cmd_stop
    echo ""
    cmd_start
}

cmd_status() {
    print_header "Service Status"
    
    docker-compose ps
    
    echo ""
    print_info "Quick Health Check:"
    
    # Check MySQL
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} --silent 2>/dev/null; then
        print_success "MySQL: Running"
    else
        print_error "MySQL: Not responding"
    fi
    
    # Check Backend
    if curl -s -f http://localhost:8080/actuator/health > /dev/null 2>&1 || curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_success "Backend: Running"
    else
        print_error "Backend: Not responding"
    fi
    
    # Check Frontend
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend: Running"
    else
        print_error "Frontend: Not responding"
    fi
    
    # Check Jobs Fetcher
    if docker-compose ps jobs-fetcher | grep -q "Up"; then
        print_success "Jobs Fetcher: Running"
    else
        print_error "Jobs Fetcher: Not running"
    fi
}

cmd_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_header "All Service Logs (Ctrl+C to exit)"
        docker-compose logs -f --tail=100
    else
        print_header "Logs for $service (Ctrl+C to exit)"
        docker-compose logs -f --tail=100 "$service"
    fi
}

cmd_rebuild() {
    print_header "Rebuilding Services"
    
    print_info "Stopping containers..."
    docker-compose down
    
    print_info "Rebuilding images..."
    docker-compose build --no-cache
    
    print_info "Starting containers..."
    docker-compose up -d
    
    print_success "Rebuild complete!"
    
    echo ""
    cmd_status
}

cmd_clean() {
    print_header "Cleaning JobEase Environment"
    
    print_warning "This will remove:"
    echo "  - All containers"
    echo "  - All volumes (including database data)"
    echo "  - All images"
    echo ""
    read -p "Are you sure? (yes/no): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Stopping and removing containers..."
        docker-compose down -v
        
        print_info "Removing images..."
        docker-compose down --rmi all
        
        print_info "Removing orphaned volumes..."
        docker volume prune -f
        
        print_success "Cleanup complete!"
    else
        print_info "Cleanup cancelled"
    fi
}

cmd_backup() {
    print_header "Database Backup"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    BACKUP_FILE="$BACKUP_DIR/jobease_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    print_info "Creating backup..."
    
    # Check if MySQL container is running
    if ! docker-compose ps mysql | grep -q "Up"; then
        print_error "MySQL container is not running"
        exit 1
    fi
    
    # Create backup
    docker-compose exec -T mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} ${MYSQL_DATABASE:-job_notifier_db} > "$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    print_success "Backup created: ${BACKUP_FILE}.gz"
    
    # Show backup size
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_info "Backup size: $SIZE"
}

cmd_restore() {
    local backup_file=$1
    
    print_header "Database Restore"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file"
        echo "Usage: ./jobease.sh restore <backup_file>"
        echo ""
        echo "Available backups:"
        ls -lh "$BACKUP_DIR" 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite the current database!"
    read -p "Are you sure? (yes/no): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Restoring database..."
        
        # Decompress if needed
        if [[ $backup_file == *.gz ]]; then
            gunzip -c "$backup_file" | docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} ${MYSQL_DATABASE:-job_notifier_db}
        else
            cat "$backup_file" | docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} ${MYSQL_DATABASE:-job_notifier_db}
        fi
        
        print_success "Database restored successfully!"
    else
        print_info "Restore cancelled"
    fi
}

cmd_health() {
    print_header "Health Check"
    
    print_info "Checking MySQL..."
    if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} --silent 2>/dev/null; then
        print_success "MySQL is healthy"
        
        # Check database
        TABLES=$(docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -e "USE ${MYSQL_DATABASE:-job_notifier_db}; SHOW TABLES;" 2>/dev/null | wc -l)
        print_info "Database tables: $((TABLES - 1))"
    else
        print_error "MySQL is not healthy"
    fi
    
    echo ""
    print_info "Checking Backend API..."
    if curl -s -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
        print_success "Backend API is healthy"
    elif curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_success "Backend is responding"
    else
        print_error "Backend is not responding"
    fi
    
    echo ""
    print_info "Checking Frontend..."
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend is not responding"
    fi
    
    echo ""
    print_info "Checking Jobs Fetcher..."
    if docker-compose ps jobs-fetcher | grep -q "Up"; then
        print_success "Jobs Fetcher is running"
    else
        print_error "Jobs Fetcher is not running"
    fi
    
    echo ""
    print_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose ps -q)
}

cmd_stats() {
    print_header "Resource Usage"
    
    print_info "Press Ctrl+C to exit"
    echo ""
    docker stats $(docker-compose ps -q)
}

cmd_shell() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_error "Please specify a service"
        echo "Usage: ./jobease.sh shell <service>"
        echo ""
        echo "Available services:"
        echo "  - mysql"
        echo "  - backend"
        echo "  - frontend"
        echo "  - jobs-fetcher"
        exit 1
    fi
    
    print_header "Opening shell in $service"
    
    case $service in
        mysql)
            docker-compose exec mysql bash
            ;;
        backend)
            docker-compose exec backend bash
            ;;
        frontend)
            docker-compose exec frontend sh
            ;;
        jobs-fetcher)
            docker-compose exec jobs-fetcher bash
            ;;
        *)
            print_error "Unknown service: $service"
            exit 1
            ;;
    esac
}

cmd_push() {
    print_header "Push Images to Docker Hub"
    
    # Check if Docker Hub username is provided
    local dockerhub_user="${1:-}"
    
    if [ -z "$dockerhub_user" ]; then
        print_error "Docker Hub username is required"
        echo ""
        echo "Usage: ./jobease.sh push <docker-hub-username> [tag]"
        echo ""
        echo "Examples:"
        echo "  ./jobease.sh push johndoe           # Uses 'latest' tag"
        echo "  ./jobease.sh push johndoe v1.0.0    # Uses 'v1.0.0' tag"
        exit 1
    fi
    
    # Get the tag (default to latest)
    local new_tag="${2:-}"
    
    # Try to get last pushed tag from Docker Hub
    print_info "Checking for existing tags on Docker Hub..."
    echo ""
    
    # Show existing tags (if curl and jq available)
    if command -v curl &> /dev/null && command -v jq &> /dev/null; then
        print_info "Existing tags for ${dockerhub_user}/jobease-backend:"
        TAGS=$(curl -s "https://registry.hub.docker.com/v2/repositories/${dockerhub_user}/jobease-backend/tags/?page_size=5" | jq -r '.results[].name' 2>/dev/null || echo "Unable to fetch tags")
        if [ "$TAGS" != "Unable to fetch tags" ]; then
            echo "$TAGS" | head -5
        else
            print_warning "Could not fetch existing tags (repository may not exist yet)"
        fi
        echo ""
    fi
    
    # Ask for new tag if not provided
    if [ -z "$new_tag" ]; then
        echo -n "Enter tag for new images (press Enter for 'latest'): "
        read -r new_tag
        new_tag="${new_tag:-latest}"
    fi
    
    print_info "New tag will be: ${CYAN}${new_tag}${NC}"
    echo ""
    
    # Confirm before proceeding
    print_warning "This will:"
    echo "  1. Build all images locally"
    echo "  2. Tag images as:"
    echo "     - ${dockerhub_user}/jobease-backend:${new_tag}"
    echo "     - ${dockerhub_user}/jobease-frontend:${new_tag}"
    echo "     - ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}"
    echo "  3. Push all images to Docker Hub"
    echo ""
    
    read -p "Continue? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Push cancelled"
        exit 0
    fi
    
    # Check Docker Hub login
    print_info "Checking Docker Hub authentication..."
    if ! docker info 2>/dev/null | grep -q "Username:"; then
        print_warning "Not logged in to Docker Hub"
        print_info "Attempting to log in..."
        docker login
        if [ $? -ne 0 ]; then
            print_error "Docker Hub login failed"
            exit 1
        fi
    fi
    print_success "Authenticated with Docker Hub"
    echo ""
    
    # Build all images
    print_header "Step 1: Building Images"
    print_info "Building all images locally..."
    docker-compose build
    if [ $? -ne 0 ]; then
        print_error "Build failed"
        exit 1
    fi
    print_success "All images built successfully"
    echo ""
    
    # Tag and push backend
    print_header "Step 2: Backend Image"
    print_info "Tagging backend image..."
    docker tag jobease/backend:latest ${dockerhub_user}/jobease-backend:${new_tag}
    
    print_info "Pushing backend image to Docker Hub..."
    docker push ${dockerhub_user}/jobease-backend:${new_tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to push backend image"
        exit 1
    fi
    print_success "Backend image pushed: ${dockerhub_user}/jobease-backend:${new_tag}"
    echo ""
    
    # Tag and push frontend
    print_header "Step 3: Frontend Image"
    print_info "Tagging frontend image..."
    docker tag jobease/frontend:latest ${dockerhub_user}/jobease-frontend:${new_tag}
    
    print_info "Pushing frontend image to Docker Hub..."
    docker push ${dockerhub_user}/jobease-frontend:${new_tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to push frontend image"
        exit 1
    fi
    print_success "Frontend image pushed: ${dockerhub_user}/jobease-frontend:${new_tag}"
    echo ""
    
    # Tag and push jobs-fetcher
    print_header "Step 4: Jobs Fetcher Image"
    print_info "Tagging jobs-fetcher image..."
    docker tag jobease/jobs-fetcher:latest ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}
    
    print_info "Pushing jobs-fetcher image to Docker Hub..."
    docker push ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to push jobs-fetcher image"
        exit 1
    fi
    print_success "Jobs-fetcher image pushed: ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}"
    echo ""
    
    # Summary
    print_header "Push Complete!"
    print_success "All images successfully pushed to Docker Hub"
    echo ""
    print_info "Published images:"
    echo "  ✓ ${dockerhub_user}/jobease-backend:${new_tag}"
    echo "  ✓ ${dockerhub_user}/jobease-frontend:${new_tag}"
    echo "  ✓ ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}"
    echo ""
    print_info "To deploy these images on another machine:"
    echo "  1. Pull images:"
    echo "     docker pull ${dockerhub_user}/jobease-backend:${new_tag}"
    echo "     docker pull ${dockerhub_user}/jobease-frontend:${new_tag}"
    echo "     docker pull ${dockerhub_user}/jobease-jobs-fetcher:${new_tag}"
    echo ""
    echo "  2. Tag as latest (optional):"
    echo "     docker tag ${dockerhub_user}/jobease-backend:${new_tag} jobease/backend:latest"
    echo "     docker tag ${dockerhub_user}/jobease-frontend:${new_tag} jobease/frontend:latest"
    echo "     docker tag ${dockerhub_user}/jobease-jobs-fetcher:${new_tag} jobease/jobs-fetcher:latest"
    echo ""
    echo "  3. Start services:"
    echo "     ./jobease.sh start"
    echo ""
    
    # Also tag as latest if this is a version tag
    if [ "$new_tag" != "latest" ]; then
        read -p "Also tag as 'latest'? (yes/no): " -r
        echo
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_info "Tagging and pushing as 'latest'..."
            
            docker tag ${dockerhub_user}/jobease-backend:${new_tag} ${dockerhub_user}/jobease-backend:latest
            docker push ${dockerhub_user}/jobease-backend:latest
            
            docker tag ${dockerhub_user}/jobease-frontend:${new_tag} ${dockerhub_user}/jobease-frontend:latest
            docker push ${dockerhub_user}/jobease-frontend:latest
            
            docker tag ${dockerhub_user}/jobease-jobs-fetcher:${new_tag} ${dockerhub_user}/jobease-jobs-fetcher:latest
            docker push ${dockerhub_user}/jobease-jobs-fetcher:latest
            
            print_success "Also tagged and pushed as 'latest'"
        fi
    fi
}

cmd_help() {
    cat << EOF
JobEase Management Script

Usage: ./jobease.sh [command] [options]

Commands:
  start               Start all services
  stop                Stop all services
  restart             Restart all services
  status              Show status of all services
  logs [service]      Show logs (all or specific service)
  rebuild             Rebuild and restart services
  clean               Remove all containers, volumes, and images
  backup              Backup MySQL database
  restore <file>      Restore MySQL database from backup
  health              Run health checks
  stats               Show resource usage (live)
  shell <service>     Open shell in a container
  push <username> [tag]  Push images to Docker Hub
  help                Show this help message

Examples:
  ./jobease.sh start                 # Start all services
  ./jobease.sh logs backend          # View backend logs
  ./jobease.sh shell mysql           # Open MySQL shell
  ./jobease.sh backup                # Create database backup
  ./jobease.sh restore backup.sql.gz # Restore database
  ./jobease.sh push johndoe          # Push to Docker Hub (latest tag)
  ./jobease.sh push johndoe v1.0.0   # Push with version tag

Services:
  - mysql:        MySQL database
  - backend:      Spring Boot API
  - frontend:     React web application
  - jobs-fetcher: Python Telegram bot

For more information, see DOCKER_DEPLOYMENT.md
EOF
}

###############################################################################
# Main Script
###############################################################################

case "${1:-}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "${2:-}"
        ;;
    rebuild)
        cmd_rebuild
        ;;
    clean)
        cmd_clean
        ;;
    backup)
        cmd_backup
        ;;
    restore)
        cmd_restore "${2:-}"
        ;;
    health)
        cmd_health
        ;;
    stats)
        cmd_stats
        ;;
    shell)
        cmd_shell "${2:-}"
        ;;
    push)
        cmd_push "${2:-}" "${3:-}"
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        cmd_help
        exit 1
        ;;
esac

