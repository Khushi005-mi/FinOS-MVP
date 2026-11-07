'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { 
  ShieldAlert, Filter, ArrowRight, ShieldCheck, 
  AlertTriangle, RefreshCw, Eye, ArrowUpRight
} from 'lucide-react';
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge 
} from '@/components/ui/primitives';

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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="hairline-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brick animate-pulse" />
            <Eyebrow>Reconciliation Exception Management</Eyebrow>
          </div>
          <h1 className="text-3xl font-serif text-stone-100 tracking-tight">
            Discrepancy & <span className="italic font-normal text-brass">Break Queue</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Review, investigate, and resolve reconciliation breaks ranked automatically by financial exposure and rupee impact.
          </p>
        </div>

        {/* Filter Selector */}
        <div className="flex items-center space-x-3 bg-ink-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-stone-400" />
          <span className="uppercase text-stone-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-stone-200 font-bold uppercase focus:outline-none cursor-pointer"
          >
            <option value="OPEN" className="bg-ink-900">OPEN</option>
            <option value="INVESTIGATING" className="bg-ink-900">INVESTIGATING</option>
            <option value="RESOLVED" className="bg-ink-900">RESOLVED</option>
            <option value="ACCEPTED" className="bg-ink-900">ACCEPTED</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-brick-dim border border-brick-border text-brick text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error loading discrepancy ledger: {error}</span>
        </div>
      )}

      {/* 2. Discrepancy Table */}
      <div className="hairline-card rounded-2xl p-6 space-y-4">
        <div className="border-b border-white/[0.06] pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brick" /> Identified Financial Exceptions ({discrepancies.length})
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">Discrepancies flagged by deterministic 3-way reconciliation engine.</p>
          </div>
          <ThreeWayNode bank={true} books={true} gateway={false} />
        </div>

        {loading ? (
          <div className="text-center py-24 text-stone-500 text-xs font-mono animate-pulse">
            Querying exception ledger under PostgreSQL RLS boundary...
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sage-dim border border-sage-border flex items-center justify-center mx-auto text-sage">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-stone-200 font-semibold text-sm">No exceptions found for status: {statusFilter}</p>
            <p className="text-xs text-stone-500 font-mono">All ingested transactions reconcile cleanly across active accounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Check Type</th>
                  <th className="py-3 px-3">Reason Code</th>
                  <th className="py-3 px-3">Rupees at Risk (Exposure)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-stone-200">
                {discrepancies.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber shrink-0" />
                      <span>{item.check_type}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-ink-950 border border-white/10 text-stone-300">
                        {item.reason_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-brick">{item.amount_display}</td>
                    <td className="py-3 px-3">
                      <StatusBadge 
                        status={item.status} 
                        variant={item.status === 'OPEN' ? 'brick' : 'sage'} 
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button 
                        onClick={() => router.push(`/cases/${item.id}`)} 
                        className="px-3 py-1 bg-ink-850 hover:bg-ink-800 border border-white/10 text-stone-200 font-semibold rounded-lg text-[11px] transition inline-flex items-center gap-1 shadow-sm"
                      >
                        <span>Investigate Case</span>
                        <ArrowRight className="w-3 h-3 text-brass" />
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
