'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Database, UploadCloud, ShieldAlert, MessageSquare, FileText, LogOut, Lock, Terminal } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('finance_user');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('finos_access_token');
    const role = localStorage.getItem('finos_user_role');
    if (!token) {
      router.push('/login');
    } else if (role) {
      setUserRole(role);
    }
  }, [router]);

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem('finos_access_token');
    localStorage.removeItem('finos_user_role');
    router.push('/login');
  };

  const navItems = [
    { name: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault & Sources', href: '/sources', icon: Database },
    { name: 'Ingest Files', href: '/upload', icon: UploadCloud },
    { name: 'Discrepancy Queue', href: '/queue', icon: ShieldAlert },
    { name: 'Guarded Ask (AI)', href: '/ask', icon: MessageSquare },
    { name: 'Evidence Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Institutional Obsidian Sidebar */}
      <aside className="w-72 bg-[#070a10] border-r border-slate-800/80 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 text-lg">
              F
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">FinOS Brain</span>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase mt-1 block">Financial Control</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-md shadow-indigo-500/10 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* User Session Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-[#05070c]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">RBAC Scope</p>
                <p className="text-xs text-indigo-400 font-mono capitalize font-bold">{userRole.replace('_', ' ')}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/50 text-slate-300 hover:text-red-300 text-xs font-medium py-2.5 rounded-xl transition duration-200 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#020617]">
        {/* Top Control Bar */}
        <header className="h-16 bg-[#070a10]/85 backdrop-blur-xl border-b border-slate-800/80 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-300 font-medium">PostgreSQL 16 Kernel • RLS Enforced • Zero Float Drift</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Environment: <strong className="text-indigo-400">₹5,000 Cr Pilot Sandbox</strong></span>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#020617]">
          {children}
        </main>
      </div>
    </div>
  );
}