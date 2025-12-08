#!/bin/bash

###############################################################################
# JobEase Deployment Script - Pull & Deploy from Docker Hub
###############################################################################
# This script pulls pre-built images from Docker Hub and manages deployments
# 
# Usage: 
#   ./jobease-deploy.sh [command] [docker-hub-username]
#   ./jobease-deploy.sh pull myusername
#   ./jobease-deploy.sh start
#   ./jobease-deploy.sh stop
#
# Commands:
#   pull <username>  - Pull images from Docker Hub
#   start           - Start all services with pulled images
#   stop            - Stop all services
#   restart         - Restart all services
#   status          - Show status of all services
#   logs [service]  - Show logs
#   clear           - Remove all containers and volumes
#   clean           - Clean up unused images and containers
#   update          - Pull latest images and restart
#   help            - Show this help message
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose-deploy.yml"
ENV_FILE=".env"
DEFAULT_DOCKERHUB_USER="${DOCKERHUB_USERNAME:-}"

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
    echo -e "${CYAN}ℹ $1${NC}"
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
            print_success ".env file created"
            print_warning "Please edit .env file with your credentials before deploying"
            exit 1
        else
            print_error "env.template not found"
            exit 1
        fi
    fi
}

###############################################################################
# Main Commands
###############################################################################

cmd_pull() {
    local dockerhub_user=$1
    local tag="${2:-latest}"  # Default to 'latest' if no tag specified
    
    if [ -z "$dockerhub_user" ]; then
        print_error "Docker Hub username is required"
        echo ""
        echo "Usage: ./jobease-deploy.sh pull <docker-hub-username> [tag]"
        echo ""
        echo "Examples:"
        echo "  ./jobease-deploy.sh pull johndoe           # Pulls latest tag"
        echo "  ./jobease-deploy.sh pull johndoe v1.0.0    # Pulls v1.0.0 tag"
        echo ""
        echo "This will pull:"
        echo "  - ${dockerhub_user}/jobease-backend:${tag}"
        echo "  - ${dockerhub_user}/jobease-frontend:${tag}"
        echo "  - ${dockerhub_user}/jobease-jobs-fetcher:${tag}"
        exit 1
    fi
    
    print_header "Pulling Images from Docker Hub"
    print_info "Docker Hub User: $dockerhub_user"
    print_info "Tag: $tag"
    echo ""
    
    # Pull backend image
    print_info "Pulling backend image..."
    docker pull ${dockerhub_user}/jobease-backend:${tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to pull backend image. Check if ${dockerhub_user}/jobease-backend:${tag} exists on Docker Hub"
        exit 1
    fi
    print_success "Backend image pulled"
    echo ""
    
    # Pull frontend image
    print_info "Pulling frontend image..."
    docker pull ${dockerhub_user}/jobease-frontend:${tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to pull frontend image. Check if ${dockerhub_user}/jobease-frontend:${tag} exists on Docker Hub"
        exit 1
    fi
    print_success "Frontend image pulled"
    echo ""
    
    # Pull jobs-fetcher image
    print_info "Pulling jobs-fetcher image..."
    docker pull ${dockerhub_user}/jobease-jobs-fetcher:${tag}
    if [ $? -ne 0 ]; then
        print_error "Failed to pull jobs-fetcher image. Check if ${dockerhub_user}/jobease-jobs-fetcher:${tag} exists on Docker Hub"
        exit 1
    fi
    print_success "Jobs-fetcher image pulled"
    echo ""
    
    # Tag images for local use
    print_info "Tagging images for deployment..."
    docker tag ${dockerhub_user}/jobease-backend:${tag} jobease/backend:latest
    docker tag ${dockerhub_user}/jobease-frontend:${tag} jobease/frontend:latest
    docker tag ${dockerhub_user}/jobease-jobs-fetcher:${tag} jobease/jobs-fetcher:latest
    
    print_success "All images pulled and tagged successfully!"
    print_info "Pulled tag: ${tag}"
    print_info "Local tags: jobease/backend:latest, jobease/frontend:latest, jobease/jobs-fetcher:latest"
    echo ""
    print_info "You can now run: ./jobease-deploy.sh start"
}

cmd_start() {
    print_header "Starting JobEase Services"
    check_requirements
    
    # Check if images exist
    if ! docker images | grep -q "jobease/backend"; then
        print_warning "Images not found locally"
        print_info "Please pull images first: ./jobease-deploy.sh pull <dockerhub-username>"
        exit 1
    fi
    
    print_info "Starting containers..."
    docker-compose up -d
    
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
    print_info "View logs with: ./jobease-deploy.sh logs"
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
    if docker-compose ps mysql | grep -q "Up"; then
        print_success "MySQL: Running"
    else
        print_error "MySQL: Not running"
    fi
    
    # Check Backend
    if docker-compose ps backend | grep -q "Up"; then
        print_success "Backend: Running"
    else
        print_error "Backend: Not running"
    fi
    
    # Check Frontend
    if docker-compose ps frontend | grep -q "Up"; then
        print_success "Frontend: Running"
    else
        print_error "Frontend: Not running"
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

cmd_clear() {
    print_header "Clearing JobEase Environment"
    
    print_warning "This will remove:"
    echo "  - All containers"
    echo "  - All volumes (including database data)"
    echo ""
    read -p "Are you sure? Type 'yes' to confirm: " -r
    echo
    
    if [[ $REPLY == "yes" ]]; then
        print_info "Stopping and removing containers..."
        docker-compose down -v
        
        print_success "Environment cleared!"
        print_info "Note: Docker images are kept. Use 'clean' to remove images too."
    else
        print_info "Clear cancelled"
    fi
}

cmd_clean() {
    print_header "Cleaning Docker Resources"
    
    print_info "Removing stopped containers..."
    docker container prune -f
    
    print_info "Removing unused images..."
    docker image prune -f
    
    print_info "Removing unused volumes..."
    docker volume prune -f
    
    print_info "Removing unused networks..."
    docker network prune -f
    
    print_success "Cleanup complete!"
}

cmd_update() {
    local dockerhub_user=$1
    local tag="${2:-latest}"
    
    if [ -z "$dockerhub_user" ]; then
        print_error "Docker Hub username is required"
        echo ""
        echo "Usage: ./jobease-deploy.sh update <docker-hub-username> [tag]"
        echo ""
        echo "Examples:"
        echo "  ./jobease-deploy.sh update johndoe           # Updates to latest"
        echo "  ./jobease-deploy.sh update johndoe v1.0.0    # Updates to v1.0.0"
        exit 1
    fi
    
    print_header "Updating JobEase"
    
    # Stop services
    print_info "Stopping services..."
    docker-compose down
    
    # Pull latest images
    cmd_pull "$dockerhub_user" "$tag"
    
    # Start services
    echo ""
    print_info "Starting updated services..."
    docker-compose up -d
    
    print_success "Update complete!"
    cmd_status
}

cmd_push() {
    local dockerhub_user=$1
    
    if [ -z "$dockerhub_user" ]; then
        print_error "Docker Hub username is required"
        echo ""
        echo "Usage: ./jobease-deploy.sh push <docker-hub-username>"
        exit 1
    fi
    
    print_header "Pushing Images to Docker Hub"
    print_info "Docker Hub User: $dockerhub_user"
    echo ""
    
    # Login check
    print_info "Checking Docker Hub login..."
    if ! docker info | grep -q "Username:"; then
        print_warning "Not logged in to Docker Hub"
        print_info "Please run: docker login"
        exit 1
    fi
    
    # Build images first
    print_info "Building images..."
    docker-compose build
    
    # Tag and push backend
    print_info "Pushing backend image..."
    docker tag jobease/backend:latest ${dockerhub_user}/jobease-backend:latest
    docker push ${dockerhub_user}/jobease-backend:latest
    print_success "Backend image pushed"
    
    # Tag and push frontend
    print_info "Pushing frontend image..."
    docker tag jobease/frontend:latest ${dockerhub_user}/jobease-frontend:latest
    docker push ${dockerhub_user}/jobease-frontend:latest
    print_success "Frontend image pushed"
    
    # Tag and push jobs-fetcher
    print_info "Pushing jobs-fetcher image..."
    docker tag jobease/jobs-fetcher:latest ${dockerhub_user}/jobease-jobs-fetcher:latest
    docker push ${dockerhub_user}/jobease-jobs-fetcher:latest
    print_success "Jobs-fetcher image pushed"
    
    echo ""
    print_success "All images pushed to Docker Hub!"
    print_info "Images available at:"
    echo "  - ${dockerhub_user}/jobease-backend:latest"
    echo "  - ${dockerhub_user}/jobease-frontend:latest"
    echo "  - ${dockerhub_user}/jobease-jobs-fetcher:latest"
}

cmd_health() {
    print_header "Health Check"
    
    print_info "Checking MySQL..."
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        print_success "MySQL is healthy"
    else
        print_error "MySQL is not healthy"
    fi
    
    echo ""
    print_info "Checking Backend API..."
    if curl -s -f http://localhost:8080/actuator/health > /dev/null 2>&1 || curl -s http://localhost:8080 > /dev/null 2>&1; then
        print_success "Backend API is healthy"
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
}

cmd_backup() {
    print_header "Database Backup"
    
    # Create backup directory
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename
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

cmd_help() {
    cat << EOF
${BLUE}JobEase Deployment Script${NC}

${CYAN}Usage:${NC}
  ./jobease-deploy.sh [command] [options]

${CYAN}Commands:${NC}

  ${GREEN}Docker Hub Operations:${NC}
    pull <username> [tag]    Pull images from Docker Hub (default: latest)
    push <username>          Build and push images to Docker Hub
    update <username> [tag]  Pull latest images and restart (default: latest)

  ${GREEN}Service Management:${NC}
    start                    Start all services
    stop                     Stop all services
    restart                  Restart all services
    status                   Show status of all services

  ${GREEN}Monitoring:${NC}
    logs [service]           Show logs (all or specific service)
    health                   Run health checks

  ${GREEN}Maintenance:${NC}
    clear                    Remove all containers and volumes
    clean                    Clean up unused Docker resources
    backup                   Backup MySQL database

  ${GREEN}Information:${NC}
    help                     Show this help message

${CYAN}Examples:${NC}

  # Pull latest images from Docker Hub
  ./jobease-deploy.sh pull johndoe

  # Pull specific version
  ./jobease-deploy.sh pull johndoe v1.0.0

  # Start services (after pulling images)
  ./jobease-deploy.sh start

  # View all logs
  ./jobease-deploy.sh logs

  # View specific service logs
  ./jobease-deploy.sh logs backend

  # Update to latest version
  ./jobease-deploy.sh update johndoe

  # Update to specific version
  ./jobease-deploy.sh update johndoe v1.0.0

  # Push your images to Docker Hub
  ./jobease-deploy.sh push johndoe

  # Stop everything
  ./jobease-deploy.sh stop

  # Clear everything (including data)
  ./jobease-deploy.sh clear

${CYAN}Tag Management:${NC}
  ${YELLOW}Default tag:${NC} latest
  ${YELLOW}Custom tags:${NC} Any tag you pushed (e.g., v1.0.0, production, dev)
  
  When you pull images with a specific tag, they are automatically
  tagged as 'latest' locally for docker-compose to use.

${CYAN}Environment:${NC}
  Set DOCKERHUB_USERNAME environment variable to avoid typing username:
    export DOCKERHUB_USERNAME=johndoe
    ./jobease-deploy.sh pull

${CYAN}For more information:${NC}
  See DOCKER_DEPLOYMENT.md
EOF
}

###############################################################################
# Main Script
###############################################################################

case "${1:-}" in
    pull)
        cmd_pull "${2:-$DEFAULT_DOCKERHUB_USER}" "${3:-latest}"
        ;;
    push)
        cmd_push "${2:-$DEFAULT_DOCKERHUB_USER}"
        ;;
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
    clear)
        cmd_clear
        ;;
    clean)
        cmd_clean
        ;;
    update)
        cmd_update "${2:-$DEFAULT_DOCKERHUB_USER}" "${3:-latest}"
        ;;
    health)
        cmd_health
        ;;
    backup)
        cmd_backup
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

