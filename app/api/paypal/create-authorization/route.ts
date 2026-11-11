import { NextResponse } from 'next/server';
import { createPayPalAuthorizeOrder, isPayPalConfigured } from '@/lib/paypal';
import { normalizeCurrency, validatePositiveAmount } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'paypal:create_order', max: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      contractId = 'ESC-8842',
      amount = 4000,
      currency = 'USD',
      description = 'Lancer AI Autonomous Milestone Contract',
      milestones = [],
      simulate = false,
      paypalClientId,
      paypalClientSecret,
    } = body;

    const validAmount = validatePositiveAmount(amount);
    if (validAmount === null) {
      return NextResponse.json(
        { success: false, error: 'amount must be a finite positive number <= 1,000,000' },
        { status: 400 }
      );
    }
    const safeCurrency = normalizeCurrency(currency);

    const creds = {
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
    };

    if (!simulate && isPayPalConfigured(creds)) {
      try {
        const result = await createPayPalAuthorizeOrder({
          amount: validAmount,
          currency: safeCurrency,
          referenceId: contractId,
          description,
          milestones,
          credentials: creds,
        });

        return NextResponse.json({
          success: true,
          apiMode: 'paypal_live_sandbox',
          orderId: result.orderId,
          status: result.status,
          intent: 'AUTHORIZE',
          amount: { value: validAmount.toFixed(2), currency: safeCurrency },
          links: result.links,
          payload: result.requestPayload,
          response: result.responsePayload,
        });
      } catch (paypalErr) {
        const msg = paypalErr instanceof Error ? paypalErr.message : 'PayPal API error';
        console.warn('[PayPal create-authorization] Live sandbox call fell back to simulation:', msg);

        // Return simulated order with diagnostic notice so flow remains functional
        return buildSimulatedResponse(contractId, validAmount, safeCurrency, description, milestones, msg);
      }
    }

    return buildSimulatedResponse(contractId, validAmount, safeCurrency, description, milestones);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create authorization order' },
      { status: 500 }
    );
  }
}

function buildSimulatedResponse(
  contractId: string,
  amount: number | string,
  currency: string,
  description: string,
  milestones: Array<{ title: string; amount: number }>,
  paypalDiagnostic?: string
) {
  const numericAmt = Number(amount).toFixed(2);
  const orderId = `ORDER-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
  const authorizationId = `AUTH-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

  const orderPayload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: contractId,
        custom_id: 'LANCER_AI_VAULT',
        description,
        amount: {
          currency_code: currency,
          value: numericAmt,
          breakdown: {
            item_total: { currency_code: currency, value: numericAmt },
          },
        },
        items:
          milestones.length > 0
            ? milestones.map((m) => ({
                name: m.title,
                unit_amount: { currency_code: currency, value: Number(m.amount).toFixed(2) },
                quantity: '1',
              }))
            : [{ name: description, unit_amount: { currency_code: currency, value: numericAmt }, quantity: '1' }],
      },
    ],
  };

  return NextResponse.json({
    success: true,
    apiMode: 'simulated_sandbox',
    paypalDiagnostic,
    orderId,
    authorizationId,
    status: 'CREATED',
    intent: 'AUTHORIZE',
    amount: { value: numericAmt, currency },
    payload: orderPayload,
  });
}
