import React from 'react';
import { UserRole } from '@/types';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  LogOut, 
  X, 
  Store, 
  ArrowUpDown, 
  Settings, 
  ShieldCheck, 
  Landmark, 
  Cloud, 
  ChevronRight 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';

const Sidebar: React.FC = () => {
  const { auth, handleLogout: onLogout, isSidebarOpen: isOpen, setIsSidebarOpen: setIsOpen } = useAppStore();
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
      <div className="px-6 pt-6 pb-6 flex items-center justify-between border-b border-slate-900/50">
        <div className="flex items-center gap-3">
          {/* Logo container */}
          <div className="w-11 h-11 bg-[#e60000] rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative select-none">
            <svg className="w-7 h-7 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4C6 2.89543 6.89543 2 8 2H20L26 8V28C26 29.1046 25.1046 30 24 30H8C6.89543 30 6 29.1046 6 28V4Z" fill="white" />
              <text x="9" y="10" fill="#e60000" fontSize="5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-0.05em">KFC</text>
              <rect x="9" y="19" width="3" height="7" rx="0.5" fill="#e60000" />
              <rect x="13.5" y="15" width="3" height="11" rx="0.5" fill="#e60000" />
              <rect x="18" y="12" width="3" height="14" rx="0.5" fill="#e60000" />
              <path d="M9 22L14 16L19 13.5L23.5 9" stroke="#e60000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 9H23.5V11.5" stroke="#e60000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-white tracking-wider leading-none">R.E.D</h1>
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-1">Restaurant · Efficiency · Data</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 hover:bg-slate-800 rounded-xl transition"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
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
        <div className="bg-[#121824] rounded-2xl p-4 flex items-center justify-between border border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Cloud className="w-5 h-5" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121824] rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none">Nube Conectada</p>
              <p className="text-[8px] text-slate-500 font-bold mt-1 leading-none">Sincronizado en tiempo real</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all duration-300 mt-4 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800/20 text-slate-500 group-hover:bg-red-500/10 group-hover:text-red-500 flex items-center justify-center transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-black text-[10px] uppercase tracking-wider">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
