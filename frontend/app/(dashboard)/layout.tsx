'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, Scale, 
  CreditCard, Sliders, MessageSquare, 
  FileText, LogOut, UploadCloud, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { ThreeWayNode, Eyebrow } from '@/components/ui/primitives';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('FinOS Institutional');
  const [financialYear, setFinancialYear] = useState('FY 2026–2027');

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profiles/');
      if (res.data?.name) {
        setCompanyName(res.data.name);
        localStorage.setItem('finos_company_name', res.data.name);
      }
      if (res.data?.financial_year) {
        setFinancialYear(res.data.financial_year);
      }
    } catch {
      const cached = localStorage.getItem('finos_company_name');
      if (cached) setCompanyName(cached);
    }
  };

  useEffect(() => {
    fetchProfile();
    window.addEventListener('profileUpdated', fetchProfile);
    return () => window.removeEventListener('profileUpdated', fetchProfile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('finos_access_token');
    localStorage.removeItem('finos_company_name');
    router.push('/login');
  };

  // Full 8 Nav Items Preserved Exactly
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Vault & Sources', href: '/sources', icon: Database },
    { label: 'Upload Files', href: '/upload', icon: UploadCloud, highlight: true },
    { label: 'Discrepancy Queue', href: '/queue', icon: Scale },
    { label: 'Payment Decision Queue', href: '/payables', icon: CreditCard },
    { label: 'Admin Controls', href: '/admin', icon: Sliders },
    { label: 'Guarded Ask', href: '/ask', icon: MessageSquare },
    { label: 'Evidence Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-ink-950 text-stone-100 flex flex-col md:flex-row antialiased">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-ink-900 border-r border-white/[0.06] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Wordmark */}
          <div className="p-6 border-b border-white/[0.06]">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brass text-stone-950 font-serif font-bold text-base flex items-center justify-center shadow-sm">
                F
              </div>
              <div>
                <span className="font-serif text-lg text-stone-100 font-semibold tracking-tight">FinOS</span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-brass block">Verification & Control</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-ink-800 text-white border border-white/10 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-ink-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brass' : 'text-stone-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brass" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Identity & Logout */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <div className="px-3 py-2 rounded-lg bg-ink-950 border border-white/5 space-y-0.5">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block truncate">Active Tenant Workspace</span>
            <div className="text-xs font-semibold text-stone-200 truncate">{companyName}</div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-stone-400 hover:text-stone-200 hover:bg-ink-850 rounded-lg text-xs transition"
          >
            <LogOut className="w-3.5 h-3.5 text-stone-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-white/[0.06] bg-ink-900/60 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
            <span className="text-stone-300 font-medium">{companyName}</span>
            <span className="text-stone-600">·</span>
            <span>{financialYear}</span>
          </div>

          <div className="flex items-center gap-4">
            <ThreeWayNode bank={true} books={true} gateway={true} />
            <div className="flex items-center gap-1.5 text-xs font-mono text-stone-400 pl-4 border-l border-white/10">
              <span className="w-2 h-2 rounded-full bg-sage" />
              <span>Verification Engine Active</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
