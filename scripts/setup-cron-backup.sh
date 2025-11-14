#!/bin/bash
#
# Setup Automated Backup Cron Job
# Configures daily backups at 2 AM
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info "Setting up automated backup cron job..."
log_info "Schedule: ${CRON_SCHEDULE}"

# Create cron job
CRON_CMD="${SCRIPT_DIR}/backup-all.sh >> /var/log/survey-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-all.sh"; then
    log_warn "Cron job already exists. Updating..."
    crontab -l 2>/dev/null | grep -v "backup-all.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "${CRON_SCHEDULE} ${CRON_CMD}") | crontab -

log_info "Cron job created successfully!"
log_info "Backups will run: ${CRON_SCHEDULE}"
log_info "Logs will be written to: /var/log/survey-backup.log"

# Show current crontab
log_info ""
log_info "Current crontab:"
crontab -l | grep "backup-all.sh"

exit 0
