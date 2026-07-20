#!/usr/bin/env bash
# Generates/installs an nginx reverse-proxy site config for one Next.js
# target (dev or prod), proxying to 127.0.0.1:${PORT}, with a dedicated
# /api/auth/login location wired to the shared `login_limit` zone (see
# 09-nginx-rate-limit-zone.sh — must be applied first). TLS blocks assume
# an existing Certbot-managed certificate for DOMAIN.
#
# Parameterized: SITE_NAME (sites-available filename), DOMAIN (primary —
# also the cert path and default server_name), PORT. EXTRA_SERVER_NAMES
# (optional) appends more server_name values, e.g. "www.yuriisoft.me" for
# the eventual production site.
#
# Deliberately does NOT run `nginx -t`/reload itself — verifying config
# syntax before touching a live nginx is a separate, explicit step every
# time, never bundled into a script that could silently push a bad config
# live.
#
# Verified live against dev.yuriisoft.me before being written here
# (proxying + rate-limited login location both confirmed working end to
# end, including from a real browser over HTTPS).
set -euo pipefail

: "${SITE_NAME:?Set SITE_NAME, e.g. yuriisoft-dev}"
: "${DOMAIN:?Set DOMAIN, e.g. dev.yuriisoft.me}"
: "${PORT:?Set PORT, e.g. 3001}"
SERVER_NAMES="${DOMAIN}${EXTRA_SERVER_NAMES:+ $EXTRA_SERVER_NAMES}"

sudo tee "/etc/nginx/sites-available/${SITE_NAME}" > /dev/null <<EOF
server {
    if (\$host = ${DOMAIN}) {
        return 301 https://\$host\$request_uri;
    }

    listen 80;
    server_name ${SERVER_NAMES};
    return 404; # managed by Certbot
}

server {
    listen 443 ssl http2;
    server_name ${SERVER_NAMES};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

    location /api/auth/login {
        limit_req zone=login_limit burst=5 nodelay;

        proxy_pass          http://127.0.0.1:${PORT};
        proxy_http_version  1.1;
        proxy_set_header    Host \$host;
        proxy_set_header    X-Real-IP \$remote_addr;
        proxy_set_header    X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_read_timeout  60s;
    }

    location / {
        proxy_pass          http://127.0.0.1:${PORT};
        proxy_http_version  1.1;
        proxy_set_header    Host \$host;
        proxy_set_header    X-Real-IP \$remote_addr;
        proxy_set_header    X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto \$scheme;
        proxy_read_timeout  60s;
    }
}
EOF

echo
echo "Written /etc/nginx/sites-available/${SITE_NAME}. Now run:"
echo "  sudo nginx -t && sudo systemctl reload nginx"
