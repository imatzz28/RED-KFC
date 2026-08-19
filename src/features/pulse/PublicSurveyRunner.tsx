import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '@/services/dataService';
import { Survey, ResponseRecord } from '@/types';
import { SurveyPlayer } from './components/SurveyPlayer';
import { Lock, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export const PublicSurveyRunner: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordGranted, setPasswordGranted] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const fetchSurveyAndStores = async () => {
      if (!surveyId) {
        setLoading(false);
        return;
      }

      // Security Protocol: Use isolated single-survey fetch to strictly prevent fetching/exposing responses or other surveys
      const [found] = await Promise.all([
        dataService.fetchSinglePublicSurvey(surveyId),
        dataService.fetchRestaurants().catch(err => {
          console.warn('[PublicSurveyRunner] Fallback al cargar tiendas:', err);
          return [];
        })
      ]);

      setSurvey(found);
      setLoading(false);
    };

    void fetchSurveyAndStores();
  }, [surveyId]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    if ((survey.access_password || '').trim() === passwordInput.trim()) {
      setPasswordGranted(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleSubmitResponse = async (record: ResponseRecord) => {
    await dataService.saveResponse(record);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E4002B] flex items-center justify-center mx-auto animate-bounce">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Cargando formulario de RED Pulse...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Formulario No Encontrado</h2>
          <p className="text-xs font-medium text-slate-500">
            El enlace ingresado no existe o el formulario fue deshabilitado.
          </p>
        </div>
      </div>
    );
  }

  if (survey.status !== 'published') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Formulario No Publicado</h2>
          <p className="text-xs font-medium text-slate-500">
            Este formulario se encuentra actualmente en estado borrador o archivado.
          </p>
        </div>
      </div>
    );
  }

  // Password Protection Check
  if (survey.access_mode === 'password' && !passwordGranted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full border border-slate-100 space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-black text-slate-900">{survey.title}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Este formulario requiere una clave de acceso para continuar.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Ingresa la clave de acceso..."
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#E4002B] rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none transition"
              />
              {passwordError && (
                <p className="text-[10px] font-black text-rose-600 mt-1">Clave de acceso incorrecta.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#E4002B] hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              Ingresar al Formulario
            </button>
          </form>
        </div>
      </div>
    );
  }

  const themeStyle = survey.theme?.theme_style || 'base';
  const bgGradient = themeStyle === 'crimson'
    ? 'bg-gradient-to-b from-[#45000a] via-[#5c010f] to-[#260005]'
    : themeStyle === 'dark'
    ? 'bg-gradient-to-b from-[#090d16] via-[#0d1322] to-[#04060a]'
    : 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100';

  const footerColor = themeStyle === 'crimson'
    ? 'text-red-300/60'
    : themeStyle === 'dark'
    ? 'text-slate-500'
    : 'text-slate-400';

  return (
    <div className={`min-h-screen ${bgGradient} p-4 sm:p-6 md:p-8 flex flex-col justify-center items-center transition-colors duration-300`}>
      <div className="w-full max-w-2xl">
        <SurveyPlayer
          survey={survey}
          onSubmit={handleSubmitResponse}
          onClose={() => navigate('/')}
          isPublic={true}
        />
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center">
        <p className={`text-[10px] font-black uppercase tracking-widest ${footerColor}`}>
          © 2026 RED KFC - A2M LABS
        </p>
      </div>
    </div>
  );
};
