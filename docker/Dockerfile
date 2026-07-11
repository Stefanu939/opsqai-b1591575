# OPSQAI Self-Hosted image (Phase 5 packaging).
#
# Two-stage build: install deps + build the TanStack Start app, then copy the
# production output into a slim runtime. INSTALLER_VERSION is baked in via a
# build arg so `opsqai doctor` and the heartbeat endpoint can report it.

# ---- Stage 1: build --------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Bun is the project's package manager.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb* bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .

ARG INSTALLER_VERSION=dev
ENV INSTALLER_VERSION=${INSTALLER_VERSION}
ENV OPSQAI_MODE=selfhost

RUN bun run build

# ---- Stage 2: runtime ------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ARG INSTALLER_VERSION=dev
ENV NODE_ENV=production \
    OPSQAI_MODE=selfhost \
    INSTALLER_VERSION=${INSTALLER_VERSION} \
    PORT=3000

# Non-root
RUN useradd --system --create-home --uid 10001 opsqai

COPY --from=build --chown=opsqai:opsqai /app/.output ./.output
COPY --from=build --chown=opsqai:opsqai /app/package.json ./package.json
COPY --chown=opsqai:opsqai docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER opsqai
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/api/public/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
