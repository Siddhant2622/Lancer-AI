import { NextResponse } from 'next/server';
import { checkGeminiHealth } from '@/lib/ai-engine';
import { checkSupabaseHealth } from '@/lib/supabase';
import { getPayPalAccessToken, isPayPalConfigured, PAYPAL_BASE_URL } from '@/lib/paypal';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('quick') === '1' || searchParams.get('quick') === 'true') {
    return NextResponse.json({
      status: 'ok',
      version: '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
  return runHealthChecks();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return runHealthChecks({
      clientId: body.paypalClientId,
      clientSecret: body.paypalClientSecret,
    });
  } catch {
    return runHealthChecks();
  }
}

async function runHealthChecks(paypalOverride?: { clientId?: string; clientSecret?: string }) {
  const [gemini, supabase, paypal] = await Promise.all([
    checkGeminiHealth(),
    checkSupabaseHealth(),
    checkPayPalHealth(paypalOverride),
  ]);

  const firebaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  const overallHealthy = gemini.connected && supabase.connected && paypal.connected;

  return NextResponse.json({
    status: overallHealthy ? 'healthy' : 'degraded',
    version: '0.1.0',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      gemini,
      supabase,
      paypal,
      firebase: {
        configured: firebaseConfigured,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      },
    },
  });
}

async function checkPayPalHealth(override?: { clientId?: string; clientSecret?: string }) {
  const configured = isPayPalConfigured(override);
  if (!configured) {
    return {
      configured: false,
      connected: false,
      environment: process.env.PAYPAL_ENV || 'sandbox',
      baseUrl: PAYPAL_BASE_URL,
      error: 'Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET',
    };
  }

  try {
    await getPayPalAccessToken(override);
    return {
      configured: true,
      connected: true,
      environment: process.env.PAYPAL_ENV || 'sandbox',
      baseUrl: PAYPAL_BASE_URL,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PayPal OAuth failed';
    return {
      configured: true,
      connected: false,
      environment: process.env.PAYPAL_ENV || 'sandbox',
      baseUrl: PAYPAL_BASE_URL,
      error: msg.includes('invalid_client')
        ? 'PayPal credentials rejected (401 invalid_client) — paste active Sandbox keys in Credentials or use Simulation Mode'
        : msg.slice(0, 180),
    };
  }
}

