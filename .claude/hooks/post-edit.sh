#!/usr/bin/env bash
# PostToolUse for Edit/Write: fast feedback on the file that just changed.
#  - shared/catalog/** or shared/engine/** -> validate the workflow catalog
#  - any .ts/.tsx                           -> typecheck the matching project
#  - src/i18n/dict.ts                        -> ensure every key has vi AND en
# Output goes to Claude as context; it never blocks (exit 0).
set -u
cd "$(dirname "$0")/../.." || exit 0
input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception:
    print("")' 2>/dev/null)
[ -z "$file" ] && exit 0
rel=${file#"$PWD/"}
[ -d node_modules ] || exit 0

case "$rel" in
  shared/catalog/*|shared/engine/*|shared/icons.ts)
    out=$(npx tsx scripts/validate-catalog.ts 2>&1) || { echo "[post-edit] catalog validation FAILED:"; echo "$out"; exit 0; }
    echo "[post-edit] $out" ;;
esac
case "$rel" in
  src/i18n/dict.ts)
    python3 - "$rel" <<'PY'
import re,sys
bad=[]
for line in open(sys.argv[1],encoding='utf8'):
    m=re.match(r"^\s{2}([a-z0-9_]+):\s*\{",line)
    if m and ('vi:' not in line or 'en:' not in line):
        bad.append(m.group(1))
print("[post-edit] i18n keys missing vi or en: "+", ".join(bad) if bad else "[post-edit] i18n dictionary OK (all keys bilingual)")
PY
    ;;
esac
case "$rel" in
  src/*.ts|src/*.tsx|shared/*.ts)
    out=$(npx tsc -p tsconfig.json --noEmit 2>&1) || { echo "[post-edit] frontend typecheck FAILED:"; echo "$out" | head -20; exit 0; }
    echo "[post-edit] frontend typecheck OK" ;;
esac
case "$rel" in
  server/*.ts|shared/*.ts|tests/*.ts|scripts/*.ts)
    out=$(npx tsc -p tsconfig.server.json --noEmit 2>&1) || { echo "[post-edit] server typecheck FAILED:"; echo "$out" | head -20; exit 0; }
    echo "[post-edit] server typecheck OK" ;;
esac
exit 0
