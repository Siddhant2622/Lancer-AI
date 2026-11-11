'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Calendar, DollarSign, Loader2, CheckCircle2, Cpu } from 'lucide-react';
import { Contract } from '@/lib/types';

interface ContractArchitectProps {
  onClose: () => void;
  onContractCreated: (contract: Contract) => void;
  paypalCreds?: { clientId: string; clientSecret: string };
  simulate?: boolean;
}

const SAMPLE_PROMPTS = [
  'Build a React Native fitness app with PayPal in-app purchases for $6,000 over 4 weeks',
  'Create a Shopify-to-WooCommerce migration with payment gateway swap for $3,500',
  'Design and develop a SaaS dashboard with PayPal billing & webhooks for $8,000 in 6 weeks',
];

interface GeneratedMilestone {
  title: string;
  description?: string;
  amount: number;
  duration: string;
  criteria: string[];
}

export default function ContractArchitect({
  onClose,
  onContractCreated,
  paypalCreds,
  simulate = false,
}: ContractArchitectProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [poweredBy, setPoweredBy] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('');
  const [generated, setGenerated] = useState<GeneratedMilestone[] | null>(null);
  const [step, setStep] = useState<'input' | 'preview' | 'funded'>('input');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/agent/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate contract');
      }

      setContractTitle(data.contractTitle || prompt);
      setGenerated(data.milestones);
      setPoweredBy(data.poweredBy || 'gemini_live');
      setModelUsed(data.modelUsed || '');
      setStep('preview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFund = async () => {
    if (!generated) return;
    setIsGenerating(true);
    setErrorMsg(null);
    const total = generated.reduce((s, m) => s + Number(m.amount), 0);
    const newId = `ESC-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const orderRes = await fetch('/api/paypal/create-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: newId,
          amount: total,
          description: contractTitle,
          milestones: generated.map((m) => ({ title: m.title, amount: m.amount })),
          simulate,
          paypalClientId: paypalCreds?.clientId,
          paypalClientSecret: paypalCreds?.clientSecret,
        }),
      });
      const orderData = await orderRes.json();

      const saveRes = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          title: contractTitle,
          milestones: generated,
          orderId: orderData.orderId,
          authorizationId: orderData.authorizationId,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || 'Failed to save contract');
      }

      await fetch('/api/paypal/authorize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          contractId: newId,
          amount: total,
          simulate: orderData.apiMode === 'simulated_sandbox',
          paypalClientId: paypalCreds?.clientId,
          paypalClientSecret: paypalCreds?.clientSecret,
        }),
      });

      setStep('funded');
      setTimeout(() => {
        onContractCreated(saveData.contract);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Funding error');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalAmount = generated?.reduce((s, m) => s + Number(m.amount), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-blue-50 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 border border-violet-200">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Contract Architect</h2>
              <p className="text-xs text-slate-600">
                Powered by Gemini AI — describe your project to generate verifiable milestones &amp; PayPal escrow
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Input Step */}
          {step === 'input' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Describe your project
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Build a React Native fitness app with PayPal in-app purchases for $6,000 over 4 weeks"
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Or try a sample:</div>
                <div className="space-y-2">
                  {SAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrompt(p)}
                      className="w-full text-left text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-colors cursor-pointer"
                    >
                      &ldquo;{p}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating Smart Contract with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Smart Contract
                  </>
                )}
              </button>
            </>
          )}

          {/* Preview Step */}
          {step === 'preview' && generated && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{contractTitle}</h3>
                  {poweredBy === 'gemini_live' && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-semibold mt-0.5">
                      <Cpu className="w-3 h-3" />
                      Generated live via Gemini ({modelUsed || 'gemini-2.5-flash'})
                    </div>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Total: ${totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3">
                {generated.map((m, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-lg font-mono">
                          M{i + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{m.title}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-700">
                          ${Number(m.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" /> {m.duration}
                        </div>
                      </div>
                    </div>
                    {m.description && (
                      <p className="text-xs text-slate-600 mb-2">{m.description}</p>
                    )}
                    <ul className="space-y-1">
                      {m.criteria.map((c, j) => (
                        <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* PayPal Authorization Trigger */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <DollarSign className="w-4 h-4 text-[#0070BA]" />
                  Fund Escrow via PayPal
                  <span className="text-xs font-mono text-slate-500 font-normal">(intent: AUTHORIZE)</span>
                </div>
                <div className="text-xs text-slate-600">
                  Funds will be authorized and held in escrow — no money changes hands until each milestone passes AI Tribunal audit.
                </div>
                <button
                  onClick={handleFund}
                  disabled={isGenerating}
                  className="w-full py-3 bg-[#0070BA] hover:bg-[#005EA6] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Authorizing ${totalAmount.toLocaleString()}...
                    </>
                  ) : (
                    <span>Authorize ${totalAmount.toLocaleString()} with PayPal &amp; Activate Contract</span>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Funded Step */}
          {step === 'funded' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Escrow Funded &amp; Contract Active!</h3>
              <p className="text-sm text-slate-600">
                ${totalAmount.toLocaleString()} has been authorized and persisted in PayPal escrow.
                Loading your live Gantt timeline...
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
