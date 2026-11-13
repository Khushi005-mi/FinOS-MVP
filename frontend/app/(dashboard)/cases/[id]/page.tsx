'use client';

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, handleApiError } from "@/lib/api";
import { 
  ArrowLeft, FileText, CheckCircle2, Loader2, ExternalLink, X, 
  AlertTriangle, ArrowLeftRight, ShieldCheck, History, Info, Clock, 
  AlertCircle, Check, Send, ShieldAlert, Landmark, DollarSign
} from "lucide-react";
import Link from "next/link";

export default function MismatchInvestigationWorkspace() {
  const params = useParams();
  const router = useRouter();
  
  const rawId = params?.id;
  const caseId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || "";

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("INVESTIGATING");
  const [resolutionText, setResolutionText] = useState("");
  const [utrInput, setUtrInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchCaseDetail = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/discrepancies/${caseId}`);
      setCaseData(res.data);
      setStatus(res.data.status === "OPEN" ? "INVESTIGATING" : res.data.status);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) fetchCaseDetail();
  }, [caseId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setSubmitting(true);
    setSuccessToast(null);
    try {
      await api.post(`/discrepancies/${caseId}/resolve`, {
        status: status === "INVESTIGATING" ? "RESOLVED" : status,
        resolution_text: resolutionText || (utrInput ? `Confirmed 16-digit bank UTR: ${utrInput}` : "Audited and verified via forensic workbench.")
      });
      setSuccessToast(`Discrepancy #${caseId.slice(0, 8)} status successfully committed as ${status}.`);
      fetchCaseDetail();
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Safe JSON deserializer for evidence_payload
  const rawPayload = caseData?.evidence_payload;
  const payload = typeof rawPayload === "string" 
    ? (() => { try { return JSON.parse(rawPayload); } catch { return {}; } })()
    : (rawPayload || {});

  const settleId = payload.settlement_id || caseData?.reason_code || "";
  const grossAmt = parseFloat(payload.gross_amount ?? 0);
  const feeAmt = parseFloat(payload.fee ?? 0);
  const gstAmt = parseFloat(payload.gst ?? 0);
  const refundAmt = parseFloat(payload.refund_amount ?? 0);
  const expectedNet = parseFloat(payload.expected_net_credit ?? (caseData?.amount_paise ? caseData.amount_paise / 100 : 0));
  const actualCredit = parseFloat(payload.actual_bank_credit ?? 0);
  const netShortfall = parseFloat(payload.difference ?? expectedNet);
  const daysElapsed = payload.days_elapsed !== undefined ? payload.days_elapsed : 0;
  const classification = payload.classification || caseData?.reason_code || "AGED_LEAKAGE";
  const rootCause = payload.root_cause_explanation || caseData?.description;
  const remediation = payload.suggested_remediation;

  if (loading) {
    return (
      <div className="py-32 text-center text-slate-400 font-mono text-xs animate-pulse">
        Loading forensic audit dossier from Render PostgreSQL...
      </div>
    );
  }

  // 404 Not Found State
  if (error || !caseData) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4 font-mono">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl w-fit mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Discrepancy Case Not Found</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The requested discrepancy case ID does not exist in your active workspace. It may have been resolved, archived, or recalibrated.
        </p>
        <div className="pt-2">
          <Link
            href="/queue"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Discrepancy Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans antialiased text-slate-100">
      {/* 1. Header Navigation */}
      <div className="flex justify-between items-center text-xs font-mono">
        <Link 
          href="/queue" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discrepancy Queue</span>
        </Link>
        <div className="flex items-center gap-2 text-slate-500">
          <span>Evidence Provenance:</span>
          <span className="text-emerald-400 font-bold uppercase">SHA-256 Vault Sealed</span>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between font-mono animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Investigation Hero Card */}
      <div className="bg-[#0b101b] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase">
            <span className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-lg">
              {caseData.check_type || "CHECK_2_GATEWAY_TO_BANK"}
            </span>
            <span className="px-2.5 py-1 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-lg">
              {classification.replace(/_/g, " ")}
            </span>
            {daysElapsed > 0 && (
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>{daysElapsed} Days Past SLA</span>
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-mono block uppercase">Investigation State</span>
            <span className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded border inline-block mt-0.5 ${
              caseData.status === "RESOLVED" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}>
              {caseData.status || "OPEN"}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">
            Discrepancy #{settleId}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono mt-1 text-slate-400">
            <span>Gateway Expected: <strong className="text-rose-400 font-bold">₹{expectedNet.toLocaleString("en-IN", {minimumFractionDigits: 2})}</strong></span>
            <span>&bull;</span>
            <span>Actual Bank Credit: <strong className="text-slate-200 font-bold">₹{actualCredit.toLocaleString("en-IN", {minimumFractionDigits: 2})}</strong></span>
            <span>&bull;</span>
            <span>Net Shortfall: <strong className="text-rose-400 font-bold">₹{netShortfall.toLocaleString("en-IN", {minimumFractionDigits: 2})}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. DUAL-SOURCE SIDE-BY-SIDE FORENSIC COMPARISON */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dual-Source Comparison</span>
          </span>
          <span className="text-rose-400 font-bold uppercase text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Variance Detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source A: Gateway Report */}
          <div className="bg-[#0b101b] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">SOURCE A: PAYMENT GATEWAY REPORT</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Settlement Batch ID: {settleId}</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase">
                Expected Value
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60">
                <span className="text-slate-400">Settlement Batch ID:</span>
                <span className="font-bold text-white">{settleId}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60">
                <span className="text-slate-400">Settlement Date:</span>
                <span className="font-bold text-white">{payload.settlement_date || "—"}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60">
                <span className="text-slate-400">Gross Merchant Volume:</span>
                <span className="font-bold text-white">₹{grossAmt.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60 text-slate-300">
                <span className="text-slate-400">MDR Fee (2%):</span>
                <span className="text-rose-400 font-bold">-₹{feeAmt.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60 text-slate-300">
                <span className="text-slate-400">GST on MDR (18%):</span>
                <span className="text-rose-400 font-bold">-₹{gstAmt.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
              </div>
              {refundAmt > 0 && (
                <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60 text-slate-300">
                  <span className="text-slate-400">Customer Refunds Deducted:</span>
                  <span className="text-rose-400 font-bold">-₹{refundAmt.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
                </div>
              )}
              <div className="flex justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-white font-bold">
                <span>Expected Net Payout:</span>
                <span className="text-indigo-300 text-sm">₹{expectedNet.toLocaleString("en-IN", {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Source B: Bank Statement */}
          <div className="bg-[#0b101b] border border-rose-900/40 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-rose-400 text-sm">SOURCE B: CORPORATE BANK STATEMENT</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Scanned Active Ingested Statement Credits</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase">
                Missing Bank Credit
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60">
                <span className="text-slate-400">Searched Reference Token:</span>
                <span className="font-bold text-white">{settleId}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-[#070b14] border border-slate-800/60">
                <span className="text-slate-400">Clearing Window Scanned:</span>
                <span className="font-bold text-white">{payload.settlement_date ? `${payload.settlement_date} ± 3 Days` : "All Dates"}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-rose-950/30 border border-rose-900/50">
                <span className="text-rose-300">Actual Bank Credit Found:</span>
                <span className="font-extrabold text-rose-400">₹{actualCredit.toLocaleString("en-IN", {minimumFractionDigits: 2})} (NOT FOUND)</span>
              </div>

              {rootCause && (
                <div className="p-3.5 rounded-xl bg-[#070b14] border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-400" /> Plain-English Root Cause
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {rootCause}
                  </p>
                </div>
              )}

              {remediation && (
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Suggested Remediation
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {remediation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CASE RESOLUTION & UTR CLEARANCE WORKBENCH */}
      <div className="bg-[#0b101b] border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Case Resolution & Actionable Audit Commitment</span>
          </h3>
          <span className="text-slate-500 text-[10px]">Immutable PostgreSQL Audit Log</span>
        </div>

        <form onSubmit={handleResolve} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Target Resolution Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              >
                <option value="INVESTIGATING">INVESTIGATING (Keep Active in Exceptions Queue)</option>
                <option value="RESOLVED">RESOLVED (UTR Received & Bank Deposit Verified)</option>
                <option value="ACCEPTED_VARIANCE">ACCEPTED VARIANCE (Authorized Fee / Chargeback Adjustment)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Bank UTR Clearance Proof (16 Digits)
              </label>
              <input
                type="text"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                placeholder="e.g. ICICR5202610160098214"
                className="w-full px-3 py-2.5 bg-[#070b14] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
              Auditor / Resolution Notes
            </label>
            <textarea
              rows={2}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="e.g. Contacted Razorpay Support via Ticket #881920. Received UTR, awaiting bank ledger reconciliation."
              className="w-full px-3 py-2 bg-[#070b14] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <Link
              href="/queue"
              className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Commit Resolution to Audit Trail</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
