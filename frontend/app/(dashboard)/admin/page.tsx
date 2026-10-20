'use client';

import React, { useEffect, useState } from 'react';
import { api, handleApiError } from '@/lib/api';
import { 
  Sliders, ShieldCheck, Users, DollarSign, Building, 
  FileText, ArrowRight, UserPlus, CheckCircle2, AlertTriangle, 
  Lock, RefreshCw, X, History, ChevronRight, Loader2 
} from 'lucide-react';

export default function AdminControlsPage() {
  const [activeTab, setActiveTab] = useState<'cash' | 'payment' | 'vendors' | 'debtors' | 'connections' | 'audit'>('cash');
  const [overview, setOverview] = useState<any>(null);
  const [connections, setConnections] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection Request Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ca');
  const [inviteScopes, setInviteScopes] = useState<string[]>([
    'BANK_STATEMENTS', 'ACCOUNTING_BOOKS', 'GATEWAY_REPORTS', 'INVOICES'
  ]);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Vendor Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [overrideCriticality, setOverrideCriticality] = useState('HIGH');
  const [overrideReason, setOverrideReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, connRes] = await Promise.all([
        api.get('/admin-controls/overview'),
        api.get('/connections/')
      ]);
      setOverview(ovRes.data);
      setConnections(connRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    try {
      await api.post('/connections/send-invite', {
        email: inviteEmail,
        role: inviteRole,
        data_scopes: inviteScopes
      });
      setInviteModalOpen(false);
      setInviteEmail('');
      fetchData();
    } catch (err) {
      alert(handleApiError(err));
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleConnectionAction = async (connectionId: string, action: 'APPROVE' | 'REJECT' | 'REVOKE') => {
    try {
      await api.post('/connections/action', { connection_id: connectionId, action });
      fetchData();
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  const handleVendorOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin-controls/vendor-override', {
        vendor_name: selectedVendor.vendor_name,
        confirmed_criticality: overrideCriticality,
        override_reason: overrideReason || 'Admin confirmed commercial importance.'
      });
      setOverrideModalOpen(false);
      fetchData();
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3 text-xs text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
        <p>Loading enterprise governance policies...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Policy Governance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure cash reserves, vendor criticality, debtor collections, and audited connection permissions.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center space-x-2 shadow-sm shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Send Connection Request</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Governance Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        {[
          { id: 'cash', label: 'Cash Policy' },
          { id: 'payment', label: 'Payment Policy' },
          { id: 'vendors', label: 'Vendor Intelligence' },
          { id: 'debtors', label: 'Customer Debtors' },
          { id: 'connections', label: 'Team & Connections' },
          { id: 'audit', label: 'Audit Trail' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-1.5 rounded-lg transition text-xs font-medium ${
              activeTab === t.id 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CASH POLICY */}
      {activeTab === 'cash' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5 text-xs">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Liquidity & Emergency Reserve Policy</h3>
              <p className="text-slate-500 text-xs mt-0.5">Enforces company-specific minimum buffer targets.</p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase">
              {overview?.cash_policy?.reserve_policy_mode || 'NON_NEGOTIABLE'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px]">Primary Available Cash Source:</span>
              <p className="text-slate-900 font-semibold text-sm">{overview?.cash_policy?.available_cash_source || 'HDFC Bank Statement'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px]">Configured Reserve Floor:</span>
              <p className="text-amber-800 font-bold text-sm tabular-nums">
                ₹{overview?.cash_policy?.emergency_reserve_floor_inr?.toLocaleString() || '4,00,000'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VENDOR INTELLIGENCE */}
      {activeTab === 'vendors' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Derived Vendor Criticality Intelligence</h3>
            <p className="text-slate-500 text-xs mt-0.5">Calculated from spend concentration, purchase frequency, and supply dependency.</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-5">Vendor Name</th>
                <th className="py-3 px-5">Credit Terms</th>
                <th className="py-3 px-5">Derived Score</th>
                <th className="py-3 px-5">Confirmed Criticality</th>
                <th className="py-3 px-5 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.vendor_policies || []).map((v: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{v.vendor_name}</td>
                  <td className="py-3.5 px-5 text-slate-600">{v.credit_terms}</td>
                  <td className="py-3.5 px-5 text-blue-700 font-semibold tabular-nums">{v.derived_score} / 100</td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                      v.confirmed_criticality === 'HIGH' 
                        ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {v.confirmed_criticality} {v.is_overridden ? '(Overridden)' : ''}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => { setSelectedVendor(v); setOverrideModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CUSTOMER DEBTORS */}
      {activeTab === 'debtors' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Customer Collection Priority Intelligence</h3>
            <p className="text-slate-500 text-xs mt-0.5">Scored by days overdue, exposure ratio, and historical settlement behavior.</p>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-5">Customer Name</th>
                <th className="py-3 px-5">Outstanding</th>
                <th className="py-3 px-5">Overdue Days</th>
                <th className="py-3 px-5">Priority</th>
                <th className="py-3 px-5 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(overview?.customer_intelligence || []).map((c: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{c.customer_name}</td>
                  <td className="py-3.5 px-5 text-emerald-700 font-bold tabular-nums">{c.outstanding_display}</td>
                  <td className="py-3.5 px-5 text-rose-700 font-semibold tabular-nums">{c.days_overdue} Days</td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                      c.collection_priority === 'HIGH' 
                        ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {c.collection_priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right text-blue-700 font-semibold">{c.recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: TEAM & CONNECTIONS */}
      {activeTab === 'connections' && (
        <div className="space-y-5 text-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Active Organization Members</h3>
            <div className="divide-y divide-slate-100">
              {(connections?.active_members || []).map((m: any) => (
                <div key={m.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-900 block">{m.email}</span>
                    <span className="text-slate-500 text-[11px]">Role: {m.role}</span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase">Active</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Pending Connection Requests</h3>
            {(connections?.connection_requests || []).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {connections.connection_requests.map((c: any) => (
                  <div key={c.id} className="py-3 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-900 block">{c.email}</span>
                      <span className="text-slate-500 text-[11px]">Requested Role: {c.role} &bull; Status: {c.status}</span>
                    </div>
                    {c.status === 'PENDING_APPROVAL' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleConnectionAction(c.id, 'APPROVE')}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-xs font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleConnectionAction(c.id, 'REJECT')}
                          className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 px-3 py-1 rounded text-xs font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 py-2">No pending connection requests.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Immutable Event Ledger</h3>
          <div className="divide-y divide-slate-100">
            {(overview?.audit_trail || []).map((a: any) => (
              <div key={a.id} className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-900">{a.action}</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">{JSON.stringify(a.details)}</span>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0 ml-4">{new Date(a.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONNECTION REQUEST MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Send Connection Request</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold uppercase text-[10px] tracking-wider mb-1">Invitee Work Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ca.sharma@auditfirm.com"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold uppercase text-[10px] tracking-wider mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ca">CA / External Auditor</option>
                  <option value="accountant">Accountant</option>
                  <option value="finance_head">Finance Head</option>
                  <option value="investor">Investor / Board Member</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submittingInvite}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition shadow-sm"
              >
                {submittingInvite ? 'Dispatching...' : 'Dispatch Connection Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR OVERRIDE MODAL */}
      {overrideModalOpen && selectedVendor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Override Vendor Criticality</h3>
              <button onClick={() => setOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleVendorOverride} className="space-y-4">
              <p className="text-slate-600">Vendor: <strong className="text-slate-900">{selectedVendor.vendor_name}</strong></p>
              <p className="text-slate-600">Derived Criticality: <strong className="text-blue-700">{selectedVendor.derived_criticality}</strong></p>
              <div>
                <label className="block text-slate-700 font-semibold uppercase text-[10px] tracking-wider mb-1">Confirmed Criticality</label>
                <select
                  value={overrideCriticality}
                  onChange={(e) => setOverrideCriticality(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HIGH">HIGH CRITICALITY</option>
                  <option value="MEDIUM">MEDIUM CRITICALITY</option>
                  <option value="LOW">LOW CRITICALITY</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold uppercase text-[10px] tracking-wider mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State commercial rationale..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition shadow-sm">
                Commit Override to Audit Trail
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}