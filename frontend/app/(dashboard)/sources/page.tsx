'use client';

import React, { useEffect, useState } from "react";
import { api, handleApiError } from "@/lib/api";
import { 
  Database, ShieldCheck, HardDrive, CheckCircle2, 
  RefreshCw, Edit3, X, FileText, UploadCloud, AlertCircle,
  TrendingUp, Users, Clock, Sparkles, FolderUp, Check,
  Building2, Hash, FileSpreadsheet
} from "lucide-react";
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge, 
  ProvenanceChip 
} from "@/components/ui/primitives";

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState<"sources" | "intelligence">("sources");
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal State (Preserved)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editPan, setEditPan] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Historical Upload Modal State (Preserved)
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [histFile, setHistFile] = useState<File | null>(null);
  const [histCategory, setHistCategory] = useState("HISTORICAL_LEDGER");
  const [uploadingHist, setUploadingHist] = useState(false);
  const [histSuccess, setHistSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, summaryRes, filesRes, intelRes] = await Promise.all([
        api.get("/profiles/"),
        api.get("/vault/sources-summary"),
        api.get("/vault/"),
        api.get("/vault/intelligence-profiles")
      ]);
      setProfile(profileRes.data);
      setEditName(profileRes.data.name || "");
      setEditGstin(profileRes.data.gstin || "");
      setEditPan(profileRes.data.pan || "");
      setSummary(summaryRes.data);
      setVaultFiles(Array.isArray(filesRes.data) ? filesRes.data : []);
      setIntelligence(intelRes.data);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put("/profiles/", {
        name: editName,
        gstin: editGstin,
        pan: editPan
      });
      setProfile(res.data);
      setShowEditModal(false);
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: unknown) {
      alert(handleApiError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadHistorical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!histFile) return;
    setUploadingHist(true);
    setHistSuccess(null);

    const formData = new FormData();
    formData.append("file", histFile);
    formData.append("file_type", histCategory);
    formData.append("is_historical", "true");

    try {
      const res = await api.post("/vault/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setHistSuccess("Successfully ingested " + histFile.name + " (" + res.data.rows_parsed + " historical rows). Intelligence recalculated.");
      setHistFile(null);
      fetchData();
      setTimeout(() => {
        setShowHistoricalModal(false);
        setHistSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      alert(handleApiError(err));
    } finally {
      setUploadingHist(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
            <Eyebrow>Multi-Source Cryptographic Lineage</Eyebrow>
          </div>
          <h1 className="text-3xl font-serif text-stone-100 tracking-tight">
            Financial Vault & <span className="italic font-normal text-brass">Intelligence Profiles</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Normalized transaction streams sealed with SHA-256 hashes. Bank statements, Tally ledgers, and payment gateway settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistoricalModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-lg text-xs shadow-sm transition"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Ingest Historical Baseline
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs border border-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-brick-dim border border-brick-border text-brick rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Vault Sync Error: {error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 2. TENANT LEGAL PROFILE CARD */}
      <div className="hairline-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ink-800 border border-white/10 flex items-center justify-center text-brass font-serif font-bold text-lg">
            {profile?.name ? profile.name.charAt(0) : 'F'}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-100">{profile?.name || 'Loading Legal Profile...'}</h2>
              <StatusBadge status="ACTIVE TENANT" variant="sage" />
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono text-stone-400 pt-0.5">
              <span>GSTIN: <strong className="text-stone-300">{profile?.gstin || '—'}</strong></span>
              <span>PAN: <strong className="text-stone-300">{profile?.pan || '—'}</strong></span>
              <span>FY: <strong className="text-stone-300">{profile?.financial_year || '2026–2027'}</strong></span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs font-medium border border-white/10 transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-brass" /> Edit Legal Profile
        </button>
      </div>

      {/* 3. VAULT TABS */}
      <div className="flex border-b border-white/[0.06] space-x-1">
        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'sources'
              ? 'border-brass text-white bg-ink-850/60'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-brass" /> Connected Sources & Vault Files ({vaultFiles.length})
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'intelligence'
              ? 'border-brass text-white bg-ink-850/60'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-sage" /> Historical Intelligence Profiles
        </button>
      </div>

      {/* TAB A: SOURCES & VAULT FILES */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Adapter Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Bank Statement Stream', count: summary?.bank_transactions_count || 0, status: 'ACTIVE', type: 'HDFC / ICICI' },
              { label: 'Tally Daybook & Registers', count: summary?.ledger_entries_count || 0, status: 'ACTIVE', type: 'VOUCHER LEDGER' },
              { label: 'Razorpay Gateway Settlements', count: summary?.settlements_count || 0, status: 'ACTIVE', type: 'MDR / GST NET' },
              { label: 'Vendor Commercial Bills', count: summary?.vendor_invoices_count || 0, status: 'ACTIVE', type: 'COMMERCIAL INVOICES' },
            ].map((s, idx) => (
              <div key={idx} className="hairline-card rounded-xl p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase text-stone-500">{s.type}</span>
                  <StatusBadge status={s.status} variant="sage" />
                </div>
                <div className="text-2xl font-light font-mono text-stone-100">{s.count.toLocaleString('en-IN')}</div>
                <div className="text-xs text-stone-400 font-sans">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Files List */}
          <div className="hairline-card rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brass" /> Vault Source Files & Cryptographic Provenance
            </h3>

            {vaultFiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Filename</th>
                      <th className="py-3 px-3">Stream Type</th>
                      <th className="py-3 px-3">Records</th>
                      <th className="py-3 px-3">Temporal Flag</th>
                      <th className="py-3 px-3">SHA-256 Provenance Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-stone-300">
                    {vaultFiles.map((f, idx) => (
                      <tr key={idx} className="hover:bg-ink-800/40 transition">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-stone-400" />
                          {f.filename}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-400">{f.file_type}</td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-200">{f.records_count || f.row_count || 0}</td>
                        <td className="py-3 px-3">
                          {f.is_historical ? (
                            <span className="px-2 py-0.5 bg-amber-dim text-amber border border-amber-border rounded text-[9px] font-bold">
                              HISTORICAL TRAINING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-sage-dim text-sage border border-sage-border rounded text-[9px] font-bold">
                              CURRENT BATCH
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-stone-500 truncate max-w-xs">
                          {f.sha256_hash || f.file_hash || 'SHA256_SEALED'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-stone-500 text-xs">
                No files uploaded yet. Click &quot;Ingest Historical Baseline&quot; to begin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: HISTORICAL INTELLIGENCE PROFILES */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="hairline-card rounded-xl p-5 space-y-2">
              <Eyebrow>12-Month Historical Fixed Burn</Eyebrow>
              <div className="text-2xl font-light font-mono text-stone-100">
                ₹{((intelligence?.monthly_fixed_burn_paise || 0) / 100).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 font-mono block">Recurring payroll, lease, statutory taxes</span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-2">
              <Eyebrow>Recommended Survival Buffer</Eyebrow>
              <div className="text-2xl font-light font-mono text-brass">
                ₹{((intelligence?.recommended_buffer_paise || 0) / 100).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-stone-500 font-mono block">1.25x empirical monthly burn</span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-2">
              <Eyebrow>Average Debtor DSO Velocity</Eyebrow>
              <div className="text-2xl font-light font-mono text-sage">
                {intelligence?.average_dso_days || 34} Days
              </div>
              <span className="text-[10px] text-stone-500 font-mono block">Days sales outstanding collection cycle</span>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (PRESERVED) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brass" /> Edit Tenant Legal Entity
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase">Legal Entity Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase">Company GSTIN</label>
                <input
                  type="text"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs font-mono focus:border-brass focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase">Permanent Account Number (PAN)</label>
                <input
                  type="text"
                  value={editPan}
                  onChange={(e) => setEditPan(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs font-mono focus:border-brass focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD HISTORICAL MODAL (PRESERVED) */}
      {showHistoricalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-brass" /> Ingest Historical Baseline Data
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Train vendor scoring without polluting live bank cash balance.</p>
              </div>
              <button onClick={() => setShowHistoricalModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {histSuccess ? (
              <div className="p-4 bg-sage-dim border border-sage-border text-sage rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{histSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleUploadHistorical} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-400 uppercase">Stream Category</label>
                  <select
                    value={histCategory}
                    onChange={(e) => setHistCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
                  >
                    <option value="HISTORICAL_LEDGER">Historical Tally Daybook (12–24 Months)</option>
                    <option value="HISTORICAL_BANK">Historical Bank Statement</option>
                    <option value="HISTORICAL_BILLS">Historical Vendor Purchase Register</option>
                  </select>
                </div>

                <div className="p-6 border-2 border-dashed border-white/10 hover:border-brass/40 rounded-xl text-center space-y-2 bg-ink-950 transition">
                  <FolderUp className="w-8 h-8 text-stone-500 mx-auto" />
                  <div className="text-xs text-stone-300 font-medium">Select historical CSV or XLSX file</div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setHistFile(e.target.files?.[0] || null)}
                    className="text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-ink-800 file:text-stone-300 cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowHistoricalModal(false)}
                    className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingHist || !histFile}
                    className="px-4 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {uploadingHist ? 'Processing...' : 'Ingest & Train Engine'}
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
