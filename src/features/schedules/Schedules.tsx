import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { UserRole, DailySchedule, User, Restaurant, ScheduleRequest, ScheduleRequestType } from '@/types';
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
  AlertCircle,
  Download,
  MessageSquare,
  Send
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

const normalizeTime = (time?: string): string => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return '';
  const h = parts[0].trim().padStart(2, '0');
  const m = parts[1].trim().padStart(2, '0');
  return `${h}:${m}`;
};

interface CatalogShift {
  id: number;
  checkIn: string;
  checkOut: string;
  hours: number;
  break: number;
}

const SHIFT_CATALOG_LIST: CatalogShift[] = [
  { id: 6, checkIn: '08:00', checkOut: '14:00', hours: 6, break: 0 },
  { id: 12, checkIn: '09:00', checkOut: '13:00', hours: 4, break: 0 },
  { id: 13, checkIn: '09:00', checkOut: '14:00', hours: 5, break: 0 },
  { id: 14, checkIn: '09:00', checkOut: '15:00', hours: 6, break: 0 },
  { id: 20, checkIn: '10:00', checkOut: '14:00', hours: 4, break: 0 },
  { id: 21, checkIn: '10:00', checkOut: '15:00', hours: 5, break: 0 },
  { id: 22, checkIn: '10:00', checkOut: '16:00', hours: 6, break: 0 },
  { id: 28, checkIn: '11:00', checkOut: '15:00', hours: 4, break: 0 },
  { id: 29, checkIn: '11:00', checkOut: '16:00', hours: 5, break: 0 },
  { id: 36, checkIn: '12:00', checkOut: '16:00', hours: 4, break: 0 },
  { id: 37, checkIn: '12:00', checkOut: '17:00', hours: 5, break: 0 },
  { id: 107, checkIn: '18:00', checkOut: '22:00', hours: 4, break: 0 },
  { id: 145, checkIn: '17:00', checkOut: '22:00', hours: 5, break: 0 },
  { id: 146, checkIn: '17:00', checkOut: '23:00', hours: 6, break: 0 },
  { id: 147, checkIn: '18:00', checkOut: '23:00', hours: 5, break: 0 },
  { id: 148, checkIn: '18:00', checkOut: '00:00', hours: 6, break: 0 },
  { id: 174, checkIn: '06:00', checkOut: '12:00', hours: 6, break: 0 },
  { id: 175, checkIn: '07:00', checkOut: '13:00', hours: 6, break: 0 },
  { id: 176, checkIn: '11:00', checkOut: '17:00', hours: 6, break: 0 },
  { id: 177, checkIn: '12:00', checkOut: '18:00', hours: 6, break: 0 },
  { id: 178, checkIn: '16:00', checkOut: '22:00', hours: 6, break: 0 },
  { id: 200, checkIn: '17:00', checkOut: '21:00', hours: 4, break: 0 },
  { id: 206, checkIn: '19:00', checkOut: '23:00', hours: 4, break: 0 },
  { id: 207, checkIn: '19:00', checkOut: '00:00', hours: 5, break: 0 },
  { id: 208, checkIn: '19:00', checkOut: '01:00', hours: 6, break: 0 },
  { id: 209, checkIn: '20:00', checkOut: '00:00', hours: 4, break: 0 },
  { id: 210, checkIn: '20:00', checkOut: '01:00', hours: 5, break: 0 },
  { id: 211, checkIn: '20:00', checkOut: '02:00', hours: 6, break: 0 },
  { id: 212, checkIn: '15:00', checkOut: '21:00', hours: 6, break: 0 },
  { id: 213, checkIn: '16:00', checkOut: '21:00', hours: 5, break: 0 },
  { id: 215, checkIn: '21:00', checkOut: '01:00', hours: 4, break: 0 },
  { id: 216, checkIn: '21:00', checkOut: '02:00', hours: 5, break: 0 },
  { id: 218, checkIn: '23:00', checkOut: '05:00', hours: 6, break: 0 },
  { id: 220, checkIn: '13:00', checkOut: '17:00', hours: 4, break: 0 },
  { id: 221, checkIn: '13:00', checkOut: '18:00', hours: 5, break: 0 },
  { id: 222, checkIn: '13:00', checkOut: '19:00', hours: 6, break: 0 },
  { id: 224, checkIn: '16:00', checkOut: '20:00', hours: 4, break: 0 },
  { id: 226, checkIn: '07:00', checkOut: '11:00', hours: 4, break: 0 },
  { id: 227, checkIn: '07:00', checkOut: '12:00', hours: 5, break: 0 },
  { id: 228, checkIn: '08:00', checkOut: '12:00', hours: 4, break: 0 },
  { id: 229, checkIn: '08:00', checkOut: '13:00', hours: 5, break: 0 },
  { id: 230, checkIn: '14:00', checkOut: '18:00', hours: 4, break: 0 },
  { id: 231, checkIn: '14:00', checkOut: '19:00', hours: 5, break: 0 },
  { id: 232, checkIn: '14:00', checkOut: '20:00', hours: 6, break: 0 },
  { id: 233, checkIn: '15:00', checkOut: '19:00', hours: 4, break: 0 },
  { id: 234, checkIn: '15:00', checkOut: '20:00', hours: 5, break: 0 },
  { id: 236, checkIn: '21:00', checkOut: '03:00', hours: 6, break: 0 },
  { id: 237, checkIn: '22:00', checkOut: '02:00', hours: 4, break: 0 },
  { id: 238, checkIn: '22:00', checkOut: '03:00', hours: 5, break: 0 },
  { id: 239, checkIn: '00:00', checkOut: '06:00', hours: 6, break: 0 },
  { id: 254, checkIn: '22:00', checkOut: '04:00', hours: 6, break: 0 },
  { id: 256, checkIn: '06:00', checkOut: '15:00', hours: 8, break: 1 },
  { id: 257, checkIn: '07:00', checkOut: '15:00', hours: 7, break: 1 },
  { id: 258, checkIn: '07:00', checkOut: '16:00', hours: 8, break: 1 },
  { id: 259, checkIn: '07:00', checkOut: '17:00', hours: 9, break: 1 },
  { id: 260, checkIn: '08:00', checkOut: '16:00', hours: 7, break: 1 },
  { id: 261, checkIn: '08:00', checkOut: '17:00', hours: 8, break: 1 },
  { id: 262, checkIn: '08:00', checkOut: '18:00', hours: 9, break: 1 },
  { id: 263, checkIn: '09:00', checkOut: '17:00', hours: 7, break: 1 },
  { id: 264, checkIn: '09:00', checkOut: '18:00', hours: 8, break: 1 },
  { id: 265, checkIn: '09:00', checkOut: '19:00', hours: 9, break: 1 },
  { id: 266, checkIn: '10:00', checkOut: '18:00', hours: 7, break: 1 },
  { id: 267, checkIn: '10:00', checkOut: '19:00', hours: 8, break: 1 },
  { id: 268, checkIn: '10:00', checkOut: '20:00', hours: 9, break: 1 },
  { id: 269, checkIn: '11:00', checkOut: '19:00', hours: 7, break: 1 },
  { id: 270, checkIn: '11:00', checkOut: '20:00', hours: 8, break: 1 },
  { id: 271, checkIn: '11:00', checkOut: '21:00', hours: 9, break: 1 },
  { id: 272, checkIn: '12:00', checkOut: '20:00', hours: 7, break: 1 },
  { id: 273, checkIn: '12:00', checkOut: '21:00', hours: 8, break: 1 },
  { id: 274, checkIn: '12:00', checkOut: '22:00', hours: 9, break: 1 },
  { id: 275, checkIn: '13:00', checkOut: '21:00', hours: 7, break: 1 },
  { id: 276, checkIn: '13:00', checkOut: '22:00', hours: 8, break: 1 },
  { id: 277, checkIn: '13:00', checkOut: '23:00', hours: 9, break: 1 },
  { id: 278, checkIn: '14:00', checkOut: '22:00', hours: 7, break: 1 },
  { id: 279, checkIn: '14:00', checkOut: '23:00', hours: 8, break: 1 },
  { id: 280, checkIn: '14:00', checkOut: '00:00', hours: 9, break: 1 },
  { id: 281, checkIn: '15:00', checkOut: '23:00', hours: 7, break: 1 },
  { id: 282, checkIn: '15:00', checkOut: '00:00', hours: 8, break: 1 },
  { id: 283, checkIn: '15:00', checkOut: '01:00', hours: 9, break: 1 },
  { id: 284, checkIn: '16:00', checkOut: '00:00', hours: 7, break: 1 },
  { id: 285, checkIn: '16:00', checkOut: '01:00', hours: 8, break: 1 },
  { id: 286, checkIn: '16:00', checkOut: '02:00', hours: 9, break: 1 },
  { id: 287, checkIn: '17:00', checkOut: '01:00', hours: 7, break: 1 },
  { id: 288, checkIn: '17:00', checkOut: '02:00', hours: 8, break: 1 },
  { id: 289, checkIn: '17:00', checkOut: '03:00', hours: 9, break: 1 },
  { id: 290, checkIn: '18:00', checkOut: '02:00', hours: 7, break: 1 },
  { id: 291, checkIn: '18:00', checkOut: '03:00', hours: 8, break: 1 },
  { id: 292, checkIn: '18:00', checkOut: '04:00', hours: 9, break: 1 },
  { id: 293, checkIn: '19:00', checkOut: '03:00', hours: 7, break: 1 },
  { id: 294, checkIn: '19:00', checkOut: '04:00', hours: 8, break: 1 },
  { id: 295, checkIn: '19:00', checkOut: '05:00', hours: 9, break: 1 },
  { id: 296, checkIn: '20:00', checkOut: '04:00', hours: 7, break: 1 },
  { id: 297, checkIn: '20:00', checkOut: '05:00', hours: 8, break: 1 },
  { id: 298, checkIn: '20:00', checkOut: '06:00', hours: 9, break: 1 },
  { id: 299, checkIn: '21:00', checkOut: '05:00', hours: 7, break: 1 },
  { id: 300, checkIn: '21:00', checkOut: '06:00', hours: 8, break: 1 },
  { id: 301, checkIn: '22:00', checkOut: '06:00', hours: 7, break: 1 }
];

const SHIFT_CATALOG: Record<string, number> = {};
SHIFT_CATALOG_LIST.forEach(item => {
  SHIFT_CATALOG[`${item.checkIn}-${item.checkOut}`] = item.id;
  if (item.checkOut === '00:00') {
    SHIFT_CATALOG[`${item.checkIn}-24:00`] = item.id;
  }
});

/**
 * Calcula la fecha de Pascua (algoritmo de Gauss)
 */
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const M = (15 - p + k - q) % 30;
  const N = (4 + k - q) % 7;
  const d = (19 * a + M) % 30;
  const e = (2 * b + 4 * c + 6 * d + N) % 7;
  const day = 22 + d + e;
  
  const easter = new Date(year, 2, 1);
  easter.setDate(day);
  return easter;
};

/**
 * Obtiene el siguiente lunes para las festividades que se trasladan (Ley Emiliani)
 */
const getNextMondayEmiliani = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  if (day !== 1) {
    const diff = day === 0 ? 1 : 8 - day;
    result.setDate(result.getDate() + diff);
  }
  return result;
};

/**
 * Devuelve el nombre del festivo colombiano para una fecha dada, o null si no es festivo
 */
const getColombianHoliday = (date: Date): string | null => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  
  const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  const fixedHolidays: Record<string, string> = {
    [`${y}-01-01`]: 'Año Nuevo',
    [`${y}-05-01`]: 'Día del Trabajo',
    [`${y}-07-20`]: 'Día de la Independencia',
    [`${y}-08-07`]: 'Batalla de Boyacá',
    [`${y}-12-08`]: 'Inmaculada Concepción',
    [`${y}-12-25`]: 'Navidad',
  };
  
  if (fixedHolidays[dateKey]) {
    return fixedHolidays[dateKey];
  }
  
  const emilianiHolidays: { m: number; d: number; name: string }[] = [
    { m: 0, d: 6, name: 'Día de los Reyes Magos' },
    { m: 2, d: 19, name: 'Día de San José' },
    { m: 5, d: 29, name: 'San Pedro y San Pablo' },
    { m: 7, d: 15, name: 'Asunción de la Virgen' },
    { m: 9, d: 12, name: 'Día de la Raza' },
    { m: 10, d: 1, name: 'Todos los Santos' },
    { m: 10, d: 11, name: 'Independencia de Cartagena' },
  ];
  
  for (const h of emilianiHolidays) {
    const hDate = new Date(y, h.m, h.d);
    const actualMonday = getNextMondayEmiliani(hDate);
    if (actualMonday.getMonth() === m && actualMonday.getDate() === d) {
      return h.name;
    }
  }
  
  const easter = getEasterSunday(y);
  
  const juevesSanto = new Date(easter);
  juevesSanto.setDate(easter.getDate() - 3);
  if (juevesSanto.getMonth() === m && juevesSanto.getDate() === d) {
    return 'Jueves Santo';
  }
  
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  if (viernesSanto.getMonth() === m && viernesSanto.getDate() === d) {
    return 'Viernes Santo';
  }
  
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 43);
  if (ascension.getMonth() === m && ascension.getDate() === d) {
    return 'Ascensión del Señor';
  }
  
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 64);
  if (corpusChristi.getMonth() === m && corpusChristi.getDate() === d) {
    return 'Corpus Christi';
  }
  
  const sagradoCorazon = new Date(easter);
  sagradoCorazon.setDate(easter.getDate() + 71);
  if (sagradoCorazon.getMonth() === m && sagradoCorazon.getDate() === d) {
    return 'Sagrado Corazón de Jesús';
  }
  
  return null;
};

const Schedules: React.FC = () => {
  const { auth, restaurants } = useAppStore();
  const hierarchy = dataService.getHierarchy();
  const isReadOnly = auth.user?.role === UserRole.SPECIALIST || auth.user?.role === UserRole.GUEST;
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Advanced Filtering State
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');

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
  const [selectedShiftId, setSelectedShiftId] = useState<number | ''>('');
  const [modalRestaurantId, setModalRestaurantId] = useState('');
  const [modalActivity, setModalActivity] = useState('');
  const [modalNoRestaurant, setModalNoRestaurant] = useState(false);
  const [modalEnableMessage, setModalEnableMessage] = useState(false);
  const [modalCustomMessage, setModalCustomMessage] = useState('');
  const [usersVersion, setUsersVersion] = useState(0);
  const [isSavingShift, setIsSavingShift] = useState(false);

  // ── Schedule Request Modal (Specialist) ───────────────────────────────────
  const [requestModal, setRequestModal] = useState<{
    specialist: User;
    date: string;
    dayName: string;
    existingRequest?: ScheduleRequest;
  } | null>(null);
  const [reqType, setReqType] = useState<ScheduleRequestType>('Descanso');
  const [reqShiftId, setReqShiftId] = useState<number | ''>('');
  const [reqComments, setReqComments] = useState('');
  const [isSavingRequest, setIsSavingRequest] = useState(false);

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
  const loadWeekSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const startStr = weekDays[0].dateStr;
      const endStr = weekDays[6].dateStr;
      const [data, requests] = await Promise.all([
        dataService.getSchedulesForDateRange(startStr, endStr),
        dataService.getScheduleRequestsForDateRange(startStr, endStr)
      ]);
      setSchedules(data);
      setScheduleRequests(requests);
    } catch (err) {
      console.error('[Schedules] Error al cargar horarios:', err);
      showToast('Error al cargar horarios de la base de datos.', true);
    } finally {
      setIsLoading(false);
    }
  }, [weekDays]);

  useEffect(() => {
    loadWeekSchedules();
  }, [currentWeekMonday, loadWeekSchedules]);

  // ── Request helpers ───────────────────────────────────────────────────────
  // Returns true if the given date belongs to a future week (not the current one)
  const isFutureWeek = useMemo(() => {
    const thisMonday = getMonday(new Date());
    return currentWeekMonday.getTime() > thisMonday.getTime();
  }, [currentWeekMonday]);

  const getCellRequest = (specialistId: string, dateStr: string): ScheduleRequest | undefined => {
    return scheduleRequests.find(r => r.employee_id === specialistId && r.date === dateStr);
  };

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

  // Allowed regions for the current user
  const allowedRegions = useMemo(() => {
    if (!auth.user) return [];
    if (auth.user.role === UserRole.ADMIN) {
      return hierarchy.regions.map(r => r.name);
    }
    return auth.user.assignedRegions || [];
  }, [auth.user, hierarchy]);

  // Allowed zones based on selectedRegion or all allowed regions
  const allowedZones = useMemo(() => {
    if (!auth.user) return [];
    const regionsToUse = selectedRegion 
      ? hierarchy.regions.filter(r => r.name === selectedRegion)
      : hierarchy.regions.filter(r => allowedRegions.includes(r.name));
      
    const zonesSet = new Set<string>();
    regionsToUse.forEach(r => {
      r.zones.forEach(z => {
        zonesSet.add(z.name);
      });
    });
    return Array.from(zonesSet);
  }, [auth.user, hierarchy, allowedRegions, selectedRegion]);

  // Allowed restaurants based on selectedRegion / selectedZone or user scope
  const allowedRestaurantsForFilter = useMemo(() => {
    if (!auth.user) return [];
    
    let list = restaurants;
    
    if (selectedRegion) {
      list = list.filter(r => r.region === selectedRegion);
    } else {
      list = list.filter(r => allowedRegions.includes(r.region));
    }
    
    if (selectedZone) {
      list = list.filter(r => r.zone === selectedZone);
    } else if (allowedZones.length > 0) {
      list = list.filter(r => allowedZones.includes(r.zone));
    }
    
    // Filter based on user scope if not ADMIN
    if (auth.user.role !== UserRole.ADMIN) {
      const currentUser = auth.user;
      list = list.filter(r => {
        if (currentUser.assignedRegions?.includes(r.region)) return true;
        if (currentUser.assignedZones?.includes(r.zone)) return true;
        if (currentUser.assignedRestaurants?.includes(r.id)) return true;
        return false;
      });
    }
    
    return list;
  }, [auth.user, restaurants, allowedRegions, allowedZones, selectedRegion, selectedZone]);

  // Get visible specialists using same visibility rules & dropdown filters
  const visibleSpecialists = useMemo(() => {
    const allUsers = dataService.getUsers();
    const specialists = allUsers.filter(u => u.role === UserRole.SPECIALIST);
    
    // 1. Filter by search term
    const term = searchTerm.trim().toLowerCase();
    let filtered = term 
      ? specialists.filter(u => u.username.toLowerCase().includes(term))
      : specialists;

    // 2. Filter by role visibility
    if (auth.user?.role !== UserRole.ADMIN) {
      const currentUser = auth.user!;
      if (currentUser.role === UserRole.SPECIALIST) {
        filtered = filtered.filter(u => u.id === currentUser.id);
      } else {
        filtered = filtered.filter(u => {
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
      }
    }

    // 3. Filter by selected Region drop-down
    if (selectedRegion) {
      filtered = filtered.filter(u => {
        const isAssigned = u.assignedRegions?.includes(selectedRegion);
        const hasZone = u.assignedZones?.some(z => {
          const reg = hierarchy.regions.find(r => r.zones.some(zone => zone.name === z));
          return reg?.name === selectedRegion;
        });
        const hasRest = u.assignedRestaurants?.some(rid => {
          const rest = restaurants.find(r => r.id === rid);
          return rest?.region === selectedRegion;
        });
        return isAssigned || hasZone || hasRest;
      });
    }

    // 4. Filter by selected Zone drop-down
    if (selectedZone) {
      filtered = filtered.filter(u => {
        const isAssigned = u.assignedZones?.includes(selectedZone);
        const hasRest = u.assignedRestaurants?.some(rid => {
          const rest = restaurants.find(r => r.id === rid);
          return rest?.zone === selectedZone;
        });
        return isAssigned || hasRest;
      });
    }

    // 5. Filter by selected Restaurant drop-down
    if (selectedRestaurant) {
      filtered = filtered.filter(u => {
        return u.assignedRestaurants?.includes(selectedRestaurant);
      });
    }

    return filtered;
  }, [auth.user, restaurants, hierarchy, searchTerm, selectedRegion, selectedZone, selectedRestaurant, usersVersion]);



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

  // Calculate daily shift hours (subtracting break time if applicable)
  const calculateHours = (s?: DailySchedule): number => {
    if (!s) return 0;
    if (s.shift_type === 'Capacitación') return 7;
    if (s.shift_type === 'Descanso' || s.shift_type === 'Incapacidad') return 0;
    if (s.shift_type === 'Laboral' && s.check_in && s.check_out) {
      const key = `${normalizeTime(s.check_in)}-${normalizeTime(s.check_out)}`;
      const shiftId = SHIFT_CATALOG[key];
      if (shiftId !== undefined) {
        const catalogShift = SHIFT_CATALOG_LIST.find(cs => cs.id === shiftId);
        if (catalogShift) {
          return catalogShift.hours;
        }
      }
      try {
        const [inH, inM] = s.check_in.split(':').map(Number);
        const [outH, outM] = s.check_out.split(':').map(Number);
        let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes < 0) {
          diffMinutes += 24 * 60;
        }
        const elapsed = diffMinutes / 60;
        const breakHours = elapsed > 6 ? 1 : 0;
        return parseFloat((elapsed - breakHours).toFixed(1));
      } catch {
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

  // ── Handle request cell click (Specialist only) ──────────────────────────
  const handleRequestCellClick = (specialist: User, day: { name: string; dateStr: string }) => {
    if (!isFutureWeek) return; // Cannot request for current or past week
    const existing = getCellRequest(specialist.id, day.dateStr);
    setReqType(existing?.request_type || 'Descanso');
    setReqShiftId(existing?.requested_shift_id || '');
    setReqComments(existing?.comments || '');
    setRequestModal({ specialist, date: day.dateStr, dayName: day.name, existingRequest: existing });
  };

  const handleSaveRequest = async () => {
    if (!requestModal || !auth.user) return;
    setIsSavingRequest(true);
    try {
      const now = new Date().toISOString();
      const req: ScheduleRequest = {
        employee_id: requestModal.specialist.id,
        date: requestModal.date,
        request_type: reqType,
        requested_shift_id: reqType === 'Horario Específico' ? (reqShiftId || null) : null,
        comments: reqComments.trim() || undefined,
        status: 'PENDIENTE',
        created_at: requestModal.existingRequest?.created_at || now
      };
      await dataService.saveScheduleRequest(req);
      showToast('Solicitud enviada correctamente.');
      await loadWeekSchedules();
      setRequestModal(null);
    } catch (err) {
      console.error('[Schedules] Error al guardar solicitud:', err);
      showToast('Error al guardar la solicitud.', true);
    } finally {
      setIsSavingRequest(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestModal?.existingRequest) return;
    setIsSavingRequest(true);
    try {
      await dataService.deleteScheduleRequest(requestModal.specialist.id, requestModal.date);
      showToast('Solicitud cancelada.');
      await loadWeekSchedules();
      setRequestModal(null);
    } catch (err) {
      console.error('[Schedules] Error al cancelar solicitud:', err);
      showToast('Error al cancelar la solicitud.', true);
    } finally {
      setIsSavingRequest(false);
    }
  };

  const handleMarkRequestProcessed = async (req: ScheduleRequest) => {
    if (!req.id) return;
    try {
      await dataService.markScheduleRequestProcessed(req.id);
      showToast('Solicitud marcada como procesada.');
      await loadWeekSchedules();
    } catch (err) {
      console.error('[Schedules] Error al procesar solicitud:', err);
      showToast('Error al actualizar estado de la solicitud.', true);
    }
  };

  // Format a timestamp in a readable way for Colombia
  const formatRequestTimestamp = (isoStr?: string): string => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} a las ${pad(d.getHours())}:${pad(d.getMinutes())} hs`;
    } catch { return isoStr; }
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
      setModalActivity(sched.activity || '');
      setModalNoRestaurant(Boolean(sched.no_restaurant || (!sched.restaurant_id && (sched.shift_type === 'Laboral' || sched.shift_type === 'Capacitación'))));
      setModalEnableMessage(Boolean(sched.custom_message));
      setModalCustomMessage(sched.custom_message || '');
      
      if (sched.shift_type === 'Laboral' && sched.check_in && sched.check_out) {
        const key = `${normalizeTime(sched.check_in)}-${normalizeTime(sched.check_out)}`;
        setSelectedShiftId(SHIFT_CATALOG[key] || '');
      } else {
        setSelectedShiftId('');
      }
    } else {
      setModalShiftType('Laboral');
      setModalCheckIn('08:00');
      setModalCheckOut('17:00');
      setModalActivity('');
      setModalNoRestaurant(false);
      setModalEnableMessage(false);
      setModalCustomMessage('');
      setSelectedShiftId(13); // Turno 13: 08:00 - 17:00
      
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

    if (modalShiftType === 'Laboral') {
      const key = `${normalizeTime(modalCheckIn)}-${normalizeTime(modalCheckOut)}`;
      if (SHIFT_CATALOG[key] === undefined) {
        showToast('El horario seleccionado no pertenece al catálogo oficial de KFC y no puede asignarse.', true);
        return;
      }
    }

    setIsSavingShift(true);

    try {
      const finalRestaurantId = modalNoRestaurant ? undefined : ((modalShiftType === 'Laboral' || modalShiftType === 'Capacitación') && modalRestaurantId ? modalRestaurantId : undefined);
      const finalCustomMessage = modalEnableMessage && modalCustomMessage.trim() ? modalCustomMessage.trim().slice(0, 200) : undefined;

      const scheduleToSave: DailySchedule = {
        employee_id: selectedCell.specialist.id,
        date: selectedCell.date,
        shift_type: modalShiftType,
        check_in: modalShiftType === 'Laboral' ? modalCheckIn : undefined,
        check_out: modalShiftType === 'Laboral' ? modalCheckOut : undefined,
        restaurant_id: finalRestaurantId,
        no_restaurant: modalNoRestaurant,
        activity: (modalShiftType === 'Laboral' || modalShiftType === 'Capacitación') ? modalActivity : undefined,
        custom_message: finalCustomMessage
      };

      await dataService.saveDailySchedule(scheduleToSave);
      showToast('Horario Asignado');
      
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

  const getAvatarColors = (username: string) => {
    const colors = [
      { bg: 'bg-blue-50 border-blue-100 text-blue-700' },
      { bg: 'bg-purple-50 border-purple-100 text-purple-700' },
      { bg: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
      { bg: 'bg-amber-50 border-amber-100 text-amber-700' },
      { bg: 'bg-pink-50 border-pink-100 text-pink-700' },
      { bg: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
      { bg: 'bg-rose-50 border-rose-100 text-rose-700' },
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getWeekRangeLabel = () => {
    if (weekDays.length === 0) return '';
    const start = weekDays[0].dateObj;
    const end = weekDays[6].dateObj;
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
    const endStr = `${end.getDate()} ${months[end.getMonth()]}`;
    return `${startStr} - ${endStr}, ${end.getFullYear()}`;
  };

  const exportExcelTemplate = () => {
    try {
      const rows: {
        CC: string;
        'ID Turno': string | number;
        Dia: number;
        Mes: number;
        Año: number;
        'ID Centro de Costo': string;
      }[] = [];
      
      visibleSpecialists.forEach(spec => {
        weekDays.forEach(day => {
          const s = getCellSchedule(spec.id, day.dateStr);
          if (!s) return; // Omitir si no hay turno asignado este día
          
          let turnId: string | number = '';
          if (s.shift_type === 'Laboral' && s.check_in && s.check_out) {
            const key = `${normalizeTime(s.check_in)}-${normalizeTime(s.check_out)}`;
            turnId = SHIFT_CATALOG[key] || `${s.check_in}-${s.check_out}`;
          } else if (s.shift_type === 'Capacitación') {
            turnId = 'CAPACITACION';
          } else if (s.shift_type === 'Descanso') {
            turnId = -1;
          } else if (s.shift_type === 'Incapacidad') {
            turnId = 'INCAPACIDAD';
          }
          
          const [y, m, d] = s.date.split('-').map(Number);
          
          rows.push({
            'CC': spec.cedula || spec.id,
            'ID Turno': turnId,
            'Dia': d,
            'Mes': m,
            'Año': y,
            'ID Centro de Costo': 'ENTRENAMIENTO'
          });
        });
      });
      
      if (rows.length === 0) {
        showToast('No hay turnos programados en esta semana para exportar.', true);
        return;
      }
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla Planificación");
      
      const fileDate = weekDays[0].dateStr;
      XLSX.writeFile(wb, `Plantilla_Planificacion_${fileDate}.xlsx`);
      showToast('Plantilla de Excel exportada con éxito.');
    } catch (err) {
      console.error('[ExportExcel] Error:', err);
      showToast('Error al exportar la plantilla de Excel.', true);
    }
  };

  const todayStr = useMemo(() => formatDateString(new Date()), []);

  const visualizedRegion = useMemo(() => {
    if (selectedRegion) return selectedRegion;
    if (auth.user?.role === UserRole.ADMIN) return 'Nacional';
    const userRegions = auth.user?.assignedRegions || [];
    if (userRegions.length === 1) return userRegions[0];
    if (userRegions.length > 1) return 'Regional';
    return 'KFC';
  }, [selectedRegion, auth.user]);

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-4 rounded-2xl shadow-xl border animate-fade-in transition-all bg-white border-slate-100 max-w-sm">
          <div className={`w-3 h-3 rounded-full shrink-0 ${toast.isError ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            {/* Left side: filters */}
            <div className="flex flex-wrap items-end gap-3 flex-1">
              {/* 1. Filtrar por Región */}
              {auth.user?.role !== UserRole.SPECIALIST && auth.user?.role !== UserRole.GUEST && (
                <div className="w-full sm:w-auto min-w-[200px]">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">Filtrar por Región</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setSelectedZone('');
                      setSelectedRestaurant('');
                    }}
                    className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 outline-none transition-all h-[42px]"
                  >
                    <option value="">Todas las Regiones</option>
                    {allowedRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Limpiar Filtros */}
              {selectedRegion && (
                <button
                  onClick={() => {
                    setSelectedRegion('');
                    setSelectedZone('');
                    setSelectedRestaurant('');
                  }}
                  className="px-4 py-2 border border-dashed border-red-200 hover:border-red-600 text-red-500 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer h-[42px] flex items-center justify-center shrink-0"
                >
                  Limpiar Filtro
                </button>
              )}
            </div>

            {/* Right side: week navigation and export */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 mt-4 xl:mt-0">
              {/* Date navigators */}
              <div className="flex items-center border border-slate-200 bg-white p-1 rounded-xl shadow-sm h-[42px] shrink-0">
                <button 
                  onClick={handlePrevWeek} 
                  className="p-2 hover:bg-slate-50 rounded-lg hover:text-red-600 transition-all text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={handleCurrentWeek}
                  className="px-4 py-1.5 hover:bg-slate-50 text-slate-600 hover:text-red-655 text-xs font-black uppercase tracking-widest rounded-lg transition-all"
                >
                  Hoy
                </button>
                
                <button 
                  onClick={handleNextWeek} 
                  className="p-2 hover:bg-slate-50 rounded-lg hover:text-red-600 transition-all text-slate-400"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Week range label */}
              <div className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-slate-150 rounded-xl text-xs font-black text-slate-800 cursor-default shadow-sm h-[42px] shrink-0">
                <Calendar className="w-4.5 h-4.5 text-red-650 shrink-0" />
                <span className="tracking-wide">{weekDays.length > 0 ? getWeekRangeLabel() : 'Cargando...'}</span>
              </div>

              {/* Export button */}
              {auth.user?.role !== UserRole.SPECIALIST && auth.user?.role !== UserRole.GUEST && (
                <button 
                  onClick={exportExcelTemplate}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer h-[42px] shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Plantilla</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Grid container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0 table-fixed min-w-[1455px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-1.5 sticky left-0 [transform:translateZ(0)] will-change-transform bg-slate-50 z-30 border-r-2 border-slate-200/90 border-b border-slate-200/60 shadow-[6px_0_15px_-3px_rgba(0,0,0,0.08)] w-[220px] min-w-[220px] text-center">
                  <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-white transition-all hover:shadow-lg h-full">
                    {/* Header Div */}
                    <div className="bg-[#0f1c2d] py-2.5 px-2 flex items-center justify-center gap-1.5 relative text-white select-none">
                      <MapPin className="w-3.5 h-3.5 text-white/90 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Región</span>
                      
                      {/* Downward triangle indicator */}
                      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden z-10">
                        <svg viewBox="0 0 10 5" className="w-4 h-2 fill-current text-[#0f1c2d]">
                          <polygon points="0,0 10,0 5,5" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Date Div */}
                    <div className="py-4 px-2 flex flex-col items-center justify-center bg-white flex-1">
                      <div className="flex items-center justify-center max-w-full overflow-hidden">
                        <span className={`font-black text-[#0f1c2d] truncate uppercase ${visualizedRegion.length > 10 ? 'text-sm' : 'text-lg'}`} title={visualizedRegion}>
                          {visualizedRegion}
                        </span>
                      </div>
                    </div>
                    
                    {/* Colored Bottom Line */}
                    <div className="h-1.5 w-full bg-[#0f1c2d]" />
                  </div>
                </th>
                {weekDays.map((day, idx) => {
                  const isToday = day.dateStr === todayStr;
                  const holidayName = getColombianHoliday(day.dateObj);
                  const isRed = idx % 2 === 1;
                  const headerBg = isRed ? 'bg-[#c41230]' : 'bg-[#0f1c2d]';
                  const textColor = holidayName ? 'text-amber-950' : (isRed ? 'text-[#c41230]' : 'text-[#0f1c2d]');
                  const monthColor = holidayName ? 'text-amber-800' : (isRed ? 'text-[#c41230]' : 'text-[#0f1c2d]');
                  const borderColor = holidayName ? 'bg-amber-500' : (isRed ? 'bg-[#c41230]' : 'bg-[#0f1c2d]');

                  return (
                    <th 
                      key={day.dateStr} 
                      className={`p-1.5 text-center border-b border-slate-200/60 border-r border-slate-100 w-[145px] min-w-[145px] transition-colors relative 
                        ${isToday ? 'bg-red-50/15' : 'bg-slate-50'}`}
                    >
                      <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-white transition-all hover:shadow-lg h-full">
                        {/* Header Div */}
                        <div className={`${headerBg} py-2.5 px-2 flex items-center justify-center gap-1.5 relative text-white select-none shrink-0`}>
                          <Calendar className="w-3.5 h-3.5 text-white/90 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider truncate">{day.name}</span>
                          {isToday && (
                            <span className={`bg-white font-black text-[8px] px-1.5 py-0.5 rounded-full shadow-sm ml-1 shrink-0 ${isRed ? 'text-[#c41230]' : 'text-[#0f1c2d]'}`}>
                              HOY
                            </span>
                          )}
                          
                          {/* Downward triangle indicator */}
                          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden z-10">
                            <svg viewBox="0 0 10 5" className={`w-4 h-2 fill-current ${isRed ? 'text-[#c41230]' : 'text-[#0f1c2d]'}`}>
                              <polygon points="0,0 10,0 5,5" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Date Div */}
                        <div 
                          className={`py-4 flex flex-col items-center justify-center relative transition-colors duration-150 flex-1
                            ${holidayName ? 'bg-amber-100/80 border-b border-amber-200/20' : (isToday ? 'bg-red-50/20' : 'bg-white')}`}
                          title={holidayName || undefined}
                        >
                          <div className="flex items-baseline justify-center gap-0.5">
                            <span className={`text-2xl font-black ${textColor}`}>{day.dateObj.getDate()}</span>
                            <span className={`text-[10px] font-black uppercase ${monthColor} opacity-90`}>
                              {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][day.dateObj.getMonth()]}
                            </span>
                          </div>
                        </div>
                        
                        {/* Colored Bottom Line */}
                        <div className={`h-1.5 w-full shrink-0 ${borderColor}`} />
                      </div>
                    </th>
                  );
                })}
                <th className="p-1.5 text-center border-b border-slate-200/60 border-r border-slate-100 w-[110px] min-w-[110px] bg-slate-50">
                  <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-white transition-all hover:shadow-lg h-full">
                    {/* Header Div */}
                    <div className="bg-[#0f1c2d] py-2.5 px-2 flex items-center justify-center gap-1.5 relative text-white select-none">
                      <Clock className="w-3.5 h-3.5 text-white/90 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
                      
                      {/* Downward triangle indicator */}
                      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden z-10">
                        <svg viewBox="0 0 10 5" className="w-4 h-2 fill-current text-[#0f1c2d]">
                          <polygon points="0,0 10,0 5,5" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Date Div */}
                    <div className="py-4 flex flex-col items-center justify-center bg-white flex-1">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-xl font-black text-[#0f1c2d]">HORAS</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">SEM.</span>
                      </div>
                    </div>
                    
                    {/* Colored Bottom Line */}
                    <div className="h-1.5 w-full bg-[#0f1c2d]" />
                  </div>
                </th>
                <th className="p-1.5 text-center border-b border-slate-200/60 border-r border-slate-100 w-[110px] min-w-[110px] bg-slate-50">
                  <div className="flex flex-col rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-white transition-all hover:shadow-lg h-full">
                    {/* Header Div */}
                    <div className="bg-[#0f1c2d] py-2.5 px-2 flex items-center justify-center gap-1.5 relative text-white select-none">
                      <Calendar className="w-3.5 h-3.5 text-white/90 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Días</span>
                      
                      {/* Downward triangle indicator */}
                      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-2 overflow-hidden z-10">
                        <svg viewBox="0 0 10 5" className="w-4 h-2 fill-current text-[#0f1c2d]">
                          <polygon points="0,0 10,0 5,5" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Date Div */}
                    <div className="py-4 flex flex-col items-center justify-center bg-white flex-1">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-xl font-black text-[#0f1c2d]">DÍAS</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">PEND.</span>
                      </div>
                    </div>
                    
                    {/* Colored Bottom Line */}
                    <div className="h-1.5 w-full bg-[#0f1c2d]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cargando grilla de turnos...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleSpecialists.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
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
                    <td className="py-4 px-6 sticky left-0 [transform:translateZ(0)] will-change-transform bg-white group-hover:bg-slate-50 transition-colors z-20 border-r-2 border-slate-200/90 border-b border-slate-100 shadow-[6px_0_15px_-3px_rgba(0,0,0,0.08)] w-[220px] min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center font-black text-xs shrink-0 uppercase transition-colors ${getAvatarColors(spec.username).bg}`}>
                          {spec.username.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 uppercase truncate">
                            {formatName(spec.username)}
                          </div>
                          <div className={`text-[9.5px] font-black mt-1 tracking-wider uppercase flex flex-wrap items-center gap-1.5 ${spec.cedula ? 'text-slate-400' : 'text-red-500'}`}>
                            <span>CC: {spec.cedula || 'SIN CÉDULA'}</span>
                            {!spec.cedula && <span className="text-[8px] bg-red-50 text-red-600 border border-red-200/50 px-1.5 py-0.5 rounded font-bold">⚠️ Actualizar</span>}
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
                          const key = `${normalizeTime(s.check_in)}-${normalizeTime(s.check_out)}`;
                          const isCatalogShift = SHIFT_CATALOG[key] !== undefined;

                          content = (
                            <div className={`border rounded-xl p-2.5 text-left transition-all hover:shadow-sm ${isCatalogShift ? 'bg-emerald-50 border-emerald-200/60' : 'bg-amber-50 border-amber-200/60'}`}>
                              <div className="flex items-center justify-between gap-1">
                                <div className={`text-[9.5px] font-black uppercase tracking-wide ${isCatalogShift ? 'text-emerald-800' : 'text-amber-800'}`}>
                                  {isCatalogShift ? 'LABORAL' : 'LABORAL (Personalizado)'}
                                </div>
                                {!isCatalogShift && (
                                  <span className="text-[9.5px] text-amber-600 font-extrabold cursor-help" title="No está en el catálogo oficial de turnos">⚠️</span>
                                )}
                              </div>
                              <div className={`text-[10.5px] font-black mt-1 flex items-center gap-1 ${isCatalogShift ? 'text-emerald-600' : 'text-amber-600'}`}>
                                <Clock className={`w-3 h-3 ${isCatalogShift ? 'text-emerald-500' : 'text-amber-500'}`} />
                                <span>{s.check_in} - {s.check_out}</span>
                              </div>
                              {storeName && (
                                <div className={`text-[9px] font-bold mt-0.5 truncate flex items-center gap-0.5 ${isCatalogShift ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  <MapPin className={`w-2.5 h-2.5 shrink-0 ${isCatalogShift ? 'text-emerald-400' : 'text-amber-400'}`} />
                                  <span className="truncate">{storeName}</span>
                                </div>
                              )}
                              {s.activity && (
                                <div className={`text-[8.5px] font-black mt-1 uppercase tracking-wide truncate ${isCatalogShift ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  🎯 {s.activity}
                                </div>
                              )}
                              {s.custom_message && (
                                <div className={`text-[8.5px] font-bold mt-1 tracking-tight truncate flex items-center gap-0.5 ${isCatalogShift ? 'text-emerald-700' : 'text-amber-700'}`} title={s.custom_message}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 opacity-80" />
                                  <span className="truncate">"{s.custom_message}"</span>
                                </div>
                              )}
                              <div className={`text-[9px] font-black mt-1.5 pt-1 border-t text-right ${isCatalogShift ? 'text-emerald-700/80 border-emerald-200/30' : 'text-amber-700/80 border-amber-200/30'}`}>
                                {calculateHours(s)} Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Capacitación') {
                          content = (
                            <div className="bg-indigo-50 border border-indigo-200/60 rounded-xl p-2.5 text-left transition-all hover:shadow-sm">
                              <div className="text-[9.5px] font-black text-indigo-800 uppercase tracking-wide">CAPACITACIÓN</div>
                              <div className="text-[10.5px] font-black text-indigo-600 mt-1 flex items-center gap-1">
                                <Award className="w-3 h-3 text-indigo-500" />
                                <span>Turno Especial</span>
                              </div>
                              {storeName && (
                                <div className="text-[9px] font-bold text-indigo-500 mt-0.5 truncate flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-400" />
                                  <span className="truncate">{storeName}</span>
                                </div>
                              )}
                              {s.activity && (
                                <div className="text-[8.5px] font-black mt-1 uppercase tracking-wide truncate text-indigo-700">
                                  🎯 {s.activity}
                                </div>
                              )}
                              {s.custom_message && (
                                <div className="text-[8.5px] font-bold mt-1 tracking-tight truncate flex items-center gap-0.5 text-indigo-700" title={s.custom_message}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                  <span className="truncate">"{s.custom_message}"</span>
                                </div>
                              )}
                              <div className="text-[9px] font-black text-indigo-700/80 mt-1.5 pt-1 border-t border-indigo-200/30 text-right">
                                {calculateHours(s)} Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Descanso') {
                          content = (
                            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 text-center transition-all">
                              <div className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">DESCANSO</div>
                              <div className="text-[9.5px] font-bold text-slate-400 mt-1">Día Libre</div>
                              {s.custom_message && (
                                <div className="text-[8.5px] font-bold mt-1 tracking-tight truncate flex items-center justify-center gap-0.5 text-slate-600" title={s.custom_message}>
                                  <MessageSquare className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                  <span className="truncate">"{s.custom_message}"</span>
                                </div>
                              )}
                              <div className="text-[9px] font-black text-slate-400/80 mt-1.5 pt-1 border-t border-slate-200/20">
                                0.0 Horas
                              </div>
                            </div>
                          );
                        } else if (s.shift_type === 'Incapacidad') {
                          content = (
                            <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-2.5 text-center transition-all">
                              <div className="text-[9.5px] font-black text-rose-800 uppercase tracking-wider">INCAPACIDAD</div>
                              <div className="text-[9.5px] font-bold text-rose-500 mt-1">Ausencia Médica</div>
                              <div className="text-[9px] font-black text-rose-500/80 mt-1.5 pt-1 border-t border-rose-200/20">
                                0.0 Horas
                              </div>
                            </div>
                          );
                        }
                      } else {
                        content = (
                          <div className="border border-dashed border-slate-200 bg-white rounded-2xl p-3 text-slate-400/80 hover:text-red-600 hover:border-red-300 hover:bg-red-50/20 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer min-h-[84px] shadow-sm/5">
                            <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover/cell:bg-red-50 group-hover/cell:border-red-200 group-hover/cell:text-red-600 transition-all">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 group-hover/cell:text-red-600 transition-all">Asignar</span>
                          </div>
                        );
                      }

                      const isToday = day.dateStr === todayStr;
                      const holidayName = getColombianHoliday(day.dateObj);
                      const cellRequest = getCellRequest(spec.id, day.dateStr);
                      // Determine click behavior by role
                      const handleCellInteraction = () => {
                        if (isReadOnly) {
                          // Specialist: open request modal only for future weeks
                          handleRequestCellClick(spec, day);
                        } else {
                          handleCellClick(spec, day);
                        }
                      };
                      return (
                        <td
                          key={day.dateStr}
                          onClick={handleCellInteraction}
                          className={`p-1.5 border-r border-b border-slate-100 hover:bg-slate-50 cursor-pointer w-[145px] min-w-[145px] vertical-align-top transition-all select-none group/cell 
                            ${isToday ? 'bg-red-50/10' : ''}
                            ${(!isToday && holidayName) ? 'bg-amber-50/10' : ''}`}
                        >
                          <div className="relative">
                            {content}
                            {/* Request badge — visible to admins/coordinators/leaders on cells with a pending request */}
                            {!isReadOnly && cellRequest && (
                              <div
                                className={`absolute top-0.5 right-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider border shadow-sm pointer-events-none
                                  ${cellRequest.status === 'PENDIENTE'
                                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                                    : 'bg-slate-100 border-slate-300 text-slate-500'}`}
                              >
                                <span>{cellRequest.status === 'PENDIENTE' ? 'Solicitud' : 'Procesado'}</span>
                              </div>
                            )}
                            {/* Specialist view: show own pending request badge */}
                            {isReadOnly && cellRequest && auth.user?.id === spec.id && (
                              <div className="absolute top-0.5 right-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider border shadow-sm bg-amber-50 border-amber-300 text-amber-700 pointer-events-none">
                                <span>{cellRequest.status === 'PENDIENTE' ? 'Solicitud enviada' : 'Procesado'}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total weekly hours cell */}
                    <td className="py-4 px-5 text-center font-black border-r border-b border-slate-100 text-slate-900 bg-slate-50/20 w-[110px] min-w-[110px]">
                      <div className="text-sm font-black">{getWeeklyHours(spec.id)}h</div>
                      <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Semana</div>
                    </td>

                    {/* Días pendientes cell */}
                    <td className="py-4 px-5 text-center font-black border-r border-b border-slate-100 text-slate-900 bg-slate-50/20 w-[110px] min-w-[110px]">
                      {isReadOnly ? (
                        <div className="text-sm font-black">{spec.pendingDays || '—'}</div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={spec.pendingDays || ''}
                          placeholder="—"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            const updatedUsers = dataService.getUsers().map(u => u.id === spec.id ? { ...u, pendingDays: val } : u);
                            dataService._cache.users = updatedUsers;
                            setUsersVersion(v => v + 1);
                          }}
                          onBlur={async (e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            try {
                              await dataService.updateUserPendingDays(spec.id, val);
                              if (val > 0) showToast('Días pendientes actualizados');
                            } catch (err) {
                              console.error(err);
                              showToast('Error al actualizar días pendientes', true);
                            }
                          }}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-center font-black text-xs outline-none focus:border-red-500 bg-white"
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>



      {/* Turn modal editor / viewer */}
      {selectedCell && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal header */}
            <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
                  {isReadOnly ? 'Detalle del Horario' : 'Planificar Actividad'}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase mt-0.5 tracking-tight">
                  {selectedCell.dayName} {selectedCell.date.split('-').reverse().slice(0, 2).join('/')}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Especialista: <span className="font-bold text-slate-800">{formatName(selectedCell.specialist.username)}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
              {isReadOnly ? (
                /* VISTA DE CONSULTA (SOLO LECTURA PARA ESPECIALISTAS) */
                <div className="space-y-4">
                  {selectedCell.schedule ? (
                    <>
                      {/* Tipo de Actividad Badge & Details */}
                      <div className="p-4 rounded-2xl border bg-slate-50/80 border-slate-150 flex items-center gap-3.5">
                        {selectedCell.schedule.shift_type === 'Laboral' && (
                          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                            <Clock className="w-6 h-6" />
                          </div>
                        )}
                        {selectedCell.schedule.shift_type === 'Capacitación' && (
                          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0">
                            <Award className="w-6 h-6" />
                          </div>
                        )}
                        {selectedCell.schedule.shift_type === 'Descanso' && (
                          <div className="p-3 bg-slate-500/10 text-slate-600 rounded-xl shrink-0">
                            <Check className="w-6 h-6" />
                          </div>
                        )}
                        {selectedCell.schedule.shift_type === 'Incapacidad' && (
                          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl shrink-0">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Tipo de Jornada</span>
                          <span className="text-sm font-black uppercase tracking-tight text-slate-900">
                            {selectedCell.schedule.shift_type === 'Laboral' ? 'Turno Laboral' : selectedCell.schedule.shift_type}
                          </span>
                        </div>
                      </div>

                      {/* Horario de Entrada y Salida (si es Laboral) */}
                      {selectedCell.schedule.shift_type === 'Laboral' && selectedCell.schedule.check_in && selectedCell.schedule.check_out && (
                        <div className="p-4 rounded-2xl border border-slate-150 bg-white shadow-xs space-y-3">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Horario de Asistencia</span>
                          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <div className="text-center">
                              <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Entrada</span>
                              <span className="text-base font-black text-slate-900">{selectedCell.schedule.check_in}</span>
                            </div>
                            <div className="h-0.5 flex-1 mx-4 bg-slate-200 relative">
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-100 px-2 text-[9px] font-black text-slate-400 rounded-full border border-slate-200">
                                {calculateHours(selectedCell.schedule)}h
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-[8px] font-extrabold uppercase text-slate-400 block">Salida</span>
                              <span className="text-base font-black text-slate-900">{selectedCell.schedule.check_out}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Restaurante / CECO Asignado */}
                      {(selectedCell.schedule.shift_type === 'Laboral' || selectedCell.schedule.shift_type === 'Capacitación') && (
                        <div className="p-4 rounded-2xl border border-slate-150 bg-white shadow-xs space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Restaurante / CECO Asignado</span>
                          {(() => {
                            if (selectedCell.schedule?.no_restaurant || !selectedCell.schedule?.restaurant_id) {
                              return (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>Sin restaurante específico</span>
                                </div>
                              );
                            }
                            const rest = restaurants.find(r => r.id === selectedCell.schedule?.restaurant_id);
                            return rest ? (
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-black text-slate-900 uppercase">{rest.id} - {rest.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Zona: {rest.zone} | Región: {rest.region}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-medium text-slate-500 italic">No especificado</p>
                            );
                          })()}
                        </div>
                      )}

                      {/* Actividad Programada */}
                      {(selectedCell.schedule.shift_type === 'Laboral' || selectedCell.schedule.shift_type === 'Capacitación') && selectedCell.schedule.activity && (
                        <div className="p-4 rounded-2xl border border-slate-150 bg-white shadow-xs space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Actividad Programada</span>
                          <p className="text-xs font-black text-[#0f1c2d]">🎯 {selectedCell.schedule.activity}</p>
                        </div>
                      )}

                      {/* Mensaje Personalizado */}
                      {selectedCell.schedule.custom_message && (
                        <div className="p-4 rounded-2xl border border-blue-150 bg-blue-50/50 shadow-xs space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Mensaje Personalizado
                          </span>
                          <p className="text-xs font-bold text-slate-800 leading-relaxed italic">
                            "{selectedCell.schedule.custom_message}"
                          </p>
                        </div>
                      )}

                      {/* Info adicional para otros tipos */}
                      {selectedCell.schedule.shift_type === 'Capacitación' && (
                        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 text-xs font-medium">
                          Duración contable asignada: <strong className="font-extrabold text-indigo-700">7.0 horas</strong>
                        </div>
                      )}

                      {selectedCell.schedule.shift_type === 'Descanso' && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-medium">
                          Día de descanso libre (<strong className="font-extrabold text-slate-800">0.0 horas</strong>).
                        </div>
                      )}

                      {selectedCell.schedule.shift_type === 'Incapacidad' && (
                        <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl text-rose-900 text-xs font-medium">
                          Ausencia justificada por incapacidad (<strong className="font-extrabold text-rose-700">0.0 horas</strong>).
                        </div>
                      )}
                    </>
                  ) : (
                    /* Sin turno asignado */
                    <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-full bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-700">Sin Turno Programado</h4>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">No hay actividad registrada para este día.</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* VISTA DE EDICIÓN (ADMIN / LÍDER / COORDINADOR) */
                <>
                  {/* Request notification panel — shown when the cell has a pending specialist request */}
                  {(() => {
                    const cellReq = selectedCell ? getCellRequest(selectedCell.specialist.id, selectedCell.date) : undefined;
                    if (!cellReq) return null;
                    const reqTypeLabel: Record<string, string> = {
                      'Descanso': 'Día de Descanso',
                      'Horario Específico': 'Horario Específico',
                      'Permiso Especial': 'Permiso Especial'
                    };
                    const shiftLabel = cellReq.requested_shift_id
                      ? SHIFT_CATALOG_LIST.find(s => s.id === cellReq.requested_shift_id)
                      : null;
                    return (
                      <div className={`rounded-2xl border p-4 space-y-3 animate-slide-down ${cellReq.status === 'PENDIENTE' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${cellReq.status === 'PENDIENTE' ? 'text-amber-700' : 'text-slate-500'}`}>
                            Solicitud del Especialista — {cellReq.status}
                          </span>
                          {cellReq.status === 'PENDIENTE' && (
                            <button
                              onClick={() => handleMarkRequestProcessed(cellReq)}
                              className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-all"
                            >
                              Marcar Procesado
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wide w-20 shrink-0">Tipo:</span>
                            <span className="text-[10px] font-black text-slate-800">{reqTypeLabel[cellReq.request_type] || cellReq.request_type}</span>
                          </div>
                          {shiftLabel && (
                            <div className="flex items-center gap-2">
                              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wide w-20 shrink-0">Turno:</span>
                              <span className="text-[10px] font-black text-slate-800">{shiftLabel.checkIn} - {shiftLabel.checkOut} ({shiftLabel.hours}h)</span>
                            </div>
                          )}
                          {cellReq.comments && (
                            <div className="flex items-start gap-2">
                              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wide w-20 shrink-0 mt-0.5">Comentario:</span>
                              <span className="text-[10px] font-medium text-slate-700 italic leading-relaxed">"{cellReq.comments}"</span>
                            </div>
                          )}
                          {cellReq.created_at && (
                            <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wide w-20 shrink-0">Enviado el:</span>
                              <span className="text-[9px] font-bold text-slate-600">{formatRequestTimestamp(cellReq.created_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
                          onClick={() => setModalShiftType(item.key as 'Laboral' | 'Capacitación' | 'Descanso' | 'Incapacidad')}
                          className={`px-3 py-3 rounded-xl border text-[10px] font-black uppercase text-center transition-all ${modalShiftType === item.key ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional elements based on type */}
                  {modalShiftType === 'Laboral' && (
                    <div className="animate-slide-down">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Seleccionar Turno del Catálogo</label>
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <select
                          value={selectedShiftId}
                          onChange={(e) => {
                            const shiftId = e.target.value ? Number(e.target.value) : '';
                            setSelectedShiftId(shiftId);
                            const shift = SHIFT_CATALOG_LIST.find(s => s.id === shiftId);
                            if (shift) {
                              setModalCheckIn(shift.checkIn);
                              setModalCheckOut(shift.checkOut);
                            } else {
                              setModalCheckIn('');
                              setModalCheckOut('');
                            }
                          }}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-red-600 transition-all uppercase truncate"
                        >
                          <option value="">Selecciona un turno oficial...</option>
                          {SHIFT_CATALOG_LIST.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.checkIn} a {s.checkOut} ({s.hours}h {s.break > 0 ? `+ ${s.break}h descanso` : 'sin descanso'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {(modalShiftType === 'Laboral' || modalShiftType === 'Capacitación') && (
                    <>
                      <div className="animate-slide-down">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Actividad a Realizar</label>
                        <select 
                          value={modalActivity}
                          onChange={(e) => setModalActivity(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:border-red-600 transition-all truncate"
                        >
                          <option value="">Selecciona una actividad...</option>
                          {[
                            'Induccion Coroporativo',
                            'Introduccion a las plataformas',
                            'Taller Manipulacion Mensual',
                            'The Vault',
                            'Apoyo Comercial',
                            'Apoyo planta',
                            'Entrenamiento CAR',
                            'Trabajo en Restaurante'
                          ].map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                        </select>
                      </div>

                      <div className="animate-slide-down space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Restaurante / CECO Asignado</label>
                          <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={modalNoRestaurant}
                              onChange={(e) => setModalNoRestaurant(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <span>Sin restaurante específico</span>
                          </label>
                        </div>

                        {!modalNoRestaurant ? (
                          <>
                            <select 
                              value={modalRestaurantId}
                              onChange={(e) => setModalRestaurantId(e.target.value)}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:border-red-600 transition-all truncate"
                            >
                              <option value="">Selecciona una tienda del especialista...</option>
                              {getSpecialistAllowedRestaurants(selectedCell.specialist).map(r => (
                                <option key={r.id} value={r.id}>{r.id} - {r.name} ({r.region})</option>
                              ))}
                            </select>
                            <p className="text-[8px] text-slate-400">Restringido a las tiendas configuradas en la jurisdicción del especialista.</p>
                          </>
                        ) : (
                          <div className="p-3 bg-slate-100/70 border border-slate-200/80 rounded-xl text-[9.5px] font-bold text-slate-500 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Horario programado sin un restaurante específico asignado.</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Mensaje Personalizado Section (para cualquier tipo de turno) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 animate-slide-down">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[9.5px] font-black uppercase tracking-wider text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={modalEnableMessage}
                          onChange={(e) => {
                            setModalEnableMessage(e.target.checked);
                            if (!e.target.checked) setModalCustomMessage('');
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <MessageSquare className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Mensaje Personalizado</span>
                      </label>
                      {modalEnableMessage && (
                        <span className={`text-[8.5px] font-bold ${modalCustomMessage.length >= 200 ? 'text-red-600' : 'text-slate-400'}`}>
                          {modalCustomMessage.length}/200
                        </span>
                      )}
                    </div>

                    {modalEnableMessage && (
                      <div className="animate-slide-down space-y-1">
                        <textarea
                          maxLength={200}
                          rows={3}
                          value={modalCustomMessage}
                          onChange={(e) => setModalCustomMessage(e.target.value.slice(0, 200))}
                          placeholder="Escribe un mensaje personalizado (máximo 200 caracteres)..."
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-red-600 transition-all resize-none"
                        />
                      </div>
                    )}
                  </div>

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
                </>
              )}
            </div>

            {/* Modal actions */}
            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex items-center justify-between shrink-0">
              {isReadOnly ? (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    {selectedCell.schedule && (
                      <button
                        onClick={handleDeleteShift}
                        disabled={isSavingShift}
                        className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-3 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
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
                      className="px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-slate-150 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveShift}
                      disabled={
                        isSavingShift || 
                        (modalShiftType === 'Laboral' && !selectedShiftId)
                      }
                      className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:hover:bg-red-300 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingShift ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Specialist Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">

            {/* Header */}
            <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  Solicitud de Permiso o Preferencia
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase mt-0.5 tracking-tight">
                  {requestModal.dayName} {requestModal.date.split('-').reverse().slice(0, 2).join('/')}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Especialista: <span className="font-bold text-slate-800">{formatName(requestModal.specialist.username)}</span>
                </p>
              </div>
              <button
                onClick={() => setRequestModal(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
              {!isFutureWeek ? (
                /* Blocked: current or past week */
                <div className="py-8 px-4 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-700">Semana no disponible</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">
                      Las solicitudes solo pueden realizarse para semanas futuras. Navega a la próxima semana para enviar una solicitud.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Existing request info */}
                  {requestModal.existingRequest && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[9.5px] font-bold leading-relaxed">
                      Ya tienes una solicitud enviada el {formatRequestTimestamp(requestModal.existingRequest.created_at)}. Puedes modificarla o cancelarla.
                    </div>
                  )}

                  {/* Request type selector */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Solicitud</label>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { key: 'Descanso', label: 'Solicitar Día de Descanso', desc: 'Pedir un día libre en esta fecha.' },
                        { key: 'Horario Específico', label: 'Solicitar Horario Específico', desc: 'Preferencia por un turno del catálogo.' },
                        { key: 'Permiso Especial', label: 'Permiso Especial', desc: 'Otro tipo de permiso con justificación.' },
                      ] as { key: ScheduleRequestType; label: string; desc: string }[]).map(item => (
                        <button
                          key={item.key}
                          onClick={() => setReqType(item.key)}
                          className={`px-4 py-3 rounded-xl border text-left transition-all ${reqType === item.key ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'}`}
                        >
                          <div className="text-[10px] font-black uppercase">{item.label}</div>
                          <div className={`text-[9px] mt-0.5 font-medium ${reqType === item.key ? 'text-slate-300' : 'text-slate-400'}`}>{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shift selector (only for Horario Específico) */}
                  {reqType === 'Horario Específico' && (
                    <div className="animate-slide-down">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Turno Preferido del Catálogo</label>
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <select
                          value={reqShiftId}
                          onChange={(e) => setReqShiftId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-amber-500 transition-all uppercase truncate"
                        >
                          <option value="">Selecciona un turno...</option>
                          {SHIFT_CATALOG_LIST.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.checkIn} a {s.checkOut} ({s.hours}h {s.break > 0 ? `+ ${s.break}h descanso` : 'sin descanso'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Comment/justification */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Comentario / Justificación</label>
                      <span className={`text-[8.5px] font-bold ${reqComments.length >= 200 ? 'text-red-600' : 'text-slate-400'}`}>
                        {reqComments.length}/200
                      </span>
                    </div>
                    <textarea
                      maxLength={200}
                      rows={3}
                      value={reqComments}
                      onChange={(e) => setReqComments(e.target.value.slice(0, 200))}
                      placeholder="Explica el motivo de tu solicitud (opcional)..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 transition-all resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex items-center justify-between shrink-0">
              {isFutureWeek ? (
                <>
                  <div>
                    {requestModal.existingRequest && (
                      <button
                        onClick={handleDeleteRequest}
                        disabled={isSavingRequest}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar Solicitud</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRequestModal(null)}
                      disabled={isSavingRequest}
                      className="px-4 py-2.5 border-2 border-slate-150 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={handleSaveRequest}
                      disabled={isSavingRequest}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSavingRequest ? 'Enviando...' : (requestModal.existingRequest ? 'Actualizar' : 'Enviar Solicitud')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setRequestModal(null)}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Schedules;
