import React, { useMemo, useState } from 'react';
import { Calendar, Lock, Unlock } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { HierarchyData } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  hierarchy: HierarchyData;
  setHierarchy: (h: HierarchyData) => void;
  setImportStatus: (status: { message: string, isError: boolean } | null) => void;
}

export const SettlementManager: React.FC<Props> = ({ hierarchy, setHierarchy, setImportStatus }) => {
  const [isSaving, setIsSaving] = useState(false);

  const monthsToManage = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dates.push(d.toISOString().slice(0, 7));
    }
    return dates;
  }, []);

  const { showConfirmDialog, showAlertDialog } = useAppStore();

  const toggleMonthLock = (month: string) => {
    const isLocked = hierarchy.lockedMonths.includes(month);
    
    // Formatear mes para el mensaje
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const formattedMonth = `${monthNames[parseInt(monthNum, 10) - 1]} de ${year}`;

    const confirmMsg = isLocked
      ? `¿Estás seguro de que deseas REABRIR el periodo de ${formattedMonth}?\n\nEsto permitirá que todos los coordinadores puedan editar las notas de este mes nuevamente.`
      : `¿Estás seguro de que deseas ASENTAR (CERRAR) las notas para el periodo de ${formattedMonth}?\n\nUna vez asentado, se bloqueará la edición para todos los usuarios y se recalcularán los promedios en el Dashboard.`;

    showConfirmDialog(confirmMsg, async () => {
      let newLockedMonths;
      if (isLocked) {
        newLockedMonths = hierarchy.lockedMonths.filter(m => m !== month);
      } else {
        newLockedMonths = [...hierarchy.lockedMonths, month];
      }

      const newHierarchy = { ...hierarchy, lockedMonths: newLockedMonths };
      setIsSaving(true);
      try {
        await dataService.saveHierarchy(newHierarchy);
        
        // Si estamos cerrando el mes, disparamos el cálculo de estadísticas agregadas
        if (!isLocked) {
          await dataService.settleMonthlyGroupStats(month);
        }

        setHierarchy(newHierarchy);
        setImportStatus({
          message: isLocked ? `Periodo ${month} abierto para edición.` : `Periodo ${month} cerrado (Asentado).`,
          isError: false
        });

        // Recalcular periodo activo dinámicamente y actualizar la app
        if (newLockedMonths.length > 0) {
          const sortedLocked = [...newLockedMonths].sort((a, b) => b.localeCompare(a));
          const lastSettledPrefix = sortedLocked[0].substring(0, 7);
          
          const nextEvalMonth = new Date(`${lastSettledPrefix}-01T12:00:00Z`);
          nextEvalMonth.setMonth(nextEvalMonth.getMonth() + 1);
          const evalMonthPrefix = nextEvalMonth.toISOString().slice(0, 7);
          
          useAppStore.getState().setSelectedMonth(evalMonthPrefix);
        } else {
          const fallback = new Date().toISOString().slice(0, 7);
          useAppStore.getState().setSelectedMonth(fallback);
        }
      } catch {
        showAlertDialog("Error al actualizar el estado del periodo.");
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-red-600 text-white rounded-[24px] shadow-xl"><Calendar className="w-8 h-8" /></div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Asentar Calificaciones</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">* Una vez asentado un mes, no se podrán realizar más cambios en las notas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthsToManage.map(m => {
            const isLocked = hierarchy.lockedMonths.includes(m);
            return (
              <div key={m} className={`p-6 rounded-[32px] border-2 flex items-center justify-between transition-all ${isLocked ? 'bg-white border-red-500 shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isLocked ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <span className="text-lg font-black uppercase italic tracking-tighter text-slate-800">{m}</span>
                </div>
                <button
                  onClick={() => toggleMonthLock(m)}
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all ${isLocked ? 'bg-red-600 text-white shadow-lg hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-black shadow-md'}`}
                >
                  {isLocked ? 'Abrir Periodo' : 'Asentar Notas'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
