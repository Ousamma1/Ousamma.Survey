#!/bin/bash
#
# Docker Volumes Backup Script
# Backs up all application volumes
#

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/volumes}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="volumes_backup_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log_info "Starting Docker volumes backup at ${TIMESTAMP}"

# Get project name (from docker-compose)
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ousamma_survey}"

# List of volumes to backup
VOLUMES=(
    "survey_uploads"
    "survey_data"
    "survey_public"
    "mongodb_data"
    "mongodb_config"
    "redis_data"
    "kafka_data"
    "zookeeper_data"
    "zookeeper_logs"
)

# Create backup directory for this timestamp
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p "${BACKUP_PATH}"

# Backup each volume
for VOLUME in "${VOLUMES[@]}"; do
    FULL_VOLUME_NAME="${PROJECT_NAME}_${VOLUME}"

    log_info "Backing up volume: ${VOLUME}"

    # Check if volume exists
    if ! docker volume inspect "${FULL_VOLUME_NAME}" > /dev/null 2>&1; then
        log_warn "Volume ${FULL_VOLUME_NAME} does not exist, skipping..."
        continue
    fi

    # Backup volume using temporary container
    docker run --rm \
        -v "${FULL_VOLUME_NAME}:/source:ro" \
        -v "${BACKUP_PATH}:/backup" \
        alpine \
        tar -czf "/backup/${VOLUME}.tar.gz" -C /source . || {
        log_error "Failed to backup volume: ${VOLUME}"
        continue
    }

    VOLUME_SIZE=$(du -h "${BACKUP_PATH}/${VOLUME}.tar.gz" | cut -f1)
    log_info "Volume ${VOLUME} backed up (${VOLUME_SIZE})"
done

# Create backup metadata
cat > "${BACKUP_PATH}/metadata.json" <<EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "volumes": [
$(for VOLUME in "${VOLUMES[@]}"; do
    if [ -f "${BACKUP_PATH}/${VOLUME}.tar.gz" ]; then
        SIZE=$(du -b "${BACKUP_PATH}/${VOLUME}.tar.gz" | cut -f1)
        echo "    {\"name\": \"${VOLUME}\", \"size\": ${SIZE}},"
    fi
done | sed '$ s/,$//')
  ],
  "retention_days": ${RETENTION_DAYS}
}
EOF

# Create final compressed archive
log_info "Creating final archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}" || {
    log_error "Failed to create final archive!"
    exit 1
}

# Remove temporary directory
rm -rf "${BACKUP_NAME}"

TOTAL_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log_info "Volumes backup completed: ${BACKUP_NAME}.tar.gz (${TOTAL_SIZE})"

# Clean old backups
log_info "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "volumes_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "volumes_backup_*.tar.gz" | wc -l)
log_info "Total volume backups: ${BACKUP_COUNT}"

log_info "Docker volumes backup completed successfully!"

exit 0
