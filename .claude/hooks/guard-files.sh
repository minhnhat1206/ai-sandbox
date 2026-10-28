#!/usr/bin/env bash
# PreToolUse guard for Edit/Write. Protects secrets and the live data file.
set -u
input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception:
    print("")' 2>/dev/null)
case "$file" in
  *"/.env"|*"/.env."*|".env"|".env."*)
    [[ "$file" == *".env.example" ]] && exit 0
    echo "BLOCKED: .env holds secrets. Edit .env.example and tell the founder what to set." >&2; exit 2 ;;
  *"/data/db.json"|"data/db.json")
    echo "BLOCKED: data/db.json is live prospect data. Change it through the admin API or UI, never by hand." >&2; exit 2 ;;
  *"/dist/"*)
    echo "BLOCKED: dist/ is a build artifact. Edit the source and run npm run build." >&2; exit 2 ;;
esac
exit 0
