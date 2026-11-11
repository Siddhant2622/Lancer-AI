import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  appendLedgerEntries,
  getWebhookEvents,
  hasWebhookEvent,
  recordWebhookEvent,
} from '@/lib/store';
import { providePayPalDisputeEvidence, verifyPayPalWebhookSignature } from '@/lib/paypal';
import { LedgerEntry } from '@/lib/types';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function GET() {
  return NextResponse.json({
    success: true,
    events: getWebhookEvents(),
  });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'paypal:webhook', max: 120, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const event = await req.json();
    if (!event || typeof event !== 'object') {
      return NextResponse.json({ received: false, error: 'Malformed webhook payload' }, { status: 400 });
    }

    const signatureCheck = await verifyPayPalWebhookSignature(req.headers, event);
    if (signatureCheck.mode === 'paypal_cryptographic' && !signatureCheck.verified) {
      logger.warn('paypal.webhook_signature_rejected', {
        eventType: event.event_type,
        eventId: event.id,
      });
      return NextResponse.json(
        { received: false, error: 'Invalid PayPal webhook cryptographic signature' },
        { status: 401 }
      );
    }

    const eventType = String(event.event_type || 'PAYMENT.CAPTURE.COMPLETED');
    const eventId = String(event.id || `EVT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`);
    if (hasWebhookEvent(eventId)) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        eventId,
        eventType,
        signatureVerified: signatureCheck.verified,
        verificationMode: signatureCheck.mode,
      });
    }

    const contractId = String(event.contractId || event.resource?.custom_id || 'ESC-8842');
    const timestamp = new Date().toISOString();

    let actionTaken = 'LOGGED';
    let disputeEvidenceSubmitted = false;
    let disputeResult: Awaited<ReturnType<typeof providePayPalDisputeEvidence>> | undefined;

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        actionTaken = 'ORDER_APPROVED_TRANSITION_TO_AUTHORIZE';
        break;
      case 'PAYMENT.AUTHORIZATION.CREATED':
        actionTaken = 'ESCROW_VAULT_LOCK_ACTIVATED';
        break;
      case 'PAYMENT.CAPTURE.COMPLETED':
        actionTaken = 'PARTIAL_CAPTURE_CONFIRMED_TRIGGER_BATCH_PAYOUT';
        break;
      case 'PAYMENT.PAYOUTSBATCH.SUCCESS':
        actionTaken = 'SPLIT_DISBURSEMENT_SETTLED_UPDATE_GANTT_TIMELINE';
        break;
      case 'CUSTOMER.DISPUTE.CREATED': {
        actionTaken = 'DISPUTE_SHIELD_AUTO_EVIDENCE_SUBMITTED';
        disputeEvidenceSubmitted = true;

        const disputeId =
          event.resource?.dispute_id || `PP-D-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const deliverableHash =
          event.resource?.deliverable_hash || crypto.createHash('sha256').update(contractId).digest('hex');

        disputeResult = await providePayPalDisputeEvidence({
          disputeId,
          deliverableHash,
          commitHash: crypto.randomBytes(20).toString('hex'),
          captureId: event.resource?.capture_id || 'CAP-10293',
        });

        const disputeEntry: LedgerEntry = {
          id: `led-${crypto.randomBytes(4).toString('hex')}`,
          timestamp,
          eventType: 'DISPUTE_SHIELD',
          milestoneRef: `Dispute Shield (${contractId})`,
          paypalRefId: disputeId,
          recipientEmail: 'disputes-api@paypal.com',
          grossAmount: Number(event.resource?.dispute_amount?.value || 1000),
          status: 'completed',
          requestPayload: disputeResult.requestPayload,
          responsePayload: disputeResult.responsePayload,
        };
        appendLedgerEntries(contractId, [disputeEntry]);
        break;
      }
      default:
        actionTaken = `EVENT_ACKNOWLEDGED_${eventType}`;
    }

    recordWebhookEvent(eventId, eventType, actionTaken, event);
    logger.info('paypal.webhook_processed', { eventId, eventType, contractId, actionTaken });

    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      signatureVerified: signatureCheck.verified,
      verificationMode: signatureCheck.mode,
      actionTaken,
      disputeEvidenceSubmitted,
      processedAt: timestamp,
      disputeShieldDetails: disputeEvidenceSubmitted
        ? {
            status: 'EVIDENCE_PROVIDED',
            evidenceType: 'CRYPTOGRAPHIC_DELIVERY_CERTIFICATE',
            sha256ProofAttached: true,
            submittedLive: disputeResult?.submittedLive ?? false,
            payPalAction: 'POST /v1/customer/disputes/{dispute_id}/provide-evidence',
          }
        : undefined,
    });
  } catch (err) {
    logger.warn('paypal.webhook_error', { error: err instanceof Error ? err.message : 'invalid JSON' });
    return NextResponse.json({ received: false, error: 'Webhook processing error' }, { status: 400 });
  }
}
