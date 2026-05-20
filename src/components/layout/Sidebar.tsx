import React from 'react';
import { UserRole } from '@/types';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  X, 
  Store, 
  ArrowUpDown, 
  Settings, 
  ShieldCheck, 
  Landmark, 
  Cloud, 
  CloudOff,
  RefreshCw,
  ChevronRight 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';

const Sidebar: React.FC = () => {
  const { auth, isSidebarOpen: isOpen, setIsSidebarOpen: setIsOpen, syncStatus } = useAppStore();
  const role = auth.user!.role;
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';
  
  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-[#0b0f19] text-white flex flex-col transition-transform duration-300 ease-in-out transform
    lg:relative lg:translate-x-0 border-r border-slate-900/60
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  const menuItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.GERENTE],
      key: 'dashboard'
    },
    {
      to: '/my-stores',
      label: 'Mis tiendas',
      icon: Store,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.GERENTE],
      key: 'my-stores'
    },
    {
      to: '/entries-exits',
      label: 'Ingresos y Retiros',
      icon: ArrowUpDown,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR],
      key: 'entries-exits'
    },
    {
      to: '/banca',
      label: 'Banca',
      icon: Landmark,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER],
      key: 'banca'
    },
    {
      to: '/safe-hands',
      label: 'Safe Hands',
      icon: ShieldCheck,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER],
      key: 'safe-hands'
    },
    {
      to: '/admin',
      label: role === UserRole.ADMIN ? 'Administración' : 'Gestión Equipo',
      icon: role === UserRole.ADMIN ? ShieldAlert : Settings,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR],
      key: 'admin'
    }
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className={sidebarClasses}>
      {/* Header Area */}
      <div className="px-6 pt-6 pb-5 flex flex-col items-center justify-center border-b border-slate-900/50 relative">
        <div className="w-full flex items-center justify-center">
          <img src="/logo_horizontal.png" alt="RED Logo" className="h-18 w-auto object-contain" />
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-4 top-6 p-1.5 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {/* Subtitle just below the logo */}
        <p className="text-[7.5px] text-white font-black uppercase tracking-[0.03em] mt-1.5 leading-none text-center w-full">
          Ruta de entrenamiento y desarollo
        </p>
      </div>

      {/* Navigation Links Area */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {allowedItems.map(item => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={`relative w-full flex items-center gap-4 px-4 py-2.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_8px_25px_rgba(230,0,0,0.25)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {/* Red left edge bar for active item */}
              {isActive && (
                <div className="absolute left-0 w-1.5 h-8 bg-[#e60000] rounded-r-full -translate-x-4" />
              )}
              
              {/* Icon box */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                isActive ? 'bg-white/10 text-white' : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
              }`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Label */}
              <span className={`font-black text-xs uppercase tracking-wider transition-colors duration-300 ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-900/50 mt-auto bg-[#0b0f19]">
        {/* Connected Status Card */}
        <div className={`rounded-2xl p-4 flex items-center justify-between border transition-all duration-500 ${
          syncStatus === 'syncing' 
            ? 'bg-slate-900/40 border-amber-500/20' 
            : syncStatus === 'online' 
              ? 'bg-[#121824] border-slate-800/40' 
              : 'bg-red-950/20 border-red-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {syncStatus === 'syncing' && (
              <div className="relative w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            )}
            {syncStatus === 'online' && (
              <div className="relative w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Cloud className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121824] rounded-full flex items-center justify-center">
                  <span className="w-1 h-1 bg-white rounded-full" />
                </span>
              </div>
            )}
            {syncStatus !== 'syncing' && syncStatus !== 'online' && (
              <div className="relative w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                <CloudOff className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-[#121824] rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </span>
              </div>
            )}
            
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none">
                {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'online' ? 'Nube Conectada' : 'Modo Offline'}
              </p>
              <p className="text-[8px] text-slate-500 font-bold mt-1.5 leading-none">
                {syncStatus === 'syncing' ? 'Guardando en la nube' : syncStatus === 'online' ? 'Sincronizado en tiempo real' : 'Guardando localmente'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
