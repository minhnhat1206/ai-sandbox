#!/usr/bin/env bash
# Stop hook: when source files changed during the session, run the quick checks
# and report. Informational only (exit 0) so Claude can decide what to fix.
set -u
cd "$(dirname "$0")/../.." || exit 0
[ -d node_modules ] || exit 0
changed=$(git status --porcelain 2>/dev/null | awk '{print $2}' | grep -E '^(src|server|shared|tests|scripts)/' || true)
[ -z "$changed" ] && exit 0
echo "[stop-check] source changed: $(echo "$changed" | wc -l | tr -d ' ') file(s). Running quick checks..."
if out=$(npm run -s check:quick 2>&1); then
  echo "[stop-check] typecheck + unit tests PASSED"
else
  echo "[stop-check] FAILED - fix before finishing:"
  echo "$out" | tail -25
fi
exit 0
