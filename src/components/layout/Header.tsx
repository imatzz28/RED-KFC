
import React, { useState, useRef } from 'react';
import { User, UserRole } from '@/types';
import { Calendar, User as UserIcon, Menu, Lock, X, Shield, LogOut } from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';

const Header: React.FC = () => {
  const { auth, selectedMonth, setSelectedMonth: onMonthChange, setIsSidebarOpen, handleLogout: onLogout } = useAppStore();
  const user = auth.user!;
  const onMenuClick = () => setIsSidebarOpen(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '' });
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch {
        // Fallback for browsers that don't support showPicker
        dateInputRef.current.click();
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'SUPERADMIN';
      case UserRole.COORDINATOR: return 'COORDINADOR';
      default: return 'ESPECIALISTA';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-5">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition shadow-inner"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 italic">Periodo Evaluación</label>
          <div className="relative group flex items-center">
            <div className="absolute left-3.5 z-10 pointer-events-none p-1.5 bg-red-50 rounded-lg">
              <Calendar className="w-4 h-4 text-red-600" />
            </div>
            <input
              ref={dateInputRef}
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              onClick={handleIconClick}
              className="pl-14 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all cursor-pointer shadow-sm w-44 md:w-52 relative"
              style={{ colorScheme: 'light' }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-5">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-800 leading-none truncate max-w-[150px] uppercase italic">{user.username}</p>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-slate-100 rounded inline-block">
            {getRoleLabel(user.role)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 md:w-11 md:h-11 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-100 shadow-sm ring-4 ring-slate-50 transition-all hover:border-red-300"
          >
            <UserIcon className="w-6 h-6 text-red-600" />
          </button>

          <button
            onClick={onLogout}
            className="w-10 h-10 md:w-11 md:h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border-2 border-red-100 shadow-sm transition-all hover:bg-red-600 hover:text-white group"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {showProfileMenu && (
          <div className="absolute right-8 top-16 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => { setShowPassModal(true); setShowProfileMenu(false); }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition"
            >
              <Lock className="w-4 h-4" />
              <span>Cambiar Contraseña</span>
            </button>
            <div className="h-px bg-slate-100 my-1" />
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>

      {showPassModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border-2 border-slate-100">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tighter flex items-center italic text-lg"><Shield className="w-5 h-5 mr-3 text-red-500" /> Seguridad</h3>
              <button onClick={() => setShowPassModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1">Contraseña Actual</label>
                <input type="password" value={passData.old} onChange={e => setPassData({ ...passData, old: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-500 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1">Nueva Contraseña</label>
                <input type="password" value={passData.new} onChange={e => setPassData({ ...passData, new: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-500 transition-all" />
              </div>
              <button className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl transition-all uppercase tracking-[0.2em] text-[10px] mt-4">Actualizar Clave</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
