
import React, { useMemo, useState } from 'react';
import { Employee, JobTitle, Restaurant, UserRole } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Briefcase, ChevronDown, X, PieChart, TrendingUp, ChevronRight, RefreshCw, Search, HardHat, Crown, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

// Normaliza texto: minúsculas + sin tildes + sin espacios extra
const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Cargos operativos
const OPERATIVE_KEYS = [
  'miembro de equipo full',
  'miembro de equipo rolex',
  'miembro de equipo hrs',
  'miembro de equipo of. varios',
  'miembro de equipo fds',
  'miembro de equipo pt',
  'domiciliario',
  'entrenador',
].map(norm);

// Cargos administrativos (incluye variantes reales de BD)
const ADMIN_KEYS = [
  'lider de turno',
  'subgerente',
  'gerente',
  'gerente de restaurante',
  'lider de area',
].map(norm);

const isOperative = (title: string) => OPERATIVE_KEYS.includes(norm(title));
const isAdmin = (title: string) => ADMIN_KEYS.includes(norm(title));
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ALL_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const EntriesExitsReport: React.FC = () => {
  const { filteredEmployees: employees, restaurants, auth } = useAppStore();
  const user = auth.user!;
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<'entries' | 'exits' | 'none'>('none');
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [selectedTitleFilter, setSelectedTitleFilter] = useState<string>('all');
  const [searchPerson, setSearchPerson] = useState('');

  const selectedMonthStrs = useMemo(() =>
    selectedMonths.map(m => `${selectedYear}-${m}`),
    [selectedYear, selectedMonths]
  );

  const singleMonthLabel = selectedMonths.length === 1
    ? `${MONTH_NAMES[parseInt(selectedMonths[0]) - 1]} ${selectedYear}`
    : `${selectedMonths.length} meses · ${selectedYear}`;

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter(x => x !== m) : prev
        : [...prev, m]
    );
  };

  // ── Filtros dinámicos ──────────────────────────────────────────────────
  const dynamicRegions = useMemo(() => {
    let all = Array.from(new Set(restaurants.map(r => r.region))).filter(Boolean).sort();
    if (user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || user.role === UserRole.GUEST) {
      all = all.filter(r => (user.assignedRegions || []).includes(r));
    }
    return all;
  }, [restaurants, user]);

  const dynamicZones = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') {
      base = base.filter(r => r.region === filterRegion);
    } else if (user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || user.role === UserRole.GUEST) {
      base = base.filter(r => (user.assignedRegions || []).includes(r.region));
    }
    return Array.from(new Set(base.map(r => r.zone))).filter(Boolean).sort();
  }, [restaurants, filterRegion, user]);

  const dynamicStores = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') {
      base = base.filter(r => r.region === filterRegion);
    } else if (user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || user.role === UserRole.GUEST) {
      base = base.filter(r => (user.assignedRegions || []).includes(r.region));
    }
    if (filterZone !== 'all') {
      base = base.filter(r => r.zone === filterZone);
    }
    return base.sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, filterRegion, filterZone, user]);

  // ── Mapa de restaurantes ───────────────────────────────────────────────
  const restaurantMap = useMemo(() => {
    const byId = new Map<string, Restaurant>();
    const byName = new Map<string, Restaurant>();
    restaurants.forEach(r => {
      byId.set(r.id.trim().toUpperCase(), r);
      byName.set(r.name.trim().toUpperCase(), r);
    });
    return { byId, byName };
  }, [restaurants]);

  const resolveRestaurant = useMemo(() => (idOrName: string): Restaurant | undefined => {
    if (!idOrName) return undefined;
    const s = idOrName.trim().toUpperCase();
    let r = restaurantMap.byId.get(s);
    if (r) return r;
    r = restaurantMap.byName.get(s);
    if (r) return r;
    if (s.includes(' - ')) {
      r = restaurantMap.byId.get(s.split(' - ')[0].trim());
      if (r) return r;
    }
    for (const [id, store] of restaurantMap.byId)
      if (s.startsWith(id + ' ') || s.startsWith(id + '-')) return store;
    return undefined;
  }, [restaurantMap]);

  const matchesFilters = useMemo(() => (idOrName: string): boolean => {
    const store = resolveRestaurant(idOrName);
    if (filterRegion === 'all' && filterZone === 'all' && filterStore === 'all') return true;
    if (!store) return false;
    return (filterRegion === 'all' || store.region === filterRegion)
      && (filterZone === 'all' || store.zone === filterZone)
      && (filterStore === 'all' || store.id.trim().toUpperCase() === String(filterStore).trim().toUpperCase());
  }, [resolveRestaurant, filterRegion, filterZone, filterStore]);

  // ── Eventos del año ────────────────────────────────────────────────────
  const historyEvents = useMemo(() => {
    const events: {
      employeeName: string; employeeTitle: string;
      month: string; year: string; date: string;
      action: 'INGRESO' | 'RETIRO' | 'TRASLADO';
      restaurantName: string;
    }[] = [];

    const mapTitle = (t: string): string => {
      const n = norm(t);
      if (n === 'miembro de equipo hrs' || n === 'miembro de equipo fds' || n === 'miembro de equipo pt') return JobTitle.MIEMBRO_EQUIPO_ROLEX;
      if (n === 'miembro de equipo of. varios') return JobTitle.MIEMBRO_EQUIPO_FULL;
      return t;
    };

    const getStoreLabel = (idOrName: string) => {
      const store = resolveRestaurant(idOrName);
      return store ? `${store.id} - ${store.name}` : idOrName;
    };

    employees.forEach(emp => {
      const displayTitle = mapTitle(emp.title);
      const histIn = (emp.history || []).filter(h => h.action === 'INGRESO' && h.date.startsWith(selectedYear));
      if (histIn.length > 0) {
        histIn.forEach(h => {
          if (matchesFilters(h.restaurantName))
            events.push({ 
              ...h, 
              restaurantName: getStoreLabel(h.restaurantName),
              employeeName: emp.name, 
              employeeTitle: displayTitle, 
              month: h.date.slice(0, 7), 
              year: h.date.slice(0, 4) 
            });
        });
      } else if (emp.join_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({ 
          date: emp.join_date, 
          action: 'INGRESO', 
          restaurantName: getStoreLabel(emp.restaurant_id), 
          employeeName: emp.name, 
          employeeTitle: displayTitle, 
          month: emp.join_date.slice(0, 7), 
          year: emp.join_date.slice(0, 4) 
        });
      }

      const histOut = (emp.history || []).filter(h => h.action === 'RETIRO' && h.date.startsWith(selectedYear));
      if (histOut.length > 0) {
        histOut.forEach(h => {
          if (matchesFilters(h.restaurantName))
            events.push({ 
              ...h, 
              restaurantName: getStoreLabel(h.restaurantName),
              employeeName: emp.name, 
              employeeTitle: displayTitle, 
              month: h.date.slice(0, 7), 
              year: h.date.slice(0, 4) 
            });
        });
      } else if (emp.exit_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({ 
          date: emp.exit_date, 
          action: 'RETIRO', 
          restaurantName: getStoreLabel(emp.restaurant_id), 
          employeeName: emp.name, 
          employeeTitle: displayTitle, 
          month: emp.exit_date.slice(0, 7), 
          year: emp.exit_date.slice(0, 4) 
        });
      }
    });
    return events;
  }, [employees, matchesFilters, resolveRestaurant, selectedYear]);

  // ── Stats por cargo ────────────────────────────────────────────────────
  const statsByCargo = useMemo(() => {
    const map: Record<string, { cargo: string; ingresos: number; retiros: number }> = {};
    historyEvents.filter(e => selectedMonthStrs.includes(e.month)).forEach(e => {
      if (!map[e.employeeTitle]) map[e.employeeTitle] = { cargo: e.employeeTitle, ingresos: 0, retiros: 0 };
      if (e.action === 'INGRESO') map[e.employeeTitle].ingresos++;
      if (e.action === 'RETIRO') map[e.employeeTitle].retiros++;
    });
    return Object.values(map).map(item => {
      const active = employees.filter(e => {
        const n = norm(e.title);
        let displayTitle: string = e.title;
        if (n === 'miembro de equipo hrs' || n === 'miembro de equipo fds' || n === 'miembro de equipo pt') displayTitle = JobTitle.MIEMBRO_EQUIPO_ROLEX;
        if (n === 'miembro de equipo of. varios') displayTitle = JobTitle.MIEMBRO_EQUIPO_FULL;
        
        return e.active && matchesFilters(e.restaurant_id) && norm(displayTitle) === norm(item.cargo);
      }).length;
      return { ...item, active, rotacion: active > 0 ? ((item.retiros / active) * 100).toFixed(1) : '0.0' };
    }).sort((a, b) => (b.ingresos + b.retiros) - (a.ingresos + a.retiros));
  }, [historyEvents, selectedMonthStrs, employees, matchesFilters]);

  // ── Stats generales ────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const range = historyEvents.filter(e => selectedMonthStrs.includes(e.month));
    const entries = range.filter(e => e.action === 'INGRESO').length;
    const exits = range.filter(e => e.action === 'RETIRO').length;
    const activeInScope = employees.filter(e => e.active && matchesFilters(e.restaurant_id));
    const exOp = range.filter(e => e.action === 'RETIRO' && isOperative(e.employeeTitle)).length;
    const exAd = range.filter(e => e.action === 'RETIRO' && isAdmin(e.employeeTitle)).length;
    const acOp = activeInScope.filter(e => isOperative(e.title)).length;
    const acAd = activeInScope.filter(e => isAdmin(e.title)).length;
    return {
      entries, exits,
      rotationOperative: acOp > 0 ? ((exOp / acOp) * 100).toFixed(1) : '0.0',
      rotationAdmin: acAd > 0 ? ((exAd / acAd) * 100).toFixed(1) : '0.0',
    };
  }, [historyEvents, selectedMonthStrs, employees, matchesFilters]);

  // ── Gráfico anual ──────────────────────────────────────────────────────
  const yearChartData = useMemo(() =>
    MONTH_SHORT.map((name, idx) => {
      const mStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      return {
        name,
        ingresos: historyEvents.filter(e => e.month === mStr && e.action === 'INGRESO').length,
        retiros: historyEvents.filter(e => e.month === mStr && e.action === 'RETIRO').length,
        isSelected: selectedMonths.includes(String(idx + 1).padStart(2, '0')),
      };
    }),
    [historyEvents, selectedYear, selectedMonths]
  );

  const availableTitlesForList = useMemo(() => {
    const action = viewDetail === 'entries' ? 'INGRESO' : 'RETIRO';
    return Array.from(new Set(
      historyEvents.filter(e => selectedMonthStrs.includes(e.month) && e.action === action).map(e => e.employeeTitle)
    )).sort();
  }, [historyEvents, selectedMonthStrs, viewDetail]);

  const filteredHistoryEventsList = useMemo(() => {
    const action = viewDetail === 'entries' ? 'INGRESO' : 'RETIRO';
    const q = searchPerson.toLowerCase();
    return historyEvents.filter(e =>
      selectedMonthStrs.includes(e.month) && e.action === action &&
      (selectedTitleFilter === 'all' || e.employeeTitle === selectedTitleFilter) &&
      (q === '' || e.employeeName.toLowerCase().includes(q) || e.restaurantName.toLowerCase().includes(q))
    );
  }, [historyEvents, selectedMonthStrs, viewDetail, selectedTitleFilter, searchPerson]);

  const sel = "w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none focus:border-red-500 transition-colors shadow-sm appearance-none cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-lg">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-red-600" /> Filtros de Movimientos
        </h3>

        {/* ── Sección de Filtros Refinada ── */}
        <div className="flex flex-col xl:flex-row gap-8 mb-10">
          
          {/* Grupo: Periodo */}
          <div className="flex-1 lg:flex-[0.4] bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-red-50 rounded-lg text-red-600">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selección de Periodo</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Año */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Año</label>
                <div className="relative">
                  <select className={sel} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Mes — dropdown multi-selección */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mes(es)</label>
                <div className="relative">
                  <button
                    onClick={() => setIsMonthDropdownOpen(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-black text-slate-800 uppercase tracking-widest hover:border-red-400 transition-colors shadow-sm"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        {selectedMonths.length === 1
                          ? MONTH_NAMES[parseInt(selectedMonths[0]) - 1]
                          : `${selectedMonths.length} meses`}
                      </span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMonthDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMonthDropdownOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 w-64 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <div className="flex border-b border-slate-100">
                          <button onClick={() => setSelectedMonths([...ALL_MONTHS])} className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100">Todos</button>
                          <button onClick={() => setSelectedMonths([ALL_MONTHS[new Date().getMonth()]])} className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors">Actual</button>
                        </div>
                        <div className="grid grid-cols-3">
                          {ALL_MONTHS.map((m, idx) => {
                            const isSel = selectedMonths.includes(m);
                            return (
                              <button key={m} onClick={() => toggleMonth(m)} className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-wide transition-all border-b border-slate-50 ${isSel ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                <div className={`w-3 h-3 rounded border-2 shrink-0 flex items-center justify-center ${isSel ? 'bg-white border-white' : 'border-slate-300'}`}>
                                  {isSel && <div className="w-1.5 h-1.5 bg-red-600 rounded-sm" />}
                                </div>
                                {MONTH_SHORT[idx]}
                              </button>
                            );
                          })}
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                          <button onClick={() => setIsMonthDropdownOpen(false)} className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-colors">Aplicar</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grupo: Ubicación */}
          <div className="flex-1 lg:flex-[0.6] bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtros de Ubicación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Región */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Región</label>
                <div className="relative">
                  <select className={sel} value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterZone('all'); setFilterStore('all'); }}>
                    <option value="all">Todas</option>
                    {dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Zona */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Zona</label>
                <div className="relative">
                  <select className={sel} value={filterZone} onChange={e => { setFilterZone(e.target.value); setFilterStore('all'); }}>
                    <option value="all">Todas</option>
                    {dynamicZones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Tienda */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tienda</label>
                <div className="relative">
                  <select className={sel} value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                    <option value="all">Todas</option>
                    {dynamicStores.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard icon={<ArrowUpCircle className="w-5 h-5" />} label="Ingresos" value={monthStats.entries} color="emerald" onClick={() => { setViewDetail('entries'); setSelectedTitleFilter('all'); }} />
          <MetricCard icon={<ArrowDownCircle className="w-5 h-5" />} label="Retiros" value={monthStats.exits} color="red" onClick={() => { setViewDetail('exits'); setSelectedTitleFilter('all'); }} />
          <MetricCard icon={<HardHat className="w-5 h-5" />} label="Rot. Operativa" sublabel="M.Equipo · Domiciliarios · Entrenadores" value={`${monthStats.rotationOperative}%`} color="amber" />
          <MetricCard icon={<Crown className="w-5 h-5" />} label="Rot. Administrativa" sublabel="Líderes · Subgerentes · Gerentes" value={`${monthStats.rotationAdmin}%`} color="violet" />
        </div>

        {/* ── Análisis y Gráfico ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => setShowCargoModal(true)} 
              className="w-full bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs transition-all duration-200 hover:border-slate-300 hover:shadow-md group text-left cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Análisis Detallado</h4>
                  <p className="text-base font-black uppercase tracking-tight leading-tight text-slate-900 group-hover:text-red-600 transition-colors">
                    Movimientos por Cargo
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" /> Desglose y tasa de rotación
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center transition-all shrink-0 shadow-2xs">
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
            
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200/80 flex flex-col items-center text-center">
              <TrendingUp className="w-6 h-6 text-red-600 mb-2" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Resumen del Período</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase leading-relaxed">
                {monthStats.entries} ingresos y {monthStats.exits} retiros en {singleMonthLabel}. Rot. operativa <span className="font-bold text-slate-800">{monthStats.rotationOperative}%</span> · administrativa <span className="font-bold text-slate-800">{monthStats.rotationAdmin}%</span>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 min-h-[380px] shadow-2xs">
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] mb-6 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                Tendencia Mensual {selectedYear}
              </span>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#256d19]" /> Ingresos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Retiros
                </span>
              </div>
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yearChartData} margin={{ left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={(props: any) => (
                    <text x={props.x} y={props.y + 10} textAnchor="middle" fontSize={10} fontWeight={800} fill={yearChartData[props.index]?.isSelected ? '#dc2626' : '#64748b'}>{props.value}</text>
                  )}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: '800', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar name="Ingresos" dataKey="ingresos" fill="#256d19" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar name="Retiros" dataKey="retiros" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Modal Análisis por Cargo ──────────────────────────────────────────── */}
      {showCargoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative bg-white rounded-3xl sm:rounded-[36px] shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            {/* Header Principal */}
            <div className="bg-white px-6 sm:px-8 py-5 flex items-center justify-between gap-4 border-b border-slate-100 shrink-0">
              {/* Título Limpio */}
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black tracking-tight text-slate-900 uppercase leading-tight">
                  Análisis por Cargo
                </h2>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {singleMonthLabel}
                </span>
              </div>

              <button 
                onClick={() => setShowCargoModal(false)} 
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {statsByCargo.map((item, idx) => {
                const rotNum = parseFloat(item.rotacion);
                const rotColor = rotNum === 0 ? 'text-slate-400' : rotNum < 5 ? 'text-emerald-700' : rotNum < 15 ? 'text-amber-700' : 'text-rose-700';
                return (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:border-slate-300 transition group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 border border-slate-200/60 shadow-2xs"><Briefcase className="w-4 h-4" /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 uppercase italic tracking-tight">{item.cargo}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">{item.ingresos + item.retiros} movimientos · {item.active} activos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pr-2">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-emerald-700 uppercase mb-0.5">Ingresos</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight leading-none">{item.ingresos}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-rose-700 uppercase mb-0.5">Retiros</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight leading-none">{item.retiros}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5 flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5" />Rotación</p>
                        <p className={`text-lg font-black tracking-tight leading-none ${rotColor}`}>{item.rotacion}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {statsByCargo.length === 0 && (
                <div className="text-center p-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase italic">No se detectaron movimientos en este período</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rotación = Retiros / Activos por cargo</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Detalle de Ingresos / Retiros ─────────────────────────────────────── */}
      {viewDetail !== 'none' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${viewDetail === 'entries' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}>
                {viewDetail === 'entries' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-tight text-slate-900">
                  Detalle de {viewDetail === 'entries' ? 'Ingresos' : 'Retiros'} — {singleMonthLabel}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {filteredHistoryEventsList.length} personas registradas
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Buscar persona..." value={searchPerson} onChange={e => setSearchPerson(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 shadow-2xs" />
              </div>
              <div className="relative flex-1 sm:w-48">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={selectedTitleFilter} onChange={e => setSelectedTitleFilter(e.target.value)} className="w-full pl-9 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 shadow-2xs appearance-none cursor-pointer">
                  <option value="all">Cargo: Todos</option>
                  {availableTitlesForList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button onClick={() => setViewDetail('none')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  <th className="py-3 px-6">Colaborador</th>
                  <th className="py-3 px-6">Cargo</th>
                  <th className="py-3 px-6">Tienda / CECO</th>
                  <th className="py-3 px-6">Fecha del Movimiento</th>
                  <th className="py-3 px-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistoryEventsList.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-800">{e.employeeName}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-600">{e.employeeTitle}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-600">{e.restaurantName}</td>
                    <td className="py-3.5 px-6 font-bold text-slate-700">{e.date}</td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        e.action === 'INGRESO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'
                      }`}>
                        {e.action}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredHistoryEventsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                      No se encontraron registros coincidentes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MetricCard ──────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
  icon: React.ReactNode; 
  label: string; 
  sublabel?: string;
  value: string | number; 
  color: 'emerald' | 'red' | 'amber' | 'blue' | 'violet';
  onClick?: () => void;
}> = ({ icon, label, sublabel, value, color, onClick }) => {
  const colorMap = {
    emerald: {
      iconColor: 'text-emerald-600/80',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
    },
    red: {
      iconColor: 'text-rose-600/80',
      badge: 'text-rose-700 bg-rose-50 border-rose-200/60',
    },
    amber: {
      iconColor: 'text-amber-600/80',
      badge: 'text-amber-700 bg-amber-50 border-amber-200/60',
    },
    blue: {
      iconColor: 'text-slate-600',
      badge: 'text-slate-700 bg-slate-100 border-slate-200',
    },
    violet: {
      iconColor: 'text-slate-600',
      badge: 'text-slate-700 bg-slate-100 border-slate-200',
    }
  };

  const currentColors = colorMap[color] || colorMap.blue;

  return (
    <div 
      onClick={onClick} 
      className={`bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden transition-all duration-200 flex flex-col justify-between min-h-[130px] ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs active:scale-[0.99]' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`shrink-0 ${currentColors.iconColor}`}>
          {icon}
        </div>
      </div>

      <div>
        <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
          {value}
        </span>
        {sublabel && (
          <p className="text-[9px] font-medium text-slate-400 mt-1 truncate">
            {sublabel}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          {onClick ? 'Ver Detalles' : 'Indicador'}
        </span>
        {onClick && (
          <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border ${currentColors.badge}`}>
            Explorar
          </span>
        )}
      </div>
    </div>
  );
};

export default EntriesExitsReport;
