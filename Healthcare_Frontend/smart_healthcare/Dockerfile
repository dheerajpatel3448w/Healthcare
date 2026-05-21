# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# ── Declare build-time args for NEXT_PUBLIC_* env vars ──────────────────────
# NEXT_PUBLIC_* are inlined at compile time by Next.js — they MUST be present
# as ENV variables during `pnpm build`, not just at container runtime.
ARG NEXT_PUBLIC_API_AUTH
ARG NEXT_PUBLIC_API_USER
ARG NEXT_PUBLIC_API_DOCTOR
ARG NEXT_PUBLIC_API_APPOINTMENT
ARG NEXT_PUBLIC_HABIT_TRACKER_URL
ARG NEXT_PUBLIC_API_AI
ARG NEXT_PUBLIC_SOCKET_URL

ENV NEXT_PUBLIC_API_AUTH=$NEXT_PUBLIC_API_AUTH
ENV NEXT_PUBLIC_API_USER=$NEXT_PUBLIC_API_USER
ENV NEXT_PUBLIC_API_DOCTOR=$NEXT_PUBLIC_API_DOCTOR
ENV NEXT_PUBLIC_API_APPOINTMENT=$NEXT_PUBLIC_API_APPOINTMENT
ENV NEXT_PUBLIC_HABIT_TRACKER_URL=$NEXT_PUBLIC_HABIT_TRACKER_URL
ENV NEXT_PUBLIC_API_AI=$NEXT_PUBLIC_API_AI
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Build Next.js (outputs to .next/standalone because output: 'standalone' is set)
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ─── Stage 3: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone output (self-contained Node.js server)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
