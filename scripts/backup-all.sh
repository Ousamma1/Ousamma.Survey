#!/bin/bash
#
# Complete Backup Script
# Backs up both MongoDB and Docker volumes
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_info "==================================="
log_info "Starting Complete System Backup"
log_info "Timestamp: ${TIMESTAMP}"
log_info "==================================="

# Backup MongoDB
log_info ""
log_info "Step 1/2: Backing up MongoDB..."
bash "${SCRIPT_DIR}/backup-mongodb.sh"

# Backup Volumes
log_info ""
log_info "Step 2/2: Backing up Docker volumes..."
bash "${SCRIPT_DIR}/backup-volumes.sh"

log_info ""
log_info "==================================="
log_info "Complete System Backup Finished!"
log_info "==================================="

exit 0
