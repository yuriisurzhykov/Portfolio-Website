#!/usr/bin/env bash
# Installs the shared nginx rate-limit zone used to protect
# /api/auth/login in front of the app-level lockout that already exists in
# backend/src/auth/rate-limit.ts (10 failed attempts / 15 min per IP,
# in-memory — that file's own comment explicitly anticipates this nginx
# layer). This is a second, independent line of defense: it survives an
# app restart (the in-memory bucket doesn't) and would catch abusive
# traffic even if the app were ever scaled to more than one process.
#
# Lives in /etc/nginx/conf.d/ (included from the stock Ubuntu nginx.conf's
# http{} block) rather than editing nginx.conf directly, and rather than
# duplicating the zone definition inside every per-site file — one shared
# zone, referenced by every site's /api/auth/login location (see
# 10-nginx-site.sh).
#
# Idempotent: overwriting with the same content is a no-op in effect.
#
# Rate (10r/m, burst=5 nodelay applied per-site) verified live against the
# real dev.yuriisoft.me: a 15-request burst returned 401 (app-level, real
# rejection) for the first 6 requests, then 429 (nginx, never reached the
# app) for the rest.
set -euo pipefail

sudo tee /etc/nginx/conf.d/rate-limit.conf > /dev/null <<'EOF'
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
limit_req_status 429;
EOF

echo "Written /etc/nginx/conf.d/rate-limit.conf. Now run:"
echo "  sudo nginx -t && sudo systemctl reload nginx"
