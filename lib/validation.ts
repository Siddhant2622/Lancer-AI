import type { SplitRatio, SupportedCurrency } from './types';

const ALLOWED_CURRENCIES = new Set<SupportedCurrency>(['USD', 'EUR', 'GBP']);

/**
 * Validates that a URL uses HTTP/HTTPS and does not target private, loopback, or cloud-metadata networks (SSRF guard).
 */
export function isSafePublicHttpUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('fe80:') ||
      host.startsWith('fc00:') ||
      host.startsWith('fd')
    ) {
      return false;
    }

    // Block IPv4 private & link-local ranges
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const a = Number(ipv4[1]);
      const b = Number(ipv4[2]);
      if (
        a === 127 ||
        a === 10 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function validatePositiveAmount(value: unknown, max = 1_000_000): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > max) {
    return null;
  }
  return Math.round(num * 100) / 100;
}

export function normalizeCurrency(value: unknown): SupportedCurrency {
  const upper = String(value || 'USD').toUpperCase() as SupportedCurrency;
  return ALLOWED_CURRENCIES.has(upper) ? upper : 'USD';
}

export function validateSplitRatios(ratios: SplitRatio[]): boolean {
  if (!Array.isArray(ratios) || ratios.length === 0 || ratios.length > 10) return false;
  const sum = ratios.reduce((acc, item) => acc + Number(item.percentage || 0), 0);
  return (
    Math.abs(sum - 100) < 0.01 &&
    ratios.every((r) => Number(r.percentage) >= 0 && validateEmail(r.recipientEmail))
  );
}

export function validateEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 254;
}

export function validateContractId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z0-9_-]{3,48}$/.test(value.trim());
}

export interface ParsedScreenshot {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64: string;
  byteLength: number;
}

const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates raster base64 data URLs (PNG/JPEG/WebP <= 5 MB) for Gemini Vision & Supabase uploads.
 */
export function parseAndValidateScreenshotDataUrl(raw: unknown): ParsedScreenshot | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;

  const normalizedMime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    return null;
  }

  const base64 = match[2];
  const byteLength = Buffer.byteLength(base64, 'base64');
  if (byteLength <= 0 || byteLength > MAX_SCREENSHOT_BYTES) {
    return null;
  }

  return {
    mimeType: normalizedMime as ParsedScreenshot['mimeType'],
    base64,
    byteLength,
  };
}
