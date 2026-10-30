# Build dependencies (including the sweph native addon) on the target architecture.
FROM node:22-bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ pkg-config ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# The repository lockfile predates the current production dependency set. Use npm install
# until that lockfile is deliberately reconciled; npm ci is intentionally not used here.
RUN npm install --omit=dev --no-audit --no-fund
COPY . .

# Runtime image retains the libraries needed by Chromium/PDF rendering and sweph.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=10000 \
    SWISSEPH_EPHE_PATH=./ephe \
    HOUSE_SYSTEM=S
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates fonts-noto-core \
    libasound2 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
    libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxrandr2 libxrender1 libxshmfence1 \
    libxkbcommon0 libstdc++6 libgcc-s1 libgomp1 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
 CMD node -e "fetch('http://127.0.0.1:10000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
