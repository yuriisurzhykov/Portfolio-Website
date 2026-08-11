#!/usr/bin/env bash
# Root-owned helper performing the exact, fixed set of privileged actions
# a frontend/ deploy needs: wire shared/.env into the new release, run
# migrations as nextapp, restart the systemd service. Invoked via a SINGLE
# narrow sudoers NOPASSWD rule (see .scripts/provision/README.md) instead
# of granting the deploy account passwordless access to general-purpose
# primitives (cp/chown/chmod/npx) directly.
#
# Renamed from deploy-web-finish.sh when web/ was renamed to frontend/ —
# see .cursor/plans/retire_frontend_and_rename_web_204713a8.plan.md. The
# BASE_DIR/SERVICE_NAME allow-lists below name the NEW infrastructure
# (yuriisoft-frontend[-dev]) this script guards, provisioned separately
# from — and to be verified before decommissioning — the old
# yuriisoft-web[-dev] targets.
#
# Why this matters: a general-purpose tool exposed via a wildcard sudoers
# rule is a much larger attack surface than one script whose entire
# behavior is fixed here and auditable in one place — in particular,
# `sudo npx prisma migrate deploy` on its own would apply whatever
# migrations exist in the CALLER'S CURRENT DIRECTORY (prisma resolves
# `prisma/migrations` relative to cwd, not to any fixed path), which is a
# real privilege-escalation vector if that rule doesn't pin the directory
# down. This script pins every path down explicitly and refuses to run at
# all if the arguments don't match one of exactly two known deploy
# targets — even though the sudoers rule itself uses a wildcard for the
# release path (which changes every deploy), this script's own validation
# constrains what that wildcard can actually be used for.
set -euo pipefail

BASE_DIR="$1"
RELEASE_PATH="$2"
SERVICE_NAME="$3"

case "$BASE_DIR" in
    /srv/apps/yuriisoft-frontend | /srv/apps/yuriisoft-frontend-dev) ;;
    *)
        echo "Refusing: unrecognized BASE_DIR '${BASE_DIR}'" >&2
        exit 1
        ;;
esac

case "$RELEASE_PATH" in
    "${BASE_DIR}"/releases/*) ;;
    *)
        echo "Refusing: RELEASE_PATH '${RELEASE_PATH}' is not under ${BASE_DIR}/releases/" >&2
        exit 1
        ;;
esac

case "$SERVICE_NAME" in
    yuriisoft-frontend.service | yuriisoft-frontend-dev.service) ;;
    *)
        echo "Refusing: unrecognized SERVICE_NAME '${SERVICE_NAME}'" >&2
        exit 1
        ;;
esac

cp "${BASE_DIR}/shared/.env" "${RELEASE_PATH}/backend/.env"
chown nextapp:nextapp "${RELEASE_PATH}/backend/.env"
chmod 600 "${RELEASE_PATH}/backend/.env"

(cd "${RELEASE_PATH}/backend" && runuser -u nextapp -- npx prisma migrate deploy)

# Symlink switch happens here — AFTER migrations succeed (so a failed
# migration never makes `current` point at a broken release) but BEFORE
# the restart (so the restarted process actually picks up the new
# release, since `WorkingDirectory` is resolved fresh at process start).
# Needs root too: ${BASE_DIR} itself (unlike releases/ and shared/ inside
# it) was never chowned away from root.
ln -sfn "${RELEASE_PATH}" "${BASE_DIR}/current"

systemctl restart "${SERVICE_NAME}"
sleep 2
systemctl is-active --quiet "${SERVICE_NAME}"

# --- OG image health check --------------------------------------------------
# See frontend/README.md's dated entry (Phase 0, lazy OG generation). The
# route's cache (`revalidate = 3600`) lives in `.next/cache` INSIDE the
# release directory (render.tsx's own comment), so it starts cold on every
# release this script just switched `current` to point at — a scraper
# hitting a freshly-published link right after this deploy would be the
# first ever request for that template. Rendering here, against
# 127.0.0.1 (bypassing TLS/DNS on purpose, same reasoning as everywhere else
# in this script), fails the DEPLOY instead of leaving a broken template to
# be discovered by whoever shares the next link. Checks the BODY, not just
# HTTP 200 — a template rendering with an empty/undefined title still
# returns 200 with a real (wrong) PNG.
case "$SERVICE_NAME" in
    yuriisoft-frontend.service) PORT=3000 ;;
    yuriisoft-frontend-dev.service) PORT=3001 ;;
    *)
        echo "Refusing: no known PORT for SERVICE_NAME '${SERVICE_NAME}'" >&2
        exit 1
        ;;
esac

verify_og_image() {
    local url="$1"
    local tmp
    tmp="$(mktemp)"
    if ! curl -fsS "$url" -o "$tmp"; then
        echo "OG image health check FAILED: could not fetch ${url}" >&2
        rm -f "$tmp"
        exit 1
    fi

    # PNG signature: 89 50 4E 47 0D 0A 1A 0A.
    if [ "$(od -An -tx1 -N 8 "$tmp" | tr -d ' \n')" != "89504e470d0a1a0a" ]; then
        echo "OG image health check FAILED: ${url} is not a PNG." >&2
        rm -f "$tmp"
        exit 1
    fi

    # IHDR width/height: two big-endian uint32s starting right after the
    # 8-byte signature + 4-byte chunk length + 4-byte "IHDR" tag (offset 16).
    local width height
    width="$(od -An -tu4 --endian=big -j 16 -N 4 "$tmp" | tr -d ' ')"
    height="$(od -An -tu4 --endian=big -j 20 -N 4 "$tmp" | tr -d ' ')"
    rm -f "$tmp"
    if [ "$width" != "1200" ] || [ "$height" != "630" ]; then
        echo "OG image health check FAILED: ${url} is ${width}x${height}, expected 1200x630." >&2
        exit 1
    fi
}

# Every post/work URL from the release's OWN sitemap (its content, its
# templates) — not a fixed list, so a newly published post is covered the
# same deploy it first appears in. `|| true`: an empty sitemap (a brand new
# environment with zero content yet) must not fail the deploy via `set -e`
# on a `grep` that legitimately found nothing.
SITEMAP="$(curl -fsS "http://127.0.0.1:${PORT}/sitemap.xml")"
ENTITY_PATHS="$(echo "$SITEMAP" \
    | grep -oE '<loc>[^<]+</loc>' \
    | sed -E 's#</?loc>##g; s#^https?://[^/]+##' \
    | grep -E '^/(journal|work)/[^/]+$' || true)"

while IFS= read -r entity_path; do
    [ -z "$entity_path" ] && continue
    kind="$(echo "$entity_path" | cut -d/ -f2)"
    slug="$(echo "$entity_path" | cut -d/ -f3)"
    # Both locales, regardless of whether a Russian translation exists —
    # the route always renders SOMETHING (English fallback), and that
    # fallback needs to actually work too.
    verify_og_image "http://127.0.0.1:${PORT}/${kind}/${slug}/og-image/en"
    verify_og_image "http://127.0.0.1:${PORT}/${kind}/${slug}/og-image/ru"
done <<< "$ENTITY_PATHS"

# Site-default card — always exists regardless of content.
verify_og_image "http://127.0.0.1:${PORT}/opengraph-image"

echo "OG image health check passed."
