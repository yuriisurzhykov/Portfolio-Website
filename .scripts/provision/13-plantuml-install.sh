#!/usr/bin/env bash
# Installs PlantUML (a pinned, current .jar — NOT the "plantuml" apt package,
# which on Ubuntu 24.04 turned out to be version 1.2020.02, six years old,
# and doesn't recognize the -picoweb flag at all — confirmed live, the
# service failed with "No diagram found" until this was switched to a
# direct jar download) + Graphviz (needed for some diagram layouts), and
# runs PlantUML's built-in PicoWeb HTTP server (`-picoweb`) as a systemd
# service.
#
# `-picoweb:<port>:<bind>` is confirmed stable (plantuml/plantuml#2726) with
# a documented URL scheme (https://plantuml.com/picoweb): GET
# /plantuml/svg/ENCODED — a DIFFERENT path shape than the Docker jetty image
# used for local dev (no "/plantuml" prefix there, confirmed by curling it
# directly). This is fine: PLANTUML_SERVER_URL is the FULL base URL per
# environment either way, the app never assumes a shape.
#
# ONE shared instance serves both yuriisoft-frontend[-dev].service — the
# renderer is stateless (deflate+base64 diagram text in, SVG out), so
# running two identical copies would just be two things to manage for zero
# benefit.
#
# Runs as its own dedicated "plantuml" system account, NOT nextapp — same
# blast-radius reasoning as .scripts/provision/04-app-user.sh, applied one
# level further: the Next.js app and the PlantUML renderer are two
# unrelated processes; a bug in one shouldn't run as the same user as the
# other.
#
# Idempotent: safe to re-run on a box that already has this installed —
# skips the apt install/user creation if already present, but ALWAYS
# re-downloads the jar (cheap, and the simplest way to pick up a version
# bump later: edit PLANTUML_VERSION below and re-run).
set -euo pipefail

PLANTUML_USER="plantuml"
PLANTUML_PORT="${PLANTUML_PORT:-8082}"
PLANTUML_VERSION="1.2026.6"
PLANTUML_JAR_DIR="/opt/plantuml"
PLANTUML_JAR_PATH="${PLANTUML_JAR_DIR}/plantuml.jar"
PLANTUML_JAR_URL="https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/plantuml.jar"
SERVICE_NAME="plantuml.service"

echo "Installing Java (headless) + Graphviz..."
sudo apt-get update
sudo apt-get install -y default-jre-headless graphviz

echo
echo "Java version:"
java -version

echo
echo "Downloading plantuml.jar v${PLANTUML_VERSION}..."
sudo mkdir -p "${PLANTUML_JAR_DIR}"
TMP_JAR=$(mktemp)
curl -fsSL "${PLANTUML_JAR_URL}" -o "${TMP_JAR}"

# A failed/redirected download often silently saves an HTML error page
# instead of the real jar — a real plantuml.jar is tens of MB; anything
# under 1 MB is almost certainly not it.
DOWNLOADED_SIZE=$(stat -c%s "${TMP_JAR}")
if [ "${DOWNLOADED_SIZE}" -lt 1000000 ]; then
  echo "ERROR: downloaded file is only ${DOWNLOADED_SIZE} bytes — expected tens of MB. Refusing to install it." >&2
  echo "Check ${PLANTUML_JAR_URL} is still a valid release asset." >&2
  rm -f "${TMP_JAR}"
  exit 1
fi

sudo install -o root -g root -m 644 "${TMP_JAR}" "${PLANTUML_JAR_PATH}"
rm -f "${TMP_JAR}"
echo "OK: installed ${PLANTUML_JAR_PATH} (${DOWNLOADED_SIZE} bytes)."

if id "${PLANTUML_USER}" &>/dev/null; then
  echo "User '${PLANTUML_USER}' already exists, skipping creation."
else
  echo "Creating system user '${PLANTUML_USER}' (no login shell, no home dir)..."
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin "${PLANTUML_USER}"
fi

echo
echo "Installing ${SERVICE_NAME}..."
sudo tee "/etc/systemd/system/${SERVICE_NAME}" > /dev/null <<EOF
[Unit]
Description=PlantUML PicoWeb server (shared by dev and prod)
After=network.target

[Service]
Type=simple
User=${PLANTUML_USER}
Group=${PLANTUML_USER}
ExecStart=/usr/bin/java -jar ${PLANTUML_JAR_PATH} -picoweb:${PLANTUML_PORT}:127.0.0.1
Restart=on-failure
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"

echo
echo "Unit installed and enabled. Start/restart it explicitly:"
echo "  sudo systemctl restart ${SERVICE_NAME}"
echo "  sudo systemctl status ${SERVICE_NAME}"
echo
echo "After starting it, verify it ACTUALLY renders (not just 'started'):"
echo "  curl -s http://127.0.0.1:${PLANTUML_PORT}/plantuml/svg/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000 | head -c 200"
echo "Expect real <svg ...> content, matching the SAME test diagram already verified against the local Docker container."