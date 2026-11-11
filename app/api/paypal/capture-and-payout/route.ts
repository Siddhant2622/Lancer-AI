import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  buildPayPalInvoicePayload,
  capturePayPalAuthorization,
  createPayPalBatchPayout,
  isPayPalConfigured,
} from '@/lib/paypal';
import { appendLedgerEntries, findContract, saveContract } from '@/lib/store';
import { LedgerEntry } from '@/lib/types';
import { normalizeCurrency, validatePositiveAmount } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

interface SplitRecipient {
  recipientName?: string;
  name?: string;
  recipientEmail?: string;
  email?: string;
  role: string;
  percentage: number;
  amount: number;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'paypal:capture_payout', max: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      contractId = 'ESC-8842',
      authorizationId = 'AUTH-9XK284710L',
      milestoneId = 'm2',
      milestoneTitle = 'Core Payment Webhooks & Cart UI',
      amount = 1500.0,
      holdAmount = 0,
      currency = 'USD',
      isFinalCapture = false,
      recipients = [],
      aiConfidenceScore = 96,
      tribunalVerdict = 'APPROVED',
      simulate = false,
      paypalClientId,
      paypalClientSecret,
    } = body;

    const validCaptureAmount = validatePositiveAmount(amount);
    if (validCaptureAmount === null) {
      return NextResponse.json(
        { success: false, error: 'Capture amount must be a positive finite number' },
        { status: 400 }
      );
    }

    const numericHold = Number(holdAmount);
    if (!Number.isFinite(numericHold) || numericHold < 0 || numericHold > 1_000_000) {
      return NextResponse.json(
        { success: false, error: 'Hold amount must be a non-negative finite number' },
        { status: 400 }
      );
    }

    const safeCurrency = normalizeCurrency(currency);
    const creds = {
      clientId: paypalClientId,
      clientSecret: paypalClientSecret,
    };

    const contract = findContract(contractId);
    if (!contract) {
      return NextResponse.json(
        { success: false, error: `Contract ${contractId} not found` },
        { status: 404 }
      );
    }

    const milestone = contract.milestones.find((m) => m.id === milestoneId);
    if (milestone?.status === 'disbursed') {
      return NextResponse.json(
        {
          success: false,
          error: `Milestone ${milestoneId} has already been captured and disbursed (capture ${milestone.captureId || 'recorded'}).`,
        },
        { status: 409 }
      );
    }

    const remainingEscrow = Math.max(0, Math.round((contract.totalAmount - contract.releasedAmount) * 100) / 100);
    if (validCaptureAmount > remainingEscrow + 0.01 && contract.totalAmount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Requested capture (${validCaptureAmount.toFixed(2)}) exceeds remaining contract escrow (${remainingEscrow.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const effectiveHoldAmount = Math.round(numericHold * 100) / 100;
    const isFinal =
      Boolean(isFinalCapture) || contract.releasedAmount + validCaptureAmount >= contract.totalAmount - 0.01;

    const activeRecipients: SplitRecipient[] =
      Array.isArray(recipients) && recipients.length > 0
        ? recipients.map((r: SplitRecipient) => ({
            ...r,
            amount:
              Number.isFinite(Number(r.amount)) && Number(r.amount) > 0
                ? Math.round(Number(r.amount) * 100) / 100
                : Math.round(validCaptureAmount * (Number(r.percentage || 0) / 100) * 100) / 100,
          }))
        : milestone?.splitRatios.map((s) => ({
            recipientName: s.recipientName,
            recipientEmail: s.recipientEmail,
            role: s.role,
            percentage: s.percentage,
            amount: Math.round(validCaptureAmount * s.percentage) / 100,
          })) || [
            {
              recipientName: 'Alex Chen',
              recipientEmail: 'lead-dev-sandbox@nexus.example.com',
              role: 'Lead Backend Dev',
              percentage: 70,
              amount: Math.round(validCaptureAmount * 70) / 100,
            },
            {
              recipientName: 'Priya Sharma',
              recipientEmail: 'ui-architect-sandbox@nexus.example.com',
              role: 'UI/UX Architect',
              percentage: 30,
              amount: Math.round(validCaptureAmount * 30) / 100,
            },
          ];

    let captureId = `CAP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let batchPayoutId = `BATCH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let captureMode: 'paypal_live_sandbox' | 'simulated_sandbox' = 'simulated_sandbox';
    let payoutMode: 'paypal_live_sandbox' | 'simulated_sandbox' = 'simulated_sandbox';
    const diagnostics: string[] = [];

    const invoiceId = `INV-ESCROW-${milestoneId.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const noteToPayer = `Lancer AI Tribunal Verified: ${milestoneTitle} (Confidence: ${aiConfidenceScore}%).`;

    let captureRequest: Record<string, unknown> = {
      invoice_id: invoiceId,
      note_to_payer: noteToPayer,
      amount: { currency_code: safeCurrency, value: validCaptureAmount.toFixed(2) },
      final_capture: isFinal,
    };
    let captureResponse: Record<string, unknown> = {};

    let payoutRequest: Record<string, unknown> = {
      sender_batch_header: {
        sender_batch_id: `${batchPayoutId}_DISBURSE`,
        email_subject: `Lancer AI: ${milestoneTitle} Released!`,
        email_message: `Deliverable passed autonomous 3-agent verification (${aiConfidenceScore}%). Split payment disbursed.`,
      },
      items: activeRecipients.map((r, idx) => ({
        recipient_type: 'EMAIL',
        amount: { value: Number(r.amount).toFixed(2), currency_code: safeCurrency },
        receiver: r.recipientEmail || r.email || 'freelancer-sandbox@example.com',
        note: `${milestoneTitle} - ${r.role} share (${r.percentage}%)`,
        sender_item_id: `${milestoneId.toUpperCase()}_SPLIT_${idx + 1}`,
      })),
    };
    let payoutResponse: Record<string, unknown> = {};

    const authStr = String(authorizationId || '').trim();
    const canCallLiveCapture =
      !simulate &&
      isPayPalConfigured(creds) &&
      authStr.length >= 10 &&
      !authStr.startsWith('AUTH-') &&
      !authStr.startsWith('SIM-');

    if (canCallLiveCapture) {
      try {
        const capRes = await capturePayPalAuthorization({
          authorizationId: authStr,
          amount: validCaptureAmount,
          currency: safeCurrency,
          invoiceId,
          noteToPayer,
          finalCapture: isFinal,
          credentials: creds,
        });
        captureId = capRes.captureId || captureId;
        captureRequest = capRes.requestPayload;
        captureResponse = capRes.responsePayload;
        captureMode = 'paypal_live_sandbox';
      } catch (err) {
        diagnostics.push(err instanceof Error ? err.message : 'Live capture fell back to simulation');
      }

      if (captureMode === 'paypal_live_sandbox') {
        try {
          const payRes = await createPayPalBatchPayout({
            senderBatchId: `${batchPayoutId}_DISBURSE`,
            emailSubject: `Lancer AI: ${milestoneTitle} Released!`,
            emailMessage: `Deliverable passed autonomous verification (${aiConfidenceScore}%).`,
            items: activeRecipients.map((r, idx) => ({
              recipientEmail: r.recipientEmail || r.email || 'freelancer-sandbox@example.com',
              amount: Number(r.amount),
              currency: safeCurrency,
              note: `${milestoneTitle} - ${r.role} share (${r.percentage}%)`,
              senderItemId: `${milestoneId.toUpperCase()}_SPLIT_${idx + 1}`,
            })),
            credentials: creds,
          });
          batchPayoutId = payRes.payoutBatchId || batchPayoutId;
          payoutRequest = payRes.requestPayload;
          payoutResponse = payRes.responsePayload;
          payoutMode = 'paypal_live_sandbox';
        } catch (err) {
          diagnostics.push(
            `Capture succeeded (${captureId}), but live PayPal Payouts reported: ${
              err instanceof Error ? err.message : 'Payout call fell back to ledger settlement'
            }`
          );
        }
      }
    }

    const apiMode: 'paypal_live_sandbox' | 'simulated_sandbox' =
      captureMode === 'paypal_live_sandbox' ? 'paypal_live_sandbox' : 'simulated_sandbox';
    const diagnostic = diagnostics.length > 0 ? diagnostics.join(' | ') : undefined;

    if (Object.keys(captureResponse).length === 0) {
      captureResponse = {
        id: captureId,
        status: 'COMPLETED',
        amount: { value: validCaptureAmount.toFixed(2), currency_code: safeCurrency },
        final_capture: isFinal,
        seller_receivable_breakdown: {
          gross_amount: { value: validCaptureAmount.toFixed(2), currency_code: safeCurrency },
          paypal_fee: { value: '0.00', currency_code: safeCurrency },
          net_amount: { value: validCaptureAmount.toFixed(2), currency_code: safeCurrency },
        },
        create_time: new Date().toISOString(),
      };
    }

    if (Object.keys(payoutResponse).length === 0) {
      payoutResponse = {
        batch_header: {
          payout_batch_id: batchPayoutId,
          batch_status: 'SUCCESS',
          time_created: new Date().toISOString(),
        },
        items: activeRecipients.map((r, idx) => ({
          payout_item_id: `${batchPayoutId}-ITEM-0${idx + 1}`,
          transaction_status: 'SUCCESS',
          payout_item: {
            recipient_type: 'EMAIL',
            amount: { value: Number(r.amount).toFixed(2), currency_code: safeCurrency },
            receiver: r.recipientEmail || r.email,
            sender_item_id: `${milestoneId.toUpperCase()}_SPLIT_${idx + 1}`,
          },
        })),
      };
    }

    // Update persistent contract & milestones
    const isPartial = tribunalVerdict === 'PARTIAL' || effectiveHoldAmount > 0;

    contract.releasedAmount = Math.min(
      contract.totalAmount,
      Math.round((contract.releasedAmount + validCaptureAmount) * 100) / 100
    );
    contract.auditAmount = isPartial ? effectiveHoldAmount : 0;

    let unlockedNext = false;
    contract.milestones = contract.milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: isPartial ? 'partial_settlement' : 'disbursed',
          captureId,
          batchPayoutId,
          aiScore: Number(aiConfidenceScore),
          subMilestone: isPartial
            ? {
                id: `sub-${milestoneId}`,
                title: `M${m.number}.1: Remediation Sub-Milestone`,
                amount: effectiveHoldAmount,
                reason: 'Held pending minor UX/coverage remediation items',
              }
            : undefined,
        };
      }
      if (!isPartial && !unlockedNext && m.dependsOn === milestoneId && m.status === 'locked') {
        unlockedNext = true;
        return { ...m, status: 'in_audit' };
      }
      return m;
    });

    const totalLocked = contract.milestones
      .filter((m) => m.status === 'locked')
      .reduce((s, m) => s + m.amount, 0);
    contract.lockedAmount = Math.round(totalLocked * 100) / 100;
    if (contract.releasedAmount >= contract.totalAmount - 0.01) {
      contract.status = 'completed';
    }
    saveContract(contract);

    // Append persistent ledger entries
    const ts = new Date().toISOString();
    const invoicePayload = buildPayPalInvoicePayload({
      invoiceNumber: invoiceId,
      milestoneTitle,
      amount: validCaptureAmount,
      currency: safeCurrency,
      clientEmail: contract.clientEmail,
      freelancerEmail: contract.freelancerEmail,
      deliverableHash: crypto
        .createHash('sha256')
        .update(`${contractId}:${milestoneId}:${captureId}`)
        .digest('hex'),
    });

    const newLedgerEntries: LedgerEntry[] = [
      {
        id: `led-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: ts,
        eventType: 'INVOICE_GENERATED',
        milestoneRef: `M${milestone?.number || 2}: ${milestoneTitle}`,
        paypalRefId: invoiceId,
        recipientEmail: contract.clientEmail,
        grossAmount: validCaptureAmount,
        status: 'completed',
        apiMode: captureMode,
        requestPayload: invoicePayload,
        responsePayload: { invoice_id: invoiceId, status: 'MARKED_AS_PAID' },
      },
      {
        id: `led-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: ts,
        eventType: 'PARTIAL_CAPTURE',
        milestoneRef: `M${milestone?.number || 2}: ${milestoneTitle}`,
        paypalRefId: captureId,
        recipientEmail: '—',
        grossAmount: validCaptureAmount,
        aiConfidenceScore: Number(aiConfidenceScore),
        status: 'completed',
        apiMode: captureMode,
        requestPayload: captureRequest,
        responsePayload: captureResponse,
      },
      ...activeRecipients.map((r, idx) => ({
        id: `led-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: ts,
        eventType: 'SPLIT_PAYOUT' as const,
        milestoneRef: `M${milestone?.number || 2}: ${milestoneTitle}`,
        paypalRefId: `${batchPayoutId}-ITEM-0${idx + 1}`,
        recipientEmail: r.recipientEmail || r.email || 'freelancer-sandbox@example.com',
        grossAmount: Number(r.amount),
        splitPercent: r.percentage,
        aiConfidenceScore: Number(aiConfidenceScore),
        status: 'completed' as const,
        apiMode: payoutMode,
        requestPayload: payoutRequest,
        responsePayload: payoutResponse,
      })),
    ];

    const updatedLedger = appendLedgerEntries(contractId, newLedgerEntries);
    logger.info('paypal.capture_and_payout', {
      contractId,
      milestoneId,
      captureId,
      batchPayoutId,
      captureMode,
      payoutMode,
      capturedAmount: validCaptureAmount,
    });

    return NextResponse.json({
      success: true,
      apiMode,
      captureMode,
      payoutMode,
      diagnostic,
      milestoneId,
      authorizationId: authStr,
      captureId,
      batchPayoutId,
      capturedAmount: validCaptureAmount,
      remainingLocked: contract.lockedAmount,
      tribunalVerdict,
      contract,
      ledger: updatedLedger,
      captureRequest,
      captureResponse,
      payoutRequest,
      payoutResponse,
    });
  } catch (error) {
    logger.error('paypal.capture_and_payout_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute capture and split payout',
      },
      { status: 500 }
    );
  }
}
