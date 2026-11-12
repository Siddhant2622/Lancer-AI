'use client';

import { Persona } from '@/lib/types';
import { ScenarioType } from '@/lib/agent-simulator';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  RotateCcw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Cpu,
  Database,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';

export interface ServiceHealthState {
  gemini?: { configured: boolean; connected: boolean; model?: string; error?: string };
  supabase?: { configured: boolean; connected: boolean; buckets?: string[]; error?: string };
  paypal?: { configured: boolean; connected: boolean; clientId?: string; environment?: string; error?: string };
}

interface GodModeBarProps {
  persona: Persona;
  onPersonaChange: (p: Persona) => void;
  onScenario: (s: ScenarioType) => void;
  onReset: () => void;
  demoMode: boolean;
  onDemoToggle: () => void;
  isRunning: boolean;
  paypalCreds: { clientId: string; clientSecret: string };
  onPaypalCredsChange: (creds: { clientId: string; clientSecret: string }) => void;
  health: ServiceHealthState | null;
  onRefreshHealth: (override?: { clientId: string; clientSecret: string }) => Promise<void>;
}

const PERSONAS: { value: Persona; short: string }[] = [
  { value: 'client', short: 'Client View' },
  { value: 'freelancer', short: 'Freelancer / Agency' },
  { value: 'tribunal', short: 'AI Tribunal & Inspector' },
];

const SCENARIOS: { key: ScenarioType; short: string; icon: React.ReactNode; color: string }[] = [
  { key: 'A', short: 'A: 96% Pass', icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'emerald' },
  { key: 'B', short: 'B: 78% Partial', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'amber' },
  { key: 'C', short: 'C: 42% Fail', icon: <XCircle className="w-3.5 h-3.5" />, color: 'red' },
];

export default function GodModeBar({
  persona,
  onPersonaChange,
  onScenario,
  onReset,
  demoMode,
  onDemoToggle,
  isRunning,
  paypalCreds,
  onPaypalCredsChange,
  health,
  onRefreshHealth,
}: GodModeBarProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [clientId, setClientId] = useState(paypalCreds.clientId);
  const [clientSecret, setClientSecret] = useState(paypalCreds.clientSecret);
  const [testingCreds, setTestingCreds] = useState(false);

  const handleTestAndSave = async () => {
    setTestingCreds(true);
    const updated = { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
    onPaypalCredsChange(updated);
    await onRefreshHealth(updated);
    setTestingCreds(false);
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-sm">
      {/* Top Status & Hackathon Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-50/90 via-violet-50/90 to-emerald-50/90 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Shield className="w-3.5 h-3.5 text-[#0070BA]" />
          <span className="font-mono font-bold text-slate-800">JUDGE&apos;S GOD-MODE CONTROL BAR</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="hidden sm:inline text-slate-500">PayPal + AI Hackathon 2026</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            title={health?.gemini?.error || health?.gemini?.model || 'Checking Gemini AI...'}
            className={cn(
              'flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold',
              health?.gemini?.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <Cpu className="w-2.5 h-2.5" />
            Gemini: {health?.gemini?.connected ? health.gemini.model || 'Live' : health ? 'Fallback' : '...'}
          </span>

          <span
            title={health?.supabase?.error || `Buckets: ${health?.supabase?.buckets?.join(', ')}`}
            className={cn(
              'flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold',
              health?.supabase?.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            <Database className="w-2.5 h-2.5" />
            Supabase: {health?.supabase?.connected ? 'Connected' : health ? 'Offline' : '...'}
          </span>

          <span
            title={health?.paypal?.error || 'PayPal Sandbox OAuth Active'}
            className={cn(
              'flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold',
              health?.paypal?.connected
                ? 'bg-blue-50 text-[#0070BA] border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            <CreditCard className="w-2.5 h-2.5" />
            PayPal: {health?.paypal?.connected ? 'Sandbox Live' : 'Sim Fallback'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        {/* Gliding Segmented Persona Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
          {PERSONAS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPersonaChange(p.value)}
              className={cn(
                'relative px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer z-10',
                persona === p.value ? 'text-white' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {persona === p.value && (
                <motion.span
                  layoutId="persona-switcher-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-[#0070BA] rounded-lg shadow-sm -z-10"
                />
              )}
              {p.short}
            </button>
          ))}
        </div>

        <div className="hidden md:block h-6 w-px bg-slate-200" />

        {/* Scenario Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {SCENARIOS.map((s) => (
            <motion.button
              key={s.key}
              whileHover={!isRunning ? { y: -1, scale: 1.02 } : undefined}
              whileTap={!isRunning ? { scale: 0.97 } : undefined}
              onClick={() => !isRunning && onScenario(s.key)}
              disabled={isRunning}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-sm',
                isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                s.color === 'emerald' && 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
                s.color === 'amber' && 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
                s.color === 'red' && 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              )}
            >
              {s.icon}
              <span>[{s.short}]</span>
            </motion.button>
          ))}
        </div>

        <div className="hidden md:block h-6 w-px bg-slate-200" />

        {/* Reset */}
        <motion.button
          whileHover={!isRunning ? { scale: 1.02 } : undefined}
          whileTap={!isRunning ? { scale: 0.97 } : undefined}
          onClick={onReset}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </motion.button>

        {/* Credentials & Execution Mode */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              if (!showCredentials) {
                setClientId(paypalCreds.clientId);
                setClientSecret(paypalCreds.clientSecret);
              }
              setShowCredentials(!showCredentials);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            API Keys
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onDemoToggle}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-sm',
              demoMode
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {demoMode ? 'Instant Sim Mode' : 'Live Sandbox Mode'}
          </motion.button>
        </div>
      </div>

      {/* Animated Credentials Popover */}
      <AnimatePresence>
        {showCredentials && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full right-4 mt-2 w-[420px] max-w-[95vw] bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#0070BA]" />
                Live API &amp; PayPal Sandbox Credentials
              </h3>
              <button
                onClick={() => setShowCredentials(false)}
                className="text-xs text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Gemini 2.5 AI Engine</span>
                <span className={health?.gemini?.connected ? 'text-emerald-600 font-mono font-semibold' : 'text-amber-600 font-mono'}>
                  {health?.gemini?.connected ? `✓ Connected (${health.gemini.model})` : 'Fallback Active'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Supabase Proof Vault</span>
                <span className={health?.supabase?.connected ? 'text-emerald-600 font-mono font-semibold' : 'text-amber-600 font-mono'}>
                  {health?.supabase?.connected ? '✓ Connected' : 'Local Only'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">PayPal Sandbox OAuth</span>
                <span className={health?.paypal?.connected ? 'text-emerald-600 font-mono font-semibold' : 'text-amber-600 font-mono'}>
                  {health?.paypal?.connected ? '✓ Verified' : 'Needs Active Sandbox Secret'}
                </span>
              </div>
              {health?.paypal?.error && (
                <div className="text-[11px] text-amber-700 pt-1 border-t border-slate-200">
                  {health.paypal.error}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Override PayPal Sandbox Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Paste Sandbox Client ID (from developer.paypal.com)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0070BA]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Override PayPal Sandbox Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Paste Sandbox Client Secret"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0070BA]"
                />
              </div>
              <button
                onClick={handleTestAndSave}
                disabled={testingCreds}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#0070BA] hover:bg-[#005EA6] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {testingCreds ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Verifying Live OAuth Token...
                  </>
                ) : (
                  'Test & Apply PayPal Credentials'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
