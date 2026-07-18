
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, GradeEntry } from '@/types';
import { EVALUATION_GROUPS } from '@/utils/constants';
import { dataService } from '@/services/dataService';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
// Added MapPin to the imports from lucide-react
import { X, Save, User, Calendar, GraduationCap, Star, Trophy, ClipboardCheck, Vault, Lock, RefreshCw, BookOpen, ArrowUp, ArrowDown, Repeat, History, Clock, MapPin, Activity } from 'lucide-react';

interface GradeEditorProps {
  employee: Employee;
  month: string;
  onClose: () => void;
}

const GroupIcons: Record<string, React.ReactNode> = {
  'AK': <BookOpen className="w-5 h-5" />,
  'A': <GraduationCap className="w-5 h-5" />,
  'B': <Star className="w-5 h-5" />,
  'C': <Trophy className="w-5 h-5" />,
  'D': <ClipboardCheck className="w-5 h-5" />,
  'E': <Vault className="w-5 h-5" />,
  'F': <Activity className="w-5 h-5" />,
};

const GradeEditor: React.FC<GradeEditorProps> = ({ employee, month, onClose }) => {
  const queryClient = useQueryClient();
  const showAlertDialog = useAppStore(state => state.showAlertDialog);
  const [activeGroup, setActiveGroup] = useState<string>('AK');
  const [formGrades, setFormGrades] = useState<GradeEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hierarchy = useMemo(() => dataService.getHierarchy(), []);

  const isPeriodLocked = useMemo(() => {
    return hierarchy.lockedMonths.includes(month);
  }, [hierarchy, month]);

  const seniorityMonths = useMemo(() => {
    if (!employee.join_date) return 0;
    const start = new Date(employee.join_date);
    const end = new Date(month + "-01");
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, diff);
  }, [employee, month]);

  useEffect(() => {
    const empId = String(employee.id).trim();
    const effective = dataService.getEffectiveGrades(empId, month);
    setFormGrades(effective.map(g => ({ ...g })));
  }, [employee, month]);

  const handleScoreChange = (group: string, category: string, scoreStr: string) => {
    if (isPeriodLocked) return;
    const score = scoreStr === '' ? 0 : Math.max(0, Math.min(100, parseInt(scoreStr) || 0));
    setFormGrades(prev => {
      const idx = prev.findIndex(g => g.group === group && g.category === category);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], score, month };
        return next;
      }
      return [...prev, { employeeId: employee.id, month, group, category, score, restaurantId: employee.restaurant_id }];
    });
  };

  const saveGrades = async () => {
    if (isPeriodLocked) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await dataService.saveEmployeeGrades(employee.id, month, formGrades);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Removed onClose() to keep editor open as requested
    } catch (err: unknown) {
      showAlertDialog(`Error al guardar notas: ${err instanceof Error ? err.message : 'Ocurrió un error desconocido.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (groupId: string, defaultName: string, index: number) => {
    const cfg = hierarchy.groupDConfig?.[month];
    if (groupId === 'D') return cfg?.cat1 || "Guías Plan de Capacitación";
    if (groupId === 'F') return cfg?.cat2 || "Guías de SST";
    return defaultName;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white h-full w-full md:h-[92vh] md:max-w-6xl md:rounded-[48px] flex flex-col overflow-hidden relative shadow-2xl">

        <div className="p-5 md:p-8 bg-slate-900 text-white shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-lg border-4 border-white/10 relative">
              <User className="w-6 h-6 md:w-9 md:h-9 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg md:text-2xl font-black uppercase italic truncate max-w-[150px] md:max-w-none">{employee.name}</h2>
                <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group shrink-0">
                  <History className="w-3 h-3 group-hover:rotate-[-45deg] transition-transform" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Historial</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-slate-400"><Calendar className="w-3.5 h-3.5 text-red-500" /> {month}</span>
                <span className="flex items-center gap-1.5 text-slate-400"><MapPin className="w-3.5 h-3.5 text-red-500" /> {employee.restaurant_id}</span>
                <span className="flex items-center gap-1.5 bg-white text-slate-900 px-3 py-1 rounded-full shadow-lg border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  Antigüedad: {seniorityMonths} Meses
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-600 rounded-xl transition-all shadow-md"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 flex md:flex-col overflow-x-auto md:overflow-y-auto p-4 gap-3 no-scrollbar shrink-0 sticky top-0 z-10">
            {Object.entries(EVALUATION_GROUPS).map(([id, group]) => {
              const isActive = activeGroup === id;
              const groupGrades = formGrades.filter(g => g.group === id);
              const groupAvg = groupGrades.length > 0 ? Math.round(groupGrades.reduce((s, g) => s + g.score, 0) / group.categories.length) : 0;

              return (
                <button
                  key={id}
                  onClick={() => setActiveGroup(id)}
                  className={`p-3 md:p-5 rounded-2xl md:rounded-3xl text-left border-2 transition-all flex items-center gap-3 shrink-0 md:shrink ${isActive ? 'bg-white border-red-600 shadow-lg' : 'bg-transparent border-transparent opacity-50'}`}
                >
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{GroupIcons[id]}</div>
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{group.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${groupAvg >= 90 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${groupAvg}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-slate-400">{groupAvg}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-white no-scrollbar">
            <div className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black uppercase italic tracking-tight">{EVALUATION_GROUPS[activeGroup as keyof typeof EVALUATION_GROUPS].name}</h3>
                  {isPeriodLocked && <div className="flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase"><Lock className="w-3 h-3" /> Lectura</div>}
                </div>

                <div className="space-y-4">
                  {EVALUATION_GROUPS[activeGroup as keyof typeof EVALUATION_GROUPS].categories.map((cat: string, index: number) => {
                    const dynamicCatName = getCategoryName(activeGroup, cat, index);
                    const grade = formGrades.find(g => g.group === activeGroup && g.category === cat);
                    const score = grade?.score ?? 0;
                    const isInherited = grade && grade.month !== month;

                    return (
                      <div key={cat} className="bg-slate-50/50 border-2 border-transparent rounded-[24px] p-5 flex items-center justify-between gap-6 transition-all hover:bg-white hover:border-slate-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <label className="text-[10px] font-black text-slate-900 uppercase block">{dynamicCatName}</label>
                            {isInherited && <span className="text-[8px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-black">Heredado</span>}
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${score >= 90 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            disabled={isPeriodLocked}
                            value={score === 0 ? '' : score}
                            onChange={e => handleScoreChange(activeGroup, cat, e.target.value)}
                            className={`w-16 md:w-20 px-2 py-3 bg-white border-2 rounded-xl text-lg font-black text-center shadow-md outline-none ${isPeriodLocked ? 'text-slate-300' : score >= 90 ? 'border-emerald-100 text-emerald-700' : 'border-slate-200 text-slate-800 focus:border-red-500'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex-1">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Cambios guardados correctamente</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-8 py-4 bg-white text-slate-400 font-black rounded-2xl border-2 border-slate-200 text-[10px] uppercase transition-all">Regresar</button>
            {!isPeriodLocked && (
              <button onClick={saveGrades} disabled={isSaving} className={`flex-1 sm:flex-none px-10 py-4 text-white text-[10px] font-black rounded-2xl shadow-xl transition-all uppercase flex items-center justify-center gap-2 ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSuccess ? <ClipboardCheck className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Sincronizando...' : saveSuccess ? '¡Completado!' : 'Guardar y Certificar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Historial de Movimientos */}
      {showHistory && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border-2 border-white/20">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-red-500" />
                <h3 className="font-black uppercase italic tracking-tighter text-lg">Historial de Movimientos</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="space-y-6">
                {employee.history?.map((h, i) => (
                  <div key={i} className="flex gap-4 items-start relative pb-6 last:pb-0">
                    {i < (employee.history?.length || 0) - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-100" />}
                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${h.action === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : h.action === 'RETIRO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {h.action === 'INGRESO' ? <ArrowUp className="w-4 h-4" /> : h.action === 'RETIRO' ? <ArrowDown className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 bg-slate-50 p-4 rounded-3xl flex-1 border border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest">{h.action}</p>
                      <p className="text-[11px] font-black text-slate-500 uppercase italic mt-1">{h.restaurantName}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {h.date}</p>
                    </div>
                  </div>
                ))}
                {(!employee.history || employee.history.length === 0) && (
                  <div className="text-center py-10">
                    <p className="text-[10px] text-slate-300 uppercase font-black italic tracking-widest">Sin historial registrado en el sistema</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 text-center">
              <button onClick={() => setShowHistory(false)} className="px-8 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Cerrar Historial</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeEditor;
