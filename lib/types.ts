// Global Types for Lancer AI

export type Persona = 'client' | 'freelancer' | 'tribunal';

export type MilestoneStatus =
  | 'disbursed'
  | 'in_audit'
  | 'locked'
  | 'partial_settlement'
  | 'rejected';

export type ContractStatus = 'draft' | 'authorized' | 'in_progress' | 'completed';

export type EvaluationStatus = 'APPROVED' | 'CHANGES_REQUESTED' | 'DISPUTED' | 'PARTIAL';

export interface SplitRatio {
  recipientName: string;
  recipientEmail: string;
  role: string;
  percentage: number;
  amount: number;
}

export interface Milestone {
  id: string;
  number: number;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  startDate: string;
  endDate: string;
  dependsOn?: string;
  captureId?: string;
  batchPayoutId?: string;
  authorizationId?: string;
  githubPR?: string;
  stagingUrl?: string;
  figmaUrl?: string;
  splitRatios: SplitRatio[];
  acceptanceCriteria: string[];
  aiScore?: number;
  subMilestone?: SubMilestone;
}

export interface SubMilestone {
  id: string;
  title: string;
  amount: number;
  reason: string;
  mediationSignedBy?: {
    client: boolean;
    freelancer: boolean;
  };
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP';

export interface Contract {
  id: string;
  title: string;
  currency?: SupportedCurrency;
  totalAmount: number;
  releasedAmount: number;
  auditAmount: number;
  lockedAmount: number;
  status: ContractStatus;
  authorizationId: string;
  orderId: string;
  clientName: string;
  clientEmail: string;
  freelancerName: string;
  freelancerEmail: string;
  createdAt: string;
  expiresAt: string;
  milestones: Milestone[];
}

export interface AgentCheckItem {
  label: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  detail?: string;
  score?: number;
}

export interface AgentResult {
  agentName: string;
  agentRole: string;
  score: number;
  checks: AgentCheckItem[];
  status: 'idle' | 'running' | 'complete';
  summary?: string;
}

export interface TribunalResult {
  overallScore: number;
  status: EvaluationStatus;
  captureAmount: number;
  holdAmount: number;
  splitPayouts: SplitRatio[];
  certificate: DeliveryCertificate | null;
  poweredBy?: 'gemini_live' | 'deterministic_fallback';
  modelUsed?: string;
  discrepancies?: string[];
}

export interface DeliveryCertificate {
  milestoneId: string;
  milestoneTitle: string;
  deliverableHash: string;
  commitHash: string;
  timestamp: string;
  agent1Score: number;
  agent2Score: number;
  agent3Score: number;
  overallScore: number;
  status: EvaluationStatus;
  orderId: string;
  authorizationId: string;
  captureId: string;
  batchPayoutId: string;
  passedChecks: string[];
  supabaseProofUrl?: string;
  poweredBy?: string;
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  eventType:
    | 'ORDER_AUTHORIZED'
    | 'PARTIAL_CAPTURE'
    | 'SPLIT_PAYOUT'
    | 'INVOICE_GENERATED'
    | 'AI_EVALUATION'
    | 'DISPUTE_SHIELD';
  milestoneRef: string;
  paypalRefId: string;
  recipientEmail: string;
  grossAmount: number;
  splitPercent?: number;
  aiConfidenceScore?: number;
  status: 'completed' | 'pending' | 'failed';
  apiMode?: 'paypal_live_sandbox' | 'simulated_sandbox';
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}
