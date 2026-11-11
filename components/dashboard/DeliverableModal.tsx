'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, GitPullRequest, Link2, FileText, Upload, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface DeliverableModalProps {
  milestoneTitle: string;
  milestoneId: string;
  onClose: () => void;
  onSubmit: (data: {
    githubPR: string;
    stagingUrl: string;
    figmaUrl: string;
    notes: string;
    screenshotBase64?: string;
  }) => Promise<void> | void;
}

export default function DeliverableModal({
  milestoneTitle,
  milestoneId,
  onClose,
  onSubmit,
}: DeliverableModalProps) {
  const [githubPR, setGithubPR] = useState('https://github.com/vercel/next.js/pull/74000');
  const [stagingUrl, setStagingUrl] = useState('https://nextjs.org');
  const [figmaUrl, setFigmaUrl] = useState('https://figma.com/file/abc123/checkout-redesign');
  const [notes, setNotes] = useState(
    'Implemented PayPal Orders v2 AUTHORIZE flow, webhook handler for PAYMENT.CAPTURE.COMPLETED, and responsive checkout cart UI with unit tests.'
  );
  const [screenshotBase64, setScreenshotBase64] = useState<string | undefined>(undefined);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ githubPR, stagingUrl, figmaUrl, notes, screenshotBase64 });
    } finally {
      setSubmitting(false);
    }
  };

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
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-blue-50 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Submit Deliverable for AI Audit</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {milestoneId.toUpperCase()} — {milestoneTitle}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-violet-600" /> GitHub PR URL
              <span className="text-[10px] font-normal text-slate-400">(live GitHub REST API inspected)</span>
            </label>
            <input
              type="url"
              value={githubPR}
              onChange={(e) => setGithubPR(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#0070BA]" /> Live Staging URL
              <span className="text-[10px] font-normal text-slate-400">(HTTP &amp; DOM probed live)</span>
            </label>
            <input
              type="url"
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0070BA] focus:bg-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#0D99FF]" /> Figma Design Spec URL
            </label>
            <input
              type="url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0D99FF] focus:bg-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#0D99FF]" /> UI Snapshot (Optional — Gemini Vision + Supabase)
            </label>
            <label className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#0D99FF] transition-colors">
              <span className="text-xs text-slate-600 truncate">
                {screenshotName || 'Attach PNG/JPG UI preview for multimodal vision audit...'}
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#0D99FF] ml-2 flex-shrink-0">Browse</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Delivery Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-900">
            <Upload className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
            Submission triggers live Gemini 3-Agent AI Tribunal, GitHub PR scan, HTTP probe, and PayPal Partial Capture.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!githubPR || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Running Live AI Audit...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Submit for Live AI Audit
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
