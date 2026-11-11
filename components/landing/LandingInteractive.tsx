'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Scale,
  Lock,
  ArrowRight,
  CheckCircle2,
  Users,
  Bot,
  Cpu,
  Layers,
  Code2,
  Eye,
  Database,
  Figma,
  Sparkles,
} from 'lucide-react';
import { ScoreRing } from '@/components/ui/MotionPrimitives';
import { cn } from '@/lib/utils';

const DEMO_TABS = [
  {
    id: 'authorize',
    label: '1. Lock Funds',
    badge: 'Orders v2 AUTHORIZE',
    title: 'Escrow Budget Reserved',
    amount: '$4,000.00 USD',
    sub: 'Authorization ID: AUTH-9XK284710L • Zero capture upfront',
    metrics: [
      { name: 'Milestone 1: Architecture', val: '$1,000.00', status: 'Funded' },
      { name: 'Milestone 2: Payment & Cart UI', val: '$1,500.00', status: 'Active Lock' },
      { name: 'Milestone 3: QA & Handover', val: '$1,500.00', status: 'Reserved' },
    ],
  },
  {
    id: 'tribunal',
    label: '2. 3-Agent Audit',
    badge: 'Gemini 2.5 Tribunal',
    title: 'Autonomous Consensus Reached',
    amount: '96 / 100 Score',
    sub: 'GitHub PR #48 + Staging HTTP 200 + Figma Spec Parity Verified',
    scores: [
      { name: 'Agent 1 • Code & CI', score: 98 },
      { name: 'Agent 2 • Figma Vision', score: 94 },
      { name: 'Agent 3 • Risk Arbiter', score: 96 },
    ],
  },
  {
    id: 'payout',
    label: '3. Split Payout',
    badge: 'Captures v2 + Payouts v1',
    title: 'Partial Capture & Batch Disbursed',
    amount: '$1,500.00 Released',
    sub: 'final_capture: false • $1,500.00 remains locked for M3',
    splits: [
      { role: 'Lead Backend Dev (70%)', email: 'lead-dev@nexus.example', val: '$1,050.00' },
      { role: 'UI/UX Architect (30%)', email: 'ui-architect@nexus.example', val: '$450.00' },
    ],
  },
] as const;

export default function LandingInteractive() {
  const [activeTab, setActiveTab] = useState<'authorize' | 'tribunal' | 'payout'>('tribunal');
  const currentTab = DEMO_TABS.find((t) => t.id === activeTab) || DEMO_TABS[1];

  const steps = [
    {
      num: '01',
      title: 'Text-to-Escrow Contract',
      desc: 'Describe your project in plain English. Gemini AI generates a milestone roadmap with machine-testable acceptance criteria.',
      icon: <Bot className="w-6 h-6 text-violet-600" />,
      badge: 'Gemini 2.5 Flash',
      iconBg: 'bg-violet-50 border-violet-200',
    },
    {
      num: '02',
      title: 'Reserve Funds via AUTHORIZE',
      desc: 'Client authorizes the total budget with PayPal Orders v2 (intent: AUTHORIZE). Zero funds leave upfront.',
      icon: <Lock className="w-6 h-6 text-[#0070BA]" />,
      badge: 'Orders v2 API',
      iconBg: 'bg-blue-50 border-blue-200',
    },
    {
      num: '03',
      title: '3-Agent Deliverable Audit',
      desc: 'Freelancer links a GitHub PR, staging URL & Figma spec. Code Auditor, Vision Inspector, and Risk Arbiter verify in parallel.',
      icon: <Zap className="w-6 h-6 text-amber-600" />,
      badge: 'GitHub + Figma Vision',
      iconBg: 'bg-amber-50 border-amber-200',
    },
    {
      num: '04',
      title: 'Partial Capture & Split Payout',
      desc: 'Passing milestones execute PayPal Partial Captures (final_capture: false) and split batch payouts across the agency squad.',
      icon: <Scale className="w-6 h-6 text-emerald-600" />,
      badge: 'Captures + Payouts',
      iconBg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  const features = [
    {
      title: '3-Agent AI Arbitration Tribunal',
      desc: 'AST diff scanning, live GitHub CI verification, multimodal Figma-to-DOM inspection slider, and consensus risk scoring.',
      icon: <Scale className="w-5 h-5 text-violet-600" />,
      bg: 'bg-violet-50 border-violet-200',
    },
    {
      title: 'AI Mediated Partial Settlement',
      desc: 'When work is 78–89% ready, AI prevents deadlocked disputes by releasing a proportional slice and creating a dual-signature sub-milestone hold.',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      title: 'Micro-Agency Batch Split Payouts',
      desc: 'Customize squad member revenue splits (e.g., 70% Backend / 30% UI Architect) and disburse simultaneously via PayPal Payouts v1.',
      icon: <Users className="w-5 h-5 text-[#0070BA]" />,
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'SHA-256 Dispute Shield & A2A Ready',
      desc: 'Tamper-evident certificates stored on Supabase Vault auto-attach to PayPal Disputes API, with an open /.well-known/agent.json A2A manifest.',
      icon: <Shield className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div className="min-h-screen bg-fintech-grid text-slate-900 overflow-x-hidden">
      {/* Top Announcement Ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 bg-gradient-to-r from-blue-50 via-violet-50 to-emerald-50 border-b border-slate-200"
      >
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <Shield className="w-4 h-4 text-[#0070BA]" />
          <span className="font-semibold">Build What&apos;s Next with PayPal &amp; AI — Hackathon 2026</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Gemini + Supabase + PayPal Sandbox Live
          </span>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 4, scale: 1.05 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0070BA] to-violet-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-[#0070BA]/25"
          >
            LA
          </motion.div>
          <div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Lancer <span className="text-[#0070BA]">AI</span>
            </span>
            <div className="text-[10px] font-mono text-slate-500">AUTONOMOUS ESCROW ENGINE</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/workspace"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold shadow-sm transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Real Workspace
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#0070BA]" />
            Portfolio Hub
          </Link>
          <Link
            href="/api/agent/capabilities"
            target="_blank"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-mono shadow-sm transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
            A2A Spec
          </Link>
          <Link
            href="/dashboard/contract/ESC-8842"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005EA6] text-white font-semibold rounded-xl transition-all shadow-md shadow-[#0070BA]/25 text-sm"
          >
            Launch Live Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Split Interactive Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          {/* Left Column: Value Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span className="font-medium">Autonomous Escrow for the Agentic Economy</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-900">
              Milestone Escrow Powered by{' '}
              <span className="text-[#0070BA]">PayPal</span> &amp;{' '}
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                AI Arbitration
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Lock project budgets using PayPal Orders v2{' '}
              <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-sm">
                AUTHORIZE
              </span>
              . A 3-Agent AI Tribunal audits GitHub PRs, staging deployments, and Figma UI specs before
              automatically releasing partial captures and squad split payouts.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-gradient-to-r from-[#0070BA] to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-[#0070BA]/25 text-sm sm:text-base"
                >
                  <Zap className="w-5 h-5" />
                  Start Real Project Workspace
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/contract/ESC-8842"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-2xl shadow-sm text-sm sm:text-base"
                >
                  Enter Judge&apos;s God-Mode Console
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-2xl shadow-sm text-sm sm:text-base"
                >
                  <Layers className="w-4 h-4 text-[#0070BA]" />
                  Open Portfolio Hub
                </Link>
              </motion.div>
            </div>

            {/* Compact Trust Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 max-w-lg">
              {[
                { val: '< 60s', label: 'AI Arbitration' },
                { val: '0%', label: 'Escrow Fee' },
                { val: 'SHA-256', label: 'Dispute Shield' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-900">{stat.val}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Interactive Floating Stripe/Figma-Style Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Ambient Glow Behind Card */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#0070BA]/15 via-violet-500/15 to-emerald-500/15 rounded-[36px] blur-2xl pointer-events-none" />

            <div className="relative">
              {/* Figma Frame Tag */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg bg-[#0D99FF] text-white text-[11px] font-mono font-semibold shadow-sm">
                <Figma className="w-3 h-3" />
                <span>❖ Interactive Preview • Click Stages</span>
              </div>

              <div className="relative glass-panel-elevated rounded-b-3xl rounded-tr-3xl p-5 sm:p-6 border-2 border-[#0D99FF]/45 space-y-5">
                {/* Selection Handles */}
                <span className="w-2.5 h-2.5 bg-white border-2 border-[#0D99FF] absolute -top-1.5 -left-1.5 rounded-[2px]" />
                <span className="w-2.5 h-2.5 bg-white border-2 border-[#0D99FF] absolute -top-1.5 -right-1.5 rounded-[2px]" />
                <span className="w-2.5 h-2.5 bg-white border-2 border-[#0D99FF] absolute -bottom-1.5 -left-1.5 rounded-[2px]" />
                <span className="w-2.5 h-2.5 bg-white border-2 border-[#0D99FF] absolute -bottom-1.5 -right-1.5 rounded-[2px]" />

                {/* Interactive Stage Switcher with Gliding layoutId Pill */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {DEMO_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'relative py-2 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer z-10',
                        activeTab === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {activeTab === tab.id && (
                        <motion.span
                          layoutId="landing-preview-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 bg-[#0070BA] rounded-lg shadow-sm -z-10"
                        />
                      )}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Animated Tab Panel */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0070BA] border border-blue-200">
                          {currentTab.badge}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">{currentTab.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{currentTab.sub}</p>
                      </div>
                      <div className="text-right font-mono font-bold text-lg text-[#0070BA] whitespace-nowrap">
                        {currentTab.amount}
                      </div>
                    </div>

                    {'metrics' in currentTab && (
                      <div className="space-y-2">
                        {currentTab.metrics.map((m) => (
                          <div
                            key={m.name}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                          >
                            <span className="font-semibold text-slate-800">{m.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{m.val}</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0070BA] border border-blue-200 text-[10px] font-semibold">
                                {m.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {'scores' in currentTab && (
                      <div className="grid grid-cols-3 gap-3">
                        {currentTab.scores.map((s) => (
                          <div
                            key={s.name}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center gap-2"
                          >
                            <ScoreRing score={s.score} size={56} strokeWidth={5} />
                            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                              {s.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {'splits' in currentTab && (
                      <div className="space-y-2.5">
                        {currentTab.splits.map((s) => (
                          <div
                            key={s.role}
                            className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{s.role}</div>
                              <div className="text-[11px] font-mono text-slate-500">{s.email}</div>
                            </div>
                            <div className="text-sm font-mono font-bold text-emerald-700">{s.val}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Animated Settlement Choreography Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-16 glass-panel rounded-3xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-700 font-semibold">
                Autonomous Settlement Choreography • Live Pipeline
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0070BA] border border-blue-200 font-semibold">
                Orders v2
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
                Gemini 2.5 Tribunal
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Supabase Proof Vault
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {[
              {
                icon: <Lock className="w-4 h-4 text-[#0070BA]" />,
                title: '1. Escrow Vault Locked',
                metric: '$4,000.00 USD',
                detail: 'POST /v2/checkout/orders • AUTHORIZE',
                tone: 'border-blue-200 bg-blue-50/70',
              },
              {
                icon: <Code2 className="w-4 h-4 text-violet-600" />,
                title: '2. Agent 1: Code & CI',
                metric: '98 / 100 Score',
                detail: 'GitHub PR AST + Secret Scan + Tests',
                tone: 'border-violet-200 bg-violet-50/70',
              },
              {
                icon: <Eye className="w-4 h-4 text-[#0D99FF]" />,
                title: '3. Agent 2: Figma Vision',
                metric: '94 / 100 Parity',
                detail: 'Figma Spec vs Live DOM Comparison',
                tone: 'border-sky-200 bg-sky-50/70',
              },
              {
                icon: <Database className="w-4 h-4 text-emerald-600" />,
                title: '4. Capture & Split Pay',
                metric: '70% Dev / 30% UI',
                detail: 'Captures v2 + Payouts v1 + SHA-256',
                tone: 'border-emerald-200 bg-emerald-50/70',
              },
            ].map((node, i) => (
              <motion.div
                key={node.title}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className={`rounded-2xl border p-4 space-y-2 relative ${node.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{node.title}</span>
                  {node.icon}
                </div>
                <div className="text-lg font-bold font-mono text-slate-900">{node.metric}</div>
                <div className="text-[11px] font-mono text-slate-600">{node.detail}</div>
                {i < 3 && (
                  <div className="hidden md:flex items-center justify-center absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm text-[#0070BA]">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">How Lancer AI Works</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            From natural-language prompt to verified PayPal split payout in 4 autonomous stages
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, idx) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -5 }}
              className="glass-panel rounded-2xl p-6 space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl border ${s.iconBg}`}>{s.icon}</div>
                <span className="font-mono text-2xl font-bold text-slate-300">{s.num}</span>
              </div>
              <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                {s.badge}
              </span>
              <h3 className="font-bold text-slate-900 text-base">{s.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3-Agent Architecture */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="text-center mb-12">
          <div className="text-xs font-mono text-violet-600 font-semibold uppercase tracking-widest mb-2">
            Multi-Agent Consensus Engine
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">The 3-Agent Arbitration Tribunal</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            Instead of relying on a single LLM prompt, Lancer AI separates technical verification, visual UX
            inspection, and financial settlement into three specialized agents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              agent: 'Agent 1 • 60% Weight',
              title: 'Spec & Code Auditor',
              desc: 'Queries live GitHub PR diffs & changed files, validates CI results, detects leaked secrets, and evaluates acceptance criteria.',
              checks: [
                'Live GitHub PR REST inspection',
                'AST secret & credential scan',
                'CI/CD test coverage check',
                'Lighthouse & lint rubric',
              ],
              badgeClass: 'text-violet-700 bg-violet-50 border-violet-200',
            },
            {
              agent: 'Agent 2 • 40% Weight',
              title: 'Multimodal Vision & UX Inspector',
              desc: 'Probes live staging deployments, checks PayPal SDK presence, and compares uploaded UI screenshots against Figma specs via Gemini Vision.',
              checks: [
                'Figma vs Live DOM diff slider',
                'Live HTTP & TTFB probe',
                'PayPal SDK mount detection',
                'Mobile & WCAG AA audit',
              ],
              badgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
            },
            {
              agent: 'Agent 3 • Consensus',
              title: 'Financial & Risk Arbiter',
              desc: 'Synthesizes weighted scores, executes PayPal Partial Captures, routes squad split payouts, and persists SHA-256 proof to Supabase.',
              checks: [
                'Weighted score consensus',
                'Partial Capture (final: false)',
                'Dual-signature mediation holds',
                'Supabase + Dispute Shield proof',
              ],
              badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            },
          ].map((a, idx) => (
            <motion.div
              key={a.agent}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-panel rounded-2xl p-6 space-y-4"
            >
              <span
                className={`inline-block text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${a.badgeClass}`}
              >
                {a.agent}
              </span>
              <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{a.desc}</p>
              <ul className="space-y-2 pt-3 border-t border-slate-200">
                {a.checks.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, idx) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className="glass-panel flex gap-4 p-6 rounded-2xl"
            >
              <div className={`p-3 rounded-xl border h-fit flex-shrink-0 ${f.bg}`}>{f.icon}</div>
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6 border-t border-slate-200">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Experience Lancer AI Live</h2>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          Evaluate all three settlement scenarios, customize squad payout splits, or submit a live GitHub PR for Gemini AI inspection.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/dashboard/contract/ESC-8842"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0070BA] to-violet-600 text-white font-bold rounded-2xl shadow-lg shadow-[#0070BA]/20"
            >
              Open Hackathon Demo Console
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

