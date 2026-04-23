#!/usr/bin/env bash
set -e

cleanup() {
  pkill -P $$ 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(
  cd artifacts/api-server
  PORT=8080 NODE_ENV=development corepack pnpm run dev 2>&1 | sed -u 's/^/[api] /'
) &

(
  cd artifacts/web
  PORT=5000 BASE_PATH=/ corepack pnpm run dev 2>&1 | sed -u 's/^/[web] /'
) &

wait
