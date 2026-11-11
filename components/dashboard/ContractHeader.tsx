'use client';

import { Contract, SupportedCurrency } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/MotionPrimitives';
import { motion } from 'framer-motion';
import {
  Shield,
  Lock,
  TrendingUp,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ContractHeaderProps {
  contract: Contract;
  allContracts?: Contract[];
  onSelectContract?: (id: string) => void;
  displayCurrency?: SupportedCurrency;
  onCurrencyChange?: (c: SupportedCurrency) => void;
}

const FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
};

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const statusConfig = {
  draft: { label: 'Draft', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  authorized: { label: 'Locked in Escrow', color: 'text-[#0070BA] bg-blue-50 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  completed: { label: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export default function ContractHeader({
  contract,
  allContracts = [],
  onSelectContract,
  displayCurrency = 'USD',
  onCurrencyChange,
}: ContractHeaderProps) {
  const status = statusConfig[contract.status];
  const [daysLeft, setDaysLeft] = useState(26);

  useEffect(() => {
    if (!contract.expiresAt) return;
    const rafId = requestAnimationFrame(() => {
      const remaining = Math.max(
        1,
        Math.ceil((new Date(contract.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
      setDaysLeft(remaining);
    });
    return () => cancelAnimationFrame(rafId);
  }, [contract.expiresAt]);

  const fx = FX_RATES[displayCurrency] || 1;
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || '$';
  const fmt = (val: number) => formatCurrency(val * fx, displayCurrency);

  const releasedPct =
    contract.totalAmount > 0 ? Math.round((contract.releasedAmount / contract.totalAmount) * 100) : 0;
  const auditMilestone = contract.milestones.find((m) => m.status === 'in_audit');

  const kpis = [
    {
      label: 'Total Authorized Escrow',
      rawVal: contract.totalAmount * fx,
      sub: `Auth: ${contract.authorizationId}`,
      sub2: `PayPal Auth expires in ${daysLeft}d`,
      icon: <Lock className="w-5 h-5 text-[#0070BA]" />,
      border: 'border-blue-200/80',
      valueColor: 'text-[#0070BA]',
      barColor: 'bg-[#0070BA]',
      barPct: 100,
    },
    {
      label: 'Released via Partial Capture',
      rawVal: contract.releasedAmount * fx,
      sub: `${releasedPct}% Disbursed`,
      sub2: `${contract.milestones.filter((m) => m.status === 'disbursed').length} milestone(s) settled`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      border: 'border-emerald-200/80',
      valueColor: 'text-emerald-600',
      barColor: 'bg-emerald-500',
      barPct: releasedPct,
    },
    {
      label: 'Under AI Tribunal Audit',
      rawVal: contract.auditAmount * fx,
      sub: auditMilestone ? `M${auditMilestone.number} — Active Session` : 'No active audit hold',
      sub2: auditMilestone?.githubPR ? 'Evidence linked & ready' : 'Awaiting submission',
      icon: <AlertCircle className="w-5 h-5 text-amber-600 animate-pulse" />,
      border: 'border-amber-200/80',
      valueColor: 'text-amber-600',
      barColor: 'bg-amber-500',
      barPct: contract.totalAmount > 0 ? Math.round((contract.auditAmount / contract.totalAmount) * 100) : 0,
    },
    {
      label: 'Protected Remaining Vault',
      rawVal: contract.lockedAmount * fx,
      sub: 'Locked in PayPal Authorization',
      sub2: 'Auto-unlocks sequentially',
      icon: <Shield className="w-5 h-5 text-violet-600" />,
      border: 'border-violet-200/80',
      valueColor: 'text-violet-600',
      barColor: 'bg-violet-500',
      barPct: contract.totalAmount > 0 ? Math.round((contract.lockedAmount / contract.totalAmount) * 100) : 0,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Contract Switcher + Multi-Currency Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#0070BA]" />
            Portfolio
          </Link>

          {allContracts.length > 0 && onSelectContract && (
            <div className="relative flex items-center">
              <select
                value={contract.id}
                onChange={(e) => onSelectContract(e.target.value)}
                aria-label="Switch active contract"
                className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono text-slate-800 shadow-sm outline-none cursor-pointer"
              >
                {allContracts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white text-slate-800">
                    #{c.id} — {c.title.slice(0, 36)}
                    {c.title.length > 36 ? '...' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Multi-Currency Display Switcher with Gliding Pill */}
        {onCurrencyChange && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-mono shadow-sm">
            {(['USD', 'EUR', 'GBP'] as SupportedCurrency[]).map((cur) => (
              <button
                key={cur}
                onClick={() => onCurrencyChange(cur)}
                className={cn(
                  'relative px-2.5 py-1 rounded-md transition-colors cursor-pointer z-10',
                  displayCurrency === cur ? 'text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {displayCurrency === cur && (
                  <motion.span
                    layoutId="currency-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-[#0070BA] rounded-md -z-10"
                  />
                )}
                {cur}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contract Title Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              #{contract.id}
            </span>
            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', status.color)}>
              {status.label}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight max-w-3xl">
            {contract.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Client:</span>
              <span className="text-slate-900 font-semibold">{contract.clientName}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>Agency:</span>
              <span className="text-slate-900 font-semibold">{contract.freelancerName}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Created {formatDate(contract.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Live Escrow Lock Indicator */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-panel flex items-center gap-3 px-4 py-2.5 rounded-xl border-blue-200 bg-blue-50/70"
        >
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0070BA]" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#0070BA] animate-ping opacity-50" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0070BA] tracking-wide">ACTIVE ESCROW LOCK</div>
            <div className="text-[11px] font-mono text-slate-600">{contract.authorizationId}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* KPI Bento Cards with Animated Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
            whileHover={{ y: -3 }}
            className={cn(
              'glass-panel relative overflow-hidden rounded-2xl p-4 transition-shadow hover:shadow-md',
              kpi.border
            )}
          >
            <div className="flex items-start justify-between mb-2.5">
              <span className="text-xs text-slate-500 font-semibold leading-tight">{kpi.label}</span>
              {kpi.icon}
            </div>
            <div className={cn('text-2xl font-bold font-mono tracking-tight', kpi.valueColor)}>
              <AnimatedNumber value={kpi.rawVal} decimals={2} prefix={symbol} />
            </div>
            <div className="mt-2.5 space-y-0.5">
              <div className="text-xs text-slate-600 font-mono truncate">{kpi.sub}</div>
              <div className="text-[11px] text-slate-500">{kpi.sub2}</div>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${kpi.barPct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={cn('h-full rounded-full', kpi.barColor)}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Multi-Segment Escrow Distribution Bar */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
          <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">
            Escrow Capital Allocation
          </span>
          <span className="text-xs text-slate-600 font-mono tabular-nums font-medium">
            {fmt(contract.releasedAmount)} / {fmt(contract.totalAmount)} Disbursed ({releasedPct}%)
          </span>
        </div>
        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
          <motion.div
            animate={{
              width: `${contract.totalAmount > 0 ? (contract.releasedAmount / contract.totalAmount) * 100 : 0}%`,
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
          />
          <motion.div
            animate={{
              width: `${contract.totalAmount > 0 ? (contract.auditAmount / contract.totalAmount) * 100 : 0}%`,
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </motion.div>
          <motion.div
            animate={{
              width: `${contract.totalAmount > 0 ? (contract.lockedAmount / contract.totalAmount) * 100 : 0}%`,
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-slate-300"
          />
        </div>
        <div className="flex flex-wrap gap-5 mt-2.5 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Released ({fmt(contract.releasedAmount)})
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse" /> Under Audit ({fmt(contract.auditAmount)})
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Locked Vault ({fmt(contract.lockedAmount)})
          </div>
        </div>
      </div>
    </div>
  );
}
