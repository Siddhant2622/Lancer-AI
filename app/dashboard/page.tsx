'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Contract } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import ContractArchitect from '@/components/dashboard/ContractArchitect';
import { AnimatedNumber } from '@/components/ui/MotionPrimitives';
import {
  Shield,
  Plus,
  Sparkles,
  ArrowRight,
  Lock,
  TrendingUp,
  AlertCircle,
  Search,
  Layers,
  Cpu,
  ArrowLeft,
} from 'lucide-react';

function PortfolioContent() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchitect, setShowArchitect] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/contracts', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.contracts)) {
          setContracts(data.contracts);
        }
      })
      .catch((err) => console.warn('[Portfolio load]', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalEscrow = contracts.reduce((s, c) => s + c.totalAmount, 0);
  const totalReleased = contracts.reduce((s, c) => s + c.releasedAmount, 0);
  const totalInAudit = contracts.reduce((s, c) => s + c.auditAmount, 0);

  const filtered = contracts.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.freelancerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = {
    draft: 'text-slate-600 bg-slate-100 border-slate-200',
    authorized: 'text-[#0070BA] bg-blue-50 border-blue-200',
    in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
    completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-fintech-grid text-slate-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0070BA] to-violet-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-[#0070BA]/20">
                LA
              </div>
              <div>
                <div className="font-bold text-sm leading-none text-slate-900">
                  Lancer <span className="text-[#0070BA]">AI</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  PORTFOLIO COMMAND CENTER
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Real Project Workspace
            </Link>
            <Link
              href="/api/agent/capabilities"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-violet-600" />
              A2A Manifest
            </Link>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowArchitect(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0070BA] to-violet-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-[#0070BA]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New AI Escrow Contract
              <Sparkles className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Autonomous Escrow Portfolio
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage multi-milestone PayPal authorizations, active AI Tribunal audits, and split squad payouts.
            </p>
          </div>
          <Link
            href="/dashboard/contract/ESC-8842"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[#0070BA] hover:bg-blue-100 text-xs font-semibold transition-colors"
          >
            Jump to Flagship Demo (#ESC-8842)
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* Aggregate Portfolio Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Value Authorized (TVL)',
              numVal: totalEscrow,
              isCurrency: true,
              sub: `${contracts.length} active vault${contracts.length === 1 ? '' : 's'}`,
              icon: <Lock className="w-5 h-5 text-[#0070BA]" />,
              accent: 'border-blue-200',
            },
            {
              label: 'Disbursed via Partial Capture',
              numVal: totalReleased,
              isCurrency: true,
              sub: `${totalEscrow > 0 ? Math.round((totalReleased / totalEscrow) * 100) : 0}% settled cleanly`,
              icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
              accent: 'border-emerald-200',
            },
            {
              label: 'Capital in AI Tribunal Audit',
              numVal: totalInAudit,
              isCurrency: true,
              sub: '3-Agent consensus active',
              icon: <AlertCircle className="w-5 h-5 text-amber-600 animate-pulse" />,
              accent: 'border-amber-200',
            },
            {
              label: 'Dispute Shield Coverage',
              numVal: 100,
              isCurrency: false,
              sub: 'SHA-256 + Supabase Vault',
              icon: <Shield className="w-5 h-5 text-violet-600" />,
              accent: 'border-violet-200',
            },
          ].map((card, idx) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className={cn('glass-panel rounded-2xl p-5 space-y-2', card.accent)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">{card.label}</span>
                {card.icon}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {card.isCurrency ? (
                  <AnimatedNumber value={card.numVal} decimals={2} prefix="$" />
                ) : (
                  <AnimatedNumber value={card.numVal} suffix="% Protected" />
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono">{card.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contract ID, title, client, or agency..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-[#0070BA]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {[
              { id: 'all', label: 'All' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'authorized', label: 'Authorized' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer z-10',
                  statusFilter === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {statusFilter === tab.id && (
                  <motion.span
                    layoutId="portfolio-filter-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-[#0070BA] rounded-lg -z-10"
                  />
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contract Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No matching contracts found</div>
            <button
              onClick={() => setShowArchitect(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Generate New AI Contract
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((c, idx) => {
              const pct = c.totalAmount > 0 ? Math.round((c.releasedAmount / c.totalAmount) * 100) : 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    href={`/dashboard/contract/${c.id}`}
                    className="glass-panel rounded-2xl p-6 hover:border-[#0070BA]/50 transition-all duration-200 group flex flex-col justify-between space-y-5 h-full"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 font-semibold">
                            #{c.id}
                          </span>
                          <span
                            className={cn(
                              'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize',
                              statusBadge[c.status]
                            )}
                          >
                            {c.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{formatDate(c.createdAt)}</span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#0070BA] transition-colors leading-snug">
                        {c.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          Client: <strong className="text-slate-800">{c.clientName}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Agency: <strong className="text-slate-800">{c.freelancerName}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{c.milestones.length} Milestones</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-mono">
                          {formatCurrency(c.releasedAmount)} / {formatCurrency(c.totalAmount)} Disbursed ({pct}%)
                        </span>
                        <span className="flex items-center gap-1 text-[#0070BA] font-semibold group-hover:translate-x-1 transition-transform">
                          Open Command Center <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full bg-gradient-to-r from-[#0070BA] via-violet-500 to-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showArchitect && (
          <ContractArchitect
            onClose={() => setShowArchitect(false)}
            onContractCreated={(newContract) => {
              router.push(`/dashboard/contract/${newContract.id}`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PortfolioDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FC] text-slate-500 flex items-center justify-center font-mono text-xs">
          Loading Lancer AI Portfolio...
        </div>
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}
