'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, ArrowRight, Database, FileText, CheckCircle2, 
  AlertTriangle, ArrowUpRight, Lock, Server, Layers, HelpCircle, 
  Menu, X, ChevronRight, BarChart3, Search, Sliders, DollarSign, RefreshCw 
} from 'lucide-react';

export default function FinOSLandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // FAQ Data
  const faqs = [
    { q: "What is FinOS?", a: "FinOS is a financial verification and decision-support platform that connects records from your bank accounts, accounting books, payment gateways, and invoices to verify that everything agrees and help you prioritize vendor payments safely." },
    { q: "Do I need to replace Tally, my bank, or my payment gateway?", a: "No. FinOS is designed to work entirely alongside your existing software stack. It sits on top of your current tools to provide verification and control without requiring migration." },
    { q: "Can FinOS work with files instead of live integrations?", a: "Yes. For early pilots and standard operations, FinOS supports secure file uploads (CSV, Excel) from standard bank statements, Razorpay-style gateways, and Tally exports." },
    { q: "What types of records can FinOS handle?", a: "FinOS handles bank statements, payment gateway settlement reports, accounting ledger daybooks, vendor bills, and invoice files." },
    { q: "How does FinOS handle timing differences?", a: "FinOS uses configurable date windows and deterministic matching rules to separate legitimate timing variances (like bank clearing delays) from real monetary mismatches." },
    { q: "Can FinOS find duplicate payments?", a: "Yes. FinOS scans records across your systems to detect identical payment amounts, references, or vendor invoice numbers to flag potential duplicate disbursements." },
    { q: "Can FinOS help me decide which vendor to pay first?", a: "Yes. The Payables Priority Engine analyzes outstanding vendor bills, due dates, credit terms, and cash constraints to generate a ranked, explainable action list." },
    { q: "Can I set a minimum emergency cash reserve?", a: "Yes. You can define a fixed rupee buffer or a percentage of monthly opex. FinOS runs what-if simulations to warn you if a proposed payment plan threatens your reserve." },
    { q: "Can my CA access the evidence?", a: "Yes. You can grant read-only access to your Chartered Accountant or auditor so they can inspect matched transactions and generate one-click evidence packs." },
    { q: "Is my financial data secure?", a: "Yes. FinOS uses tenant-level data isolation via PostgreSQL Row-Level Security (RLS), AES-256 encryption at rest, TLS 1.3 in transit, and immutable source-file vault hashing." },
    { q: "Is FinOS available for businesses outside India?", a: "The current version is optimized specifically for Indian banking formats, Razorpay/Cashfree gateways, GST/TDS contexts, and Tally/Zoho accounting structures." }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#020617]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 text-lg">
              F
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">FinOS</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#product" className="hover:text-white transition">Product</a>
            <a href="#how-it-works" className="hover:text-white transition">How it works</a>
            <a href="#audience" className="hover:text-white transition">Who it’s for</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#resources" className="hover:text-white transition">Resources</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => router.push('/login')}
              className="text-sm font-medium text-slate-300 hover:text-white transition px-3 py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push('/signup')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              Book a 15-minute walkthrough
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#070a10] border-b border-slate-800 p-6 space-y-4">
            <a href="#product" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300">Product</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300">How it works</a>
            <a href="#audience" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300">Who it’s for</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-slate-300">FAQ</a>
            <button 
              onClick={() => router.push('/signup')}
              className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl shadow-lg"
            >
              Book a 15-minute walkthrough
            </button>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Built for growing Indian businesses</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Know where your money went—<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              and what needs attention now.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            FinOS connects your bank, books, payment gateway, and invoice records; finds what does not agree; explains why; and helps you decide which vendor payments to prioritize.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <button 
              onClick={() => router.push('/signup')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2"
            >
              <span>Book a 15-minute walkthrough</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium px-8 py-4 rounded-xl transition text-base text-center"
            >
              See how FinOS works
            </a>
          </div>

          <p className="text-xs text-slate-500 font-mono">No credit card required for a walkthrough.</p>

          {/* Quick Benefit Bullets */}
          <div className="flex flex-wrap justify-center gap-6 pt-6 text-xs text-slate-300 font-mono">
            <span className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Find unexplained money movements</span></span>
            <span className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Reconcile bank, books, and gateway records</span></span>
            <span className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>Protect your emergency cash reserve</span></span>
          </div>

          {/* Realistic Dashboard Preview Mockup */}
          <div className="pt-12">
            <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 shadow-2xl text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs text-slate-300 font-bold">Sharma Traders Pvt Ltd • Live Verification Status</span>
                </div>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">Match Rate: 91.4%</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#020617] p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-500">Available Bank Cash</p>
                  <p className="text-xl font-bold text-white mt-1">₹ 7,42,500.00</p>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-500">Emergency Reserve Headroom</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">₹ 4,00,000.00 (Safe)</p>
                </div>
                <div className="bg-[#020617] p-4 rounded-xl border border-slate-800">
                  <p className="text-slate-500">Disputed / Unmatched Deltas</p>
                  <p className="text-xl font-bold text-red-400 mt-1">₹ 1,84,500.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF BAR */}
      <section className="border-y border-slate-800/80 bg-[#070a10]/50 py-10">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-2"><Database className="w-4 h-4 text-indigo-400" /><span>Works with common bank statements, Tally/Zoho exports & payment gateways</span></span>
            <span className="flex items-center space-x-2"><FileText className="w-4 h-4 text-emerald-400" /><span>Evidence-backed workflows</span></span>
            <span className="flex items-center space-x-2"><ShieldCheck className="w-4 h-4 text-violet-400" /><span>Built for Indian finance teams</span></span>
          </div>
          <p className="text-xs text-slate-500 font-mono italic">Pilot customers and design partners are being onboarded.</p>
        </div>
      </section>

      {/* 4. PROBLEM SECTION */}
      <section id="product" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Your money data is everywhere. Your answers shouldn’t be.
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Growing businesses experience friction across multiple financial touchpoints every single month.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">01</div>
            <h3 className="text-base font-bold text-white">Fragmented Records</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">Bank statements, accounting ledgers, gateway payouts, invoices, and tax filings frequently fail to match cleanly.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">02</div>
            <h3 className="text-base font-bold text-white">Spreadsheet Exhaustion</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">Finance teams spend days manually matching thousands of rows in Excel using VLOOKUP under tight month-end deadlines.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">03</div>
            <h3 className="text-base font-bold text-white">Hidden Leakage</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">A settlement difference could be a fee, refund, timing delay, or real leakage—nobody knows until cash runs short.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">04</div>
            <h3 className="text-base font-bold text-white">Conflicting Stories</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">Vendor balances, bank credits, and Tally accounting books often tell completely different stories about the same transaction.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">05</div>
            <h3 className="text-base font-bold text-white">Surprise Cash Shortfalls</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">Founders and owners frequently discover cash constraints and liquidity crunches only after approving major vendor disbursements.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold font-mono">06</div>
            <h3 className="text-base font-bold text-white">Audit Stress</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">Chartered Accountants spend excessive billable hours chasing missing documentation and explaining legacy discrepancies.</p>
          </div>
        </div>
      </section>

      {/* 5. SOLUTION SECTION */}
      <section id="how-it-works" className="py-24 bg-[#070a10]/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              FinOS gives you one trusted picture of your money.
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Our 4-step verification and control workflow brings clarity to your financial operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 relative">
              <span className="text-indigo-400 font-mono font-bold text-2xl block mb-3">01</span>
              <h3 className="text-sm font-bold text-white">Bring in your records</h3>
              <p className="text-xs text-slate-400 mt-2 font-mono">Upload bank statements, Razorpay settlement reports, and Tally ledger exports securely into the vault.</p>
            </div>
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 relative">
              <span className="text-indigo-400 font-mono font-bold text-2xl block mb-3">02</span>
              <h3 className="text-sm font-bold text-white">FinOS links and checks them</h3>
              <p className="text-xs text-slate-400 mt-2 font-mono">Deterministic matching engines check whether bank, books, gateway, and invoice records agree within tolerances.</p>
            </div>
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 relative">
              <span className="text-indigo-400 font-mono font-bold text-2xl block mb-3">03</span>
              <h3 className="text-sm font-bold text-white">Review explained exceptions</h3>
              <p className="text-xs text-slate-400 mt-2 font-mono">Examine unmatched discrepancies presented with plain-language explanations and source row lineage.</p>
            </div>
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 relative">
              <span className="text-indigo-400 font-mono font-bold text-2xl block mb-3">04</span>
              <h3 className="text-sm font-bold text-white">Act with evidence</h3>
              <p className="text-xs text-slate-400 mt-2 font-mono">Resolve cases, prioritize vendor payouts safely against your cash reserve, and export audit-ready evidence packs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CORE CAPABILITIES SECTION */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Designed for rigorous financial control.
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Everything your finance team needs to verify records and protect working capital.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Reconciliation</span>
            <h3 className="text-base font-bold text-white">Bank, books, & gateway matching</h3>
            <p className="text-xs text-slate-400 font-mono">Match multi-source records with exact-decimal precision and automatic fee adjustments.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Exploration</span>
            <h3 className="text-base font-bold text-white">Money-movement explorer</h3>
            <p className="text-xs text-slate-400 font-mono">Search transactions across accounts and categories to trace every rupee’s exact journey.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Triage</span>
            <h3 className="text-base font-bold text-white">Discrepancy queue & reason codes</h3>
            <p className="text-xs text-slate-400 font-mono">Filter and prioritize unmatched items ranked by financial impact with clear reason codes.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Lineage</span>
            <h3 className="text-base font-bold text-white">Source evidence & transaction lineage</h3>
            <p className="text-xs text-slate-400 font-mono">Clickable citation badges link every figure directly to its original vault row index.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Safety</span>
            <h3 className="text-base font-bold text-white">Duplicate-payment detection</h3>
            <p className="text-xs text-slate-400 font-mono">Catch accidental double disbursements before cash leaves your bank account.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Prioritization</span>
            <h3 className="text-base font-bold text-white">Payables priority engine</h3>
            <p className="text-xs text-slate-400 font-mono">Rank vendor bills by due dates and cash constraints to optimize working capital.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Protection</span>
            <h3 className="text-base font-bold text-white">Liquidity reserve & what-if planning</h3>
            <p className="text-xs text-slate-400 font-mono">Simulate payment plans against a protected emergency cash buffer.</p>
          </div>
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Compliance</span>
            <h3 className="text-base font-bold text-white">Audit-ready evidence packs</h3>
            <p className="text-xs text-slate-400 font-mono">Export professional ReportLab PDF bundles with SHA-256 vault hashes in one click.</p>
          </div>
        </div>
      </section>

      {/* 7. PRODUCT PREVIEW SECTION */}
      <section className="py-24 bg-[#070a10]/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              See the full money trail—not just a spreadsheet.
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Explore realistic previews of how FinOS structures your financial verification workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase">View 01</span>
              <h3 className="text-base font-bold text-white">Transaction Explorer</h3>
              <p className="text-xs text-slate-400 font-mono">Search by date, party, account, category, and status with full audit lineage.</p>
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400"><span>02/10/2026</span><span className="text-emerald-400">+₹50,000.00</span></div>
                <div className="text-white font-bold">UPI/SHARMA TRADERS/123456</div>
                <div className="text-[10px] text-slate-500">Status: Verified • Ref: UTR98123</div>
              </div>
            </div>

            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase">View 02</span>
              <h3 className="text-base font-bold text-white">Discrepancy Review</h3>
              <p className="text-xs text-slate-400 font-mono">Inspect expected vs actual amounts, likely reasons, and review ownership.</p>
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400"><span>Reason: fee_difference</span><span className="text-red-400">₹4,000.00</span></div>
                <div className="text-white font-bold">Razorpay Settlement Shortfall</div>
                <div className="text-[10px] text-indigo-400">📄 Source Vault: Row #42</div>
              </div>
            </div>

            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase">View 03</span>
              <h3 className="text-base font-bold text-white">Payables Priority View</h3>
              <p className="text-xs text-slate-400 font-mono">Rank vendor bills by due date, discounts, and cash-reserve impact.</p>
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex justify-between text-slate-400"><span>Vendor: AWS Cloud</span><span className="text-amber-400">Due Today</span></div>
                <div className="text-white font-bold">₹ 1,50,000.00 (2% Discount)</div>
                <div className="text-[10px] text-emerald-400">Action: Pay First (Reserves Safe)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW FINOS HELPS DIFFERENT TEAMS */}
      <section id="audience" className="py-24 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Built for everyone who touches company money.
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Tailored workflows for founders, finance leaders, accountants, and chartered accountants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-4">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">For Founders</span>
            <h3 className="text-xl font-bold text-white">“Know where your money went.”</h3>
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-indigo-400" /><span>Trace money movements across all business accounts</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-indigo-400" /><span>Understand payment gateway settlement differences</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-indigo-400" /><span>Avoid surprise cash shortfalls before signing checks</span></li>
            </ul>
          </div>

          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-4">
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">For CFOs and Finance Heads</span>
            <h3 className="text-xl font-bold text-white">“Know whether you can safely pay before you commit.”</h3>
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-emerald-400" /><span>See available cash and known monthly commitments</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-emerald-400" /><span>Test payment plans against an emergency reserve buffer</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-emerald-400" /><span>Review explained exceptions backed by vault evidence</span></li>
            </ul>
          </div>

          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-4">
            <span className="text-xs font-mono text-violet-400 font-bold uppercase">For Accountants and Finance Teams</span>
            <h3 className="text-xl font-bold text-white">“Spend less time matching records.”</h3>
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-violet-400" /><span>Reduce manual reconciliation spreadsheet hours</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-violet-400" /><span>Review only meaningful exceptions requiring human input</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-violet-400" /><span>Maintain an append-only audit trail automatically</span></li>
            </ul>
          </div>

          <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl p-8 space-y-4">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">For CAs and Audit Teams</span>
            <h3 className="text-xl font-bold text-white">“Get audit-ready evidence faster.”</h3>
            <ul className="space-y-2 text-xs text-slate-400 font-mono">
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-amber-400" /><span>Link financial figures directly to source record rows</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-amber-400" /><span>Maintain a tamper-evident audit trail for lenders</span></li>
              <li className="flex items-center space-x-2"><ChevronRight className="w-4 h-4 text-amber-400" /><span>Generate professional ReportLab PDF evidence packs</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* 9. FINOS IN ACTION EXAMPLE */}
      <section className="py-24 bg-[#070a10]/50 border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Practical Workflow</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">From messy records to a clear payment plan</h2>
            <p className="text-sm text-slate-400 font-mono">See how FinOS assists during a cash-constrained weekly payment cycle.</p>
          </div>

          <div className="bg-[#020617] border border-slate-800 rounded-2xl p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Bank Balance</span>
                <span className="text-lg font-bold text-white">₹ 7,00,000.00</span>
              </div>
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Emergency Reserve Requirement</span>
                <span className="text-lg font-bold text-emerald-400">₹ 4,00,000.00</span>
              </div>
              <div className="bg-[#070a10] p-4 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Pending Vendor Bills</span>
                <span className="text-lg font-bold text-red-400">5 Invoices Due</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              <strong>FinOS Action:</strong> FinOS analyzes due dates, identifies that two vendors offer a 2% early-payment discount, verifies that emergency headroom (₹4L) must be protected, and proposes an optimized payment plan allowing three urgent disbursements today while deferring two non-critical invoices safely.
            </p>
          </div>
        </div>
      </section>

      {/* 10. COMPARISON TABLE */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Not another dashboard. A verification and decision layer.</h2>
        </div>

        <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#05070c] text-xs font-mono text-slate-400 uppercase">
                <th className="py-4 px-6">Traditional tools</th>
                <th className="py-4 px-6 text-indigo-400">FinOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs md:text-sm font-mono">
              <tr className="hover:bg-slate-900/40">
                <td className="py-4 px-6 text-slate-400">Shows reports after data is entered</td>
                <td className="py-4 px-6 text-white font-semibold">Checks whether bank, books, and gateway records agree</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-4 px-6 text-slate-400">Leaves mismatches buried in spreadsheets</td>
                <td className="py-4 px-6 text-white font-semibold">Creates explained, assignable exception cases</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-4 px-6 text-slate-400">Shows a static cash balance</td>
                <td className="py-4 px-6 text-white font-semibold">Helps test whether a payment plan protects the reserve</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-4 px-6 text-slate-400">Makes the team search for evidence</td>
                <td className="py-4 px-6 text-white font-semibold">Links every number directly to source row evidence</td>
              </tr>
              <tr className="hover:bg-slate-900/40">
                <td className="py-4 px-6 text-slate-400">Requires replacing core systems</td>
                <td className="py-4 px-6 text-white font-semibold">Works alongside Tally, banks, gateways, and invoices</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 11. SECURITY & TRUST */}
      <section className="py-24 bg-[#070a10]/50 border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Your financial data deserves serious protection.</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto font-mono">
            FinOS is designed from the ground up for financial data privacy, kernel-level tenant isolation, and auditability.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left text-xs font-mono">
            <div className="bg-[#020617] p-6 rounded-xl border border-slate-800 space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Postgres RLS Isolation</h3>
              <p className="text-slate-400">Kernel-level multi-tenant security ensuring complete data segregation between companies.</p>
            </div>
            <div className="bg-[#020617] p-6 rounded-xl border border-slate-800 space-y-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">AES-256 & TLS 1.3</h3>
              <p className="text-slate-400">Bank-grade encryption protecting your sensitive financial records at rest and in transit.</p>
            </div>
            <div className="bg-[#020617] p-6 rounded-xl border border-slate-800 space-y-2">
              <FileText className="w-5 h-5 text-violet-400" />
              <h3 className="font-bold text-white text-sm">Append-Only Audit Trail</h3>
              <p className="text-slate-400">Every mutation is logged with actor identity, timestamp, and immutable state diffs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. PRICING SECTION */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Simple pricing for growing businesses.</h2>
          <p className="text-slate-400 text-sm font-mono">Choose the tier that matches your transaction volume and source complexity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-mono text-slate-400 font-bold uppercase">Starter</span>
              <h3 className="text-3xl font-extrabold text-white">₹ 4,999 <span className="text-xs text-slate-500 font-normal">/mo</span></h3>
              <p className="text-xs text-slate-400 font-mono">For small businesses beginning to organize money data and basic bank reconciliation.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>1 Reconciliation Check</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>1,000 Transactions / mo</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Basic Evidence Pack PDF</span></li>
              </ul>
            </div>
            <button onClick={() => router.push('/signup')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition text-xs border border-slate-800">
              Book a 15-minute walkthrough
            </button>
          </div>

          <div className="bg-[#070a10] border-2 border-indigo-500/50 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-xs font-mono text-indigo-400 font-bold uppercase">Growth</span>
              <h3 className="text-3xl font-extrabold text-white">₹ 14,999 <span className="text-xs text-slate-500 font-normal">/mo</span></h3>
              <p className="text-xs text-slate-400 font-mono">For businesses with multiple bank accounts, gateways, and higher transaction volume.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>3 Reconciliation Checks</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>10,000 Transactions / mo</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Advanced Evidence Pack PDF</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Payables Priority Engine</span></li>
              </ul>
            </div>
            <button onClick={() => router.push('/signup')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-xs shadow-lg shadow-indigo-600/30">
              Book a 15-minute walkthrough
            </button>
          </div>

          <div className="bg-[#070a10] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-mono text-violet-400 font-bold uppercase">CA / Firm</span>
              <h3 className="text-3xl font-extrabold text-white">Custom <span className="text-xs text-slate-500 font-normal">Pricing</span></h3>
              <p className="text-xs text-slate-400 font-mono">For Chartered Accountant firms managing multi-client reconciliation and audit prep.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 font-mono pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Multi-Client Workspace</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Unlimited Volume</span></li>
                <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /><span>Priority Audit Support</span></li>
              </ul>
            </div>
            <button onClick={() => router.push('/signup')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition text-xs border border-slate-800">
              Book a 15-minute walkthrough
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 font-mono">Pricing may vary based on transaction volume and custom ERP integrations.</p>
      </section>

      {/* 13. FAQ SECTION */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-400 font-mono">Everything you need to know about FinOS verification and data security.</p>
        </div>

        <div className="space-y-4 pt-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#070a10] border border-slate-800/80 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-6 text-left font-semibold text-white flex justify-between items-center text-sm md:text-base hover:bg-slate-900/40 transition"
              >
                <span>{faq.q}</span>
                <span className="text-indigo-400 font-mono font-bold text-lg">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-6 pb-6 text-xs md:text-sm text-slate-400 font-mono leading-relaxed border-t border-slate-800/60 pt-4 bg-[#020617]/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 14. RESOURCES SECTION */}
      <section id="resources" className="py-24 bg-[#070a10]/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Resources & Practical Guides</h2>
            <p className="text-sm text-slate-400 font-mono">Written for finance teams, accountants, and founders.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-3">
              <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Guide</span>
              <h3 className="text-base font-bold text-white">How FinOS reconciliation works</h3>
              <p className="text-xs text-slate-400 font-mono">A technical walkthrough of multi-pass matching and exact-decimal paise math.</p>
            </div>
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-3">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Checklist</span>
              <h3 className="text-base font-bold text-white">A practical guide to month-end close</h3>
              <p className="text-xs text-slate-400 font-mono">Streamline your closing cycle and eliminate spreadsheet bottlenecks.</p>
            </div>
            <div className="bg-[#020617] border border-slate-800 rounded-2xl p-6 space-y-3">
              <span className="text-[10px] font-mono text-violet-400 uppercase font-bold">Analysis</span>
              <h3 className="text-base font-bold text-white">How to identify settlement leakage</h3>
              <p className="text-xs text-slate-400 font-mono">Spot hidden MDR fee variances and uncredited gateway payouts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 15. FINAL CTA SECTION */}
      <section className="py-24 max-w-5xl mx-auto px-6 text-center">
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-3xl p-12 md:p-16 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Stop finding out where your money went after month-end.
          </h2>
          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto font-mono">
            Book a 15-minute walkthrough and see how FinOS can help your team verify records, explain differences, and make safer payment decisions.
          </p>
          <div className="pt-4">
            <button 
              onClick={() => router.push('/signup')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition text-base shadow-xl shadow-indigo-600/30 inline-flex items-center space-x-2"
            >
              <span>Book a 15-minute walkthrough</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* 16. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#05070c] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 text-xs font-mono text-slate-400">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                F
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">FinOS</span>
            </div>
            <p className="text-slate-500 max-w-xs">
              Enterprise-grade financial verification, reconciliation, and control platform for growing Indian businesses.
            </p>
            <p className="text-[10px] text-slate-600">© 2026 FinOS. All rights reserved.</p>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Product</p>
            <a href="#product" className="block hover:text-white transition">Features</a>
            <a href="#how-it-works" className="block hover:text-white transition">How it works</a>
            <a href="#pricing" className="block hover:text-white transition">Pricing</a>
            <a href="#resources" className="block hover:text-white transition">Resources</a>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Company</p>
            <a href="#" className="block hover:text-white transition">About</a>
            <a href="#" className="block hover:text-white transition">Contact</a>
            <a href="#" className="block hover:text-white transition">Blog</a>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Legal</p>
            <a href="#" className="block hover:text-white transition">Privacy Policy</a>
            <a href="#" className="block hover:text-white transition">Terms of Service</a>
            <a href="#" className="block hover:text-white transition">Security & RLS</a>
          </div>
        </div>
      </footer>
    </div>
  );
}