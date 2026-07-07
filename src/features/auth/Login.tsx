
import React, { useState } from 'react';
import { User, UserRole } from '@/types';
import { supabase } from '@/services/dataService';
import { LogIn, RefreshCw, GraduationCap, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const navigate = useNavigate();

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
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center">Ruta de Entrenamiento y Desempeño</p>
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

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">O</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/verify')}
            className="w-full bg-white border-2 border-slate-200 text-slate-500 font-black py-4 rounded-2xl hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Validar Certificados
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors cursor-pointer"
          >
            Política de Tratamiento de Datos
          </button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 RED KFC - A2M LABS</p>
        </div>
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black uppercase tracking-tighter flex items-center italic text-base">
                <ShieldCheck className="w-5 h-5 mr-3 text-red-500" />
                Tratamiento de Datos Personales
              </h3>
              <button onClick={() => setShowPrivacyModal(false)} className="hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 text-slate-600 text-xs font-medium leading-relaxed text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">POLÍTICA DE PRIVACIDAD Y HABEAS DATA - LEY 1581 DE 2012</p>
              
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">1. Introducción y Normativa</h4>
                <p>
                  De conformidad con lo dispuesto en la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia, la plataforma **RED KFC (Ruta de Entrenamiento y Desempeño)** adopta la presente Política de Tratamiento de Datos Personales para garantizar el derecho constitucional de Habeas Data de los colaboradores y usuarios del sistema.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">2. Finalidad de los Datos Recolectados</h4>
                <p>
                  Los datos personales suministrados (incluyendo nombre, identificación, cargo, histórico de evaluaciones de curvas de desempeño y certificaciones operativas como "Safe Hands") serán tratados exclusivamente para las siguientes finalidades:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Registrar y administrar los accesos a la plataforma de entrenamiento.</li>
                  <li>Realizar el seguimiento, calificación y control de las evaluaciones de competencias del personal.</li>
                  <li>Emitir y validar públicamente certificados de manipulación e inocuidad alimentaria ("Safe Hands").</li>
                  <li>Generar reportes consolidados de cumplimiento e historial de entrenamiento para gerencia y auditorías de calidad.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">3. Derechos del Titular de los Datos</h4>
                <p>
                  Como titular de los datos personales, el colaborador tiene derecho a:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Conocer, actualizar y rectificar sus datos personales frente a los administradores del sistema.</li>
                  <li>Solicitar prueba de la autorización del tratamiento de datos.</li>
                  <li>Ser informado respecto del uso que se le ha dado a sus datos.</li>
                  <li>Revocar la autorización o solicitar la supresión de sus datos de la base de datos cuando no exista un deber legal o contractual de permanecer en ella.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">4. Autorización de Uso</h4>
                <p>
                  Al acceder y registrarse en la plataforma, el titular autoriza expresamente el tratamiento de sus datos personales bajo los estrictos términos aquí descritos, garantizando que el uso de los mismos responde exclusivamente al desarrollo del plan de capacitación y entrenamiento operativo de la compañía.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px]"
              >
                Entendido y Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
