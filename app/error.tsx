'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Lancer AI Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F6F8FC] bg-fintech-grid flex items-center justify-center p-6">
      <div className="glass-panel-elevated rounded-3xl max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Unexpected Application Error</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error.message || 'An unexpected error occurred while rendering this escrow contract view.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005EA6] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Portfolio Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

