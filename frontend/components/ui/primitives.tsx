import React from 'react';

// 1. Institutional Status Badge
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5',
    MATCHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    OPEN: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5',
    INVESTIGATING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    RESOLVED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ACCEPTED: 'bg-slate-800 text-slate-400 border-slate-700',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5',
  };

  const className = map[status?.toUpperCase()] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border shadow-sm ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        ['VERIFIED', 'MATCHED', 'RESOLVED'].includes(status?.toUpperCase()) ? 'bg-emerald-400 animate-pulse' :
        ['OPEN', 'PARTIAL'].includes(status?.toUpperCase()) ? 'bg-red-400 animate-pulse' : 'bg-amber-400'
      }`} />
      {status}
    </span>
  );
}

// 2. High-Density Metric Card
export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  variant = 'default'
}: {
  title: string;
  value: string | number;
  trend?: string;
  icon: any;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}) {
  const iconStyles = {
    default: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition duration-200">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition" />
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">{title}</p>
          <h3 className="text-3xl font-extrabold text-white mt-3 tracking-tight font-mono">{value}</h3>
        </div>
        <div className={`p-3 border rounded-xl shadow-inner ${iconStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Analysis State:</span>
          <span className="text-slate-200 font-bold">{trend}</span>
        </div>
      )}
    </div>
  );
}

// 3. Institutional Section Header
export function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{title}</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
      </div>
      {action && <div className="mt-4 sm:mt-0">{action}</div>}
    </div>
  );
}

// 4. Empty State Component
export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-16 text-center shadow-2xl flex flex-col items-center justify-center space-y-3">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 mb-2 shadow-inner">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md font-mono">{description}</p>
    </div>
  );
}