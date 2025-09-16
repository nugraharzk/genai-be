## Optimized multi-stage Dockerfile using Node LTS and pnpm

# Base with Corepack (pnpm) enabled
FROM node:22-alpine AS base
ENV NODE_ENV=production
ENV PORT=5000
# Enable corepack and pnpm (pin if you want a specific pnpm version)
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Builder stage (installs dev deps and builds)
FROM base AS builder
ENV NODE_ENV=development
WORKDIR /app

# Install dependencies with caching
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# Build
COPY tsconfig*.json ./
COPY src ./src
RUN pnpm build

## Note: Skip pruning here; install prod deps in runner

# Runner stage (small, production-only)
FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV PORT=5000
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy manifest and install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy build output
COPY --from=builder /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/main.js"]
