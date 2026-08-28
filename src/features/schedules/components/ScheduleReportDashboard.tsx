import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DailySchedule, User, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';
import { useAppStore } from '@/store/useAppStore';
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
  ChevronDown,
  Sparkles,
  PieChart as PieIcon,
  Sun,
  ShieldAlert,
  GraduationCap,
  Layers,
  Map as MapIcon,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  Menu
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

const formatDateDisplay = (dateStr?: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Helper para normalizar nombres de actividades a 'Inducción Corporativa'
const normalizeActivityName = (act?: string): string => {
  if (!act) return '';
  const trimmed = act.trim();
  if (/^inducci[oó]n\s*corporativ[ao]/i.test(trimmed) || /^corporativ[ao]/i.test(trimmed)) {
    return 'Inducción Corporativa';
  }
  return trimmed;
};

export const ScheduleReportDashboard: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  restaurants,
  initialStartDate,
  initialEndDate,
}) => {
  const { hierarchy: storeHierarchy } = useAppStore();
  const hierarchy = storeHierarchy || dataService.getHierarchy() || { leaders: {}, regions: {} };

  // Rango de fechas por defecto: Mes actual
  const now = new Date();
  const firstDayCurrentMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDayCurrentMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [startDate, setStartDate] = useState(initialStartDate || firstDayCurrentMonth);
  const [endDate, setEndDate] = useState(initialEndDate || lastDayCurrentMonth);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Vista activa: 'coverage' (Cobertura de visitas) | 'details' (Detalle y Resumen combinado)
  const [activeViewTab, setActiveViewTab] = useState<'coverage' | 'details'>('coverage');

  // Menú desplegable superior (Cobertura, Reporte General, Descargar Excel)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Popover de rango de fechas (100% React Calendar)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [calYear, setCalYear] = useState(() => {
    if (startDate) {
      const p = startDate.split('-').map(Number);
      if (p[0]) return p[0];
    }
    return new Date().getFullYear();
  });

  const [calMonth, setCalMonth] = useState(() => {
    if (startDate) {
      const p = startDate.split('-').map(Number);
      if (p[1]) return p[1] - 1;
    }
    return new Date().getMonth();
  });

  // Cerrar picker o menú al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isDatePickerOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen, isMenuOpen]);

  // Sincronizar fechas si cambian los props iniciales
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    if (isDatePickerOpen && startDate) {
      const p = startDate.split('-').map(Number);
      if (p[0] && p[1]) {
        setCalYear(p[0]);
        setCalMonth(p[1] - 1);
      }
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      setHoverDate(null);
    }
  }, [isDatePickerOpen, startDate, endDate]);

  const handlePrevCalMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const handleNextCalMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateStr);
      setTempEndDate('');
    } else if (tempStartDate && !tempEndDate) {
      if (dateStr < tempStartDate) {
        setTempStartDate(dateStr);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  // Helper para generar cuadrícula de días del mes para el React Calendar
  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const totalDays = lastDay.getDate();
    
    // 0 = Domingo, 1 = Lunes, etc. Ajustar a semana iniciando en Lunes (0 = Lunes, 6 = Domingo)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(calYear, calMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = calMonth === 0 ? 12 : calMonth;
      const prevY = calMonth === 0 ? calYear - 1 : calYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Días del mes siguiente para completar la cuadrícula de 7 columnas
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = calMonth === 11 ? 1 : calMonth + 2;
      const nextY = calMonth === 11 ? calYear + 1 : calYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return cells;
  }, [calYear, calMonth]);

  // ── 1. Estado para Navegación del Dashboard de Cobertura (100% Independiente) ──
  const [coverageRegion, setCoverageRegion] = useState<string>('all');
  const [coverageZone, setCoverageZone] = useState<string>('all');
  const [coverageStoreFilter, setCoverageStoreFilter] = useState<'all' | 'unvisited' | 'visited'>('all');

  // ── 2. Estado para Filtros de la Tabla y Resumen de Turnos (100% Independiente) ──
  const [tableRegion, setTableRegion] = useState<string>('all');
  const [tableZone, setTableZone] = useState<string>('all');
  const [tableRestaurant, setTableRestaurant] = useState<string>('all');
  const [tableSpecialist, setTableSpecialist] = useState<string>('all');
  const [tableShiftType, setTableShiftType] = useState<string>('all');
  const [tableActivity, setTableActivity] = useState<string>('all');
  const [tableAssignmentFilter, setTableAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Carga de programaciones para el rango de fechas (único parámetro global compartido)
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

  // ── Mapeos y Lookups ────────────────────────────────────────────────────────
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

  // Mapeo Zona -> Líder (Jefe de Área)
  const zoneToLeaderMap = useMemo(() => {
    const map = new Map<string, string>();
    if (hierarchy?.leaders) {
      Object.entries(hierarchy.leaders).forEach(([z, leader]) => {
        if (z && leader) map.set(z.toUpperCase(), leader);
      });
    }
    return map;
  }, [hierarchy]);

  // Mapeo Zona -> Región
  const zoneToRegionMap = useMemo(() => {
    const map = new Map<string, string>();
    restaurants.forEach(r => {
      if (r.zone && r.region && typeof r.region === 'string') {
        map.set(String(r.zone).toUpperCase(), String(r.region).trim().toUpperCase());
      }
    });
    if (hierarchy?.regions) {
      if (Array.isArray(hierarchy.regions)) {
        // Array simple
      } else if (typeof hierarchy.regions === 'object') {
        Object.entries(hierarchy.regions).forEach(([z, reg]) => {
          if (z && typeof reg === 'string' && reg.trim()) {
            map.set(String(z).toUpperCase(), reg.trim().toUpperCase());
          }
        });
      }
    }
    return map;
  }, [restaurants, hierarchy]);

  // Lista de todas las Regiones disponibles
  const allRegions = useMemo(() => {
    const regSet = new Set<string>();
    restaurants.forEach(r => {
      if (r.region && typeof r.region === 'string' && r.region.trim()) {
        regSet.add(r.region.trim().toUpperCase());
      }
    });
    if (hierarchy?.regions) {
      if (Array.isArray(hierarchy.regions)) {
        hierarchy.regions.forEach(reg => {
          if (typeof reg === 'string' && reg.trim()) regSet.add(reg.trim().toUpperCase());
        });
      } else if (typeof hierarchy.regions === 'object') {
        Object.values(hierarchy.regions).forEach(reg => {
          if (typeof reg === 'string' && reg.trim()) regSet.add(reg.trim().toUpperCase());
        });
      }
    }
    return Array.from(regSet).sort();
  }, [restaurants, hierarchy]);

  // ── Lookups para Cobertura (Basados en coverageRegion / coverageZone) ────────
  const coverageAvailableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    restaurants.forEach(r => {
      if (!r.zone) return;
      const rRegion = (r.region || zoneToRegionMap.get(r.zone.toUpperCase()) || '').toUpperCase();
      if (coverageRegion === 'all' || rRegion === coverageRegion.toUpperCase()) {
        zoneSet.add(r.zone.toUpperCase());
      }
    });
    return Array.from(zoneSet).sort();
  }, [restaurants, coverageRegion, zoneToRegionMap]);

  const coverageAvailableStores = useMemo(() => {
    return restaurants.filter(r => {
      const rRegion = (r.region || (r.zone ? zoneToRegionMap.get(r.zone.toUpperCase()) : '') || '').toUpperCase();
      if (coverageRegion !== 'all' && rRegion !== coverageRegion.toUpperCase()) return false;
      if (coverageZone !== 'all' && r.zone?.toUpperCase() !== coverageZone.toUpperCase()) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, coverageRegion, coverageZone, zoneToRegionMap]);

  // ── Lookups para Pestaña de Detalle de Turnos ───────────────────────────────
  const tableAvailableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    restaurants.forEach(r => {
      if (!r.zone) return;
      const rRegion = (r.region || zoneToRegionMap.get(r.zone.toUpperCase()) || '').toUpperCase();
      if (tableRegion === 'all' || rRegion === tableRegion.toUpperCase()) {
        zoneSet.add(r.zone.toUpperCase());
      }
    });
    return Array.from(zoneSet).sort();
  }, [restaurants, tableRegion, zoneToRegionMap]);

  const tableAvailableStores = useMemo(() => {
    return restaurants.filter(r => {
      const rRegion = (r.region || (r.zone ? zoneToRegionMap.get(r.zone.toUpperCase()) : '') || '').toUpperCase();
      if (tableRegion !== 'all' && rRegion !== tableRegion.toUpperCase()) return false;
      if (tableZone !== 'all' && r.zone?.toUpperCase() !== tableZone.toUpperCase()) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, tableRegion, tableZone, zoneToRegionMap]);

  const uniqueActivities = useMemo(() => {
    const acts = new Set<string>();
    schedules.forEach(s => {
      const norm = normalizeActivityName(s.activity);
      if (norm) {
        acts.add(norm);
      }
    });
    return Array.from(acts).sort();
  }, [schedules]);

  const activeSpecialistIds = useMemo(() => {
    const specIds = new Set<string>();
    schedules.forEach(s => specIds.add(s.employee_id));
    return Array.from(specIds);
  }, [schedules]);

  // ── Filtrado Exclusivo para la Tabla de Detalle y Resumen ────────────────────
  const filteredSchedules = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    return schedules.filter(s => {
      const rest = s.restaurant_id ? restMap.get(s.restaurant_id) : undefined;
      const restRegion = (rest?.region || (rest?.zone ? zoneToRegionMap.get(rest.zone.toUpperCase()) : '') || '').toUpperCase();
      const restZone = (rest?.zone || '').toUpperCase();

      if (tableRegion !== 'all' && restRegion !== tableRegion.toUpperCase()) return false;
      if (tableZone !== 'all' && restZone !== tableZone.toUpperCase()) return false;
      if (tableRestaurant !== 'all' && (s.restaurant_id || '') !== tableRestaurant) return false;
      if (tableSpecialist !== 'all' && s.employee_id !== tableSpecialist) return false;
      if (tableShiftType !== 'all' && s.shift_type !== tableShiftType) return false;
      
      const sAct = normalizeActivityName(s.activity);
      if (tableActivity !== 'all' && sAct !== tableActivity) return false;

      // Filtro de Asignación a Tienda (Todos / Con Tienda / No Asignados)
      if (tableAssignmentFilter === 'assigned' && !s.restaurant_id) return false;
      if (tableAssignmentFilter === 'unassigned' && !!s.restaurant_id) return false;

      if (q) {
        const specName = resolveSpecialistName(s.employee_id).toLowerCase();
        const restName = resolveRestaurantName(s.restaurant_id).toLowerCase();
        const act = sAct.toLowerCase();
        const msg = (s.custom_message || '').toLowerCase();
        const id = s.employee_id.toLowerCase();
        const date = s.date;
        if (!specName.includes(q) && !restName.includes(q) && !act.includes(q) && !msg.includes(q) && !id.includes(q) && !date.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, tableRegion, tableZone, tableRestaurant, tableSpecialist, tableShiftType, tableActivity, tableAssignmentFilter, tableSearch, restMap, zoneToRegionMap]);

  // ── Métricas de Cobertura de Visitas (100% Independiente de filtros de turnos) ──
  const coverageData = useMemo(() => {
    const storeVisitsMap = new Map<string, { visits: number; specialists: Set<string>; dates: string[] }>();
    
    // Contabilizar visitas sobre TODAS las programaciones del rango de fechas
    schedules.forEach(s => {
      if (s.restaurant_id) {
        const current = storeVisitsMap.get(s.restaurant_id) || { visits: 0, specialists: new Set<string>(), dates: [] };
        current.visits += 1;
        current.specialists.add(resolveSpecialistName(s.employee_id));
        current.dates.push(s.date);
        storeVisitsMap.set(s.restaurant_id, current);
      }
    });

    // 1. Análisis Nivel 1: Por las 7 Regiones
    const regionStats = allRegions.map(reg => {
      const storesInReg = restaurants.filter(r => {
        const rRegion = (r.region || (r.zone ? zoneToRegionMap.get(r.zone.toUpperCase()) : '') || '').toUpperCase();
        return rRegion === reg.toUpperCase();
      });
      const totalStores = storesInReg.length;
      let visitedStores = 0;
      let totalVisits = 0;

      storesInReg.forEach(r => {
        const stat = storeVisitsMap.get(r.id);
        if (stat && stat.visits > 0) {
          visitedStores++;
          totalVisits += stat.visits;
        }
      });

      const unvisitedStores = Math.max(0, totalStores - visitedStores);
      const coveragePct = totalStores > 0 ? Math.round((visitedStores / totalStores) * 100) : 0;

      return {
        region: reg,
        totalStores,
        visitedStores,
        unvisitedStores,
        totalVisits,
        coveragePct
      };
    }).sort((a, b) => b.coveragePct - a.coveragePct);

    // 2. Análisis Nivel 2: Por Jefes de Área / Zonas (De la región explorada)
    const relevantZones = (coverageRegion === 'all' 
      ? Array.from(new Set(restaurants.map(r => r.zone?.toUpperCase()).filter(Boolean))) 
      : coverageAvailableZones) as string[];
    
    const zoneStats = relevantZones.map(z => {
      const leaderName = zoneToLeaderMap.get(z) || z;
      const storesInZone = restaurants.filter(r => r.zone?.toUpperCase() === z.toUpperCase());
      const totalStores = storesInZone.length;
      let visitedStores = 0;
      let totalVisits = 0;

      storesInZone.forEach(r => {
        const stat = storeVisitsMap.get(r.id);
        if (stat && stat.visits > 0) {
          visitedStores++;
          totalVisits += stat.visits;
        }
      });

      const unvisitedStores = Math.max(0, totalStores - visitedStores);
      const coveragePct = totalStores > 0 ? Math.round((visitedStores / totalStores) * 100) : 0;

      return {
        zone: z,
        leaderName,
        totalStores,
        visitedStores,
        unvisitedStores,
        totalVisits,
        coveragePct
      };
    }).sort((a, b) => b.coveragePct - a.coveragePct);

    // 3. Análisis Nivel 3: Desglose por Tienda Individual
    const storeStats = coverageAvailableStores.map(r => {
      const stat = storeVisitsMap.get(r.id);
      const visits = stat ? stat.visits : 0;
      const specialists = stat ? Array.from(stat.specialists) : [];
      const leaderName = r.zone ? (zoneToLeaderMap.get(r.zone.toUpperCase()) || r.zone) : 'Sin asignar';
      const regionName = r.region || (r.zone ? zoneToRegionMap.get(r.zone.toUpperCase()) : '') || 'General';

      return {
        id: r.id,
        name: r.name,
        region: regionName,
        zone: r.zone,
        leaderName,
        visits,
        specialists,
        isVisited: visits > 0
      };
    }).sort((a, b) => {
      if (a.visits === b.visits) return a.name.localeCompare(b.name);
      return b.visits - a.visits;
    });

    // Totales globales en el ámbito de cobertura
    const totalScopeStores = coverageAvailableStores.length;
    const visitedScopeStores = storeStats.filter(s => s.isVisited).length;
    const unvisitedScopeStores = totalScopeStores - visitedScopeStores;
    const totalScopeVisits = storeStats.reduce((acc, s) => acc + s.visits, 0);
    const scopeCoveragePct = totalScopeStores > 0 ? Math.round((visitedScopeStores / totalScopeStores) * 100) : 0;

    return {
      regionStats,
      zoneStats,
      storeStats,
      totalScopeStores,
      visitedScopeStores,
      unvisitedScopeStores,
      totalScopeVisits,
      scopeCoveragePct
    };
  }, [allRegions, coverageAvailableZones, coverageAvailableStores, restaurants, schedules, zoneToRegionMap, zoneToLeaderMap, coverageRegion]);

  // ── Métricas Clave (KPIs de Turnos) ──────────────────────────────────────────
  const metrics = useMemo(() => {
    let totalHours = 0;
    let laboralCount = 0;
    let descansoCount = 0;
    let capacitacionCount = 0;
    let incapacidadCount = 0;
    const specialistHoursMap: Record<string, number> = {};
    const activityCountMap: Record<string, number> = {};
    const storeCountMap: Record<string, number> = {};

    filteredSchedules.forEach(s => {
      const hrs = s.shift_type === 'Laboral' || s.shift_type === 'Capacitación' 
        ? calculateShiftHours(s.check_in, s.check_out) 
        : 0;
      
      totalHours += hrs;

      if (s.shift_type === 'Laboral') laboralCount++;
      else if (s.shift_type === 'Descanso') descansoCount++;
      else if (s.shift_type === 'Capacitación') capacitacionCount++;
      else if (s.shift_type === 'Incapacidad') incapacidadCount++;

      specialistHoursMap[s.employee_id] = (specialistHoursMap[s.employee_id] || 0) + hrs;

      const normAct = normalizeActivityName(s.activity);
      const actKey = normAct ? normAct : (s.shift_type === 'Descanso' ? 'Día Libre' : 'Sin Actividad Detallada');
      activityCountMap[actKey] = (activityCountMap[actKey] || 0) + 1;

      if (s.restaurant_id) {
        storeCountMap[s.restaurant_id] = (storeCountMap[s.restaurant_id] || 0) + 1;
      }
    });

    const uniqueSpecialistsCount = Object.keys(specialistHoursMap).length;
    const uniqueStoresCount = Object.keys(storeCountMap).length;
    const avgHoursPerSpecialist = uniqueSpecialistsCount > 0 ? (totalHours / uniqueSpecialistsCount).toFixed(1) : '0';

    const topActivities = Object.entries(activityCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const specialistRanking = Object.entries(specialistHoursMap)
      .map(([id, hrs]) => ({
        id,
        name: resolveSpecialistName(id),
        hours: hrs,
        shifts: filteredSchedules.filter(s => s.employee_id === id && (s.shift_type === 'Laboral' || s.shift_type === 'Capacitación')).length,
        rests: filteredSchedules.filter(s => s.employee_id === id && s.shift_type === 'Descanso').length
      }))
      .sort((a, b) => b.hours - a.hours);

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
      specialistRanking
    };
  }, [filteredSchedules]);

  // Limpiar filtros de la tabla
  const handleResetTableFilters = () => {
    setTableRegion('all');
    setTableZone('all');
    setTableRestaurant('all');
    setTableSpecialist('all');
    setTableShiftType('all');
    setTableActivity('all');
    setTableAssignmentFilter('all');
    setTableSearch('');
    setCurrentPage(1);
  };

  const hasActiveTableFilters = tableRegion !== 'all' || tableRestaurant !== 'all' || tableSpecialist !== 'all' || tableShiftType !== 'all' || tableActivity !== 'all' || tableAssignmentFilter !== 'all' || tableSearch !== '';

  // Exportar a Excel
  const handleExportExcel = () => {
    const rows = filteredSchedules.map(s => {
      const rest = s.restaurant_id ? restMap.get(s.restaurant_id) : undefined;
      const restRegion = (rest?.region || (rest?.zone ? zoneToRegionMap.get(rest.zone.toUpperCase()) : '') || 'N/A').toUpperCase();
      const leader = rest?.zone ? (zoneToLeaderMap.get(rest.zone.toUpperCase()) || rest.zone) : 'N/A';

      return {
        'Fecha': s.date,
        'Especialista': resolveSpecialistName(s.employee_id),
        'Tipo de Jornada': s.shift_type,
        'Hora Entrada': s.check_in || '',
        'Hora Salida': s.check_out || '',
        'Región': restRegion,
        'Jefe de Área': leader,
        'CECO Tienda': s.restaurant_id || 'N/A',
        'Nombre Tienda': rest ? rest.name : 'Sin tienda específica',
        'Actividad': normalizeActivityName(s.activity) || '—',
        'Observaciones': s.custom_message || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Planificacion');
    XLSX.writeFile(wb, `Reporte_Planificacion_${startDate}_a_${endDate}.xlsx`);
  };

  // Paginación
  const totalPages = Math.ceil(filteredSchedules.length / pageSize) || 1;
  const paginatedSchedules = filteredSchedules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Tiendas filtradas para el tab de Cobertura
  const filteredCoverageStores = useMemo(() => {
    return coverageData.storeStats.filter(s => {
      if (coverageStoreFilter === 'unvisited') return !s.isVisited;
      if (coverageStoreFilter === 'visited') return s.isVisited;
      return true;
    });
  }, [coverageData.storeStats, coverageStoreFilter]);

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
        <div className="bg-white px-6 py-3.5 flex items-center justify-between gap-4 border-b border-slate-200 shrink-0">
          {/* Título Limpio */}
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 uppercase leading-tight">
              Reporte de Planificación
            </h2>
          </div>

          {/* Acciones & Menú Desplegable */}
          <div className="flex items-center gap-2">
            {/* Menú Desplegable con Cobertura, Reporte General y Exportar Excel */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  isMenuOpen 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                }`}
                title="Menú de navegación y opciones"
              >
                <Menu className="w-4 h-4" />
                <span className="font-black uppercase text-[11px] tracking-wider">Menú</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-[100050] animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  {/* Opción 1: Cobertura Visitas */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab('coverage');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeViewTab === 'coverage'
                        ? 'bg-slate-100 text-slate-900 font-black'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapIcon className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Cobertura Visitas</span>
                    </div>
                    {activeViewTab === 'coverage' && <Check className="w-4 h-4 text-slate-900 shrink-0" />}
                  </button>

                  {/* Opción 2: Reporte General */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewTab('details');
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeViewTab === 'details'
                        ? 'bg-slate-100 text-slate-900 font-black'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Reporte General</span>
                    </div>
                    {activeViewTab === 'details' && <Check className="w-4 h-4 text-slate-900 shrink-0" />}
                  </button>

                  {/* Opción 3: Descargar Excel */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportExcel();
                      setIsMenuOpen(false);
                    }}
                    disabled={filteredSchedules.length === 0}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Descargar Excel</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200/80 rounded-xl transition cursor-pointer active:scale-95"
              title="Cerrar reporte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BARRA DE FILTROS JUSTIFICADOS A LA IZQUIERDA ──────────────────────── */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-2.5 shrink-0 flex flex-wrap items-center justify-start gap-2.5">
          
          {/* 1. Selector de Rango Custom Popover (Limpio, solo calendario) */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(prev => !prev)}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs transition text-xs font-bold text-slate-800 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-[10px] font-black text-slate-400 uppercase">Periodo:</span>
              <span className="font-mono text-xs text-slate-800">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDatePickerOpen ? 'rotate-180 text-red-600' : ''}`} />
            </button>

            {/* Popover con clic afuera controlado (100% React Calendar) */}
            {isDatePickerOpen && (
              <div 
                className="absolute left-0 top-full mt-2 z-[100030] bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 w-[330px] sm:w-[350px] animate-in fade-in zoom-in-95 duration-150 select-none"
                onClick={e => e.stopPropagation()}
              >
                {/* Header del Calendario con Navegación de Mes/Año */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevCalMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs uppercase tracking-wider text-slate-900">
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][calMonth]} {calYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextCalMonth}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 text-center mt-2.5 mb-1.5">
                  {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(w => (
                    <span key={w} className="text-[10px] font-black text-slate-400">
                      {w}
                    </span>
                  ))}
                </div>

                {/* Matriz de Días */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map(cell => {
                    const isStart = tempStartDate === cell.dateStr;
                    const isEnd = tempEndDate === cell.dateStr;
                    const isSelected = isStart || isEnd;
                    
                    const effectiveEnd = tempEndDate || (hoverDate && tempStartDate && hoverDate > tempStartDate ? hoverDate : '');
                    const inRange = tempStartDate && effectiveEnd && cell.dateStr >= tempStartDate && cell.dateStr <= effectiveEnd;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => handleSelectDay(cell.dateStr)}
                        onMouseEnter={() => {
                          if (tempStartDate && !tempEndDate) {
                            setHoverDate(cell.dateStr);
                          }
                        }}
                        className={`h-8 w-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white font-black rounded-xl shadow-xs scale-105 z-10'
                            : inRange
                            ? 'bg-red-50 text-red-700 font-black rounded-none'
                            : cell.isCurrentMonth
                            ? 'text-slate-800 hover:bg-slate-100 rounded-lg'
                            : 'text-slate-300 hover:bg-slate-50 rounded-lg'
                        }`}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Resumen del Rango Seleccionado */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-600">
                    {tempStartDate ? (
                      <span>
                        <strong className="text-slate-900">{formatDateDisplay(tempStartDate)}</strong>
                        {tempEndDate ? (
                          <> – <strong className="text-slate-900">{formatDateDisplay(tempEndDate)}</strong></>
                        ) : (
                          <span className="text-red-500 font-medium ml-1"> (Elige fin)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">Selecciona rango</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tempStartDate) {
                          setStartDate(tempStartDate);
                          setEndDate(tempEndDate || tempStartDate);
                          setIsDatePickerOpen(false);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filtros Dropdown Avanzados (Solo visibles en la pestaña de Detalle y Resumen de Turnos) */}
          {activeViewTab === 'details' && (
            <>
              {/* 2. Filtro Región */}
              <div className="flex items-center">
                <select
                  value={tableRegion}
                  onChange={e => {
                    setTableRegion(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Todas las Regiones ({allRegions.length})</option>
                  {allRegions.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              {/* 3. Filtro Especialista */}
              <div className="flex items-center">
                <select
                  value={tableSpecialist}
                  onChange={e => { setTableSpecialist(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs max-w-[180px] truncate"
                >
                  <option value="all">Todos los Especialistas ({activeSpecialistIds.length})</option>
                  {activeSpecialistIds.map(id => (
                    <option key={id} value={id}>{resolveSpecialistName(id)}</option>
                  ))}
                </select>
              </div>

              {/* 4. Filtro Tipo de Turno */}
              <div className="flex items-center">
                <select
                  value={tableShiftType}
                  onChange={e => { setTableShiftType(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Todos los Turnos</option>
                  <option value="Laboral">Laboral</option>
                  <option value="Descanso">Descanso (Día Libre)</option>
                  <option value="Capacitación">Capacitación</option>
                  <option value="Incapacidad">Incapacidad</option>
                </select>
              </div>

              {/* 5. Filtro Actividad */}
              <div className="flex items-center">
                <select
                  value={tableActivity}
                  onChange={e => { setTableActivity(e.target.value); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs max-w-[160px] truncate"
                >
                  <option value="all">Todas las Actividades</option>
                  {uniqueActivities.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              {/* 6. Filtro Asignación Tienda (Asignados / No Asignados) */}
              <div className="flex items-center">
                <select
                  value={tableAssignmentFilter}
                  onChange={e => {
                    setTableAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned');
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">Todas las Asignaciones</option>
                  <option value="assigned">Con Tienda Asignada</option>
                  <option value="unassigned">No Asignados (Sin Tienda)</option>
                </select>
              </div>

              {/* Botón Reset Filtros de Tabla */}
              {hasActiveTableFilters && (
                <button
                  onClick={handleResetTableFilters}
                  className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  title="Restablecer todos los filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* ── CONTENIDO PRINCIPAL POR VISTAS ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 space-y-6">

          {/* ══════════════════════════════════════════════════════════════════════
              VISTA 1: DASHBOARD DE COBERTURA DE VISITAS (JERÁRQUICO / DRILL-DOWN)
             ══════════════════════════════════════════════════════════════════════ */}
          {activeViewTab === 'coverage' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tarjetas KPI de Cobertura */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                
                {/* % Cobertura */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Cobertura Global</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {coverageData.scopeCoveragePct}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {coverageData.visitedScopeStores} de {coverageData.totalScopeStores} tiendas
                  </p>
                </div>

                {/* Total Visitas */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Visitas</span>
                    <Briefcase className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {coverageData.totalScopeVisits}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Turnos en tienda</p>
                </div>

                {/* Tiendas Sin Visitas (Alerta) */}
                <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xs bg-red-50/20">
                  <div className="flex items-center justify-between text-red-500 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Sin Cobertura</span>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-black text-red-600 tracking-tight">
                    {coverageData.unvisitedScopeStores}
                  </p>
                  <p className="text-[10px] text-red-500 font-bold mt-1">0 visitas registradas</p>
                </div>

                {/* Tiendas Cubiertas */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Tiendas Cubiertas</span>
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {coverageData.visitedScopeStores}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Con al menos 1 visita</p>
                </div>

                {/* Especialistas Activos */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Especialistas</span>
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {activeSpecialistIds.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">En el período</p>
                </div>

                {/* Promedio Visitas / Tienda */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Promedio / Tienda</span>
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {coverageData.totalScopeStores > 0 ? (coverageData.totalScopeVisits / coverageData.totalScopeStores).toFixed(1) : '0'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">visitas por local</p>
                </div>
              </div>

              {/* ── CONDICIONAL: SI NO HAY REGIÓN SELECCIONADA -> MOSTRAR SOLO REGIONES ──────────── */}
              {coverageRegion === 'all' ? (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
                      Cobertura por Regiones
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                    {coverageData.regionStats.map(stat => (
                      <div
                        key={stat.region}
                        onClick={() => {
                          setCoverageRegion(stat.region);
                          setCoverageZone('all');
                        }}
                        className="p-5 rounded-2xl border border-slate-200 hover:border-red-500 hover:bg-red-50/20 bg-white shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-base text-slate-900 uppercase tracking-tight group-hover:text-red-700 transition">
                              {stat.region}
                            </span>
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                              stat.coveragePct >= 80 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : stat.coveragePct >= 50
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {stat.coveragePct}%
                            </span>
                          </div>

                          {/* Barra de progreso de cobertura */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3.5 shadow-inner">
                            <div 
                              style={{ width: `${stat.coveragePct}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                stat.coveragePct >= 80 ? 'bg-emerald-500' : stat.coveragePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/80 text-xs font-bold text-slate-500">
                          <span>{stat.totalVisits} visitas registradas</span>
                          <span className="text-red-600 font-black flex items-center gap-1 group-hover:translate-x-1 transition">
                            Explorar <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── CONDICIONAL: REGIÓN SELECCIONADA -> MOSTRAR JEFES DE ÁREA SEGUIDO DE TIENDAS ── */
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* ── 2. JEFES DE ÁREA DE LA REGIÓN SELECCIONADA ───────────── */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCoverageRegion('all');
                            setCoverageZone('all');
                          }}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0"
                          title="Volver a Regiones"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                          Jefes de Área {coverageRegion}
                        </h3>
                      </div>

                      {coverageZone !== 'all' && (
                        <button
                          onClick={() => setCoverageZone('all')}
                          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Ver todos los jefes de {coverageRegion}</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {coverageData.zoneStats.map(zStat => {
                        const isSelected = coverageZone.toUpperCase() === zStat.zone.toUpperCase();
                        return (
                          <div
                            key={zStat.zone}
                            onClick={() => {
                              setCoverageZone(isSelected ? 'all' : zStat.zone);
                            }}
                            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                              isSelected 
                                ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/30' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white shadow-2xs text-slate-900'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-black text-sm uppercase tracking-tight truncate">
                                    {zStat.leaderName}
                                  </h4>
                                  <p className={`text-[10.5px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                    Zona: {zStat.zone}
                                  </p>
                                </div>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : zStat.coveragePct >= 80 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : zStat.coveragePct >= 50
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {zStat.coveragePct}%
                                </span>
                              </div>

                              {/* Barra de progreso */}
                              <div className={`w-full h-2 rounded-full overflow-hidden mt-3 shadow-inner ${isSelected ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <div 
                                  style={{ width: `${zStat.coveragePct}%` }}
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isSelected ? 'bg-red-500' : zStat.coveragePct >= 80 ? 'bg-emerald-500' : zStat.coveragePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                />
                              </div>
                            </div>

                            <div className={`flex items-center justify-between mt-3 pt-2 text-[11px] font-bold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              <span>{zStat.totalVisits} visitas en total</span>
                              <span className={isSelected ? 'text-red-400 font-bold' : 'text-red-600'}>
                                {isSelected ? '✓ Seleccionado' : 'Filtrar Tiendas ➔'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── 3. DETALLE DE TIENDAS DE LA REGIÓN / JEFE SELECCIONADO ───────────── */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
                    <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                          Tiendas en {coverageRegion} {coverageZone !== 'all' ? `(Jefe: ${zoneToLeaderMap.get(coverageZone) || coverageZone})` : ''} ({filteredCoverageStores.length} Locales)
                        </h3>
                      </div>

                      {/* Filtro rápido: Todas / Sin visitas / Con visitas */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                        <button
                          onClick={() => setCoverageStoreFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                            coverageStoreFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Todas ({coverageData.storeStats.length})
                        </button>
                        <button
                          onClick={() => setCoverageStoreFilter('unvisited')}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition cursor-pointer flex items-center gap-1.5 ${
                            coverageStoreFilter === 'unvisited' ? 'bg-red-600 text-white shadow-xs' : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Sin Visitas ({coverageData.unvisitedScopeStores})
                        </button>
                        <button
                          onClick={() => setCoverageStoreFilter('visited')}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                            coverageStoreFilter === 'visited' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          Con Visitas ({coverageData.visitedScopeStores})
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">CECO</th>
                            <th className="py-3 px-4">Nombre de Tienda</th>
                            <th className="py-3 px-4">Región</th>
                            <th className="py-3 px-4">Jefe de Área / Zona</th>
                            <th className="py-3 px-4 text-center">Visitas en Periodo</th>
                            <th className="py-3 px-4">Especialistas que Visitaron</th>
                            <th className="py-3 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filteredCoverageStores.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                                No se encontraron tiendas para los criterios seleccionados
                              </td>
                            </tr>
                          ) : (
                            filteredCoverageStores.map(s => (
                              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                                  {s.id}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-slate-900">
                                  {s.name}
                                </td>
                                <td className="py-2.5 px-4 text-slate-600 font-bold uppercase text-[11px]">
                                  {s.region}
                                </td>
                                <td className="py-2.5 px-4 text-slate-600">
                                  <span className="font-bold text-slate-800">{s.leaderName}</span>
                                  <span className="text-[10px] text-slate-400 block">{s.zone}</span>
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                                    s.visits === 0 
                                      ? 'bg-red-50 text-red-700 border border-red-200' 
                                      : s.visits >= 3 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}>
                                    {s.visits === 0 ? '0 Visitas' : `${s.visits} Visitas`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  {s.specialists.length === 0 ? (
                                    <span className="text-xs text-red-500 font-medium italic">Sin visitas en el rango</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {s.specialists.map(sp => (
                                        <span key={sp} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                                          {sp}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setTableRestaurant(s.id);
                                      setTableRegion('all');
                                      setTableZone('all');
                                      setActiveViewTab('details');
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Ver Turnos
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VISTA 2: DETALLE Y RESUMEN COMBINADO DE TURNOS
             ══════════════════════════════════════════════════════════════════════ */}
          {activeViewTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Tarjetas KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Horas</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.totalHours} <span className="text-xs font-bold text-slate-400">hrs</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">Promedio: {metrics.avgHoursPerSpecialist} hrs/esp</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Laborales</span>
                    <Briefcase className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.laboralCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Turnos en campo</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Descansos</span>
                    <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.descansoCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Días libres</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Capacitaciones</span>
                    <GraduationCap className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.capacitacionCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Sesiones formativas</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Especialistas</span>
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.uniqueSpecialistsCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Con asignación</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">Tiendas Cubiertas</span>
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.uniqueStoresCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Locales visitados</p>
                </div>
              </div>

              {/* Distribuciones y Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Distribución de Jornadas */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-red-600" />
                      Distribución de Jornadas
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">{metrics.totalSchedules} registros</span>
                  </div>

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
              </div>

              {/* Tabla Detallada de Programación Diaria */}
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

              {/* Tabla sin columna Horas y sin ID del especialista */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Especialista</th>
                      <th className="py-3 px-4">Tipo Jornada</th>
                      <th className="py-3 px-4">Horario</th>
                      <th className="py-3 px-4">Tienda / CECO</th>
                      <th className="py-3 px-4">Actividad</th>
                      <th className="py-3 px-4">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          Cargando reportes de programación...
                        </td>
                      </tr>
                    ) : paginatedSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          No se encontraron registros para los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      paginatedSchedules.map((s, idx) => {
                        const style = SHIFT_TYPE_COLORS[s.shift_type] || SHIFT_TYPE_COLORS['Laboral'];
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-xs font-bold text-slate-900">
                              {s.date}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-900 text-xs">
                                {resolveSpecialistName(s.employee_id)}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                {s.shift_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-600">
                              {s.check_in && s.check_out ? `${s.check_in} - ${s.check_out}` : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              {s.restaurant_id ? (
                                <div className="font-bold text-slate-800 truncate max-w-[200px]">
                                  {resolveRestaurantName(s.restaurant_id)}
                                </div>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                                  No Asignado
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-700">
                              {normalizeActivityName(s.activity) || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[220px] truncate" title={s.custom_message}>
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
        )}

        </div>
      </div>
    </div>,
    document.body
  );
};
