import type { Context } from 'hono';

/**
 * Fixed-window rate limiter kept in memory. One process serves the whole sandbox,
 * so a Map is enough; counters reset on restart, which is acceptable for abuse
 * protection (the USD budget is the hard cost guard).
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  /** Returns seconds to wait when the key is over its limit, otherwise 0 (and counts the hit). */
  take(key: string, limit: number, windowMs: number, now = Date.now()): number {
    this.sweep(now);
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return 0;
    }
    if (cur.count >= limit) return Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
    cur.count += 1;
    return 0;
  }

  /** Count a hit without enforcing (e.g. failed logins), returns the new count. */
  count(key: string, windowMs: number, now = Date.now()): number {
    const cur = this.hits.get(key);
    if (!cur || cur.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    cur.count += 1;
    return cur.count;
  }

  peek(key: string, now = Date.now()): number {
    const cur = this.hits.get(key);
    return cur && cur.resetAt > now ? cur.count : 0;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

/**
 * Best-effort client IP. Behind a reverse proxy (Caddy, Nginx) set TRUST_PROXY=1 so the
 * X-Forwarded-For header is used; otherwise the socket address from @hono/node-server.
 * Returns '' when unknown (in-process tests), in which case IP limits are skipped.
 */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    const real = c.req.header('x-real-ip');
    if (real) return real.trim();
  }
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress ?? '';
}
