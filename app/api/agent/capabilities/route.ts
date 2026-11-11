import { NextResponse } from 'next/server';

export function buildAgentManifest() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
  return {
    schemaVersion: '1.0',
    name: 'Lancer AI Autonomous Arbitration Tribunal',
    description:
      'Autonomous milestone-based escrow, 3-agent code & multimodal UX verification, and PayPal Partial Capture + Batch Split Payout orchestration.',
    url: baseUrl,
    provider: {
      organization: 'Lancer AI',
      track: 'PayPal + AI Hackathon 2026',
    },
    capabilities: {
      streaming: false,
      pushNotifications: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      paypalApis: [
        'Orders v2 (AUTHORIZE)',
        'Authorizations v2 (Partial Capture)',
        'Payouts v1 (Batch Split Disbursement)',
        'Invoicing v2',
        'Disputes v1 (Automated Proof-of-Delivery)',
        'Webhooks v1',
      ],
      aiAgents: [
        { id: 'agent-1', name: 'Spec & Code Auditor', weight: 0.6 },
        { id: 'agent-2', name: 'Multimodal Vision & UX Inspector', weight: 0.4 },
        { id: 'agent-3', name: 'Financial & Escrow Risk Arbiter', role: 'consensus_settlement' },
      ],
    },
    skills: [
      {
        id: 'generate_escrow_contract',
        name: 'AI Contract Architect',
        endpoint: `${baseUrl}/api/agent/generate-contract`,
        method: 'POST',
      },
      {
        id: 'verify_milestone_deliverable',
        name: '3-Agent Deliverable Audit & SHA-256 Certification',
        endpoint: `${baseUrl}/api/agent/verify-milestone`,
        method: 'POST',
      },
      {
        id: 'execute_partial_capture_and_payout',
        name: 'PayPal Partial Capture & Micro-Agency Batch Payout',
        endpoint: `${baseUrl}/api/paypal/capture-and-payout`,
        method: 'POST',
      },
    ],
  };
}

export async function GET() {
  return NextResponse.json(buildAgentManifest());
}

