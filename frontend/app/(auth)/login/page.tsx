'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, handleApiError } from '@/lib/api';
import { ShieldCheck, ArrowRight, Lock, Mail, AlertTriangle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both work email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;

      // Store authenticated credentials
      localStorage.setItem('finos_access_token', access_token);
      if (user?.organization_name) {
        localStorage.setItem('finos_company_name', user.organization_name);
      }

      // Notify application layout & redirect to dashboard
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[320px] bg-[#C89B58]/[0.05] blur-[140px] pointer-events-none rounded-full" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-[#141210] border border-white/[0.08] rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Link href="/" className="group flex items-center justify-center">
            <div className="w-11 h-11 rounded-xl bg-[#C89B58] text-[#0C0A09] font-serif font-bold text-xl flex items-center justify-center shadow-lg shadow-[#C89B58]/20 transition-transform group-hover:scale-95 duration-200">
              F
            </div>
          </Link>
          
          <div>
            <h1 className="text-2xl font-serif font-normal text-stone-100 tracking-tight">
              Sign in to <span className="italic text-[#C89B58]">FinOS</span>
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

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          
          {/* Work Email */}
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
                placeholder="sharma@sharmatraders.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0C0A09] border border-white/10 rounded-xl text-white placeholder-stone-600 focus:border-[#C89B58] focus:outline-none font-mono text-xs transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-mono uppercase text-stone-400 tracking-wider">
                Password
              </label>
            </div>
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
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer & Switch to Signup */}
        <div className="pt-4 border-t border-white/[0.06] space-y-3 text-center">
          <p className="text-xs text-stone-400 font-sans">
            Need a workspace?{' '}
            <Link href="/signup" className="text-[#C89B58] hover:text-[#D9AB6A] font-semibold transition">
              Create an account
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