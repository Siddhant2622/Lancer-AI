const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const BUCKET_NAME = 'escrow-certificates';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function supabaseHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

/**
 * Ensures the `escrow-certificates` public bucket exists in Supabase Storage.
 */
async function ensureBucket(): Promise<string> {
  if (!isSupabaseConfigured()) return BUCKET_NAME;

  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'GET',
      headers: supabaseHeaders(),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (listRes.ok) {
      const buckets = (await listRes.json()) as Array<{ name: string }>;
      if (buckets.some((b) => b.name === BUCKET_NAME)) {
        return BUCKET_NAME;
      }

      const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: supabaseHeaders('application/json'),
        body: JSON.stringify({
          id: BUCKET_NAME,
          name: BUCKET_NAME,
          public: true,
          file_size_limit: 10485760,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (createRes.ok || createRes.status === 409) {
        return BUCKET_NAME;
      }

      // Fallback to existing public bucket if creation is restricted
      if (buckets.length > 0) {
        return buckets[0].name;
      }
    }
  } catch (err) {
    console.warn('[Supabase] ensureBucket warning:', err);
  }

  return BUCKET_NAME;
}

/**
 * Uploads a cryptographic proof-of-delivery certificate JSON to Supabase Storage
 * and returns its tamper-evident public URL.
 */
export async function uploadCertificateToSupabase(
  contractId: string,
  milestoneId: string,
  certificate: Record<string, unknown>
): Promise<{ uploaded: boolean; publicUrl?: string; bucket?: string; path?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { uploaded: false, error: 'Supabase not configured' };
  }

  try {
    const bucket = await ensureBucket();
    const objectPath = `${contractId}/${milestoneId}_${Date.now()}.json`;
    const body = JSON.stringify(certificate, null, 2);

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders('application/json'),
        'x-upsert': 'true',
      },
      body,
      signal: AbortSignal.timeout(6000),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { uploaded: false, error: `Supabase upload ${uploadRes.status}: ${errText}` };
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
    return {
      uploaded: true,
      bucket,
      path: objectPath,
      publicUrl,
    };
  } catch (err) {
    return {
      uploaded: false,
      error: err instanceof Error ? err.message : 'Supabase upload error',
    };
  }
}

/**
 * Uploads a deliverable preview image (base64) to Supabase Storage for multimodal vision auditing.
 */
export async function uploadVisualSnapshotToSupabase(
  contractId: string,
  milestoneId: string,
  base64Data: string,
  mimeType = 'image/png'
): Promise<{ uploaded: boolean; publicUrl?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { uploaded: false, error: 'Supabase not configured' };
  }

  try {
    const bucket = await ensureBucket();
    const cleaned = base64Data.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
    const buffer = Buffer.from(cleaned, 'base64');
    const ext = mimeType.split('/')[1] || 'png';
    const objectPath = `${contractId}/snapshots/${milestoneId}_${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(mimeType),
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(6000),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { uploaded: false, error: `Snapshot upload ${uploadRes.status}: ${errText}` };
    }

    return {
      uploaded: true,
      publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`,
    };
  } catch (err) {
    return {
      uploaded: false,
      error: err instanceof Error ? err.message : 'Snapshot upload failed',
    };
  }
}

/**
 * Checks live Supabase Storage connectivity cleanly without blocking.
 */
export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  buckets?: string[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, connected: false, error: 'Missing SUPABASE_URL or SUPABASE_KEY' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'GET',
      headers: supabaseHeaders(),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { configured: true, connected: false, error: `HTTP ${res.status}` };
    }

    const buckets = (await res.json()) as Array<{ name: string }>;
    return {
      configured: true,
      connected: true,
      buckets: buckets.map((b) => b.name),
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : 'Supabase health check failed',
    };
  }
}
