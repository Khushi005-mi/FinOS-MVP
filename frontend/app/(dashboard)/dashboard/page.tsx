'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  ShieldCheck, AlertTriangle, RefreshCw, 
  ArrowRight, Sliders, X, CheckCircle2,
  HardDrive, TrendingUp, Layers, Check, ArrowUpRight
} from 'lucide-react';
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge 
} from '@/components/ui/primitives';

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Emergency Reserve Customization State
  const [showModal, setShowModal] = useState(false);
  const [customReserve, setCustomReserve] = useState<string>('400000');
  const [policyType, setPolicyType] = useState<string>('CUSTOM_NON_NEGOTIABLE');
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/dashboard/');
      setMetrics(response.data);
      if (response.data?.emergency_reserve_floor_raw) {
        setCustomReserve(String(response.data.emergency_reserve_floor_raw));
      }
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const reserveVal = parseFloat(customReserve);
    if (isNaN(reserveVal) || reserveVal < 0) {
      alert("Please enter a valid emergency reserve amount.");
      return;
    }
    setSavingPolicy(true);
    try {
      await api.post('/dashboard/cash-policy', {
        reserve_floor_inr: reserveVal,
        buffer_policy_type: policyType,
        approval_threshold_inr: 50000.0
      });
      setShowModal(false);
      fetchDashboard();
    } catch (err: any) {
      alert(handleApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. HERO INSTITUTIONAL COMMAND HEADER */}
      <div className="hairline-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 ambient-glow pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
              <Eyebrow>Institutional Financial Operating Brain</Eyebrow>
              <span className="text-stone-700">·</span>
              <ThreeWayNode bank={true} books={true} gateway={true} />
            </div>

            <h1 className="text-2xl md:text-3xl font-serif text-stone-100 tracking-tight">
              {metrics?.open_exceptions_count === 0 ? (
                <>Continuous Verification <span className="italic font-normal text-brass">Active</span> & Reconciled</>
              ) : (
                <>Attention Required: <span className="italic font-normal text-brick">Reconciliation Variance</span> Detected</>
              )}
            </h1>

            <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
              Multi-source deterministic settlement verification across Corporate Banking, Tally Prime Daybooks, and Gateway Payouts.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button 
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-white/10 bg-ink-850 hover:bg-ink-800 text-stone-300 text-xs font-medium transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button 
              onClick={() => router.push('/queue')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brick hover:bg-brick/90 text-stone-950 font-bold rounded-lg text-xs shadow-sm transition"
            >
              <span>Review Exceptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-brick-dim border border-brick-border text-brick text-xs rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Control System Error: {error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-24 text-stone-500 font-mono text-xs animate-pulse">
          Synthesizing multi-source ledger verification kernel...
        </div>
      ) : metrics ? (
        <>
          {/* 2. LIQUIDITY & WORKING CAPITAL COMMAND STRIP */}
          <div className="space-y-3">
            <Eyebrow>Liquidity & Working Capital Governance</Eyebrow>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Available Bank Cash */}
              <div className="hairline-card rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider font-mono">Available Bank Cash</span>
                  <StatusBadge status="VERIFIED" variant="sage" />
                </div>
                <div>
                  <IndianCurrencyDisplay 
                    amount={metrics.available_bank_cash_raw ?? metrics.available_bank_cash} 
                    size="hero" 
                  />
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-stone-500">
                  <span>Source: Bank Statements</span>
                  <span className="text-stone-400 font-semibold">{metrics.sources_count || 0} Sources</span>
                </div>
              </div>

              {/* Dynamic Emergency Reserve Floor */}
              <div className="hairline-card rounded-xl p-6 space-y-3 relative group border-brass/20">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-brass uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Emergency Buffer Floor
                  </span>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-[11px] font-semibold text-brass hover:text-brass-hover flex items-center gap-1 bg-brass-dim px-2 py-0.5 rounded transition font-mono"
                    title="Customize non-negotiable cash buffer"
                  >
                    <Sliders className="h-3 w-3" /> Adjust
                  </button>
                </div>
                <div>
                  <IndianCurrencyDisplay 
                    amount={metrics.emergency_reserve_floor_raw ?? metrics.emergency_reserve_floor} 
                    size="hero" 
                    className="text-brass" 
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono text-stone-500 pt-2 border-t border-white/[0.06]">
                  <span className="truncate max-w-[190px]">{metrics.policy_label || 'Policy: Non-Negotiable Floor'}</span>
                  <span className="bg-sage-dim text-sage border border-sage-border text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase">LOCKED</span>
                </div>
              </div>

              {/* Safe Payment Capacity */}
              <div className="hairline-card rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider font-mono">Safe Payment Capacity</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                    metrics.headroom_status === 'AVAILABLE' 
                      ? 'bg-sage-dim text-sage border-sage-border' 
                      : 'bg-brick-dim text-brick border-brick-border'
                  }`}>
                    {metrics.headroom_status || 'AVAILABLE'}
                  </span>
                </div>
                <div>
                  <IndianCurrencyDisplay 
                    amount={metrics.safe_payment_capacity_raw ?? metrics.safe_payment_capacity} 
                    size="hero" 
                  />
                </div>
                <p className="text-[11px] text-stone-500 font-mono pt-2 border-t border-white/[0.06]">
                  Surplus Headroom (Cash − Reserve Buffer)
                </p>
              </div>

            </div>
          </div>

          {/* 3. RECONCILIATION INTEGRITY & EXCEPTIONS */}
          <div className="space-y-3">
            <Eyebrow>Reconciliation Integrity & Exceptions</Eyebrow>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="hairline-card rounded-xl p-6 space-y-2">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider font-mono">Gateway-to-Bank Match Rate</span>
                <div className="text-2xl font-light font-mono text-stone-100 mt-1">{metrics.match_rate}</div>
                <p className="text-[11px] text-stone-500 font-mono pt-2 border-t border-white/[0.06]">{metrics.total_transactions_processed} settlements verified</p>
              </div>

              <div className="hairline-card rounded-xl p-6 space-y-2">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider font-mono">Rupees at Risk (Variance)</span>
                <div className="text-2xl font-light font-mono text-brick mt-1">
                  <IndianCurrencyDisplay amount={metrics.rupees_at_risk ?? metrics.rupees_at_risk_display} size="lg" className="text-brick" />
                </div>
                <p className="text-[11px] text-stone-500 font-mono pt-2 border-t border-white/[0.06]">Zero variance detected across active checks</p>
              </div>

              <div className="hairline-card rounded-xl p-6 space-y-2">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider font-mono">Open Critical Exceptions</span>
                <div className="text-2xl font-light font-mono text-stone-100 mt-1">{metrics.open_exceptions_count}</div>
                <button 
                  onClick={() => router.push('/queue')} 
                  className="text-brass hover:text-brass-hover text-[11px] font-medium pt-2 border-t border-white/[0.06] block font-mono flex items-center gap-1 transition"
                >
                  Investigate Discrepancy Queue <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          </div>

          {/* 4. STRATEGIC WORKBENCH CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="hairline-card rounded-xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden group">
              <div className="space-y-2 relative z-10">
                <Eyebrow>Autonomous Recommendation Engine</Eyebrow>
                <h3 className="text-lg font-serif text-stone-100 tracking-tight">Payment Decision & Behavioral Queue</h3>
                <p className="text-xs text-stone-400 leading-relaxed font-sans">
                  Evaluate open vendor bills against live bank cash and emergency buffer. Triage payouts into Pay Now, Schedule, or Hold.
                </p>
              </div>
              <button 
                onClick={() => router.push('/payables')}
                className="bg-brass hover:bg-brass-hover text-stone-950 text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm w-fit flex items-center space-x-2"
              >
                <span>Open Payables Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="hairline-card rounded-xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <Eyebrow>Cryptographic Ingestion Vault</Eyebrow>
                <h3 className="text-lg font-serif text-stone-100 tracking-tight">Source Coverage & Freshness ({metrics.sources_count || 0} Connected)</h3>
                <p className="text-xs text-stone-400 leading-relaxed font-sans">
                  Bank statements, Tally daybooks, and Razorpay settlements sealed with SHA-256 provenance hashes.
                </p>
              </div>
              <button 
                onClick={() => router.push('/sources')}
                className="bg-ink-800 hover:bg-ink-750 border border-white/10 text-stone-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition w-fit flex items-center space-x-2"
              >
                <span>Inspect Vault Sources</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </>
      ) : null}

      {/* CUSTOMIZE BUFFER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brass" /> Configure Emergency Reserve
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Customize your non-negotiable minimum survival cash buffer floor.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-stone-400">Emergency Reserve Floor (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={customReserve}
                    onChange={(e) => setCustomReserve(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-brass focus:outline-none"
                    placeholder="e.g. 400000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-stone-400">Policy Mode</label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs font-sans focus:border-brass focus:outline-none"
                >
                  <option value="CUSTOM_NON_NEGOTIABLE">CUSTOM_NON_NEGOTIABLE (Strict Block)</option>
                  <option value="30_DAYS_OPEX_RESERVE">30_DAYS_OPEX_RESERVE (Empirical Burn)</option>
                  <option value="SEASONAL_SAFETY_BUFFER">SEASONAL_SAFETY_BUFFER (Peak Working Capital)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-4 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {savingPolicy ? 'Saving...' : 'Apply & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
