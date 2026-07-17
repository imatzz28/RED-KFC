import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { UserRole, DailySchedule, User, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Trash2, 
  Save, 
  X, 
  Check,
  Award,
  AlertCircle
} from 'lucide-react';
import localforage from 'localforage';

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Schedules: React.FC = () => {
  const { auth, restaurants, hierarchy } = useAppStore();
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Modal editing state
  const [selectedCell, setSelectedCell] = useState<{
    specialist: User;
    date: string;
    dayName: string;
    schedule?: DailySchedule;
  } | null>(null);

  const [modalShiftType, setModalShiftType] = useState<'Laboral' | 'Capacitación' | 'Descanso' | 'Incapacidad'>('Laboral');
  const [modalCheckIn, setModalCheckIn] = useState('08:00');
  const [modalCheckOut, setModalCheckOut] = useState('17:00');
  const [modalRestaurantId, setModalRestaurantId] = useState('');
  const [isSavingShift, setIsSavingShift] = useState(false);

  // Compute the 7 dates of the week
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + i);
      days.push({
        name: dayNames[i],
        dateStr: formatDateString(d),
        dateObj: d
      });
    }
    return days;
  }, [currentWeekMonday]);

  // Load schedules for the current week range
  const loadWeekSchedules = async () => {
    setIsLoading(true);
    try {
      const startStr = weekDays[0].dateStr;
      const endStr = weekDays[6].dateStr;
      const data = await dataService.getSchedulesForDateRange(startStr, endStr);
      setSchedules(data);
    } catch (err) {
      console.error('[Schedules] Error al cargar horarios:', err);
      showToast('Error al cargar horarios de la base de datos.', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeekSchedules();
  }, [currentWeekMonday, weekDays]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, isError: boolean = false) => {
    setToast({ message, isError });
  };

  // Get visible specialists using same visibility rules
  const visibleSpecialists = useMemo(() => {
    const allUsers = dataService.getUsers();
    const specialists = allUsers.filter(u => u.role === UserRole.SPECIALIST);
    
    // Filter by search term
    const term = searchTerm.trim().toLowerCase();
    const searched = term 
      ? specialists.filter(u => u.username.toLowerCase().includes(term))
      : specialists;

    if (auth.user?.role === UserRole.ADMIN) return searched;

    const currentUser = auth.user!;
    return searched.filter(u => {
      // Check shared region
      const hasSharedRegion = (u.assignedRegions || []).some(reg => currentUser.assignedRegions?.includes(reg));
      if (hasSharedRegion) return true;

      // Check zone or restaurant match
      const myRegions = hierarchy.regions.filter(r => currentUser.assignedRegions?.includes(r.name));
      const myZones = myRegions.flatMap(r => r.zones.map(z => z.name));
      
      const zoneMatch = (u.assignedZones || []).some(z => myZones.includes(z));
      if (zoneMatch) return true;

      const restMatch = (u.assignedRestaurants || []).some(rid => {
        const rest = restaurants.find(r => r.id === rid);
        return rest && currentUser.assignedRegions?.includes(rest.region);
      });
      return restMatch;
    });
  }, [auth.user, restaurants, hierarchy, searchTerm]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() - 7);
    setCurrentWeekMonday(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekMonday);
    d.setDate(d.getDate() + 7);
    setCurrentWeekMonday(d);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  // Find schedule for a specialist on a specific date
  const getCellSchedule = (specialistId: string, dateStr: string) => {
    return schedules.find(s => s.employee_id === specialistId && s.date === dateStr);
  };

  // Calculate daily shift hours
  const calculateHours = (s?: DailySchedule): number => {
    if (!s) return 0;
    if (s.shift_type === 'Capacitación') return 7;
    if (s.shift_type === 'Descanso' || s.shift_type === 'Incapacidad') return 0;
    if (s.shift_type === 'Laboral' && s.check_in && s.check_out) {
      try {
        const [inH, inM] = s.check_in.split(':').map(Number);
        const [outH, outM] = s.check_out.split(':').map(Number);
        const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes > 0) {
          return parseFloat((diffMinutes / 60).toFixed(1));
        }
      } catch (e) {
        return 0;
      }
    }
    return 0;
  };

  // Calculate weekly total hours for a specialist
  const getWeeklyHours = (specialistId: string): number => {
    let total = 0;
    weekDays.forEach(day => {
      const s = getCellSchedule(specialistId, day.dateStr);
      total += calculateHours(s);
    });
    return parseFloat(total.toFixed(1));
  };

  // Handle cell click (open editor modal)
  const handleCellClick = (specialist: User, day: { name: string; dateStr: string }) => {
    const sched = getCellSchedule(specialist.id, day.dateStr);
    setSelectedCell({
      specialist,
      date: day.dateStr,
      dayName: day.name,
      schedule: sched
    });

    if (sched) {
      setModalShiftType(sched.shift_type);
      setModalCheckIn(sched.check_in || '08:00');
      setModalCheckOut(sched.check_out || '17:00');
      setModalRestaurantId(sched.restaurant_id || '');
    } else {
      setModalShiftType('Laboral');
      setModalCheckIn('08:00');
      setModalCheckOut('17:00');
      
      // Default to the specialist's first assigned restaurant if any
      const defaultRestId = specialist.assignedRestaurants?.[0] || '';
      setModalRestaurantId(defaultRestId);
    }
  };

  // Fetch only the restaurants corresponding to the specialist's scope
  const getSpecialistAllowedRestaurants = (specialist: User): Restaurant[] => {
    const assignedRestSet = new Set(specialist.assignedRestaurants || []);
    const assignedRegSet = new Set(specialist.assignedRegions || []);
    const assignedZoneSet = new Set(specialist.assignedZones || []);

    const matches = restaurants.filter(r => {
      if (assignedRestSet.has(r.id)) return true;
      if (assignedRegSet.has(r.region)) return true;
      if (assignedZoneSet.has(r.zone)) return true;
      return false;
    });

    // Fallback: if specialist has absolutely nothing assigned, allow restaurants from the leader/coordinator regions
    if (matches.length === 0) {
      const leaderRegions = auth.user?.assignedRegions || [];
      return restaurants.filter(r => leaderRegions.includes(r.region));
    }

    return matches;
  };

  const handleSaveShift = async () => {
    if (!selectedCell) return;
    setIsSavingShift(true);

    try {
      const scheduleToSave: DailySchedule = {
        employee_id: selectedCell.specialist.id,
        date: selectedCell.date,
        shift_type: modalShiftType,
        check_in: modalShiftType === 'Laboral' ? modalCheckIn : undefined,
        check_out: modalShiftType === 'Laboral' ? modalCheckOut : undefined,
        restaurant_id: (modalShiftType === 'Laboral' || modalShiftType === 'Capacitación') && modalRestaurantId ? modalRestaurantId : undefined
      };

      await dataService.saveDailySchedule(scheduleToSave);
      showToast(`Turno guardado con éxito para ${formatName(selectedCell.specialist.username)}.`);
      
      // Reload and close modal
      await loadWeekSchedules();
      setSelectedCell(null);
    } catch (err) {
      console.error('[Schedules] Error al guardar turno:', err);
      showToast('Error al guardar turno en la base de datos.', true);
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedCell || !selectedCell.schedule) return;
    setIsSavingShift(true);

    try {
      await dataService.deleteDailySchedule(selectedCell.specialist.id, selectedCell.date);
      showToast(`Turno eliminado con éxito para ${formatName(selectedCell.specialist.username)}.`);
      
      await loadWeekSchedules();
      setSelectedCell(null);
    } catch (err) {
      console.error('[Schedules] Error al borrar turno:', err);
      showToast('Error al eliminar turno de la base de datos.', true);
    } finally {
      setIsSavingShift(false);
    }
  };

  const formatName = (username: string) => {
    if (!username) return '';
    return username
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getWeekRangeLabel = () => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startStr = weekDays[0].dateObj.toLocaleDateString('es-ES', options);
    const endStr = weekDays[6].dateObj.toLocaleDateString('es-ES', { ...options, year: 'numeric' });
    return `Semana del ${startStr} al ${endStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-4 rounded-2xl shadow-xl border animate-fade-in transition-all bg-white border-slate-100 max-w-sm">
          <div className={`w-3 h-3 rounded-full shrink-0 ${toast.isError ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{toast.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100/80">
        <div>
          <span className="text-[9px] font-black tracking-widest text-red-600 uppercase">Gestión de Turnos</span>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600 shrink-0" />
            Programación de Horarios
          </h1>
          <p className="text-[10px] text-slate-400 mt-1">Crea y modifica el calendario de actividades de tus Especialistas.</p>
        </div>

        {/* Date navigators */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button 
            onClick={handlePrevWeek} 
            className="p-3 bg-slate-50 border border-slate-100 hover:border-red-600 rounded-xl hover:text-red-600 transition-all text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleCurrentWeek}
            className="px-4 py-3 bg-slate-50 border border-slate-100 hover:border-red-600 text-slate-600 hover:text-red-600 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Hoy
          </button>
          
          <button 
            onClick={handleNextWeek} 
            className="p-3 bg-slate-50 border border-slate-100 hover:border-red-600 rounded-xl hover:text-red-600 transition-all text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-[10px] font-bold text-slate-700 uppercase px-3 py-2 bg-slate-50 rounded-xl border border-slate-100/60 ml-2">
            {weekDays.length > 0 ? getWeekRangeLabel() : 'Cargando...'}
          </span>
        </div>
      </div>

      {/* Main body */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative max-w-md w-full">
            <input 
              type="text" 
              placeholder="Buscar especialista por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white pl-4 pr-10 py-3 border-2 border-slate-100 rounded-2xl focus:border-red-600 text-[11px] font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-4 text-[9px] font-black tracking-widest text-slate-400 uppercase">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span>Laboral</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> <span>Capacitación (7h)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> <span>Descanso</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> <span>Incapacidad</span></div>
          </div>
        </div>

        {/* Table Grid container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[240px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  Especialista
                </th>
                {weekDays.map(day => (
                  <th key={day.dateStr} className="py-4 px-3 text-center border-l border-slate-100/80">
                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{day.name}</div>
                    <div className="text-[8px] font-bold text-slate-400 tracking-wider mt-0.5">
                      {day.dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </div>
                  </th>
                ))}
                <th className="py-4 px-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider w-[100px] border-l border-slate-100/80 bg-slate-50/50">
                  Total Semanal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cargando grilla de turnos...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">No se encontraron especialistas</span>
                      <p className="text-[9px] text-slate-400 leading-relaxed">No tienes especialistas asignados en tus regiones autorizadas o no coinciden con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleSpecialists.map(spec => (
                  <tr key={spec.id} className="hover:bg-slate-50/40 transition-colors group">
                    {/* Specialist profile cell */}
                    <td className="py-4 px-6 sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border-2 border-slate-200/50 flex items-center justify-center font-black text-slate-700 text-xs shrink-0 uppercase">
                          {spec.username.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-slate-800 uppercase truncate">
                            {formatName(spec.username)}
                          </div>
                          <div className="text-[8px] font-black text-slate-400 mt-0.5 tracking-wider uppercase">
                            CC: {spec.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Daily Turn cells */}
                    {weekDays.map(day => {
                      const s = getCellSchedule(spec.id, day.dateStr);
                      let content = null;

                      if (s) {
                        const storeName = s.restaurant_id 
                          ? (restaurants.find(r => r.id === s.restaurant_id)?.name || s.restaurant_id)
                          : '';

                        if (s.shift_type === 'Laboral') {
                          content = (
                            <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-2.5 text-left transition-all hover:shadow-sm">
                              <div className="text-[8px] font-black text-emerald-800 uppercase tracking-wide">LABORAL</div>
                              <div className="text-[9px] font-black text-emerald-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                <span>{s.check_in} - {s.check_out}</span>
                              </div>
                              {storeName && (
                                <div className="text-[8px] font-bold text-emerald-500 mt-0.5 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                                  <span className="truncate">{storeName}</span>
                                </div>
                              )}
                              <div className="text-[8px] font-black text-emerald-700/80 mt-1.5 pt-1 border-t border-emerald-200/30 text-right">
                                {calculateHours(s)} Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Capacitación') {
                          content = (
                            <div className="bg-indigo-50 border border-indigo-200/60 rounded-xl p-2.5 text-left transition-all hover:shadow-sm">
                              <div className="text-[8px] font-black text-indigo-800 uppercase tracking-wide">CAPACITACIÓN</div>
                              <div className="text-[9px] font-black text-indigo-600 mt-1 flex items-center gap-1">
                                <Award className="w-3 h-3 text-indigo-500" />
                                <span>Turno Especial</span>
                              </div>
                              {storeName && (
                                <div className="text-[8px] font-bold text-indigo-500 mt-0.5 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                                  <span className="truncate">{storeName}</span>
                                </div>
                              )}
                              <div className="text-[8px] font-black text-indigo-700/80 mt-1.5 pt-1 border-t border-indigo-200/30 text-right">
                                {calculateHours(s)} Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Descanso') {
                          content = (
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-center transition-all">
                              <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider">DESCANSO</div>
                              <div className="text-[8px] font-bold text-slate-400 mt-1">Día Libre</div>
                              <div className="text-[8px] font-black text-slate-400/80 mt-1.5 pt-1 border-t border-slate-200/20">
                                0.0 Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Incapacidad') {
                          content = (
                            <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-2.5 text-center transition-all">
                              <div className="text-[8px] font-black text-rose-800 uppercase tracking-wider">INCAPACIDAD</div>
                              <div className="text-[8px] font-bold text-rose-500 mt-1">Ausencia Médica</div>
                              <div className="text-[8px] font-black text-rose-500/80 mt-1.5 pt-1 border-t border-rose-200/20">
                                0.0 Horas
                              </div>
                            </div>
                          );
                        }
                      } else {
                        content = (
                          <div className="border border-dashed border-slate-200 rounded-xl p-3 text-slate-300 group-hover/row:text-red-500 group-hover/row:border-red-200/80 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[70px] bg-slate-50/20">
                            <Plus className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                            <span className="text-[8px] font-bold uppercase tracking-wider">Asignar</span>
                          </div>
                        );
                      }

                      return (
                        <td 
                          key={day.dateStr} 
                          onClick={() => handleCellClick(spec, day)}
                          className="p-1.5 border-l border-slate-100 hover:bg-slate-50 cursor-pointer w-[140px] vertical-align-top transition-colors select-none"
                        >
                          {content}
                        </td>
                      );
                    })}

                    {/* Total weekly hours cell */}
                    <td className="py-4 px-5 text-center font-black border-l border-slate-100 text-slate-900 bg-slate-50/20">
                      <div className="text-xs font-black">{getWeeklyHours(spec.id)}h</div>
                      <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Semana</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Turn modal editor */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-scale-up">
            
            {/* Modal header */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Planificar Actividad</span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-0.5 tracking-tight">
                  {selectedCell.dayName} {selectedCell.date.split('-').reverse().slice(0, 2).join('/')}
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Especialista: {formatName(selectedCell.specialist.username)}</p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-150 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5">
              {/* Type of Turn Selector */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Actividad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Laboral', label: 'Turno Laboral' },
                    { key: 'Capacitación', label: 'Capacitación' },
                    { key: 'Descanso', label: 'Descanso' },
                    { key: 'Incapacidad', label: 'Incapacidad' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setModalShiftType(item.key as any)}
                      className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase text-center transition-all ${modalShiftType === item.key ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional elements based on type */}
              {modalShiftType === 'Laboral' && (
                <div className="grid grid-cols-2 gap-4 animate-slide-down">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Entrada</label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="time" 
                        value={modalCheckIn}
                        onChange={(e) => setModalCheckIn(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora Salida</label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="time" 
                        value={modalCheckOut}
                        onChange={(e) => setModalCheckOut(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(modalShiftType === 'Laboral' || modalShiftType === 'Capacitación') && (
                <div className="animate-slide-down">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Restaurante / CECO Asignado</label>
                  <select 
                    value={modalRestaurantId}
                    onChange={(e) => setModalRestaurantId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3.5 text-[10px] font-black uppercase text-slate-700 outline-none focus:border-red-600 transition-all"
                  >
                    <option value="">Selecciona una tienda del especialista...</option>
                    {getSpecialistAllowedRestaurants(selectedCell.specialist).map(r => (
                      <option key={r.id} value={r.id}>{r.id} - {r.name} ({r.region})</option>
                    ))}
                  </select>
                  <p className="text-[8px] text-slate-400 mt-1.5">Restringido a las tiendas configuradas en la jurisdicción del especialista.</p>
                </div>
              )}

              {modalShiftType === 'Capacitación' && (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-indigo-900 animate-slide-down">
                  <Award className="w-5 h-5 shrink-0 text-indigo-600" />
                  <p className="text-[9px] font-bold leading-normal">
                    Nota: Los turnos de Capacitación registran una jornada de asistencia fija equivalente a <strong className="font-extrabold text-indigo-700">7.0 horas</strong> en el total semanal.
                  </p>
                </div>
              )}

              {modalShiftType === 'Descanso' && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-3 text-slate-600 animate-slide-down">
                  <Check className="w-5 h-5 shrink-0 text-slate-500" />
                  <p className="text-[9px] font-bold leading-normal">
                    Día libre o descanso laboral. Este día sumará <strong className="font-extrabold text-slate-700">0.0 horas</strong> en el total semanal.
                  </p>
                </div>
              )}

              {modalShiftType === 'Incapacidad' && (
                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-900 animate-slide-down">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  <p className="text-[9px] font-bold leading-normal">
                    Ausencia justificada por enfermedad o incapacidad médica. Este día sumará <strong className="font-extrabold text-rose-700">0.0 horas</strong> en el total semanal.
                  </p>
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-between">
              <div>
                {selectedCell.schedule && (
                  <button
                    onClick={handleDeleteShift}
                    disabled={isSavingShift}
                    className="flex items-center gap-1.5 px-4 py-3 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCell(null)}
                  disabled={isSavingShift}
                  className="px-5 py-3 border-2 border-slate-150 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveShift}
                  disabled={isSavingShift}
                  className="flex items-center gap-1.5 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingShift ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
