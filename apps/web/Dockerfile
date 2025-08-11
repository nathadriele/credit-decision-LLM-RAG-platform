# =============================================================================
# WEB DOCKERFILE - CREDIT DECISION LLM RAG PLATFORM
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
COPY apps/web/package.json ./apps/web/
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
    git

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Set working directory to web app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

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

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the web application
WORKDIR /app/apps/web
RUN npm run build

# =============================================================================
# PRODUCTION STAGE
# =============================================================================

FROM base AS production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy package.json files
COPY --chown=nextjs:nodejs package.json ./
COPY --chown=nextjs:nodejs apps/web/package.json ./apps/web/

# Set working directory
WORKDIR /app/apps/web

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server.js"]

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

# Build application to ensure it compiles
WORKDIR /app/apps/web
RUN npm run build

# =============================================================================
# SECURITY SCANNING STAGE
# =============================================================================

FROM production AS security

# Install security scanning tools
USER root
RUN apk add --no-cache npm
RUN npm audit --audit-level moderate

# Switch back to app user
USER nextjs

# =============================================================================
# NGINX STAGE (for static serving)
# =============================================================================

FROM nginx:alpine AS nginx

# Copy built static files
COPY --from=builder /app/apps/web/out /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# FINAL STAGE SELECTION
# =============================================================================

# Default to production stage
FROM production AS final

# Labels for metadata
LABEL maintainer="Platform Team <platform@yourcompany.com>"
LABEL version="1.0.0"
LABEL description="Credit Decision Platform Web Interface"
LABEL org.opencontainers.image.title="Credit Decision Web"
LABEL org.opencontainers.image.description="AI-powered credit decision platform web interface"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Your Company"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/yourorg/credit-decision-platform"

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Final health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
