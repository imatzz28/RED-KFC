
import React, { useMemo, useState } from 'react';
import { Employee, JobTitle, Restaurant } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Briefcase, ChevronDown, X, PieChart, TrendingUp, ChevronRight, RefreshCw, Search, HardHat, Crown } from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';

// Clasificación de cargos operativos vs administrativos
const OPERATIVE_TITLES: string[] = [
  JobTitle.MIEMBRO_EQUIPO_FULL,
  JobTitle.MIEMBRO_EQUIPO_ROLEX,
  JobTitle.DOMICILIARIO,
  JobTitle.ENTRENADOR,
];

const ADMIN_TITLES: string[] = [
  JobTitle.LIDER_TURNO,
  JobTitle.SUBGERENTE,
  JobTitle.GERENTE,
];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ALL_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const EntriesExitsReport: React.FC = () => {
  const { filteredEmployees: employees, restaurants } = useAppStore();
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  // Multi-month: array of month strings like ['01', '03']
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonth]);
  const [viewDetail, setViewDetail] = useState<'entries' | 'exits' | 'none'>('none');
  const [showCargoModal, setShowCargoModal] = useState(false);

  // Filtro de cargo para el listado detallado
  const [selectedTitleFilter, setSelectedTitleFilter] = useState<string>('all');
  // Buscador de trabajador
  const [searchPerson, setSearchPerson] = useState('');

  // Derived: set of selected month strings like '2026-03'
  const selectedMonthStrs = useMemo(() =>
    selectedMonths.map(m => `${selectedYear}-${m}`),
    [selectedYear, selectedMonths]
  );

  // For single-month display (for detail panel header)
  const singleMonthLabel = selectedMonths.length === 1
    ? `${MONTH_NAMES[parseInt(selectedMonths[0]) - 1]} ${selectedYear}`
    : `${selectedMonths.length} meses · ${selectedYear}`;

  // Toggle month selection
  const toggleMonth = (m: string) => {
    setSelectedMonths(prev =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter(x => x !== m) : prev // keep at least 1
        : [...prev, m]
    );
  };

  // === FILTROS DINÁMICOS ===
  const dynamicRegions = useMemo(() => {
    return Array.from(new Set(restaurants.map(r => r.region))).filter(Boolean).sort();
  }, [restaurants]);

  const dynamicZones = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') base = base.filter(r => r.region === filterRegion);
    return Array.from(new Set(base.map(r => r.zone))).filter(Boolean).sort();
  }, [restaurants, filterRegion]);

  const dynamicStores = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') base = base.filter(r => r.region === filterRegion);
    if (filterZone !== 'all') base = base.filter(r => r.zone === filterZone);
    return base.sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, filterRegion, filterZone]);

  // === LÓGICA DE FILTRADO ===
  const restaurantMap = useMemo(() => {
    const byId = new Map<string, Restaurant>();
    const byName = new Map<string, Restaurant>();
    restaurants.forEach(r => {
      byId.set(r.id.trim().toUpperCase(), r);
      byName.set(r.name.trim().toUpperCase(), r);
    });
    return { byId, byName };
  }, [restaurants]);

  const resolveRestaurant = useMemo(() => {
    return (idOrName: string): Restaurant | undefined => {
      if (!idOrName) return undefined;
      const search = idOrName.trim().toUpperCase();
      let store = restaurantMap.byId.get(search);
      if (store) return store;
      store = restaurantMap.byName.get(search);
      if (store) return store;
      if (search.includes(' - ')) {
        const idPart = search.split(' - ')[0].trim();
        store = restaurantMap.byId.get(idPart);
        if (store) return store;
      }
      for (const [id, r] of restaurantMap.byId) {
        if (search.startsWith(id + ' ') || search.startsWith(id + '-')) return r;
      }
      return undefined;
    };
  }, [restaurantMap]);

  const matchesFilters = useMemo(() => {
    return (restaurantIdOrName: string): boolean => {
      const store = resolveRestaurant(restaurantIdOrName);
      if (filterRegion === 'all' && filterZone === 'all' && filterStore === 'all') return true;
      if (!store) return false;
      const matchRegion = filterRegion === 'all' || store.region === filterRegion;
      const matchZone = filterZone === 'all' || store.zone === filterZone;
      const matchStore = filterStore === 'all' || store.id.trim().toUpperCase() === String(filterStore).trim().toUpperCase();
      return matchRegion && matchZone && matchStore;
    };
  }, [resolveRestaurant, filterRegion, filterZone, filterStore]);

  // === RECOLECCIÓN DE EVENTOS (todo el año) ===
  const historyEvents = useMemo(() => {
    const events: { employeeName: string; employeeTitle: string; month: string; year: string; date: string; action: "INGRESO" | "RETIRO" | "TRASLADO"; restaurantName: string; }[] = [];

    employees.forEach(emp => {
      // --- INGRESOS ---
      const historyIngresos = (emp.history || []).filter(h => h.action === 'INGRESO' && h.date.startsWith(selectedYear));
      if (historyIngresos.length > 0) {
        historyIngresos.forEach(h => {
          if (matchesFilters(h.restaurantName)) {
            events.push({ ...h, employeeName: emp.name, employeeTitle: emp.title, month: h.date.slice(0, 7), year: h.date.slice(0, 4) });
          }
        });
      } else if (emp.join_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({ date: emp.join_date, action: 'INGRESO', restaurantName: emp.restaurant_id, employeeName: emp.name, employeeTitle: emp.title, month: emp.join_date.slice(0, 7), year: emp.join_date.slice(0, 4) });
      }

      // --- RETIROS ---
      const historyRetiros = (emp.history || []).filter(h => h.action === 'RETIRO' && h.date.startsWith(selectedYear));
      if (historyRetiros.length > 0) {
        historyRetiros.forEach(h => {
          if (matchesFilters(h.restaurantName)) {
            events.push({ ...h, employeeName: emp.name, employeeTitle: emp.title, month: h.date.slice(0, 7), year: h.date.slice(0, 4) });
          }
        });
      } else if (emp.exit_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({ date: emp.exit_date, action: 'RETIRO', restaurantName: emp.restaurant_id, employeeName: emp.name, employeeTitle: emp.title, month: emp.exit_date.slice(0, 7), year: emp.exit_date.slice(0, 4) });
      }
    });
    return events;
  }, [employees, matchesFilters, selectedYear]);

  // === STATS PARA EL RANGO DE MESES SELECCIONADOS ===
  const statsByCargo = useMemo(() => {
    const cargoMap: Record<string, { cargo: string, ingresos: number, retiros: number }> = {};
    historyEvents.filter(e => selectedMonthStrs.includes(e.month)).forEach(e => {
      const groupedTitle = e.employeeTitle;
      if (!cargoMap[groupedTitle]) cargoMap[groupedTitle] = { cargo: groupedTitle, ingresos: 0, retiros: 0 };
      if (e.action === 'INGRESO') cargoMap[groupedTitle].ingresos++;
      if (e.action === 'RETIRO') cargoMap[groupedTitle].retiros++;
    });

    // Calcular empleados activos por cargo para la rotación
    return Object.values(cargoMap).map(item => {
      const activeForCargo = employees.filter(e => e.active && matchesFilters(e.restaurant_id) && e.title === item.cargo).length;
      const rotacion = activeForCargo > 0 ? ((item.retiros / activeForCargo) * 100).toFixed(1) : '0.0';
      return { ...item, active: activeForCargo, rotacion };
    }).sort((a, b) => (b.ingresos + b.retiros) - (a.ingresos + a.retiros));
  }, [historyEvents, selectedMonthStrs, employees, matchesFilters]);

  const monthStats = useMemo(() => {
    const eventsInRange = historyEvents.filter(e => selectedMonthStrs.includes(e.month));
    const entries = eventsInRange.filter(e => e.action === 'INGRESO').length;
    const exits = eventsInRange.filter(e => e.action === 'RETIRO').length;

    const activeInScope = employees.filter(e => e.active && matchesFilters(e.restaurant_id));
    const totalActive = activeInScope.length;

    // Rotación operativa
    const activeOperative = activeInScope.filter(e => OPERATIVE_TITLES.includes(e.title as JobTitle)).length;
    const exitsOperative = eventsInRange.filter(e => e.action === 'RETIRO' && OPERATIVE_TITLES.includes(e.employeeTitle as JobTitle)).length;
    const rotationOperative = activeOperative > 0 ? ((exitsOperative / activeOperative) * 100).toFixed(1) : '0.0';

    // Rotación administrativa
    const activeAdmin = activeInScope.filter(e => ADMIN_TITLES.includes(e.title as JobTitle)).length;
    const exitsAdmin = eventsInRange.filter(e => e.action === 'RETIRO' && ADMIN_TITLES.includes(e.employeeTitle as JobTitle)).length;
    const rotationAdmin = activeAdmin > 0 ? ((exitsAdmin / activeAdmin) * 100).toFixed(1) : '0.0';

    return {
      entries,
      exits,
      rotationOperative,
      rotationAdmin,
      totalActive,
    };
  }, [historyEvents, selectedMonthStrs, employees, matchesFilters]);

  const yearChartData = useMemo(() => {
    return MONTH_SHORT.map((name, idx) => {
      const mStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const entries = historyEvents.filter(e => e.month === mStr && e.action === 'INGRESO').length;
      const exits = historyEvents.filter(e => e.month === mStr && e.action === 'RETIRO').length;
      const isSelected = selectedMonths.includes(String(idx + 1).padStart(2, '0'));
      return { name, ingresos: entries, retiros: exits, isSelected };
    });
  }, [historyEvents, selectedYear, selectedMonths]);

  const availableTitlesForList = useMemo(() => {
    const events = historyEvents.filter(e => selectedMonthStrs.includes(e.month) && e.action === (viewDetail === 'entries' ? 'INGRESO' : 'RETIRO'));
    return Array.from(new Set(events.map(e => e.employeeTitle))).sort();
  }, [historyEvents, selectedMonthStrs, viewDetail]);

  const filteredHistoryEventsList = useMemo(() => {
    const action = viewDetail === 'entries' ? 'INGRESO' : 'RETIRO';
    const searchLower = searchPerson.toLowerCase();
    return historyEvents.filter(e =>
      selectedMonthStrs.includes(e.month) &&
      e.action === action &&
      (selectedTitleFilter === 'all' || e.employeeTitle === selectedTitleFilter) &&
      (searchPerson === '' || e.employeeName.toLowerCase().includes(searchLower) || e.restaurantName.toLowerCase().includes(searchLower))
    );
  }, [historyEvents, selectedMonthStrs, viewDetail, selectedTitleFilter, searchPerson]);

  const selectStyle = "w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none focus:border-red-500 transition-colors shadow-sm appearance-none cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-lg">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-red-600" /> Filtros de Movimientos
        </h3>

        {/* Filtros de región/zona/tienda/año */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Año</label>
            <div className="relative">
              <select className={selectStyle} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Región</label>
            <div className="relative">
              <select className={selectStyle} value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterZone('all'); setFilterStore('all'); }}>
                <option value="all">Todas las Regiones</option>
                {dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Zona</label>
            <div className="relative">
              <select className={selectStyle} value={filterZone} onChange={e => { setFilterZone(e.target.value); setFilterStore('all'); }}>
                <option value="all">Todas las Zonas</option>
                {dynamicZones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tienda</label>
            <div className="relative">
              <select className={selectStyle} value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                <option value="all">Todas las Tiendas</option>
                {dynamicStores.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selector multi-mes */}
        <div className="mb-8">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Meses ({selectedMonths.length} seleccionado{selectedMonths.length !== 1 ? 's' : ''})
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
            {ALL_MONTHS.map((m, idx) => {
              const isSelected = selectedMonths.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMonth(m)}
                  className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border-2 ${isSelected
                    ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                    : 'bg-slate-50 text-slate-500 border-transparent hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                    }`}
                >
                  {MONTH_SHORT[idx]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjetas de métricas — sin retención, con 2 rotaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MetricCard
            icon={<ArrowUpCircle className="w-5 h-5" />}
            label="Ingresos"
            value={monthStats.entries}
            color="emerald"
            onClick={() => { setViewDetail('entries'); setSelectedTitleFilter('all'); }}
          />
          <MetricCard
            icon={<ArrowDownCircle className="w-5 h-5" />}
            label="Retiros"
            value={monthStats.exits}
            color="red"
            onClick={() => { setViewDetail('exits'); setSelectedTitleFilter('all'); }}
          />
          <MetricCard
            icon={<HardHat className="w-5 h-5" />}
            label="Rot. Operativa"
            sublabel="M.Equipo · Domiciliarios · Entrenadores"
            value={`${monthStats.rotationOperative}%`}
            color="amber"
          />
          <MetricCard
            icon={<Crown className="w-5 h-5" />}
            label="Rot. Administrativa"
            sublabel="Líderes · Subgerentes · Gerentes"
            value={`${monthStats.rotationAdmin}%`}
            color="violet"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <button
              onClick={() => setShowCargoModal(true)}
              className="w-full bg-slate-900 text-white p-8 rounded-[32px] border border-slate-800 shadow-2xl transition-all hover:bg-slate-800 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-10 translate-x-1/2 -translate-y-1/2 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-all" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Análisis</h4>
                  <p className="text-lg font-black uppercase italic tracking-tighter leading-tight">Movimientos por Cargo</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-1">
                    <PieChart className="w-3 h-3" /> Ver desglose segmentado + rotación
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-red-600 transition-all">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col items-center text-center">
              <TrendingUp className="w-8 h-8 text-red-600 mb-4" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Resumen del Período</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
                {monthStats.entries} ingresos y {monthStats.exits} retiros en {singleMonthLabel}. Rotación operativa del <span className="text-amber-600">{monthStats.rotationOperative}%</span> y administrativa del <span className="text-violet-600">{monthStats.rotationAdmin}%</span>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 min-h-[400px] shadow-inner">
            <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] mb-8 flex justify-between items-center">
              <span>Tendencia Mensual {selectedYear}</span>
              <Calendar className="w-4 h-4 text-red-600" />
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearChartData} margin={{ left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={(props) => {
                    const isSelected = yearChartData[props.index]?.isSelected;
                    return (
                      <text x={props.x} y={props.y + 10} textAnchor="middle" fontSize={10} fontWeight={900} fill={isSelected ? '#dc2626' : '#64748b'}>
                        {props.value}
                      </text>
                    );
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: '900', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar name="Ingresos" dataKey="ingresos" fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar name="Retiros" dataKey="retiros" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal Análisis por Cargo */}
      {showCargoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden border-2 border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl shadow-xl shadow-red-900/20">
                  <PieChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase italic tracking-tighter text-xl">Análisis por Cargo</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Periodo: {singleMonthLabel}</p>
                </div>
              </div>
              <button onClick={() => setShowCargoModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                {statsByCargo.map((item, idx) => {
                  const total = item.ingresos + item.retiros;
                  const rotNum = parseFloat(item.rotacion);
                  const rotColor = rotNum === 0 ? 'text-slate-400' : rotNum < 5 ? 'text-emerald-600' : rotNum < 15 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:bg-white hover:shadow-xl hover:border-slate-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors shadow-sm">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{item.cargo}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5 tracking-widest">{total} Movimientos · {item.active} Activos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 pr-4">
                        <div className="text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Ingresos</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.ingresos}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[9px] font-black text-red-600 uppercase mb-1">Retiros</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.retiros}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5" />Rotación</p>
                          <p className={`text-2xl font-black tracking-tighter leading-none ${rotColor}`}>{item.rotacion}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {statsByCargo.length === 0 && (
                  <div className="text-center p-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black text-slate-300 uppercase italic tracking-widest">No se detectaron movimientos en este período</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Rotación = Retiros / Activos por cargo · Cargos operacionales y administrativos</p>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de Ingresos/Retiros */}
      {viewDetail !== 'none' && (
        <div className="bg-white rounded-[32px] shadow-2xl border-2 border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${viewDetail === 'entries' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                {viewDetail === 'entries' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-black uppercase italic tracking-tight">
                Detalle de {viewDetail === 'entries' ? 'Ingresos' : 'Retiros'} — {singleMonthLabel}
              </h3>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar persona..."
                  value={searchPerson}
                  onChange={e => setSearchPerson(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-800 outline-none focus:border-red-500 transition-all shadow-sm"
                />
              </div>
              <div className="relative flex-1 sm:w-52">
                <Briefcase className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedTitleFilter}
                  onChange={e => setSelectedTitleFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-800 outline-none focus:border-red-500 transition-all shadow-sm appearance-none cursor-pointer"
                >
                  <option value="all">Cargo: Todos</option>
                  {availableTitlesForList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button onClick={() => { setViewDetail('none'); setSearchPerson(''); }} className="p-2 text-slate-400 hover:text-red-600 transition-all"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Evento</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tienda / CECO</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistoryEventsList.map((e, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 text-slate-500 font-bold text-[11px]">{e.date}</td>
                    <td className="p-5 font-black uppercase italic text-slate-900 text-[11px]">{e.employeeName}</td>
                    <td className="p-5 text-slate-600 font-black uppercase text-[10px]">{e.restaurantName}</td>
                    <td className="p-5">
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg uppercase">
                        {e.employeeTitle}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredHistoryEventsList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest italic">
                      No se registraron movimientos con los filtros aplicados
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

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: string | number;
  color: 'emerald' | 'red' | 'amber' | 'blue' | 'violet';
  onClick?: () => void;
}> = ({ icon, label, sublabel, value, color, onClick }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-500',
    red: 'bg-red-50 text-red-600 border-red-100 hover:border-red-500',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-500',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-500',
    violet: 'bg-violet-50 text-violet-600 border-violet-100 hover:border-violet-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-6 rounded-[28px] border-2 transition-all flex items-center gap-4 text-left ${colorMap[color]} ${onClick ? 'cursor-pointer hover:shadow-lg active:scale-95' : 'cursor-default'}`}
    >
      <div className={`p-3 rounded-2xl bg-white shadow-sm shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{label}</p>
        {sublabel && <p className="text-[8px] font-bold text-current opacity-40 uppercase tracking-wide mt-0.5 leading-tight truncate">{sublabel}</p>}
        <p className="text-xl font-black tracking-tighter leading-none mt-1">{value}</p>
      </div>
    </button>
  );
};

export default EntriesExitsReport;
