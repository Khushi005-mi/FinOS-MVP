'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  ShieldAlert, ShieldCheck, ArrowRight, DollarSign, Layers, 
  RefreshCw, AlertTriangle, ArrowUpRight, Lock, 
  CheckCircle2, ChevronRight 
} from 'lucide-react';

export default function TruthDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/dashboard/');
      setMetrics(response.data);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP EXECUTIVE STATE BANNER */}
      <div className={`p-6 rounded-xl border shadow-sm transition ${
        metrics?.verification_state === 'ACTION_REQUIRED'
          ? 'bg-rose-50/70 border-rose-200 text-slate-900'
          : metrics?.verification_state === 'VERIFIED'
          ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider flex items-center space-x-1.5 ${
                metrics?.verification_state === 'ACTION_REQUIRED' 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {metrics?.verification_state === 'ACTION_REQUIRED' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>{metrics?.verification_state || 'INITIALIZING'}</span>
              </span>
              <span className="text-xs text-slate-500">Cross-System Verification</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {metrics?.verification_state === 'ACTION_REQUIRED' 
                ? `${metrics?.money_at_risk_display} of gateway settlements have not been credited to the bank.`
                : 'All financial records agree across bank, gateway, and ledger.'}
            </h1>

            <p className="text-xs md:text-sm text-slate-600">
              {metrics?.verification_state === 'ACTION_REQUIRED'
                ? `${metrics?.open_exceptions_count} critical exceptions detected. Gateway net payouts missing corresponding bank credits.`
                : 'No unverified transactions, duplicate payments, or unexplained variances detected.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button 
              onClick={fetchDashboard} 
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-lg transition shadow-sm flex items-center space-x-2 font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button 
              onClick={() => router.push('/queue')} 
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm flex items-center space-x-2"
            >
              <span>Review Critical Exceptions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {/* 2. CORE DECISION TILES (LIQUIDITY & RESERVE SAFETY) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Available Bank Cash */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Bank Cash</p>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {metrics?.available_bank_cash_display || '—'}
          </h3>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Source: <strong className="text-slate-700 font-medium">HDFC Bank Closing Balance</strong>
          </p>
        </div>

        {/* Emergency Reserve */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Reserve Floor</p>
            <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
            {metrics?.emergency_reserve_display || '—'}
          </h3>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Policy: <strong className="text-amber-700 font-medium">Non-Negotiable Buffer</strong>
          </p>
        </div>

        {/* Safe Payment Capacity */}
        <div className={`border rounded-xl p-5 shadow-sm space-y-2 ${
          metrics?.reserve_status === 'SAFE' 
            ? 'bg-emerald-50/50 border-emerald-200' 
            : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Safe Payment Capacity</p>
            <div className={`p-2 rounded-lg border ${
              metrics?.reserve_status === 'SAFE'
                ? 'bg-emerald-100/60 border-emerald-200 text-emerald-800'
                : 'bg-rose-100/60 border-rose-200 text-rose-800'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold tracking-tight tabular-nums ${
            metrics?.reserve_status === 'SAFE' ? 'text-emerald-900' : 'text-rose-900'
          }`}>
            {metrics?.safe_payment_capacity_display || '—'}
          </h3>
          <p className="text-xs pt-2 border-t border-slate-200/60 flex justify-between">
            <span className="text-slate-600">Headroom Status:</span>
            <strong className={`uppercase ${
              metrics?.reserve_status === 'SAFE' ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {metrics?.reserve_status} (Available − Reserve)
            </strong>
          </p>
        </div>
      </div>

      {/* 3. VERIFICATION QUALITY & PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gateway-to-Bank Match Rate</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight tabular-nums">
            {metrics?.match_rate || '0%'}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            {metrics?.matched_settlements_count} of {metrics?.total_settlements_count} settlements matched
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Money at Risk (Shortfall)</p>
          <h3 className="text-2xl font-bold text-rose-600 mt-2 tracking-tight tabular-nums">
            {metrics?.money_at_risk_display || '₹0.00'}
          </h3>
          <p className="text-xs text-rose-700 font-medium mt-2 pt-2 border-t border-slate-100">
            Requires Bank Inquiry
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Critical Exceptions</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight tabular-nums">
            {metrics?.open_exceptions_count || 0}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between">
            <span>Action:</span>
            <button 
              onClick={() => router.push('/queue')} 
              className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center space-x-1"
            >
              <span>Investigate Cases</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </p>
        </div>
      </div>

      {/* 4. CRITICAL ACTIONS LIST */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Critical Actions Required Now</h3>
            <p className="text-xs text-slate-500 mt-0.5">Lineage links to investigate reconciliation breaks.</p>
          </div>
          <button 
            onClick={() => router.push('/queue')} 
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            View All Exceptions &rarr;
          </button>
        </div>

        {metrics?.critical_actions && metrics?.critical_actions.length > 0 ? (
          <div className="space-y-3">
            {metrics.critical_actions.map((act: any) => (
              <div 
                key={act.discrepancy_id} 
                className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition hover:bg-slate-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">
                      {act.reason_code}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{act.settlement_id}</span>
                    <span className="text-xs text-slate-500">&bull; {act.date}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Gateway Settlement Expected: <strong className="text-rose-700 tabular-nums">{act.amount_display}</strong> | Bank Credit: <strong className="text-slate-500">Not Found</strong>
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/cases/${act.discrepancy_id}`)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-sm flex items-center space-x-1.5 shrink-0"
                >
                  <span>Investigate Evidence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500">No critical actions pending.</div>
        )}
      </div>

      {/* 5. SHORTCUT TO PAYMENT DECISION QUEUE */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl flex justify-between items-center shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Payment Decision Queue</h4>
          <p className="text-xs text-slate-500 mt-0.5">Rank confirmed vendor payables and protect your ₹4,00,000 cash reserve.</p>
        </div>
        <button
          onClick={() => router.push('/payables')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm flex items-center space-x-2 shrink-0"
        >
          <span>Open Payables Queue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}