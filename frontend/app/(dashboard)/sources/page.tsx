'use client';

import React, { useEffect, useState } from 'react';
import { api, handleApiError } from '@/lib/api';
import { Database, ShieldCheck, HardDrive, CheckCircle2 } from 'lucide-react';

export default function SourcesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profiles/');
        setProfile(res.data);
      } catch (err: unknown) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Source Registry & Vault</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Sources & Tenant Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage connected financial systems, SHA-256 vault provenance, and workspace legal entity settings (F1).
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-24 text-slate-500 text-xs">Loading workspace legal entity profile...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Profile */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Workspace Legal Entity Profile (F1)</span>
            </h3>
            <div className="text-xs text-slate-700 space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p><span className="text-slate-500">Legal Company Name:</span> <strong className="text-slate-900 font-semibold">{profile?.name || 'Sharma Traders Pvt Ltd'}</strong></p>
              <p><span className="text-slate-500">GSTIN:</span> <strong className="text-slate-900 font-semibold">{profile?.gstin || '27ABCDE1234F1Z5'}</strong></p>
              <p><span className="text-slate-500">Permanent Account Number (PAN):</span> <strong className="text-slate-900 font-semibold">{profile?.pan || 'ABCDE1234F'}</strong></p>
              <p><span className="text-slate-500">Financial Year Cycle:</span> <strong className="text-slate-900 font-semibold">01 April to 31 March ({profile?.financial_year_start || '04-01'})</strong></p>
            </div>
          </div>

          {/* Connected Adapters */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Active Multi-Source Ingestion Adapters (F3)</span>
            </h3>
            <div className="space-y-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-900">HDFC Bank Statement Ingestion</p>
                  <p className="text-slate-500 text-[11px]">Format: CSV / Excel &bull; Auto-detects narrations, UTRs & closing balances</p>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase">Ready</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-900">Razorpay Gateway Settlement Reports</p>
                  <p className="text-slate-500 text-[11px]">Format: CSV &bull; Decomposes Gross, MDR fee, 18% GST & customer refunds</p>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase">Ready</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-900">Tally Prime Daybook Accounting Books</p>
                  <p className="text-slate-500 text-[11px]">Format: Excel / CSV &bull; Reconciles Receipts, Payments & Gross Ledger entries</p>
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase">Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}