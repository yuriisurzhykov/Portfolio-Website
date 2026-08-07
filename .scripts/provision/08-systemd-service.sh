#!/usr/bin/env bash
# Installs/updates a systemd unit for one Next.js deployment target (dev or
# prod) and enables it — does NOT start/restart it; that's a separate,
# deliberate step (a provisioning script silently restarting a live prod
# service would be a bad surprise).
#
# Parameterized (SERVICE_NAME, APP_BASE_DIR, PORT) so the same script
# produces both yuriisoft-frontend-dev.service (port 3001, verified live
# first) and the eventual yuriisoft-frontend.service (port 3000) — see
# .scripts/provision/README.md.
#
# ExecStart runs `npm run start` (not the `next` binary directly) — kept
# identical to the exact command verified manually first (foreground, as
# nextapp) before this was ever wrapped in a unit file.
#
# Hardening directives (NoNewPrivileges, PrivateTmp, ProtectHome,
# ProtectSystem=strict) were added and verified INCREMENTALLY against the
# real dev service, one directive group at a time, before being baked in
# together here. ProtectSystem=strict (whole filesystem read-only except a
# few systemd-managed paths) is safe for this specific app because it never
# uses next/image (verified via grep — no server-side runtime disk writes)
# and NEXT_TELEMETRY_DISABLED=1 avoids Next.js trying to write a telemetry
# config file to a home directory nextapp doesn't have. If a future change
# genuinely needs runtime disk writes, add a narrow `ReadWritePaths=`
# rather than relaxing ProtectSystem.
#
# Idempotent: overwrites the unit file with the same content and reloads;
# never restarts a currently running service itself.
set -euo pipefail

: "${SERVICE_NAME:?Set SERVICE_NAME, e.g. yuriisoft-frontend-dev}"
: "${APP_BASE_DIR:?Set APP_BASE_DIR, e.g. /srv/apps/yuriisoft-frontend-dev}"
: "${PORT:?Set PORT, e.g. 3001}"
DESCRIPTION="${DESCRIPTION:-Portfolio Next.js app (${SERVICE_NAME})}"
APP_USER="nextapp"

sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null <<EOF
[Unit]
Description=${DESCRIPTION}
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_BASE_DIR}/current/frontend
Environment=NODE_ENV=production
Environment=PORT=${PORT}
# next start defaults to binding 0.0.0.0 — reachable directly on the VPS's
# public interface, bypassing nginx (its TLS, security headers, and the
# /api/auth/login rate-limit zone) entirely, plus letting a direct caller
# forge X-Forwarded-For since nginx's own X-Real-IP override never runs
# (see frontend/src/shared/lib/client-ip.ts). First attempt at this fix was
# `Environment=HOSTNAME=127.0.0.1` here — WRONG, checked against Next.js
# 16's actual CLI source (packages/next/src/bin/next.ts): the `start`
# command's `-H, --hostname` option has no `.env()` binding (only `-p,
# --port` does), so process.env.HOSTNAME is silently ignored by `next
# start` outside of `output: "standalone"` builds, which this app doesn't
# use. The real fix lives in frontend/package.json's `start` script
# (`next start -H 127.0.0.1`), not here.
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
# The four directives below were added and verified the same way as the
# ones above (see this file's header comment) — incrementally, against
# the real yuriisoft-web-dev service, one group at a time, confirming
# `systemctl status`/a real HTTP request still worked after each before
# moving to the next. Node only needs INET/INET6 sockets (Postgres over
# TCP, Upstash over HTTPS) and its own Unix-domain sockets internally —
# no AF_NETLINK, AF_PACKET, etc. MemoryDenyWriteExecute is deliberately
# NOT included: V8's JIT needs W+X memory pages, so that directive would
# break Node itself, not just narrow its privileges.
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}.service"

echo
echo "Unit installed and enabled. Start/restart it explicitly:"
echo "  sudo systemctl restart ${SERVICE_NAME}.service"
echo "  sudo systemctl status ${SERVICE_NAME}.service"
