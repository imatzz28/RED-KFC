
import React from 'react';
import { UserRole } from '../types';
import { LayoutDashboard, ShieldAlert, LogOut, GraduationCap, X, Store, ArrowUpDown, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'my-stores' | 'admin' | 'entries-exits';
  setActiveTab: (tab: 'dashboard' | 'my-stores' | 'admin' | 'entries-exits') => void;
  role: UserRole;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, onLogout, isOpen, setIsOpen }) => {
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out transform
    lg:relative lg:translate-x-0 
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          < GraduationCap className="w-8 h-8 text-red-500" />
          <span className="text-xl font-bold tracking-tight italic uppercase">Curvas EX</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 hover:bg-slate-800 rounded-md transition"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-tight">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('my-stores')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'my-stores' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
            }`}
        >
          <Store className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-tight">Mis tiendas</span>
        </button>

        {(role === UserRole.ADMIN || role === UserRole.COORDINATOR) && (
          <button
            onClick={() => setActiveTab('entries-exits')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'entries-exits' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            <ArrowUpDown className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-tight">Ingresos y Retiros</span>
          </button>
        )}

        {(role === UserRole.ADMIN || role === UserRole.COORDINATOR) && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
          >
            {role === UserRole.ADMIN ? <ShieldAlert className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            <span className="font-bold text-sm uppercase tracking-tight">
              {role === UserRole.ADMIN ? 'Administración' : 'Gestión Equipo'}
            </span>
          </button>
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
