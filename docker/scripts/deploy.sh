#!/bin/bash
# =============================================================================
# DraggonnB CRMM - Deployment Script
# =============================================================================
# Deploys or updates the Docker infrastructure
#
# Usage: ./deploy.sh [dev|prod]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default to production
ENV=${1:-prod}

cd "$DOCKER_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DraggonnB CRMM - Deployment${NC}"
echo -e "${GREEN}Environment: $ENV${NC}"
echo -e "${GREEN}========================================${NC}"

# Check .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo -e "Run: cp .env.example .env and configure it"
    exit 1
fi

# Load environment
source .env

# Validate required variables
REQUIRED_VARS=(
    "DOMAIN"
    "N8N_SUBDOMAIN"
    "N8N_BASIC_AUTH_USER"
    "N8N_BASIC_AUTH_PASSWORD"
    "N8N_ENCRYPTION_KEY"
)

echo -e "\n${YELLOW}Validating configuration...${NC}"
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set in .env${NC}"
        exit 1
    fi
done
echo -e "${GREEN}Configuration valid${NC}"

# Create backup directory
mkdir -p backups

# Pull latest images
echo -e "\n${YELLOW}Pulling latest images...${NC}"
docker compose pull

# Deploy based on environment
echo -e "\n${YELLOW}Deploying services...${NC}"
if [ "$ENV" = "dev" ]; then
    docker compose up -d
else
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
fi

# Wait for services to start
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service health
echo -e "\n${YELLOW}Checking service health...${NC}"
docker compose ps

# Show URLs
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nService URLs:"
echo -e "  N8N:     https://${N8N_SUBDOMAIN}.${DOMAIN}"
echo -e "  Traefik: https://traefik.${DOMAIN} (if enabled)"
echo -e "\nUseful commands:"
echo -e "  View logs:     docker compose logs -f"
echo -e "  Check status:  docker compose ps"
echo -e "  Restart:       docker compose restart"
