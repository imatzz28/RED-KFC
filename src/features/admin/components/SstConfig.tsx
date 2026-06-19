import React, { useState } from 'react';
import { Activity, RefreshCw, Save } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { HierarchyData } from '@/types';

interface Props {
  hierarchy: HierarchyData;
  setHierarchy: (h: HierarchyData) => void;
  setImportStatus: (status: { message: string, isError: boolean } | null) => void;
}

export const SstConfig: React.FC<Props> = ({ hierarchy, setHierarchy, setImportStatus }) => {
  const [sstMonth, setSstMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [sstCat1, setSstCat1] = useState(hierarchy.groupDConfig?.[new Date().toISOString().slice(0, 7)]?.cat1 || '');
  const [sstCat2, setSstCat2] = useState(hierarchy.groupDConfig?.[new Date().toISOString().slice(0, 7)]?.cat2 || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleMonthChangeSst = (m: string) => {
    setSstMonth(m);
    const cfg = hierarchy.groupDConfig?.[m];
    setSstCat1(cfg?.cat1 || '');
    setSstCat2(cfg?.cat2 || '');
  };

  const handleSaveSstConfig = async () => {
    setIsSaving(true);
    try {
      const newHierarchy = { ...hierarchy };
      if (!newHierarchy.groupDConfig) newHierarchy.groupDConfig = {};
      newHierarchy.groupDConfig[sstMonth] = { cat1: sstCat1, cat2: sstCat2 };

      await dataService.saveHierarchy(newHierarchy);
      setHierarchy(newHierarchy);
      setImportStatus({ message: `Temas de Guías para ${sstMonth} actualizados correctamente.`, isError: false });
    } catch {
      alert("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-red-600 text-white rounded-[24px] shadow-xl"><Activity className="w-8 h-8" /></div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Configuración de Guías Mensual</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Asigna los temas de capacitación y SST para cada mes del año.</p>
          </div>
        </div>

        <div className="max-w-xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo a Configurar</label>
            <div className="datepicker-container relative">
              <input
                type="month"
                value={sstMonth}
                onChange={e => handleMonthChangeSst(e.target.value)}
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guías Plan de Capacitación</label>
              <input
                type="text"
                value={sstCat1}
                onChange={e => setSstCat1(e.target.value)}
                placeholder="Guías Plan de Capacitación"
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guías de SST</label>
              <input
                type="text"
                value={sstCat2}
                onChange={e => setSstCat2(e.target.value)}
                placeholder="Guías de SST"
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSstConfig}
            disabled={isSaving}
            className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Guardando...' : `Guardar Temas para ${sstMonth}`}
          </button>
        </div>
      </div>
    </div>
  );
};
