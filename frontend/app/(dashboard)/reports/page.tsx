'use client';

import React, { useState, useEffect } from 'react';
import { api, handleApiError } from '@/lib/api';
import { 
  FileText, Download, ShieldCheck, 
  Calendar, CheckCircle2, AlertCircle, FileCheck,
  Building2, Hash, Lock, Clock, ArrowRight
} from 'lucide-react';
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge, 
  ProvenanceChip 
} from '@/components/ui/primitives';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dynamic Audit Reporting Period Selection (Preserved)
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [companyName, setCompanyName] = useState('Workspace');
  const [periodPreset, setPeriodPreset] = useState('OCT_2026');

  useEffect(() => {
    api.get('/profiles/')
      .then((res) => {
        if (res.data?.name) setCompanyName(res.data.name);
      })
      .catch(() => {});
  }, []);

  const handlePresetChange = (preset: string) => {
    setPeriodPreset(preset);
    if (preset === 'OCT_2026') {
      setStartDate('2026-10-01');
      setEndDate('2026-10-31');
    } else if (preset === 'Q3_2026') {
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
    } else if (preset === 'CURRENT_FY') {
      setStartDate('2026-04-01');
      setEndDate('2027-03-31');
    }
  };

  const handleDownloadEvidencePack = async () => {
    setDownloading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.get(`/reports/evidence-pack/${startDate}/${endDate}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = `FinOS_Audit_Dossier_${companyName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(`Downloaded ${downloadName} successfully.`);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
            <Eyebrow>Statutory Verification & Lending Compliance</Eyebrow>
          </div>
          <h1 className="text-3xl font-serif text-stone-100 tracking-tight">
            Audit Evidence Packs & <span className="italic font-normal text-brass">Dossiers</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Compile tamper-evident PDF dossiers with embedded SHA-256 provenance hashes for chartered accountants, statutory auditors, and lenders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status="AUDIT READY" variant="sage" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-brick-dim border border-brick-border text-brick rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-sage-dim border border-sage-border text-sage rounded-xl text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 2. Audit Report Configuration Card */}
      <div className="hairline-card rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-ink-800 text-brass rounded-xl border border-white/5">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif text-stone-100">
                Executive Reconciliation & Provenance Dossier
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                Entity: <strong className="text-stone-200">{companyName}</strong> · Certified against live Render PostgreSQL records
              </p>
            </div>
          </div>
          <ThreeWayNode bank={true} books={true} gateway={true} />
        </div>

        {/* Period Preset Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-stone-400">Audit Accounting Period Preset</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'OCT_2026', label: 'October 2026 (Monthly Run)', sub: '1 Oct – 31 Oct 2026' },
              { id: 'Q3_2026', label: 'Q3 2026 (Quarterly Close)', sub: '1 Jul – 30 Sep 2026' },
              { id: 'CURRENT_FY', label: 'Full FY 2026–2027', sub: '1 Apr 2026 – 31 Mar 2027' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`p-3.5 rounded-xl border text-left transition space-y-0.5 ${
                  periodPreset === p.id
                    ? 'border-brass bg-ink-850 shadow-sm'
                    : 'border-white/5 bg-ink-950 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className={`text-xs font-semibold ${periodPreset === p.id ? 'text-brass' : 'text-stone-300'}`}>
                  {p.label}
                </div>
                <div className="text-[10px] font-mono text-stone-500">{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-stone-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-500" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-brass focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-stone-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-500" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-brass focus:outline-none"
            />
          </div>
        </div>

        {/* What Is Included in This Dossier */}
        <div className="p-4 bg-ink-950 rounded-xl space-y-2 text-xs font-mono border border-white/5">
          <span className="text-[10px] uppercase text-stone-500 font-semibold block">Compiled Statutory Pack Includes:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
              <span>Three-Way Reconciliation Proofs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
              <span>SHA-256 Vault File Integrity Hashes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
              <span>MDR Fee Leakage & GST Discrepancies</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
              <span>Auditor Verification Sign-Off Block</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-white/[0.06]">
          <button
            onClick={handleDownloadEvidencePack}
            disabled={downloading}
            className="px-6 py-2.5 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-brass/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Compiling Binary PDF Dossier...' : 'Download Statutory Evidence Pack (PDF)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
