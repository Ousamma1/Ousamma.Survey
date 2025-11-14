#!/bin/bash
#
# Docker Image Security Scanning Script
# Uses Trivy for vulnerability scanning
#

set -e

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

# Check if Trivy is installed
if ! command -v trivy &> /dev/null; then
    log_error "Trivy is not installed. Installing..."

    # Install Trivy based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install trivy -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install aquasecurity/trivy/trivy
    else
        log_error "Unsupported OS. Please install Trivy manually: https://github.com/aquasecurity/trivy"
        exit 1
    fi
fi

log_info "==================================="
log_info "Docker Image Security Scan"
log_info "==================================="

# Images to scan
IMAGES=(
    "survey-service"
    "geolocation-service"
    "analytics-service"
    "analytics-consumer-service"
    "notification-service"
    "notification-consumer-service"
    "audit-consumer-service"
    "websocket-service"
    "project-service"
    "admin-service"
)

SCAN_DIR="./security-reports"
mkdir -p "${SCAN_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_FILE="${SCAN_DIR}/scan_summary_${TIMESTAMP}.txt"

echo "Security Scan Report - ${TIMESTAMP}" > "${SUMMARY_FILE}"
echo "========================================" >> "${SUMMARY_FILE}"
echo "" >> "${SUMMARY_FILE}"

total_critical=0
total_high=0
total_medium=0
total_low=0

for image in "${IMAGES[@]}"; do
    log_info "Scanning image: ${image}"

    REPORT_FILE="${SCAN_DIR}/${image}_${TIMESTAMP}.json"

    # Run Trivy scan
    trivy image \
        --severity CRITICAL,HIGH,MEDIUM,LOW \
        --format json \
        --output "${REPORT_FILE}" \
        "${image}:latest" || {
        log_warn "Failed to scan ${image}"
        continue
    }

    # Parse results
    critical=$(jq '[.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL")] | length' "${REPORT_FILE}" 2>/dev/null || echo 0)
    high=$(jq '[.Results[].Vulnerabilities[] | select(.Severity=="HIGH")] | length' "${REPORT_FILE}" 2>/dev/null || echo 0)
    medium=$(jq '[.Results[].Vulnerabilities[] | select(.Severity=="MEDIUM")] | length' "${REPORT_FILE}" 2>/dev/null || echo 0)
    low=$(jq '[.Results[].Vulnerabilities[] | select(.Severity=="LOW")] | length' "${REPORT_FILE}" 2>/dev/null || echo 0)

    total_critical=$((total_critical + critical))
    total_high=$((total_high + high))
    total_medium=$((total_medium + medium))
    total_low=$((total_low + low))

    # Log results
    echo "${image}:" >> "${SUMMARY_FILE}"
    echo "  CRITICAL: ${critical}" >> "${SUMMARY_FILE}"
    echo "  HIGH:     ${high}" >> "${SUMMARY_FILE}"
    echo "  MEDIUM:   ${medium}" >> "${SUMMARY_FILE}"
    echo "  LOW:      ${low}" >> "${SUMMARY_FILE}"
    echo "" >> "${SUMMARY_FILE}"

    if [ $critical -gt 0 ]; then
        log_error "${image}: ${critical} CRITICAL vulnerabilities"
    elif [ $high -gt 0 ]; then
        log_warn "${image}: ${high} HIGH vulnerabilities"
    else
        log_info "${image}: No critical or high vulnerabilities"
    fi
done

# Summary
echo "========================================" >> "${SUMMARY_FILE}"
echo "TOTAL:" >> "${SUMMARY_FILE}"
echo "  CRITICAL: ${total_critical}" >> "${SUMMARY_FILE}"
echo "  HIGH:     ${total_high}" >> "${SUMMARY_FILE}"
echo "  MEDIUM:   ${total_medium}" >> "${SUMMARY_FILE}"
echo "  LOW:      ${total_low}" >> "${SUMMARY_FILE}"

log_info ""
log_info "==================================="
log_info "Scan Complete"
log_info "==================================="
log_info "Total CRITICAL: ${total_critical}"
log_info "Total HIGH:     ${total_high}"
log_info "Total MEDIUM:   ${total_medium}"
log_info "Total LOW:      ${total_low}"
log_info ""
log_info "Reports saved to: ${SCAN_DIR}"

# Exit with error if critical vulnerabilities found
if [ $total_critical -gt 0 ]; then
    log_error "CRITICAL vulnerabilities detected! Please review and fix."
    exit 1
elif [ $total_high -gt 5 ]; then
    log_warn "Multiple HIGH vulnerabilities detected. Consider fixing."
    exit 0
else
    log_info "Security scan passed!"
    exit 0
fi
