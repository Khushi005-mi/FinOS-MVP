'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sliders,
  X,
  CreditCard,
  Building2,
  FileText,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
  Scale,
  Check,
  Calendar,
  Zap,
  Briefcase,
  FileCheck2,
  Terminal,
  Clock,
  Menu,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  // Mobile Nav Toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Walkthrough Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalCompany, setModalCompany] = useState('');
  const [modalTurnover, setModalTurnover] = useState('₹10 Cr – ₹50 Cr');
  const [modalSubmitted, setModalSubmitted] = useState(false);

  // Interactive Product Preview Tab State
  const [activePreviewTab, setActivePreviewTab] = useState<'dashboard' | 'payables' | 'discrepancy' | 'vault'>('dashboard');

  // Interactive Simulator State (Fixed variable names)
  const [simCash, setSimCash] = useState<number>(1891740); // ₹18.91L from real bank statements
  const [simBuffer, setSimBuffer] = useState<number>(400000);  // ₹4.0L non-negotiable floor

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Dynamic Headroom Calculation
  const simHeadroom = Math.max(0, simCash - simBuffer);

  const sampleBills = [
    { id: 1, vendor: 'Apex Heavy Foundry', amount: 392000, dueDays: 2, discount: 2.0, crit: 'HIGH' },
    { id: 2, vendor: 'Tata Precision Steel', amount: 245000, dueDays: 3, discount: 1.5, crit: 'HIGH' },
    { id: 3, vendor: 'Sharma Logistics Solutions', amount: 185000, dueDays: 14, discount: 0.0, crit: 'STANDARD' },
    { id: 4, vendor: 'Grid Power & Utility Bills', amount: 50000, dueDays: 1, discount: 0.0, crit: 'HIGH' },
    { id: 5, vendor: 'Precision Valve Corp', amount: 480000, dueDays: 12, discount: 0.0, crit: 'STANDARD' },
  ];

  let remainingHeadroom = simHeadroom;
  const evaluatedBills = sampleBills.map((b) => {
    const isImminent = b.dueDays <= 5;
    const hasDiscount = b.discount > 0 && b.dueDays <= 3;
    const fits = b.amount <= remainingHeadroom;

    let decision = 'HOLD';
    let rationale = '';

    if (hasDiscount && fits) {
      decision = 'PAY NOW';
      rationale = `Captures ${b.discount}% cash discount (saves ₹${((b.amount * b.discount) / 100).toLocaleString('en-IN')}). Preserves buffer floor.`;
      remainingHeadroom -= b.amount;
    } else if (isImminent && fits) {
      decision = 'PAY NOW';
      rationale = `Due in ${b.dueDays}d. Fits safely within available liquidity.`;
      remainingHeadroom -= b.amount;
    } else if (b.dueDays > 5) {
      decision = 'SCHEDULE';
      rationale = `Due in ${b.dueDays} days. Aligned with next bi-weekly payout cadence.`;
    } else {
      decision = 'HOLD';
      rationale = `Disbursing ₹${(b.amount / 100000).toFixed(2)}L breaches the ₹${(simBuffer / 100000).toFixed(1)}L emergency buffer floor.`;
    }

    return { ...b, decision, rationale };
  });

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setModalSubmitted(false);
      setModalEmail('');
      setModalCompany('');
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-[#0C0A09] text-[#F5F2EB] font-sans selection:bg-[#C89B58] selection:text-[#0C0A09] antialiased overflow-x-hidden">
      
      {/* ==================================================================== */}
      {/* 1. NAVIGATION BAR                                                    */}
      {/* ==================================================================== */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#0C0A09]/85 border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#C89B58] text-[#0C0A09] font-serif font-bold text-lg flex items-center justify-center shadow-sm shadow-[#C89B58]/20 transition-transform group-hover:scale-95 duration-200">
              F
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-semibold tracking-tight text-white group-hover:text-[#C89B58] transition-colors">
                FinOS
              </span>
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#C89B58] -mt-1 font-semibold">
                Financial Operating Brain
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8 text-xs font-medium text-stone-400">
            <a href="#product" className="hover:text-stone-100 transition-colors">Product</a>
            <a href="#how-it-works" className="hover:text-stone-100 transition-colors">How it works</a>
            <a href="#who-its-for" className="hover:text-stone-100 transition-colors">Who it&apos;s for</a>
            <a href="#pricing" className="hover:text-stone-100 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-stone-100 transition-colors">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-mono font-medium text-stone-400 hover:text-stone-100 px-3 py-2 transition-colors"
            >
              Sign In
            </Link>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] text-xs font-bold transition-all shadow-sm shadow-[#C89B58]/20 hover:shadow-[#C89B58]/40"
            >
              Book a 15-minute walkthrough
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 pt-2 pb-6 space-y-3 bg-[#141210] border-b border-white/[0.08]">
            <a href="#product" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-300 text-xs">Product</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-300 text-xs">How it works</a>
            <a href="#who-its-for" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-300 text-xs">Who it&apos;s for</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-300 text-xs">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-stone-300 text-xs">FAQ</a>
            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <Link href="/login" className="text-xs font-semibold text-center py-2 text-stone-300">Sign In</Link>
              <button
                onClick={() => { setMobileMenuOpen(false); setIsModalOpen(true); }}
                className="w-full py-2.5 rounded bg-[#C89B58] text-[#0C0A09] text-xs font-bold text-center"
              >
                Book a 15-minute walkthrough
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ==================================================================== */}
      {/* 2. HERO SECTION                                                      */}
      {/* ==================================================================== */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-36 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-[#C89B58]/[0.05] blur-[150px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#141210] border border-[#C89B58]/30 text-[#C89B58] text-[10px] font-mono font-semibold tracking-[0.14em] uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>BUILT FOR GROWING INDIAN BUSINESSES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-[70px] font-serif font-normal tracking-tight text-stone-100 leading-[1.08] max-w-4xl mx-auto">
            Know where your money went <br className="hidden sm:inline" />
            <span className="text-stone-600 font-normal">—</span> <br className="hidden sm:inline" />
            and what needs <span className="italic text-[#C89B58]">attention now</span>.
          </h1>

          <p className="text-sm sm:text-base text-stone-400 max-w-2xl mx-auto leading-relaxed font-normal">
            FinOS connects your bank, books, payment gateway, and invoice records; finds what does not agree; explains why; and helps you decide which vendor payments to prioritize.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#C89B58]/20 flex items-center justify-center gap-2"
            >
              <span>Book a 15-minute walkthrough</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#product"
              className="w-full sm:w-auto px-7 py-3.5 rounded bg-[#141210] hover:bg-[#1A1715] border border-white/[0.08] text-stone-300 hover:text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center"
            >
              See how FinOS works
            </a>
          </div>

          <p className="text-[11px] font-mono text-stone-500">
            No credit card required for a walkthrough.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-y-3 gap-x-8 pt-4 text-xs font-mono text-stone-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7EA889] shrink-0" />
              <span>Find unexplained money movements</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7EA889] shrink-0" />
              <span>Reconcile bank, books, and gateway records</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7EA889] shrink-0" />
              <span>Protect your emergency cash reserve</span>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. INTERACTIVE PRODUCT TERMINAL PREVIEW                               */}
      {/* ==================================================================== */}
      <section id="product" className="py-16 sm:py-24 border-t border-white/[0.06] bg-[#0E0C0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141210] border border-white/[0.08] text-[#7EA889] text-[10px] font-mono font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7EA889] animate-pulse" />
              <span>THREE-WAY VERIFICATION ENGINE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif text-stone-100 font-normal tracking-tight">
              One financial picture. Every important movement <span className="italic text-[#C89B58]">explained</span>.
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Interactive preview: explore how FinOS matches transactions, flags discrepancies, and protects liquidity.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#141210] p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C89B58]" />
                <span className="text-sm font-serif font-medium text-stone-200">
                  Apex Industrial Corp <span className="text-stone-500 font-mono text-xs">· FY 2026–2027</span>
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0C0A09] border border-white/[0.08] text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7EA889]" />
                <span className="text-stone-300">Bank ─ Books ─ Gateway:</span>
                <span className="text-[#7EA889] font-bold">3-Way Matched</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-2">
                <span className="text-[10px] font-mono uppercase text-stone-500">Available Bank Cash</span>
                <div className="text-3xl font-light font-mono text-stone-100 tracking-tight">₹18,91,740.00</div>
                <span className="text-[10px] text-[#7EA889] font-mono block">Cleared Bank Statement Balance</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0C0A09] border border-[#C89B58]/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase text-[#C89B58]">Emergency Buffer Floor</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#C89B58]/10 text-[#C89B58] border border-[#C89B58]/30 uppercase font-mono">LOCKED</span>
                </div>
                <div className="text-3xl font-light font-mono text-[#C89B58] tracking-tight">₹4,00,000.00</div>
                <span className="text-[10px] text-stone-400 font-mono block">Non-Negotiable Survival Reserve</span>
              </div>

              <div className="p-5 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-2">
                <span className="text-[10px] font-mono uppercase text-stone-500">Safe Payment Capacity</span>
                <div className="text-3xl font-light font-mono text-[#7EA889] tracking-tight">₹14,91,740.00</div>
                <span className="text-[10px] text-stone-500 font-mono block">Cash Headroom (Bank Cash − Buffer)</span>
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/[0.06] pb-px overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Overview Metrics' },
                { id: 'payables', label: 'Payment Decision Queue' },
                { id: 'discrepancy', label: 'Exception Break Queue' },
                { id: 'vault', label: 'Vault Sources' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                    activePreviewTab === tab.id
                      ? 'border-[#C89B58] text-white bg-[#0C0A09]'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06]">
                    <span className="text-stone-500 text-[10px] uppercase block mb-1">Gateway-to-Bank Match Rate</span>
                    <div className="text-2xl font-light text-stone-100">94.8%</div>
                    <span className="text-stone-500 text-[10px]">1,420 Vouchers Reconciled</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06]">
                    <span className="text-stone-500 text-[10px] uppercase block mb-1">Rupees at Risk</span>
                    <div className="text-2xl font-light text-[#C86D67]">₹14,320.00</div>
                    <span className="text-stone-500 text-[10px]">18% GST MDR Fee Variances</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06]">
                    <span className="text-stone-500 text-[10px] uppercase block mb-1">Early Cash Discount ROI</span>
                    <div className="text-2xl font-light text-[#7EA889]">₹26,450.00</div>
                    <span className="text-stone-500 text-[10px]">Captured without buffer breach</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Payables Queue */}
            {activePreviewTab === 'payables' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-100 text-sm">Apex Heavy Foundry Pvt Ltd</span>
                      <span className="px-2 py-0.5 rounded text-[9px] bg-[#7EA889]/15 text-[#7EA889] font-bold border border-[#7EA889]/30">PAY NOW</span>
                    </div>
                    <p className="text-stone-400 font-sans text-xs mt-1">
                      Captures 2% cash discount (saves ₹8,000) expiring in 48h. Fits safely in liquidity headroom.
                    </p>
                  </div>
                  <div className="text-right sm:shrink-0 font-mono">
                    <div className="text-base font-semibold text-stone-100">₹4,00,000.00</div>
                    <span className="text-[10px] text-stone-500">Due in 2 days</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-100 text-sm">Precision Valve Corp</span>
                      <span className="px-2 py-0.5 rounded text-[9px] bg-[#D4A359]/15 text-[#D4A359] font-bold border border-[#D4A359]/30">SCHEDULE</span>
                    </div>
                    <p className="text-stone-400 font-sans text-xs mt-1">
                      Due in 13 days. Scheduled for payment run on 20 Nov 2026. Preserves working capital.
                    </p>
                  </div>
                  <div className="text-right sm:shrink-0 font-mono">
                    <div className="text-base font-semibold text-stone-100">₹2,50,000.00</div>
                    <span className="text-[10px] text-stone-500">Due in 13 days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Discrepancy Queue */}
            {activePreviewTab === 'discrepancy' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-[#C86D67]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="font-bold text-[#C86D67]">[GATEWAY_MDR_GST_MISMATCH]</span>
                    <p className="text-stone-300 font-sans text-xs mt-1">
                      MDR fee calculated as 2.0% + 18% GST on gross ₹1.0L; contractual rate is 1.75% flat.
                    </p>
                  </div>
                  <div className="text-right sm:shrink-0">
                    <div className="text-base font-bold text-[#C86D67]">₹1,432.00 at Risk</div>
                    <span className="text-[10px] text-stone-500">Case #CASE-992</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Vault Sources */}
            {activePreviewTab === 'vault' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase">Bank Statement</span>
                  <div className="text-stone-100 font-bold text-base">HDFC Corporate</div>
                  <span className="text-[#7EA889] text-[9px]">● ACTIVE STREAM</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase">Gateway Report</span>
                  <div className="text-stone-100 font-bold text-base">Razorpay Payouts</div>
                  <span className="text-[#7EA889] text-[9px]">● ACTIVE STREAM</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase">Accounting Ledger</span>
                  <div className="text-stone-100 font-bold text-base">Tally Daybook</div>
                  <span className="text-[#7EA889] text-[9px]">● ACTIVE STREAM</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                  <span className="text-stone-500 text-[10px] uppercase">Vendor Invoices</span>
                  <div className="text-stone-100 font-bold text-base">Commercial Bills</div>
                  <span className="text-[#7EA889] text-[9px]">● ACTIVE STREAM</span>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. THE PROBLEM                                                       */}
      {/* ==================================================================== */}
      <section className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0C0A09]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C89B58] font-semibold">THE PROBLEM</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight leading-tight">
              Your financial records live in different systems. <span className="italic text-[#C89B58]">Your decisions shouldn&apos;t.</span>
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              Growing companies run on modern stacks—HDFC/ICICI corporate banking, Tally Prime or Zoho, Razorpay or Cashfree, and vendor WhatsApp invoices. Yet finance still runs on manual guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">01 / DRIFT</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">Gateway Deductions Hide Cash Leaks</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Bank credits rarely match gateway dashboard totals. With 1.5%–2% MDR fees, refund holdbacks, and 18% GST deducted upstream, small percentage drifts accumulate into major working capital leaks.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">02 / DELAY</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">Uncleared Cheques Blindside Cash</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Accounting software shows one ledger balance; the bank portal shows another. Missing UTRs and delayed clearance cycles leave finance teams unsure of true safe-to-spend headroom.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">03 / BREACH</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">Subjective Vendor Payout Decisions</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Payables are paid based on squeaky-wheel vendor follow-ups rather than empirical prioritization. Disbursing without a defined buffer floor frequently starves critical raw-material suppliers.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">04 / LOSS</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">Missed Early Payment Discounts</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Suppliers offer 1.5% to 2% cash discounts for settlement within 10 days. Without a real-time liquidity queue, high-ROI discount windows quietly expire unnoticed in inbox folders.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">05 / FRICTION</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">Scattered WhatsApp & Excel Lineage</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                When statutory auditors or CAs ask why a ₹4.5L variance occurred in Q2, the finance team spends three days hunting across WhatsApp threads, bank exports, and manual spreadsheets for proof.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-3 hover:border-[#C89B58]/30 transition">
              <span className="text-xs font-mono font-bold text-[#C89B58]">06 / GUESSWORK</span>
              <h3 className="text-base font-serif text-stone-100 font-medium">No Machine Learning on History</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Historical supplier delays, duplicate billing risks, and customer DSO velocity are trapped in 24 months of static PDFs. Finance operations repeat the same unforced errors every quarter.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. HOW FINOS WORKS                                                   */}
      {/* ==================================================================== */}
      <section id="how-it-works" className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0E0C0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C89B58] font-semibold">THE 7-STAGE INTELLIGENCE LOOP</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight">
              From fragmented records to <span className="italic text-[#C89B58]">verified financial intelligence</span>.
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm">
              FinOS does not replace Tally or your bank portal; it works above them as an institutional verification and decision-intelligence layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Connect', desc: 'Vault raw bank statements, Razorpay settlement reports, Tally daybooks, and vendor purchase registers in seconds.' },
              { num: '02', title: 'Understand', desc: 'Normalize messy headers, dates, and amounts into canonical integer paise (zero floating-point drift).' },
              { num: '03', title: 'Verify', desc: 'Cross-examine Bank vs Gateway vs Books using deterministic 3-way matching rules.' },
              { num: '04', title: 'Explain', desc: 'Tag variances with standard reason codes (MDR fee mismatch, timing lag, duplicate debit).' },
              { num: '05', title: 'Prioritize', desc: 'Score vendor reliability (0–100) across 5 vectors and rank payments by cash discount ROI.' },
              { num: '06', title: 'Prove', desc: 'Bind transactions to source files with SHA-256 cryptographic hashes for instant CA/auditor review.' },
              { num: '07', title: 'Decide', desc: 'Output Pay Now, Schedule, or Hold recommendations protecting your emergency reserve floor.' },
              { num: '★', title: 'Sovereign', desc: 'Human-in-the-loop: FinOS recommends and proves; the founder or CFO always authorizes decisions.' }
            ].map((step, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-2">
                <span className="text-xs font-mono font-bold text-[#C89B58]">{step.num}</span>
                <h3 className="text-base font-serif font-medium text-stone-100">{step.title}</h3>
                <p className="text-xs text-stone-400 leading-relaxed font-sans">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. WORKING CAPITAL INTERACTIVE SIMULATOR (CORRECTED LINE 1071)       */}
      {/* ==================================================================== */}
      <section className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0C0A09]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#7EA889] font-semibold">INTERACTIVE SCENARIO SIMULATOR</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight">
              Make better payment decisions <span className="italic text-[#C89B58]">before cash leaves your account</span>.
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Drag the sliders below to adjust cash and reserve buffer. Watch the FinOS decision queue re-triage payments live.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-[#141210] border border-white/[0.08] space-y-8">
            
            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-white/[0.06]">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-stone-400 uppercase">Available Bank Cash</span>
                  <span className="text-base font-medium text-stone-100">₹{simCash.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="3000000"
                  step="50000"
                  value={simCash}
                  onChange={(e) => setSimCash(parseInt(e.target.value) || 0)}
                  className="w-full accent-[#C89B58] cursor-pointer bg-stone-900"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-500">
                  <span>₹5.00 Lakhs</span>
                  <span>₹30.00 Lakhs</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#C89B58] uppercase">Emergency Buffer Floor (&quot;Laxman Rekha&quot;)</span>
                  <span className="text-base font-medium text-[#C89B58]">₹{simBuffer.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="1500000"
                  step="50000"
                  value={simBuffer}
                  onChange={(e) => setSimBuffer(parseInt(e.target.value) || 0)}
                  className="w-full accent-[#C89B58] cursor-pointer bg-stone-900"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-500">
                  <span>₹2.00 Lakhs</span>
                  <span>₹15.00 Lakhs</span>
                </div>
              </div>
            </div>

            {/* Calculations Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                <span className="text-stone-500 text-[10px] uppercase">Safe Payment Capacity</span>
                <div className="text-2xl font-light text-[#7EA889]">₹{simHeadroom.toLocaleString('en-IN')}</div>
                <span className="text-stone-500 text-[10px]">Headroom (Cash − Reserve Floor)</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                <span className="text-stone-500 text-[10px] uppercase">Early Discounts in Window</span>
                <div className="text-2xl font-light text-[#C89B58]">₹11,515.00</div>
                <span className="text-stone-500 text-[10px]">Active 2% supplier terms</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0C0A09] border border-white/[0.06] space-y-1">
                <span className="text-stone-500 text-[10px] uppercase">Liquidity Mode</span>
                <div className="text-lg font-bold text-stone-100 uppercase">NON_NEGOTIABLE</div>
                <span className="text-stone-500 text-[10px]">Blocks buffer-breaching payouts</span>
              </div>
            </div>

            {/* Live Triaged List */}
            <div className="space-y-3 font-mono text-xs">
              <span className="text-stone-400 uppercase text-[11px] block">Live Evaluated Bills Queue</span>
              {evaluatedBills.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-[#0C0A09] border border-white/[0.06] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-200 text-sm">{b.vendor}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        b.decision === 'PAY NOW' ? 'bg-[#7EA889]/15 text-[#7EA889] border border-[#7EA889]/30' :
                        b.decision === 'SCHEDULE' ? 'bg-[#D4A359]/15 text-[#D4A359] border border-[#D4A359]/30' :
                        'bg-[#C86D67]/15 text-[#C86D67] border border-[#C86D67]/30'
                      }`}>
                        {b.decision}
                      </span>
                    </div>
                    <p className="text-stone-400 font-sans text-xs mt-0.5">{b.rationale}</p>
                  </div>
                  <div className="text-right sm:shrink-0 font-mono">
                    <div className="text-base font-medium text-stone-100">₹{b.amount.toLocaleString('en-IN')}</div>
                    <span className="text-[10px] text-stone-500">Due in {b.dueDays}d</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-[11px] font-mono text-stone-500">
              *Illustrative scenario simulation executed via integer paise deterministic logic.
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. WHO FINOS IS FOR                                                  */}
      {/* ==================================================================== */}
      <section id="who-its-for" className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0E0C0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="max-w-3xl space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C89B58] font-semibold">TAILORED WORKFLOWS</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight">
              Built for the people <span className="italic text-[#C89B58]">responsible for company money</span>.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#C89B58]/10 border border-[#C89B58]/20 flex items-center justify-center text-[#C89B58]">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-medium text-stone-100">Founders & Owners</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Know true safe-to-spend cash at a glance. Protect solvency with a non-negotiable emergency buffer and stop paying low-priority bills while starving key suppliers.
              </p>
              <div className="text-[11px] font-mono text-[#7EA889] pt-2 border-t border-white/[0.06]">
                ✓ Solvency Protection
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-[#C89B58]/40 space-y-4 shadow-lg shadow-[#C89B58]/5">
              <div className="w-10 h-10 rounded-lg bg-[#C89B58] text-[#0C0A09] flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-medium text-stone-100">CFOs & Finance Heads</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Enforce dual-approval governance thresholds, schedule payouts on corporate run dates (10th/25th), and maximize early cash discount captures.
              </p>
              <div className="text-[11px] font-mono text-[#C89B58] pt-2 border-t border-white/[0.06]">
                ✓ Working Capital ROI
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#7EA889]/10 border border-[#7EA889]/20 flex items-center justify-center text-[#7EA889]">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-medium text-stone-100">Finance Teams</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Automate multi-pass matching across bank UTRs and gateway fees. Eliminate repetitive VLOOKUP hours and investigate exceptions with standardized reason codes.
              </p>
              <div className="text-[11px] font-mono text-[#7EA889] pt-2 border-t border-white/[0.06]">
                ✓ 80% Less Reconciliation Time
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#141210] border border-white/[0.07] space-y-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-stone-300">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-serif font-medium text-stone-100">CAs & Auditors</h3>
              <p className="text-xs text-stone-400 leading-relaxed font-sans">
                Scoped read-only verification access. Trace any line item directly to source file hashes and download certified PDF evidence packs without WhatsApp delays.
              </p>
              <div className="text-[11px] font-mono text-[#7EA889] pt-2 border-t border-white/[0.06]">
                ✓ SHA-256 Provenance Hashing
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. PRICING TIERS                                                     */}
      {/* ==================================================================== */}
      <section id="pricing" className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0C0A09]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C89B58] font-semibold">PLANS & GOVERNANCE TIERS</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight">
              Calibrated for <span className="italic text-[#C89B58]">growing businesses</span>.
            </h2>
            <p className="text-xs sm:text-sm text-stone-400">
              Designed for companies processing ₹5 Cr to ₹100+ Cr turnover.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl bg-[#141210] border border-white/[0.07] space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-mono text-stone-500 uppercase">Growth Edition</span>
                <h3 className="text-xl font-serif font-medium text-stone-100">Foundational</h3>
                <p className="text-xs text-stone-400 font-sans">For businesses processing ₹5 Cr – ₹15 Cr turnover.</p>
                <div className="space-y-2 pt-4 border-t border-white/[0.06] text-xs font-sans text-stone-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Up to 5,000 monthly txns</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Bank vs Tally 3-Way Reconciliation</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Payables Decision Queue</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> 2 Team Seats</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 rounded bg-[#0C0A09] hover:bg-[#1A1715] border border-white/10 text-stone-200 font-semibold text-xs transition"
              >
                Inquire for Growth
              </button>
            </div>

            <div className="p-8 rounded-xl bg-[#141210] border border-[#C89B58] space-y-6 flex flex-col justify-between shadow-2xl shadow-[#C89B58]/10 relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded bg-[#C89B58] text-[#0C0A09] text-[9px] font-mono font-bold uppercase tracking-wider">
                POPULAR
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-[#C89B58] uppercase font-bold">Scale Edition</span>
                </div>
                <h3 className="text-xl font-serif font-medium text-stone-100">Institutional</h3>
                <p className="text-xs text-stone-400 font-sans">For businesses processing ₹15 Cr – ₹50 Cr turnover.</p>
                <div className="space-y-2 pt-4 border-t border-white/[0.06] text-xs font-sans text-stone-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Up to 25,000 monthly txns</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Razorpay & Gateway Auditing</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> 5-Vector Vendor Reliability Scores</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Scoped CA / Auditor Access</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Guarded Financial AI</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-3 rounded bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] font-bold text-xs shadow-md shadow-[#C89B58]/20 transition"
              >
                Book Institutional Walkthrough
              </button>
            </div>

            <div className="p-8 rounded-xl bg-[#141210] border border-white/[0.07] space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-mono text-stone-500 uppercase">Custom Corporate</span>
                <h3 className="text-xl font-serif font-medium text-stone-100">Multi-Entity</h3>
                <p className="text-xs text-stone-400 font-sans">For enterprises processing ₹50 Cr – ₹200+ Cr turnover.</p>
                <div className="space-y-2 pt-4 border-t border-white/[0.06] text-xs font-sans text-stone-300">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Unlimited transaction ingestion</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Multi-GSTIN Group Consolidation</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Custom ERP Adapters (SAP, Zoho)</div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#7EA889]" /> Dedicated SRE & Financial Architect</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 rounded bg-[#0C0A09] hover:bg-[#1A1715] border border-white/10 text-stone-200 font-semibold text-xs transition"
              >
                Inquire for Multi-Entity
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 9. FAQ ACCORDION                                                     */}
      {/* ==================================================================== */}
      <section id="faq" className="py-20 sm:py-28 border-t border-white/[0.06] bg-[#0E0C0A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C89B58] font-semibold">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="text-3xl sm:text-5xl font-serif text-stone-100 font-normal tracking-tight">
              Operational clarity for <span className="italic text-[#C89B58]">finance teams</span>.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'What exactly is FinOS?',
                a: 'FinOS is an institutional financial verification and payment-decision software. It is not an accounting system or a payment gateway. It connects your bank accounts, accounting daybooks (Tally/Zoho), gateway settlements (Razorpay), and open bills into a single verification layer that catches fee leaks, verifies 3-way agreement, and guides safe payment decisions.'
              },
              {
                q: 'Does FinOS replace Tally Prime or Zoho Books?',
                a: 'No. FinOS operates strictly above your accounting software. Your accountants continue entering vouchers in Tally; FinOS reads exports and verified transactions to audit accuracy, uncover discrepancies, and prioritize cash payouts.'
              },
              {
                q: 'Does FinOS execute disbursements automatically?',
                a: 'Never. FinOS operates on a strict human-in-the-loop governance philosophy. The software calculates, verifies, and triages bills into Pay Now, Schedule, or Hold recommendations; the business owner or CFO retains final decision authority and executes payouts.'
              },
              {
                q: 'How does the Emergency Reserve Floor ("Laxman Rekha") work?',
                a: 'You define a minimum cash reserve required for company survival (e.g. ₹4,00,000 to cover payroll, statutory taxes, and lease). In NON_NEGOTIABLE mode, the payables decision queue strictly blocks any disbursement recommendation that would cause closing bank cash to dip below this line.'
              },
              {
                q: 'How are gateway MDR fee discrepancies detected?',
                a: 'Payment gateways deduct MDR fees (typically 1.5%–2%) and 18% GST before crediting your bank. FinOS models contractual fee formulas down to the integer paise, cross-examining gross orders vs bank credits to flag over-deductions and missing payouts.'
              },
              {
                q: 'Can our statutory auditor or CA use FinOS?',
                a: 'Yes. FinOS provides dedicated scoped access for CAs and auditors. They receive read-only verification permissions to inspect Bank, Books, and Gateway reconciliations with SHA-256 provenance hashes and can download compiled binary PDF evidence packs.'
              }
            ].map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.07] bg-[#141210] overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif font-medium text-stone-100 text-sm"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${openFaqIndex === idx ? 'rotate-180 text-[#C89B58]' : ''}`} />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-stone-400 font-sans leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 10. FINAL CTA BANNER                                                 */}
      {/* ==================================================================== */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-[#0C0A09] border-t border-white/[0.06]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#C89B58]/[0.08] blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <h2 className="text-4xl sm:text-6xl font-serif text-stone-100 font-normal tracking-tight">
            Know where your money went. <br />
            Take control of <span className="italic text-[#C89B58]">company cash</span>.
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto text-xs sm:text-sm font-sans leading-relaxed">
            Start with your existing bank statements, Tally registers, and open vendor bills. Experience how FinOS uncovers hidden variance and protects liquidity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] font-bold text-xs sm:text-sm shadow-md shadow-[#C89B58]/20 transition flex items-center justify-center gap-2"
            >
              <span>Book a 15-minute walkthrough</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded bg-[#141210] hover:bg-[#1A1715] border border-white/[0.08] text-stone-300 hover:text-white font-medium text-xs sm:text-sm transition"
            >
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 11. FOOTER                                                           */}
      {/* ==================================================================== */}
      <footer className="border-t border-white/[0.07] bg-[#0E0C0A] py-12 text-xs text-stone-400 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#C89B58] text-[#0C0A09] font-serif font-bold text-base flex items-center justify-center">
                F
              </div>
              <span className="text-base font-serif font-semibold text-stone-100">FinOS</span>
              <span className="text-stone-700">·</span>
              <span className="text-stone-400">Financial Verification & Control</span>
            </div>

            <div className="flex gap-6 text-stone-400 font-medium text-xs">
              <Link href="/login" className="hover:text-stone-100 transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-stone-100 transition-colors">Sign Up</Link>
              <a href="#product" className="hover:text-stone-100 transition-colors">Product</a>
              <a href="#pricing" className="hover:text-stone-100 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-stone-100 transition-colors">FAQ</a>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-2 text-stone-500 text-[11px] font-mono">
            <div>© 2026 FinOS Platform. Institutional Financial Intelligence. All rights reserved.</div>
            <div>Built for Indian MSMEs & D2C Brands (₹5 Cr – ₹100+ Cr Turnover)</div>
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* 12. WALKTHROUGH MODAL                                                */}
      {/* ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-white/[0.12] bg-[#141210] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            
            <div className="flex justify-between items-start border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#C89B58] font-bold tracking-wider">PRODUCT WALKTHROUGH</span>
                <h3 className="text-lg font-serif font-medium text-stone-100 mt-0.5">Schedule a 15-Minute Demo</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalSubmitted ? (
              <div className="p-6 rounded-xl bg-[#7EA889]/10 border border-[#7EA889]/30 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#7EA889] mx-auto" />
                <h4 className="text-base font-serif font-medium text-stone-100">Walkthrough Confirmed</h4>
                <p className="text-xs text-stone-300 leading-relaxed font-sans">
                  Our financial engineering lead will reach out within 4 business hours to walk through your reconciliation and payables queue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-4 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="text-stone-400 font-medium">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    placeholder="cfo@company.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C0A09] border border-white/10 text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 font-medium">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={modalCompany}
                    onChange={(e) => setModalCompany(e.target.value)}
                    placeholder="e.g. Apex Industrial Corp"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C0A09] border border-white/10 text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 font-medium">Annual Turnover Scale</label>
                  <select
                    value={modalTurnover}
                    onChange={(e) => setModalTurnover(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0C0A09] border border-white/10 text-stone-300 focus:border-[#C89B58] focus:outline-none text-xs"
                  >
                    <option value="₹5 Cr – ₹15 Cr">₹5 Cr – ₹15 Cr (Growth)</option>
                    <option value="₹15 Cr – ₹50 Cr">₹15 Cr – ₹50 Cr (Scale)</option>
                    <option value="₹50 Cr – ₹200+ Cr">₹50 Cr – ₹200+ Cr (Multi-Entity)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#0C0A09] hover:bg-[#1A1715] text-stone-300 font-semibold text-xs border border-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] font-bold text-xs transition shadow-sm"
                  >
                    Confirm Walkthrough
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}