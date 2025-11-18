# Multi-stage Dockerfile for Survey Service
# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine AS production

# Add security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling and curl for health checks
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application files with proper ownership
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs index.js ./
COPY --chown=nodejs:nodejs routes ./routes
COPY --chown=nodejs:nodejs models ./models
COPY --chown=nodejs:nodejs middleware ./middleware
COPY --chown=nodejs:nodejs utils ./utils
COPY --chown=nodejs:nodejs config ./config
COPY --chown=nodejs:nodejs public ./public

# Create necessary directories with proper permissions
RUN mkdir -p data/responses data/context uploads public/Surveys && \
    chown -R nodejs:nodejs data uploads public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check with proper timeout and intervals
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "index.js"]
