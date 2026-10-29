# Deploy and run with real Claude

The goal of this guide: a sandbox link you can send to a prospect. That means HTTPS, a strong admin password, rate limits that see real client IPs, daily backups, and all 21 agents checked against real Claude.

## 1. Check the agents with real Claude (on your laptop, 10 minutes)

```bash
cp .env.example .env          # then edit .env:
#   AI_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=sk-ant-...
#   ADMIN_TOKEN=$(openssl rand -hex 24)
npm install
npm run real-check -- --max-usd 3            # all 21 workflows on the demo data
npm run real-check -- --industry "Sản xuất bao bì" --only order-care-agent,quote-builder-agent,data-chat
```

`scripts/real-check.ts` runs each catalog workflow on its sample inputs and prints a status line per workflow: tools used, deliverables, actions, time and cost. It stops once spending reaches `--max-usd`. It writes a Markdown report to `reports/` (gitignored) and exits with code 1 if any run failed. A warning means the run worked but something looks off: no deliverable, a tool error, or an answer that may not be in Vietnamese. Read the outputs in the admin console (`npm run dev`, `/admin`, demo sandbox, Activity tab).

Without a key, `npm run real-check -- --mock` checks the script itself.

**Budget planning:** the report ends with the cost of running every workflow once. That is roughly what one curious decision maker spends. The default cap is `DEFAULT_BUDGET_USD=10` per sandbox.

## 2. Server

Any small Linux VPS with 1 vCPU and 1 GB of RAM is enough for dozens of prospects. Choose the location with personal-data rules in mind:

- **Vietnam** (Viettel IDC, FPT Cloud, VNPT) keeps data in the country. That is the simplest story under Decree 13 and Law 91/2025.
- **Singapore** has lower latency to Anthropic.

Before signing, the sandbox holds only synthetic data. Prospect inputs can still contain personal data, though, so record the hosting location in your data-processing note.

### Option A: Docker (simplest)

```bash
git clone <repo> /opt/ai-sandbox && cd /opt/ai-sandbox
cp .env.example .env && nano .env      # AI_PROVIDER, ANTHROPIC_API_KEY, ADMIN_TOKEN (>= 16 chars)
docker build -t ai-sandbox .
docker run -d --name ai-sandbox --restart unless-stopped \
  --env-file .env -p 127.0.0.1:3000:3000 -v /opt/ai-sandbox/data:/app/data ai-sandbox
```

### Option B: Node + systemd

Install Node 22, then:

```bash
sudo useradd -r -m -d /opt/ai-sandbox sandbox
sudo -u sandbox git clone <repo> /opt/ai-sandbox && cd /opt/ai-sandbox
sudo -u sandbox npm ci && sudo -u sandbox npm run build
sudo cp deploy/ai-sandbox.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now ai-sandbox
```

In production (`NODE_ENV=production`, which both options set), the server **refuses to start** when `ADMIN_TOKEN` is the default value or shorter than 16 characters.

## 3. HTTPS with Caddy

```bash
sudo apt install caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile   # replace sandbox.example.com with your domain
sudo systemctl reload caddy
```

Caddy obtains and renews the certificate itself. The Caddyfile turns off response buffering so streamed runs appear word by word. Keep `TRUST_PROXY=1` (both deploy options set it) so the rate limits see real client IPs and not Caddy's.

## 4. Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `AI_PROVIDER` | `mock` | `anthropic` to use Claude (requires the key) |
| `ANTHROPIC_API_KEY` | | Your key; never shown to prospects |
| `ANTHROPIC_MODEL` / `ANTHROPIC_EFFORT` | `claude-opus-5-5` / `medium` | |
| `ADMIN_TOKEN` | `change-me` | Admin password; at least 16 characters in production |
| `DEFAULT_BUDGET_USD` | `10` | AI budget cap for each new sandbox |
| `DEFAULT_SANDBOX_DAYS` | `30` | New invite links expire after this many days (`0` means never) |
| `TRUST_PROXY` | off | Set to `1` behind Caddy or Nginx |
| `RATE_LIMIT` | on | Set to `off` only for load tests |
| `BACKUP_DAYS` | `14` | Number of daily `db.json` snapshots kept in `DATA_DIR/backups` |
| `DATA_DIR` / `PORT` | `./data` / `3000` | |

## 5. Built-in protection

- **Invite links:** each link is a readable prefix plus 8 random characters, for example `/s/bao-bi-tan-phu-k3m9q2xp`. You can choose your own link code, but it must be at least 12 characters. "Tạo link mới" in the admin console creates a new link and the old one stops working immediately.
- **Report links:** `/r/<16 random characters>`. A report is private until you publish it. Unpublishing withdraws the link.
- **Rate limits** (in memory, per IP):
  - 240 sandbox requests per minute;
  - 20 runs per minute;
  - 60 runs per sandbox every 10 minutes;
  - 30 uploads and 10 contact forms every 10 minutes.
- **Admin sign-in:** 10 failed sign-ins lock that IP out for 15 minutes. The password comparison runs in constant time.
- **Headers:** `Referrer-Policy: no-referrer` (invite tokens never leak to other sites), `nosniff`, and `X-Frame-Options: SAMEORIGIN`. HSTS comes from Caddy.
- **Hard cost limit:** the USD budget per sandbox, enforced on the server.

## 6. Backups

- **Daily snapshots:** the server copies `db.json` to `DATA_DIR/backups/db-YYYY-MM-DD.json` once a day and keeps the last 14 copies.
- **Off-server copies:** add `deploy/backup-offsite.sh` to cron. It packs `db.json`, the snapshots, uploads and artifacts, then copies them with rsync or rclone:

```
30 2 * * * BACKUP_TARGET=backup@nas:/backups/ai-sandbox /opt/ai-sandbox/deploy/backup-offsite.sh >> /var/log/ai-sandbox-backup.log 2>&1
```

**Restore:** stop the service, copy a snapshot over `data/db.json`, then start it again.

## 7. Before sending a link

Run `/release-check` (`npm run check`, then `npm run smoke`). Then open the sandbox on your phone and run one agent with "Dùng dữ liệu mẫu" and then "Chạy".
