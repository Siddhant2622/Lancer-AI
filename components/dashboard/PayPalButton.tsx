'use client';

import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Lock, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PayPalButtonProps {
  contractId: string;
  amount: number;
  currency?: string;
  description?: string;
  milestones?: Array<{ title: string; amount: number }>;
  paypalClientId?: string;
  paypalClientSecret?: string;
  liveSdkEnabled?: boolean;
  simulate?: boolean;
  onAuthorizeSuccess?: (data: {
    orderId: string;
    authorizationId: string;
    apiMode: string;
  }) => void;
}

export default function PayPalButton({
  contractId,
  amount,
  currency = 'USD',
  description = 'Lancer AI Autonomous Contract',
  milestones = [],
  paypalClientId,
  paypalClientSecret,
  liveSdkEnabled = false,
  simulate = false,
  onAuthorizeSuccess,
}: PayPalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [authorizedInfo, setAuthorizedInfo] = useState<{
    orderId: string;
    authorizationId: string;
    apiMode: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveClientId = (
    paypalClientId ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    ''
  ).trim();

  const handleApiAuthorizeFlow = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const createRes = await fetch('/api/paypal/create-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          amount,
          currency,
          description,
          milestones,
          simulate,
          paypalClientId,
          paypalClientSecret,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Failed to create authorization order');
      }

      const authRes = await fetch('/api/paypal/authorize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createData.orderId,
          contractId,
          amount,
          simulate: createData.apiMode === 'simulated_sandbox',
          paypalClientId,
          paypalClientSecret,
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok || !authData.success) {
        throw new Error(authData.error || 'Order authorization failed');
      }

      const info = {
        orderId: authData.orderId,
        authorizationId: authData.authorizationId,
        apiMode: authData.apiMode,
      };
      setAuthorizedInfo(info);
      onAuthorizeSuccess?.(info);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  if (authorizedInfo) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold shadow-sm">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
        <span>
          {formatCurrency(amount, currency)} Locked in PayPal Escrow ({authorizedInfo.authorizationId})
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800">
          {authorizedInfo.apiMode === 'paypal_live_sandbox' ? 'Live Sandbox' : 'Simulated Sandbox'}
        </span>
      </div>
    );
  }

  if (liveSdkEnabled && !simulate && effectiveClientId) {
    return (
      <div className="w-full max-w-sm space-y-2">
        <PayPalScriptProvider
          key={`${effectiveClientId}-${currency}`}
          options={{
            clientId: effectiveClientId,
            currency,
            intent: 'authorize',
          }}
        >
          <PayPalButtons
            style={{ layout: 'horizontal', color: 'blue', shape: 'rect', label: 'pay', height: 40 }}
            createOrder={async () => {
              const res = await fetch('/api/paypal/create-authorization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contractId,
                  amount,
                  currency,
                  description,
                  milestones,
                  simulate: false,
                  paypalClientId,
                  paypalClientSecret,
                }),
              });
              const data = await res.json();
              if (!data.orderId) throw new Error(data.error || 'Create order failed');
              return data.orderId;
            }}
            onApprove={async (data) => {
              const res = await fetch('/api/paypal/authorize-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: data.orderID,
                  contractId,
                  amount,
                  simulate: false,
                  paypalClientId,
                  paypalClientSecret,
                }),
              });
              const authData = await res.json();
              const info = {
                orderId: authData.orderId || data.orderID,
                authorizationId: authData.authorizationId,
                apiMode: authData.apiMode || 'paypal_live_sandbox',
              };
              setAuthorizedInfo(info);
              onAuthorizeSuccess?.(info);
            }}
            onError={(err) => {
              console.error('[PayPal SDK]', err);
              setErrorMsg('PayPal SDK popup error — use fallback button below if blocked.');
            }}
          />
        </PayPalScriptProvider>
        {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={handleApiAuthorizeFlow}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-white font-semibold text-xs tracking-wide shadow-md shadow-[#0070BA]/20 transition-all duration-200 hover:opacity-95 disabled:opacity-50 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #0070BA 0%, #003087 100%)',
          }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-blue-200" />
          )}
          <span>
            {loading
              ? 'Authorizing Escrow Vault...'
              : `Authorize & Lock ${formatCurrency(amount, currency)} with PayPal`}
          </span>
          <span className="text-[10px] font-mono opacity-85 uppercase ml-1">
            (intent: AUTHORIZE)
          </span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 px-2 py-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero capture until AI milestone pass</span>
        </div>
      </div>
      {errorMsg && <div className="text-xs text-red-600 font-medium">{errorMsg}</div>}
    </div>
  );
}
