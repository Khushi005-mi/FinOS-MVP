'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, handleApiError } from "@/lib/api";
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, 
  Info, RefreshCw, FileText, X, UploadCloud, FolderUp, 
  Check, Calendar, Clock, Lock, Sparkles, Filter, Eye
} from "lucide-react";
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge 
} from "@/components/ui/primitives";

export default function PaymentDecisionQueue() {
  const router = useRouter();
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Live Cash & Reserve State (Preserved)
  const [availableCash, setAvailableCash] = useState(0);
  const [emergencyReserve, setEmergencyReserve] = useState(0);
  const [safeCapacity, setSafeCapacity] = useState(0);
  const [reserveMode, setReserveMode] = useState("NON_NEGOTIABLE");
  const [selectedPayables, setSelectedPayables] = useState<string[]>([]);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Lineage Micro-Inspector Modal State (Preserved)
  const [activeEvidence, setActiveEvidence] = useState<any>(null);

  // Upload Bills Modal State (Preserved)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [billsFile, setBillsFile] = useState<File | null>(null);
  const [uploadingBills, setUploadingBills] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const formatINR = (val: number) => 
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/payables/decision-queue");
      const data = res.data;
      setPayables(data.items || data.payables || []);
      setAvailableCash(data.available_bank_cash_inr || data.verified_bank_cash || 0);
      setEmergencyReserve(data.emergency_reserve_floor_inr || data.emergency_reserve || 0);
      setSafeCapacity(data.safe_payment_capacity_inr || data.safe_payment_capacity || 0);
      setReserveMode(data.policy_mode || data.reserve_policy_mode || "NON_NEGOTIABLE");

      if (data.recommended_payout_ids) {
        setSelectedPayables(data.recommended_payout_ids);
      }
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const totalSelectedPayout = payables
    .filter(p => selectedPayables.includes(p.invoice_id || p.id))
    .reduce((sum, p) => sum + (p.net_payable_inr || p.amount_inr || 0), 0);

  const projectedRemainingCash = availableCash - totalSelectedPayout;
  const isReserveBreached = projectedRemainingCash < emergencyReserve;
  const headroomAmount = projectedRemainingCash - emergencyReserve;

  const discountsCaptured = payables
    .filter(p => selectedPayables.includes(p.invoice_id || p.id))
    .reduce((sum, p) => sum + (p.discount_savings_inr || p.discount_value || 0), 0);

  const toggleSelect = (id: string) => {
    setSelectedPayables(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApprovePlan = async () => {
    setApproving(true);
    setApprovalToast(null);
    try {
      await api.post("/payables/approve-plan", {
        selected_invoice_ids: selectedPayables,
        notes: "Authorized disbursement batch preserving " + formatINR(emergencyReserve) + " reserve floor."
      });
      setApprovalToast("Payment batch authorized! Committed to immutable audit log.");
      fetchQueue();
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setApproving(false);
    }
  };

  const handleUploadBills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billsFile) return;
    setUploadingBills(true);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", billsFile);
    formData.append("file_type", "VENDOR_BILLS");

    try {
      const res = await api.post("/vault/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadSuccess("Ingestion successful. Priority queue recalculated.");
      setBillsFile(null);
      fetchQueue();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      alert(handleApiError(err));
    } finally {
      setUploadingBills(false);
    }
  };

  // Triage lists
  const payNowBills = payables.filter(p => (p.decision || '').toUpperCase() === 'PAY NOW');
  const scheduleBills = payables.filter(p => (p.decision || '').toUpperCase() === 'SCHEDULE');
  const holdBills = payables.filter(p => (p.decision || '').toUpperCase() === 'HOLD' || !['PAY NOW', 'SCHEDULE'].includes((p.decision || '').toUpperCase()));

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. HERO HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89B58] animate-pulse" />
            <Eyebrow>Institutional Working Capital Protection</Eyebrow>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-stone-100 font-normal tracking-tight">
            Payables <span className="italic text-[#C89B58]">Decision Queue</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl leading-relaxed">
            Deterministic triage of open vendor commitments against verified bank cash and your non-negotiable emergency reserve.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1A1715] hover:bg-[#211E1A] text-stone-200 rounded-lg text-xs font-medium border border-white/10 transition"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#C89B58]" /> Upload Invoices
          </button>
          <button 
            onClick={fetchQueue}
            className="p-2 bg-[#1A1715] hover:bg-[#211E1A] text-stone-300 rounded-lg text-xs border border-white/10 transition"
            title="Refresh decision queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {approvalToast && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{approvalToast}</span>
          </div>
          <button onClick={() => setApprovalToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 2. CASH BUFFER GAUGE & WORKING CAPITAL HEADROOM (4 SEPARATE PADDED CARDS - NO COLLISION) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Available Bank Cash */}
          <div className="hairline-card rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Available Bank Cash</span>
              <StatusBadge status="VERIFIED" variant="sage" />
            </div>
            <div>
              <IndianCurrencyDisplay amount={availableCash} size="hero" />
            </div>
            <span className="text-[10px] text-stone-500 font-mono block pt-1 border-t border-white/[0.06]">
              Vault Bank Statement Lineage
            </span>
          </div>

          {/* Card 2: Emergency Buffer Floor */}
          <div className="hairline-card rounded-xl p-5 space-y-2 border-[#C89B58]/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#C89B58] tracking-wider">Emergency Buffer Floor</span>
              <StatusBadge status="LOCKED" variant="brass" />
            </div>
            <div>
              <IndianCurrencyDisplay amount={emergencyReserve} size="hero" className="text-[#C89B58]" />
            </div>
            <span className="text-[10px] text-stone-400 font-mono block pt-1 border-t border-white/[0.06]">
              Mode: {reserveMode.replace('CUSTOM_', '')}
            </span>
          </div>

          {/* Card 3: Safe Payment Capacity */}
          <div className="hairline-card rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Safe Payout Capacity</span>
              <StatusBadge 
                status={safeCapacity > 0 ? "SURPLUS" : "DEFICIT"} 
                variant={safeCapacity > 0 ? "sage" : "brick"} 
              />
            </div>
            <div>
              <IndianCurrencyDisplay amount={safeCapacity} size="hero" />
            </div>
            <span className="text-[10px] text-stone-500 font-mono block pt-1 border-t border-white/[0.06]">
              Headroom above Laxman Rekha
            </span>
          </div>

          {/* Card 4: Discounts Capture Potential */}
          <div className="hairline-card rounded-xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-stone-400 tracking-wider">Discounts Capture</span>
              <StatusBadge status="EARLY ROI" variant="sage" />
            </div>
            <div>
              <IndianCurrencyDisplay amount={discountsCaptured} size="hero" className="text-emerald-400" />
            </div>
            <span className="text-[10px] text-stone-500 font-mono block pt-1 border-t border-white/[0.06]">
              Early payment ROI available
            </span>
          </div>

        </div>

        {/* Proportional Buffer Protection Indicator */}
        <div className="hairline-card rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-stone-400">
            <span>Buffer Target: {formatINR(emergencyReserve)}</span>
            <span>
              Projected Post-Payout Cash: <strong className={isReserveBreached ? 'text-rose-400' : 'text-emerald-400'}>{formatINR(projectedRemainingCash)}</strong>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0C0A09] rounded-full overflow-hidden flex border border-white/5">
            <div 
              className="bg-[#C89B58] h-full" 
              style={{ width: `${Math.min(100, (emergencyReserve / Math.max(1, availableCash)) * 100)}%` }} 
              title="Emergency Reserve Floor"
            />
            <div 
              className={`h-full ${isReserveBreached ? 'bg-rose-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(100, (Math.max(0, safeCapacity) / Math.max(1, availableCash)) * 100)}%` }} 
              title="Safe Capacity"
            />
          </div>
        </div>
      </div>

      {/* 3. BATCH AUTHORIZATION ACTION STRIP */}
      {selectedPayables.length > 0 && (
        <div className="hairline-card rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-[#C89B58]/30">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-stone-200">
              Selected Disbursement Batch: <strong className="text-stone-100">{selectedPayables.length} bills</strong> totaling <strong className="text-[#C89B58]">{formatINR(totalSelectedPayout)}</strong>
            </div>
            <p className="text-[11px] text-stone-400 font-mono">
              {isReserveBreached ? (
                <span className="text-rose-400 font-semibold">⚠️ Batch breaches emergency reserve by {formatINR(Math.abs(headroomAmount))}. Founder override required.</span>
              ) : (
                <span className="text-emerald-400 font-semibold">✓ Preserves emergency reserve floor. Safe to authorize.</span>
              )}
            </p>
          </div>

          <button
            onClick={handleApprovePlan}
            disabled={approving}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              isReserveBreached && reserveMode === 'NON_NEGOTIABLE'
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-[#C89B58] hover:bg-[#D9AB6A] text-stone-950 shadow-md shadow-[#C89B58]/20'
            }`}
          >
            {approving ? 'Authorizing...' : 'Authorize Disbursement Batch'}
          </button>
        </div>
      )}

      {/* 4. TRIAGED QUEUE SECTIONS */}
      {loading ? (
        <div className="text-center py-24 text-stone-500 font-mono text-xs animate-pulse">
          Evaluating open bills against live cash buffer...
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION A: PAY NOW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-200">Pay Now Recommendations</h2>
                <span className="text-xs font-mono text-stone-500">({payNowBills.length})</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Captures early cash discount · Preserves buffer</span>
            </div>

            <div className="space-y-2">
              {payNowBills.map((p, idx) => {
                const id = p.invoice_id || p.id;
                const isSelected = selectedPayables.includes(id);

                return (
                  <div 
                    key={idx}
                    className={`hairline-card rounded-xl p-4 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                      isSelected ? 'border-[#C89B58]/40 bg-[#1A1715]' : 'hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(id)}
                        className="mt-1 accent-[#C89B58] rounded"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-100">{p.vendor_name}</span>
                          <span className="text-xs text-stone-500 font-mono">{p.invoice_number}</span>
                          <StatusBadge status="PAY NOW" variant="sage" />
                          {p.criticality === 'HIGH' && <StatusBadge status="HIGH" variant="brick" />}
                        </div>
                        <p className="text-xs text-stone-300 font-sans max-w-2xl leading-relaxed">
                          {p.trade_off_explanation || p.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-sm font-semibold text-stone-100">
                          {formatINR(p.net_payable_inr || p.amount_inr || 0)}
                        </div>
                        <span className="text-[10px] text-stone-500 block">Due in {p.days_until_due ?? p.days_to_due ?? '—'}d</span>
                      </div>
                      <button
                        onClick={() => setActiveEvidence(p)}
                        className="p-2 text-stone-400 hover:text-stone-200 border border-white/5 rounded-lg bg-[#1A1715]"
                        title="Inspect reconciliation evidence"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {payNowBills.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500 hairline-card rounded-xl">
                  No immediate disbursements recommended today. Working capital is safely preserved.
                </div>
              )}
            </div>
          </div>

          {/* SECTION B: SCHEDULE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-200">Scheduled for Cadence Batch</h2>
                <span className="text-xs font-mono text-stone-500">({scheduleBills.length})</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">Distant due date · Preserves liquidity for payroll/tax</span>
            </div>

            <div className="space-y-2">
              {scheduleBills.map((p, idx) => (
                <div key={idx} className="hairline-card rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 opacity-95">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-100">{p.vendor_name}</span>
                      <span className="text-xs text-stone-500 font-mono">{p.invoice_number}</span>
                      <StatusBadge status="SCHEDULE" variant="amber" />
                    </div>
                    <p className="text-xs text-stone-400 font-sans max-w-2xl leading-relaxed">
                      {p.trade_off_explanation || p.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-sm font-medium text-stone-200">{formatINR(p.net_payable_inr || p.amount_inr || 0)}</div>
                      <span className="text-[10px] text-stone-500 block">Due in {p.days_until_due ?? p.days_to_due ?? '—'}d</span>
                    </div>
                    <button
                      onClick={() => setActiveEvidence(p)}
                      className="p-2 text-stone-400 hover:text-stone-200 border border-white/5 rounded-lg bg-[#1A1715]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {scheduleBills.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500 hairline-card rounded-xl">
                  No bills scheduled for later cadence.
                </div>
              )}
            </div>
          </div>

          {/* SECTION C: HOLD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-200">On Hold / Liquidity Stop</h2>
                <span className="text-xs font-mono text-stone-500">({holdBills.length})</span>
              </div>
              <span className="text-[10px] text-rose-400 font-mono">Disbursing breaches reserve buffer or dispute detected</span>
            </div>

            <div className="space-y-2">
              {holdBills.map((p, idx) => (
                <div key={idx} className="hairline-card rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-rose-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-100">{p.vendor_name}</span>
                      <span className="text-xs text-stone-500 font-mono">{p.invoice_number}</span>
                      <StatusBadge status="HOLD" variant="brick" />
                    </div>
                    <p className="text-xs text-stone-400 font-sans max-w-2xl leading-relaxed">
                      {p.trade_off_explanation || p.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-sm font-medium text-stone-200">{formatINR(p.net_payable_inr || p.amount_inr || 0)}</div>
                      <span className="text-[10px] text-rose-400 block font-semibold">Breaches Floor</span>
                    </div>
                    <button
                      onClick={() => setActiveEvidence(p)}
                      className="p-2 text-stone-400 hover:text-stone-200 border border-white/5 rounded-lg bg-[#1A1715]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 5. EVIDENCE MICRO-INSPECTOR DRAWER */}
      {activeEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C89B58]" /> Provenance Evidence Inspector
                </h3>
                <span className="text-xs font-mono text-stone-400">{activeEvidence.vendor_name} · {activeEvidence.invoice_number}</span>
              </div>
              <button onClick={() => setActiveEvidence(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#0C0A09] rounded-xl space-y-2 text-xs font-mono border border-white/5">
              <div className="flex justify-between">
                <span className="text-stone-500">Gross Invoice Amount:</span>
                <span className="text-stone-200 font-bold">{formatINR(activeEvidence.gross_amount_inr || activeEvidence.amount_inr || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">TDS Deduction:</span>
                <span className="text-stone-400">₹{activeEvidence.tds_amount_inr || 0}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-1 text-[#C89B58] font-bold">
                <span>Net Payable Amount:</span>
                <span>{formatINR(activeEvidence.net_payable_inr || activeEvidence.amount_inr || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Early Discount:</span>
                <span className="text-emerald-400">{activeEvidence.discount_percentage || 0}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500">Recommendation Lineage Rationale</span>
              <p className="text-xs text-stone-300 font-sans leading-relaxed p-3 bg-[#0C0A09] rounded-lg border border-white/5">
                {activeEvidence.trade_off_explanation || activeEvidence.reason}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setActiveEvidence(null)}
                className="px-4 py-2 bg-[#1A1715] hover:bg-[#211E1A] text-stone-300 rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. UPLOAD INVOICES MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#C89B58]" /> Upload Open Vendor Bills
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Ingest CSV or Tally Purchase Register to update decision queue.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleUploadBills} className="space-y-4">
                <div className="p-6 border-2 border-dashed border-white/10 hover:border-[#C89B58]/40 rounded-xl text-center space-y-2 bg-[#0C0A09] transition">
                  <FolderUp className="w-8 h-8 text-stone-500 mx-auto" />
                  <div className="text-xs text-stone-300 font-medium">Select vendor invoices CSV or XLSX</div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setBillsFile(e.target.files?.[0] || null)}
                    className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1A1715] file:text-stone-300 cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-1.5 bg-[#1A1715] hover:bg-[#211E1A] text-stone-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingBills || !billsFile}
                    className="px-4 py-1.5 bg-[#C89B58] hover:bg-[#D9AB6A] text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {uploadingBills ? 'Ingesting...' : 'Ingest & Recalculate'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
