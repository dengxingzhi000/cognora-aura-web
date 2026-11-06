#!/usr/bin/env bash
# Build the standalone bundle and pack it the way the VM expects:
#   dist/cognora-aura-web/          # server.js + .next (incl. static) + public + node_modules
#   dist/cognora-aura-web.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

out="dist/cognora-aura-web"
rm -rf "$out"
mkdir -p "$out/.next"

cp -r .next/standalone/. "$out"/
cp -r .next/static "$out/.next/static"
cp -r public "$out/public"

tar -czf dist/cognora-aura-web.tar.gz -C "$out" .
echo "bundle: $(du -sh "$out" | cut -f1) dir / $(du -sh dist/cognora-aura-web.tar.gz | cut -f1) tar.gz"
