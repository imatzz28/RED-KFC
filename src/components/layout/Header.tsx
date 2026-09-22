
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, UserRole } from '@/types';
import { Calendar, User as UserIcon, Menu, Lock, X, Shield, LogOut } from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/services/dataService';

const Header: React.FC = () => {
  const { 
    auth, 
    selectedMonth, 
    setIsSidebarOpen, 
    handleLogout: onLogout, 
    showAlertDialog 
  } = useAppStore();
  const location = useLocation();
  const user = auth.user;
  const onMenuClick = () => setIsSidebarOpen(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer click fuera de él
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleUpdatePassword = async () => {
    if (!passData.old) {
      showAlertDialog('Debes ingresar tu contraseña actual.');
      return;
    }
    if (!passData.new || passData.new.length < 6) {
      showAlertDialog('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passData.old === passData.new) {
      showAlertDialog('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Verificar contraseña actual re-autenticando antes de cambiarla
      const email = user?.username?.includes('@') ? user.username : `${user?.username}@kfc.co`;
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: email || '',
        password: passData.old
      });
      if (reAuthError) {
        showAlertDialog('La contraseña actual es incorrecta.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: passData.new });
      if (error) throw error;

      showAlertDialog('Contraseña actualizada con éxito.');
      setShowPassModal(false);
      setPassData({ old: '', new: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(err);
      showAlertDialog(`Error al actualizar la contraseña: ${msg}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Removed unused handleIconClick

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'SUPERADMIN';
      case UserRole.COORDINATOR: return 'COORDINADOR';
      case UserRole.LIDER: return 'LÍDER';
      case UserRole.GUEST: return 'INVITADO';
      default: return 'ESPECIALISTA';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-4">
        {/* Mobile Sidebar Open */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition shadow-inner cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>



        {location.pathname === '/my-stores' && (
          <div className="flex flex-col animate-in fade-in duration-300">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Periodo Evaluación</label>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 uppercase tracking-wider shadow-2xs select-none">
              <div className="p-1 bg-red-50 rounded-md shrink-0">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span>{(() => {
                if (!selectedMonth) return '';
                try {
                  const [year, month] = selectedMonth.split('-');
                  const monthNames = [
                    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                  ];
                  return `${monthNames[parseInt(month, 10) - 1]} de ${year}`;
                } catch {
                  return selectedMonth;
                }
              })()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3 md:space-x-5">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-black text-slate-800 leading-none truncate max-w-[150px] uppercase italic">{user?.username}</p>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-slate-100 rounded inline-block">
            {user ? getRoleLabel(user.role) : ''}
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
          <div ref={profileMenuRef} className="absolute right-8 top-16 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            <div className="p-6 sm:p-7 border-b border-slate-100 bg-white text-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shrink-0">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tight italic text-base sm:text-lg text-slate-900">Seguridad</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Actualización de contraseña</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPassModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Contraseña Actual</label>
                <input type="password" value={passData.old} onChange={e => setPassData({ ...passData, old: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-500 transition-all text-slate-900" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Nueva Contraseña</label>
                <input type="password" value={passData.new} onChange={e => setPassData({ ...passData, new: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-red-500 transition-all text-slate-900" />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="flex-1 py-3.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black rounded-xl transition-all uppercase tracking-widest text-xs cursor-pointer shadow-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-all uppercase tracking-widest text-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    'Actualizar Clave'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
