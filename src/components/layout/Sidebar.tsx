
import React from 'react';
import { UserRole } from '@/types';
import { LayoutDashboard, ShieldAlert, LogOut, GraduationCap, X, Store, ArrowUpDown, Settings, BookUser } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';

const Sidebar: React.FC = () => {
  const { auth, handleLogout: onLogout, isSidebarOpen: isOpen, setIsSidebarOpen: setIsOpen } = useAppStore();
  const role = auth.user!.role;
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out transform
    lg:relative lg:translate-x-0 
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="px-4 pt-0 pb-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center -mt-2">
          <img src="/logo_horizontal.png" alt="RED Logo" className="h-32 w-auto object-contain" />
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 hover:bg-slate-800 rounded-md transition"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-2">
        <Link
          to="/dashboard"
          onClick={() => setIsOpen(false)}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-tight">Dashboard</span>
        </Link>

        <Link
          to="/my-stores"
          onClick={() => setIsOpen(false)}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'my-stores' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}
        >
          <Store className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-tight">Mis tiendas</span>
        </Link>

        {(role === UserRole.ADMIN || role === UserRole.COORDINATOR) && (
          <Link
            to="/entries-exits"
            onClick={() => setIsOpen(false)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'entries-exits' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-tight">Ingresos y Retiros</span>
          </Link>
        )}

        {(role === UserRole.ADMIN || role === UserRole.COORDINATOR || role === UserRole.LIDER) && (
          <Link
            to="/banca"
            onClick={() => setIsOpen(false)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'banca' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            <BookUser className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-tight">Banca</span>
          </Link>
        )}

        {(role === UserRole.ADMIN || role === UserRole.COORDINATOR) && (
          <Link
            to="/admin"
            onClick={() => setIsOpen(false)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            {role === UserRole.ADMIN ? <ShieldAlert className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            <span className="font-bold text-sm uppercase tracking-tight">
              {role === UserRole.ADMIN ? 'Administración' : 'Gestión Equipo'}
            </span>
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-tight">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
