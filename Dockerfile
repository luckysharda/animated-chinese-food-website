# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Umami Ramen — multi-stage build (deps -> builder -> runner).
# The runner ships Next's standalone server: no npm, no Next CLI, no dev deps.
# ---------------------------------------------------------------------------

FROM node:20-alpine AS base
# Next's SWC binaries are glibc-flavoured; libc6-compat provides the shim.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- deps -------------------------------------------------------------------
# Only the manifests land here, so this layer is reused on every build where
# package-lock.json has not moved.
FROM base AS deps
COPY package.json package-lock.json ./
# `npm ci` — lockfile only, never resolves package.json ranges afresh.
RUN npm ci

# --- builder ----------------------------------------------------------------
FROM base AS builder

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so these have
# to arrive as build args, not just runtime env. All optional: unset means the
# empty string, which every consumer treats as absent — no key, no network.
ARG NEXT_PUBLIC_FLAG_OVERRIDES=""

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# `next/font/google` self-hosts fonts by downloading every woff2 the Google CSS
# references, all at once, through Node's https.globalAgent -- whose default
# maxSockets is Infinity. layout.tsx pulls in Noto Sans JP, which alone expands
# to 248 subset files, so the build opens ~250 concurrent TLS connections.
# Docker's userland NAT drops them at that concurrency and the build dies with
# a wall of ETIMEDOUT ("Failed to fetch `Noto Sans JP` from Google Fonts").
# Measured in this image: uncapped => 27-98 of 248 fail; capped at 16 => 248/248
# in ~3.6s. Next has no option for this, so cap the pool with a preload module.
# Build-time only -- the runner stage never sees it, and nothing is added to the
# repo or the final image.
RUN printf '%s\n' \
      "require('node:https').globalAgent.maxSockets = 16;" \
      "require('node:http').globalAgent.maxSockets = 16;" \
      > /opt/limit-sockets.cjs
ENV NODE_OPTIONS=--require=/opt/limit-sockets.cjs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --- runner -----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Without HOSTNAME the standalone server binds to localhost *inside* the
# container and the published port reaches nothing.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# standalone already contains server.js + the traced subset of node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public/ are deliberately outside the trace; copy them in.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Hits the real route through the real server and fails on any non-2xx/3xx.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<400?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
