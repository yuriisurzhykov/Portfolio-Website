#!/usr/bin/env bash
# Enables ufw with a default-deny-incoming policy, allowing only SSH, HTTP,
# and HTTPS from outside — the missing half of "bind Next.js to 127.0.0.1"
# (see frontend/package.json's `start` script and 08-systemd-service.sh's
# README entry): binding the app to localhost only protects it AS LONG AS
# nothing else opens the box's public interface wide open. Without this
# script, nothing in this repo actually closed 3000/3001/5432/8081 to the
# internet — Postgres and PlantUML were already verified bound to
# 127.0.0.1 in 01-postgres-install.sh/13-plantuml-install.sh, so this is
# defense in depth for them too, the same "don't rely on one layer alone"
# reasoning nginx's login rate limit already applies on top of the app's
# own.
#
# Idempotent: `ufw allow`/`ufw default` are themselves idempotent (re-adding
# an identical rule is a no-op), and this script checks ufw's active status
# before enabling so a re-run never re-prompts or drops an existing
# connection.
#
# SSH_PORT is a param (default 22) — deliberately NOT auto-detected from
# sshd_config, since a mistake here can lock out every future SSH session
# to the box; get it right explicitly instead of guessing.
#
# Ordering matters and is deliberate: SSH is allowed BEFORE the default-deny
# policy is set, and the default-deny policy is set BEFORE `ufw enable` —
# reversing either step risks cutting the very SSH session this script is
# being run from.
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"

if ! command -v ufw &>/dev/null; then
  echo "Installing ufw..."
  sudo apt-get update
  sudo apt-get install -y ufw
fi

echo "Allowing SSH (port ${SSH_PORT}) BEFORE touching default policy..."
sudo ufw allow "${SSH_PORT}/tcp" comment "SSH"

echo "Setting default-deny on incoming, default-allow on outgoing..."
sudo ufw default deny incoming
sudo ufw default allow outgoing

echo "Allowing HTTP/HTTPS (nginx)..."
sudo ufw allow 80/tcp comment "HTTP (nginx, redirects to HTTPS)"
sudo ufw allow 443/tcp comment "HTTPS (nginx)"

# Deliberately NOT allowing 3000/3001 (Next.js), 5432 (Postgres), or 8081
# (PlantUML) — those must stay unreachable from outside the box. Next.js
# itself is also bound to 127.0.0.1 as of frontend/package.json's `start`
# script, so this is defense in depth, not the only thing standing between
# those ports and the internet.
if sudo ufw status | grep -q "Status: active"; then
  echo "ufw already active — rules above were applied to the live firewall."
else
  echo "Enabling ufw (non-interactive)..."
  sudo ufw --force enable
fi

echo
echo "Real firewall state (not just the rules just applied):"
sudo ufw status verbose
