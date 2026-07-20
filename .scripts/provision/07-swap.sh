#!/usr/bin/env bash
# Adds a 2 GiB swapfile — this box has only 1.8 GiB RAM and shipped with
# zero swap. Without swap, any process that briefly exceeds available RAM
# (npm installing native deps, a Next.js build, a temporary traffic spike)
# gets hard-killed by the OOM killer instead of just running slower — a
# cheap, standard safety net, not specific to this plan's bullet list but
# squarely "VPS hardening."
#
# Idempotent: does nothing if a swapfile is already active.
#
# Verified manually against the real VPS before being written here
# (`free -h` showed 2.0Gi swap available afterwards).
set -euo pipefail

SWAP_FILE="/swapfile"
SWAP_SIZE_GB=2

if sudo swapon --show | grep -q "${SWAP_FILE}"; then
  echo "${SWAP_FILE} is already active as swap, skipping."
else
  echo "Creating ${SWAP_SIZE_GB}G swapfile at ${SWAP_FILE}..."
  sudo fallocate -l "${SWAP_SIZE_GB}G" "${SWAP_FILE}" || \
    sudo dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=$((SWAP_SIZE_GB * 1024))
  sudo chmod 600 "${SWAP_FILE}"
  sudo mkswap "${SWAP_FILE}"
  sudo swapon "${SWAP_FILE}"
fi

grep -q "${SWAP_FILE}" /etc/fstab || echo "${SWAP_FILE} none swap sw 0 0" | sudo tee -a /etc/fstab

echo
free -h
sudo swapon --show
