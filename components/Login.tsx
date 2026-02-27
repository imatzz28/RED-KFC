
import React, { useState } from 'react';
import { User } from '../types';
import { dataService } from '../dataService';
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
      // Intentar sincronizar usuarios antes de loguear por si hay nuevos
      await dataService.loadAllFromCloud();
      const users = dataService.getUsers();
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

      if (user) {
        onLogin(user);
      } else {
        setError('Credenciales incorrectas. Verifica tu usuario y clave.');
      }
    } catch { // Captura cualquier error, pero no usamos la variable
      setError('Error de conexión con el servidor. Reintente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-red-600 rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-red-600 rounded-full blur-[120px] opacity-10" />

      <div className="bg-white p-8 md:p-12 rounded-[48px] shadow-2xl w-full max-w-md relative z-10 border border-white/20">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mb-6 shadow-xl shadow-red-50 transition-transform hover:rotate-6">
            <GraduationCap className="text-red-600 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Curvas EX</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">KFC Management System</p>
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
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">© 2024 Curvas EX KFC - Cloud Core v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
