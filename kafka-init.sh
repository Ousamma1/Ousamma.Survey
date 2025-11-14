#!/bin/bash
# Kafka Topic Initialization Script - Optimized for Performance
# Creates all necessary topics with optimized partitioning and compression

echo "Waiting for Kafka to be ready..."
sleep 30

KAFKA_BROKER="kafka:9092"

# Default configuration
DEFAULT_PARTITIONS=3
HIGH_VOLUME_PARTITIONS=6
REPLICATION_FACTOR=1

# Common configs for all topics
COMMON_CONFIGS="--config compression.type=snappy --config min.insync.replicas=1"

# Performance optimized retention
RETENTION_7_DAYS=604800000      # 7 days
RETENTION_30_DAYS=2592000000    # 30 days
RETENTION_90_DAYS=7776000000    # 90 days

# Function to create topic with custom settings
create_topic() {
  local topic=$1
  local partitions=$2
  local retention=$3
  local extra_configs=$4

  echo "Creating topic: $topic (partitions: $partitions, retention: $((retention/86400000))d)"
  kafka-topics --create \
    --bootstrap-server $KAFKA_BROKER \
    --topic $topic \
    --partitions $partitions \
    --replication-factor $REPLICATION_FACTOR \
    --if-not-exists \
    --config retention.ms=$retention \
    --config segment.ms=86400000 \
    --config compression.type=snappy \
    --config min.insync.replicas=1 \
    $extra_configs

  if [ $? -eq 0 ]; then
    echo "✓ Topic $topic created successfully"
  else
    echo "✗ Failed to create topic $topic"
  fi
}

echo "Creating optimized Kafka topics..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# High-volume topics with more partitions
echo ""
echo "📊 High-Volume Topics (6 partitions):"
create_topic "response.submitted" $HIGH_VOLUME_PARTITIONS $RETENTION_30_DAYS "--config max.message.bytes=5242880"
create_topic "surveyor.location" $HIGH_VOLUME_PARTITIONS $RETENTION_30_DAYS ""
create_topic "audit.log" $HIGH_VOLUME_PARTITIONS $RETENTION_90_DAYS ""

# Medium-volume survey topics
echo ""
echo "📝 Survey Topics (3 partitions):"
create_topic "survey.created" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "survey.updated" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "survey.published" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "survey.deleted" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""

# Response topics
echo ""
echo "📋 Response Topics (3 partitions):"
create_topic "response.updated" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "response.deleted" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""

# Surveyor topics
echo ""
echo "👤 Surveyor Topics (3 partitions):"
create_topic "surveyor.activity" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "surveyor.registered" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""

# Analytics topics
echo ""
echo "📈 Analytics Topics (6 partitions):"
create_topic "analytics.update" $HIGH_VOLUME_PARTITIONS $RETENTION_7_DAYS ""
create_topic "analytics.request" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""

# Notification topics
echo ""
echo "🔔 Notification Topics (3 partitions):"
create_topic "notification.send" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""
create_topic "notification.email" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""
create_topic "notification.sms" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""
create_topic "notification.push" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""

# Audit topics
echo ""
echo "🔍 Audit Topics (3 partitions):"
create_topic "audit.auth" $DEFAULT_PARTITIONS $RETENTION_90_DAYS ""
create_topic "audit.data" $DEFAULT_PARTITIONS $RETENTION_90_DAYS ""

# Admin topics
echo ""
echo "⚙️  Admin Topics (3 partitions):"
create_topic "admin.action" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "admin.health_check" $DEFAULT_PARTITIONS $RETENTION_7_DAYS ""
create_topic "admin.settings_updated" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "admin.user_action" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "admin.backup" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "admin.restore" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""

# Dead Letter Queue topics (low volume, extended retention)
echo ""
echo "💀 Dead Letter Queue Topics (3 partitions):"
create_topic "dlq.survey" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "dlq.response" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "dlq.notification" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "dlq.audit" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""
create_topic "dlq.admin" $DEFAULT_PARTITIONS $RETENTION_30_DAYS ""

echo ""
echo "Listing all topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER

echo ""
echo "Topic initialization complete!"
