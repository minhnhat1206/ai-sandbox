#!/usr/bin/env bash
# PreToolUse guard for Bash. Blocks commands that would destroy prospect data,
# leak secrets, or rewrite shared git history. Exit 2 = block with message.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception:
    print("")' 2>/dev/null)

block() { echo "BLOCKED by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }

case "$cmd" in
  *"rm -rf data"*|*"rm -r data"*|*"rm data/db.json"*|*"rm -f data/db.json"*)
    block "data/db.json holds prospect sandboxes and runs. Back it up (cp data/db.json data/db.$(date +%s).bak) instead of deleting." ;;
esac
if printf '%s' "$cmd" | grep -Eq '(cat|less|more|head|tail|bat|sed|grep|awk)[^|&;]*\.env(\s|$|\.)' && ! printf '%s' "$cmd" | grep -q '\.env\.example'; then
  block "Never print .env (it contains ANTHROPIC_API_KEY / ADMIN_TOKEN). Read .env.example instead."
fi
if printf '%s' "$cmd" | grep -Eq 'git push.*(--force|-f)\b' && printf '%s' "$cmd" | grep -Eq '\bmain\b|\bmaster\b'; then
  block "Force-pushing main is not allowed from automation. Ask the founder to do it manually."
fi
if printf '%s' "$cmd" | grep -Eq 'git (reset --hard|checkout -- \.|clean -fd)'; then
  block "Destructive git working-tree reset. Stash or commit first, then ask."
fi
if printf '%s' "$cmd" | grep -Eq 'curl .*api\.anthropic\.com' && printf '%s' "$cmd" | grep -Eq 'sk-ant-'; then
  block "Do not paste API keys into shell commands; the SDK reads ANTHROPIC_API_KEY from the environment."
fi
exit 0
