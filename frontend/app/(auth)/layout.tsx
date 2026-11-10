import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0A09] text-[#F5F2EB] antialiased">
      {children}
    </div>
  );
}
