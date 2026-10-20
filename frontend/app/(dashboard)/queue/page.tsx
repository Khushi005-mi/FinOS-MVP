'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { ShieldAlert, Filter, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function DiscrepancyQueuePage() {
  const router = useRouter();
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('OPEN');

  const fetchDiscrepancies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/discrepancies/?status=${statusFilter}`);
      setDiscrepancies(response.data.discrepancies || []);
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepancies();
  }, [statusFilter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-2 uppercase tracking-widest font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Exception Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Discrepancy Exception Queue</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Review, investigate, and resolve reconciliation breaks ranked automatically by financial risk.
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex items-center space-x-3 bg-[#020617] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-xs uppercase text-slate-500">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-white focus:outline-none font-bold text-xs uppercase cursor-pointer"
          >
            <option value="OPEN" className="bg-[#070a10]">OPEN</option>
            <option value="INVESTIGATING" className="bg-[#070a10]">INVESTIGATING</option>
            <option value="RESOLVED" className="bg-[#070a10]">RESOLVED</option>
            <option value="ACCEPTED" className="bg-[#070a10]">ACCEPTED</option>
          </select>
        </div>
      </div>

      {error && <div className="bg-red-950/40 border border-red-900/60 text-red-300 text-sm rounded-xl p-4">{error}</div>}

      <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-24 text-slate-500 text-sm font-mono animate-pulse">Querying exception ledger under RLS...</div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-24 text-slate-500 text-sm flex flex-col items-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mb-1" />
            <p className="text-white font-semibold text-base">No exceptions found for status: {statusFilter}</p>
            <p className="text-xs text-slate-500 font-mono">All ingested transactions reconcile cleanly or have been resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#05070c] text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-4 px-6">Check Type</th>
                  <th className="py-4 px-6">Reason Code</th>
                  <th className="py-4 px-6">Rupees at Risk (Impact)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {discrepancies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-6 font-semibold text-white flex items-center space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{item.check_type}</span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg font-bold">
                        {item.reason_code}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-red-400 font-mono">{item.amount_display}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase font-mono ${
                        item.status === 'OPEN' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>{item.status}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => router.push(`/cases/${item.id}`)} className="bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-400 font-semibold px-3.5 py-2 rounded-xl transition text-xs flex items-center space-x-1.5 ml-auto shadow-sm">
                        <span>Investigate Case</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}