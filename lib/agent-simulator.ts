import { AgentResult, AgentCheckItem, TribunalResult, EvaluationStatus, SplitRatio } from './types';
import { generateHash, generateId } from './utils';

export type ScenarioType = 'A' | 'B' | 'C';

interface ScenarioConfig {
  agent1Score: number;
  agent2Score: number;
  overallScore: number;
  status: EvaluationStatus;
  capturePercent: number;
  label: string;
}

const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  A: { agent1Score: 98, agent2Score: 94, overallScore: 96, status: 'APPROVED', capturePercent: 1.0, label: '96% Pass → Auto Full Release' },
  B: { agent1Score: 82, agent2Score: 74, overallScore: 78, status: 'PARTIAL', capturePercent: 0.80, label: '78% Partial → AI Mediated Settlement' },
  C: { agent1Score: 42, agent2Score: 38, overallScore: 42, status: 'CHANGES_REQUESTED', capturePercent: 0, label: '42% Fail → Security Vulnerability Detected' },
};

export function getScenarioLabel(scenario: ScenarioType): string {
  return SCENARIOS[scenario].label;
}

export async function runAgent1Simulation(
  scenario: ScenarioType,
  onUpdate: (checks: AgentCheckItem[], status: 'running' | 'complete') => void
): Promise<AgentResult> {
  const cfg = SCENARIOS[scenario];
  const checks: AgentCheckItem[] = [
    { label: 'Fetching GitHub PR #48 diff (+1,240 −310 lines)', status: 'pending' },
    { label: 'Verifying CI pipeline status (GitHub Actions)', status: 'pending' },
    { label: 'Running unit test suite analysis (42/42 tests)', status: 'pending' },
    { label: 'Calculating test coverage from lcov report', status: 'pending' },
    { label: 'AST scan for hardcoded secrets & credentials', status: 'pending' },
    { label: 'ESLint / TypeScript strict-mode compliance check', status: 'pending' },
    { label: 'Lighthouse performance score audit (CI artifact)', status: 'pending' },
  ];

  for (let i = 0; i < checks.length; i++) {
    checks[i] = { ...checks[i], status: 'running' };
    onUpdate([...checks], 'running');
    await delay(600 + Math.random() * 400);

    if (scenario === 'C' && i === 4) {
      checks[i] = { ...checks[i], status: 'fail', detail: 'CRITICAL: Hardcoded PayPal Client Secret detected in /lib/paypal.ts:L42', score: 0 };
    } else if (scenario === 'B' && i === 3) {
      checks[i] = { ...checks[i], status: 'fail', detail: 'Coverage: 68% (threshold: 80%) — missing tests in /components/Cart/', score: 68 };
    } else {
      const details = [
        '+1,240 −310 lines, 3 files changed, clean diff',
        'All 12 workflow steps passed in 3m 42s',
        '42/42 tests passed, 0 skipped, 0 failed',
        `Coverage: ${scenario === 'A' ? '91%' : '68%'} across 23 modules`,
        'No secrets found — scanning 1,847 lines',
        '0 errors, 2 warnings (non-blocking)',
        `Lighthouse score: ${scenario === 'A' ? '96' : '78'}/100 (Performance)`,
      ];
      checks[i] = { ...checks[i], status: 'pass', detail: details[i], score: i === 3 ? cfg.agent1Score : undefined };
    }
    onUpdate([...checks], 'running');
  }

  onUpdate([...checks], 'complete');
  return { agentName: 'Agent 1', agentRole: 'Code & CI/CD Auditor', score: cfg.agent1Score, checks, status: 'complete' };
}

export async function runAgent2Simulation(
  scenario: ScenarioType,
  onUpdate: (checks: AgentCheckItem[], status: 'running' | 'complete') => void
): Promise<AgentResult> {
  const cfg = SCENARIOS[scenario];
  const checks: AgentCheckItem[] = [
    { label: 'Capturing live DOM snapshot from staging URL', status: 'pending' },
    { label: 'Comparing vs Figma design spec (pixel diff)', status: 'pending' },
    { label: 'Mobile responsiveness audit (375px, 768px, 1440px)', status: 'pending' },
    { label: 'Verifying PayPal button placement & branding', status: 'pending' },
    { label: 'Color contrast & WCAG 2.1 AA accessibility check', status: 'pending' },
    { label: 'Cross-browser compatibility (Chrome, Firefox, Safari)', status: 'pending' },
  ];

  for (let i = 0; i < checks.length; i++) {
    checks[i] = { ...checks[i], status: 'running' };
    onUpdate([...checks], 'running');
    await delay(700 + Math.random() * 500);

    if (scenario === 'C' && i === 2) {
      checks[i] = { ...checks[i], status: 'fail', detail: 'Navbar collapses incorrectly at 768px — layout broken', score: 0 };
    } else if (scenario === 'B' && i === 1) {
      checks[i] = { ...checks[i], status: 'fail', detail: 'Figma parity: 76% (target: 90%) — header spacing deviation 24px', score: 76 };
    } else {
      const details = [
        'Snapshot captured: 1440×900 Chrome headless, 3 viewports',
        `Figma parity: ${scenario === 'A' ? '94%' : '76%'} — minor shadow variance`,
        `Mobile: ✓ (375px), ✓ (768px ${scenario !== 'C' ? '— minor' : '— FAIL'}), ✓ (1440px)`,
        'PayPal button: correct placement, official branding ✓',
        'Contrast ratio: 7.2:1 (exceeds AA threshold 4.5:1)',
        'All 3 browsers: ✓ — no layout issues found',
      ];
      checks[i] = { ...checks[i], status: 'pass', detail: details[i] };
    }
    onUpdate([...checks], 'running');
  }

  onUpdate([...checks], 'complete');
  return { agentName: 'Agent 2', agentRole: 'Multimodal Vision & UX Inspector', score: cfg.agent2Score, checks, status: 'complete' };
}

export async function runAgent3Simulation(
  scenario: ScenarioType,
  agent1Score: number,
  agent2Score: number,
  milestoneAmount: number,
  splitRatios: SplitRatio[],
  onUpdate: (checks: AgentCheckItem[], status: 'running' | 'complete') => void
): Promise<{ result: AgentResult; tribunal: TribunalResult }> {
  const cfg = SCENARIOS[scenario];
  const captureAmount = Math.round(milestoneAmount * cfg.capturePercent * 100) / 100;
  const holdAmount = milestoneAmount - captureAmount;

  const checks: AgentCheckItem[] = [
    { label: 'Synthesizing Agent 1 & Agent 2 confidence scores', status: 'pending' },
    { label: `Verifying PayPal Authorization AUTH-9XK284710L validity`, status: 'pending' },
    { label: 'Calculating expiration window (26 days remaining)', status: 'pending' },
    { label: `Computing weighted tribunal score (A1×0.6 + A2×0.4)`, status: 'pending' },
    { label: `Determining settlement: ${cfg.capturePercent < 1 ? 'Partial' : 'Full'} capture`, status: 'pending' },
    { label: `Structuring split payout for ${splitRatios.length} team members`, status: 'pending' },
    { label: 'Generating cryptographic proof-of-delivery certificate', status: 'pending' },
  ];

  for (let i = 0; i < checks.length; i++) {
    checks[i] = { ...checks[i], status: 'running' };
    onUpdate([...checks], 'running');
    await delay(500 + Math.random() * 600);

    const details = [
      `Agent 1: ${agent1Score}/100 (weight: 60%) | Agent 2: ${agent2Score}/100 (weight: 40%)`,
      'AUTH-9XK284710L → ACTIVE | remaining: $3,000.00 | expires: 2026-12-05',
      'Authorization valid — 26 days remaining (3-day buffer applied)',
      `Tribunal score: ${cfg.overallScore}/100 — ${cfg.status}`,
      captureAmount > 0
        ? `Initiating POST /v2/payments/authorizations/.../capture — $${captureAmount.toFixed(2)} (final_capture: ${cfg.capturePercent === 1 ? 'false' : 'false'})`
        : 'No capture — returning CHANGES_REQUESTED with remediation checklist',
      captureAmount > 0
        ? `Batch payout: ${splitRatios.map((s) => `$${(captureAmount * s.percentage / 100).toFixed(2)} → ${s.role}`).join(' | ')}`
        : 'Payout skipped — funds remain locked in escrow',
      `SHA-256 certificate generated — hash: ${generateHash().slice(0, 16)}...`,
    ];

    checks[i] = { ...checks[i], status: scenario === 'C' && i === 4 ? 'fail' : 'pass', detail: details[i] };
    onUpdate([...checks], 'running');
  }

  onUpdate([...checks], 'complete');

  const computedSplits: SplitRatio[] = splitRatios.map((s) => ({
    ...s,
    amount: Math.round(captureAmount * s.percentage) / 100,
  }));

  const tribunal: TribunalResult = {
    overallScore: cfg.overallScore,
    status: cfg.status,
    captureAmount,
    holdAmount,
    splitPayouts: computedSplits,
    certificate: captureAmount > 0
      ? {
          milestoneId: 'm2',
          milestoneTitle: 'Core Payment Webhooks & Cart UI',
          deliverableHash: generateHash(),
          commitHash: generateHash().slice(0, 40),
          timestamp: new Date().toISOString(),
          agent1Score,
          agent2Score,
          agent3Score: cfg.overallScore,
          overallScore: cfg.overallScore,
          status: cfg.status,
          orderId: 'ORDER-7KD192830P',
          authorizationId: 'AUTH-9XK284710L',
          captureId: generateId('CAP'),
          batchPayoutId: generateId('BATCH'),
          passedChecks: [
            'Repository compiled cleanly without errors',
            'All CI/CD pipelines passed successfully',
            'PayPal SDK integration verified in checkout route',
            'Responsive layout confirmed across viewports',
          ],
        }
      : null,
  };

  return {
    result: { agentName: 'Agent 3', agentRole: 'Financial & Escrow Risk Arbiter', score: cfg.overallScore, checks, status: 'complete' },
    tribunal,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

