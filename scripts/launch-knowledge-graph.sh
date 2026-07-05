#!/usr/bin/env bash
# Launch the Understand-Anything knowledge-graph dashboard for this repo (macOS/Linux/git-bash).
# Usage: ./scripts/launch-knowledge-graph.sh   (requires Node.js >= 18)
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "[kg] Node.js is required but was not found on PATH. Install Node.js >= 18 from https://nodejs.org"
  exit 1
fi
exec node "$DIR/launch-knowledge-graph.mjs" "$@"
