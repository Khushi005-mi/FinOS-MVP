'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { ArrowLeft, FileText, CheckCircle2, Loader2, ExternalLink, X, AlertTriangle, ArrowLeftRight, ShieldCheck, History, Info, Clock, AlertCircle } from 'lucide-react';

export default function MismatchInvestigationWorkspace() {
  const params = useParams();
  const router = useRouter();
  
  const rawId = params?.id;
  const caseId = Array.isArray(rawId) ? rawId[0] : (rawId as string) || '';

  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('INVESTIGATING');
  const [resolutionText, setResolutionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Raw Cell Lineage Micro-Inspector Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [inspectingField, setInspectingField] = useState('');
  const [rawRowData, setRawRowData] = useState<any>(null);
  const [loadingRow, setLoadingRow] = useState(false);

  const fetchCaseDetail = async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/discrepancies/${caseId}`);
      setCaseData(res.data);
      setStatus(res.data.status === 'OPEN' ? 'INVESTIGATING' : res.data.status);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchCaseDetail();
    }
  }, [caseId]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setSubmitting(true);
    setSuccessToast(null);
    try {
      await api.post(`/discrepancies/${caseId}/resolve`, {
        status,
        resolution_text: resolutionText || 'Case audited via forensic side-by-side workbench.'
      });
      setSuccessToast(`Case status successfully committed as ${status}.`);
      fetchCaseDetail();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspectCell = async (fieldName: string, fileId?: string, rowIndex: number = 1) => {
    if (!fileId) return;
    setInspectingField(fieldName);
    setLoadingRow(true);
    setModalOpen(true);
    try {
      const res = await api.get(`/vault/${fileId}/rows/${rowIndex}`);
      setRawRowData(res.data);
    } catch (err) {
      setRawRowData({ error: handleApiError(err) });
    } finally {
      setLoadingRow(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3 text-xs text-slate-500 font-sans">
        <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
        <p>Loading forensic evidence panes & source records...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-3 font-sans">
        <p className="font-bold">Error loading discrepancy case #{caseId || 'Unknown'}:</p>
        <p>{error || 'Record does not exist or has been deleted.'}</p>
        <button onClick={() => router.push('/dashboard')} className="text-slate-900 font-semibold hover:underline">&larr; Return to Dashboard</button>
      </div>
    );
  }

  const payload = caseData?.evidence_payload || {};
  const settlementId = payload.settlement_id || (caseId ? caseId.slice(0, 8) : 'Case');
  const settlementDate = payload.settlement_date || 'N/A';
  const targetRow = payload.row_index || 1;
  const classification = payload.classification || 'UNVERIFIED';

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* 1. Header Navigation & Breadcrumb */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => router.push('/dashboard')} 
          className="text-slate-500 hover:text-slate-900 text-xs font-semibold flex items-center space-x-1.5 uppercase tracking-wider transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Command Dashboard</span>
        </button>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500">Evidence Lineage:</span>
          <span className="text-emerald-700 font-semibold">SHA-256 Vault Sealed</span>
        </div>
      </div>

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. Hero Discrepancy Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-xs">
            <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-semibold">
              {caseData.check_type}
            </span>
            <span className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 rounded text-[11px] font-semibold">
              {caseData.reason_code}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              classification === 'AGED_LEAKAGE' 
                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                : classification === 'REFUND_ADJUSTED'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {classification === 'AGED_LEAKAGE' ? '🔴 5 Days Past SLA (Leakage)' : classification === 'REFUND_ADJUSTED' ? '⚠️ Refund Netted Off' : '🔵 In-Transit (Same-Day)'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Discrepancy #{settlementId}
          </h1>

          <p className="text-xs text-slate-600">
            Gateway Expected: <strong className="text-rose-700 tabular-nums font-semibold">{caseData.amount_display}</strong> | Actual Bank Credit: <strong className="text-slate-500 tabular-nums">₹0.00</strong> | Net Shortfall: <strong className="text-rose-700 tabular-nums font-semibold">{caseData.amount_display}</strong>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Investigation State</span>
          <span className={`px-3 py-1 rounded text-xs font-semibold uppercase ${
            caseData.status === 'RESOLVED' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {caseData.status}
          </span>
        </div>
      </div>

      {/* 3. SIDE-BY-SIDE FORENSIC EVIDENCE WORKSPACE */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-500 uppercase tracking-wider px-1">
          <span className="flex items-center space-x-1.5 font-semibold">
        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
       <span>Dual-Source Comparison (Click any cell to inspect raw vault row)</span>
       </span>
          <span className="text-rose-700 font-semibold">Variance Detected</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* LEFT: SOURCE A (RAZORPAY SETTLEMENT REPORT) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase block">Source A: Razorpay Settlement Report</span>
                <span className="text-[11px] text-slate-500">File: payment.csv (Row #{targetRow})</span>
              </div>
              <span className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium">
                Expected Value
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div 
                onClick={() => handleInspectCell('Settlement ID', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group"
              >
                <span className="text-slate-500">Settlement ID:</span>
                <span className="text-slate-900 font-semibold flex items-center space-x-1 group-hover:text-blue-700">
                  <span>{settlementId}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                </span>
              </div>

              <div 
                onClick={() => handleInspectCell('Settlement Date', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group"
              >
                <span className="text-slate-500">Settlement Date:</span>
                <span className="text-slate-900 font-semibold flex items-center space-x-1 group-hover:text-blue-700">
                  <span>{settlementDate}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                </span>
              </div>

              <div 
                onClick={() => handleInspectCell('Gross Amount', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group"
              >
                <span className="text-slate-500">Gross Settlement:</span>
                <span className="text-slate-900 font-semibold tabular-nums flex items-center space-x-1 group-hover:text-blue-700">
                  <span>₹{payload.gross_amount?.toLocaleString() || '0.00'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                </span>
              </div>

              <div 
                onClick={() => handleInspectCell('MDR Fee', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group"
              >
                <span className="text-slate-500">MDR Gateway Fee (−2%):</span>
                <span className="text-amber-800 font-semibold tabular-nums flex items-center space-x-1 group-hover:text-amber-900">
                  <span>-₹{payload.fee?.toLocaleString() || '0.00'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-700" />
                </span>
              </div>

              <div 
                onClick={() => handleInspectCell('GST on Fee', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition group"
              >
                <span className="text-slate-500">GST on MDR (−18%):</span>
                <span className="text-amber-800 font-semibold tabular-nums flex items-center space-x-1 group-hover:text-amber-900">
                  <span>-₹{payload.gst?.toLocaleString() || '0.00'}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-700" />
                </span>
              </div>

              {payload.refund_amount > 0 && (
                <div 
                  onClick={() => handleInspectCell('Refund Amount', payload.source_file_id_gateway, targetRow)}
                  className="flex justify-between p-3 bg-amber-50/80 rounded-lg border border-amber-200 cursor-pointer transition group"
                >
                  <span className="text-amber-800 font-medium">Customer Refunds Netted:</span>
                  <span className="text-amber-900 font-bold tabular-nums flex items-center space-x-1">
                    <span>-₹{payload.refund_amount?.toLocaleString()}</span>
                    <ExternalLink className="w-3 h-3 text-amber-700" />
                  </span>
                </div>
              )}

              {/* Highlighted Net Target */}
              <div 
                onClick={() => handleInspectCell('Net Payout', payload.source_file_id_gateway, targetRow)}
                className="flex justify-between p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100/60 transition group"
              >
                <span className="text-blue-900 font-semibold">Expected Net Payout:</span>
                <span className="text-blue-900 font-bold tabular-nums flex items-center space-x-1 text-sm">
                  <span>{caseData.amount_display}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: SOURCE B (HDFC BANK STATEMENT) */}
          <div className="bg-rose-50/40 border border-rose-200 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-bold uppercase px-3 py-0.5 rounded-bl-lg">
              Missing Bank Credit
            </div>

            <div className="flex justify-between items-center border-b border-rose-200/60 pb-3">
              <div>
                <span className="text-xs font-bold text-rose-900 uppercase block">Source B: HDFC Bank Statement</span>
                <span className="text-[11px] text-slate-500">File: bank.csv (Scanned All Rows)</span>
              </div>
              <span className="text-[11px] text-rose-800 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded font-medium">
                Actual Deposit
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 bg-white/90 rounded-lg border border-rose-200/80">
                <span className="text-slate-500">Searched Reference:</span>
                <span className="text-slate-900 font-semibold">{settlementId}</span>
              </div>

              <div className="flex justify-between p-3 bg-white/90 rounded-lg border border-rose-200/80">
                <span className="text-slate-500">Date Window Scanned:</span>
                <span className="text-slate-900 font-semibold">{settlementDate} ± 3 Days</span>
              </div>

              <div className="flex justify-between p-3.5 bg-rose-100/70 border border-rose-200 rounded-lg">
                <span className="text-rose-900 font-semibold">Actual Bank Credit:</span>
                <span className="text-rose-800 font-bold tabular-nums text-sm">₹0.00 (NOT FOUND)</span>
              </div>

              {/* SPECIFIC CONTEXT-AWARE ROOT CAUSE */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5 text-slate-700">
                <p className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Plain-English Root Cause:</span>
                </p>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {payload.root_cause_explanation || payload.description}
                </p>
              </div>

              {/* SPECIFIC CONTEXT-AWARE SUGGESTED REMEDIATION */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-blue-900 text-xs">
                <p className="font-semibold">Suggested Remediation:</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {payload.suggested_remediation}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CASE RESOLUTION & AUDIT LOGGING WORKFLOW */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Case Resolution & Decision Action</h3>
            <p className="text-xs text-slate-500 mt-0.5">Every action is recorded in the immutable audit trail.</p>
          </div>
          <span className="text-xs text-slate-600 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Human Authorized Decision</span>
          </span>
        </div>

        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Update Investigation Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)} 
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="INVESTIGATING">INVESTIGATING (Escalated to Razorpay / Bank Inquiry)</option>
              <option value="RESOLVED">RESOLVED (Bank Credit Confirmed / Adjustments Posted)</option>
              <option value="ACCEPTED">ACCEPTED (Approved Write-off / Timing Variance)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Resolution Notes & Auditor Comments</label>
            <textarea 
              rows={3} 
              value={resolutionText} 
              onChange={(e) => setResolutionText(e.target.value)} 
              placeholder="e.g., Ticket #90218 opened with Razorpay support with UTR request..." 
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" 
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-lg transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Commit Resolution to Audit Trail</span>
          </button>
        </form>

        {/* Audit Trail Log */}
        {caseData.audit_trail && caseData.audit_trail.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-semibold text-slate-600 flex items-center space-x-1.5 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Immutable Audit Trail</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {caseData.audit_trail.map((entry: any, idx: number) => (
                <div key={idx} className="py-2.5 flex justify-between text-slate-600">
                  <span>{entry.action} &bull; {entry.new_value?.status}</span>
                  <span className="text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. RAW SOURCE LINE INSPECTOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>Raw Source Line Inspector (Click-to-Source)</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingRow ? (
              <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
                Fetching exact line bytes from vault storage...
              </div>
            ) : rawRowData ? (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1 text-slate-600">
                  <p>Focused Field: <strong className="text-slate-900">{inspectingField}</strong></p>
                  <p>Source System: <strong className="text-slate-900">{rawRowData.file_type}</strong></p>
                  <p>Vault File: <strong className="text-slate-900">{rawRowData.filename}</strong></p>
                  <p>Source Row: <strong className="text-slate-900">#{rawRowData.row_index}</strong></p>
                  <p>SHA-256 Seal: <strong className="text-emerald-700 font-mono text-[11px]">{rawRowData.sha256_hash?.slice(0, 24)}...</strong></p>
                </div>

                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Untouched Raw CSV Record:</h4>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs overflow-x-auto max-h-56 font-mono leading-relaxed">
                  {JSON.stringify(rawRowData.raw_row_data, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}