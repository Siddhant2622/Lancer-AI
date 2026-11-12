'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Persona,
  AgentResult,
  TribunalResult,
  LedgerEntry,
  Contract,
  AgentCheckItem,
  SplitRatio,
  SupportedCurrency,
} from '@/lib/types';
import {
  ScenarioType,
  runAgent1Simulation,
  runAgent2Simulation,
  runAgent3Simulation,
} from '@/lib/agent-simulator';
import { MOCK_CONTRACT, MOCK_LEDGER } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

import GodModeBar, { ServiceHealthState } from '@/components/dashboard/GodModeBar';
import ContractHeader from '@/components/dashboard/ContractHeader';
import MilestoneGantt from '@/components/dashboard/MilestoneGantt';
import TribunalConsole from '@/components/dashboard/TribunalConsole';
import CertificateModal from '@/components/dashboard/CertificateModal';
import FinancialLedger from '@/components/dashboard/FinancialLedger';
import ContractArchitect from '@/components/dashboard/ContractArchitect';
import DeliverableModal from '@/components/dashboard/DeliverableModal';
import PayPalButton from '@/components/dashboard/PayPalButton';
import { Plus, GitPullRequest, Eye, Sparkles, ShieldAlert, Radio } from 'lucide-react';

interface WebhookLogItem {
  id: string;
  eventType: string;
  receivedAt: string;
  actionTaken: string;
}

function DashboardContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params?.id || 'ESC-8842';

  const [persona, setPersona] = useState<Persona>('client');
  const [demoMode, setDemoMode] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ScenarioType | null>(null);

  // Live service health & custom PayPal override credentials
  const [health, setHealth] = useState<ServiceHealthState | null>(null);
  const [paypalCreds, setPaypalCreds] = useState({ clientId: '', clientSecret: '' });

  // Agent state
  const [agent1, setAgent1] = useState<AgentResult | null>(null);
  const [agent2, setAgent2] = useState<AgentResult | null>(null);
  const [agent3, setAgent3] = useState<AgentResult | null>(null);
  const [tribunal, setTribunal] = useState<TribunalResult | null>(null);

  // Persistent contract, ledger & webhooks state
  const [contract, setContract] = useState<Contract>(MOCK_CONTRACT);
  const [allContracts, setAllContracts] = useState<Contract[]>([MOCK_CONTRACT]);
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('USD');
  const [ledger, setLedger] = useState<LedgerEntry[]>(MOCK_LEDGER);
  const [webhooks, setWebhooks] = useState<WebhookLogItem[]>([]);

  // Modal & toast state
  const [showCertificate, setShowCertificate] = useState(false);
  const [showArchitect, setShowArchitect] = useState(false);
  const [showDeliverable, setShowDeliverable] = useState(false);
  const [deliverableMilestone, setDeliverableMilestone] = useState<{ id: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, tone: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3600);
  }, []);

  const refreshHealth = useCallback(async (override?: { clientId: string; clientSecret: string }) => {
    try {
      const credsToUse = override || paypalCreds;
      const res = await fetch('/api/system/health', {
        method: credsToUse.clientId || credsToUse.clientSecret ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body:
          credsToUse.clientId || credsToUse.clientSecret
            ? JSON.stringify({
                paypalClientId: credsToUse.clientId,
                paypalClientSecret: credsToUse.clientSecret,
              })
            : undefined,
      });
      const data = await res.json();
      if (data.services) {
        setHealth(data.services);
      }
    } catch (err) {
      console.warn('[Health check]', err);
    }
  }, [paypalCreds]);

  const loadContractState = useCallback(async () => {
    try {
      const [singleRes, listRes] = await Promise.all([
        fetch(`/api/contracts/${contractId}`, { cache: 'no-store' }),
        fetch('/api/contracts', { cache: 'no-store' }),
      ]);
      const data = await singleRes.json();
      if (data.success && data.contract) {
        setContract(data.contract);
        if (Array.isArray(data.ledger)) setLedger(data.ledger);
        if (Array.isArray(data.webhooks)) setWebhooks(data.webhooks);
      }
      const listData = await listRes.json();
      if (listData.success && Array.isArray(listData.contracts)) {
        setAllContracts(listData.contracts);
      }
    } catch (err) {
      console.warn('[Load contract]', err);
    }
  }, [contractId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/contracts/${contractId}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/contracts', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/system/health', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([singleData, listData, healthData]) => {
        if (!active) return;
        if (singleData?.success && singleData.contract) {
          setContract(singleData.contract);
          if (Array.isArray(singleData.ledger)) setLedger(singleData.ledger);
          if (Array.isArray(singleData.webhooks)) setWebhooks(singleData.webhooks);
        }
        if (listData?.success && Array.isArray(listData.contracts)) {
          setAllContracts(listData.contracts);
        }
        if (healthData?.services) {
          setHealth(healthData.services);
        }
      })
      .catch((err) => console.warn('[Initial load]', err));

    return () => {
      active = false;
    };
  }, [contractId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCertificate(false);
        setShowArchitect(false);
        setShowDeliverable(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeAuditMilestone =
    contract.milestones.find((m) => m.status === 'in_audit') || contract.milestones[1] || contract.milestones[0];

  // Judge 1-Click Scenario Simulator (also persists through backend APIs & Supabase)
  const handleScenario = useCallback(
    async (scenario: ScenarioType) => {
      if (isRunning) return;

      setIsRunning(true);
      setCurrentScenario(scenario);
      setAgent1(null);
      setAgent2(null);
      setAgent3(null);
      setTribunal(null);

      const targetMilestone =
        contract.milestones.find((m) => m.status === 'in_audit') ||
        contract.milestones[1] ||
        contract.milestones[0];

      // Animate Agent 1
      const a1Result = await runAgent1Simulation(scenario, (checks: AgentCheckItem[], status) => {
        setAgent1({ agentName: 'Agent 1', agentRole: 'Spec & Code Auditor', score: 0, checks, status });
      });
      setAgent1(a1Result);

      // Animate Agent 2
      const a2Result = await runAgent2Simulation(scenario, (checks: AgentCheckItem[], status) => {
        setAgent2({
          agentName: 'Agent 2',
          agentRole: 'Multimodal Vision & UX Inspector',
          score: 0,
          checks,
          status,
        });
      });
      setAgent2(a2Result);

      // Animate Agent 3
      const { result: a3Result, tribunal: simTribunal } = await runAgent3Simulation(
        scenario,
        a1Result.score,
        a2Result.score,
        targetMilestone.amount,
        targetMilestone.splitRatios,
        (checks: AgentCheckItem[], status) => {
          setAgent3({
            agentName: 'Agent 3',
            agentRole: 'Financial & Escrow Risk Arbiter',
            score: 0,
            checks,
            status,
          });
        }
      );
      setAgent3(a3Result);

      // Persist verification & Supabase proof certificate via backend API
      try {
        const verifyRes = await fetch('/api/agent/verify-milestone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: contract.id,
            milestoneId: targetMilestone.id,
            milestoneTitle: targetMilestone.title,
            milestoneAmount: targetMilestone.amount,
            criteria: targetMilestone.acceptanceCriteria,
            scenarioOverride: scenario,
          }),
        });
        const verifyData = await verifyRes.json();

        const finalTribunal: TribunalResult = {
          ...simTribunal,
          certificate: verifyData.certificate || simTribunal.certificate,
        };
        setTribunal(finalTribunal);

        if (verifyData.captureAmount > 0) {
          const capRes = await fetch('/api/paypal/capture-and-payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractId: contract.id,
              authorizationId: contract.authorizationId,
              milestoneId: targetMilestone.id,
              milestoneTitle: targetMilestone.title,
              amount: verifyData.captureAmount,
              holdAmount: verifyData.holdAmount,
              recipients: verifyData.splitPayouts,
              aiConfidenceScore: verifyData.confidenceScore,
              tribunalVerdict: verifyData.status,
              simulate: demoMode,
              paypalClientId: paypalCreds.clientId,
              paypalClientSecret: paypalCreds.clientSecret,
            }),
          });
          const capData = await capRes.json();
          if (capData.contract) setContract(capData.contract);
          if (capData.ledger) setLedger(capData.ledger);
        } else {
          // Scenario C rejection update
          const updatedContract = {
            ...contract,
            milestones: contract.milestones.map((m) =>
              m.id === targetMilestone.id ? { ...m, status: 'rejected' as const, aiScore: 42 } : m
            ),
          };
          setContract(updatedContract);
          await fetch(`/api/contracts/${contract.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contract: updatedContract }),
          });
          await loadContractState();
        }
      } catch (err) {
        console.warn('[Scenario backend sync]', err);
        setTribunal(simTribunal);
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, contract, demoMode, paypalCreds, loadContractState]
  );

  // Live Gemini Deliverable Submission Handler
  const handleDeliverableSubmit = async (data: {
    githubPR: string;
    stagingUrl: string;
    figmaUrl: string;
    notes: string;
    screenshotBase64?: string;
  }) => {
    setShowDeliverable(false);
    if (!deliverableMilestone || isRunning) return;

    const targetMilestone =
      contract.milestones.find((m) => m.id === deliverableMilestone.id) || activeAuditMilestone;

    setIsRunning(true);
    setCurrentScenario('A');
    setAgent1({
      agentName: 'Agent 1',
      agentRole: 'Spec & Code Auditor',
      score: 0,
      status: 'running',
      checks: [
        { label: `Inspecting GitHub PR: ${data.githubPR}`, status: 'running' },
        { label: 'Running Gemini AST & acceptance rubric audit...', status: 'pending' },
      ],
    });
    setAgent2({
      agentName: 'Agent 2',
      agentRole: 'Multimodal Vision & UX Inspector',
      score: 0,
      status: 'running',
      checks: [
        { label: `Probing staging URL: ${data.stagingUrl}`, status: 'running' },
        { label: 'Running Gemini Vision UX comparison...', status: 'pending' },
      ],
    });
    setAgent3({
      agentName: 'Agent 3',
      agentRole: 'Financial & Escrow Risk Arbiter',
      score: 0,
      status: 'running',
      checks: [{ label: 'Awaiting Agent 1 & Agent 2 consensus...', status: 'pending' }],
    });

    try {
      const verifyRes = await fetch('/api/agent/verify-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          milestoneId: targetMilestone.id,
          milestoneTitle: targetMilestone.title,
          milestoneAmount: targetMilestone.amount,
          criteria: targetMilestone.acceptanceCriteria,
          submissionEvidence: data,
        }),
      });
      const vData = await verifyRes.json();

      if (!verifyRes.ok || !vData.success) {
        throw new Error(vData.error || 'AI Verification failed');
      }

      setAgent1({
        agentName: 'Agent 1',
        agentRole: 'Spec & Code Auditor',
        score: vData.agent1.score,
        checks: vData.agent1.checks,
        summary: vData.agent1.summary,
        status: 'complete',
      });
      setAgent2({
        agentName: 'Agent 2',
        agentRole: 'Multimodal Vision & UX Inspector',
        score: vData.agent2.score,
        checks: vData.agent2.checks,
        summary: vData.agent2.summary,
        status: 'complete',
      });
      setAgent3({
        agentName: 'Agent 3',
        agentRole: 'Financial & Escrow Risk Arbiter',
        score: vData.agent3.score,
        checks: vData.agent3.checks,
        summary: vData.agent3.summary,
        status: 'complete',
      });

      setTribunal({
        overallScore: vData.confidenceScore,
        status: vData.status,
        captureAmount: vData.captureAmount,
        holdAmount: vData.holdAmount,
        splitPayouts: vData.splitPayouts,
        certificate: vData.certificate,
        poweredBy: vData.poweredBy,
        modelUsed: vData.modelUsed,
        discrepancies: vData.discrepancies,
      });

      if (vData.captureAmount > 0) {
        const capRes = await fetch('/api/paypal/capture-and-payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: contract.id,
            authorizationId: contract.authorizationId,
            milestoneId: targetMilestone.id,
            milestoneTitle: targetMilestone.title,
            amount: vData.captureAmount,
            holdAmount: vData.holdAmount,
            recipients: vData.splitPayouts,
            aiConfidenceScore: vData.confidenceScore,
            tribunalVerdict: vData.status,
            simulate: demoMode,
            paypalClientId: paypalCreds.clientId,
            paypalClientSecret: paypalCreds.clientSecret,
          }),
        });
        const capData = await capRes.json();
        if (capData.contract) setContract(capData.contract);
        if (capData.ledger) setLedger(capData.ledger);
      } else {
        await loadContractState();
      }
    } catch (err) {
      console.error('[Live deliverable submit]', err);
      showToast('Deliverable audit failed — check network or API status', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    setAgent1(null);
    setAgent2(null);
    setAgent3(null);
    setTribunal(null);
    setCurrentScenario(null);
    setIsRunning(false);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.contract) setContract(data.contract);
      if (data.ledger) setLedger(data.ledger);
      showToast('Contract reset to clean baseline state', 'info');
    } catch {
      setContract(MOCK_CONTRACT);
      setLedger(MOCK_LEDGER);
    }
  };

  const handleSubmitDeliverableClick = (milestoneId: string) => {
    const m = contract.milestones.find((item) => item.id === milestoneId);
    if (m) {
      setDeliverableMilestone({ id: m.id, title: m.title });
      setShowDeliverable(true);
    }
  };

  const handleUpdateSplits = async (milestoneId: string, splitRatios: SplitRatio[]) => {
    const updatedContract: Contract = {
      ...contract,
      milestones: contract.milestones.map((m) =>
        m.id === milestoneId ? { ...m, splitRatios } : m
      ),
    };
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract: updatedContract }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showToast(data.error || 'Failed to save split ratios', 'error');
      return;
    }
    setContract(updatedContract);
    showToast('Micro-agency split ratios updated & persisted', 'success');
  };

  const handleApproveDualMediation = async () => {
    if (!tribunal || tribunal.holdAmount <= 0) return;
    const targetMilestone =
      contract.milestones.find((m) => m.status === 'partial_settlement') || activeAuditMilestone;
    if (!targetMilestone) return;

    const splitRecipients = targetMilestone.splitRatios.map((s) => ({
      ...s,
      amount: Math.round(tribunal.holdAmount * s.percentage) / 100,
    }));

    const capRes = await fetch('/api/paypal/capture-and-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: contract.id,
        authorizationId: contract.authorizationId,
        milestoneId: targetMilestone.id,
        milestoneTitle: `${targetMilestone.title} (Dual-Signature Sub-Milestone Release)`,
        amount: tribunal.holdAmount,
        holdAmount: 0,
        recipients: splitRecipients,
        aiConfidenceScore: 95,
        tribunalVerdict: 'APPROVED',
        simulate: demoMode,
        paypalClientId: paypalCreds.clientId,
        paypalClientSecret: paypalCreds.clientSecret,
      }),
    });
    const capData = await capRes.json();
    if (capData.contract) setContract(capData.contract);
    if (capData.ledger) setLedger(capData.ledger);
    showToast('Dual-signature mediation approved & remaining tranche captured!', 'success');
  };

  const handleTriggerDisputeWebhook = async () => {
    try {
      const res = await fetch('/api/webhooks/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'CUSTOMER.DISPUTE.CREATED',
          contractId: contract.id,
          summary: 'Client disputed milestone capture — testing automatic Dispute Shield',
          resource: {
            dispute_id: `PP-D-${Math.floor(10000 + Math.random() * 90000)}`,
            dispute_amount: { currency_code: 'USD', value: '1000.00' },
          },
        }),
      });
      const data = await res.json();
      await loadContractState();
      if (data.disputeEvidenceSubmitted) {
        showToast('Dispute Shield triggered — SHA-256 evidence submitted to PayPal Disputes API', 'success');
      }
    } catch (err) {
      console.warn('[Dispute webhook trigger]', err);
      showToast('Webhook simulation failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-fintech-grid text-slate-900">
      {/* God Mode Bar */}
      <GodModeBar
        persona={persona}
        onPersonaChange={setPersona}
        onScenario={handleScenario}
        onReset={handleReset}
        demoMode={demoMode}
        onDemoToggle={() => setDemoMode(!demoMode)}
        isRunning={isRunning}
        paypalCreds={paypalCreds}
        onPaypalCredsChange={setPaypalCreds}
        health={health}
        onRefreshHealth={refreshHealth}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-8">
        {/* Contract Header */}
        <ContractHeader
          contract={contract}
          allContracts={allContracts}
          onSelectContract={(id) => router.push(`/dashboard/contract/${id}`)}
          displayCurrency={displayCurrency}
          onCurrencyChange={setDisplayCurrency}
        />

        {/* Action Panel — Context Sensitive */}
        <div className="flex flex-wrap items-center gap-3">
          {persona === 'client' && (
            <PayPalButton
              contractId={contract.id}
              amount={contract.totalAmount}
              description={contract.title}
              milestones={contract.milestones.map((m) => ({ title: m.title, amount: m.amount }))}
              paypalClientId={paypalCreds.clientId || health?.paypal?.clientId}
              paypalClientSecret={paypalCreds.clientSecret}
              liveSdkEnabled={Boolean(health?.paypal?.connected)}
              simulate={demoMode}
              onAuthorizeSuccess={() => {
                loadContractState();
              }}
            />
          )}

          {persona === 'freelancer' && activeAuditMilestone && (
            <button
              onClick={() => handleSubmitDeliverableClick(activeAuditMilestone.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
            >
              <GitPullRequest className="w-4 h-4" />
              Submit Deliverable for M{activeAuditMilestone.number} (Live Gemini Audit)
            </button>
          )}

          {persona === 'tribunal' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
                <Eye className="w-4 h-4" />
                AI Tribunal &amp; PayPal API Inspector Mode
              </div>
              <button
                onClick={handleTriggerDisputeWebhook}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-semibold text-teal-800 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-teal-600" />
                Simulate Dispute Webhook → Test Chargeback Shield
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Link
              href={`/workspace?contractId=${contract.id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              Switch to Real Workspace
            </Link>
            <button
              onClick={() => setShowArchitect(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#0070BA]" />
              New AI Escrow Contract
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            </button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-6">
          {/* Left: Gantt + Tribunal */}
          <div className="space-y-6">
            <MilestoneGantt
              key={contract.id}
              milestones={contract.milestones}
              persona={persona}
              displayCurrency={displayCurrency}
              onSubmitDeliverable={handleSubmitDeliverableClick}
              onUpdateSplits={handleUpdateSplits}
              activeMilestoneId={activeAuditMilestone?.id}
            />

            <TribunalConsole
              key={`${contract.id}-${currentScenario || 'idle'}`}
              agent1={agent1}
              agent2={agent2}
              agent3={agent3}
              tribunal={tribunal}
              isRunning={isRunning}
              scenario={currentScenario}
              onViewCertificate={() => setShowCertificate(true)}
              onApproveDualMediation={handleApproveDualMediation}
            />
          </div>

          {/* Right: API Inspector & Vault Summary */}
          <div className="space-y-5">
            {/* API & Webhook Inspector */}
            {persona === 'tribunal' && (
              <div className="glass-panel rounded-2xl border-violet-200 bg-violet-50/40 p-4 space-y-3">
                <h3 className="text-xs font-bold text-violet-800 uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-violet-600" />
                  PayPal API &amp; Webhook Stream
                </h3>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="text-slate-700 bg-white rounded-xl p-3 border border-slate-200 space-y-1 shadow-sm">
                    <div className="text-slate-500 font-semibold">Active Endpoints:</div>
                    <div className="text-[#0070BA]">POST /v2/checkout/orders (AUTHORIZE)</div>
                    <div className="text-emerald-700">POST /v2/payments/authorizations/{'{id}'}/capture</div>
                    <div className="text-violet-700">POST /v1/payments/payouts (BATCH)</div>
                    <div className="text-teal-700">POST /v1/customer/disputes/{'{id}'}/provide-evidence</div>
                  </div>
                  {webhooks.length > 0 && (
                    <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5 max-h-40 overflow-y-auto shadow-sm">
                      <div className="text-slate-500 font-semibold">Recent Webhook Events ({webhooks.length}):</div>
                      {webhooks.slice(0, 5).map((w) => (
                        <div key={w.id} className="border-t border-slate-100 pt-1">
                          <div className="text-emerald-700 font-semibold">{w.eventType}</div>
                          <div className="text-slate-500">{w.actionTaken}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contract Summary Card */}
            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Escrow Vault Summary
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Auth ID', value: contract.authorizationId, mono: true, color: 'text-[#0070BA] font-semibold' },
                  { label: 'Order ID', value: contract.orderId, mono: true, color: 'text-slate-700' },
                  { label: 'Client', value: contract.clientEmail, mono: true, color: 'text-slate-700' },
                  { label: 'Agency', value: contract.freelancerEmail, mono: true, color: 'text-slate-700' },
                  { label: 'Auth Expires', value: contract.expiresAt.split('T')[0], mono: false, color: 'text-amber-700 font-semibold' },
                ].map(({ label, value, mono, color }) => (
                  <div key={label} className="flex justify-between items-start text-xs">
                    <span className="text-slate-500 flex-shrink-0">{label}</span>
                    <span className={cn('text-right ml-4 break-all', mono && 'font-mono', color)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Infrastructure Health */}
            <div className="glass-panel rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Live Integration Stack
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    label: 'Gemini AI Tribunal',
                    value: health?.gemini?.connected ? `Active (${health.gemini.model})` : 'Fallback',
                    color: health?.gemini?.connected ? 'text-emerald-700' : 'text-amber-700',
                  },
                  {
                    label: 'Supabase Proof Vault',
                    value: health?.supabase?.connected ? 'Connected' : 'Local Persist',
                    color: health?.supabase?.connected ? 'text-emerald-700' : 'text-slate-600',
                  },
                  {
                    label: 'PayPal Sandbox API',
                    value: health?.paypal?.connected ? 'Live OAuth Active' : 'Sim Mode Ready',
                    color: health?.paypal?.connected ? 'text-[#0070BA]' : 'text-amber-700',
                  },
                  { label: 'Dispute Shield', value: 'Auto-Evidence Ready', color: 'text-emerald-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className={cn('font-semibold font-mono', color)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Ledger */}
        <FinancialLedger entries={ledger} />
      </div>

      {/* Animated Modals */}
      <AnimatePresence>
        {showCertificate && tribunal?.certificate && (
          <CertificateModal certificate={tribunal.certificate} onClose={() => setShowCertificate(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArchitect && (
          <ContractArchitect
            onClose={() => setShowArchitect(false)}
            paypalCreds={paypalCreds}
            simulate={demoMode}
            onContractCreated={(newContract) => {
              setContract(newContract);
              router.push(`/dashboard/contract/${newContract.id}`);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeliverable && deliverableMilestone && (
          <DeliverableModal
            milestoneTitle={deliverableMilestone.title}
            milestoneId={deliverableMilestone.id}
            onClose={() => setShowDeliverable(false)}
            onSubmit={handleDeliverableSubmit}
          />
        )}
      </AnimatePresence>

      {/* Non-blocking Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold flex items-center gap-2',
              toast.tone === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
              toast.tone === 'info' && 'bg-blue-50 border-blue-200 text-[#0070BA]',
              toast.tone === 'error' && 'bg-red-50 border-red-200 text-red-800'
            )}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] text-slate-600 flex items-center justify-center font-mono text-xs">
          Loading Lancer AI Contract Console...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
