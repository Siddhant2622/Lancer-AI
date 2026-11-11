'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  DollarSign,
  ExternalLink,
  FileCheck2,
  GitPullRequest,
  Globe,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import PayPalButton from '@/components/dashboard/PayPalButton';
import CertificateModal from '@/components/dashboard/CertificateModal';
import FinancialLedger from '@/components/dashboard/FinancialLedger';
import { AnimatedNumber, ScoreRing } from '@/components/ui/MotionPrimitives';
import {
  AgentResult,
  Contract,
  DeliveryCertificate,
  EvaluationStatus,
  LedgerEntry,
  Milestone,
  SplitRatio,
  SupportedCurrency,
} from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

type WorkspaceStage = 1 | 2 | 3 | 4;

interface DraftMilestone {
  localId: string;
  title: string;
  description: string;
  amount: number;
  criteria: string[];
}

interface DraftRecipient {
  localId: string;
  recipientName: string;
  recipientEmail: string;
  role: string;
  percentage: number;
}

interface HealthSummary {
  gemini?: { connected?: boolean; model?: string };
  paypal?: { connected?: boolean };
  supabase?: { connected?: boolean; bucket?: string };
}

interface VerificationResponse {
  success: boolean;
  error?: string;
  contractId: string;
  milestoneId: string;
  status: EvaluationStatus;
  confidenceScore: number;
  poweredBy: 'gemini_live' | 'deterministic_fallback';
  modelUsed?: string;
  snapshotUrl?: string;
  prTelemetry?: {
    source: string;
    prUrl: string;
    repo?: string;
    prNumber?: number;
    title?: string;
    state?: string;
    merged?: boolean;
    additions: number;
    deletions: number;
    changedFiles: number;
    commitSha: string;
    secretScanPassed: boolean;
    filesPreview: string[];
  };
  stagingTelemetry?: {
    source: string;
    url: string;
    reachable: boolean;
    statusCode?: number;
    latencyMs?: number;
    title?: string;
    hasViewportMeta: boolean;
    hasPayPalSdk: boolean;
  };
  agent1: AgentResult;
  agent2: AgentResult;
  agent3: AgentResult;
  captureAmount: number;
  holdAmount: number;
  splitPayouts: SplitRatio[];
  passedChecks: string[];
  discrepancies: string[];
  certificate: DeliveryCertificate | null;
}

interface PayPalAuthInspection {
  success: boolean;
  simulated?: boolean;
  apiMode?: string;
  authorizationId?: string;
  status?: string;
  amount?: { currency_code?: string; value?: string } | null;
  expirationTime?: string | null;
  error?: string;
}

function makeDefaultMilestones(): DraftMilestone[] {
  return [
    {
      localId: 'draft-m1',
      title: 'Architecture, Auth & API Core',
      description: 'Initialize repository, database schema, CI pipeline, and core API endpoints.',
      amount: 1200,
      criteria: [
        'Repository builds cleanly with strict TypeScript & lint rules',
        'Core authentication and API routes documented and tested',
        'Live staging deployment reachable with valid HTTP 200',
      ],
    },
    {
      localId: 'draft-m2',
      title: 'Frontend UI & End-to-End Integration',
      description: 'Deliver responsive frontend UI, payment/escrow hooks, and verification suite.',
      amount: 1800,
      criteria: [
        'Responsive UI implemented matching design requirements',
        'Automated test suite passing with zero failing assertions',
        'Production preview deployed on public HTTPS URL',
      ],
    },
  ];
}

function makeDefaultRecipients(): DraftRecipient[] {
  return [
    {
      localId: 'rec-1',
      recipientName: 'Lead Developer',
      recipientEmail: 'sb-freelancer1@business.example.com',
      role: 'Full-Stack Engineer',
      percentage: 70,
    },
    {
      localId: 'rec-2',
      recipientName: 'Product Designer',
      recipientEmail: 'sb-designer2@business.example.com',
      role: 'UI/UX Architect',
      percentage: 30,
    },
  ];
}

function deriveInitialStage(contract: Contract | null): WorkspaceStage {
  if (!contract) return 1;
  if (contract.status === 'draft' || !contract.authorizationId) return 2;
  const active =
    contract.milestones.find((m) => m.status === 'in_audit' || m.status === 'rejected') ||
    contract.milestones[contract.milestones.length - 1];
  if (active && (active.status === 'disbursed' || active.status === 'partial_settlement')) {
    return 4;
  }
  return 3;
}

function pickActiveMilestoneId(contract: Contract | null): string {
  if (!contract || contract.milestones.length === 0) return 'm1';
  const candidate =
    contract.milestones.find((m) => m.status === 'in_audit' || m.status === 'rejected') ||
    contract.milestones.find((m) => m.status === 'locked') ||
    contract.milestones[contract.milestones.length - 1];
  return candidate.id;
}

export default function LiveWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryContractId = searchParams.get('contractId') || '';

  // Navigation & system telemetry
  const [stage, setStage] = useState<WorkspaceStage>(1);
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loadingContract, setLoadingContract] = useState<boolean>(Boolean(queryContractId));
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Stage 1: Real Project & Squad Builder state
  const [projectTitle, setProjectTitle] = useState('Production Web App & Checkout Integration');
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [clientName, setClientName] = useState('Acme Ventures');
  const [clientEmail, setClientEmail] = useState('client@acmeventures.com');
  const [agencyName, setAgencyName] = useState('Builder Collective');
  const [aiBriefPrompt, setAiBriefPrompt] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftSource, setAiDraftSource] = useState<string | null>(null);
  const [draftRecipients, setDraftRecipients] = useState<DraftRecipient[]>(makeDefaultRecipients);
  const [draftMilestones, setDraftMilestones] = useState<DraftMilestone[]>(makeDefaultMilestones);
  const [creatingContract, setCreatingContract] = useState(false);

  // Stage 2: PayPal Authorization & Direct Link Fallback state
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; approveUrl: string } | null>(
    null
  );
  const [creatingOrderLink, setCreatingOrderLink] = useState(false);
  const [completingOrderAuth, setCompletingOrderAuth] = useState(false);
  const [authInspection, setAuthInspection] = useState<PayPalAuthInspection | null>(null);
  const [inspectingAuth, setInspectingAuth] = useState(false);
  const [paypalDiagnostic, setPaypalDiagnostic] = useState<string | null>(null);

  // Stage 3: Deliverable Execution & Submission state
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('m1');
  const [selfChecks, setSelfChecks] = useState<Record<string, boolean>>({});
  const [githubPR, setGithubPR] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | undefined>(undefined);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [verifyingWork, setVerifyingWork] = useState(false);
  const [auditStepLabel, setAuditStepLabel] = useState('');

  // Stage 4: Verification Result, Capture, Override & Certificate state
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [releasingFunds, setReleasingFunds] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{
    apiMode: string;
    captureId: string;
    batchPayoutId: string;
    diagnostic?: string;
    amount: number;
  } | null>(null);
  const [manualOverrideConfirmed, setManualOverrideConfirmed] = useState(false);
  const [mediationSigned, setMediationSigned] = useState({ client: false, freelancer: false });
  const [showCertModal, setShowCertModal] = useState(false);

  const loadContractDetail = async (id: string) => {
    setGlobalError(null);
    setLoadingContract(true);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to load contract ${id}`);
      }
      const loaded: Contract = data.contract;
      setActiveContract(loaded);
      setLedger(data.ledger || []);
      const mId = pickActiveMilestoneId(loaded);
      setSelectedMilestoneId(mId);
      const m = loaded.milestones.find((item) => item.id === mId);
      if (m) {
        setGithubPR(m.githubPR || '');
        setStagingUrl(m.stagingUrl || '');
        setFigmaUrl(m.figmaUrl || '');
      }
      setStage(deriveInitialStage(loaded));
      setVerification(null);
      setReleaseResult(null);
      setAuthInspection(null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to load contract');
    } finally {
      setLoadingContract(false);
    }
  };

  const refreshActiveContract = async (id: string): Promise<Contract | null> => {
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveContract(data.contract);
        setLedger(data.ledger || []);
        return data.contract as Contract;
      }
    } catch {
      // ignore transient error
    }
    return null;
  };

  useEffect(() => {
    let active = true;

    fetch('/api/contracts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (active && data.contracts) setContractsList(data.contracts);
      })
      .catch(() => {});

    fetch('/api/system/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.services) setHealth(data.services);
      })
      .catch(() => {});

    if (queryContractId) {
      fetch(`/api/contracts/${encodeURIComponent(queryContractId)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (!active) return;
          if (data.success && data.contract) {
            const loaded: Contract = data.contract;
            setActiveContract(loaded);
            setLedger(data.ledger || []);
            const mId = pickActiveMilestoneId(loaded);
            setSelectedMilestoneId(mId);
            const m = loaded.milestones.find((item) => item.id === mId);
            if (m) {
              setGithubPR(m.githubPR || '');
              setStagingUrl(m.stagingUrl || '');
              setFigmaUrl(m.figmaUrl || '');
            }
            setStage(deriveInitialStage(loaded));
          } else {
            setGlobalError(data.error || `Contract ${queryContractId} not found.`);
          }
          setLoadingContract(false);
        })
        .catch(() => {
          if (active) setLoadingContract(false);
        });
    }

    return () => {
      active = false;
    };
  }, [queryContractId]);

  const splitSum = useMemo(
    () => draftRecipients.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0),
    [draftRecipients]
  );

  const draftTotalBudget = useMemo(
    () => draftMilestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
    [draftMilestones]
  );

  const isSplitValid =
    draftRecipients.length > 0 &&
    Math.abs(splitSum - 100) < 0.01 &&
    draftRecipients.every((r) => Number(r.percentage) >= 0 && r.recipientEmail.includes('@'));

  const activeMilestone: Milestone | null = useMemo(() => {
    if (!activeContract) return null;
    return (
      activeContract.milestones.find((m) => m.id === selectedMilestoneId) ||
      activeContract.milestones[0] ||
      null
    );
  }, [activeContract, selectedMilestoneId]);

  const nextLockedMilestone: Milestone | null = useMemo(() => {
    if (!activeContract || !activeMilestone) return null;
    const idx = activeContract.milestones.findIndex((m) => m.id === activeMilestone.id);
    if (idx < 0 || idx + 1 >= activeContract.milestones.length) return null;
    return activeContract.milestones[idx + 1];
  }, [activeContract, activeMilestone]);

  const allMilestonesSettled = useMemo(() => {
    if (!activeContract || activeContract.milestones.length === 0) return false;
    return activeContract.milestones.every(
      (m) => m.status === 'disbursed' || m.status === 'partial_settlement'
    );
  }, [activeContract]);

  const handleStartNewProject = () => {
    setActiveContract(null);
    setLedger([]);
    setVerification(null);
    setReleaseResult(null);
    setPendingOrder(null);
    setAuthInspection(null);
    setGlobalError(null);
    setStage(1);
    router.replace('/workspace');
  };

  const handleSelectExistingContract = async (id: string) => {
    if (!id) {
      handleStartNewProject();
      return;
    }
    router.replace(`/workspace?contractId=${encodeURIComponent(id)}`);
    await loadContractDetail(id);
  };

  // Stage 1 actions
  const handleAutoBalanceSplits = () => {
    if (draftRecipients.length === 0) return;
    const even = Math.floor(100 / draftRecipients.length);
    const remainder = 100 - even * draftRecipients.length;
    setDraftRecipients((prev) =>
      prev.map((r, idx) => ({
        ...r,
        percentage: idx === 0 ? even + remainder : even,
      }))
    );
  };

  const handleAiGenerateMilestones = async () => {
    if (!aiBriefPrompt.trim()) {
      setGlobalError('Enter a project brief or scope first to generate milestones with Gemini AI.');
      return;
    }
    setGlobalError(null);
    setAiDrafting(true);
    try {
      const res = await fetch('/api/agent/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiBriefPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI contract generation failed');
      }
      if (data.contractTitle) setProjectTitle(data.contractTitle);
      if (Array.isArray(data.milestones) && data.milestones.length > 0) {
        setDraftMilestones(
          data.milestones.map(
            (
              m: { title: string; description?: string; amount: number; criteria?: string[] },
              idx: number
            ) => ({
              localId: `ai-m${idx + 1}-${Date.now()}`,
              title: m.title,
              description: m.description || m.title,
              amount: Number(m.amount) || 500,
              criteria: Array.isArray(m.criteria) && m.criteria.length > 0 ? m.criteria : ['Deliverable meets agreed scope'],
            })
          )
        );
      }
      setAiDraftSource(data.poweredBy || 'gemini_live');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to generate AI plan');
    } finally {
      setAiDrafting(false);
    }
  };

  const handleCreateRealContract = async () => {
    setGlobalError(null);
    if (!projectTitle.trim()) {
      setGlobalError('Project title is required.');
      return;
    }
    if (!isSplitValid) {
      setGlobalError('Squad payment split percentages must total 100% with valid emails.');
      return;
    }
    if (draftMilestones.length === 0 || draftMilestones.some((m) => !m.title.trim() || m.amount <= 0)) {
      setGlobalError('Every milestone requires a title and positive budget amount.');
      return;
    }

    setCreatingContract(true);
    try {
      const squadSplits = draftRecipients.map((r) => ({
        recipientName: r.recipientName.trim() || 'Contributor',
        recipientEmail: r.recipientEmail.trim(),
        role: r.role.trim() || 'Contractor',
        percentage: Number(r.percentage),
        amount: 0,
      }));

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'real',
          title: projectTitle.trim(),
          currency,
          clientName: clientName.trim() || 'Client',
          clientEmail: clientEmail.trim() || 'client@example.com',
          freelancerName: agencyName.trim() || draftRecipients[0]?.recipientName || 'Contractor',
          freelancerEmail: draftRecipients[0]?.recipientEmail.trim() || 'freelancer@example.com',
          squadSplits,
          milestones: draftMilestones.map((m) => ({
            title: m.title.trim(),
            description: m.description.trim() || m.title.trim(),
            amount: Number(m.amount),
            acceptanceCriteria: m.criteria.map((c) => c.trim()).filter(Boolean),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save contract');
      }
      const created: Contract = data.contract;
      setActiveContract(created);
      setContractsList((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setSelectedMilestoneId(created.milestones[0]?.id || 'm1');
      setGithubPR('');
      setStagingUrl('');
      setFigmaUrl('');
      setNotes('');
      setScreenshotBase64(undefined);
      setScreenshotName('');
      router.replace(`/workspace?contractId=${encodeURIComponent(created.id)}`);
      await refreshActiveContract(created.id);
      setStage(2);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Contract creation failed');
    } finally {
      setCreatingContract(false);
    }
  };

  // Stage 2 actions: PayPal Authorization
  const handlePayPalAuthorized = async (info: {
    orderId: string;
    authorizationId: string;
    apiMode: string;
  }) => {
    if (!activeContract) return;
    setPaypalDiagnostic(null);

    // Refresh contract after /api/paypal/authorize-order persisted status='authorized'
    const updated = await refreshActiveContract(activeContract.id);
    if (updated && updated.milestones.length > 0 && updated.milestones[0].status === 'locked') {
      const unlocked = structuredClone(updated);
      unlocked.milestones[0].status = 'in_audit';
      unlocked.auditAmount = unlocked.milestones[0].amount;
      unlocked.lockedAmount = Math.max(0, unlocked.totalAmount - unlocked.auditAmount);

      const patchRes = await fetch(`/api/contracts/${encodeURIComponent(updated.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: unlocked }),
      });
      const patchData = await patchRes.json();
      if (patchRes.ok && patchData.contract) {
        setActiveContract(patchData.contract);
      } else {
        setActiveContract(unlocked);
      }
    }

    setPendingOrder(null);
    if (info.authorizationId && !info.authorizationId.startsWith('AUTH-')) {
      handleInspectPayPalAuthorization(info.authorizationId);
    }
  };

  const handleCreateDirectPayPalLink = async () => {
    if (!activeContract) return;
    setGlobalError(null);
    setPaypalDiagnostic(null);
    setCreatingOrderLink(true);
    try {
      const res = await fetch('/api/paypal/create-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContract.id,
          amount: activeContract.totalAmount,
          currency: activeContract.currency || 'USD',
          description: activeContract.title,
          milestones: activeContract.milestones.map((m) => ({ title: m.title, amount: m.amount })),
          simulate: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create PayPal order');
      }
      const approveLink =
        Array.isArray(data.links) &&
        (data.links.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href ||
          data.links.find((l: { rel: string; href: string }) => l.rel === 'payer-action')?.href);
      setPendingOrder({
        orderId: data.orderId,
        approveUrl: approveLink || '',
      });
      if (data.diagnostic) setPaypalDiagnostic(data.diagnostic);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to create PayPal order');
    } finally {
      setCreatingOrderLink(false);
    }
  };

  const handleCompletePendingOrderAuth = async () => {
    if (!activeContract || !pendingOrder?.orderId) return;
    setGlobalError(null);
    setCompletingOrderAuth(true);
    try {
      const res = await fetch('/api/paypal/authorize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingOrder.orderId,
          contractId: activeContract.id,
          amount: activeContract.totalAmount,
          simulate: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authorization failed');
      }
      if (data.diagnostic) {
        setPaypalDiagnostic(data.diagnostic);
      }
      await handlePayPalAuthorized({
        orderId: data.orderId,
        authorizationId: data.authorizationId,
        apiMode: data.apiMode,
      });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to authorize PayPal order');
    } finally {
      setCompletingOrderAuth(false);
    }
  };

  const handleInspectPayPalAuthorization = async (authIdOverride?: string) => {
    const id = authIdOverride || activeContract?.authorizationId || '';
    if (!id) return;
    setInspectingAuth(true);
    try {
      const res = await fetch(`/api/paypal/authorization/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      const data: PayPalAuthInspection = await res.json();
      setAuthInspection(data);
    } catch (err) {
      setAuthInspection({
        success: false,
        error: err instanceof Error ? err.message : 'Inspection request failed',
      });
    } finally {
      setInspectingAuth(false);
    }
  };

  // Stage 3 actions: Screenshot upload & Live AI Verification (no scenarioOverride)
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshotBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMilestone = (m: Milestone) => {
    setSelectedMilestoneId(m.id);
    setGithubPR(m.githubPR || '');
    setStagingUrl(m.stagingUrl || '');
    setFigmaUrl(m.figmaUrl || '');
    setVerification(null);
    setReleaseResult(null);
    setManualOverrideConfirmed(false);
    setMediationSigned({ client: false, freelancer: false });
  };

  const handleSubmitAndVerifyWork = async () => {
    if (!activeContract || !activeMilestone) return;
    if (!activeContract.authorizationId || activeContract.status === 'draft') {
      setGlobalError('Authorize escrow funds in Stage 2 before submitting a milestone deliverable.');
      return;
    }
    if (!githubPR.trim() && !stagingUrl.trim() && !notes.trim() && !screenshotBase64) {
      setGlobalError('Provide at least a GitHub PR URL, live Staging URL, screenshot, or detailed delivery notes.');
      return;
    }

    setGlobalError(null);
    setVerifyingWork(true);
    setVerification(null);
    setReleaseResult(null);
    setManualOverrideConfirmed(false);
    setMediationSigned({ client: false, freelancer: false });

    const steps = [
      'Inspecting GitHub PR telemetry & HTTP staging deployment...',
      screenshotBase64
        ? 'Uploading UI snapshot to Supabase Storage & invoking Gemini Vision...'
        : 'Auditing acceptance criteria with 3-Agent Gemini 2.5 Flash Tribunal...',
      'Computing payout split ratios & generating SHA-256 evidence...',
    ];
    setAuditStepLabel(steps[0]);
    const t1 = setTimeout(() => setAuditStepLabel(steps[1]), 1400);
    const t2 = setTimeout(() => setAuditStepLabel(steps[2]), 3000);

    try {
      const res = await fetch('/api/agent/verify-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContract.id,
          milestoneId: activeMilestone.id,
          milestoneTitle: activeMilestone.title,
          milestoneAmount: activeMilestone.amount,
          criteria: activeMilestone.acceptanceCriteria,
          submissionEvidence: {
            githubPR: githubPR.trim() || undefined,
            stagingUrl: stagingUrl.trim() || undefined,
            figmaUrl: figmaUrl.trim() || undefined,
            notes: notes.trim() || undefined,
            screenshotBase64,
          },
        }),
      });
      const data: VerificationResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Milestone verification failed');
      }

      setVerification(data);
      await refreshActiveContract(activeContract.id);
      setStage(4);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Verification request failed');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setVerifyingWork(false);
      setAuditStepLabel('');
    }
  };

  // Stage 4 actions: Real Capture & Payout, Manual Override, Next Milestone
  const handleReleasePayment = async (opts: {
    amount: number;
    holdAmount: number;
    verdictLabel: string;
    splits: SplitRatio[];
    score: number;
  }) => {
    if (!activeContract || !activeMilestone) return;
    setGlobalError(null);
    setReleasingFunds(true);
    try {
      const res = await fetch('/api/paypal/capture-and-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: activeContract.id,
          authorizationId: activeContract.authorizationId,
          milestoneId: activeMilestone.id,
          milestoneTitle: activeMilestone.title,
          amount: opts.amount,
          holdAmount: opts.holdAmount,
          currency: activeContract.currency || 'USD',
          recipients: opts.splits.map((s) => ({
            ...s,
            amount: Math.round(opts.amount * (s.percentage / 100) * 100) / 100,
          })),
          aiConfidenceScore: opts.score,
          tribunalVerdict: opts.verdictLabel,
          simulate: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Capture & split payout failed');
      }

      setReleaseResult({
        apiMode: data.apiMode,
        captureId: data.captureId,
        batchPayoutId: data.batchPayoutId,
        diagnostic: data.diagnostic,
        amount: opts.amount,
      });

      if (data.contract) setActiveContract(data.contract);
      if (data.ledger) setLedger(data.ledger);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Escrow release failed');
    } finally {
      setReleasingFunds(false);
    }
  };

  const handleAdvanceToNextMilestone = () => {
    if (!nextLockedMilestone) return;
    handleSelectMilestone(nextLockedMilestone);
    setStage(3);
  };

  const activeCurrency = activeContract?.currency || currency;

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-900 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0070BA] to-violet-600 flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">Lancer AI</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real Execution Workspace
            </span>
          </div>

          {/* Contract Switcher + Nav Links */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Load Existing Contract"
              value={activeContract?.id || ''}
              onChange={(e) => handleSelectExistingContract(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:border-[#0070BA]"
            >
              <option value="">+ Create New Real Project</option>
              {contractsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.title.slice(0, 34)} ({c.status})
                </option>
              ))}
            </select>

            <button
              onClick={handleStartNewProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Contract
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#0070BA]" /> Portfolio
            </Link>

            {activeContract && (
              <Link
                href={`/dashboard/contract/${activeContract.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0070BA]/10 hover:bg-[#0070BA]/15 border border-[#0070BA]/25 text-xs font-semibold text-[#0070BA] transition-colors"
              >
                <Layers className="w-3.5 h-3.5" /> Command View
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Live Stack Health & Context Banner */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              End-to-End Real Escrow Execution
              {activeContract && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#0070BA]">
                  {activeContract.id}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Create a real contract, lock real funds via PayPal Orders v2 (AUTHORIZE), deliver real code & screenshots,
              and settle milestones live via PayPal Partial Capture & Payouts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                health?.gemini?.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              )}
            >
              <Cpu className="w-3.5 h-3.5" />
              Gemini: {health?.gemini?.model || 'Checking...'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                health?.paypal?.connected
                  ? 'bg-blue-50 border-blue-200 text-[#0070BA]'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              )}
            >
              <Wallet className="w-3.5 h-3.5" />
              PayPal Sandbox: {health?.paypal?.connected ? 'Connected' : 'Checking...'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                health?.supabase?.connected
                  ? 'bg-violet-50 border-violet-200 text-violet-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Supabase Vault: {health?.supabase?.connected ? 'Ready' : 'Checking...'}
            </span>
          </div>
        </div>

        {/* 4-Stage Stepper Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { num: 1 as WorkspaceStage, title: '1. Project & Squad', sub: 'Terms, Milestones & Splits', icon: ClipboardCheck },
            { num: 2 as WorkspaceStage, title: '2. PayPal Escrow Lock', sub: 'Orders v2 AUTHORIZE', icon: Lock },
            { num: 3 as WorkspaceStage, title: '3. Deliver & Audit', sub: 'GitHub PR, Staging, Vision', icon: Upload },
            { num: 4 as WorkspaceStage, title: '4. Verdict & Payout', sub: 'Capture, Split & Proof', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = stage === item.num;
            const canOpen =
              item.num === 1 ||
              (item.num === 2 && Boolean(activeContract)) ||
              (item.num === 3 && Boolean(activeContract)) ||
              (item.num === 4 && Boolean(activeContract && (verification || releaseResult)));

            return (
              <button
                key={item.num}
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && setStage(item.num)}
                className={cn(
                  'text-left rounded-xl p-3.5 border transition-all flex items-center gap-3',
                  isCurrent
                    ? 'bg-white border-[#0070BA] shadow-md ring-2 ring-[#0070BA]/15 cursor-pointer'
                    : canOpen
                      ? 'bg-white/75 border-slate-200 hover:border-slate-300 cursor-pointer'
                      : 'bg-slate-100/70 border-slate-200/70 opacity-60 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    isCurrent
                      ? 'bg-[#0070BA] text-white'
                      : canOpen
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-200 text-slate-400'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{item.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {globalError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start justify-between gap-3 text-xs text-red-700">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-red-500 hover:text-red-800 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Contract Summary Bar when loaded */}
        {activeContract && (
          <div className="glass-panel rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contract</div>
              <div className="text-xs font-bold text-slate-900 truncate mt-0.5">{activeContract.title}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {activeContract.clientName} → {activeContract.freelancerName}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escrow Status</div>
              <div className="mt-1">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border',
                    activeContract.status === 'authorized' || activeContract.status === 'in_progress'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : activeContract.status === 'completed'
                        ? 'bg-blue-50 border-blue-200 text-[#0070BA]'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                  )}
                >
                  {activeContract.status}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Escrow</div>
              <div className="text-base font-extrabold text-slate-900 tabular-nums mt-0.5">
                <AnimatedNumber
                  value={activeContract.totalAmount}
                  decimals={2}
                  prefix={activeCurrency === 'EUR' ? '€' : activeCurrency === 'GBP' ? '£' : '$'}
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disbursed</div>
              <div className="text-base font-extrabold text-emerald-600 tabular-nums mt-0.5">
                {formatCurrency(activeContract.releasedAmount, activeCurrency)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PayPal Auth ID</div>
              <div className="text-xs font-mono text-slate-700 mt-1 truncate">
                {activeContract.authorizationId || 'Pending Client Lock'}
              </div>
            </div>
          </div>
        )}

        {loadingContract ? (
          <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#0070BA]" />
            <p className="text-xs font-semibold text-slate-600">Loading real contract workspace...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* STAGE 1: REAL PROJECT & SQUAD SETUP */}
            {stage === 1 && (
              <motion.section
                key="stage-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {/* Live AI Project Drafter */}
                <div className="glass-panel rounded-2xl p-5 space-y-3 border border-violet-200/80 bg-gradient-to-br from-white via-white to-violet-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <h2 className="text-sm font-bold text-slate-900">
                        Optional: Auto-Generate Real Milestones with Live Gemini AI
                      </h2>
                    </div>
                    {aiDraftSource && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">
                        {aiDraftSource}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={aiBriefPrompt}
                      onChange={(e) => setAiBriefPrompt(e.target.value)}
                      placeholder="Describe the real project & total budget (e.g., 'Build a Next.js SaaS analytics portal with Stripe & auth for $3,000')"
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleAiGenerateMilestones}
                      disabled={aiDrafting}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {aiDrafting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {aiDrafting ? 'Drafting with Gemini...' : 'Generate Scope & Criteria'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Party & Squad Configuration */}
                  <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0070BA]" />
                      Contract Parties & Squad Splits
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Client Name
                          </label>
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Currency
                          </label>
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Client Email
                          </label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Agency / Team Name
                          </label>
                          <input
                            type="text"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Multi-Recipient PayPal Split Table */}
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">PayPal Payout Recipients</div>
                          <div className="text-[11px] text-slate-500">Must sum to exactly 100%</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-xs font-mono font-bold px-2 py-0.5 rounded-full border',
                              Math.abs(splitSum - 100) < 0.01
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            )}
                          >
                            {splitSum}%
                          </span>
                          {Math.abs(splitSum - 100) >= 0.01 && (
                            <button
                              type="button"
                              onClick={handleAutoBalanceSplits}
                              className="text-[11px] font-semibold text-[#0070BA] hover:underline cursor-pointer"
                            >
                              Auto-100%
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {draftRecipients.map((r, idx) => (
                          <div
                            key={r.localId}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                placeholder="Recipient Name"
                                value={r.recipientName}
                                onChange={(e) =>
                                  setDraftRecipients((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, recipientName: e.target.value } : item
                                    )
                                  )
                                }
                                className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-900"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={r.percentage}
                                  onChange={(e) =>
                                    setDraftRecipients((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, percentage: Number(e.target.value) } : item
                                      )
                                    )
                                  }
                                  className="w-16 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-mono text-right text-slate-900"
                                />
                                <span className="text-xs font-bold text-slate-500">%</span>
                              </div>
                              {draftRecipients.length > 1 && (
                                <button
                                  type="button"
                                  aria-label="Remove recipient"
                                  onClick={() =>
                                    setDraftRecipients((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="email"
                                placeholder="PayPal Email"
                                value={r.recipientEmail}
                                onChange={(e) =>
                                  setDraftRecipients((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, recipientEmail: e.target.value } : item
                                    )
                                  )
                                }
                                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-700"
                              />
                              <input
                                type="text"
                                placeholder="Role"
                                value={r.role}
                                onChange={(e) =>
                                  setDraftRecipients((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, role: e.target.value } : item
                                    )
                                  )
                                }
                                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[11px] text-slate-700"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setDraftRecipients((prev) => [
                            ...prev,
                            {
                              localId: `rec-${Date.now()}`,
                              recipientName: `Team Member ${prev.length + 1}`,
                              recipientEmail: `sb-member${prev.length + 1}@business.example.com`,
                              role: 'Specialist',
                              percentage: 0,
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0070BA] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Split Recipient
                      </button>
                    </div>
                  </div>

                  {/* Right: Milestones & Acceptance Criteria Builder */}
                  <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Custom Milestones & Acceptance Criteria
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Each criterion is audited directly by Gemini 2.5 Flash upon submission.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Total Escrow Budget</div>
                        <div className="text-lg font-extrabold text-[#0070BA] tabular-nums">
                          {formatCurrency(draftTotalBudget, currency)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {draftMilestones.map((m, mIdx) => (
                        <div
                          key={m.localId}
                          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#0070BA] text-[11px] font-bold">
                              Milestone {mIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-semibold">Amount ({currency}):</span>
                              <input
                                type="number"
                                min={1}
                                value={m.amount}
                                onChange={(e) =>
                                  setDraftMilestones((prev) =>
                                    prev.map((item, i) =>
                                      i === mIdx ? { ...item, amount: Number(e.target.value) } : item
                                    )
                                  )
                                }
                                className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right text-slate-900"
                              />
                              {draftMilestones.length > 1 && (
                                <button
                                  type="button"
                                  aria-label="Remove milestone"
                                  onClick={() =>
                                    setDraftMilestones((prev) => prev.filter((_, i) => i !== mIdx))
                                  }
                                  className="text-slate-400 hover:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Milestone Title"
                            value={m.title}
                            onChange={(e) =>
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === mIdx ? { ...item, title: e.target.value } : item))
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900"
                          />

                          <input
                            type="text"
                            placeholder="Deliverable description"
                            value={m.description}
                            onChange={(e) =>
                              setDraftMilestones((prev) =>
                                prev.map((item, i) =>
                                  i === mIdx ? { ...item, description: e.target.value } : item
                                )
                              )
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700"
                          />

                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Acceptance Criteria
                            </div>
                            {m.criteria.map((c, cIdx) => (
                              <div key={`${m.localId}-c-${cIdx}`} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={c}
                                  onChange={(e) =>
                                    setDraftMilestones((prev) =>
                                      prev.map((item, i) =>
                                        i === mIdx
                                          ? {
                                              ...item,
                                              criteria: item.criteria.map((oldC, j) =>
                                                j === cIdx ? e.target.value : oldC
                                              ),
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] text-slate-800"
                                />
                                {m.criteria.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraftMilestones((prev) =>
                                        prev.map((item, i) =>
                                          i === mIdx
                                            ? {
                                                ...item,
                                                criteria: item.criteria.filter((_, j) => j !== cIdx),
                                              }
                                            : item
                                        )
                                      )
                                    }
                                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setDraftMilestones((prev) =>
                                  prev.map((item, i) =>
                                    i === mIdx
                                      ? { ...item, criteria: [...item.criteria, 'New testable deliverable criterion'] }
                                      : item
                                  )
                                )
                              }
                              className="text-[11px] font-semibold text-violet-600 hover:underline cursor-pointer"
                            >
                              + Add Criterion
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftMilestones((prev) => [
                            ...prev,
                            {
                              localId: `draft-m-${Date.now()}`,
                              title: `Milestone ${prev.length + 1}: QA & Production Handover`,
                              description: 'Complete final verification and handover.',
                              amount: 500,
                              criteria: ['All production tests passing'],
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateRealContract}
                        disabled={creatingContract || !isSplitValid}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold shadow-md shadow-[#0070BA]/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {creatingContract ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {creatingContract ? 'Saving Real Contract...' : 'Save & Lock Contract Draft'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STAGE 2: REAL PAYPAL ESCROW LOCK (ORDERS v2 AUTHORIZE) */}
            {stage === 2 && activeContract && (
              <motion.section
                key="stage-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0070BA]">
                        <Lock className="w-3.5 h-3.5" /> Client Action — Fund Escrow Vault
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        Authorize {formatCurrency(activeContract.totalAmount, activeCurrency)} via PayPal Orders v2
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Funds are held via PayPal <code className="font-mono text-[#0070BA]">intent: &quot;AUTHORIZE&quot;</code> for up to 29
                        days. Zero money leaves the client until milestones pass verification.
                      </p>
                    </div>
                  </div>

                  {activeContract.authorizationId ? (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        Escrow Vault Authorized & Locked
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                          <span className="text-[10px] text-slate-400 block">PayPal Order ID</span>
                          {activeContract.orderId || '—'}
                        </div>
                        <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                          <span className="text-[10px] text-slate-400 block">Authorization ID</span>
                          {activeContract.authorizationId}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleInspectPayPalAuthorization()}
                          disabled={inspectingAuth}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-emerald-300 text-xs font-semibold text-emerald-800 cursor-pointer"
                        >
                          {inspectingAuth ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Check Live PayPal Authorization Status
                        </button>

                        <button
                          type="button"
                          onClick={() => setStage(3)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                        >
                          Continue to Milestone Execution <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {authInspection && (
                        <div
                          className={cn(
                            'rounded-lg p-3 text-xs border',
                            authInspection.success
                              ? 'bg-white border-emerald-200 text-slate-700'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          )}
                        >
                          {authInspection.success ? (
                            <div className="space-y-1 font-mono text-[11px]">
                              <div className="font-sans font-bold text-emerald-700">
                                Live PayPal Authorizations v2 Status: {authInspection.status}
                              </div>
                              <div>
                                Authorized Amount: {authInspection.amount?.value} {authInspection.amount?.currency_code}
                              </div>
                              {authInspection.expirationTime && (
                                <div>Expires: {new Date(authInspection.expirationTime).toLocaleString()}</div>
                              )}
                            </div>
                          ) : (
                            <div>{authInspection.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Primary Live PayPal JS SDK Buttons */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-800">
                          Option A — In-Page Live PayPal JS SDK Checkout (Recommended)
                        </div>
                        <PayPalButton
                          contractId={activeContract.id}
                          amount={activeContract.totalAmount}
                          currency={activeCurrency}
                          description={activeContract.title}
                          milestones={activeContract.milestones.map((m) => ({
                            title: m.title,
                            amount: m.amount,
                          }))}
                          liveSdkEnabled={true}
                          simulate={false}
                          onAuthorizeSuccess={handlePayPalAuthorized}
                        />
                      </div>

                      {/* Option B: Direct PayPal Sandbox Redirect Link */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              Option B — Direct PayPal Sandbox Approval Link
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Use if browser popup blockers prevent the PayPal JS SDK overlay.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCreateDirectPayPalLink}
                            disabled={creatingOrderLink}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {creatingOrderLink ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5" />
                            )}
                            Create PayPal Order Link
                          </button>
                        </div>

                        {pendingOrder && (
                          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2.5 text-xs">
                            <div className="font-mono text-[11px] text-slate-700">
                              Created Order ID: <strong>{pendingOrder.orderId}</strong>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {pendingOrder.approveUrl && (
                                <a
                                  href={pendingOrder.approveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0070BA] text-white font-semibold hover:bg-[#005ea6]"
                                >
                                  1. Approve in PayPal Sandbox <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={handleCompletePendingOrderAuth}
                                disabled={completingOrderAuth}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {completingOrderAuth ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                2. Authorize Order Funds
                              </button>
                            </div>
                          </div>
                        )}

                        {paypalDiagnostic && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            PayPal Diagnostic: {paypalDiagnostic}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Tranche Breakdown */}
                <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">Escrow Tranche Schedule</h3>
                  <div className="space-y-2.5">
                    {activeContract.milestones.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            M{m.number}: {m.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {m.acceptanceCriteria.length} acceptance criteria
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                          {formatCurrency(m.amount, activeCurrency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {/* STAGE 3: REAL WORK & DELIVERABLE SUBMISSION */}
            {stage === 3 && activeContract && activeMilestone && (
              <motion.section
                key="stage-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                {/* Milestone Selector Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {activeContract.milestones.map((m) => {
                    const isSelected = m.id === activeMilestone.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMilestone(m)}
                        className={cn(
                          'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <span>
                          M{m.number}: {m.title}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded uppercase',
                            m.status === 'disbursed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.status === 'rejected'
                                ? 'bg-red-500/20 text-red-200'
                                : isSelected
                                  ? 'bg-white/15 text-white'
                                  : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {m.status}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {(!activeContract.authorizationId || activeContract.status === 'draft') && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Client escrow funds are not locked yet. Complete Stage 2 PayPal Authorization first.
                    </div>
                    <button
                      type="button"
                      onClick={() => setStage(2)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Go to PayPal Escrow Lock
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Active Milestone Brief + Self-Check Criteria */}
                  <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                        Milestone {activeMilestone.number} Assignment
                      </div>
                      <h2 className="text-base font-bold text-slate-900 mt-0.5">{activeMilestone.title}</h2>
                      <p className="text-xs text-slate-600 mt-1">{activeMilestone.description}</p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Tranche Value</span>
                      <span className="text-base font-extrabold text-slate-900 tabular-nums">
                        {formatCurrency(activeMilestone.amount, activeCurrency)}
                      </span>
                    </div>

                    {/* Acceptance Criteria Interactive Self-Checklist */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Acceptance Criteria Self-Check
                      </div>
                      {activeMilestone.acceptanceCriteria.map((criterion, idx) => {
                        const key = `${activeMilestone.id}-${idx}`;
                        const checked = Boolean(selfChecks[key]);
                        return (
                          <label
                            key={key}
                            className={cn(
                              'flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors',
                              checked
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelfChecks((prev) => ({ ...prev, [key]: e.target.checked }))
                              }
                              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{criterion}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Split Preview */}
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Payout Distribution Upon Pass
                      </div>
                      {activeMilestone.splitRatios.map((s, idx) => (
                        <div
                          key={`${s.recipientEmail}-${idx}`}
                          className="flex items-center justify-between text-xs text-slate-700"
                        >
                          <span>
                            {s.recipientName} <span className="text-slate-400">({s.percentage}%)</span>
                          </span>
                          <span className="font-mono font-bold">
                            {formatCurrency(
                              Math.round(activeMilestone.amount * (s.percentage / 100) * 100) / 100,
                              activeCurrency
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Real Deliverable Evidence Form */}
                  <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0070BA]">
                          Freelancer / Agency Action — Real Evidence Submission
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">
                          Submit Deliverable for Live 3-Agent AI Audit
                        </h3>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                        <GitPullRequest className="w-3.5 h-3.5 text-violet-600" />
                        Public GitHub Pull Request URL
                      </label>
                      <input
                        type="url"
                        value={githubPR}
                        onChange={(e) => setGithubPR(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          Live Staging Deployment URL
                        </label>
                        <input
                          type="url"
                          value={stagingUrl}
                          onChange={(e) => setStagingUrl(e.target.value)}
                          placeholder="https://your-staging-app.vercel.app"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                          <Link2 className="w-3.5 h-3.5 text-[#0070BA]" />
                          Figma / Design File URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                          placeholder="https://figma.com/file/..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Real UI Screenshot Upload (Supabase + Gemini Vision) */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                        <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                        UI / Test Proof Screenshot (Uploaded to Supabase & Audited by Gemini Vision)
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {screenshotName ? `Selected: ${screenshotName}` : 'Upload PNG / JPG / WebP'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleScreenshotUpload}
                            className="hidden"
                          />
                        </label>
                        {screenshotBase64 && (
                          <button
                            type="button"
                            onClick={() => {
                              setScreenshotBase64(undefined);
                              setScreenshotName('');
                            }}
                            className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>
                      {screenshotBase64 && (
                        <div className="mt-2.5 rounded-xl border border-slate-200 p-2 bg-slate-50 inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={screenshotBase64}
                            alt="Uploaded deliverable preview"
                            className="max-h-36 rounded-lg object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Implementation Summary & Verification Notes
                      </label>
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Summarize implemented changes, automated test results, endpoints covered, and any verification instructions for the AI Tribunal..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
                      />
                    </div>

                    {verifyingWork && auditStepLabel && (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-2.5 text-xs text-[#0070BA] font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                        <span>{auditStepLabel}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setStage(2)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Escrow Details
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitAndVerifyWork}
                        disabled={
                          verifyingWork || !activeContract.authorizationId || activeContract.status === 'draft'
                        }
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0070BA] to-violet-600 text-white text-xs font-bold shadow-md shadow-[#0070BA]/20 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                      >
                        {verifyingWork ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        {verifyingWork ? 'Running Live 3-Agent AI Audit...' : 'Submit & Run Live 3-Agent AI Audit'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* STAGE 4: LIVE AI VERDICT, REAL SETTLEMENT, OVERRIDE & LEDGER */}
            {stage === 4 && activeContract && activeMilestone && (
              <motion.section
                key="stage-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {allMilestonesSettled && (
                  <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-blue-50 to-violet-50 border border-emerald-200 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Contract Completed & All Milestones Settled
                        </h3>
                        <p className="text-xs text-slate-600">
                          Total disbursed across squad: {formatCurrency(activeContract.releasedAmount, activeCurrency)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewProject}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Start Another Real Contract
                    </button>
                  </div>
                )}

                {verification && (
                  <div className="glass-panel rounded-2xl p-6 space-y-5">
                    {/* Top Verdict Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div className="flex items-center gap-4">
                        <ScoreRing score={verification.confidenceScore} size={64} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-xs font-extrabold border',
                                verification.status === 'APPROVED' &&
                                  'bg-emerald-50 border-emerald-200 text-emerald-700',
                                verification.status === 'PARTIAL' &&
                                  'bg-amber-50 border-amber-200 text-amber-700',
                                (verification.status === 'CHANGES_REQUESTED' ||
                                  verification.status === 'DISPUTED') &&
                                  'bg-red-50 border-red-200 text-red-700'
                              )}
                            >
                              {verification.status}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                              {verification.poweredBy}
                              {verification.modelUsed ? ` · ${verification.modelUsed}` : ''}
                            </span>
                          </div>
                          <h2 className="text-base font-bold text-slate-900 mt-1">
                            M{activeMilestone.number}: {activeMilestone.title}
                          </h2>
                          <p className="text-xs text-slate-500">
                            Recommended Capture: {formatCurrency(verification.captureAmount, activeCurrency)} · Hold:{' '}
                            {formatCurrency(verification.holdAmount, activeCurrency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {verification.certificate && (
                          <button
                            type="button"
                            onClick={() => setShowCertModal(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer"
                          >
                            <FileCheck2 className="w-4 h-4 text-[#0070BA]" /> View SHA-256 Certificate
                          </button>
                        )}
                        {verification.snapshotUrl && (
                          <a
                            href={verification.snapshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-xs font-bold text-violet-700"
                          >
                            Supabase Visual Proof <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Real Evidence Telemetry Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {verification.prTelemetry && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <GitPullRequest className="w-3.5 h-3.5 text-violet-600" /> GitHub PR Telemetry
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {verification.prTelemetry.source}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600">
                            +{verification.prTelemetry.additions} / -{verification.prTelemetry.deletions} across{' '}
                            {verification.prTelemetry.changedFiles} files · SHA {verification.prTelemetry.commitSha.slice(0, 8)}
                          </div>
                        </div>
                      )}
                      {verification.stagingTelemetry && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-emerald-600" /> Staging HTTP Probe
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                              {verification.stagingTelemetry.source}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-600">
                            HTTP {verification.stagingTelemetry.statusCode || 'N/A'} ·{' '}
                            {verification.stagingTelemetry.latencyMs ? `${verification.stagingTelemetry.latencyMs}ms` : 'N/A'} ·{' '}
                            {verification.stagingTelemetry.reachable ? 'Reachable' : 'Unreachable/Fallback'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3-Agent Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[verification.agent1, verification.agent2, verification.agent3].map((ag) => (
                        <div key={ag.agentName} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900">{ag.agentName}</div>
                              <div className="text-[11px] text-slate-500">{ag.agentRole}</div>
                            </div>
                            <span
                              className={cn(
                                'text-xs font-extrabold font-mono px-2 py-0.5 rounded-md',
                                ag.score >= 90
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : ag.score >= 65
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                              )}
                            >
                              {ag.score}%
                            </span>
                          </div>
                          {ag.summary && <p className="text-[11px] text-slate-600">{ag.summary}</p>}
                          <div className="space-y-1.5 pt-1">
                            {ag.checks.map((chk, idx) => (
                              <div key={`${ag.agentName}-${idx}`} className="flex items-start gap-1.5 text-[11px]">
                                {chk.status === 'pass' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                                )}
                                <span className="text-slate-700">{chk.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Discrepancies */}
                    {verification.discrepancies && verification.discrepancies.length > 0 && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-1.5">
                        <div className="text-xs font-bold text-red-800">AI Detected Discrepancies</div>
                        <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
                          {verification.discrepancies.map((d, idx) => (
                            <li key={idx}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Settlement & Action Controls */}
                    {releaseResult ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            Disbursed {formatCurrency(releaseResult.amount, activeCurrency)} via PayPal Capture & Split Payout
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-700">
                            {releaseResult.apiMode}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                            Capture ID: <strong>{releaseResult.captureId}</strong>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                            Batch Payout ID: <strong>{releaseResult.batchPayoutId}</strong>
                          </div>
                        </div>
                        {releaseResult.diagnostic && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            {releaseResult.diagnostic}
                          </div>
                        )}
                        {nextLockedMilestone && (
                          <button
                            type="button"
                            onClick={handleAdvanceToNextMilestone}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                          >
                            Proceed to Next Milestone (M{nextLockedMilestone.number}: {nextLockedMilestone.title})
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : activeMilestone.status === 'disbursed' ? (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-bold text-emerald-800">
                          This milestone has already been settled on PayPal.
                        </span>
                        {nextLockedMilestone && (
                          <button
                            type="button"
                            onClick={handleAdvanceToNextMilestone}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                          >
                            Work on M{nextLockedMilestone.number} <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-slate-200 pt-4 space-y-4">
                        {/* APPROVED PATH */}
                        {verification.status === 'APPROVED' && (
                          <button
                            type="button"
                            disabled={releasingFunds}
                            onClick={() =>
                              handleReleasePayment({
                                amount: verification.captureAmount,
                                holdAmount: 0,
                                verdictLabel: 'APPROVED',
                                splits: verification.splitPayouts,
                                score: verification.confidenceScore,
                              })
                            }
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                          >
                            {releasingFunds ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <DollarSign className="w-4 h-4" />
                            )}
                            {releasingFunds
                              ? 'Capturing & Disbursing via PayPal...'
                              : `Execute Real PayPal Capture & Split Payout (${formatCurrency(
                                  verification.captureAmount,
                                  activeCurrency
                                )})`}
                          </button>
                        )}

                        {/* PARTIAL DUAL-SIG MEDIATION */}
                        {verification.status === 'PARTIAL' && (
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                            <div className="text-xs font-bold text-amber-900">
                              Partial Settlement Dual-Signature Mediation
                            </div>
                            <p className="text-xs text-amber-800">
                              Both parties can co-sign immediate release of{' '}
                              {formatCurrency(verification.captureAmount, activeCurrency)} while holding{' '}
                              {formatCurrency(verification.holdAmount, activeCurrency)} pending remediation, OR fix
                              discrepancies first.
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-amber-900">
                              <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={mediationSigned.client}
                                  onChange={(e) =>
                                    setMediationSigned((p) => ({ ...p, client: e.target.checked }))
                                  }
                                  className="rounded border-amber-400"
                                />
                                Client Sign-Off ({activeContract.clientName})
                              </label>
                              <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={mediationSigned.freelancer}
                                  onChange={(e) =>
                                    setMediationSigned((p) => ({ ...p, freelancer: e.target.checked }))
                                  }
                                  className="rounded border-amber-400"
                                />
                                Contractor Sign-Off ({activeContract.freelancerName})
                              </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                disabled={
                                  releasingFunds || !(mediationSigned.client && mediationSigned.freelancer)
                                }
                                onClick={() =>
                                  handleReleasePayment({
                                    amount: verification.captureAmount,
                                    holdAmount: verification.holdAmount,
                                    verdictLabel: 'PARTIAL',
                                    splits: verification.splitPayouts,
                                    score: verification.confidenceScore,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                              >
                                {releasingFunds ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                )}
                                Execute Dual-Signed Partial Release
                              </button>
                              <button
                                type="button"
                                onClick={() => setStage(3)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Re-Submit Deliverable Instead
                              </button>
                            </div>
                          </div>
                        )}

                        {/* CHANGES_REQUESTED / DISPUTED + REAL CLIENT MANUAL OVERRIDE */}
                        {verification.status !== 'APPROVED' && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setStage(3)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Fix Issues & Re-Submit Deliverable
                              </button>
                            </div>

                            <div className="border-t border-slate-200 pt-3 space-y-2">
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={manualOverrideConfirmed}
                                  onChange={(e) => setManualOverrideConfirmed(e.target.checked)}
                                  className="rounded border-slate-300"
                                />
                                Client Manual Override: I confirm manual approval to capture and release{' '}
                                {formatCurrency(activeMilestone.amount, activeCurrency)} directly despite AI score (
                                {verification.confidenceScore}%).
                              </label>
                              <button
                                type="button"
                                disabled={!manualOverrideConfirmed || releasingFunds}
                                onClick={() =>
                                  handleReleasePayment({
                                    amount: activeMilestone.amount,
                                    holdAmount: 0,
                                    verdictLabel: 'APPROVED',
                                    splits: activeMilestone.splitRatios,
                                    score: verification.confidenceScore,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs font-bold disabled:opacity-45 cursor-pointer"
                              >
                                {releasingFunds ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                )}
                                Client Manual Override & Release Funds
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Real PayPal Ledger for this Contract */}
                <FinancialLedger entries={ledger} />
              </motion.section>
            )}
          </AnimatePresence>
        )}
      </main>

      {showCertModal && verification?.certificate && (
        <CertificateModal certificate={verification.certificate} onClose={() => setShowCertModal(false)} />
      )}
    </div>
  );
}
