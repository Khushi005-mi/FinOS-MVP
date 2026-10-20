'use client';

import React, { useState } from 'react';
import { api, handleApiError } from '@/lib/api';
import { FileText, Download, Loader2, ShieldCheck } from 'lucide-react';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadEvidencePack = async () => {
    setDownloading(true);
    setError(null);

    try {
      // Pass dynamic period strings matching backend route: /reports/evidence-pack/{start}/{end}
      const startDate = '2026-10-01';
      const endDate = '2026-10-31';

      const response = await api.get(`/reports/evidence-pack/${startDate}/${endDate}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinOS_Evidence_Pack_${startDate}_to_${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-2 uppercase tracking-widest font-bold">
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Compliance</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Audit Evidence Packs & Reports</h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate tamper-evident PDF reports complete with SHA-256 source provenance hashes for CAs and auditors (F10).
        </p>
      </div>

      {error && <div className="bg-red-950/40 border border-red-900/60 text-red-300 text-sm rounded-xl p-4">{error}</div>}

      <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 shadow-2xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-white font-bold text-base">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>October 2026 Period Audit Pack</span>
          </div>
          <p className="text-xs text-slate-400 font-mono">Includes reconciliation summary, open exceptions, and vault file SHA-256 hashes.</p>
        </div>

        <button
          onClick={handleDownloadEvidencePack}
          disabled={downloading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition text-sm flex items-center space-x-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 shrink-0"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{downloading ? 'Generating PDF...' : 'Download Evidence PDF'}</span>
        </button>
      </div>
    </div>
  );
}