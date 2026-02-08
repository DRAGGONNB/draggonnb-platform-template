# DraggonnB CRMM - Docker Infrastructure

Production-ready Docker infrastructure for DraggonnB CRMM VPS deployment.

## Overview

This infrastructure provides:

- **Traefik** - Reverse proxy with automatic SSL (Let's Encrypt)
- **N8N** - Workflow automation engine
- **Backup** - Automated daily backups with retention

## Architecture

```
                    ┌─────────────────────┐
                    │     Internet        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Traefik Proxy     │
                    │   (SSL + Routing)   │
                    │   Port 80/443       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼───────┐ ┌──────▼─────┐  ┌──────▼─────┐
    │      N8N        │ │  (Future)  │  │  (Future)  │
    │  n8n.domain.com │ │   Claude   │  │   Other    │
    │  Port 5678      │ │    API     │  │  Services  │
    └─────────────────┘ └────────────┘  └────────────┘
              │
    ┌─────────▼───────┐
    │    Backup       │
    │  (Daily 2 AM)   │
    └─────────────────┘
```

## Prerequisites

- Ubuntu 22.04+ (Hostinger VPS)
- Docker Engine 24.0+
- Docker Compose v2.20+
- Domain with DNS pointing to VPS

## Quick Start

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2. Setup DNS

Point your domain to the VPS IP address:

| Type | Name | Value       | TTL  |
| ---- | ---- | ----------- | ---- |
| A    | @    | YOUR_VPS_IP | 3600 |
| A    | n8n  | YOUR_VPS_IP | 3600 |
| A    | \*   | YOUR_VPS_IP | 3600 |

### 3. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/draggonnb-crmm.git
cd draggonnb-crmm/docker

# Create environment file
cp .env.example .env

# Edit configuration
nano .env
```

### 4. Generate Secure Credentials

```bash
# Generate N8N encryption key (SAVE THIS - never change it)
openssl rand -hex 32

# Generate Traefik dashboard password
docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'YOUR_SECURE_PASSWORD'
```

### 5. Update .env File

Edit `.env` with your values:

```env
DOMAIN=draggonnb.app
ACME_EMAIL=admin@draggonnb.app
N8N_SUBDOMAIN=n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
N8N_ENCRYPTION_KEY=your-generated-64-char-key
TRAEFIK_DASHBOARD_CREDENTIALS=admin:$apr1$...
```

### 6. Update Traefik Config

Edit `traefik/traefik.yml` and update the ACME email:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@draggonnb.app # Change this
```

### 7. Deploy

```bash
# Development (single file)
docker compose up -d

# Production (with overrides)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

## Service URLs

After deployment:

| Service   | URL                              | Purpose             |
| --------- | -------------------------------- | ------------------- |
| N8N       | https://n8n.draggonnb.app        | Workflow automation |
| Traefik\* | https://traefik.draggonnb.app    | Dashboard           |
| Webhooks  | https://n8n.draggonnb.app/webhook/\* | N8N webhooks        |

\*Traefik dashboard is protected by basic auth

## Common Operations

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f n8n

# Last 100 lines
docker compose logs --tail=100 n8n
```

### Restart Services

```bash
# All services
docker compose restart

# Specific service
docker compose restart n8n
```

### Update Containers

```bash
# Pull latest images
docker compose pull

# Recreate containers
docker compose up -d --force-recreate

# Remove old images
docker image prune -f
```

### Manual Backup

```bash
# Trigger immediate backup
docker exec backup backup

# List backups
ls -la backups/
```

### Restore from Backup

```bash
# Stop N8N
docker compose stop n8n

# Extract backup
tar -xzf backups/draggonnb-backup-2026-02-04.tar.gz -C /tmp/restore

# Copy data
docker run --rm -v n8n-data:/data -v /tmp/restore:/backup alpine \
  sh -c "rm -rf /data/* && cp -r /backup/n8n/* /data/"

# Start N8N
docker compose start n8n
```

## Upgrading to PostgreSQL

For high-volume production deployments, switch from SQLite to PostgreSQL:

### 1. Export N8N Data

```bash
# Enter N8N container
docker exec -it n8n /bin/sh

# Export workflows and credentials
n8n export:workflow --all --output=/home/node/.n8n/workflows.json
n8n export:credentials --all --output=/home/node/.n8n/credentials.json
```

### 2. Update Configuration

Edit `.env`:

```env
N8N_DB_TYPE=postgresdb
POSTGRES_USER=n8n
POSTGRES_PASSWORD=secure-postgres-password
POSTGRES_DB=n8n
```

### 3. Uncomment PostgreSQL in docker-compose.prod.yml

```yaml
postgres:
  image: postgres:16-alpine
  # ... (uncomment the full section)
```

### 4. Update N8N Environment

Add to `docker-compose.prod.yml` under n8n environment:

```yaml
- DB_TYPE=postgresdb
- DB_POSTGRESDB_HOST=postgres
- DB_POSTGRESDB_PORT=5432
- DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
- DB_POSTGRESDB_USER=${POSTGRES_USER}
- DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
```

### 5. Deploy and Import

```bash
# Deploy with PostgreSQL
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for PostgreSQL to be ready
docker compose logs -f postgres

# Import data
docker exec -it n8n /bin/sh
n8n import:workflow --input=/home/node/.n8n/workflows.json
n8n import:credentials --input=/home/node/.n8n/credentials.json
```

## Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Use strong N8N encryption key (64 hex chars)
- [ ] Enable Traefik dashboard auth
- [ ] Configure firewall (UFW)
- [ ] Enable automatic security updates
- [ ] Setup backup notifications
- [ ] Test backup restoration

### Firewall Setup (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Monitoring

### Check Service Health

```bash
# Container status
docker compose ps

# Container resources
docker stats

# Traefik health
curl -s https://your-domain.com/ping

# N8N health
curl -s https://n8n.your-domain.com/healthz
```

### Disk Usage

```bash
# Docker disk usage
docker system df

# Volume sizes
docker system df -v

# Clean unused resources
docker system prune -a --volumes
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate status
docker compose exec traefik traefik healthcheck

# View certificate logs
docker compose logs traefik | grep -i cert

# Force certificate renewal
docker compose exec traefik rm /certificates/acme.json
docker compose restart traefik
```

### N8N Connection Issues

```bash
# Check N8N logs
docker compose logs n8n

# Verify network connectivity
docker compose exec n8n wget -O- http://localhost:5678/healthz

# Check environment variables
docker compose exec n8n env | grep N8N
```

### Backup Failures

```bash
# Check backup logs
docker compose logs backup

# Manual backup test
docker compose exec backup backup

# Verify backup files
ls -la backups/
```

## Client Deployment

For deploying to client VPS:

1. Fork/copy this `docker/` directory
2. Update `.env` with client-specific values
3. Update domain in `traefik/traefik.yml`
4. Deploy using production config
5. Configure N8N workflows for client

### Client Environment Template

```bash
# Generate client environment
CLIENT_NAME="clientname"
DOMAIN="${CLIENT_NAME}.draggonnb.app"

cat > .env << EOF
DOMAIN=${DOMAIN}
ACME_EMAIL=admin@draggonnb.app
N8N_SUBDOMAIN=n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=$(openssl rand -base64 16)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
TIMEZONE=Africa/Johannesburg
EOF
```

## Support

- Documentation: `.planning/` directory
- Issues: GitHub Issues
- Email: support@draggonnb.app

---

**DraggonnB CRMM** - B2B Automation SaaS for South African SMEs
