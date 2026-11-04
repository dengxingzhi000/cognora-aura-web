#!/usr/bin/env bash
# Build the standalone bundle and pack it the way the VM expects:
#   dist/scm-web-deploy/          # server.js + .next (incl. static) + public + node_modules
#   dist/scm-web-deploy.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

out="dist/scm-web-deploy"
rm -rf "$out"
mkdir -p "$out/.next"

cp -r .next/standalone/. "$out"/
cp -r .next/static "$out/.next/static"
cp -r public "$out/public"

tar -czf dist/scm-web-deploy.tar.gz -C "$out" .
echo "bundle: $(du -sh "$out" | cut -f1) dir / $(du -sh dist/scm-web-deploy.tar.gz | cut -f1) tar.gz"
