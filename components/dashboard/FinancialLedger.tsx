'use client';

import { LedgerEntry } from '@/lib/types';
import { formatCurrency, formatTimestamp, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  TrendingUp,
  Users,
  FileText,
  Bot,
  Shield,
  Filter,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Copy,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';

interface FinancialLedgerProps {
  entries: LedgerEntry[];
}

const eventConfig = {
  ORDER_AUTHORIZED: {
    label: 'Order Authorized',
    icon: <Lock className="w-3.5 h-3.5" />,
    color: 'text-[#0070BA] bg-blue-50 border-blue-200',
  },
  PARTIAL_CAPTURE: {
    label: 'Partial Capture',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  SPLIT_PAYOUT: {
    label: 'Split Payout',
    icon: <Users className="w-3.5 h-3.5" />,
    color: 'text-violet-700 bg-violet-50 border-violet-200',
  },
  INVOICE_GENERATED: {
    label: 'Invoice Generated',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-slate-700 bg-slate-100 border-slate-200',
  },
  AI_EVALUATION: {
    label: 'AI Evaluation',
    icon: <Bot className="w-3.5 h-3.5" />,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  DISPUTE_SHIELD: {
    label: 'Dispute Shield',
    icon: <Shield className="w-3.5 h-3.5" />,
    color: 'text-teal-700 bg-teal-50 border-teal-200',
  },
};

const statusBadge = {
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  failed: 'text-red-700 bg-red-50 border-red-200',
};

function getPayload(entry: LedgerEntry) {
  if (entry.requestPayload || entry.responsePayload) {
    return {
      request: entry.requestPayload || { ref: entry.paypalRefId },
      response: entry.responsePayload || { status: entry.status },
    };
  }
  if (entry.eventType === 'ORDER_AUTHORIZED') {
    return {
      request: {
        intent: 'AUTHORIZE',
        purchase_units: [{ reference_id: 'ESC-8842', amount: { currency_code: 'USD', value: '4000.00' } }],
      },
      response: {
        id: entry.paypalRefId,
        status: 'CREATED',
        links: [{ href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/...', rel: 'approve' }],
      },
    };
  }
  if (entry.eventType === 'PARTIAL_CAPTURE') {
    return {
      request: { amount: { currency_code: 'USD', value: entry.grossAmount.toFixed(2) }, final_capture: false },
      response: {
        id: entry.paypalRefId,
        status: 'COMPLETED',
        seller_receivable_breakdown: { gross_amount: { value: entry.grossAmount.toFixed(2) } },
      },
    };
  }
  if (entry.eventType === 'SPLIT_PAYOUT') {
    return {
      request: {
        sender_batch_header: { sender_batch_id: 'ESCROW_2026_M1_DISBURSE' },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: { value: entry.grossAmount.toFixed(2), currency: 'USD' },
            receiver: entry.recipientEmail,
          },
        ],
      },
      response: { batch_header: { payout_batch_id: entry.paypalRefId, batch_status: 'SUCCESS' } },
    };
  }
  return { request: { ref: entry.paypalRefId }, response: { status: entry.status } };
}

function getSdkSnippet(entry: LedgerEntry, requestObj: Record<string, unknown>) {
  const endpointMap: Record<LedgerEntry['eventType'], string> = {
    ORDER_AUTHORIZED: 'POST https://api-m.sandbox.paypal.com/v2/checkout/orders',
    PARTIAL_CAPTURE: `POST https://api-m.sandbox.paypal.com/v2/payments/authorizations/${entry.paypalRefId}/capture`,
    SPLIT_PAYOUT: 'POST https://api-m.sandbox.paypal.com/v1/payments/payouts',
    INVOICE_GENERATED: 'POST https://api-m.sandbox.paypal.com/v2/invoicing/invoices',
    DISPUTE_SHIELD: `POST https://api-m.sandbox.paypal.com/v1/customer/disputes/${entry.paypalRefId}/provide-evidence`,
    AI_EVALUATION: 'POST /api/agent/verify-milestone',
  };
  const endpoint = endpointMap[entry.eventType];
  const [method, url] = endpoint.split(' ');

  return `// Lancer AI TypeScript / APIMatic-Compatible SDK Call
const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${process.env.PAYPAL_ACCESS_TOKEN}\`,
  },
  body: JSON.stringify(${JSON.stringify(requestObj, null, 2)}),
});
const data = await response.json();`;
}

export default function FinancialLedger({ entries }: FinancialLedgerProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [slideOver, setSlideOver] = useState<LedgerEntry | null>(null);
  const [drawerTab, setDrawerTab] = useState<'json' | 'sdk'>('json');
  const [copiedCode, setCopiedCode] = useState(false);

  const filtered = entries
    .filter((e) => filterType === 'all' || e.eventType === filterType)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.milestoneRef.toLowerCase().includes(q) ||
        e.paypalRefId.toLowerCase().includes(q) ||
        e.recipientEmail.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortAsc ? diff : -diff;
    });

  const eventTypes = [...new Set(entries.map((e) => e.eventType))];

  const handleExportCsv = () => {
    const header = [
      'Timestamp',
      'Event Type',
      'Milestone',
      'PayPal Ref ID',
      'Recipient',
      'Gross Amount',
      'AI Score',
      'Status',
    ];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.eventType,
      `"${e.milestoneRef.replace(/"/g, '""')}"`,
      e.paypalRefId,
      e.recipientEmail,
      e.grossAmount.toFixed(2),
      e.aiConfidenceScore ?? '',
      e.status,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancer-ai-audit-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            AG Grid-Style Financial Ledger &amp; Audit Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any transaction row to inspect live PayPal REST payloads and TypeScript SDK snippets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter ref ID or email..."
              className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:border-[#0070BA] w-44"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white text-xs text-slate-700 outline-none cursor-pointer font-medium"
            >
              <option value="all">All Events ({entries.length})</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {eventConfig[t].label}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </motion.button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1fr_1.4fr_1.4fr_1.1fr_0.9fr_0.7fr_0.6fr_0.6fr] gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <button className="flex items-center gap-1 text-left cursor-pointer" onClick={() => setSortAsc(!sortAsc)}>
              Timestamp {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <span>Event Type</span>
            <span>Milestone</span>
            <span>PayPal Ref ID</span>
            <span>Recipient</span>
            <span>Amount</span>
            <span>AI Score</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-slate-200/80 bg-white">
            {filtered.map((entry, idx) => {
              const cfg = eventConfig[entry.eventType];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                  className="grid grid-cols-[1fr_1.4fr_1.4fr_1.1fr_0.9fr_0.7fr_0.6fr_0.6fr] gap-2 px-4 py-3 hover:bg-blue-50/50 transition-colors cursor-pointer text-xs items-center"
                  onClick={() => {
                    setSlideOver(entry);
                    setDrawerTab('json');
                  }}
                >
                  <span className="text-slate-500 font-mono text-[10px]">{formatTimestamp(entry.timestamp)}</span>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-0.5 rounded-md border w-fit text-[10px] font-semibold',
                      cfg.color
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  <span className="text-slate-800 font-medium truncate text-[11px]">{entry.milestoneRef}</span>
                  <span className="font-mono text-slate-600 text-[10px] truncate">{entry.paypalRefId}</span>
                  <span className="text-slate-600 text-[10px] truncate">
                    {entry.recipientEmail === '—' ? '—' : entry.recipientEmail.split('@')[0]}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] tabular-nums">
                    {entry.grossAmount > 0 ? formatCurrency(entry.grossAmount) : '—'}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-semibold text-[11px]',
                      entry.aiConfidenceScore
                        ? entry.aiConfidenceScore >= 90
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                        : 'text-slate-300'
                    )}
                  >
                    {entry.aiConfidenceScore ? `${entry.aiConfidenceScore}%` : '—'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full border font-bold',
                        statusBadge[entry.status]
                      )}
                    >
                      {entry.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animated Slide-Over API & APIMatic SDK Drawer */}
      <AnimatePresence>
        {slideOver && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSlideOver(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full max-w-xl bg-white border-l border-slate-200 h-full overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 p-5 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{eventConfig[slideOver.eventType].label}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{slideOver.paypalRefId}</p>
                </div>
                <button onClick={() => setSlideOver(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Timestamp', value: formatTimestamp(slideOver.timestamp) },
                    { label: 'Status', value: slideOver.status.toUpperCase() },
                    { label: 'Gross Amount', value: slideOver.grossAmount > 0 ? formatCurrency(slideOver.grossAmount) : '—' },
                    { label: 'AI Confidence', value: slideOver.aiConfidenceScore ? `${slideOver.aiConfidenceScore}%` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">{label}</div>
                      <div className="text-sm font-mono text-slate-900 font-semibold">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Drawer Mode Tabs with Gliding Pill */}
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setDrawerTab('json')}
                    className={cn(
                      'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer z-10',
                      drawerTab === 'json' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {drawerTab === 'json' && (
                      <motion.span
                        layoutId="ledger-drawer-tab"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-[#0070BA] rounded-lg -z-10"
                      />
                    )}
                    PayPal REST JSON
                  </button>
                  <button
                    onClick={() => setDrawerTab('sdk')}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer z-10',
                      drawerTab === 'sdk' ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {drawerTab === 'sdk' && (
                      <motion.span
                        layoutId="ledger-drawer-tab"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-violet-600 rounded-lg -z-10"
                      />
                    )}
                    <Terminal className="w-3.5 h-3.5" />
                    APIMatic / TypeScript SDK
                  </button>
                </div>

                {(() => {
                  const payload = getPayload(slideOver);
                  const sdkCode = getSdkSnippet(slideOver, payload.request);

                  if (drawerTab === 'sdk') {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            TypeScript Fetch / SDK Snippet
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sdkCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 1800);
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-[#0070BA] hover:text-[#005EA6] cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedCode ? 'Copied!' : 'Copy Snippet'}
                          </button>
                        </div>
                        <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-violet-300 overflow-x-auto leading-relaxed">
                          {sdkCode}
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Request Payload
                        </div>
                        <pre className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] font-mono text-slate-800 overflow-x-auto">
                          {JSON.stringify(payload.request, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Response
                        </div>
                        <pre className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-[11px] font-mono text-emerald-900 overflow-x-auto">
                          {JSON.stringify(payload.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
