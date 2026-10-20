'use client';

import React, { useState } from 'react';
import { api, handleApiError } from '@/lib/api';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/signup', {
        company_name: companyName,
        email,
        password,
        gstin: gstin || null,
        pan: pan || null,
      });

      const { access_token, role } = response.data;
      localStorage.setItem('finos_access_token', access_token);
      localStorage.setItem('finos_user_role', role);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(handleApiError(err));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 font-sans antialiased">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-lg tracking-tight mb-3">
            F
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create FinOS Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">Financial Verification & Decision Workspace</p>
        </div>

        {error && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Company Legal Name
            </label>
            <input 
              type="text" 
              required 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)} 
              placeholder="e.g., Sharma Traders Pvt Ltd" 
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email Address
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@sharmatraders.com" 
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••••••" 
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                GSTIN (Optional)
              </label>
              <input 
                type="text" 
                value={gstin} 
                onChange={(e) => setGstin(e.target.value)} 
                placeholder="27ABCDE..." 
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                PAN (Optional)
              </label>
              <input 
                type="text" 
                value={pan} 
                onChange={(e) => setPan(e.target.value)} 
                placeholder="ABCDE..." 
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg py-2.5 transition text-xs shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                <span>Creating workspace...</span>
              </>
            ) : (
              <>
                <span>Create Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Already have a workspace?{' '}
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
            Sign in
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Enterprise Security &bull; Row-Level Tenant Isolation</span>
        </div>
      </div>
    </main>
  );
}