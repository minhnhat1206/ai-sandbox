#!/usr/bin/env bash
# Prints a short project briefing at the start of every Claude Code session.
set -u
cd "$(dirname "$0")/../.." || exit 0

echo "== AI Sandbox: session briefing =="
if [ ! -d node_modules ]; then
  echo "node_modules missing -> run: npm install"
fi
if [ -f .env ]; then
  prov=$(grep -E '^AI_PROVIDER=' .env | cut -d= -f2)
  echo "Provider in .env: ${prov:-mock}  (keys are never printed)"
else
  echo "No .env -> mock provider, ADMIN_TOKEN=change-me. Copy .env.example to .env to configure."
fi
echo "Workflows in catalog: $(cat shared/catalog/*.ts 2>/dev/null | grep -c "^  kind: '")"
changed=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Uncommitted changes: ${changed} file(s)"
echo "Commands: npm run dev | npm run check | npm run smoke | /new-workflow | /new-sandbox | /release-check"
exit 0
