#!/usr/bin/env bash
set -euo pipefail

if command -v gh >/dev/null 2>&1; then
  gh auth status >/dev/null 2>&1 || true
fi

if command -v codex >/dev/null 2>&1; then
  codex --version >/dev/null 2>&1 || true
fi
