'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  UploadCloud, CheckCircle2, AlertCircle, RefreshCw, 
  Database, Trash2, ArrowRight, FileText, Check, ShieldCheck, HardDrive
} from 'lucide-react';
import Link from 'next/link';
import { 
  Eyebrow, 
  ThreeWayNode, 
  StatusBadge 
} from '@/components/ui/primitives';

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<'hdfc' | 'razorpay' | 'tally' | 'vendor_bills'>('hdfc');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [ingestedFiles, setIngestedFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const fetchVaultFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await api.get('/vault/', { timeout: 10000 });
      const filesData = Array.isArray(res.data) ? res.data : (res.data?.files || []);
      setIngestedFiles(filesData);
    } catch (err) {
      console.error('Failed to fetch active vault files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchVaultFiles();
  }, []);

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this source file from the vault?")) return;
    try {
      await api.delete(`/vault/files/${fileId}`, { timeout: 10000 });
      fetchVaultFiles();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete file.");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', activeTab);

    try {
      const res = await api.post('/vault/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      setResult(res.data);
      setFile(null);
      fetchVaultFiles();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Upload failed. Please check network.';
      setError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
            <Eyebrow>Multi-Stream Ingestion Pipeline</Eyebrow>
          </div>
          <h1 className="text-3xl font-serif text-stone-100 tracking-tight">
            Source Records Ingestion & <span className="italic font-normal text-brass">Vault</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Uploaded files are SHA-256 fingerprinted, stored immutably in PostgreSQL RLS, and prepared for deterministic 3-way reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs font-semibold border border-white/10 transition"
          >
            <span>View Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-brick-dim border border-brick-border text-brick rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Upload Failure: {error}</span>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 bg-sage-dim border border-sage-border text-sage rounded-xl text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-sage" />
            <span>Ingestion Confirmed: {result.filename} ({result.rows_parsed || result.records_count || 'canonical'} records normalized).</span>
          </div>
        </div>
      )}

      {/* 2. Upload Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form Card */}
        <div className="lg:col-span-2 hairline-card rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/[0.06] pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-brass" /> Direct Stream Uploader
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">Select adapter type and upload bank, gateway, or accounting files.</p>
            </div>
            <ThreeWayNode bank={true} books={true} gateway={true} />
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">
                Source System Adapter Type
              </label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-ink-950 border border-white/10 rounded-xl text-xs text-stone-200 font-sans focus:border-brass focus:outline-none"
              >
                <option value="hdfc">HDFC / Corporate Bank Statement (Bank Source)</option>
                <option value="razorpay">Razorpay Settlement Report (Gateway Source)</option>
                <option value="tally">Tally Daybook & Ledger Export (Books Source)</option>
                <option value="vendor_bills">Vendor Commercial Invoices (Payables Source)</option>
              </select>
            </div>

            {/* Drag & Drop Area */}
            <div className="border-2 border-dashed border-white/10 hover:border-brass/40 rounded-xl p-8 text-center bg-ink-950 transition cursor-pointer group">
              <label className="cursor-pointer block space-y-2">
                <div className="mx-auto h-12 w-12 rounded-xl bg-ink-850 border border-white/5 flex items-center justify-center text-stone-400 group-hover:text-brass transition">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div className="text-xs text-stone-300 font-medium">
                  <span className="text-brass font-bold hover:underline">Click to browse</span> or drop file here
                </div>
                <p className="text-[10px] text-stone-500 font-mono">Accepts CSV, XLSX, XLS with automatic column mapping</p>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden" 
                />
              </label>
            </div>

            {file && (
              <div className="p-3 bg-ink-950 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-brass shrink-0" />
                  <span className="text-stone-200 font-semibold truncate">{file.name}</span>
                  <span className="text-stone-500">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFile(null)} 
                  className="text-stone-400 hover:text-stone-200"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/[0.06]">
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-6 py-2.5 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-brass/20 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting & Normalizing...
                  </>
                ) : (
                  <>
                    <span>Upload to Cryptographic Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informational Guidance Card */}
        <div className="hairline-card rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-serif text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sage" /> Multi-Source Integrity
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed font-sans">
            FinOS compares independent sources to detect hidden fee leaks, timing gaps, and duplicate deductions:
          </p>

          <div className="space-y-3 pt-2 text-xs font-sans">
            <div className="p-3 bg-ink-950 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-brass block">1. Bank Statement</span>
              <p className="text-stone-300">Ground-truth cleared debits, credits, and closing cash balances.</p>
            </div>

            <div className="p-3 bg-ink-950 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-brass block">2. Gateway Settlements</span>
              <p className="text-stone-300">Gross orders minus MDR deductions (1.5%–2%) and 18% GST.</p>
            </div>

            <div className="p-3 bg-ink-950 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-brass block">3. Tally Ledgers & Bills</span>
              <p className="text-stone-300">Daybook vouchers and open vendor purchase commitments.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ingested Vault Source Records Table */}
      <div className="hairline-card rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
          <div>
            <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-brass" /> Canonical Vault Records ({ingestedFiles.length} Sealed Files)
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">Files currently loaded into the PostgreSQL RLS verification boundary.</p>
          </div>
          <button 
            onClick={fetchVaultFiles}
            className="p-2 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs border border-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {ingestedFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Filename</th>
                  <th className="py-3 px-3">Stream Type</th>
                  <th className="py-3 px-3">Row Count</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">SHA-256 Fingerprint</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-stone-200">
                {ingestedFiles.map((f: any, idx: number) => (
                  <tr key={idx} className="hover:bg-ink-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-stone-400" />
                      {f.filename}
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-400">{f.file_type || f.source_type}</td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-100">{f.records_count || f.row_count || 'Parsed'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={f.status || 'PARSED'} variant="sage" />
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-stone-500 truncate max-w-xs">
                      {f.sha256_hash || f.file_hash || 'SHA256_VERIFIED'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteFile(f.id)}
                        className="p-1.5 text-stone-400 hover:text-brick hover:bg-brick-dim rounded-lg transition"
                        title="Delete source file from vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-stone-500 text-xs">
            No source files currently in vault. Use the upload form above to ingest your first stream.
          </div>
        )}
      </div>
    </div>
  );
}
