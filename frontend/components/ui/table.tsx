import React from 'react';

interface TableContainerProps {
  children: React.ReactNode;
  actionRow?: React.ReactNode;
}

export function TableContainer({ children, actionRow }: TableContainerProps) {
  return (
    <div className="bg-[#070a10] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
      {actionRow && (
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#05070c] flex justify-between items-center">
          {actionRow}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
    </div>
  );
}