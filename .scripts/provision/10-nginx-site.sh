#!/usr/bin/env bash
# Generates/installs an nginx reverse-proxy site config for one Next.js
# target (dev or prod), proxying to 127.0.0.1:${PORT}, with a dedicated
# /api/auth/login location wired to the shared `login_limit` zone (see
# 09-nginx-rate-limit-zone.sh — must be applied first). TLS blocks assume
# an existing Certbot-managed certificate for DOMAIN.
#
# Parameterized: SITE_NAME (sites-available filename), DOMAIN (primary —
# also the cert path and default server_name), PORT, APP_BASE_DIR (this
# target's release directory — see 05-app-dirs.sh; used ONLY to locate
# ${APP_BASE_DIR}/shared/media for the `location /media/` block below).
# EXTRA_SERVER_NAMES (optional) appends more server_name values, e.g.
# "www.yuriisoft.me" for the eventual production site.
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
: "${APP_BASE_DIR:?Set APP_BASE_DIR, e.g. /srv/apps/yuriisoft-frontend-dev}"
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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy     "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Report-Only on purpose (see README's security-headers entry): this
    # directive set was derived by reading the app's actual dependencies
    # (Mantine/BlockNote inject runtime <style> tags, and the root layout
    # itself sets one via dangerouslySetInnerHTML for design tokens — both
    # need style-src 'unsafe-inline'; no external script/font CDN exists
    # anywhere in frontend/src, so script-src/font-src stay 'self' only),
    # not by trial and error against a live site. Still, "read the
    # dependencies" is not the same as "watched it not break a real
    # browser" — switch the header name below to plain
    # `Content-Security-Policy` only after loading /admin's block editor
    # against THIS OWN report-only policy and confirming the browser
    # console shows zero violation reports, the same live-verification
    # step this file's other rules already went through.
    add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;

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

    # Generated post covers (backend/src/media/) — served straight off disk,
    # Node never in the loop. Safe to cache forever: every filename is
    # content-addressed (a sha256 hash, see MediaAsset.contentHash), so this
    # exact URL can never later resolve to different bytes.
    # frontend/src/app/media/[...path]/route.ts serves the SAME directory
    # for local dev (no nginx there) — this block is what makes production
    # skip Node for these requests entirely; see media/README.md's
    # "Хранилище" entry.
    location /media/ {
        alias ${APP_BASE_DIR}/shared/media/;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
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
