#!/bin/bash
#
# Docker Volumes Restore Script
# Restores application volumes from backup
#

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/volumes}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    log_error "Usage: $0 <backup_file>"
    log_info "Available backups:"
    ls -lh "${BACKUP_DIR}"/volumes_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ] && [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Use full path if not provided
if [ ! -f "${BACKUP_FILE}" ]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

log_info "Restore file: ${BACKUP_FILE}"

# Warning prompt
log_warn "⚠️  WARNING: This will replace existing volume data!"
log_warn "⚠️  Make sure all services are stopped before restoring!"
log_prompt "Are you sure you want to continue? (yes/no): "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
fi

# Extract backup name
BACKUP_NAME=$(basename "${BACKUP_FILE}" .tar.gz)
TEMP_DIR="/tmp/${BACKUP_NAME}"

log_info "Starting volumes restore..."

# Extract backup archive
log_info "Extracting backup archive..."
mkdir -p "${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "$(dirname ${TEMP_DIR})" || {
    log_error "Failed to extract backup!"
    rm -rf "${TEMP_DIR}"
    exit 1
}

# Get project name
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ousamma_survey}"

# Read metadata
if [ -f "${TEMP_DIR}/metadata.json" ]; then
    log_info "Reading backup metadata..."
    cat "${TEMP_DIR}/metadata.json"
fi

# Restore each volume
for VOLUME_BACKUP in "${TEMP_DIR}"/*.tar.gz; do
    if [ ! -f "${VOLUME_BACKUP}" ]; then
        continue
    fi

    VOLUME_NAME=$(basename "${VOLUME_BACKUP}" .tar.gz)
    FULL_VOLUME_NAME="${PROJECT_NAME}_${VOLUME_NAME}"

    log_info "Restoring volume: ${VOLUME_NAME}"

    # Create volume if it doesn't exist
    docker volume create "${FULL_VOLUME_NAME}" > /dev/null 2>&1 || true

    # Restore volume using temporary container
    docker run --rm \
        -v "${FULL_VOLUME_NAME}:/target" \
        -v "${VOLUME_BACKUP}:/backup.tar.gz:ro" \
        alpine \
        sh -c "cd /target && tar -xzf /backup.tar.gz" || {
        log_error "Failed to restore volume: ${VOLUME_NAME}"
        continue
    }

    log_info "Volume ${VOLUME_NAME} restored successfully"
done

# Clean up
log_info "Cleaning up..."
rm -rf "${TEMP_DIR}"

log_info "Volumes restore completed successfully!"

# Log restore event
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "[${TIMESTAMP}] Restored from: ${BACKUP_FILE}" >> "${BACKUP_DIR}/restore.log"

exit 0
