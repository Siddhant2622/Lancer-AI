import Link from 'next/link';
import { Shield, ArrowLeft, Layers } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F6F8FC] bg-fintech-grid flex items-center justify-center p-6">
      <div className="glass-panel-elevated rounded-3xl max-w-md w-full p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7 text-[#0070BA]" />
        </div>
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-[#0070BA] uppercase tracking-wider">404 • Not Found</div>
          <h1 className="text-xl font-bold text-slate-900">Escrow Resource Not Found</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The contract or route you requested could not be located. Return to the portfolio hub or open the flagship contract.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard/contract/ESC-8842"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0070BA] hover:bg-[#005EA6] text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Flagship Demo (#ESC-8842)
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

