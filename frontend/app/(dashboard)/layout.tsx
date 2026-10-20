'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  LayoutDashboard, 
  Database, 
  UploadCloud, 
  ShieldAlert, 
  DollarSign, 
  Sliders, 
  MessageSquare, 
  FileText, 
  LogOut, 
  Lock 
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('finance_user');
  const [companyName, setCompanyName] = useState<string>('FinOS Workspace');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('finos_access_token');
    const role = localStorage.getItem('finos_user_role');
    
    if (!token) {
      window.location.href = '/login';
    } else {
      if (role) setUserRole(role);

      // Fetch dynamic company legal profile from database
      api.get('/profiles/')
        .then((res) => {
          if (res.data?.name) {
            setCompanyName(res.data.name);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch organization profile for header', err);
        });
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-sans">
        Initializing FinOS Secure Environment...
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('finos_access_token');
    localStorage.removeItem('finos_user_role');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault & Sources', href: '/sources', icon: Database },
    { name: 'Upload Files', href: '/upload', icon: UploadCloud },
    { name: 'Discrepancy Queue', href: '/queue', icon: ShieldAlert },
    { name: 'Payment Decision Queue', href: '/payables', icon: DollarSign },
    { name: 'Admin Controls', href: '/admin', icon: Sliders },
    { name: 'Guarded Ask', href: '/ask', icon: MessageSquare },
    { name: 'Evidence Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-base tracking-tight">
              F
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">FinOS</span>
              <span className="text-[11px] text-slate-500 block">Verification & Control</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => { window.location.href = item.href; }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* User Session Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Access Role</p>
                <p className="text-xs text-slate-700 capitalize font-semibold">{userRole.replace('_', ' ')}</p>
              </div>
              <div className="p-1.5 rounded-md bg-white border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-medium py-2 rounded-lg transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-slate-700">Verification Engine Active</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {/* Dynamically bound to the database organization profile */}
            <span className="font-medium text-slate-800">{companyName}</span>
            <span>&bull;</span>
            <span>Financial Year 2026–2027</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}