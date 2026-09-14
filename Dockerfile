# Multi-stage Docker build for Telegram Drive Web Service
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY app/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy source and build
COPY app/ ./
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy HTTP server script
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "server.js"]
