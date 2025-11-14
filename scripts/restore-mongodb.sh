#!/bin/bash
#
# MongoDB Restore Script for Survey Platform
# Restores MongoDB databases from backup
#

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
MONGO_CONTAINER="${MONGO_CONTAINER:-survey-mongodb}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD:-changeme}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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
    ls -lh "${BACKUP_DIR}"/mongodb_backup_*.tar.gz 2>/dev/null || echo "No backups found"
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

# Check if MongoDB container is running
if ! docker ps | grep -q "${MONGO_CONTAINER}"; then
    log_error "MongoDB container '${MONGO_CONTAINER}' is not running!"
    exit 1
fi

# Warning prompt
log_warn "⚠️  WARNING: This will replace existing data in MongoDB!"
log_prompt "Are you sure you want to continue? (yes/no): "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
fi

# Extract backup name
BACKUP_NAME=$(basename "${BACKUP_FILE}" .tar.gz)
TEMP_DIR="/tmp/${BACKUP_NAME}"

log_info "Starting MongoDB restore..."

# Extract backup archive
log_info "Extracting backup archive..."
mkdir -p "${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "$(dirname ${TEMP_DIR})" || {
    log_error "Failed to extract backup!"
    rm -rf "${TEMP_DIR}"
    exit 1
}

# Copy backup to container
log_info "Copying backup to container..."
docker cp "${TEMP_DIR}" "${MONGO_CONTAINER}:/tmp/${BACKUP_NAME}" || {
    log_error "Failed to copy backup to container!"
    rm -rf "${TEMP_DIR}"
    exit 1
}

# Restore backup
log_info "Restoring databases..."
docker exec "${MONGO_CONTAINER}" sh -c "mongorestore \
    --username=${MONGO_USER} \
    --password=${MONGO_PASSWORD} \
    --authenticationDatabase=admin \
    --gzip \
    --drop \
    /tmp/${BACKUP_NAME}" || {
    log_error "Restore failed!"
    docker exec "${MONGO_CONTAINER}" rm -rf "/tmp/${BACKUP_NAME}"
    rm -rf "${TEMP_DIR}"
    exit 1
}

# Clean up
log_info "Cleaning up..."
docker exec "${MONGO_CONTAINER}" rm -rf "/tmp/${BACKUP_NAME}"
rm -rf "${TEMP_DIR}"

log_info "MongoDB restore completed successfully!"

# Log restore event
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "[${TIMESTAMP}] Restored from: ${BACKUP_FILE}" >> "${BACKUP_DIR}/restore.log"

exit 0
