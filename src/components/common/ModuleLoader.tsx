import React from 'react';
import { RefreshCw } from 'lucide-react';

export const ModuleLoader: React.FC<{ message?: string }> = ({ message = 'Cargando módulo...' }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-8 animate-in fade-in duration-200">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75" />
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center relative border border-red-100 shadow-sm">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
      </div>
      <p className="mt-4 text-xs font-black text-slate-700 uppercase tracking-widest bg-white px-5 py-2.5 rounded-full shadow-sm border border-slate-100">
        {message}
      </p>
    </div>
  );
};
