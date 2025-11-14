#!/bin/bash
#
# MongoDB Backup Script for Survey Platform
# Creates compressed backups of all MongoDB databases
#

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MONGO_CONTAINER="${MONGO_CONTAINER:-survey-mongodb}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD:-changeme}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log_info "Starting MongoDB backup at ${TIMESTAMP}"
log_info "Backup directory: ${BACKUP_DIR}"

# Check if MongoDB container is running
if ! docker ps | grep -q "${MONGO_CONTAINER}"; then
    log_error "MongoDB container '${MONGO_CONTAINER}' is not running!"
    exit 1
fi

# Create backup
log_info "Creating backup: ${BACKUP_NAME}"

docker exec "${MONGO_CONTAINER}" sh -c "mongodump \
    --username=${MONGO_USER} \
    --password=${MONGO_PASSWORD} \
    --authenticationDatabase=admin \
    --out=/tmp/${BACKUP_NAME} \
    --gzip" || {
    log_error "Backup failed!"
    exit 1
}

# Copy backup from container to host
log_info "Copying backup from container to host..."
docker cp "${MONGO_CONTAINER}:/tmp/${BACKUP_NAME}" "${BACKUP_DIR}/" || {
    log_error "Failed to copy backup from container!"
    exit 1
}

# Clean up backup from container
docker exec "${MONGO_CONTAINER}" rm -rf "/tmp/${BACKUP_NAME}"

# Create compressed archive
log_info "Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}" || {
    log_error "Failed to compress backup!"
    exit 1
}

# Remove uncompressed backup
rm -rf "${BACKUP_NAME}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log_info "Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Clean old backups
log_info "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" | wc -l)
log_info "Total backups: ${BACKUP_COUNT}"

# Create backup metadata
cat > "${BACKUP_DIR}/${BACKUP_NAME}.meta" <<EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "size": "${BACKUP_SIZE}",
  "databases": $(docker exec "${MONGO_CONTAINER}" mongosh --username=${MONGO_USER} --password=${MONGO_PASSWORD} --authenticationDatabase=admin --quiet --eval "db.adminCommand('listDatabases').databases.map(d => d.name)" 2>/dev/null || echo '[]'),
  "retention_days": ${RETENTION_DAYS}
}
EOF

log_info "Backup metadata saved: ${BACKUP_NAME}.meta"
log_info "MongoDB backup completed successfully!"

# Send notification (optional - uncomment if notification service is available)
# curl -X POST http://localhost:3006/api/notifications \
#   -H "Content-Type: application/json" \
#   -d "{\"type\":\"backup_completed\",\"message\":\"MongoDB backup completed: ${BACKUP_NAME}\",\"timestamp\":\"${TIMESTAMP}\"}"

exit 0
