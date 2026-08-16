import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';

const SSOPage: React.FC = () => {
  const navigate = useNavigate();
  const handleLogin = useAppStore(state => state.handleLogin);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;

    const checkSso = async () => {
      try {
        const ssoUser = await dataService.checkSsoSession();
        if (ssoUser) {
          handled = true;
          await handleLogin(ssoUser);
          navigate('/dashboard', { replace: true });
        } else {
          // Si tras 2.5s no hay sesión activa, redirigir a Login
          setTimeout(() => {
            if (!handled) {
              handled = true;
              navigate('/login', { replace: true });
            }
          }, 2500);
        }
      } catch (err) {
        console.error('[SSOPage] Error validando SSO:', err);
        setError('No se pudo validar la sesión de SSO.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    void checkSso();
  }, [handleLogin, navigate]);

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center space-y-4 font-sans text-white p-4">
      <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-2xl animate-pulse shadow-[0_0_30px_rgba(227,24,55,0.5)]">
        KFC
      </div>
      <p className="text-sm font-bold text-slate-300 animate-pulse tracking-wide">
        Iniciando sesión en GES mediante RED...
      </p>
      {error && (
        <p className="text-xs text-red-400 font-semibold bg-red-950/50 px-4 py-2 rounded-xl border border-red-800">
          {error}
        </p>
      )}
    </div>
  );
};

export default SSOPage;
