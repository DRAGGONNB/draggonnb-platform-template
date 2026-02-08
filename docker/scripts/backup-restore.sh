#!/bin/bash
# =============================================================================
# DraggonnB CRMM - Backup & Restore Script
# =============================================================================
# Manual backup and restore operations
#
# Usage:
#   ./backup-restore.sh backup              # Create backup
#   ./backup-restore.sh restore <file>      # Restore from backup
#   ./backup-restore.sh list                # List available backups
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
BACKUP_DIR="$DOCKER_DIR/backups"

cd "$DOCKER_DIR"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

backup() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Creating Manual Backup${NC}"
    echo -e "${GREEN}========================================${NC}"

    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    BACKUP_FILE="$BACKUP_DIR/manual-backup-$TIMESTAMP.tar.gz"

    # Trigger backup container
    if docker ps --format '{{.Names}}' | grep -q '^backup$'; then
        echo -e "${YELLOW}Triggering backup service...${NC}"
        docker exec backup backup
    else
        echo -e "${YELLOW}Backup container not running, performing manual backup...${NC}"

        # Stop N8N for consistency
        echo -e "${YELLOW}Stopping N8N for consistent backup...${NC}"
        docker compose stop n8n

        # Create backup
        echo -e "${YELLOW}Creating backup archive...${NC}"
        docker run --rm \
            -v n8n-data:/source:ro \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/manual-backup-$TIMESTAMP.tar.gz" -C /source .

        # Restart N8N
        echo -e "${YELLOW}Restarting N8N...${NC}"
        docker compose start n8n
    fi

    echo -e "\n${GREEN}Backup created: $BACKUP_FILE${NC}"
    ls -lh "$BACKUP_DIR" | grep "manual-backup-$TIMESTAMP"
}

restore() {
    BACKUP_FILE=$1

    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Please specify a backup file${NC}"
        echo -e "Usage: $0 restore <backup-file>"
        list
        exit 1
    fi

    # Check if file exists
    if [ ! -f "$BACKUP_FILE" ] && [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        list
        exit 1
    fi

    # Full path to backup
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi

    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Restoring from Backup${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}Backup file: $BACKUP_FILE${NC}"

    # Confirm
    echo -e "\n${RED}WARNING: This will overwrite current N8N data!${NC}"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Restore cancelled${NC}"
        exit 0
    fi

    # Stop N8N
    echo -e "\n${YELLOW}Stopping N8N...${NC}"
    docker compose stop n8n

    # Clear existing data and restore
    echo -e "${YELLOW}Restoring data...${NC}"
    docker run --rm \
        -v n8n-data:/target \
        -v "$BACKUP_FILE":/backup.tar.gz:ro \
        alpine sh -c "rm -rf /target/* && tar xzf /backup.tar.gz -C /target"

    # Start N8N
    echo -e "${YELLOW}Starting N8N...${NC}"
    docker compose start n8n

    echo -e "\n${GREEN}Restore complete!${NC}"
    echo -e "${YELLOW}Verify N8N is working correctly:${NC}"
    docker compose ps
}

list() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Available Backups${NC}"
    echo -e "${GREEN}========================================${NC}"

    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        echo -e "\nBackup files in $BACKUP_DIR:\n"
        ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No .tar.gz files found"
    else
        echo -e "\n${YELLOW}No backups found in $BACKUP_DIR${NC}"
    fi
}

# Main
case "${1:-}" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list
        ;;
    *)
        echo "DraggonnB CRMM - Backup & Restore"
        echo ""
        echo "Usage: $0 {backup|restore|list}"
        echo ""
        echo "Commands:"
        echo "  backup              Create a new backup"
        echo "  restore <file>      Restore from a backup file"
        echo "  list                List available backups"
        exit 1
        ;;
esac
