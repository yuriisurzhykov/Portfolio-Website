#!/bin/sh
set -eu
export CODEX_HOME=/tmp/codex-repair
mkdir -p "$CODEX_HOME"
cat > "$CODEX_HOME/config.toml" <<'CONFIG'
model_provider = "repair_proxy"
approval_policy = "never"
sandbox_mode = "danger-full-access"
[model_providers.repair_proxy]
name = "Isolated repair Responses proxy"
base_url = "http://proxy:8080/v1"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
CONFIG
# The outer container is the security boundary: non-root, no capabilities,
# read-only image, internal network, no credentials or host mounts.
codex exec --skip-git-repo-check --output-last-message /output/summary.txt - < /opt/repair/scripts/runtime/prompt.txt
