type LogLevel = 'info' | 'warn' | 'error';

const SENSITIVE_KEY_PATTERN = /(secret|password|token|apikey|api_key|authorization|key)/i;

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(k) && typeof v === 'string' && v.length > 0) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'string') {
      clean[k] = v.replace(/(AIzaSy[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]+)/g, '[REDACTED]');
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function emit(level: LogLevel, event: string, meta?: Record<string, unknown>): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ? { meta: sanitizeMeta(meta) } : {}),
  };
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}

export const logger = {
  info: (event: string, meta?: Record<string, unknown>) => emit('info', event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => emit('warn', event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit('error', event, meta),
};

