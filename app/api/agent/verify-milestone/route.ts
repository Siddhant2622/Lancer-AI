import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { runLiveAITribunal } from '@/lib/ai-engine';
import { uploadCertificateToSupabase, uploadVisualSnapshotToSupabase } from '@/lib/supabase';
import { appendLedgerEntries, findContract, saveContract } from '@/lib/store';
import { DeliveryCertificate, LedgerEntry } from '@/lib/types';
import { enforceRateLimit } from '@/lib/rate-limit';
import { parseAndValidateScreenshotDataUrl } from '@/lib/validation';
import { logger } from '@/lib/logger';

interface SubmissionBody {
  contractId?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  milestoneAmount?: number;
  criteria?: string[];
  submissionEvidence?: {
    githubPR?: string;
    stagingUrl?: string;
    figmaUrl?: string;
    notes?: string;
    screenshotBase64?: string;
  };
  scenarioOverride?: 'A' | 'B' | 'C';
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'agent:verify_milestone', max: 25, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body: SubmissionBody = await req.json();
    const contractId = body.contractId || 'ESC-8842';
    const contract = findContract(contractId);
    if (!contract) {
      return NextResponse.json(
        { success: false, error: `Contract ${contractId} not found` },
        { status: 404 }
      );
    }

    const milestoneId = body.milestoneId || 'm2';
    const milestone =
      contract.milestones.find((m) => m.id === milestoneId) || contract.milestones[1] || contract.milestones[0];

    const milestoneTitle = body.milestoneTitle || milestone?.title || 'Core Payment Webhooks & Cart UI';
    const milestoneAmount = Number(body.milestoneAmount ?? milestone?.amount ?? 1500);
    const criteria =
      body.criteria && body.criteria.length > 0
        ? body.criteria
        : milestone?.acceptanceCriteria || [
            'PayPal Orders v2 checkout with AUTHORIZE intent',
            'Webhook handler for PAYMENT.CAPTURE.COMPLETED',
            'Responsive mobile-first checkout UI',
          ];

    const evidence = body.submissionEvidence || {};
    const githubPR = evidence.githubPR || milestone?.githubPR || 'https://github.com/nexus/escrow-demo/pull/48';
    const stagingUrl = evidence.stagingUrl || milestone?.stagingUrl || 'https://nexus-escrow-demo.vercel.app';
    const figmaUrl = evidence.figmaUrl || milestone?.figmaUrl;

    // Validate & upload optional visual snapshot to Supabase Storage
    let snapshotUrl: string | undefined;
    if (evidence.screenshotBase64) {
      const parsedImg = parseAndValidateScreenshotDataUrl(evidence.screenshotBase64);
      if (!parsedImg) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid screenshot image. Allowed formats: PNG, JPEG, or WebP up to 5 MB.',
          },
          { status: 400 }
        );
      }

      const snapRes = await uploadVisualSnapshotToSupabase(
        contractId,
        milestoneId,
        evidence.screenshotBase64,
        parsedImg.mimeType
      );
      if (snapRes.uploaded) {
        snapshotUrl = snapRes.publicUrl;
      }
    }

    logger.info('agent.verify_milestone_started', { contractId, milestoneId, hasSnapshot: Boolean(snapshotUrl) });

    const tribunalOutput = await runLiveAITribunal(
      {
        milestoneId,
        milestoneTitle,
        milestoneAmount,
        criteria,
        githubPR,
        stagingUrl,
        figmaUrl,
        notes: evidence.notes,
        screenshotBase64: evidence.screenshotBase64,
        scenarioOverride: body.scenarioOverride,
      },
      milestone?.splitRatios || []
    );

    const commitHash = tribunalOutput.prTelemetry.commitSha;
    const deliverableHash = crypto
      .createHash('sha256')
      .update(`${contractId}:${milestoneId}:${githubPR}:${commitHash}:${Date.now()}`)
      .digest('hex');

    const captureId =
      tribunalOutput.status !== 'CHANGES_REQUESTED'
        ? `CAP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        : '';
    const batchPayoutId =
      tribunalOutput.status !== 'CHANGES_REQUESTED'
        ? `BATCH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
        : '';

    let certificate: DeliveryCertificate | null = null;
    if (tribunalOutput.captureAmount > 0) {
      certificate = {
        milestoneId,
        milestoneTitle,
        deliverableHash,
        commitHash,
        timestamp: new Date().toISOString(),
        agent1Score: tribunalOutput.agent1.score,
        agent2Score: tribunalOutput.agent2.score,
        agent3Score: tribunalOutput.agent3.score,
        overallScore: tribunalOutput.overallScore,
        status: tribunalOutput.status,
        orderId: contract.orderId,
        authorizationId: contract.authorizationId,
        captureId,
        batchPayoutId,
        passedChecks: tribunalOutput.passedChecks,
        poweredBy: tribunalOutput.poweredBy,
      };

      const sbUpload = await uploadCertificateToSupabase(
        contractId,
        milestoneId,
        certificate as unknown as Record<string, unknown>
      );
      if (sbUpload.uploaded && sbUpload.publicUrl) {
        certificate.supabaseProofUrl = sbUpload.publicUrl;
      }
    }

    // Persist milestone submission link updates & AI evaluation event
    if (milestone) {
      milestone.githubPR = githubPR;
      milestone.stagingUrl = stagingUrl;
      milestone.aiScore = tribunalOutput.overallScore;
      saveContract(contract);
    }

    const evalEntry: LedgerEntry = {
      id: `led-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      eventType: 'AI_EVALUATION',
      milestoneRef: `M${milestone?.number || 2}: ${milestoneTitle}`,
      paypalRefId: `EVAL-${milestoneId.toUpperCase()}-${tribunalOutput.overallScore}PCT`,
      recipientEmail: '—',
      grossAmount: 0,
      aiConfidenceScore: tribunalOutput.overallScore,
      status: 'completed',
      requestPayload: {
        milestoneId,
        githubPR,
        stagingUrl,
        poweredBy: tribunalOutput.poweredBy,
      },
      responsePayload: {
        status: tribunalOutput.status,
        overallScore: tribunalOutput.overallScore,
        supabaseProofUrl: certificate?.supabaseProofUrl,
      },
    };
    appendLedgerEntries(contractId, [evalEntry]);

    const splitPayouts = (milestone?.splitRatios || []).map((s) => ({
      ...s,
      amount: Math.round(tribunalOutput.captureAmount * s.percentage) / 100,
    }));

    return NextResponse.json({
      success: true,
      contractId,
      milestoneId,
      status: tribunalOutput.status,
      confidenceScore: tribunalOutput.overallScore,
      poweredBy: tribunalOutput.poweredBy,
      modelUsed: tribunalOutput.modelUsed,
      snapshotUrl,
      prTelemetry: tribunalOutput.prTelemetry,
      stagingTelemetry: tribunalOutput.stagingTelemetry,
      agent1: tribunalOutput.agent1,
      agent2: tribunalOutput.agent2,
      agent3: tribunalOutput.agent3,
      captureAmount: tribunalOutput.captureAmount,
      holdAmount: tribunalOutput.holdAmount,
      splitPayouts,
      passedChecks: tribunalOutput.passedChecks,
      discrepancies: tribunalOutput.discrepancies,
      certificate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Agent verification failed',
      },
      { status: 500 }
    );
  }
}
