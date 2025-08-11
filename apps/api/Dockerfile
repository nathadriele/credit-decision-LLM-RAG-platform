# =============================================================================
# API DOCKERFILE - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

# Use multi-stage build for optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# DEVELOPMENT STAGE
# =============================================================================

FROM base AS development

WORKDIR /app

# Install development dependencies
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# =============================================================================
# BUILD STAGE
# =============================================================================

FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build packages first
RUN npm run build:packages

# Build the API application
WORKDIR /app/apps/api
RUN npm run build

# =============================================================================
# PRODUCTION STAGE
# =============================================================================

FROM base AS production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

# Copy package.json files
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs apps/api/package.json ./apps/api/

# Set working directory
WORKDIR /app/apps/api

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start production server
CMD ["npm", "start"]

# =============================================================================
# TESTING STAGE
# =============================================================================

FROM development AS testing

WORKDIR /app

# Install testing dependencies
RUN npm ci

# Copy test files
COPY . .

# Run tests
RUN npm run test

# Run linting
RUN npm run lint

# Run type checking
RUN npm run type-check

# =============================================================================
# SECURITY SCANNING STAGE
# =============================================================================

FROM production AS security

# Install security scanning tools
USER root
RUN apk add --no-cache \
    npm-audit \
    && npm audit --audit-level moderate

# Switch back to app user
USER nodejs

# =============================================================================
# FINAL STAGE SELECTION
# =============================================================================

# Default to production stage
FROM production AS final

# Labels for metadata
LABEL maintainer="Platform Team <platform@yourcompany.com>"
LABEL version="1.0.0"
LABEL description="Credit Decision Platform API"
LABEL org.opencontainers.image.title="Credit Decision API"
LABEL org.opencontainers.image.description="AI-powered credit decision platform API"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Your Company"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/yourorg/credit-decision-platform"

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Final health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1
