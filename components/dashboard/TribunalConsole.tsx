'use client';

import { AgentCheckItem, AgentResult, TribunalResult } from '@/lib/types';
import { ScenarioType } from '@/lib/agent-simulator';
import { cn, formatCurrency } from '@/lib/utils';
import { ScoreRing } from '@/components/ui/MotionPrimitives';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Eye,
  Scale,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronRight,
  Zap,
  AlertTriangle,
  Shield,
  Sliders,
  Smartphone,
  Monitor,
  ArrowRight,
  FileSignature,
  Figma,
  Lock,
} from 'lucide-react';
import { useState } from 'react';

interface TribunalConsoleProps {
  agent1: AgentResult | null;
  agent2: AgentResult | null;
  agent3: AgentResult | null;
  tribunal: TribunalResult | null;
  isRunning: boolean;
  scenario: ScenarioType | null;
  onViewCertificate: () => void;
  onApproveDualMediation?: () => Promise<void> | void;
}

function CheckRow({ check, index }: { check: AgentCheckItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.25) }}
      className={cn(
        'flex items-start gap-2 py-1.5 px-2 rounded-lg text-xs transition-colors',
        check.status === 'running' && 'bg-violet-50',
        check.status === 'pass' && 'bg-emerald-50/70',
        check.status === 'fail' && 'bg-red-50'
      )}
    >
      <span className="flex-shrink-0 mt-0.5">
        {check.status === 'pending' && <Clock className="w-3.5 h-3.5 text-slate-400" />}
        {check.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-violet-600 animate-spin" />}
        {check.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        {check.status === 'fail' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'font-mono leading-tight',
            check.status === 'pending' && 'text-slate-400',
            check.status === 'running' && 'text-violet-700 font-semibold',
            check.status === 'pass' && 'text-slate-800',
            check.status === 'fail' && 'text-red-700 font-semibold'
          )}
        >
          {check.label}
        </div>
        {check.detail && (
          <div
            className={cn(
              'text-[10px] font-mono mt-0.5 leading-tight',
              check.status === 'pass' ? 'text-slate-500' : 'text-red-600'
            )}
          >
            → {check.detail}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VisualDiffInspector({ scenario }: { scenario: ScenarioType | null }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const isFailed = scenario === 'C';
  const isPartial = scenario === 'B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel rounded-2xl border-sky-200 p-4 space-y-3"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#0D99FF]/10 text-[#0D99FF]">
            <Figma className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Figma Spec vs Live DOM Vision Inspector
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-[#0D99FF] border border-sky-200 font-semibold">
            Redline &amp; Token Parity
          </span>
        </div>

        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setViewMode('desktop')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer',
              viewMode === 'desktop' ? 'bg-[#0D99FF] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Monitor className="w-3 h-3" /> 1440px
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer',
              viewMode === 'mobile' ? 'bg-[#0D99FF] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Smartphone className="w-3 h-3" /> 375px
          </button>
        </div>
      </div>

      {/* Interactive Figma Canvas Comparison Stage */}
      <div
        className={cn(
          'relative h-72 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 bg-figma-dots select-none mx-auto transition-all duration-300',
          viewMode === 'mobile' ? 'max-w-[360px]' : 'w-full'
        )}
      >
        {/* Layer 1: Realistic Figma Target Spec Frame */}
        <div className="absolute inset-0 p-4 font-sans text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-300/80">
            <span className="font-bold text-[#0D99FF] flex items-center gap-1.5 font-mono text-[11px]">
              ❖ Checkout-Flow / v2.4 (Figma Spec)
            </span>
            <span className="text-[10px] font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
              gap: 16px • r: 12px • AA 7.2:1
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4">
            {/* Figma Spec Order Summary */}
            <div className="relative space-y-2 p-3.5 bg-white/95 rounded-xl border border-dashed border-[#0D99FF]">
              <span className="w-2 h-2 bg-white border border-[#0D99FF] absolute -top-1 -left-1" />
              <span className="w-2 h-2 bg-white border border-[#0D99FF] absolute -top-1 -right-1" />
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                <span>Order Summary</span>
                <span className="font-mono text-[#0D99FF]">#ESC-8842</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-800 pt-1 border-t border-slate-100">
                <span>API Migration Pack</span>
                <span className="font-mono">$1,500.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Escrow Hold Fee</span>
                <span className="font-mono text-emerald-600">$0.00</span>
              </div>
              <div className="text-[10px] font-mono text-[#0D99FF]">font: Geist 600 • 14px</div>
            </div>

            {/* Figma Spec PayPal Component */}
            <div className="relative space-y-2 p-3.5 bg-white/95 rounded-xl border border-dashed border-pink-400">
              <div className="text-[11px] font-semibold text-slate-500">Express Checkout Slot</div>
              <div className="h-8 w-full bg-[#FFC439]/30 border border-[#FFC439] rounded-lg flex items-center justify-center text-[11px] text-slate-800 font-bold">
                PayPal Express Slot
              </div>
              <div className="h-7 w-full bg-[#0070BA]/15 border border-[#0070BA] rounded-lg flex items-center justify-center text-[10px] text-[#0070BA] font-bold">
                Pay Later / Card
              </div>
              <div className="text-[10px] font-mono text-pink-600">padding: 12px • token: paypal-blue</div>
            </div>
          </div>
        </div>

        {/* Layer 2: Live Deployed DOM Snapshot */}
        <div
          className="absolute inset-0 overflow-hidden p-4 font-sans text-xs bg-white border-r-2 border-[#0D99FF]"
          style={{ width: `${sliderPos}%` }}
        >
          <div className={viewMode === 'mobile' ? 'w-[320px]' : 'w-[600px] max-w-none'}>
            <div className="flex items-center justify-between pb-2 border-b border-blue-200">
              <span className="font-bold text-[#0070BA] flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Live DOM Snapshot (Headless Chromium)
              </span>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                HTTP 200 OK
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div
                className={cn(
                  'space-y-2 p-3.5 rounded-xl border shadow-sm',
                  isFailed ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50/40'
                )}
              >
                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                  <span>Order Summary</span>
                  <span className="font-mono text-slate-600">#ESC-8842</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-200/70">
                  <span>API Migration Pack</span>
                  <span className="font-mono">$1,500.00</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Escrow Hold Fee</span>
                  <span className="font-mono text-emerald-700 font-semibold">$0.00</span>
                </div>
                {isFailed ? (
                  <div className="text-[10px] text-red-700 font-mono font-semibold">
                    ⚠ Layout shift: 24px overflow at 768px
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-700 font-mono font-semibold">
                    ✓ Typography &amp; Grid Matched
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-emerald-300 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-600">Express Checkout</div>
                <div className="h-8 w-full bg-[#FFC439] rounded-lg flex items-center justify-center text-[11px] text-[#003087] font-extrabold shadow-sm">
                  PayPal
                </div>
                <div className="h-7 w-full bg-[#0070BA] rounded-lg flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                  Authorize &amp; Lock Escrow
                </div>
                <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                  ✓ @paypal/react-paypal-js mounted
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[#0D99FF] cursor-ew-resize z-20 flex items-center justify-center"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-7 h-7 rounded-full bg-[#0D99FF] text-white flex items-center justify-center shadow-md text-[11px] font-bold border-2 border-white">
            ↔
          </div>
        </div>

        {/* Live Bounding Box Annotations */}
        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 text-[9px] font-mono font-semibold shadow-sm">
            ✓ PayPal SDK: Matched (100%)
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[9px] font-mono font-semibold border shadow-sm',
              isFailed
                ? 'bg-red-50 text-red-700 border-red-300'
                : isPartial
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            )}
          >
            {isFailed
              ? '✗ Viewport: Broken at 768px'
              : isPartial
              ? '⚠ Viewport: 76% Parity'
              : '✓ Viewport: 94% Parity'}
          </span>
        </div>
      </div>

      {/* Slider Control */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[#0070BA] font-mono font-semibold">Live DOM</span>
        <input
          type="range"
          min="10"
          max="90"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="flex-1 accent-[#0D99FF] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
        />
        <span className="text-[10px] text-[#0D99FF] font-mono font-semibold">Figma Spec</span>
      </div>
    </motion.div>
  );
}

function AgentPanel({
  title,
  role,
  icon,
  checks,
  score,
  status,
  agentColor,
}: {
  title: string;
  role: string;
  icon: React.ReactNode;
  checks: AgentCheckItem[];
  score?: number;
  status: 'idle' | 'running' | 'complete';
  agentColor: string;
}) {
  const isRunning = status === 'running';
  const isDone = status === 'complete';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass-panel rounded-2xl overflow-hidden flex flex-col transition-all duration-300',
        agentColor === 'violet' && 'border-violet-200',
        agentColor === 'blue' && 'border-sky-200',
        agentColor === 'emerald' && 'border-emerald-200',
        status === 'idle' && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between p-3.5 border-b',
          agentColor === 'violet' && 'border-violet-100 bg-violet-50/70',
          agentColor === 'blue' && 'border-sky-100 bg-sky-50/70',
          agentColor === 'emerald' && 'border-emerald-100 bg-emerald-50/70'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-1.5 rounded-lg',
              agentColor === 'violet' && 'bg-violet-100 text-violet-700',
              agentColor === 'blue' && 'bg-sky-100 text-sky-700',
              agentColor === 'emerald' && 'bg-emerald-100 text-emerald-700'
            )}
          >
            {icon}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{title}</div>
            <div className="text-[10px] text-slate-500">{role}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-1 text-xs text-violet-600 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-mono">Audit...</span>
            </div>
          )}
          {isDone && score !== undefined && <ScoreRing score={score} size={42} strokeWidth={4} />}
        </div>
      </div>

      {isRunning && (
        <div className="h-1 bg-slate-100 overflow-hidden relative">
          <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 animate-shimmer" />
        </div>
      )}

      <div className="flex-1 p-3 space-y-0.5 font-mono text-[11px] min-h-[200px] bg-white">
        {checks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Awaiting activation...
          </div>
        ) : (
          checks.map((c, i) => <CheckRow key={i} check={c} index={i} />)
        )}
      </div>
    </motion.div>
  );
}

export default function TribunalConsole({
  agent1,
  agent2,
  agent3,
  tribunal,
  isRunning,
  scenario,
  onViewCertificate,
  onApproveDualMediation,
}: TribunalConsoleProps) {
  const [showVisualDiff, setShowVisualDiff] = useState(false);
  const [clientSigned, setClientSigned] = useState(false);
  const [agencySigned, setAgencySigned] = useState(false);
  const [settlingHold, setSettlingHold] = useState(false);
  const [mediationFinalized, setMediationFinalized] = useState(false);

  if (!scenario && !isRunning && !tribunal) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <Scale className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <div className="text-slate-800 text-sm font-bold mb-1">
          3-Agent Arbitration Tribunal Console
        </div>
        <div className="text-slate-500 text-xs max-w-md mx-auto">
          Trigger a scenario in the God-Mode bar above or submit a real GitHub PR &amp; Staging URL in Freelancer View to activate the autonomous tribunal.
        </div>
      </div>
    );
  }

  const scoreColor = (s: number) =>
    s >= 90 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-red-600';

  const verdictConfig = tribunal
    ? {
        APPROVED: {
          label: 'FULL TRANCHE RELEASE',
          icon: <CheckCircle2 className="w-5 h-5" />,
        },
        PARTIAL: {
          label: 'AI MEDIATED SPLIT SETTLEMENT',
          icon: <AlertTriangle className="w-5 h-5" />,
        },
        CHANGES_REQUESTED: {
          label: 'AUTOMATIC REJECTION — ESCROW HELD',
          icon: <XCircle className="w-5 h-5" />,
        },
        DISPUTED: {
          label: 'FLAGGED FOR HUMAN REVIEW',
          icon: <AlertTriangle className="w-5 h-5" />,
        },
      }[tribunal.status]
    : null;

  const handleDualSign = async () => {
    setClientSigned(true);
    setAgencySigned(true);
    if (onApproveDualMediation) {
      setSettlingHold(true);
      try {
        await onApproveDualMediation();
        setMediationFinalized(true);
      } finally {
        setSettlingHold(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Scale className="w-4 h-4 text-violet-600" />
          3-Agent Autonomous Arbitration Tribunal
        </h2>

        <div className="flex items-center gap-3">
          {tribunal?.poweredBy === 'gemini_live' && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold">
              ✓ Powered by {tribunal.modelUsed || 'Gemini 2.5 Flash'}
            </span>
          )}
          <button
            onClick={() => setShowVisualDiff(!showVisualDiff)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-sky-200 bg-sky-50 text-[#0D99FF] hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showVisualDiff ? 'Hide Figma Diff Slider' : 'Inspect Figma & UX Diff Slider'}
          </button>

          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-violet-700 font-mono font-semibold">
              <div className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
              Live Evaluation Running
            </div>
          )}
        </div>
      </div>

      {/* Live Consensus Pipeline Stepper */}
      <div className="glass-panel rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        {[
          {
            label: '1. Code Auditor',
            done: agent1?.status === 'complete',
            active: agent1?.status === 'running',
          },
          {
            label: '2. Figma Vision',
            done: agent2?.status === 'complete',
            active: agent2?.status === 'running',
          },
          {
            label: '3. Risk Arbiter',
            done: agent3?.status === 'complete',
            active: agent3?.status === 'running',
          },
          {
            label: '4. PayPal Settlement',
            done: Boolean(tribunal),
            active: false,
          },
        ].map((step, i, arr) => (
          <div key={step.label} className="flex items-center gap-2">
            <motion.span
              animate={{ scale: step.active ? [1, 1.04, 1] : 1 }}
              transition={{ repeat: step.active ? Infinity : 0, duration: 1.2 }}
              className={cn(
                'px-2.5 py-1 rounded-lg border font-semibold transition-colors',
                step.done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : step.active
                  ? 'bg-violet-50 border-violet-300 text-violet-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              )}
            >
              {step.done ? '✓ ' : step.active ? '● ' : ''}
              {step.label}
            </motion.span>
            {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />}
          </div>
        ))}
      </div>

      {/* Multimodal Vision Diff Inspector */}
      {(showVisualDiff || scenario || tribunal || isRunning) && <VisualDiffInspector scenario={scenario} />}

      {/* 3 Agent Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AgentPanel
          title="Agent 1"
          role="Spec & Code Auditor"
          icon={<Code2 className="w-4 h-4" />}
          checks={agent1?.checks ?? []}
          score={agent1?.score}
          status={agent1?.status ?? 'idle'}
          agentColor="violet"
        />
        <AgentPanel
          title="Agent 2"
          role="Multimodal Figma & UX Inspector"
          icon={<Eye className="w-4 h-4" />}
          checks={agent2?.checks ?? []}
          score={agent2?.score}
          status={agent2?.status ?? 'idle'}
          agentColor="blue"
        />
        <AgentPanel
          title="Agent 3"
          role="Financial & Escrow Risk Arbiter"
          icon={<Scale className="w-4 h-4" />}
          checks={agent3?.checks ?? []}
          score={agent3?.score}
          status={agent3?.status ?? 'idle'}
          agentColor="emerald"
        />
      </div>

      {/* Animated Tribunal Verdict */}
      <AnimatePresence>
        {tribunal && verdictConfig && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className={cn(
              'glass-panel-elevated rounded-2xl p-5 space-y-4',
              tribunal.status === 'APPROVED' && 'border-emerald-300 bg-emerald-50/40',
              tribunal.status === 'PARTIAL' && 'border-amber-300 bg-amber-50/40',
              tribunal.status === 'CHANGES_REQUESTED' && 'border-red-300 bg-red-50/40'
            )}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2.5 rounded-xl',
                    tribunal.status === 'APPROVED' && 'bg-emerald-100 text-emerald-700',
                    tribunal.status === 'PARTIAL' && 'bg-amber-100 text-amber-700',
                    tribunal.status === 'CHANGES_REQUESTED' && 'bg-red-100 text-red-700'
                  )}
                >
                  {verdictConfig.icon}
                </div>
                <div>
                  <div className={cn('font-bold text-sm font-mono', scoreColor(tribunal.overallScore))}>
                    TRIBUNAL VERDICT: {verdictConfig.label}
                  </div>
                  <div className="text-xs text-slate-600">
                    Weighted Score:{' '}
                    <span className={cn('font-bold font-mono', scoreColor(tribunal.overallScore))}>
                      {tribunal.overallScore}/100
                    </span>{' '}
                    {tribunal.status === 'APPROVED' && '(≥ 90% threshold for full tranche)'}
                    {tribunal.status === 'PARTIAL' && '(65–89% → Proportional split + Sub-Milestone)'}
                    {tribunal.status === 'CHANGES_REQUESTED' && '(< 65% → Funds held in authorization)'}
                  </div>
                </div>
              </div>

              <ScoreRing score={tribunal.overallScore} size={58} strokeWidth={6} />
            </div>

            {tribunal.captureAmount > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    PayPal Partial Capture Breakdown
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Captured Amount</span>
                      <span className="text-emerald-700 font-bold font-mono">
                        {formatCurrency(tribunal.captureAmount)}
                      </span>
                    </div>
                    {tribunal.holdAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Sub-Milestone Escrow Hold</span>
                        <span className="text-amber-700 font-bold font-mono">
                          {formatCurrency(tribunal.holdAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-slate-200">
                      <span>final_capture</span>
                      <span className="font-mono">false (remaining reserved)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-white border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Micro-Agency Batch Split Disbursements
                  </h4>
                  <div className="space-y-1.5">
                    {tribunal.splitPayouts.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="text-slate-800 font-semibold text-xs">{s.role}</span>
                          <div className="text-[10px] text-slate-500 font-mono">{s.recipientEmail}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-700 font-bold font-mono text-xs">
                            {formatCurrency(s.amount)}
                          </span>
                          <div className="text-[10px] text-slate-500">{s.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Dual-Signature Mediated Settlement Action */}
            {tribunal.status === 'PARTIAL' && tribunal.holdAmount > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <span className="text-amber-900 font-bold">AI Mediated Settlement Proposal: </span>
                    <span className="text-slate-700">
                      Release{' '}
                      <span className="text-amber-800 font-bold font-mono">
                        {formatCurrency(tribunal.captureAmount)}
                      </span>{' '}
                      immediately via Partial Capture, while holding{' '}
                      <span className="text-amber-800 font-bold font-mono">
                        {formatCurrency(tribunal.holdAmount)}
                      </span>{' '}
                      in Sub-Milestone M2.1 until the 768px responsive navbar fix passes re-audit.
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={() => setClientSigned(true)}
                    disabled={clientSigned}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer',
                      clientSigned
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    {clientSigned ? '✓ Client Signed' : 'Sign as Client'}
                  </button>
                  <button
                    onClick={() => setAgencySigned(true)}
                    disabled={agencySigned}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer',
                      agencySigned
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    {agencySigned ? '✓ Agency Signed' : 'Sign as Agency'}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDualSign}
                    disabled={settlingHold || mediationFinalized}
                    className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {settlingHold ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Settling Sub-Milestone...
                      </>
                    ) : mediationFinalized ? (
                      '✓ Dual-Signature Settlement Complete'
                    ) : (
                      'One-Click Dual-Signature Approval'
                    )}
                  </motion.button>
                </div>
              </div>
            )}

            {tribunal.certificate && (
              <div className="flex items-center gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onViewCertificate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0070BA] hover:bg-[#005EA6] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  View Cryptographic Proof-of-Delivery Certificate
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
                <span className="text-xs text-emerald-700 flex items-center gap-1 font-mono font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Dispute Shield: Auto-Linked to PayPal Disputes API
                </span>
              </div>
            )}

            {tribunal.status === 'CHANGES_REQUESTED' && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  Automated Remediation Checklist for Freelancer
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(tribunal.discrepancies && tribunal.discrepancies.length > 0
                    ? tribunal.discrepancies
                    : [
                        'CRITICAL: Hardcoded PayPal Client Secret in client bundle — move to process.env',
                        'Fix responsive navbar collapse at 768px tablet breakpoint',
                        'Increase unit test coverage to meet ≥80% contract acceptance rubric',
                      ]
                  ).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
