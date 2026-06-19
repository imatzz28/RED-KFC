import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '@/services/dataService';
import { SafeHandsCert, SafeHandsPerson, SafeHandsSettings } from '@/types';
import { 
  ShieldCheck, Search, CheckCircle2, XCircle, 
  AlertTriangle, Clock, MapPin, Building2,
  ChevronLeft, Download, UserCheck
} from 'lucide-react';
import { safeHandsGenerator } from './utils/safeHandsGenerator';

const PublicValidation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchId, setSearchId] = useState(id || '');
  const [data, setData] = useState<{ cert: SafeHandsCert, employee: SafeHandsPerson } | null>(null);
  const [settings, setSettings] = useState<SafeHandsSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!data || !settings) return;
    try {
      await safeHandsGenerator.downloadCertificate(data.cert, data.employee as any, settings);
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
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-black rounded-full blur-[150px] opacity-20 -z-10" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-black rounded-full blur-[150px] opacity-10 -z-10" />
      
      {/* Header KFC Style */}
      <div className="w-full max-w-4xl pt-16 px-6 flex flex-col items-center">
        <div className="h-32 mb-8 transition-transform hover:scale-105">
           <img src="/KFC-Logo-PNG.png" alt="KFC Logo" className="h-full object-contain drop-shadow-2xl" />
        </div>
        <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2 text-center drop-shadow-lg">
          KFC <span className="font-light opacity-50 mx-1">|</span> SAFE HANDS
        </h1>
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.3em] text-center max-w-xs leading-relaxed">
          SISTEMA DE VERIFICACION CARNETS DE MANIPUALCION ALIMENTOS
        </p>
      </div>

      {/* Search Bar - Compact */}
      <div className="w-full max-w-lg mt-10 px-6 z-10">
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-white rounded-full border border-white/20 overflow-hidden p-1 shadow-2xl transition-all duration-300">
            <div className="pl-6 pr-2">
              <Search className="w-5 h-5 text-[#e60000]" />
            </div>
            <input 
              type="text" 
              placeholder="Ingrese Cédula o Código Único..." 
              className="flex-1 py-4 text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 bg-transparent"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-[#e60000] hover:bg-red-700 text-white px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {isLoading ? '...' : 'VALIDAR'}
            </button>
          </div>
        </form>
      </div>

      {/* Result Container - More Horizontal */}
      <div className="w-full max-w-2xl mt-10 px-6 pb-20 relative z-10">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">VERIFICANDO...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-white rounded-[40px] p-10 shadow-2xl border border-red-50 text-center space-y-6 animate-in zoom-in-95 duration-500 max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">NO ENCONTRADO</h3>
              <p className="text-xs text-slate-400 mt-3 font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {data && !isLoading && (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-xl mx-auto">
            {/* Dynamic Status Header */}
            <div className={`p-8 flex flex-col items-center text-center relative overflow-hidden ${getStatus(data.cert.expiryDate) === 'VIGENTE' ? 'bg-emerald-500' : 'bg-red-600'}`}>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-xl relative z-10">
                {getStatus(data.cert.expiryDate) === 'VIGENTE' ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-600" /> 
                )}
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white relative z-10 mb-1 leading-none">
                {getStatus(data.cert.expiryDate)}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80 relative z-10">ESTADO DE CERTIFICACIÓN</p>
            </div>

            {/* Content Area - Compact & Horizontal Focus */}
            <div className="p-8 space-y-8">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">COLABORADOR</p>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">{data.employee.name}</h3>
                <p className="text-sm font-black text-red-600 mt-1 tracking-tight">{data.employee.id}</p>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-4 rounded-[24px] border border-slate-100 flex flex-col items-center group hover:border-red-100 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">EMISIÓN</p>
                  </div>
                  <p className="text-base font-black text-slate-800 tracking-tight">{data.cert.issueDate}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-[24px] border border-slate-100 flex flex-col items-center group hover:border-red-100 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VENCIMIENTO</p>
                  </div>
                  <p className="text-base font-black text-slate-800 tracking-tight">{data.cert.expiryDate}</p>
                </div>
              </div>

              {/* Specialist Info */}
              <div className="pt-6 border-t border-dashed border-slate-100 flex items-center justify-between px-2">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                     <UserCheck className="w-5 h-5 text-slate-400" />
                   </div>
                   <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">ESPECIALISTA CAPACITADOR</p>
                     <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">
                       {settings?.responsibleName || 'ESPECIALISTA CALIDAD'}
                     </p>
                   </div>
                 </div>
              </div>

              {/* Download Action */}
              <button 
                onClick={handleDownload}
                className="w-full py-4 bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                <Download className="w-4 h-4 group-hover:animate-bounce" />
                DESCARGAR CARNET OFICIAL
              </button>
            </div>

            {/* Bottom Code Discreto */}
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
              <div className="inline-flex items-center gap-2">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">CÓDIGO ÚNICO:</p>
                <span className="text-[10px] font-black text-red-600 font-mono tracking-tighter">{data.cert.certificateCode}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer KFC Branding */}
      <div className="mt-auto py-10 text-center opacity-70">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">© 2026 RED KFC - A2M LABS</p>
      </div>
    </div>
  );
};

export default PublicValidation;
