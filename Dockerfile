# Multi-stage build for GitHub Changelog MCP Server
# --- Build stage -------------------------------------------------------------
FROM node:20-bookworm-slim AS build

ENV NODE_ENV=production
WORKDIR /app

# Copy package manifests first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --include=dev

# Copy sources
COPY tsconfig.json .
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune dev dependencies for smaller runtime image
RUN npm prune --omit=dev

# --- Runtime stage -----------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN useradd -r -u 1001 appuser

# Copy only what we need from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Simple entrypoint wrapper (stdio-based MCP server)
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER appuser
# No port exposed (stdio transport). Add EXPOSE if you add an HTTP health endpoint later.
ENTRYPOINT ["./entrypoint.sh"]
