import { NextResponse } from 'next/server';
import { getPayPalAuthorization, isPayPalConfigured } from '@/lib/paypal';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authorizationId = (id || '').trim();

    if (!authorizationId) {
      return NextResponse.json(
        { success: false, error: 'Authorization ID is required.' },
        { status: 400 }
      );
    }

    // Reject obvious synthetic/demo placeholders before calling PayPal REST API
    if (
      authorizationId.startsWith('AUTH-') ||
      authorizationId.startsWith('SIM-') ||
      authorizationId.length < 10 ||
      !/^[A-Za-z0-9_-]+$/.test(authorizationId)
    ) {
      return NextResponse.json(
        {
          success: false,
          simulated: authorizationId.startsWith('AUTH-') || authorizationId.startsWith('SIM-'),
          authorizationId,
          error:
            'This ID is a simulated/invalid placeholder. Complete a real PayPal Orders v2 checkout to inspect a live PayPal authorization.',
        },
        { status: 400 }
      );
    }

    if (!isPayPalConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'PayPal Sandbox credentials are not configured on the server.',
        },
        { status: 400 }
      );
    }

    const authorization = await getPayPalAuthorization(authorizationId);

    return NextResponse.json({
      success: true,
      apiMode: 'paypal_live_sandbox',
      authorizationId: (authorization.id as string) || authorizationId,
      status: (authorization.status as string) || 'UNKNOWN',
      amount: authorization.amount || null,
      expirationTime: (authorization.expiration_time as string) || null,
      createTime: (authorization.create_time as string) || null,
      updateTime: (authorization.update_time as string) || null,
      authorization,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to fetch live PayPal authorization status.',
      },
      { status: 502 }
    );
  }
}

