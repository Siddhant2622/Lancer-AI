import { NextResponse } from 'next/server';
import { listContracts, saveContract } from '@/lib/store';
import { Contract } from '@/lib/types';

export async function GET() {
  return NextResponse.json({
    success: true,
    contracts: listContracts(),
  });
}

export async function POST(req: Request) {
  const { enforceRateLimit } = await import('@/lib/rate-limit');
  const limited = enforceRateLimit(req, { key: 'contracts:create', max: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const {
      validatePositiveAmount,
      normalizeCurrency,
      validateSplitRatios,
      validateContractId,
    } = await import('@/lib/validation');
    const body = await req.json();
    const {
      id,
      title,
      currency: rawCurrency = 'USD',
      mode = 'demo',
      status: requestedStatus,
      milestones = [],
      squadSplits,
      clientName = 'Acme Corp',
      clientEmail = 'client-sandbox@acme.example.com',
      freelancerName = 'Nexus Studio',
      freelancerEmail = 'lead-dev-sandbox@nexus.example.com',
      orderId = '',
      authorizationId = '',
    } = body;

    if (id !== undefined && !validateContractId(id)) {
      return NextResponse.json(
        { success: false, error: 'Contract ID must be 3-48 alphanumeric/hyphen/underscore characters.' },
        { status: 400 }
      );
    }

    if (Array.isArray(milestones) && milestones.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Contracts may contain at most 20 milestones.' },
        { status: 400 }
      );
    }

    const isRealMode = mode === 'real';
    const currency = normalizeCurrency(rawCurrency);

    if (isRealMode && (!Array.isArray(milestones) || milestones.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'At least one milestone is required for a real contract.' },
        { status: 400 }
      );
    }

    if (squadSplits !== undefined && !validateSplitRatios(squadSplits)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Squad split ratios must total 100% and include valid recipient emails.',
        },
        { status: 400 }
      );
    }

    const contractId = id || `ESC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString();

    interface IncomingMilestone {
      title: string;
      description?: string;
      amount: number;
      criteria?: string[];
      acceptanceCriteria?: string[];
      githubPR?: string;
      stagingUrl?: string;
      figmaUrl?: string;
      splitRatios?: Array<{
        recipientName: string;
        recipientEmail: string;
        role: string;
        percentage: number;
        amount?: number;
      }>;
    }

    const mappedMilestones = [];
    for (let idx = 0; idx < milestones.length; idx++) {
      const m = milestones[idx] as IncomingMilestone;
      const amt = validatePositiveAmount(m.amount ?? (isRealMode ? 0 : 500));
      if (amt === null) {
        return NextResponse.json(
          { success: false, error: `Milestone ${idx + 1} requires a valid positive amount.` },
          { status: 400 }
        );
      }

      const startOffset = idx * 10;
      const endOffset = (idx + 1) * 10;
      const mStart = new Date(now.getTime() + startOffset * 86400000).toISOString().split('T')[0];
      const mEnd = new Date(now.getTime() + endOffset * 86400000).toISOString().split('T')[0];

      const customSplits =
        Array.isArray(m.splitRatios) && m.splitRatios.length > 0
          ? m.splitRatios
          : Array.isArray(squadSplits) && squadSplits.length > 0
            ? squadSplits
            : null;

      if (customSplits) {
        const normalizedCustom = customSplits.map((s) => ({
          recipientName: s.recipientName || 'Team Member',
          recipientEmail: s.recipientEmail,
          role: s.role || 'Contributor',
          percentage: Number(s.percentage),
          amount: Math.round(amt * (Number(s.percentage) / 100) * 100) / 100,
        }));
        if (!validateSplitRatios(normalizedCustom)) {
          return NextResponse.json(
            {
              success: false,
              error: `Milestone ${idx + 1} split ratios must sum to 100% with valid emails.`,
            },
            { status: 400 }
          );
        }
        mappedMilestones.push({
          id: `m${idx + 1}`,
          number: idx + 1,
          title: m.title,
          description: m.description || m.title,
          amount: amt,
          status: (idx === 0 && (!isRealMode || Boolean(authorizationId)) ? 'in_audit' : 'locked') as
            | 'in_audit'
            | 'locked',
          startDate: mStart,
          endDate: mEnd,
          dependsOn: idx > 0 ? `m${idx}` : undefined,
          githubPR: m.githubPR || (!isRealMode && idx === 0 ? 'https://github.com/nexus/escrow-demo/pull/48' : undefined),
          stagingUrl: m.stagingUrl || (!isRealMode && idx === 0 ? 'https://nexus-escrow-demo.vercel.app' : undefined),
          figmaUrl: m.figmaUrl || undefined,
          acceptanceCriteria: m.acceptanceCriteria || m.criteria || [],
          splitRatios: normalizedCustom,
        });
      } else {
        const defaultSplits = isRealMode
          ? [
              {
                recipientName: freelancerName,
                recipientEmail: freelancerEmail,
                role: 'Lead Contractor',
                percentage: 100,
                amount: amt,
              },
            ]
          : [
              {
                recipientName: 'Alex Chen',
                recipientEmail: freelancerEmail,
                role: 'Lead Backend Dev',
                percentage: 70,
                amount: Math.round(amt * 0.7 * 100) / 100,
              },
              {
                recipientName: 'Priya Sharma',
                recipientEmail: 'ui-architect-sandbox@nexus.example.com',
                role: 'UI/UX Architect',
                percentage: 30,
                amount: Math.round(amt * 0.3 * 100) / 100,
              },
            ];

        mappedMilestones.push({
          id: `m${idx + 1}`,
          number: idx + 1,
          title: m.title,
          description: m.description || m.title,
          amount: amt,
          status: (idx === 0 && (!isRealMode || Boolean(authorizationId)) ? 'in_audit' : 'locked') as
            | 'in_audit'
            | 'locked',
          startDate: mStart,
          endDate: mEnd,
          dependsOn: idx > 0 ? `m${idx}` : undefined,
          githubPR: m.githubPR || (!isRealMode && idx === 0 ? 'https://github.com/nexus/escrow-demo/pull/48' : undefined),
          stagingUrl: m.stagingUrl || (!isRealMode && idx === 0 ? 'https://nexus-escrow-demo.vercel.app' : undefined),
          figmaUrl: m.figmaUrl || undefined,
          acceptanceCriteria: m.acceptanceCriteria || m.criteria || [],
          splitRatios: defaultSplits,
        });
      }
    }

    const totalAmount = mappedMilestones.reduce((s, m) => s + m.amount, 0);
    const firstAmount = mappedMilestones[0]?.status === 'in_audit' ? mappedMilestones[0].amount : 0;

    const resolvedStatus = authorizationId
      ? 'authorized'
      : requestedStatus === 'draft' || requestedStatus === 'authorized' || requestedStatus === 'in_progress' || requestedStatus === 'completed'
        ? requestedStatus
        : isRealMode
          ? 'draft'
          : 'in_progress';

    const newContract: Contract = {
      id: contractId,
      title: title || 'Custom AI Escrow Contract',
      currency,
      totalAmount,
      releasedAmount: 0,
      auditAmount: firstAmount,
      lockedAmount: Math.max(0, totalAmount - firstAmount),
      status: resolvedStatus,
      authorizationId: isRealMode
        ? authorizationId || ''
        : authorizationId || `AUTH-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
      orderId: isRealMode
        ? orderId || ''
        : orderId || `ORDER-${Math.random().toString(36).slice(2, 11).toUpperCase()}`,
      clientName,
      clientEmail,
      freelancerName,
      freelancerEmail,
      createdAt: now.toISOString(),
      expiresAt,
      milestones: mappedMilestones,
    };

    saveContract(newContract);
    return NextResponse.json({ success: true, contract: newContract });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to save contract' },
      { status: 500 }
    );
  }
}

