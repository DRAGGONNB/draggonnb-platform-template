#!/bin/bash
# =============================================================================
# DraggonnB CRMM - VPS Setup Script
# =============================================================================
# This script prepares a fresh Ubuntu VPS for Docker deployment
#
# Usage: curl -fsSL https://raw.githubusercontent.com/.../setup.sh | bash
#        OR: ./setup.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DraggonnB CRMM - VPS Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Get the actual user (not root)
ACTUAL_USER=${SUDO_USER:-$USER}

echo -e "\n${YELLOW}[1/7] Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "\n${YELLOW}[2/7] Installing dependencies...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    htop \
    ncdu \
    unattended-upgrades

echo -e "\n${YELLOW}[3/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $ACTUAL_USER
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

echo -e "\n${YELLOW}[4/7] Configuring firewall (UFW)...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

echo -e "\n${YELLOW}[5/7] Setting timezone to Africa/Johannesburg...${NC}"
timedatectl set-timezone Africa/Johannesburg
echo -e "${GREEN}Timezone set${NC}"

echo -e "\n${YELLOW}[6/7] Enabling automatic security updates...${NC}"
cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
echo -e "${GREEN}Automatic updates enabled${NC}"

echo -e "\n${YELLOW}[7/7] Creating Docker networks...${NC}"
docker network create traefik-public 2>/dev/null || echo "Network traefik-public already exists"
docker network create internal 2>/dev/null || echo "Network internal already exists"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Log out and back in for Docker group to take effect"
echo -e "2. cd docker/"
echo -e "3. cp .env.example .env"
echo -e "4. Edit .env with your configuration"
echo -e "5. docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo -e "\n${YELLOW}IMPORTANT: Generate encryption keys:${NC}"
echo -e "  N8N_ENCRYPTION_KEY: openssl rand -hex 32"
echo -e "  Traefik password: docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'password'"
