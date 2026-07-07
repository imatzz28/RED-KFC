import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '@/services/dataService';
import { SafeHandsCert, SafeHandsPerson, SafeHandsSettings } from '@/types';
import { 
  ShieldCheck, Search, CheckCircle2, XCircle, 
  AlertTriangle, Clock, MapPin, Building2,
  ChevronLeft, Download, UserCheck, X
} from 'lucide-react';
import { safeHandsGenerator } from './utils/safeHandsGenerator';

const PublicValidation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchId, setSearchId] = useState(id || '');
  const [data, setData] = useState<{ cert: SafeHandsCert, employee: SafeHandsPerson } | null>(null);
  const [settings, setSettings] = useState<SafeHandsSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    document.title = "KFC | Safe Hands";
    loadSettings();
    if (id) {
      validateCert(id);
    }
  }, [id]);

  const loadSettings = async () => {
    try {
      const s = await dataService.getSafeHandsSettings();
      setSettings(s);
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  };

  const validateCert = async (code: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await dataService.getPublicCert(code);
      if (result) {
        setData(result);
      } else {
        setError("No se encontró ningún certificado válido con los datos ingresados.");
      }
    } catch (err) {
      setError("Ocurrió un error al consultar el sistema de validación.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      validateCert(searchId.trim());
    }
  };

  const handleDownload = async () => {
    if (!data) return;
    try {
      const activeSettings = settings || { responsibleName: 'ESPECIALISTA CALIDAD' };
      await safeHandsGenerator.downloadCertificate(data.cert, data.employee as any, activeSettings);
    } catch (error) {
      console.error("Error downloading:", error);
      alert("Error al generar el PDF.");
    }
  };

  const getStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today ? 'VENCIDO' : 'VIGENTE';
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center font-sans overflow-x-hidden relative"
      style={{
        backgroundColor: '#e60000',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 60px, transparent 60px, transparent 120px)'
      }}
    >
      {/* Background Decor - Vignette effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-black rounded-full blur-[150px] opacity-20" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-black rounded-full blur-[150px] opacity-10" />
      </div>
      
      {/* Header KFC Style */}
      <div className="w-full max-w-4xl pt-8 sm:pt-16 px-6 flex flex-col items-center">
        <div className="h-20 sm:h-32 mb-4 sm:mb-8 transition-transform hover:scale-105">
           <img src="/KFC-Logo-PNG.png" alt="KFC Logo" className="h-full object-contain drop-shadow-2xl" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white italic uppercase tracking-tighter mb-2 text-center drop-shadow-lg">
          KFC <span className="font-light opacity-50 mx-1">|</span> SAFE HANDS
        </h1>
        <p className="text-[9px] sm:text-[10px] font-bold text-white/70 uppercase tracking-[0.25em] sm:tracking-[0.3em] text-center max-w-xs sm:max-w-md leading-relaxed">
          SISTEMA DE VERIFICACIÓN CARNETS DE MANIPULACIÓN ALIMENTOS
        </p>
      </div>

      {/* Search Bar - Compact */}
      <div className="w-full max-w-lg mt-6 sm:mt-10 px-6 z-10">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-white rounded-full border border-white/20 overflow-hidden p-1 sm:p-1.5 shadow-2xl transition-all duration-300">
            <div className="pl-3.5 pr-1.5 sm:pl-6 sm:pr-2 shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#e60000]" />
            </div>
            <input 
              type="text" 
              placeholder="Cédula o Código Único..." 
              className="flex-1 py-2 sm:py-3.5 text-xs sm:text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 bg-transparent min-w-0"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-[#e60000] hover:bg-red-700 text-white px-5 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0"
            >
              {isLoading ? '...' : 'VALIDAR'}
            </button>
          </div>
        </form>
      </div>

      {/* Result Container - More Horizontal */}
      <div className="w-full max-w-xl mt-6 sm:mt-10 px-6 pb-12 sm:pb-20 relative z-10">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75"></div>
                <div className="w-16 h-16 bg-white text-red-600 rounded-full flex items-center justify-center relative shadow-md">
                  <ShieldCheck className="w-7 h-7 animate-bounce" />
                </div>
              </div>
              <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-4">Cargando...</h4>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-white rounded-[32px] sm:rounded-[40px] p-8 sm:p-10 shadow-2xl border border-red-50 text-center space-y-6 animate-in zoom-in-95 duration-500 max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">NO ENCONTRADO</h3>
              <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {data && !isLoading && (
          <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-xl mx-auto">
            {/* Dynamic Status Header */}
            <div className={`p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden ${getStatus(data.cert.expiryDate) === 'VIGENTE' ? 'bg-emerald-500' : 'bg-red-600'}`}>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 sm:mb-4 shadow-xl relative z-10">
                {getStatus(data.cert.expiryDate) === 'VIGENTE' ? (
                  <CheckCircle2 className="w-7 h-7 sm:w-10 sm:h-10 text-emerald-500" />
                ) : (
                  <XCircle className="w-7 h-7 sm:w-10 sm:h-10 text-red-600" /> 
                )}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white relative z-10 mb-1 leading-none">
                {getStatus(data.cert.expiryDate)}
              </h2>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-white/80 relative z-10">ESTADO DE CERTIFICACIÓN</p>
            </div>

            {/* Content Area - Compact & Horizontal Focus */}
            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              <div className="text-center">
                <p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1.5 sm:mb-2">COLABORADOR</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">{data.employee.name}</h3>
                <p className="text-xs sm:text-sm font-black text-red-600 mt-1 tracking-tight">{data.employee.id}</p>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-50/50 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] border border-slate-100 flex flex-col items-center group hover:border-red-100 transition-all">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">EMISIÓN</p>
                  </div>
                  <p className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{data.cert.issueDate}</p>
                </div>
                <div className="bg-slate-50/50 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] border border-slate-100 flex flex-col items-center group hover:border-red-100 transition-all">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">VENCIMIENTO</p>
                  </div>
                  <p className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{data.cert.expiryDate}</p>
                </div>
              </div>

              {/* Specialist Info */}
              <div className="pt-5 sm:pt-6 border-t border-dashed border-slate-100 flex items-center justify-between px-1 sm:px-2">
                 <div className="flex items-center gap-3 sm:gap-4">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                     <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                   </div>
                   <div>
                     <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 sm:mb-1.5">ESPECIALISTA CAPACITADOR</p>
                     <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase italic tracking-tight">
                       {settings?.responsibleName || 'ESPECIALISTA CALIDAD'}
                     </p>
                   </div>
                 </div>
              </div>

              {/* Download Action */}
              <button 
                onClick={handleDownload}
                className="w-full py-3.5 sm:py-4 bg-slate-900 text-white rounded-[16px] sm:rounded-[20px] text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 sm:gap-3 group"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:animate-bounce" />
                DESCARGAR CARNET OFICIAL
              </button>
            </div>

            {/* Bottom Code Discreto */}
            <div className="bg-slate-50 px-6 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 text-center">
              <div className="inline-flex items-center gap-1.5 sm:gap-2">
                <p className="text-[7px] sm:text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">CÓDIGO ÚNICO:</p>
                <span className="text-[9px] sm:text-[10px] font-black text-red-600 font-mono tracking-tighter">{data.cert.certificateCode}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer KFC Branding */}
      <div className="mt-auto py-6 sm:py-10 text-center opacity-75 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPrivacyModal(true)}
          className="text-[9px] font-black text-white/50 hover:text-white uppercase tracking-widest underline transition-colors cursor-pointer"
        >
          Política de Tratamiento de Datos
        </button>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">© 2026 RED KFC - A2M LABS</p>
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

export default PublicValidation;
