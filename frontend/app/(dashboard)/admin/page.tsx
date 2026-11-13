'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  ArrowRight, 
  Sliders, 
  CheckCircle2, 
  X,
  CreditCard,
  Building2,
  Users,
  FileText,
  PhoneCall,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Edit3,
  UserPlus,
  Lock,
  Download,
  FileSpreadsheet,
  Check,
  Search,
  Filter,
  UserCheck
} from 'lucide-react';
import { 
  Eyebrow, 
  IndianCurrencyDisplay, 
  ThreeWayNode, 
  StatusBadge, 
  ProvenanceChip 
} from '@/components/ui/primitives';

export default function AdminGovernancePage() {
  const [activeTab, setActiveTab] = useState<'cash' | 'payment' | 'vendors' | 'debtors' | 'team' | 'audit'>('cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);

  // Cash Policy Form
  const [reserveInput, setReserveInput] = useState<string>('400000');
  const [policyMode, setPolicyMode] = useState<string>('NON_NEGOTIABLE');

  // Payment Policy Form
  const [thresholdInput, setThresholdInput] = useState<string>('50000');
  const [selectedRunDays, setSelectedRunDays] = useState<number[]>([5, 20]);

  // Vendor Override Form
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [overrideCriticality, setOverrideCriticality] = useState<string>('HIGH');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // Debtor Chase Form
  const [selectedDebtor, setSelectedDebtor] = useState<any>(null);
  const [chaseChannel, setChaseChannel] = useState<'PHONE' | 'WHATSAPP' | 'EMAIL'>('PHONE');
  const [chaseNotes, setChaseNotes] = useState<string>('');
  const [promiseDate, setPromiseDate] = useState<string>('');

  // Team Invite Form
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('auditor');

  // Audit Trail Filters
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const fetchOverview = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/admin-controls/overview');
      setOverview(res.data);
      if (res.data?.cash_policy) {
        setReserveInput(res.data.cash_policy.emergency_reserve_floor_inr?.toString() || '400000');
        setPolicyMode(res.data.cash_policy.reserve_policy_mode || 'NON_NEGOTIABLE');
      }
      if (res.data?.payment_policy) {
        setThresholdInput(res.data.payment_policy.payment_approval_threshold_inr?.toString() || '50000');
        setSelectedRunDays(res.data.payment_policy.payment_run_dates || [5, 20]);
      }
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to connect to Admin Governance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSaveCashPolicy = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const amt = parseFloat(reserveInput);
      if (isNaN(amt) || amt < 0) throw new Error('Enter a valid reserve amount.');

      await api.put('/admin-controls/cash-policy', {
        emergency_reserve_inr: amt,
        reserve_policy_mode: policyMode
      });

      setSuccessMsg('Cash Policy & Emergency Reserve successfully persisted to Render PostgreSQL.');
      fetchOverview();
      window.dispatchEvent(new Event('policyUpdated'));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error saving cash policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentPolicy = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const amt = parseFloat(thresholdInput);
      if (isNaN(amt) || amt <= 0) throw new Error('Enter a valid approval threshold.');

      await api.put('/admin-controls/payment-policy', {
        payment_approval_threshold_inr: amt,
        payment_run_dates: selectedRunDays
      });

      setSuccessMsg('Payment Policy successfully updated.');
      fetchOverview();
      window.dispatchEvent(new Event('policyUpdated'));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error saving payment policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVendorOverride = async () => {
    if (!selectedVendor || !overrideReason.trim()) {
      setErrorMsg('Mandatory audit justification is required to override vendor criticality.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.post('/admin-controls/vendor-override', {
        vendor_name: selectedVendor.vendor_name,
        confirmed_criticality: overrideCriticality,
        override_reason: overrideReason.trim()
      });
      setSelectedVendor(null);
      setOverrideReason('');
      setSuccessMsg(`Vendor override for ${selectedVendor.vendor_name} applied successfully.`);
      fetchOverview();
      window.dispatchEvent(new Event('policyUpdated'));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to save vendor override.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogChase = async () => {
    if (!selectedDebtor || !chaseNotes.trim()) {
      setErrorMsg('Follow-up conversation notes are mandatory.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.post('/admin-controls/debtors/chase', {
        debtor_id: selectedDebtor.id,
        customer_name: selectedDebtor.customer_name,
        contact_channel: chaseChannel,
        notes: chaseNotes.trim(),
        promise_to_pay_date: promiseDate || null
      });
      setSelectedDebtor(null);
      setChaseNotes('');
      setPromiseDate('');
      setSuccessMsg(`Follow-up with ${selectedDebtor.customer_name} logged and committed to audit trail.`);
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error logging debtor follow-up.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.post('/admin-controls/team/invite', {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setSuccessMsg(`Connection request dispatched to ${inviteEmail}.`);
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error sending invite.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectionAction = async (requestId: string, action: 'ACCEPT' | 'REVOKE') => {
    try {
      await api.post(`/admin-controls/team/connection-requests/${requestId}/action`, { action });
      setSuccessMsg(`Connection request ${action === 'ACCEPT' ? 'accepted' : 'revoked'}.`);
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error processing request.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin-controls/team/${userId}/role`, { role: newRole });
      setSuccessMsg('Team member role updated successfully.');
      fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error updating user role.');
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('finos_access_token') : '';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/admin-controls/audit-trail/export?format=${format}`;
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `FinOS_Audit_Dossier_2026.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccessMsg(`Audit evidence dossier downloaded as ${format.toUpperCase()}.`);
      })
      .catch(err => {
        setErrorMsg(`Failed to download ${format.toUpperCase()} export: ${err.message}`);
      });
  };

  const vendors = overview?.vendors || [];
  const debtors = overview?.debtors || [];
  const teamMembers = overview?.team || [];
  const connectionRequests = overview?.connection_requests || [];
  const auditEvents = overview?.audit_trail || [];

  const filteredEvents = auditEvents.filter((ev: any) => {
    const matchesFilter = 
      auditFilter === 'ALL' ? true :
      auditFilter === 'POLICIES' ? ev.action.includes('POLICY') :
      auditFilter === 'OVERRIDES' ? ev.action.includes('OVERRIDE') :
      auditFilter === 'DEBTORS' ? ev.action.includes('DEBTOR') :
      auditFilter === 'TEAM' ? (ev.action.includes('TEAM') || ev.action.includes('CONNECTION') || ev.action.includes('ROLE')) :
      ev.action.includes(auditFilter);

    const matchesSearch = auditSearch.trim() === '' ? true :
      ev.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      ev.reason.toLowerCase().includes(auditSearch.toLowerCase()) ||
      ev.user_email.toLowerCase().includes(auditSearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
            <Eyebrow>Enterprise Policy Governance</Eyebrow>
          </div>
          <h1 className="text-3xl font-serif text-stone-100 tracking-tight">
            Governance & <span className="italic font-normal text-brass">CFO Controls</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Configure non-negotiable liquidity floors, corporate authorization thresholds, supplier criticality, and audited permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-lg text-xs shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Send Connection Request
          </button>
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs border border-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. The 6 Governance Tabs */}
      <div className="flex border-b border-white/[0.06] space-x-1 overflow-x-auto pb-px">
        {[
          { id: 'cash', label: 'Cash Policy', icon: ShieldCheck },
          { id: 'payment', label: 'Payment Policy', icon: CreditCard },
          { id: 'vendors', label: 'Vendor Intelligence', icon: Building2 },
          { id: 'debtors', label: 'Customer Debtors', icon: TrendingUp },
          { id: 'team', label: 'Team & Access', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-brass text-white bg-ink-850/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-ink-900/30'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brass' : 'text-stone-500'}`} />
              {tab.label}
              {tab.id === 'vendors' && vendors.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-stone-800 text-stone-400 text-[10px] rounded-full">
                  {vendors.length}
                </span>
              )}
              {tab.id === 'debtors' && debtors.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-stone-800 text-stone-400 text-[10px] rounded-full">
                  {debtors.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-brick-dim border border-brick-border text-brick rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-sage-dim border border-sage-border text-sage rounded-xl text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB 1: CASH POLICY (WARM INK & MUTED BRASS) */}
      {activeTab === 'cash' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="hairline-card rounded-xl p-5 space-y-2">
              <span className="text-[10px] font-mono uppercase text-stone-500">Live Available Cash</span>
              <IndianCurrencyDisplay amount={overview?.cash_policy?.live_available_cash_inr} size="hero" className="mt-1" />
              <span className="text-[10px] text-stone-500 font-mono block truncate">
                Source: {overview?.cash_policy?.primary_cash_source || 'Detecting...'}
              </span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-2 border-brass/20">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase text-brass">Current Buffer Floor</span>
                <StatusBadge status={policyMode} variant={policyMode === 'NON_NEGOTIABLE' ? 'brick' : 'amber'} />
              </div>
              <IndianCurrencyDisplay amount={parseFloat(reserveInput || '0')} size="hero" className="mt-1 text-brass" />
              <span className="text-[10px] text-stone-500 font-mono block">Enforced in Payables Decision Queue</span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-2">
              <span className="text-[10px] font-mono uppercase text-stone-500">12-Mo Suggested Floor</span>
              <IndianCurrencyDisplay amount={overview?.cash_policy?.suggested_burn_inr} size="hero" className="mt-1" />
              <span className="text-[10px] text-stone-500 font-mono block">1.25x empirical monthly recurring burn</span>
            </div>
          </div>

          <div className="hairline-card rounded-2xl p-6 space-y-6">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brass" /> Liquidity Buffer & Laxman Rekha Policy
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">Customize your non-negotiable minimum survival cash buffer floor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-stone-400">Emergency Reserve Floor (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={reserveInput}
                    onChange={(e) => setReserveInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-brass focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  {[200000, 400000, 600000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReserveInput(amt.toString())}
                      className="px-2.5 py-1 bg-ink-850 hover:bg-ink-800 text-[10px] font-mono text-stone-300 rounded border border-white/5 transition"
                    >
                      ₹{(amt / 100000)}L
                    </button>
                  ))}
                  {overview?.cash_policy?.suggested_burn_inr && (
                    <button
                      type="button"
                      onClick={() => setReserveInput(overview.cash_policy.suggested_burn_inr.toString())}
                      className="px-2.5 py-1 bg-brass-dim hover:bg-brass-dim/80 text-[10px] font-mono text-brass rounded border border-brass/30 transition"
                    >
                      Use AI Suggested (₹{(overview.cash_policy.suggested_burn_inr / 100000).toFixed(1)}L)
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-stone-400">Policy Enforcement Mode</label>
                <select
                  value={policyMode}
                  onChange={(e) => setPolicyMode(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs font-sans focus:border-brass focus:outline-none"
                >
                  <option value="NON_NEGOTIABLE">NON_NEGOTIABLE (Strict Stop — Blocks payouts breaching reserve)</option>
                  <option value="FLEXIBLE">FLEXIBLE (Warning — Allows CFO override with mandatory reason)</option>
                </select>
                <span className="text-[10px] text-stone-500 font-sans block">
                  {policyMode === 'NON_NEGOTIABLE' 
                    ? 'Hard Circuit Breaker — Strictly blocks any payout recommendation that breaches the reserve floor.' 
                    : 'Flexible Governance — Permits emergency disbursements below buffer only with explicit CFO authorization.'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={handleSaveCashPolicy}
                disabled={saving}
                className="px-5 py-2.5 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Cash Policy & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT POLICY */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="hairline-card rounded-xl p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500">Dual Approval Limit</span>
              <div className="text-2xl font-mono text-amber font-light mt-1">₹{parseFloat(thresholdInput || '0').toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-stone-500 font-mono block">Invoices ≥ this limit flag Founder authorization</span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500">Batch Payout Run Days</span>
              <div className="text-2xl font-mono text-stone-100 font-light mt-1">
                {selectedRunDays.map((d) => `${d}th`).join(' & ')}
              </div>
              <span className="text-[10px] text-stone-500 font-mono block">Company payout cadence days</span>
            </div>

            <div className="hairline-card rounded-xl p-5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-stone-500">Disbursement Rail</span>
              <div className="text-2xl font-mono text-sage font-light mt-1">AUTO_OPTIMIZED</div>
              <span className="text-[10px] text-stone-500 font-mono block">RTGS &gt; ₹2L · NEFT &gt; ₹1L · IMPS &lt; ₹1L</span>
            </div>
          </div>

          <div className="hairline-card rounded-2xl p-6 space-y-6">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brass" /> Corporate Payment Rules & Authorization Limits
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-mono uppercase text-stone-400">Founder Approval Threshold (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white font-mono text-xs focus:border-brass focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {[25000, 50000, 100000, 250000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setThresholdInput(amt.toString())}
                      className="px-2.5 py-1 bg-ink-850 hover:bg-ink-800 text-[10px] font-mono text-stone-300 rounded border border-white/5 transition"
                    >
                      ₹{(amt / 1000)}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-mono uppercase text-stone-400">Payment Run Days (Days of Month)</label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 28, 30].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (selectedRunDays.includes(day)) {
                          if (selectedRunDays.length > 1) setSelectedRunDays(selectedRunDays.filter(d => d !== day));
                        } else {
                          setSelectedRunDays([...selectedRunDays, day].sort((a,b) => a-b));
                        }
                      }}
                      className={`w-9 h-9 rounded-lg text-xs font-mono font-bold border transition flex items-center justify-center ${
                        selectedRunDays.includes(day)
                          ? 'bg-brass text-stone-950 border-brass shadow-sm'
                          : 'bg-ink-950 border-white/10 text-stone-400 hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={handleSavePaymentPolicy}
                disabled={saving}
                className="px-5 py-2.5 bg-brass hover:bg-brass-hover text-stone-950 font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Payment Policy & Update Cadence'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR INTELLIGENCE */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="hairline-card rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brass" /> Live Vendor Behaviour & Criticality Intelligence
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">5-vector reliability score calculated from spend concentration, purchase frequency, and bank stability.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Vendor Name</th>
                    <th className="py-3 px-3">Total Spend</th>
                    <th className="py-3 px-3">Concentration</th>
                    <th className="py-3 px-3">Reliability Score</th>
                    <th className="py-3 px-3">Criticality</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-stone-200">
                  {vendors.map((v: any, idx: number) => (
                    <tr key={idx} className="hover:bg-ink-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">{v.vendor_name}</td>
                      <td className="py-3 px-3 font-mono text-stone-300">₹ {v.total_spend_inr?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="py-3 px-3 font-mono text-stone-400">{v.spend_concentration_pct}%</td>
                      <td className="py-3 px-3 font-bold text-stone-100 font-mono">
                        <span className={v.derived_score >= 80 ? 'text-sage' : v.derived_score >= 50 ? 'text-amber' : 'text-brick'}>
                          {v.derived_score}/100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          v.confirmed_criticality === 'HIGH' ? 'bg-brick-dim text-brick border-brick-border' :
                          v.confirmed_criticality === 'MEDIUM' ? 'bg-amber-dim text-amber border-amber-border' :
                          'bg-stone-900 text-stone-400 border-stone-800'
                        }`}>
                          {v.confirmed_criticality} {v.is_overridden && '(OVERRIDDEN)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedVendor(v);
                            setOverrideCriticality(v.confirmed_criticality || 'HIGH');
                            setOverrideReason(v.override_reason || '');
                          }}
                          className="px-2.5 py-1 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded text-[10px] font-semibold border border-white/10 transition"
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER DEBTORS */}
      {activeTab === 'debtors' && (
        <div className="space-y-6">
          <div className="hairline-card rounded-2xl p-6 space-y-4">
            <div className="border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brass" /> Customer Receivables & Collection Priority
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Outstanding</th>
                    <th className="py-3 px-3">Aging</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-stone-200">
                  {debtors.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-ink-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">{d.customer_name}</td>
                      <td className="py-3 px-3 font-mono font-bold text-sage">{d.outstanding_display}</td>
                      <td className="py-3 px-3 text-stone-400 font-mono">{d.days_overdue}d overdue</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-300">{d.collection_status}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          d.priority_tier === 'HIGH' ? 'bg-brick-dim text-brick border-brick-border' :
                          d.priority_tier === 'MEDIUM' ? 'bg-amber-dim text-amber border-amber-border' :
                          'bg-stone-900 text-stone-400 border-stone-800'
                        }`}>
                          {d.priority_tier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedDebtor(d);
                            setPromiseDate(d.promise_to_pay_date || '');
                          }}
                          className="px-3 py-1 bg-brick hover:bg-brick/90 text-stone-950 rounded text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <PhoneCall className="w-3 h-3" /> Chase Today
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TEAM & ACCESS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="hairline-card rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-brass" /> Active Organization Members
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Scope</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Role Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-stone-200">
                  {teamMembers.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-ink-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">{m.email}</td>
                      <td className="py-3 px-3 font-mono text-stone-300 font-semibold">{m.role.toUpperCase()}</td>
                      <td className="py-3 px-3 text-stone-400 text-[11px]">
                        {m.role === 'admin' ? 'Full Authority' :
                         m.role === 'finance_user' ? 'Disbursements & Simulations' :
                         m.role === 'auditor' ? 'Read-Only Bank & Books' : 'Observability'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-sage-dim text-sage border border-sage-border rounded text-[9px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="px-2 py-1 bg-ink-950 border border-white/10 rounded text-[11px] text-stone-300 font-mono focus:border-brass focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="finance_user">Finance Head</option>
                          <option value="auditor">CA / Auditor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Connection Requests */}
            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <span className="text-[11px] font-mono uppercase text-stone-400 block">Pending Connection Requests & CA Invites</span>
              {connectionRequests.length > 0 ? (
                <div className="space-y-2">
                  {connectionRequests.map((c: any, idx: number) => (
                    <div key={idx} className="p-3 bg-ink-950 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-stone-200 font-semibold">{c.email} ({c.role.toUpperCase()})</div>
                        <div className="text-[10px] text-stone-500 font-mono mt-0.5">Status: {c.status}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status === 'INVITED' && (
                          <>
                            <button
                              onClick={() => handleConnectionAction(c.id, 'ACCEPT')}
                              className="px-2.5 py-1 bg-sage hover:bg-sage/90 text-stone-950 rounded text-[10px] font-bold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleConnectionAction(c.id, 'REVOKE')}
                              className="px-2.5 py-1 bg-brick-dim text-brick border border-brick-border rounded text-[10px] font-semibold"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 font-mono">No pending connection requests.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="hairline-card rounded-2xl p-6 space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brass" /> Institutional Compliance Audit Trail
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">Append-only immutable record of all policy alterations and approvals.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-850 hover:bg-ink-800 text-stone-300 rounded-lg text-xs font-semibold border border-white/10 transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-sage" /> Export CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF Dossier
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'POLICIES', 'OVERRIDES', 'DEBTORS', 'TEAM', 'PAYMENT_PLAN_APPROVED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAuditFilter(f)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-semibold transition ${
                      auditFilter === f
                        ? 'bg-brass text-stone-950 font-bold'
                        : 'bg-ink-950 border border-white/5 text-stone-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search reason, actor..."
                  className="pl-8 pr-3 py-1.5 bg-ink-950 border border-white/10 rounded-lg text-white text-xs w-64 focus:border-brass focus:outline-none"
                />
              </div>
            </div>

            {/* Event Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Timestamp (UTC)</th>
                    <th className="py-3 px-3">Actor</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Entity</th>
                    <th className="py-3 px-3">Reason / Details</th>
                    <th className="py-3 px-3">SHA-256 Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-stone-200">
                  {filteredEvents.map((a: any, idx: number) => (
                    <tr key={idx} className="hover:bg-ink-800/40 transition">
                      <td className="py-3 px-3 font-mono text-stone-400 text-[11px] whitespace-nowrap">
                        {a.timestamp.substring(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white truncate max-w-[150px]">{a.user_email}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold border bg-ink-950 border-white/10 text-stone-200">
                          {a.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">{a.entity_type}</td>
                      <td className="py-3 px-3 text-stone-300 truncate max-w-xs">{a.reason}</td>
                      <td className="py-3 px-3 font-mono text-[9px] text-stone-500">
                        {a.provenance_hash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR OVERRIDE MODAL */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100">Override Criticality: {selectedVendor.vendor_name}</h3>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">Confirmed Criticality</label>
              <select
                value={overrideCriticality}
                onChange={(e) => setOverrideCriticality(e.target.value)}
                className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
              >
                <option value="HIGH">HIGH (Strategic Supplier)</option>
                <option value="MEDIUM">MEDIUM (Standard Supplier)</option>
                <option value="LOW">LOW (Replaceable)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">Audit Justification Reason *</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Business justification..."
                rows={3}
                className="w-full p-2.5 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedVendor(null)}
                className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVendorOverride}
                disabled={saving || !overrideReason.trim()}
                className="px-4 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHASE TODAY MODAL */}
      {selectedDebtor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-brick" /> Log Collections Follow-Up
                </h3>
                <span className="text-xs text-stone-400 font-mono">{selectedDebtor.customer_name}</span>
              </div>
              <button onClick={() => setSelectedDebtor(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">Follow-Up Conversation Notes *</label>
              <textarea
                value={chaseNotes}
                onChange={(e) => setChaseNotes(e.target.value)}
                placeholder="Conversation details..."
                rows={3}
                className="w-full p-2.5 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setSelectedDebtor(null)}
                className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleLogChase}
                disabled={saving || !chaseNotes.trim()}
                className="px-4 py-1.5 bg-brick hover:bg-brick/90 text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Logging...' : 'Log Follow-Up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND CONNECTION REQUEST MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hairline-card bg-ink-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-serif text-stone-100 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-brass" /> Send Connection Request
                </h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-stone-400">Invitee Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ca.auditor@firm.com"
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-stone-400">Assigned Operational Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-ink-950 border border-white/10 rounded-lg text-white text-xs focus:border-brass focus:outline-none"
                >
                  <option value="auditor">CA / Auditor (Read-Only Bank & Books)</option>
                  <option value="finance_user">Finance Head (Payment Simulation & Approval)</option>
                  <option value="viewer">Viewer (Read-Only Observability)</option>
                  <option value="admin">Admin / Co-Owner (Full Operational Access)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-3 py-1.5 bg-ink-800 hover:bg-ink-750 text-stone-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                disabled={saving || !inviteEmail.trim()}
                className="px-4 py-1.5 bg-brass hover:bg-brass-hover text-stone-950 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Dispatching...' : 'Dispatch Connection Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
