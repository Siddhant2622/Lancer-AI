import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { authorizePayPalOrder, isPayPalConfigured } from '@/lib/paypal';
import { appendLedgerEntries, findContract, saveContract } from '@/lib/store';
import { LedgerEntry } from '@/lib/types';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'paypal:authorize', max: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      orderId,
      contractId = 'ESC-8842',
      amount = 4000,
      simulate = false,
      paypalClientId,
      paypalClientSecret,
    } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const contract = findContract(contractId);
    if (!contract) {
      return NextResponse.json(
        { success: false, error: `Contract ${contractId} not found` },
        { status: 404 }
      );
    }

    const creds = {
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
    };

    let authorizationId = `AUTH-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    let apiMode: 'paypal_live_sandbox' | 'simulated_sandbox' = 'simulated_sandbox';
    let responsePayload: Record<string, unknown> = {};
    let diagnostic: string | undefined;

    if (!simulate && isPayPalConfigured(creds) && !String(orderId).startsWith('ORDER-')) {
      try {
        const res = await authorizePayPalOrder(orderId, creds);
        authorizationId = res.authorizationId || authorizationId;
        apiMode = 'paypal_live_sandbox';
        responsePayload = res.responsePayload;
      } catch (err) {
        diagnostic = err instanceof Error ? err.message : 'Authorize call fell back to simulation';
      }
    }

    // Update persistent contract state
    contract.orderId = orderId;
    contract.authorizationId = authorizationId;
    contract.status = 'authorized';
    contract.milestones = contract.milestones.map((m) => ({ ...m, authorizationId }));
    saveContract(contract);
    logger.info('paypal.order_authorized', { contractId, orderId, authorizationId, apiMode });

    const ledgerEntry: LedgerEntry = {
      id: `led-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      eventType: 'ORDER_AUTHORIZED',
      milestoneRef: `Full Contract ${contractId}`,
      paypalRefId: authorizationId,
      recipientEmail: '—',
      grossAmount: Number(amount || contract.totalAmount),
      status: 'completed',
      apiMode,
      requestPayload: { orderId, intent: 'AUTHORIZE' },
      responsePayload: Object.keys(responsePayload).length > 0 ? responsePayload : { authorizationId, status: 'CREATED' },
    };

    const ledger = appendLedgerEntries(contractId, [ledgerEntry]);

    return NextResponse.json({
      success: true,
      apiMode,
      diagnostic,
      orderId,
      authorizationId,
      contract,
      ledger,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Authorization failed' },
      { status: 500 }
    );
  }
}

