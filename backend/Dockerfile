# Multi-stage build for CyberTask Backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates

# Set working directory
WORKDIR /app

# Install dependencies stage
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm install --frozen-lockfile

# Generate Prisma client
RUN npx prisma generate

# Build stage
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application using custom Docker build script
RUN node scripts/docker-build.js && npm prune --production

# Production stage
FROM node:18-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy additional config files
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs jest.config.js ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]