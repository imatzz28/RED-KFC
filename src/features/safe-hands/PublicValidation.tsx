import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataService } from '@/services/dataService';
import { SafeHandsCert, Employee } from '@/types';
import { 
  ShieldCheck, Search, CheckCircle2, XCircle, 
  AlertTriangle, Clock, MapPin, Building2,
  ChevronLeft
} from 'lucide-react';

const PublicValidation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchId, setSearchId] = useState(id || '');
  const [data, setData] = useState<{ cert: SafeHandsCert, employee: Employee } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      validateCert(id);
    }
  }, [id]);

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

  const getStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    if (expiry < today) return 'VENCIDO';
    return 'VIGENTE';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="w-full max-w-2xl text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-red-600 rounded-3xl shadow-xl shadow-red-200 mb-6">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">SAFE HANDS</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Sistema Público de Validación KFC</p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-lg mb-12">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-red-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative flex items-center bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden p-1.5">
            <div className="pl-4 pr-2">
              <Search className="w-5 h-5 text-slate-300" />
            </div>
            <input 
              type="text" 
              placeholder="Ingrese Cédula o Código de Certificado..." 
              className="flex-1 py-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-300 placeholder:font-medium"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isLoading ? 'Consultando...' : 'Validar'}
            </button>
          </div>
        </form>
      </div>

      {/* Result Area */}
      <div className="w-full max-w-xl">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Verificando en base de datos...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-white rounded-[32px] p-10 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Validación Fallida</h3>
              <p className="text-sm text-slate-400 mt-2 font-medium">{error}</p>
            </div>
            <button 
              onClick={() => { setSearchId(''); setError(null); }}
              className="inline-flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 px-6 py-3 rounded-xl transition-all"
            >
              Nueva Búsqueda
            </button>
          </div>
        )}

        {data && !isLoading && (
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Top Status Banner */}
            <div className={`p-8 flex flex-col items-center text-center ${getStatus(data.cert.expiryDate) === 'VIGENTE' ? 'bg-emerald-500' : 'bg-red-600'} text-white`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
                {getStatus(data.cert.expiryDate) === 'VIGENTE' ? (
                  <CheckCircle2 className="w-10 h-10 text-white" />
                ) : (
                  <XCircle className="w-10 h-10 text-white" />
                )}
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">
                {getStatus(data.cert.expiryDate)}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Estado de Certificación</p>
            </div>

            {/* Info Section */}
            <div className="p-10 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Colaborador</p>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">{data.employee.name}</h3>
                <p className="text-sm font-mono text-slate-400 mt-1">{data.employee.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Emisión</p>
                  <p className="text-sm font-black text-slate-700">{data.cert.issueDate}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</p>
                  <p className="text-sm font-black text-slate-900">{data.cert.expiryDate}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Tienda</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase italic">{data.employee.restaurant_id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Zona</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 uppercase italic">{data.employee.zone || 'Sin Clasificar'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-10 py-6 border-t border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Código Único</p>
              <p className="text-[10px] font-mono text-slate-400">{data.cert.certificateCode}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-20 text-center pb-8 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">© 2026 KFC Colombia - RED KFC</p>
      </div>
    </div>
  );
};

export default PublicValidation;
