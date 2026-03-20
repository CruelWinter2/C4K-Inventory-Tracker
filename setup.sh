#!/usr/bin/env bash
# =============================================================================
# C4K Inventory Management System â€” Local Setup Script
# =============================================================================
# Usage:   bash setup.sh
# Options: bash setup.sh --clean   (deep clean before setup)
#          bash setup.sh --help    (show this help)
#
# Requirements: Docker 24+ with the Compose v2 plugin installed.
#   Install guide: https://docs.docker.com/get-docker/
# =============================================================================

set -euo pipefail

# â”€â”€ Terminal colors (gracefully degraded when not a TTY) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' BOLD='' NC=''
fi

# â”€â”€ Logging helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
success() { echo -e "${GREEN}[OK]${NC}      $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }
step()    { echo -e "${BOLD}[STEP]${NC}    $*"; }
error()   {
    echo -e "${RED}[ERROR]${NC}   $*" >&2
    echo ""
    echo "Setup failed. See the message above for details." >&2
    exit 1
}

# Script directory (so relative paths work from any working directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
show_help() {
    echo ""
    echo "C4K Inventory Management System - Setup Script"
    echo "================================================"
    echo ""
    echo "Usage:"
    echo "  bash setup.sh              Interactive setup"
    echo "  bash setup.sh --clean      Deep clean then interactive setup"
    echo "  bash setup.sh --help       Show this help message"
    echo ""
    echo "What this script does:"
    echo "  1. Checks that Docker and Docker Compose are installed."
    echo "  2. Prompts you for your domain name and configuration."
    echo "  3. Writes .env files for both the backend and frontend."
    echo "  4. Generates an nginx.conf that routes /api/ to the backend."
    echo "  5. Builds and starts all Docker containers."
    echo "  6. Waits for services to become healthy."
    echo "  7. Prints the app URL and first-login instructions."
    echo ""
    echo "Deep clean (--clean or prompted during setup):"
    echo "  Runs: docker compose down --volumes --remove-orphans"
    echo "  Deletes: frontend/node_modules, frontend/build, nginx.conf, .env"
    echo ""
}

# â”€â”€ Prerequisite checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
check_prerequisites() {
    step "Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        error "Docker is not installed or not in PATH.\n  Install guide: https://docs.docker.com/get-docker/"
    fi

    # Require Docker Compose v2 (the 'docker compose' plugin, not 'docker-compose')
    if ! docker compose version &>/dev/null; then
        error "Docker Compose v2 plugin is not installed.\n  Install guide: https://docs.docker.com/compose/install/"
    fi

    local docker_version
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    success "Docker ${docker_version} found."

    local compose_version
    compose_version=$(docker compose version --short 2>/dev/null || echo "unknown")
    success "Docker Compose ${compose_version} found."
}

# â”€â”€ Deep clean â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
deep_clean() {
    echo ""
    warn "Deep Clean will permanently remove:"
    warn "  - All Docker containers and volumes for this project"
    warn "  - frontend/node_modules"
    warn "  - frontend/build"
    warn "  - Generated files: .env, nginx.conf"
    echo ""
    read -rp "Are you sure you want to continue? [y/N]: " confirm
    echo ""

    if [[ "${confirm,,}" != "y" ]]; then
        info "Deep clean cancelled. Continuing with normal setup."
        return 0
    fi

    step "Running deep clean..."

    info "Stopping containers and removing volumes..."
    docker compose down --volumes --remove-orphans 2>/dev/null || true
    success "Containers stopped."

    if [[ -d "frontend/node_modules" ]]; then
        info "Removing frontend/node_modules..."
        rm -rf frontend/node_modules
        success "frontend/node_modules removed."
    fi

    if [[ -d "frontend/build" ]]; then
        info "Removing frontend/build..."
        rm -rf frontend/build
        success "frontend/build removed."
    fi

    if [[ -f "nginx.conf" ]]; then
        info "Removing generated nginx.conf..."
        rm -f nginx.conf
    fi

    if [[ -f ".env" ]]; then
        info "Removing generated .env..."
        rm -f .env
    fi

    success "Deep clean complete. Starting fresh setup."
    echo ""
}

# â”€â”€ Interactive configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
configure() {
    echo ""
    echo "C4K Inventory System Configuration"
    echo "==================================="
    echo "Press Enter to accept the default value shown in brackets."
    echo ""

    # Domain name
    read -rp "Domain name (e.g. c4k.example.com or localhost) [localhost]: " DOMAIN
    DOMAIN="${DOMAIN:-localhost}"

    # Protocol
    echo ""
    echo "Protocol options:"
    echo "  1. http  - Standard HTTP (suitable for localhost or behind a TLS-terminating proxy)"
    echo "  2. https - HTTPS (requires a valid TLS certificate on this server)"
    echo ""
    read -rp "Use HTTPS? [y/N]: " USE_HTTPS
    if [[ "${USE_HTTPS,,}" == "y" ]]; then
        PROTOCOL="https"
    else
        PROTOCOL="http"
    fi

    # Port (only ask when running on localhost)
    if true; then
        echo ""
        read -rp "Port to expose the app on [80]: " HTTP_PORT
        HTTP_PORT="${HTTP_PORT:-80}"
    else
        HTTP_PORT="80"
    fi

    # Database name
    echo ""
    read -rp "MongoDB database name [c4k_inventory]: " DB_NAME
    DB_NAME="${DB_NAME:-c4k_inventory}"

    # JWT secret key
    echo ""
    read -rp "JWT secret key (leave blank to auto-generate a secure 64-character key): " JWT_SECRET_KEY
    if [[ -z "$JWT_SECRET_KEY" ]]; then
        if command -v openssl &>/dev/null; then
            JWT_SECRET_KEY=$(openssl rand -hex 32)
        else
            JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        fi
        info "A secure JWT secret key was generated automatically."
    fi

    # Build the backend URL
    if [[ "$DOMAIN" == "localhost" && "$HTTP_PORT" != "80" ]]; then
        REACT_APP_BACKEND_URL="${PROTOCOL}://localhost:${HTTP_PORT}"
    else
        REACT_APP_BACKEND_URL="${PROTOCOL}://${DOMAIN}"
    fi

    CORS_ORIGINS="$REACT_APP_BACKEND_URL"

    # Confirm
    echo ""
    echo "Configuration Summary"
    echo "---------------------"
    echo "  Domain:         $DOMAIN"
    echo "  Protocol:       $PROTOCOL"
    echo "  HTTP Port:      $HTTP_PORT"
    echo "  Database name:  $DB_NAME"
    echo "  App URL:        $REACT_APP_BACKEND_URL"
    echo "  JWT key:        (set, hidden)"
    echo ""
    read -rp "Proceed with this configuration? [Y/n]: " proceed
    if [[ "${proceed,,}" == "n" ]]; then
        warn "Setup cancelled by user."
        exit 0
    fi
}

# â”€â”€ Write .env files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
write_env_files() {
    step "Writing environment files..."

    # Root .env â€” read by docker-compose for variable substitution
    cat > .env <<ENVFILE
# C4K Inventory System - Docker Compose Environment
# Generated by setup.sh on $(date)
# Re-run 'bash setup.sh' to regenerate.

DOMAIN=${DOMAIN}
PROTOCOL=${PROTOCOL}
HTTP_PORT=${HTTP_PORT}

# Database
MONGO_URL=mongodb://mongodb:27017
DB_NAME=${DB_NAME}

# Security
JWT_SECRET_KEY=${JWT_SECRET_KEY}
CORS_ORIGINS=${CORS_ORIGINS}

# Frontend build argument â€” embedded into the React JS bundle at build time
REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENVFILE
    success "Root .env written."

    # frontend/.env.local â€” used if running 'yarn start' locally (not in Docker)
    cat > frontend/.env.local <<ENVFILE
# C4K Frontend - Local Development Environment
# Generated by setup.sh on $(date)
# This file is used when running 'yarn start' locally, NOT inside Docker.
# Inside Docker, REACT_APP_BACKEND_URL is passed as a build argument.

REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENVFILE
    success "frontend/.env.local written."

    # backend/.env â€” used when running 'uvicorn' locally (not in Docker)
    cat > backend/.env <<ENVFILE
# C4K Backend - Local Development Environment
# Generated by setup.sh on $(date)
# This file is used when running uvicorn locally, NOT inside Docker.
# Inside Docker, these values are injected via docker-compose environment.

MONGO_URL=mongodb://localhost:27017
DB_NAME=${DB_NAME}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
CORS_ORIGINS=${CORS_ORIGINS}
ENVFILE
    success "backend/.env written."
}

# â”€â”€ Generate nginx.conf â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
generate_nginx_conf() {
    step "Generating nginx.conf..."

    cat > nginx.conf <<NGINXCONF
# C4K Inventory System â€” Nginx Configuration
# Generated by setup.sh for domain: ${DOMAIN}
# Regenerate by running: bash setup.sh

server {
    listen 80;
    server_name ${DOMAIN};

    # Accept request bodies up to 20 MB (for future file uploads)
    client_max_body_size 20M;

    # â”€â”€ API Proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # All requests to /api/ are forwarded to the FastAPI backend container.
    location /api/ {
        proxy_pass          http://backend:8001/api/;
        proxy_http_version  1.1;

        # Forward client information to the backend
        proxy_set_header    Host              \$host;
        proxy_set_header    X-Real-IP         \$remote_addr;
        proxy_set_header    X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;

        # Timeouts
        proxy_connect_timeout   10s;
        proxy_send_timeout      60s;
        proxy_read_timeout      60s;
    }

    # â”€â”€ React SPA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # All other requests serve the React single-page application.
    # try_files ensures that client-side routing (React Router) works correctly.
    location / {
        root       /usr/share/nginx/html;
        index      index.html;
        try_files  \$uri \$uri/ /index.html;

        # Cache static assets aggressively; bust cache on filename hash changes
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # â”€â”€ Internal health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Used by Docker HEALTHCHECK and setup.sh wait loop.
    location /nginx-health {
        access_log  off;
        return      200 "healthy\n";
        add_header  Content-Type text/plain;
    }
}
NGINXCONF
    success "nginx.conf generated for domain '${DOMAIN}'."
}

# â”€â”€ Build and start Docker services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
start_services() {
    step "Building Docker images and starting services..."
    info "This may take several minutes on the first run while dependencies are downloaded."
    echo ""
    docker compose up --build --detach
    echo ""
    success "Containers started."
}

# â”€â”€ Wait for healthy state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
wait_for_healthy() {
    step "Waiting for services to become healthy (up to 3 minutes)..."

    local health_url="http://localhost:${HTTP_PORT}/api/health"
    local max_attempts=36   # 36 x 5s = 3 minutes
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        attempt=$((attempt + 1))

        # Try to reach the backend health endpoint through Nginx
        if curl -sf --max-time 4 "$health_url" > /dev/null 2>&1; then
            success "All services are healthy and ready."
            return 0
        fi

        # Every 6 attempts (~30s), show which containers are still starting
        if (( attempt % 6 == 0 )); then
            echo ""
            info "Still waiting... Container status:"
            docker compose ps --format "  {.Name}: {.Status}" 2>/dev/null \
                || docker compose ps 2>/dev/null | tail -n +2 | awk '{printf "  %s: %s\n", $1, $4}'
            echo ""
        else
            echo -n "."
        fi

        sleep 5
    done

    echo ""
    echo ""
    warn "Health check timed out after 3 minutes."
    warn "The containers may still be starting. Check with:"
    warn "  docker compose logs --follow"
    warn "  docker compose ps"
    echo ""
    warn "When ready, the app will be at: ${REACT_APP_BACKEND_URL}"
}

# â”€â”€ Final success message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print_success() {
    echo ""
    echo "=============================================="
    echo "  C4K Inventory System is ready!"
    echo "=============================================="
    echo ""
    echo "  App URL:        ${REACT_APP_BACKEND_URL}"
    echo "  API health:     ${REACT_APP_BACKEND_URL}/api/health"
    echo ""
    echo "First-time login:"
    echo "  1. Open ${REACT_APP_BACKEND_URL} in your browser."
    echo "  2. You will be redirected to the Setup screen."
    echo "  3. Create your admin account with a secure password."
    echo "  4. Sign in and start managing your inventory."
    echo ""
    echo "Useful commands:"
    echo "  View live logs:           docker compose logs --follow"
    echo "  Stop all services:        docker compose down"
    echo "  Restart the backend:      docker compose restart backend"
    echo "  Open a MongoDB shell:     docker compose exec mongodb mongosh ${DB_NAME}"
    echo "  Re-run this setup:        bash setup.sh"
    echo ""
    echo "To add HTTPS with Let's Encrypt, visit:"
    echo "  https://certbot.eff.org/"
    echo ""
}

# â”€â”€ Main entry point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
main() {
    echo ""
    echo "C4K Inventory Management System"
    echo "Local Deployment Setup Script"
    echo "================================"
    echo ""

    # Handle --help
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi

    check_prerequisites

    # Handle --clean flag or prompt
    if [[ "${1:-}" == "--clean" ]]; then
        deep_clean
    else
        echo ""
        read -rp "Run a deep clean before setup? This removes all containers, volumes, and build artifacts. [y/N]: " do_clean
        echo ""
        if [[ "${do_clean,,}" == "y" ]]; then
            deep_clean
        fi
    fi

    configure
    echo ""
    write_env_files
    echo ""
    generate_nginx_conf
    echo ""
    start_services
    echo ""
    wait_for_healthy
    print_success
}

main "$@"
