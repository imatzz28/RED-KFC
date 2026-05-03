
import React, { useState } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/services/dataService';
import { LogIn, RefreshCw, GraduationCap } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loginEmail = username.includes('@') ? username : `${username}@kfc.co`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password
      });

      if (authError || !authData.user) {
        console.error("Auth Error:", authError);
        let errorMsg = 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
        if (authError?.message.includes('Invalid login credentials')) {
          errorMsg = 'Usuario o contraseña incorrectos.';
        } else if (authError?.message.includes('Email logins are disabled')) {
          errorMsg = 'Los accesos están temporalmente deshabilitados.';
        } else if (authError?.message.includes('rate limit')) {
          errorMsg = 'Demasiados intentos. Intenta de nuevo más tarde.';
        }
        setError(errorMsg);
        return;
      }

      const baseUsername = username.includes('@') ? username.split('@')[0] : username;
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .ilike('username', baseUsername)
        .single();

      if (profileError || !profileData) {
        console.error("Profile Error:", profileError);
        setError('Tu usuario no tiene un perfil asignado en el sistema.');
        await supabase.auth.signOut();
        return;
      }

      const userData: User = {
        id: profileData.id,
        username: profileData.username,
        role: profileData.role as UserRole,
        assignedRegions: profileData.assignedRegions || [],
        assignedZones: profileData.assignedZones || [],
        assignedRestaurants: profileData.assignedRestaurants || []
      };

      onLogin(userData);
    } catch { // Captura cualquier error, pero no usamos la variable
      setError('Error de conexión con el servidor. Reintente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: '#e60000',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 60px, transparent 60px, transparent 120px)'
      }}
    >
      {/* Background Decor - Removed the red blur as the background is already red, we can add a dark vignette or keep it clean */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-black rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-black rounded-full blur-[120px] opacity-10" />

      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-2xl w-full max-w-md relative z-10 border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <div className="w-40 h-40 flex items-center justify-center mb-0 transition-transform hover:scale-105">
            <img src="/logo_red.png" alt="RED Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center">RED de Entrenamiento y Desempeño</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
            <input
              type="text"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
              placeholder="Ingresa tu ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
            <input
              type="password"
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-red-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in shake duration-300">
              <p className="text-red-600 text-[10px] font-black uppercase text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white font-black py-5 rounded-2xl hover:bg-red-700 transition-all shadow-2xl shadow-red-100 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {loading ? 'Validando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-50 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">© 2026 RED KFC - A2M LABS</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
