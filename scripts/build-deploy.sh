#!/usr/bin/env bash
# Build the standalone bundle and pack it the way the VM expects:
#   dist/cognora-aura-web/          # server.js + .next (incl. static) + public + node_modules
#   dist/cognora-aura-web.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

# These two are baked into the client bundle and silently break login when
# missing: the tenant header is required by TenantFilter, and an unset API base
# falls back to http://localhost:8761 in the browser.
if [ -z "${NEXT_PUBLIC_DEFAULT_TENANT_ID:-}" ]; then
  echo "NEXT_PUBLIC_DEFAULT_TENANT_ID is required for a deployable bundle" >&2
  exit 1
fi
if [ -z "${NEXT_PUBLIC_API_BASE_URL+x}" ]; then
  echo 'NEXT_PUBLIC_API_BASE_URL must be set; use "export NEXT_PUBLIC_API_BASE_URL=" for same-origin rewrites' >&2
  exit 1
fi
echo "deploy env: tenant=${NEXT_PUBLIC_DEFAULT_TENANT_ID} api_base=${NEXT_PUBLIC_API_BASE_URL:-<same-origin>}"

npm run build

out="dist/cognora-aura-web"
rm -rf "$out"
mkdir -p "$out/.next"

cp -r .next/standalone/. "$out"/
cp -r .next/static "$out/.next/static"
cp -r public "$out/public"

tar -czf dist/cognora-aura-web.tar.gz -C "$out" .
echo "bundle: $(du -sh "$out" | cut -f1) dir / $(du -sh dist/cognora-aura-web.tar.gz | cut -f1) tar.gz"
