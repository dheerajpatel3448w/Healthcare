# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDeps for tsc build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Compile TypeScript → dist/
RUN pnpm build

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 4001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
