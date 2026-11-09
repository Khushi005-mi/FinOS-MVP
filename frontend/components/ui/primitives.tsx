import React from 'react';

/**
 * Section Eyebrow: Wide-tracked micro-label for visual cadence.
 */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[10px] uppercase font-semibold tracking-[0.14em] text-stone-500 flex items-center gap-1.5 font-sans ${className}`}>
      {children}
    </div>
  );
}

/**
 * Institutional Indian Currency Formatter:
 * Accepts both raw numbers and formatted strings without defaulting to 0.
 */
export function IndianCurrencyDisplay({
  amount,
  denominator,
  size = 'md',
  className = '',
}: {
  amount: number | string | null | undefined;
  denominator?: number | string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}) {
  let val = 0;
  
  if (typeof amount === 'number') {
    val = amount;
  } else if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    val = isNaN(parsed) ? 0 : parsed;
  }

  const formatted = val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let denomVal: number | null = null;
  if (typeof denominator === 'number') {
    denomVal = denominator;
  } else if (typeof denominator === 'string') {
    const cleanedDenom = denominator.replace(/[^0-9.-]+/g, '');
    const parsedDenom = parseFloat(cleanedDenom);
    if (!isNaN(parsedDenom)) denomVal = parsedDenom;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-semibold tracking-tight',
    hero: 'text-2xl lg:text-[26px] font-medium tracking-tight',
  }[size];

  return (
    <div className={`font-mono tabular-nums inline-flex items-baseline gap-1 ${className}`}>
      <span className={`${sizeClasses} text-stone-100 flex items-baseline`}>
        <span className="text-stone-500 font-sans text-xs font-normal mr-1 select-none">₹</span>
        <span>{formatted}</span>
      </span>
      {denomVal !== null && (
        <span className="text-xs text-stone-500 font-mono">
          / ₹{denomVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      )}
    </div>
  );
}

/**
 * Three-Way Match Visual Motif: Indicates alignment across Bank, Books, and Gateway.
 */
export function ThreeWayNode({
  bank = true,
  books = true,
  gateway = true,
  className = '',
}: {
  bank?: boolean;
  books?: boolean;
  gateway?: boolean;
  className?: string;
}) {
  const isMatch = bank && books && gateway;

  return (
    <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
      isMatch 
        ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300' 
        : 'border-amber-800/60 bg-amber-950/40 text-amber-300'
    } ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${bank ? 'bg-emerald-400' : 'bg-rose-500'}`} title="Bank Cleared" />
      <span className="text-stone-600">─</span>
      <span className={`w-1.5 h-1.5 rounded-full ${books ? 'bg-emerald-400' : 'bg-amber-400'}`} title="Books Ledger" />
      <span className="text-stone-600">─</span>
      <span className={`w-1.5 h-1.5 rounded-full ${gateway ? 'bg-emerald-400' : 'bg-stone-600'}`} title="Gateway Settlement" />
      <span className="ml-1 text-[9px] uppercase tracking-wider font-semibold">{isMatch ? '3-Way Match' : 'Variance'}</span>
    </div>
  );
}

/**
 * Semantic Status Badge
 */
export function StatusBadge({
  status,
  variant = 'default',
  className = '',
}: {
  status: string;
  variant?: 'sage' | 'amber' | 'brick' | 'brass' | 'default';
  className?: string;
}) {
  const styles = {
    sage: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
    amber: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
    brick: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
    brass: 'bg-[#C89B58]/10 text-[#C89B58] border-[#C89B58]/30',
    default: 'bg-stone-900 text-stone-400 border-stone-800',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${styles} ${className}`}>
      {status}
    </span>
  );
}

/**
 * Verified vs. Inferred Provenance Chip
 */
export function ProvenanceChip({
  source,
  isInferred = false,
  className = '',
}: {
  source: string;
  isInferred?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
      isInferred
        ? 'border border-dashed border-stone-700 bg-stone-900/50 text-stone-400'
        : 'border border-stone-800 bg-stone-900 text-stone-300'
    } ${className}`}>
      <span className={`w-1 h-1 rounded-full ${isInferred ? 'bg-amber-400' : 'bg-stone-500'}`} />
      <span className="truncate max-w-[140px]">{source}</span>
      {isInferred && <span className="text-[9px] uppercase tracking-wider text-amber-400 font-sans ml-0.5">Inferred</span>}
    </span>
  );
}
