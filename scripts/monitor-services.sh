#!/bin/bash
#
# Service Monitoring Script
# Checks health and status of all services
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Service endpoints
declare -A SERVICES=(
    ["survey-service"]="http://localhost:3000/health"
    ["geolocation-service"]="http://localhost:3001/health"
    ["analytics-service"]="http://localhost:3002/health"
    ["analytics-consumer"]="http://localhost:3003/health"
    ["notification-consumer"]="http://localhost:3004/health"
    ["audit-consumer"]="http://localhost:3005/health"
    ["notification-service"]="http://localhost:3006/health"
    ["admin-service"]="http://localhost:3007/health"
    ["websocket-service"]="http://localhost:3008/health"
    ["project-service"]="http://localhost:3009/health"
)

# Infrastructure services
declare -A INFRA=(
    ["mongodb"]="survey-mongodb"
    ["redis"]="survey-redis"
    ["kafka"]="survey-kafka"
    ["zookeeper"]="survey-zookeeper"
)

log_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
}

log_ok() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Docker container status
check_container() {
    local container=$1
    if docker ps --filter "name=${container}" --filter "status=running" | grep -q "${container}"; then
        return 0
    else
        return 1
    fi
}

# Check HTTP health endpoint
check_health() {
    local url=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}" 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Get container stats
get_container_stats() {
    local container=$1
    docker stats --no-stream --format "CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}" "${container}" 2>/dev/null
}

# Main monitoring
main() {
    log_header "Survey Platform - Service Monitor"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

    # Check infrastructure services
    log_header "Infrastructure Services"
    local infra_ok=0
    local infra_fail=0

    for service in "${!INFRA[@]}"; do
        container="${INFRA[$service]}"
        if check_container "${container}"; then
            stats=$(get_container_stats "${container}")
            log_ok "${service}: Running | ${stats}"
            ((infra_ok++))
        else
            log_error "${service}: Not running or unhealthy"
            ((infra_fail++))
        fi
    done

    # Check application services
    log_header "Application Services"
    local app_ok=0
    local app_fail=0

    for service in "${!SERVICES[@]}"; do
        endpoint="${SERVICES[$service]}"
        if check_health "${endpoint}"; then
            response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "${endpoint}" 2>/dev/null)
            log_ok "${service}: Healthy | Response time: ${response_time}s"
            ((app_ok++))
        else
            log_error "${service}: Unhealthy or unreachable"
            ((app_fail++))
        fi
    done

    # Check Docker volumes
    log_header "Docker Volumes"
    local volumes=$(docker volume ls --filter "name=survey" --format "{{.Name}}")
    local vol_count=0
    for vol in $volumes; do
        size=$(docker system df -v | grep "$vol" | awk '{print $3}' || echo "N/A")
        log_info "${vol}: ${size}"
        ((vol_count++))
    done

    # Summary
    log_header "Summary"
    echo ""
    echo "Infrastructure Services: ${infra_ok} OK, ${infra_fail} Failed"
    echo "Application Services:    ${app_ok} OK, ${app_fail} Failed"
    echo "Docker Volumes:          ${vol_count} total"
    echo ""

    # Overall status
    if [ $infra_fail -eq 0 ] && [ $app_fail -eq 0 ]; then
        log_ok "All systems operational"
        return 0
    elif [ $infra_fail -gt 0 ]; then
        log_error "Infrastructure issues detected!"
        return 2
    else
        log_warn "Some application services are down"
        return 1
    fi
}

# Run monitoring
main
exit $?
