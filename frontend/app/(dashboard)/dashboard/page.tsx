'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, handleApiError } from "@/lib/api";
import { useRealtimeDashboard } from "@/lib/useRealtimeDashboard";
import { 
  ShieldCheck, AlertTriangle, RefreshCw, 
  Database, ArrowRight, DollarSign, HardDrive, Sliders, X, CheckCircle2,
  TrendingUp, Wallet, Landmark, Activity, Calendar, FileText, ChevronRight,
  Sparkles, Clock, AlertCircle, ArrowUpRight, ArrowDownRight, Layers, ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  // Primary State
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hover Tooltip for Chart
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  // Policy Modal State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [customReserveInput, setCustomReserveInput] = useState<string>("400000");
  const [policyTypeInput, setPolicyTypeInput] = useState<string>("CUSTOM_NON_NEGOTIABLE");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Explainability Drilldown Drawer State
  const [activeDrilldown, setActiveDrilldown] = useState<any>(null);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, trendRes] = await Promise.all([
        api.get(`/dashboard/summary?period_days=${periodDays}`),
        api.get(`/dashboard/trends?period_days=${periodDays}`)
      ]);
      setSummary(sumRes.data);
      setTrends(trendRes.data);
      if (sumRes.data?.cash_liquidity?.emergency_reserve_inr !== undefined) {
        setCustomReserveInput(String(sumRes.data.cash_liquidity.emergency_reserve_inr));
      }
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  const { syncMode, lastEventTime } = useRealtimeDashboard(fetchDashboardData);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const reserveVal = parseFloat(customReserveInput);
    if (isNaN(reserveVal) || reserveVal < 0) {
      alert("Please enter a valid reserve amount.");
      return;
    }
    setSavingPolicy(true);
    try {
      await api.post("/dashboard/cash-policy", {
        reserve_floor_inr: reserveVal,
        buffer_policy_type: policyTypeInput,
        approval_threshold_inr: 50000.0
      });
      setShowPolicyModal(false);
      fetchDashboardData();
    } catch (err: unknown) {
      alert(handleApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleOpenDrilldown = async (kpiId: string) => {
    setLoadingDrilldown(true);
    setActiveDrilldown(null);
    try {
      const res = await api.get(`/dashboard/kpi/${kpiId}/drilldown`);
      setActiveDrilldown(res.data);
    } catch (err: unknown) {
      alert(handleApiError(err));
    } finally {
      setLoadingDrilldown(false);
    }
  };

  const chartData = useMemo(() => {
    const pts = trends?.timeseries || [];
    if (pts.length === 0) return { points: [], maxInflow: 1, maxOutflow: 1, maxBal: 1, minBal: 0 };

    const maxInflow = Math.max(...pts.map((p: any) => p.inflow_inr), 1000);
    const maxOutflow = Math.max(...pts.map((p: any) => p.outflow_inr), 1000);
    const maxBal = Math.max(...pts.map((p: any) => p.closing_balance_inr), 1000);
    const minBal = Math.min(...pts.map((p: any) => p.closing_balance_inr), 0);

    return { points: pts, maxInflow, maxOutflow, maxBal, minBal };
  }, [trends]);

  const cash = summary?.cash_liquidity;
  const recon = summary?.reconciliation;
  const payables = summary?.payables;
  const health = summary?.data_health;
  const alerts = summary?.alerts_activity;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans antialiased text-slate-100">
      {/* 1. TOP COMMAND BAR */}
      <div className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400">Financial Brain Active &bull; Zero Float Drift</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Institutional Financial Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Single verified source of truth: 3-way bank, books, gateway reconciliation & payment decisioning.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Real-time SSE Sync Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-semibold bg-slate-900/80 border-slate-800 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${syncMode === "LIVE_STREAM" ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span>{syncMode === "LIVE_STREAM" ? "Live Stream (SSE)" : "Polling Sync"}</span>
            {lastEventTime && <span className="text-slate-500">({lastEventTime})</span>}
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs font-mono font-semibold">
            {[7, 30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => setPeriodDays(d)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  periodDays === d 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {d === 365 ? "FY" : `${d}D`}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition shadow-sm"
            title="Refresh KPIs from database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="text-rose-400 font-bold underline font-mono">Retry</button>
        </div>
      )}

      {/* 2. HERO LIQUIDITY STRIP (EXECUTIVE OBSIDIAN CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Available Bank Cash */}
        <div 
          onClick={() => handleOpenDrilldown("available_cash")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-emerald-500/50 hover:shadow-emerald-500/5 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Available Bank Cash</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {cash?.available_cash_display || "₹0.00"}
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-3 border-t border-slate-800/80">
            <span>As of: {cash?.cash_as_of_date || "Live"}</span>
            <span className="text-emerald-400 font-bold group-hover:underline flex items-center gap-1">Audit Source &rarr;</span>
          </div>
        </div>

        {/* Emergency Reserve Floor */}
        <div 
          onClick={() => handleOpenDrilldown("emergency_reserve")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-amber-500/50 hover:shadow-amber-500/5 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Emergency Reserve
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPolicyModal(true); }}
              className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition font-mono"
            >
              <Sliders className="h-3 w-3" /> Customize
            </button>
          </div>
          <div className="text-3xl font-extrabold text-amber-100 font-mono tracking-tight">
            {cash?.emergency_reserve_display || "₹400,000.00"}
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-800/80">
            <span className="truncate max-w-[150px]">{cash?.buffer_policy_type || "Protected Buffer"}</span>
            <span className="text-amber-400 font-bold group-hover:underline flex items-center gap-1">Policy Detail &rarr;</span>
          </div>
        </div>

        {/* Safe Payment Capacity */}
        <div 
          onClick={() => handleOpenDrilldown("safe_capacity")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Safe Payment Capacity</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-300 font-mono tracking-tight">
            {cash?.safe_capacity_display || "₹0.00"}
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-3 border-t border-slate-800/80">
            <span>Cash − Reserve Floor</span>
            <span className="text-indigo-400 font-bold group-hover:underline flex items-center gap-1">Formula &rarr;</span>
          </div>
        </div>

        {/* Operating Burn & Runway */}
        <div 
          onClick={() => handleOpenDrilldown("monthly_burn")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-slate-700 transition-all group relative overflow-hidden"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Runway & Burn</span>
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {cash?.runway_months || 0} <span className="text-sm font-normal text-slate-500">months</span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-3 border-t border-slate-800/80">
            <span>Burn: <strong className="text-slate-300">{cash?.monthly_burn_display || "₹0.00"}</strong></span>
            <span className="text-indigo-400 font-bold group-hover:underline flex items-center gap-1">Inspect &rarr;</span>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE TIME-SERIES SVG CHART */}
      <div className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Daily Cash Flow Trajectory & Balance Curve ({periodDays} Days)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real daily credits (inflow) vs. debits (outflow) normalized with integer paise precision</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-emerald-400 shadow-sm shadow-emerald-400/20" />
              <span>Inflows</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-slate-600" />
              <span>Outflows</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 bg-indigo-500 shadow-sm shadow-indigo-500/30" />
              <span>Balance</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas Chart */}
        <div className="relative h-64 w-full bg-[#050811]/60 rounded-xl p-2 border border-slate-800/40">
          {chartData.points.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              No transaction datapoints found for the selected {periodDays}-day window.
            </div>
          ) : (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="50" x2="800" y2="50" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="0" y1="110" x2="800" y2="110" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="0" y1="170" x2="800" y2="170" stroke="#1e293b" strokeDasharray="4 4" />

              {/* Inflow & Outflow Bars */}
              {chartData.points.map((p: any, idx: number) => {
                const totalPts = chartData.points.length;
                const slotWidth = 800 / totalPts;
                const xCenter = idx * slotWidth + slotWidth / 2;
                const barW = Math.min(22, slotWidth * 0.4);

                const maxFlow = Math.max(chartData.maxInflow, chartData.maxOutflow);
                const inH = maxFlow > 0 ? (p.inflow_inr / maxFlow) * 70 : 0;
                const outH = maxFlow > 0 ? (p.outflow_inr / maxFlow) * 70 : 0;

                return (
                  <g key={idx} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)}>
                    <rect
                      x={xCenter - barW - 1}
                      y={200 - inH}
                      width={barW}
                      height={Math.max(2, inH)}
                      fill="#10b981"
                      rx="3"
                      className="transition-all hover:opacity-80"
                    />
                    <rect
                      x={xCenter + 1}
                      y={200 - outH}
                      width={barW}
                      height={Math.max(2, outH)}
                      fill="#475569"
                      rx="3"
                      className="transition-all hover:opacity-80"
                    />
                  </g>
                );
              })}

              {/* Balance Trend Line */}
              {(() => {
                const totalPts = chartData.points.length;
                const slotWidth = 800 / totalPts;
                const pts = chartData.points.map((p: any, idx: number) => {
                  const x = idx * slotWidth + slotWidth / 2;
                  const range = chartData.maxBal - chartData.minBal || 1;
                  const y = 180 - ((p.closing_balance_inr - chartData.minBal) / range) * 140;
                  return `${x},${y}`;
                });

                const dLine = `M ${pts.join(" L ")}`;
                const dArea = `${dLine} L 800,200 L 0,200 Z`;

                return (
                  <>
                    <path d={dArea} fill="url(#balanceGradient)" />
                    <path d={dLine} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {chartData.points.map((p: any, idx: number) => {
                      const x = idx * slotWidth + slotWidth / 2;
                      const range = chartData.maxBal - chartData.minBal || 1;
                      const y = 180 - ((p.closing_balance_inr - chartData.minBal) / range) * 140;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#ffffff"
                          stroke="#6366f1"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          )}

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 bg-[#0a0f1d] text-white text-xs font-mono p-3 rounded-xl shadow-2xl border border-slate-800 space-y-1 z-10 animate-in fade-in duration-150">
              <p className="text-slate-400 text-[10px] border-b border-slate-800 pb-1">{hoveredPoint.date}</p>
              <p className="text-emerald-400">Inflow: +₹{hoveredPoint.inflow_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              <p className="text-slate-400">Outflow: -₹{hoveredPoint.outflow_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              <p className="text-indigo-400 font-bold">Balance: ₹{hoveredPoint.closing_balance_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. SECONDARY ANALYTICAL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reconciliation Health */}
        <div 
          onClick={() => handleOpenDrilldown("match_rate")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-slate-700 transition-all group"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Reconciliation Health</span>
            <Activity className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {recon?.overall_match_rate_pct || 0}% <span className="text-xs font-normal text-slate-500">Auto-Match</span>
          </div>
          <div className="space-y-1 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Gateway Settlement Match:</span>
              <span className="font-bold text-slate-200">{recon?.gateway_match_rate_pct || 0}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Rupees At Risk (Open):</span>
              <span className="font-bold text-rose-400">{recon?.rupees_at_risk_display || "₹0.00"}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Open Variance Items:</span>
              <span className="font-bold text-slate-200">{recon?.open_exceptions_count || 0} items</span>
            </div>
          </div>
        </div>

        {/* Payables Due Breakdown */}
        <div 
          onClick={() => handleOpenDrilldown("payables")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-slate-700 transition-all group"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Payables Obligations</span>
            <DollarSign className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {payables?.total_outstanding_display || "₹0.00"}
          </div>
          <div className="space-y-1 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Due This Week:</span>
              <span className="font-bold text-amber-400">{payables?.payables_due_this_week_display || "₹0.00"} ({payables?.payables_due_this_week_count || 0})</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Overdue Bills:</span>
              <span className="font-bold text-rose-400">{payables?.overdue_payables_display || "₹0.00"} ({payables?.overdue_payables_count || 0})</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Early Discounts Captured:</span>
              <span className="font-bold text-emerald-400">+{payables?.discounts_captured_display || "₹0.00"}</span>
            </div>
          </div>
        </div>

        {/* Data Provenance & Freshness */}
        <div 
          onClick={() => handleOpenDrilldown("data_health")}
          className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3 cursor-pointer hover:border-slate-700 transition-all group"
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Data Health & Provenance</span>
            <HardDrive className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {health?.data_quality_score || 100} <span className="text-xs font-normal text-slate-500">/ 100</span>
          </div>
          <div className="space-y-1 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Connected Adapters:</span>
              <span className="font-bold text-slate-200">{health?.connected_sources_count || 0} active</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Vaulted Statements:</span>
              <span className="font-bold text-slate-200">{health?.total_vault_files || 0} files</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Security Standard:</span>
              <span className="font-bold text-emerald-400">SHA-256 Provenance</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. WORKBENCH PANELS: DECISION QUEUE PREVIEW & ACTIVE ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#080d1a] via-[#0c1428] to-indigo-950/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Smart Payables Brain</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Active Payment Decision Queue</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Deterministic triage: {payables?.queue_summary?.pay_now?.count || 0} Pay Now, {payables?.queue_summary?.schedule?.count || 0} Scheduled, {payables?.queue_summary?.hold?.count || 0} on Hold.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase block font-bold">Pay Now</span>
                <span className="font-bold text-white text-sm">{payables?.queue_summary?.pay_now?.amount_display || "₹0.00"}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-indigo-400 uppercase block font-bold">Schedule</span>
                <span className="font-bold text-white text-sm">{payables?.queue_summary?.schedule?.amount_display || "₹0.00"}</span>
              </div>
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 uppercase block font-bold">Hold / Review</span>
                <span className="font-bold text-white text-sm">{payables?.queue_summary?.hold?.amount_display || "₹0.00"}</span>
              </div>
            </div>
          </div>

          <Link
            href="/payables"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 w-fit flex items-center space-x-2 font-mono"
          >
            <span>Open Decision Queue ({payables?.total_payables_count || 0} Bills)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Active Alerts & Statutory Deadlines */}
        <div className="bg-[#080d1a] border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4 font-mono text-xs">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Financial Alerts & Deadlines</span>
            </h4>
            <span className="text-[10px] text-slate-500">Automated Vigilance</span>
          </div>

          <div className="space-y-2.5">
            {(!alerts?.active_alerts || alerts.active_alerts.length === 0) ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero critical alerts. Liquidity buffer and payments are safely calibrated.</span>
              </div>
            ) : (
              alerts.active_alerts.map((al: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${
                  al.severity === "CRITICAL" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                }`}>
                  <div>
                    <strong className="block text-xs text-white">{al.title}</strong>
                    <span className="text-[11px] opacity-80">{al.message}</span>
                  </div>
                  <Link href={al.action_url} className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-bold text-white shadow-sm shrink-0 ml-2">
                    Review &rarr;
                  </Link>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Upcoming Deadlines:</span>
              {alerts?.upcoming_deadlines?.map((dl: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span>{dl.name}</span>
                  <span className="font-bold text-slate-200">{dl.due_date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-500">
            <span>Audit Trail Integrity</span>
            <Link href="/reports" className="text-indigo-400 font-bold hover:underline">Download Audit PDF &rarr;</Link>
          </div>
        </div>
      </div>

      {/* 6. INSTITUTIONAL FINANCIAL EXPLAINABILITY DRAWER (DARK OBSIDIAN MODAL) */}
      {activeDrilldown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 font-mono text-xs max-h-[85vh] flex flex-col animate-in fade-in duration-200 text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Verified Evidence</span>
                  <h3 className="text-sm font-bold text-white">{activeDrilldown.title}</h3>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Click-to-explain institutional financial audit verification</p>
              </div>
              <button onClick={() => setActiveDrilldown(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <p><span className="text-slate-400">Formula:</span> <code className="bg-[#050811] px-2 py-0.5 rounded border border-slate-800 text-indigo-400 font-bold">{activeDrilldown.formula}</code></p>
              <p><span className="text-slate-400">Contributing Source Table:</span> <strong className="text-white">{activeDrilldown.data_source_table}</strong> &bull; <span className="text-slate-400">{activeDrilldown.total_contributing_rows} records</span></p>
              <p><span className="text-slate-400">Audit Explanation:</span> <span className="text-slate-300">{activeDrilldown.explanation}</span></p>
            </div>

            {/* Components Display */}
            {activeDrilldown.components && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                {activeDrilldown.components.map((comp: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">{comp.label}</span>
                    <strong className="text-xs text-white font-bold">{comp.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Contributing Rows Table */}
            {activeDrilldown.rows && activeDrilldown.rows.length > 0 && (
              <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl max-h-56 bg-[#050811]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[9px] sticky top-0">
                      {Object.keys(activeDrilldown.rows[0] || {}).map((col) => (
                        <th key={col} className="py-2.5 px-3">{col.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeDrilldown.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        {Object.values(row).map((val: any, vIdx: number) => (
                          <td key={vIdx} className="py-2 px-3 truncate max-w-xs text-slate-300">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              {activeDrilldown.drilldown_link ? (
                <Link
                  href={activeDrilldown.drilldown_link}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                >
                  <span>{activeDrilldown.drilldown_label || "View Full Module"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : <div />}
              <button
                onClick={() => setActiveDrilldown(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Audit Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CUSTOMIZE RESERVE MODAL (DARK THEME) */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-5 animate-in fade-in duration-200 font-sans text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Personalize Emergency Reserve</h3>
                <p className="text-xs text-slate-400 font-mono">Configured specifically for your organization</p>
              </div>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  Emergency Reserve Amount (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-mono font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={customReserveInput}
                    onChange={(e) => setCustomReserveInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-sm text-white focus:bg-slate-900 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  Policy Strategy Type
                </label>
                <select
                  value={policyTypeInput}
                  onChange={(e) => setPolicyTypeInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white focus:bg-slate-900 focus:border-indigo-500 font-mono"
                >
                  <option value="30_DAYS_OPEX_RESERVE">30 Days Operating Expenses (Standard OpEx Floor)</option>
                  <option value="CUSTOM_NON_NEGOTIABLE">Non-Negotiable Core Capital Buffer</option>
                  <option value="SEASONAL_SAFETY_BUFFER">Seasonal Working Capital Safety Buffer</option>
                  <option value="PAYROLL_TAX_PRIORITY">Payroll & Statutory Tax Compliance Priority</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {savingPolicy ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
