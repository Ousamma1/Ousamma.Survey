#!/bin/bash
# Kafka Topic Initialization Script
# Creates all necessary topics for the survey platform

echo "Waiting for Kafka to be ready..."
sleep 30

KAFKA_BROKER="kafka:9092"

# Topic configuration
PARTITIONS=3
REPLICATION_FACTOR=1

# List of topics to create
topics=(
  "survey.created"
  "survey.updated"
  "survey.published"
  "survey.deleted"
  "response.submitted"
  "response.updated"
  "response.deleted"
  "surveyor.activity"
  "surveyor.location"
  "surveyor.registered"
  "analytics.update"
  "analytics.request"
  "notification.send"
  "notification.email"
  "notification.sms"
  "notification.push"
  "audit.log"
  "audit.auth"
  "audit.data"
  "dlq.survey"
  "dlq.response"
  "dlq.notification"
  "dlq.audit"
)

echo "Creating Kafka topics..."

for topic in "${topics[@]}"; do
  echo "Creating topic: $topic"
  kafka-topics --create \
    --bootstrap-server $KAFKA_BROKER \
    --topic $topic \
    --partitions $PARTITIONS \
    --replication-factor $REPLICATION_FACTOR \
    --if-not-exists \
    --config retention.ms=604800000 \
    --config segment.ms=86400000

  if [ $? -eq 0 ]; then
    echo "✓ Topic $topic created successfully"
  else
    echo "✗ Failed to create topic $topic"
  fi
done

echo ""
echo "Listing all topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER

echo ""
echo "Topic initialization complete!"
