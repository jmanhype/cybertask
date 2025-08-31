# Multi-stage build for CyberTask Frontend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    ca-certificates

# Set working directory
WORKDIR /app

# Install dependencies stage
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --frozen-lockfile

# Build stage
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build arguments
ARG NODE_ENV=production
ARG VITE_API_URL=http://localhost:3001
ARG VERSION=latest

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VERSION=$VERSION

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.24-alpine AS runner

# Install security updates and tools
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# Copy custom nginx config
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder --chown=appuser:appuser /app/dist /usr/share/nginx/html

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]