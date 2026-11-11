'use client';

import { DeliveryCertificate } from '@/lib/types';
import { ScoreRing } from '@/components/ui/MotionPrimitives';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Download, X, Copy, ExternalLink, Database } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CertificateModalProps {
  certificate: DeliveryCertificate;
  onClose: () => void;
}

export default function CertificateModal({ certificate, onClose }: CertificateModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(certificate, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancer-ai-certificate-${certificate.milestoneId}-${certificate.captureId || 'proof'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = (s: number) =>
    s >= 90 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-red-600';

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
        <div className="bg-gradient-to-r from-blue-50 via-violet-50 to-emerald-50 border-b border-slate-200 p-5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-100 border border-blue-200">
              <Shield className="w-6 h-6 text-[#0070BA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Verification Certificate</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tamper-evident proof-of-delivery — Lancer AI Tribunal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Badge */}
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border',
              certificate.status === 'APPROVED' && 'bg-emerald-50 border-emerald-200',
              certificate.status === 'PARTIAL' && 'bg-amber-50 border-amber-200'
            )}
          >
            <CheckCircle2
              className={cn(
                'w-8 h-8',
                certificate.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'
              )}
            />
            <div>
              <div
                className={cn(
                  'text-lg font-bold',
                  certificate.status === 'APPROVED' ? 'text-emerald-800' : 'text-amber-800'
                )}
              >
                {certificate.status === 'APPROVED'
                  ? '✓ DELIVERABLE APPROVED'
                  : '⚡ PARTIAL SETTLEMENT APPROVED'}
              </div>
              <div className="text-xs text-slate-600">
                {certificate.milestoneTitle} — {new Date(certificate.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Supabase Immutable Storage Link */}
          {certificate.supabaseProofUrl && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 min-w-0">
                <Database className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="font-semibold flex-shrink-0">Stored on Supabase Vault:</span>
                <span className="font-mono text-emerald-700 truncate">{certificate.supabaseProofUrl}</span>
              </div>
              <a
                href={certificate.supabaseProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-shrink-0"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Animated Agent Score Rings */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              AI Tribunal Rubric Scores
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Agent 1\nCode & CI/CD', score: certificate.agent1Score, style: 'border-violet-200 bg-violet-50/70' },
                { label: 'Agent 2\nFigma Vision', score: certificate.agent2Score, style: 'border-sky-200 bg-sky-50/70' },
                { label: 'Agent 3\nFinancial Arbiter', score: certificate.agent3Score, style: 'border-emerald-200 bg-emerald-50/70' },
              ].map(({ label, score, style }) => (
                <div key={label} className={cn('rounded-xl border p-3 flex flex-col items-center text-center gap-1.5', style)}>
                  <ScoreRing score={score} size={52} strokeWidth={5} />
                  <div className="text-[10px] text-slate-600 whitespace-pre-line font-semibold">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-sm bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
              <span className="text-slate-600 font-medium">Overall Tribunal Score</span>
              <span className={cn('text-xl font-bold font-mono', scoreColor(certificate.overallScore))}>
                {certificate.overallScore}/100
              </span>
            </div>
          </div>

          {/* Passed Checks */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Verified Checks
            </h3>
            <ul className="space-y-1.5">
              {certificate.passedChecks.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Cryptographic Hashes */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Cryptographic Proof
            </h3>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 font-mono text-xs">
              {[
                { label: 'SHA-256 Deliverable Hash', value: certificate.deliverableHash },
                { label: 'GitHub Commit Hash', value: certificate.commitHash },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-slate-500 text-[10px] mb-0.5">{label}</div>
                  <div className="text-emerald-700 font-semibold break-all text-[10px] leading-relaxed">{value}</div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 grid grid-cols-1 gap-1.5">
                {[
                  { label: 'PayPal Order ID', value: certificate.orderId },
                  { label: 'Authorization ID', value: certificate.authorizationId },
                  { label: 'Partial Capture ID', value: certificate.captureId || 'N/A' },
                  { label: 'Batch Payout ID', value: certificate.batchPayoutId || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-slate-500 text-[10px] flex-shrink-0">{label}</span>
                    <span className="text-[#0070BA] text-[10px] font-mono font-semibold text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chargeback Shield Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-xs">
              <div className="text-emerald-800 font-bold mb-0.5">Chargeback Shield Active</div>
              <div className="text-slate-600">
                This certificate is registered with PayPal Disputes API. If a dispute is raised,
                this audit log is automatically submitted as proof-of-delivery via the{' '}
                <span className="font-mono text-slate-800 font-semibold">provide-evidence</span> action.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-300 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied JSON!' : 'Copy JSON'}
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-2 px-4 py-2 bg-[#0070BA] hover:bg-[#005EA6] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Proof JSON
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-300 cursor-pointer"
          >
            Print / Save PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}
