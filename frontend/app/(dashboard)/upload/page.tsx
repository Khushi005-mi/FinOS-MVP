'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  UploadCloud, CheckCircle2, AlertCircle, Loader2, Play, 
  Database, ArrowRight, RefreshCw, X 
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState('HDFC_BANK');
  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultFiles = async () => {
    try {
      const res = await api.get('/vault/');
      setVaultFiles(res.data.sources || []);
    } catch (err: unknown) {
      console.error('Failed to fetch vault sources', err);
    }
  };

  useEffect(() => {
    fetchVaultFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    // 15-second failsafe timeout so the UI never hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('finos_access_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

      // Native fetch handles multipart boundaries automatically without Axios header clobbering
      const response = await fetch(`${apiUrl}/vault/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed on server.');
      }

      setUploadResult(data);
      setFile(null);
      fetchVaultFiles();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Upload timed out after 15 seconds. Please check if your backend is running.');
      } else {
        setError(err.message || 'An unexpected error occurred during upload.');
      }
    } finally {
      clearTimeout(timeoutId);
      setUploading(false);
    }
  };

  const handleRunReconciliation = async () => {
    setReconciling(true);
    setError(null);
    try {
      const response = await api.post('/reconciliation/run-matching', { check_type: 'CHECK_2_GATEWAY_TO_BANK' });
      setMatchResult(response.data);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Data Ingestion</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Source Records Ingestion</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Uploaded files are SHA-256 fingerprinted, normalized into signed integer paise, and reconciled automatically.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-2.5 rounded-lg transition shadow-sm flex items-center space-x-2 shrink-0"
        >
          <span>View Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Upload Form */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900">Upload Financial File</h3>
          
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Source Type
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition"
              >
                <option value="HDFC_BANK">HDFC Bank Statement (Bank Source)</option>
                <option value="RAZORPAY_GATEWAY">Razorpay Settlement Report (Gateway Source)</option>
                <option value="TALLY_LEDGER">Tally Daybook Export (Accounting Books)</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition bg-slate-50/60 hover:bg-blue-50/20 group">
              <input type="file" id="file-upload" onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2.5">
                <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm group-hover:scale-105 transition">
                  <UploadCloud className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-xs text-slate-700 font-semibold">
                  {file ? file.name : 'Click to browse or drop CSV / Excel file'}
                </div>
                <p className="text-[11px] text-slate-500">Automatic normalization & verification enabled</p>
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition text-xs shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  <span>Ingesting & Reconciling...</span>
                </>
              ) : (
                <span>Upload & Process Immediately</span>
              )}
            </button>
          </form>

          {uploadResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-xs text-emerald-950 space-y-2.5 shadow-sm">
              <p className="font-bold flex items-center space-x-2 text-sm text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadResult.message}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-emerald-200">
                <p>Detected Type: <strong className="text-slate-900 font-semibold">{uploadResult.detected_type}</strong></p>
                <p>Records Ingested: <strong className="text-slate-900 font-semibold tabular-nums">{uploadResult.imported_records}</strong></p>
                <p>Matches Created: <strong className="text-slate-900 font-semibold tabular-nums">{uploadResult.reconciliation?.matches_created ?? 0}</strong></p>
                <p>Discrepancies Found: <strong className="text-rose-700 font-semibold tabular-nums">{uploadResult.reconciliation?.discrepancies_created ?? 0}</strong></p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2 rounded-lg transition text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <span>See Updated Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Vault Sources & Manual Re-run */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Active Ingested Files</h3>
              <button 
                onClick={fetchVaultFiles} 
                className="text-slate-400 hover:text-slate-700 transition"
                title="Refresh list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {vaultFiles.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No files uploaded yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {vaultFiles.map((f) => (
                  <div key={f.file_id} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900 truncate max-w-[130px]">{f.filename}</span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">{f.file_type}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="tabular-nums">{f.row_count} rows in DB</span>
                      <span className="text-emerald-700 font-semibold">{f.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Manual Verification Run</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Re-executes multi-pass matching across all active database records.</p>
            <button
              onClick={handleRunReconciliation}
              disabled={reconciling}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center space-x-2 shadow-sm"
            >
              {reconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" /> : <Play className="w-3.5 h-3.5 text-slate-700" />}
              <span>Run Matching Check</span>
            </button>
            {matchResult && (
              <p className="text-xs text-emerald-700 font-medium">
                Verified: {matchResult.matches_created} matches, {matchResult.discrepancies_created} discrepancies.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}