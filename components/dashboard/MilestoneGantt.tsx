'use client';

import { Milestone, Persona, SplitRatio, SupportedCurrency } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Lock,
  AlertCircle,
  ArrowRight,
  GitPullRequest,
  Link2,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
  CalendarRange,
  SlidersHorizontal,
  Save,
} from 'lucide-react';
import { useState } from 'react';

interface MilestoneGanttProps {
  milestones: Milestone[];
  persona: Persona;
  displayCurrency?: SupportedCurrency;
  onSubmitDeliverable: (milestoneId: string) => void;
  onUpdateSplits?: (milestoneId: string, splitRatios: SplitRatio[]) => Promise<void> | void;
  activeMilestoneId?: string;
}

const FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
};

const statusConfig = {
  disbursed: {
    label: 'DISBURSED',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    barClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    ganttBg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    textClass: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    border: 'border-emerald-200',
  },
  in_audit: {
    label: 'IN AI TRIBUNAL',
    icon: <AlertCircle className="w-3.5 h-3.5 animate-pulse" />,
    barClass: 'bg-gradient-to-r from-amber-500 to-violet-500',
    ganttBg: 'bg-amber-50 border-amber-300 text-amber-800',
    textClass: 'text-amber-700',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
    border: 'border-amber-200',
  },
  locked: {
    label: 'LOCKED',
    icon: <Lock className="w-3.5 h-3.5" />,
    barClass: 'bg-slate-300',
    ganttBg: 'bg-slate-100 border-slate-300 text-slate-600',
    textClass: 'text-slate-600',
    badgeClass: 'bg-slate-100 border-slate-200 text-slate-600',
    border: 'border-slate-200',
  },
  partial_settlement: {
    label: 'PARTIAL RELEASE',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
    barClass: 'bg-gradient-to-r from-amber-500 to-amber-400',
    ganttBg: 'bg-amber-50 border-amber-300 text-amber-800',
    textClass: 'text-amber-700',
    badgeClass: 'bg-amber-50 border-amber-200 text-amber-700',
    border: 'border-amber-200',
  },
  rejected: {
    label: 'REJECTED',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
    barClass: 'bg-red-500',
    ganttBg: 'bg-red-50 border-red-300 text-red-800',
    textClass: 'text-red-700',
    badgeClass: 'bg-red-50 border-red-200 text-red-700',
    border: 'border-red-200',
  },
};

function MilestoneCard({
  milestone,
  persona,
  displayCurrency = 'USD',
  onSubmitDeliverable,
  onUpdateSplits,
  isSelected,
  onToggle,
}: {
  milestone: Milestone;
  persona: Persona;
  displayCurrency?: SupportedCurrency;
  onSubmitDeliverable: (id: string) => void;
  onUpdateSplits?: (milestoneId: string, splitRatios: SplitRatio[]) => Promise<void> | void;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [editingSplits, setEditingSplits] = useState(false);
  const [draftSplits, setDraftSplits] = useState<SplitRatio[]>(milestone.splitRatios);
  const [savingSplits, setSavingSplits] = useState(false);

  const cfg = statusConfig[milestone.status];
  const fx = FX_RATES[displayCurrency] || 1;
  const fmt = (val: number) => formatCurrency(val * fx, displayCurrency);

  const progressPct =
    milestone.status === 'disbursed'
      ? 100
      : milestone.status === 'in_audit'
      ? 68
      : milestone.status === 'partial_settlement'
      ? 80
      : 0;

  const totalPct = draftSplits.reduce((s, r) => s + Number(r.percentage || 0), 0);

  const handlePctChange = (index: number, newPct: number) => {
    const clamped = Math.max(0, Math.min(100, newPct));
    const updated = draftSplits.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          percentage: clamped,
          amount: Math.round(milestone.amount * clamped) / 100,
        };
      }
      return item;
    });
    setDraftSplits(updated);
  };

  const handleSaveSplits = async () => {
    if (totalPct !== 100 || !onUpdateSplits) return;
    setSavingSplits(true);
    try {
      await onUpdateSplits(milestone.id, draftSplits);
      setEditingSplits(false);
    } finally {
      setSavingSplits(false);
    }
  };

  return (
    <motion.div
      layout
      className={cn(
        'glass-panel rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-md',
        cfg.border,
        isSelected && 'ring-2 ring-[#0070BA]/30'
      )}
    >
      {/* Header Row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
        onClick={onToggle}
      >
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border font-mono',
            cfg.badgeClass
          )}
        >
          M{milestone.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm truncate">{milestone.title}</span>
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border',
                cfg.badgeClass
              )}
            >
              {cfg.icon}
              {cfg.label}
            </span>
            {milestone.aiScore !== undefined && (
              <span
                className={cn(
                  'text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border',
                  milestone.aiScore >= 90
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : milestone.aiScore >= 65
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                )}
              >
                AI: {milestone.aiScore}%
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={cn('h-full rounded-full relative overflow-hidden', cfg.barClass)}
            >
              {milestone.status === 'in_audit' && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className={cn('text-lg font-bold font-mono tabular-nums', cfg.textClass)}>
            {fmt(milestone.amount)}
          </div>
          {milestone.captureId && (
            <div className="text-[11px] text-slate-500 font-mono">CAP: {milestone.captureId}</div>
          )}
        </div>

        <div className="hidden lg:block text-xs text-slate-500 text-right flex-shrink-0 w-28 font-mono">
          <div>{formatDate(milestone.startDate)}</div>
          <div className="text-slate-400">→ {formatDate(milestone.endDate)}</div>
        </div>

        <span className="text-slate-400">
          {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {/* Smooth Expandable Detail */}
      <AnimatePresence initial={false}>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-slate-200 bg-slate-50/70"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Acceptance Criteria */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    Machine-Testable Acceptance Criteria
                  </h4>
                  <ul className="space-y-2">
                    {milestone.acceptanceCriteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span
                          className={cn(
                            'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 text-[10px] font-mono font-bold',
                            milestone.status === 'disbursed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          )}
                        >
                          {milestone.status === 'disbursed' ? '✓' : `${i + 1}`}
                        </span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Micro-Agency Split Ratio + Interactive Editor */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#0070BA]" /> Micro-Agency Split
                      </h4>
                      {onUpdateSplits && milestone.status !== 'disbursed' && (
                        <button
                          onClick={() => {
                            setDraftSplits(milestone.splitRatios);
                            setEditingSplits(!editingSplits);
                          }}
                          className="flex items-center gap-1 text-[11px] font-mono font-semibold text-violet-600 hover:text-violet-700 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          {editingSplits ? 'Cancel' : 'Edit Split %'}
                        </button>
                      )}
                    </div>

                    {editingSplits ? (
                      <div className="space-y-2 p-3 rounded-xl bg-white border border-violet-200 shadow-sm">
                        {draftSplits.map((s, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className="text-slate-900 font-semibold truncate">{s.recipientName}</div>
                              <div className="text-[10px] text-slate-500">{s.role}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={s.percentage}
                                onChange={(e) => handlePctChange(i, Number(e.target.value))}
                                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-mono text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                              />
                              <span className="text-slate-500">%</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <span
                            className={cn(
                              'font-mono font-semibold',
                              totalPct === 100 ? 'text-emerald-600' : 'text-red-600'
                            )}
                          >
                            Total: {totalPct}% {totalPct !== 100 && '(Must equal 100%)'}
                          </span>
                          <button
                            onClick={handleSaveSplits}
                            disabled={totalPct !== 100 || savingSplits}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            {savingSplits ? 'Saving...' : 'Save Split'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      milestone.splitRatios.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200 last:border-0"
                        >
                          <div>
                            <span className="text-slate-800 font-semibold">{s.recipientName}</span>
                            <span className="text-slate-500 ml-1.5">({s.role})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-700 font-mono font-bold">{fmt(s.amount)}</span>
                            <span className="text-slate-500 ml-1">({s.percentage}%)</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {(milestone.githubPR || milestone.stagingUrl || milestone.captureId) && (
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Evidence &amp; PayPal IDs
                      </h4>
                      {milestone.githubPR && (
                        <div className="flex items-center gap-2 text-xs">
                          <GitPullRequest className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                          <a
                            href={milestone.githubPR}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-700 font-mono truncate underline-offset-2 hover:underline"
                          >
                            {milestone.githubPR}
                          </a>
                        </div>
                      )}
                      {milestone.stagingUrl && (
                        <div className="flex items-center gap-2 text-xs">
                          <Link2 className="w-3.5 h-3.5 text-[#0070BA] flex-shrink-0" />
                          <a
                            href={milestone.stagingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0070BA] hover:text-[#005EA6] font-mono truncate underline-offset-2 hover:underline"
                          >
                            {milestone.stagingUrl}
                          </a>
                        </div>
                      )}
                      {milestone.captureId && (
                        <div className="text-[11px] font-mono text-slate-600">
                          Capture: <span className="text-emerald-700 font-semibold">{milestone.captureId}</span> | Payout:{' '}
                          <span className="text-violet-700 font-semibold">{milestone.batchPayoutId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {milestone.dependsOn && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#0070BA]" />
                  Sequential Escrow Dependency: Unlocks automatically upon capture of M{milestone.number - 1}
                </div>
              )}

              {milestone.subMilestone && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="text-amber-800 font-bold">[AI Sub-Milestone Hold Created] </span>
                    <span className="text-slate-700">{milestone.subMilestone.title} — </span>
                    <span className="text-amber-700 font-mono font-bold">{fmt(milestone.subMilestone.amount)}</span>
                    <div className="text-slate-600 mt-0.5">{milestone.subMilestone.reason}</div>
                  </div>
                </div>
              )}

              {persona === 'freelancer' && milestone.status === 'locked' && (
                <div className="text-xs text-slate-500 italic">
                  🔒 Locked in PayPal Authorization — unlocks when M{milestone.number - 1} settles
                </div>
              )}

              {persona === 'freelancer' && (milestone.status === 'in_audit' || milestone.status === 'rejected') && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSubmitDeliverable(milestone.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <GitPullRequest className="w-4 h-4" />
                  {milestone.status === 'rejected' ? 'Re-Submit Remediated Deliverable' : 'Submit / Update Deliverable'}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MilestoneGantt({
  milestones,
  persona,
  displayCurrency = 'USD',
  onSubmitDeliverable,
  onUpdateSplits,
  activeMilestoneId,
}: MilestoneGanttProps) {
  const [selectedId, setSelectedId] = useState<string>(activeMilestoneId || milestones[1]?.id || milestones[0]?.id || '');
  const fx = FX_RATES[displayCurrency] || 1;
  const fmt = (val: number) => formatCurrency(val * fx, displayCurrency);

  const totalMilestones = milestones.length || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-[#0070BA]" />
          Bryntum-Style Milestone Gantt &amp; Dependency Roadmap
        </h2>
        <span className="text-xs text-slate-500 font-mono font-medium">
          {milestones.length} Phases • {fmt(milestones.reduce((s, m) => s + m.amount, 0))} Total Escrow
        </span>
      </div>

      {/* Horizontal Gantt Chart Grid */}
      <div className="glass-panel rounded-2xl p-4 overflow-x-auto">
        <div className="min-w-[600px] space-y-3">
          {/* Week Scale Header */}
          <div className="grid grid-cols-[150px_1fr] gap-3 items-center pb-2 border-b border-slate-200">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
              Phase / Escrow Bar
            </span>
            <div className="grid grid-cols-6 text-[10px] font-mono font-semibold text-slate-500">
              {['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'].map((w) => (
                <div key={w} className="border-l border-slate-200 pl-2">
                  {w}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Track Rows */}
          <div className="space-y-2.5 relative">
            {milestones.map((m, idx) => {
              const cfg = statusConfig[m.status];
              const leftPct = (idx / totalMilestones) * 100;
              const widthPct = (1 / totalMilestones) * 100 - 2;

              return (
                <div key={m.id} className="grid grid-cols-[150px_1fr] gap-3 items-center">
                  <button
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'text-left text-xs truncate px-2 py-1 rounded-lg transition-colors cursor-pointer',
                      selectedId === m.id
                        ? 'bg-blue-50 text-[#0070BA] font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <span className="font-mono text-[11px] mr-1.5 text-slate-400">M{m.number}</span>
                    {m.title}
                  </button>

                  {/* Track Canvas */}
                  <div className="relative h-9 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                      {[0, 1, 2, 3, 4, 5].map((col) => (
                        <div key={col} className="border-l border-slate-200/80 h-full" />
                      ))}
                    </div>

                    <motion.button
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        originX: 0,
                        left: `${leftPct + 0.5}%`,
                        width: `${widthPct}%`,
                      }}
                      whileHover={{ y: -1 }}
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        'absolute top-1 bottom-1 rounded-md border px-2.5 flex items-center justify-between gap-2 text-[11px] font-mono transition-shadow cursor-pointer shadow-sm overflow-hidden',
                        cfg.ganttBg,
                        selectedId === m.id && 'ring-2 ring-[#0070BA]/50'
                      )}
                    >
                      {m.status === 'in_audit' && (
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer pointer-events-none" />
                      )}
                      <span className="flex items-center gap-1.5 truncate relative z-10">
                        {cfg.icon}
                        <span className="truncate font-bold">{fmt(m.amount)}</span>
                      </span>
                      <span className="hidden sm:inline text-[9px] uppercase font-semibold opacity-85 relative z-10">
                        {m.status === 'disbursed'
                          ? '100%'
                          : m.status === 'partial_settlement'
                          ? '80%'
                          : m.status === 'in_audit'
                          ? 'Audit'
                          : 'Hold'}
                      </span>
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Expandable Milestone Cards */}
      <div className="space-y-3">
        {milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            persona={persona}
            displayCurrency={displayCurrency}
            onSubmitDeliverable={onSubmitDeliverable}
            onUpdateSplits={onUpdateSplits}
            isSelected={selectedId === m.id}
            onToggle={() => setSelectedId(selectedId === m.id ? '' : m.id)}
          />
        ))}
      </div>
    </div>
  );
}
