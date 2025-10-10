# Minimal build without additional packages
FROM node:18 AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Install esbuild for fast TypeScript transpilation
RUN npm install -D esbuild
# Transpile TypeScript without type checking using esbuild
RUN npx esbuild src/**/*.ts --outdir=dist --platform=node --format=cjs --target=es2022
# Ensure server.js is in the right place
RUN if [ ! -f dist/server.js ] && [ -f dist/src/server.js ]; then mv dist/src/* dist/ && rm -rf dist/src; fi
RUN npm prune --production

# Production stage - use base node image as-is
FROM node:18-slim AS runner

# Create non-root user
RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs jest.config.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nodejs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3     CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/server.js"]
