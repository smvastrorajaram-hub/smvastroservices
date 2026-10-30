#!/usr/bin/env bash
set -Eeuo pipefail

ENVIRONMENT="${1:-}"
REF="${2:-main}"
case "$ENVIRONMENT" in
  production)
    APP_DIR=/opt/smvastroservices/production
    ENV_FILE=/etc/smvastroservices/production.env
    SERVICE=smv-astro-backend
    PORT=10000
    ;;
  staging)
    APP_DIR=/opt/smvastroservices/staging
    ENV_FILE=/etc/smvastroservices/staging.env
    SERVICE=smv-astro-staging-backend
    PORT=10001
    ;;
  *)
    echo "Usage: sudo bash ops/oracle/deploy-backend.sh production|staging [git-ref]" >&2
    exit 2
    ;;
esac

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root so deployment can restart systemd: sudo bash $0 $ENVIRONMENT $REF" >&2
  exit 1
fi
if [[ ! -s "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Create it from the matching *.env.example and securely fill real values first." >&2
  exit 1
fi
if grep -Eq 'REPLACE_[A-Z0-9_]+' "$ENV_FILE"; then
  echo "$ENV_FILE still contains REPLACE_* placeholders; refusing to deploy." >&2
  exit 1
fi
if [[ ! "$REF" =~ ^[A-Za-z0-9._/-]+$ || "$REF" == *..* ]]; then
  echo "Invalid git ref." >&2
  exit 2
fi

REPO_URL=https://github.com/smvastrorajaram-hub/smvastroservices.git
install -d -o smvastro -g smvastro -m 0750 "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --prune origin "$REF"
  git -C "$APP_DIR" checkout --force -B "$REF" "origin/$REF"
elif find "$APP_DIR" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  echo "$APP_DIR is not a Git checkout and is not empty; refusing to overwrite it." >&2
  exit 1
else
  rmdir "$APP_DIR"
  runuser -u smvastro -- git clone --single-branch --branch "$REF" "$REPO_URL" "$APP_DIR"
fi
chown -R smvastro:smvastro "$APP_DIR"

# package-lock.json is known to be stale versus package.json, so npm ci will fail.
# Do not delete or rewrite any ephemeris/native/wasm data; install only runtime packages.
runuser -u smvastro -- bash -lc "cd '$APP_DIR' && npm install --package-lock=false --omit=dev --no-audit --no-fund"
node --check "$APP_DIR/server.js"

if [[ ! -d /opt/smvastroservices/shared/ephe ]]; then
  echo "WARNING: shared Swiss Ephemeris directory is missing; copy the existing licensed ephe/.se1 data before full astrology acceptance tests." >&2
fi
chmod 0640 "$ENV_FILE"
chown root:smvastro "$ENV_FILE"

systemctl daemon-reload
systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE"

for attempt in $(seq 1 30); do
  if curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:$PORT/healthz" >/dev/null; then
    curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:$PORT/healthz"
    echo
    echo "$SERVICE is healthy on localhost:$PORT (environment=$ENVIRONMENT, ref=$REF)."
    exit 0
  fi
  sleep 2
done

echo "Health check failed. Recent logs:" >&2
journalctl -u "$SERVICE" -n 100 --no-pager >&2
exit 1
