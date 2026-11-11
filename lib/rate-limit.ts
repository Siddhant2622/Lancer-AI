import { NextResponse } from 'next/server';

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

export interface RateLimitOptions {
  key: string;
  max?: number;
  windowMs?: number;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'local';
}

/**
 * Lightweight in-memory sliding-window rate limiter for API protection.
 * Returns null if allowed, or a 429 NextResponse if throttled.
 */
export function enforceRateLimit(req: Request, options: RateLimitOptions): NextResponse | null {
  // Periodic pruning so memory stays bounded under high traffic
  const now = Date.now();
  if (buckets.size > 2000) {
    for (const [k, entry] of buckets.entries()) {
      if (entry.resetAt <= now) buckets.delete(k);
    }
  }

  const max = options.max ?? 45;
  const windowMs = options.windowMs ?? 60_000;
  const bucketKey = `${options.key}:${extractClientIp(req)}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded for ${options.key}. Retry in ${retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(max),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  existing.count += 1;
  return null;
}

