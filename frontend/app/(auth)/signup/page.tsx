'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { ShieldCheck, ArrowRight, Lock, Mail, Building2, AlertTriangle, RefreshCw, Hash, FileText } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !companyName) {
      setError('Please provide company legal name, work email, and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        email,
        password,
        company_name: companyName,
      };
      if (gstin.trim()) payload.gstin = gstin.trim().toUpperCase();
      if (pan.trim()) payload.pan = pan.trim().toUpperCase();

      const response = await api.post('/auth/signup', payload);

      const { access_token, user } = response.data;
      if (access_token) {
        localStorage.setItem('finos_access_token', access_token);
      }
      localStorage.setItem('finos_company_name', companyName);

      window.dispatchEvent(new Event('profileUpdated'));
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0A09] text-[#F5F2EB] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-[#C89B58] selection:text-[#0C0A09]">
      {/* Subtle Ambient Warm Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-[#C89B58]/[0.05] blur-[150px] pointer-events-none rounded-full" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg bg-[#141210] border border-white/[0.08] rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="group flex items-center justify-center">
            <div className="w-11 h-11 rounded-xl bg-[#C89B58] text-[#0C0A09] font-serif font-bold text-xl flex items-center justify-center shadow-lg shadow-[#C89B58]/20 transition-transform group-hover:scale-95 duration-200">
              F
            </div>
          </Link>
          
          <div>
            <h1 className="text-2xl font-serif font-normal text-stone-100 tracking-tight">
              Create FinOS <span className="italic text-[#C89B58]">Workspace</span>
            </h1>
            <p className="text-xs font-mono text-stone-400 mt-1">
              Financial Verification & Decision Workspace
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSignup} className="space-y-4 text-xs font-sans">
          
          {/* Company Legal Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
              Company Legal Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Sharma Traders Pvt Ltd"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none text-xs transition"
              />
            </div>
          </div>

          {/* Work Email Address */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sharmatraders.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs transition"
              />
            </div>
          </div>

          {/* GSTIN and PAN (Optional Row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
                GSTIN (Optional)
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-500" />
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="27ABCDE..."
                  maxLength={15}
                  className="w-full pl-8 pr-3 py-2 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs uppercase transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
                PAN (Optional)
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-500" />
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE..."
                  maxLength={10}
                  className="w-full pl-8 pr-3 py-2 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs uppercase transition"
                />
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#C89B58] hover:bg-[#D9AB6A] text-[#0C0A09] font-bold text-xs transition-all shadow-md shadow-[#C89B58]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer & Switch to Sign In */}
        <div className="pt-4 border-t border-white/[0.06] space-y-3 text-center">
          <p className="text-xs text-stone-400 font-sans">
            Already have a workspace?{' '}
            <Link href="/login" className="text-[#C89B58] hover:text-[#D9AB6A] font-semibold transition">
              Sign in
            </Link>
          </p>

          <div className="text-[10px] font-mono text-stone-500 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#7EA889]" />
            <span>Enterprise Security · Row-Level Tenant Isolation</span>
          </div>
        </div>

      </div>
    </div>
  );
}