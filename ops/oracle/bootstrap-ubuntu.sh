#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash ops/oracle/bootstrap-ubuntu.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git nginx certbot python3-certbot-nginx \
  build-essential python3 make g++ ufw

# Install the supported Node.js 22 LTS line if the preinstalled Node version is
# absent or incompatible. Keep the repo's package.json unchanged.
if ! command -v node >/dev/null 2>&1 || ! node -e "const m=+process.versions.node.split('.')[0];process.exit(m>=20&&m<27?0:1)"; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u smvastro >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin smvastro
install -d -o smvastro -g smvastro -m 0750 \
  /opt/smvastroservices/production \
  /opt/smvastroservices/staging \
  /opt/smvastroservices/shared/ephe \
  /var/lib/smvastroservices
install -d -o root -g smvastro -m 0750 /etc/smvastroservices
install -d -o www-data -g www-data -m 0755 /var/www/certbot

install -m 0644 "${SCRIPT_DIR}/smv-astro-backend.service" /etc/systemd/system/smv-astro-backend.service
install -m 0644 "${SCRIPT_DIR}/smv-astro-staging-backend.service" /etc/systemd/system/smv-astro-staging-backend.service
install -m 0644 "${SCRIPT_DIR}/nginx/smvastro-oci-http.conf" /etc/nginx/sites-available/smvastro-oci.conf
ln -sfn /etc/nginx/sites-available/smvastro-oci.conf /etc/nginx/sites-enabled/smvastro-oci.conf
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
nginx -t
systemctl enable --now nginx

# Do not change OCI NSGs/security lists or enable the host firewall automatically.
# A misconfigured SSH allow-list could lock out the operator. If UFW is already
# active, allow web ports while preserving the existing SSH policy.
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/50-reload-nginx.sh <<'HOOK'
#!/usr/bin/env bash
set -e
/usr/sbin/nginx -t
/bin/systemctl reload nginx
HOOK
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/50-reload-nginx.sh
systemctl enable --now certbot.timer 2>/dev/null || true

if ufw status 2>/dev/null | grep -qi 'Status: active'; then
  ufw allow 80/tcp
  ufw allow 443/tcp
else
  echo "UFW is inactive. Configure OCI NSG rules first; do not expose Node ports 10000/10001."
fi

node --version
npm --version
echo "Bootstrap complete. Next: populate /etc/smvastroservices/*.env, prepare the shared ephe files, set DNS/NSG, issue TLS, then deploy each backend."
