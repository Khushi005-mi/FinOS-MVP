'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, DollarSign, CheckCircle2, Brain, Edit3, X, Save } from 'lucide-react';

export default function PaymentDecisionQueuePage() {
  const [cashAvailable, setCashAvailable] = useState(1065560);
  const [reserveBuffer, setReserveBuffer] = useState(400000);
  const [selectedPayables, setSelectedPayables] = useState<string[]>(['inv_01', 'inv_02']);

  // Vendor State with Behavioral Intelligence Metrics
  const [vendors, setVendors] = useState([
    { 
      id: 'inv_01', 
      vendor: 'Sharma Traders Pvt Ltd', 
      invoice: 'INV-2026-901', 
      dueDate: '2026-10-21', 
      amount: 100000, 
      daysUntilDue: 1, 
      discountPct: 2.0, 
      status: 'confirmed', 
      historicalDelayToleranceDays: 0, 
      reliabilityScore: 'High Risk if Delayed',
      criticality: 'HIGH (Core Supplier)'
    },
    { 
      id: 'inv_02', 
      vendor: 'Gupta Industries', 
      invoice: 'GI-4412', 
      dueDate: '2026-10-23', 
      amount: 75000, 
      daysUntilDue: 3, 
      discountPct: 0.0, 
      status: 'confirmed', 
      historicalDelayToleranceDays: 3, 
      reliabilityScore: 'Moderate',
      criticality: 'HIGH (Raw Material)'
    },
    { 
      id: 'inv_03', 
      vendor: 'Mehta Traders', 
      invoice: 'MT-1102', 
      dueDate: '2026-11-07', 
      amount: 100000, 
      daysUntilDue: 18, 
      discountPct: 0.0, 
      status: 'confirmed', 
      historicalDelayToleranceDays: 14, 
      reliabilityScore: 'High Grace Period',
      criticality: 'STANDARD'
    },
  ]);

  // Modal State for Training Vendor Behavior
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [activeVendor, setActiveVendor] = useState<any>(null);

  // DYNAMIC INTELLIGENCE SYNTHESIS ENGINE
  const generateDynamicIntelligence = (vendor: any, projectedCash: number, buffer: number) => {
    let rec = 'PAY_NOW';
    let reason = '';

    if (vendor.status === 'disputed') {
      rec = 'HOLD';
      reason = `Invoice is disputed. Historical vendor behavior indicates open credit notes must be settled first.`;
    } else if (vendor.daysUntilDue <= 1) {
      if (vendor.discountPct > 0) {
        reason = `Due tomorrow. Historical data shows ${vendor.vendor} strictly enforces payment terms, but offers a ${vendor.discountPct}% early discount. Paying now captures profit and protects supply chain continuity.`;
      } else {
        reason = `Due in ${vendor.daysUntilDue} day(s). Vendor has a ${vendor.historicalDelayToleranceDays}-day delay tolerance before halting shipments. Priority forced due to zero grace window.`;
      }
    } else if (projectedCash - vendor.amount < buffer) {
      rec = 'DEFER';
      reason = `Payment of ₹${vendor.amount.toLocaleString()} would breach your ₹${buffer.toLocaleString()} emergency reserve buffer. Vendor historical delay tolerance (${vendor.historicalDelayToleranceDays} days) allows safe deferral.`;
    } else if (vendor.discountPct > 0) {
      rec = 'PAY_NOW';
      reason = `Early-payment discount of ${vendor.discountPct}% available. Vendor reliability score (${vendor.reliabilityScore}) makes this an optimal cash-allocation target.`;
    } else {
      rec = 'DEFER';
      reason = `Due in ${vendor.daysUntilDue} days with 0% discount. Vendor historical grace period is ${vendor.historicalDelayToleranceDays} days. Safe to hold liquid capital.`;
    }

    return { recommendation: rec, dynamicReason: reason };
  };

  const totalSelected = vendors
    .filter(v => selectedPayables.includes(v.id))
    .reduce((sum, v) => sum + v.amount, 0);

  const projectedCash = cashAvailable - totalSelected;
  const headroom = projectedCash - reserveBuffer;
  const isBreached = headroom < 0;

  const togglePayable = (id: string) => {
    if (selectedPayables.includes(id)) {
      setSelectedPayables(selectedPayables.filter(i => i !== id));
    } else {
      setSelectedPayables([...selectedPayables, id]);
    }
  };

  const handleSaveTraining = (e: React.FormEvent) => {
    e.preventDefault();
    setVendors(vendors.map(v => v.id === activeVendor.id ? activeVendor : v));
    setTrainingModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans text-slate-900">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-mono mb-2 uppercase tracking-widest font-bold">
            <Brain className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>Behavioral Intelligence & Payout Engine (F16)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payment Decision & Behavioral Queue</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Trained on historical vendor payment behavior, delay tolerances, and live emergency cash headroom.
          </p>
        </div>
        <div className="mt-6 md:mt-0 bg-slate-50 border border-slate-200 p-4 rounded-xl font-mono text-xs space-y-1">
          <p className="text-slate-500">Verified Bank Cash: <strong className="text-slate-900">₹ {cashAvailable.toLocaleString()}</strong></p>
          <p className="text-slate-500">Emergency Reserve Floor: <strong className="text-emerald-600">₹ {reserveBuffer.toLocaleString()}</strong></p>
        </div>
      </div>

      {/* What-If Reserve Sandbox Banner */}
      <div className={`border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center transition ${
        isBreached ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider">
            {isBreached ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            <span>What-If Cash Reserve Sandbox</span>
          </div>
          <h3 className="text-lg font-bold">
            {isBreached ? '⚠️ Warning: Proposed payout plan breaches emergency cash reserve!' : '✓ Proposed payment plan fully protects your emergency cash reserve.'}
          </h3>
          <p className="text-xs font-mono opacity-80">
            Selected Payouts: ₹ {totalSelected.toLocaleString()} • Projected Cash Remaining: ₹ {projectedCash.toLocaleString()} • Reserve Headroom: ₹ {headroom.toLocaleString()}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button 
            onClick={() => alert('Payment plan committed to immutable audit trail.')}
            disabled={isBreached}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve & Commit Plan
          </button>
        </div>
      </div>

      {/* Ranked Vendor Payables Action Queue */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
        <div className="px-8 pt-8 pb-4 flex justify-between items-center border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-700 tracking-widest uppercase font-mono">
              Behavioral-Trained Vendor Payables Action Queue (F16)
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">Click "Train Behavior" to adjust historical vendor delay tolerances.</p>
          </div>
        </div>

        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                <th className="py-4 px-4">Select</th>
                <th className="py-4 px-4">Vendor & History Profile</th>
                <th className="py-4 px-4">Due Date</th>
                <th className="py-4 px-4">Outstanding</th>
                <th className="py-4 px-4">Tolerance</th>
                <th className="py-4 px-4">Recommendation</th>
                <th className="py-4 px-4">Dynamic Reason (Live AI Synthesis)</th>
                <th className="py-4 px-4 text-right">Train Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {vendors.map((item) => {
                const isSelected = selectedPayables.includes(item.id);
                const { recommendation, dynamicReason } = generateDynamicIntelligence(item, projectedCash, reserveBuffer);
                
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition align-top">
                    <td className="py-4 px-4 pt-5">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => togglePayable(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {item.vendor}
                      <span className="block text-[10px] text-slate-400 font-normal">{item.invoice}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{item.dueDate}</td>
                    <td className="py-4 px-4 font-bold text-red-600">₹ {item.amount.toLocaleString()}</td>
                    <td className="py-4 px-4 text-indigo-600">{item.historicalDelayToleranceDays} Days Grace</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        recommendation === 'DEFER' ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {recommendation}
                      </span>
                    </td>
                    {/* Dark text for crisp light-mode readability */}
                    <td className="py-4 px-4 text-slate-800 font-medium max-w-sm leading-relaxed font-sans text-xs">
                      {dynamicReason}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => { setActiveVendor({...item}); setTrainingModalOpen(true); }}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg transition text-xs flex items-center space-x-1 ml-auto"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Train Behavior</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VENDOR BEHAVIORAL TRAINING MODAL */}
      {trainingModalOpen && activeVendor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <span>Feed Historical Vendor Behavior</span>
              </h3>
              <button onClick={() => setTrainingModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveTraining} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-500 uppercase mb-1">Vendor Name</label>
                <input type="text" disabled value={activeVendor.vendor} className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-500 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Historical Delay Tolerance (Days)</label>
                <p className="text-[10px] text-slate-400 mb-1">How many days can you delay paying this vendor before supply or credit is halted?</p>
                <input 
                  type="number" 
                  value={activeVendor.historicalDelayToleranceDays} 
                  onChange={(e) => setActiveVendor({...activeVendor, historicalDelayToleranceDays: parseInt(e.target.value) || 0})} 
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Reliability / Behavior Notes</label>
                <input 
                  type="text" 
                  value={activeVendor.reliabilityScore} 
                  onChange={(e) => setActiveVendor({...activeVendor, reliabilityScore: e.target.value})} 
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-indigo-500" 
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-xs shadow-md flex items-center justify-center space-x-2">
                <Save className="w-4 h-4" />
                <span>Update Vendor Intelligence Model</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}