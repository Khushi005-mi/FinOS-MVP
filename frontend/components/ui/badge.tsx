import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const styles = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-500/5',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-amber-500/5',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30 shadow-red-500/5',
    info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-indigo-500/5',
    neutral: 'bg-slate-900 text-slate-300 border-slate-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider border shadow-sm ${styles[variant]}`}>
      {children}
    </span>
  );
}