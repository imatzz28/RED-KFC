import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DailySchedule, User, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  MapPin, 
  Download, 
  Search, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase, 
  TrendingUp, 
  Building2, 
  Users, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  PieChart as PieIcon,
  Sun,
  ShieldAlert,
  GraduationCap,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  restaurants: Restaurant[];
  initialStartDate?: string;
  initialEndDate?: string;
}

const SHIFT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  Laboral: { bg: 'bg-slate-100', text: 'text-slate-900 font-bold', border: 'border-slate-300', bar: '#0f1c2d' },
  Descanso: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', bar: '#94a3b8' },
  Capacitación: { bg: 'bg-red-50', text: 'text-red-700 font-bold', border: 'border-red-200', bar: '#dc2626' },
  Incapacidad: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', bar: '#64748b' },
};

const calculateShiftHours = (checkIn?: string, checkOut?: string): number => {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  if (isNaN(inH) || isNaN(outH)) return 0;
  
  let inMinutes = inH * 60 + (inM || 0);
  let outMinutes = outH * 60 + (outM || 0);
  
  if (outMinutes <= inMinutes) {
    outMinutes += 24 * 60; // Cruza medianoche
  }
  
  const totalHours = (outMinutes - inMinutes) / 60;
  // Descontar 1h de descanso si la jornada es mayor o igual a 6h
  return totalHours >= 6 ? Math.max(0, totalHours - 1) : totalHours;
};

const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ScheduleReportDashboard: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  restaurants,
  initialStartDate,
  initialEndDate
}) => {
  // Rango de fechas por defecto: Mes actual
  const now = new Date();
  const firstDayCurrentMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDayCurrentMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [startDate, setStartDate] = useState(initialStartDate || firstDayCurrentMonth);
  const [endDate, setEndDate] = useState(initialEndDate || lastDayCurrentMonth);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Sincronizar fechas si cambian los props iniciales
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  // Filtros
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Carga de programaciones para el rango de fechas
  useEffect(() => {
    if (!isOpen || !startDate || !endDate) return;
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const data = await dataService.getSchedulesForDateRange(startDate, endDate);
        setSchedules(data || []);
      } catch (err) {
        console.error('Error fetching schedules for report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [isOpen, startDate, endDate]);

  // Mapa de usuarios y restaurantes para lookup rápido
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const userByUsernameMap = useMemo(() => new Map(users.map(u => [u.username.toLowerCase(), u])), [users]);
  const restMap = useMemo(() => new Map(restaurants.map(r => [r.id, r])), [restaurants]);

  const resolveSpecialistName = (employeeId: string): string => {
    const directUser = userMap.get(employeeId);
    if (directUser) return directUser.username;
    const byUsername = userByUsernameMap.get(employeeId.toLowerCase());
    if (byUsername) return byUsername.username;
    return employeeId;
  };

  const resolveRestaurantName = (restaurantId?: string): string => {
    if (!restaurantId) return 'Sin tienda específica';
    const r = restMap.get(restaurantId);
    return r ? `${r.name} (${r.id})` : restaurantId;
  };

  // Preset de fechas
  const handleSetPreset = (preset: 'this_month' | 'last_month' | 'last_30_days' | 'this_week') => {
    const today = new Date();
    if (preset === 'this_month') {
      setStartDate(toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(toLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    } else if (preset === 'last_month') {
      setStartDate(toLocalDateString(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setEndDate(toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 0)));
    } else if (preset === 'last_30_days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      setStartDate(toLocalDateString(past));
      setEndDate(toLocalDateString(today));
    } else if (preset === 'this_week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.getFullYear(), today.getMonth(), diff);
      const sunday = new Date(today.getFullYear(), today.getMonth(), diff + 6);
      setStartDate(toLocalDateString(monday));
      setEndDate(toLocalDateString(sunday));
    }
  };

  // Lista de actividades únicas encontradas
  const uniqueActivities = useMemo(() => {
    const acts = new Set<string>();
    schedules.forEach(s => {
      if (s.activity && s.activity.trim()) {
        acts.add(s.activity.trim());
      }
    });
    return Array.from(acts).sort();
  }, [schedules]);

  // Lista de especialistas con programación en el periodo
  const activeSpecialistIds = useMemo(() => {
    const specIds = new Set<string>();
    schedules.forEach(s => specIds.add(s.employee_id));
    return Array.from(specIds);
  }, [schedules]);

  // Filtrado de programaciones
  const filteredSchedules = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    return schedules.filter(s => {
      if (selectedSpecialist !== 'all' && s.employee_id !== selectedSpecialist) return false;
      if (selectedShiftType !== 'all' && s.shift_type !== selectedShiftType) return false;
      if (selectedActivity !== 'all' && (s.activity || '') !== selectedActivity) return false;
      if (selectedRestaurant !== 'all' && (s.restaurant_id || '') !== selectedRestaurant) return false;

      if (q) {
        const specName = resolveSpecialistName(s.employee_id).toLowerCase();
        const restName = resolveRestaurantName(s.restaurant_id).toLowerCase();
        const act = (s.activity || '').toLowerCase();
        const msg = (s.custom_message || '').toLowerCase();
        const id = s.employee_id.toLowerCase();
        const date = s.date;
        if (!specName.includes(q) && !restName.includes(q) && !act.includes(q) && !msg.includes(q) && !id.includes(q) && !date.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, selectedSpecialist, selectedShiftType, selectedActivity, selectedRestaurant, tableSearch]);

  // Métricas Clave (KPIs)
  const metrics = useMemo(() => {
    let totalHours = 0;
    let laboralCount = 0;
    let descansoCount = 0;
    let capacitacionCount = 0;
    let incapacidadCount = 0;
    const specialistHoursMap: Record<string, number> = {};
    const activityCountMap: Record<string, number> = {};
    const storeCountMap: Record<string, number> = {};
    const dailyCoverageMap: Record<string, number> = {};

    filteredSchedules.forEach(s => {
      const hrs = s.shift_type === 'Laboral' || s.shift_type === 'Capacitación' 
        ? calculateShiftHours(s.check_in, s.check_out) 
        : 0;
      
      totalHours += hrs;

      if (s.shift_type === 'Laboral') laboralCount++;
      else if (s.shift_type === 'Descanso') descansoCount++;
      else if (s.shift_type === 'Capacitación') capacitacionCount++;
      else if (s.shift_type === 'Incapacidad') incapacidadCount++;

      // Por especialista
      specialistHoursMap[s.employee_id] = (specialistHoursMap[s.employee_id] || 0) + hrs;

      // Por actividad
      const actKey = s.activity && s.activity.trim() ? s.activity.trim() : (s.shift_type === 'Descanso' ? 'Día Libre' : 'Sin Actividad Detallada');
      activityCountMap[actKey] = (activityCountMap[actKey] || 0) + 1;

      // Por tienda
      if (s.restaurant_id) {
        storeCountMap[s.restaurant_id] = (storeCountMap[s.restaurant_id] || 0) + 1;
      }

      // Por día
      if (s.shift_type === 'Laboral' || s.shift_type === 'Capacitación') {
        dailyCoverageMap[s.date] = (dailyCoverageMap[s.date] || 0) + 1;
      }
    });

    const uniqueSpecialistsCount = Object.keys(specialistHoursMap).length;
    const uniqueStoresCount = Object.keys(storeCountMap).length;
    const avgHoursPerSpecialist = uniqueSpecialistsCount > 0 ? (totalHours / uniqueSpecialistsCount).toFixed(1) : '0';

    // Top Actividades
    const topActivities = Object.entries(activityCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Carga por especialista ordenada
    const specialistRanking = Object.entries(specialistHoursMap)
      .map(([id, hrs]) => ({
        id,
        name: resolveSpecialistName(id),
        hours: hrs,
        shifts: filteredSchedules.filter(s => s.employee_id === id && (s.shift_type === 'Laboral' || s.shift_type === 'Capacitación')).length,
        rests: filteredSchedules.filter(s => s.employee_id === id && s.shift_type === 'Descanso').length
      }))
      .sort((a, b) => b.hours - a.hours);

    // Tiendas más visitadas
    const topStores = Object.entries(storeCountMap)
      .map(([id, count]) => ({
        id,
        name: resolveRestaurantName(id),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalHours: Math.round(totalHours),
      totalSchedules: filteredSchedules.length,
      laboralCount,
      descansoCount,
      capacitacionCount,
      incapacidadCount,
      uniqueSpecialistsCount,
      uniqueStoresCount,
      avgHoursPerSpecialist,
      topActivities,
      specialistRanking,
      topStores
    };
  }, [filteredSchedules]);

  // Exportar a Excel
  const handleExportExcel = () => {
    const rows = filteredSchedules.map(s => {
      const hrs = calculateShiftHours(s.check_in, s.check_out);
      return {
        'Fecha': s.date,
        'Cédula Especialista': s.employee_id,
        'Nombre Especialista': resolveSpecialistName(s.employee_id),
        'Tipo de Jornada': s.shift_type,
        'Hora Entrada': s.check_in || '',
        'Hora Salida': s.check_out || '',
        'Horas Netas': s.shift_type === 'Laboral' || s.shift_type === 'Capacitación' ? hrs : 0,
        'CECO Tienda': s.restaurant_id || 'N/A',
        'Nombre Tienda': s.restaurant_id ? resolveRestaurantName(s.restaurant_id) : 'Sin tienda asignada',
        'Actividad': s.activity || '',
        'Observación / Mensaje': s.custom_message || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Planificación');

    // Generar archivo
    XLSX.writeFile(workbook, `Reporte_Planificacion_${startDate}_a_${endDate}.xlsx`);
  };

  // Paginación
  const totalPages = Math.ceil(filteredSchedules.length / pageSize) || 1;
  const paginatedSchedules = filteredSchedules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100020] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Principal */}
        <div className="bg-[#0f1c2d] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase italic">
                Reporte Planificación
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Métricas de Actividades Especialistas Entrenamiento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredSchedules.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Cerrar reporte"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Rangos */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* Selector de Rango */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* Botones Presets */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              <button
                onClick={() => handleSetPreset('this_week')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition"
              >
                Esta Semana
              </button>
              <button
                onClick={() => handleSetPreset('this_month')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition"
              >
                Este Mes
              </button>
              <button
                onClick={() => handleSetPreset('last_month')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition"
              >
                Mes Anterior
              </button>
            </div>
          </div>

          {/* Filtros Dropdown Rápidos */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Especialista */}
            <select
              value={selectedSpecialist}
              onChange={e => setSelectedSpecialist(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs"
            >
              <option value="all">Todos los Especialistas ({activeSpecialistIds.length})</option>
              {activeSpecialistIds.map(id => (
                <option key={id} value={id}>{resolveSpecialistName(id)}</option>
              ))}
            </select>

            {/* Filtro Tipo de Turno */}
            <select
              value={selectedShiftType}
              onChange={e => setSelectedShiftType(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs"
            >
              <option value="all">Todos los Tipos de Turno</option>
              <option value="Laboral">Laboral</option>
              <option value="Descanso">Descanso (Día Libre)</option>
              <option value="Capacitación">Capacitación</option>
              <option value="Incapacidad">Incapacidad</option>
            </select>

            {/* Filtro Actividad */}
            <select
              value={selectedActivity}
              onChange={e => setSelectedActivity(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs max-w-[180px] truncate"
            >
              <option value="all">Todas las Actividades</option>
              {uniqueActivities.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100/50">
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Horas */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Horas</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.totalHours} <span className="text-xs font-bold text-slate-400">hrs</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Promedio: {metrics.avgHoursPerSpecialist} hrs/esp</p>
            </div>

            {/* Jornadas Laborales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Laborales</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.laboralCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">Turnos en campo</p>
            </div>

            {/* Días de Descanso */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Descansos</span>
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.descansoCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">Días libres programados</p>
            </div>

            {/* Capacitaciones */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Capacitaciones</span>
                <GraduationCap className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.capacitacionCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">Sesiones formativas</p>
            </div>

            {/* Especialistas Activos */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Especialistas</span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.uniqueSpecialistsCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">Con asignaciones</p>
            </div>

            {/* Tiendas con Cobertura */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider">Tiendas / CECOs</span>
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.uniqueStoresCount}</p>
              <p className="text-[10px] text-slate-400 mt-1">Tiendas cubiertas</p>
            </div>
          </div>

          {/* Gráficos y Distribuciones */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Distribución de Jornadas (Donut / Visual Bar) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-red-600" />
                  Distribución de Jornadas
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{metrics.totalSchedules} registros</span>
              </div>

              {/* Progress bar apilada */}
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                {metrics.totalSchedules > 0 && (
                  <>
                    <div style={{ width: `${(metrics.laboralCount / metrics.totalSchedules) * 100}%` }} className="bg-slate-900 h-full" title={`Laboral: ${metrics.laboralCount}`} />
                    <div style={{ width: `${(metrics.descansoCount / metrics.totalSchedules) * 100}%` }} className="bg-slate-300 h-full" title={`Descanso: ${metrics.descansoCount}`} />
                    <div style={{ width: `${(metrics.capacitacionCount / metrics.totalSchedules) * 100}%` }} className="bg-red-600 h-full" title={`Capacitación: ${metrics.capacitacionCount}`} />
                    <div style={{ width: `${(metrics.incapacidadCount / metrics.totalSchedules) * 100}%` }} className="bg-slate-500 h-full" title={`Incapacidad: ${metrics.incapacidadCount}`} />
                  </>
                )}
              </div>

              {/* Leyenda */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                    <span className="font-bold text-slate-800">Laboral</span>
                  </div>
                  <span className="font-black text-slate-900">{metrics.laboralCount}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="font-bold text-slate-700">Descanso</span>
                  </div>
                  <span className="font-black text-slate-700">{metrics.descansoCount}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-red-50/70 border border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <span className="font-bold text-red-900">Capacitación</span>
                  </div>
                  <span className="font-black text-red-900">{metrics.capacitacionCount}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="font-bold text-slate-700">Incapacidad</span>
                  </div>
                  <span className="font-black text-slate-700">{metrics.incapacidadCount}</span>
                </div>
              </div>
            </div>

            {/* Top Actividades */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-red-600" />
                  Actividades Más Frecuentes
                </h3>
              </div>

              <div className="space-y-2.5">
                {metrics.topActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No hay actividades registradas en el período</p>
                ) : (
                  metrics.topActivities.map(([act, count], idx) => {
                    const pct = metrics.totalSchedules > 0 ? Math.round((count / metrics.totalSchedules) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="truncate pr-2">{act}</span>
                          <span className="font-black text-slate-900 shrink-0">{count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            style={{ width: `${pct}%` }} 
                            className="h-full bg-slate-900 rounded-full transition-all duration-500" 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Ranking Horas por Especialista */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  Carga Horaria por Especialista
                </h3>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {metrics.specialistRanking.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Sin datos de especialistas</p>
                ) : (
                  metrics.specialistRanking.map(spec => (
                    <div key={spec.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-black shrink-0">
                          {spec.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 truncate">{spec.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{spec.shifts} laborales · {spec.rests} libres</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">{spec.hours} <span className="text-[10px] text-slate-400 font-bold">hrs</span></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabla Detallada de Programaciones */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-600" />
                  Detalle de Programación Diaria ({filteredSchedules.length} registros)
                </h3>
              </div>

              {/* Buscador en la tabla */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por especialista, tienda, fecha..."
                  value={tableSearch}
                  onChange={e => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Especialista</th>
                    <th className="py-3 px-4">Tipo Jornada</th>
                    <th className="py-3 px-4">Horario</th>
                    <th className="py-3 px-4">Horas</th>
                    <th className="py-3 px-4">Tienda / CECO</th>
                    <th className="py-3 px-4">Actividad</th>
                    <th className="py-3 px-4">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        Cargando reportes de programación...
                      </td>
                    </tr>
                  ) : paginatedSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-bold">
                        No se encontraron registros para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    paginatedSchedules.map((s, idx) => {
                      const style = SHIFT_TYPE_COLORS[s.shift_type] || SHIFT_TYPE_COLORS['Laboral'];
                      const hrs = calculateShiftHours(s.check_in, s.check_out);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs font-bold text-slate-900">
                            {s.date}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{resolveSpecialistName(s.employee_id)}</div>
                            <div className="text-[10px] font-mono text-slate-400">{s.employee_id}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                              {s.shift_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                            {s.check_in && s.check_out ? `${s.check_in} - ${s.check_out}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 font-black text-slate-900">
                            {s.shift_type === 'Laboral' || s.shift_type === 'Capacitación' ? `${hrs} h` : '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-800 truncate max-w-[180px]">
                              {resolveRestaurantName(s.restaurant_id)}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-700">
                            {s.activity || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[200px] truncate" title={s.custom_message}>
                            {s.custom_message || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">
                  Página {currentPage} de {totalPages} ({filteredSchedules.length} registros)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
