#!/usr/bin/env bash
# Copy the daily snapshots plus uploads/artifacts to another machine or bucket.
# Cron example (02:30 every night):
#   30 2 * * * /opt/ai-sandbox/deploy/backup-offsite.sh >> /var/log/ai-sandbox-backup.log 2>&1
# Set BACKUP_TARGET to an rsync destination (user@host:/path) or an rclone remote (remote:bucket/path).
set -euo pipefail
DATA_DIR="${DATA_DIR:-/opt/ai-sandbox/data}"
TARGET="${BACKUP_TARGET:?set BACKUP_TARGET}"
STAMP="$(date +%F)"
ARCHIVE="/tmp/ai-sandbox-${STAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$DATA_DIR" db.json backups uploads artifacts 2>/dev/null || tar -czf "$ARCHIVE" -C "$DATA_DIR" db.json
if command -v rclone >/dev/null && [[ "$TARGET" != *@* ]]; then
  rclone copy "$ARCHIVE" "$TARGET"
else
  rsync -az "$ARCHIVE" "$TARGET/"
fi
rm -f "$ARCHIVE"
echo "[$(date -Is)] backup ${STAMP} copied to ${TARGET}"
