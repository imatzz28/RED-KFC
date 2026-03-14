
import React, { useMemo, useState } from 'react';
import { Employee, Restaurant } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Briefcase, ChevronDown, X, PieChart, TrendingUp, ChevronRight, RefreshCw, UserCheck, Search } from 'lucide-react';

import { useAppStore } from '@/store/useAppStore';

const EntriesExitsReport: React.FC = () => {
  const { filteredEmployees: employees, restaurants } = useAppStore();
  const currentYear = new Date().getFullYear();
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonthPart, setSelectedMonthPart] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [viewDetail, setViewDetail] = useState<'entries' | 'exits' | 'none'>('none');
  const [showCargoModal, setShowCargoModal] = useState(false);

  // Filtro de cargo para el listado detallado
  const [selectedTitleFilter, setSelectedTitleFilter] = useState<string>('all');
  // Buscador de trabajador
  const [searchPerson, setSearchPerson] = useState('');

  const selectedMonthStr = `${selectedYear}-${selectedMonthPart}`;

  // === FILTROS DINÁMICOS (copia exacta de Dashboard.tsx) ===
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

  // === LÓGICA DE FILTRADO - Copiada del Dashboard.tsx ===
  // Paso 1: Crear mapa de restaurantes para búsqueda rápida por ID y por nombre
  const restaurantMap = useMemo(() => {
    const byId = new Map<string, Restaurant>();
    const byName = new Map<string, Restaurant>();
    restaurants.forEach(r => {
      byId.set(r.id.trim().toUpperCase(), r);
      byName.set(r.name.trim().toUpperCase(), r);
    });
    return { byId, byName };
  }, [restaurants]);

  // Función que resuelve un restaurantName del historial (formato "K049 - ANTARES SOACHA") al objeto Restaurant
  const resolveRestaurant = useMemo(() => {
    return (idOrName: string): Restaurant | undefined => {
      if (!idOrName) return undefined;
      const search = idOrName.trim().toUpperCase();

      // 1. Buscar directamente por ID
      let store = restaurantMap.byId.get(search);
      if (store) return store;

      // 2. Buscar por nombre completo
      store = restaurantMap.byName.get(search);
      if (store) return store;

      // 3. El historial a veces usa formato "K049 - ANTARES SOACHA": extraer la parte antes del " - "
      if (search.includes(' - ')) {
        const idPart = search.split(' - ')[0].trim();
        store = restaurantMap.byId.get(idPart);
        if (store) return store;
      }

      // 4. Buscar si el string contiene algún ID conocido
      for (const [id, r] of restaurantMap.byId) {
        if (search.startsWith(id + ' ') || search.startsWith(id + '-')) return r;
      }

      return undefined;
    };
  }, [restaurantMap]);

  // Paso 2: Función que determina si un restaurante está en el alcance de los filtros
  const matchesFilters = useMemo(() => {
    return (restaurantIdOrName: string): boolean => {
      const store = resolveRestaurant(restaurantIdOrName);

      // Si no hay filtros activos, incluir todo (incluso sin tienda asociada)
      if (filterRegion === 'all' && filterZone === 'all' && filterStore === 'all') return true;

      // Si hay algún filtro activo pero no se encontró la tienda, excluir
      if (!store) return false;

      const matchRegion = filterRegion === 'all' || store.region === filterRegion;
      const matchZone = filterZone === 'all' || store.zone === filterZone;
      const matchStore = filterStore === 'all' || store.id.trim().toUpperCase() === String(filterStore).trim().toUpperCase();
      return matchRegion && matchZone && matchStore;
    };
  }, [resolveRestaurant, filterRegion, filterZone, filterStore]);

  // === RECOLECCIÓN DE EVENTOS ===
  const historyEvents = useMemo(() => {
    const events: { employeeName: string; employeeTitle: string; month: string; year: string; date: string; action: "INGRESO" | "RETIRO" | "TRASLADO"; restaurantName: string; }[] = [];

    employees.forEach(emp => {
      // --- INGRESOS ---
      const historyIngresos = (emp.history || []).filter(h => h.action === 'INGRESO' && h.date.startsWith(selectedYear));
      if (historyIngresos.length > 0) {
        historyIngresos.forEach(h => {
          if (matchesFilters(h.restaurantName)) {
            events.push({
              ...h,
              employeeName: emp.name,
              employeeTitle: emp.title,
              month: h.date.slice(0, 7),
              year: h.date.slice(0, 4)
            });
          }
        });
      } else if (emp.join_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({
          date: emp.join_date,
          action: 'INGRESO',
          restaurantName: emp.restaurant_id,
          employeeName: emp.name,
          employeeTitle: emp.title,
          month: emp.join_date.slice(0, 7),
          year: emp.join_date.slice(0, 4)
        });
      }

      // --- RETIROS ---
      const historyRetiros = (emp.history || []).filter(h => h.action === 'RETIRO' && h.date.startsWith(selectedYear));
      if (historyRetiros.length > 0) {
        historyRetiros.forEach(h => {
          if (matchesFilters(h.restaurantName)) {
            events.push({
              ...h,
              employeeName: emp.name,
              employeeTitle: emp.title,
              month: h.date.slice(0, 7),
              year: h.date.slice(0, 4)
            });
          }
        });
      } else if (emp.exit_date?.startsWith(selectedYear) && matchesFilters(emp.restaurant_id)) {
        events.push({
          date: emp.exit_date,
          action: 'RETIRO',
          restaurantName: emp.restaurant_id,
          employeeName: emp.name,
          employeeTitle: emp.title,
          month: emp.exit_date.slice(0, 7),
          year: emp.exit_date.slice(0, 4)
        });
      }
    });
    return events;
  }, [employees, matchesFilters, selectedYear]);

  const statsByCargo = useMemo(() => {
    const cargoMap: Record<string, { cargo: string, ingresos: number, retiros: number }> = {};
    historyEvents.filter(e => e.month === selectedMonthStr).forEach(e => {
      const groupedTitle = e.employeeTitle;
      if (!cargoMap[groupedTitle]) cargoMap[groupedTitle] = { cargo: groupedTitle, ingresos: 0, retiros: 0 };
      if (e.action === 'INGRESO') cargoMap[groupedTitle].ingresos++;
      if (e.action === 'RETIRO') cargoMap[groupedTitle].retiros++;
    });
    return Object.values(cargoMap).sort((a, b) => (b.ingresos + b.retiros) - (a.ingresos + a.retiros));
  }, [historyEvents, selectedMonthStr]);

  const monthStats = useMemo(() => {
    const entries = historyEvents.filter(e => e.month === selectedMonthStr && e.action === 'INGRESO').length;
    const exits = historyEvents.filter(e => e.month === selectedMonthStr && e.action === 'RETIRO').length;

    // Personal activo en el alcance de filtros (para Rotación/Retención)
    const activeInScope = employees.filter(e => e.active && matchesFilters(e.restaurant_id)).length;

    const rotationRate = activeInScope > 0 ? (exits / activeInScope) * 100 : 0;
    const empsInicio = (activeInScope - entries + exits);
    const retentionRate = empsInicio > 0 ? ((activeInScope - entries) / empsInicio) * 100 : 0;

    return {
      entries,
      exits,
      rotation: rotationRate.toFixed(1),
      retention: Math.min(100, retentionRate).toFixed(1)
    };
  }, [historyEvents, selectedMonthStr, employees, matchesFilters]);

  const yearChartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((name, idx) => {
      const mStr = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const entries = historyEvents.filter(e => e.month === mStr && e.action === 'INGRESO').length;
      const exits = historyEvents.filter(e => e.month === mStr && e.action === 'RETIRO').length;
      return { name, ingresos: entries, retiros: exits };
    });
  }, [historyEvents, selectedYear]);

  const availableTitlesForList = useMemo(() => {
    const events = historyEvents.filter(e => e.month === selectedMonthStr && e.action === (viewDetail === 'entries' ? 'INGRESO' : 'RETIRO'));
    return Array.from(new Set(events.map(e => e.employeeTitle))).sort();
  }, [historyEvents, selectedMonthStr, viewDetail]);

  const filteredHistoryEventsList = useMemo(() => {
    const action = viewDetail === 'entries' ? 'INGRESO' : 'RETIRO';
    const searchLower = searchPerson.toLowerCase();
    return historyEvents.filter(e =>
      e.month === selectedMonthStr &&
      e.action === action &&
      (selectedTitleFilter === 'all' || e.employeeTitle === selectedTitleFilter) &&
      (searchPerson === '' || e.employeeName.toLowerCase().includes(searchLower) || e.restaurantName.toLowerCase().includes(searchLower))
    );
  }, [historyEvents, selectedMonthStr, viewDetail, selectedTitleFilter, searchPerson]);

  const selectStyle = "w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-[11px] font-black text-slate-800 uppercase tracking-widest outline-none focus:border-red-500 transition-colors shadow-sm appearance-none cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-lg">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-red-600" /> Filtros de Movimientos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mes</label>
            <div className="relative">
              <select className={selectStyle} value={selectedMonthPart} onChange={e => setSelectedMonthPart(e.target.value)}>
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, idx) => (
                  <option key={m} value={m}>{['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][idx]}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Región</label>
            <div className="relative">
              <select
                className={selectStyle}
                value={filterRegion}
                onChange={e => {
                  setFilterRegion(e.target.value);
                  setFilterZone('all');
                  setFilterStore('all');
                }}
              >
                <option value="all">Todas las Regiones</option>
                {dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Zona</label>
            <div className="relative">
              <select
                className={selectStyle}
                value={filterZone}
                onChange={e => {
                  setFilterZone(e.target.value);
                  setFilterStore('all');
                }}
              >
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MetricCard icon={<ArrowUpCircle className="w-5 h-5" />} label="Ingresos" value={monthStats.entries} color="emerald" onClick={() => { setViewDetail('entries'); setSelectedTitleFilter('all'); }} />
          <MetricCard icon={<ArrowDownCircle className="w-5 h-5" />} label="Retiros" value={monthStats.exits} color="red" onClick={() => { setViewDetail('exits'); setSelectedTitleFilter('all'); }} />
          <MetricCard icon={<RefreshCw className="w-5 h-5" />} label="Rotación" value={`${monthStats.rotation}%`} color="amber" />
          <MetricCard icon={<UserCheck className="w-5 h-5" />} label="Retención" value={`${monthStats.retention}%`} color="blue" />
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
                    <PieChart className="w-3 h-3" /> Ver desglose segmentado
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-red-600 transition-all">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col items-center text-center">
              <TrendingUp className="w-8 h-8 text-red-600 mb-4" />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Impacto Organizacional</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
                La retención del {monthStats.retention}% sugiere una {parseFloat(monthStats.retention) > 90 ? 'excelente' : 'estable'} estabilidad laboral en el periodo seleccionado.
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '11px', fontWeight: '900', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar name="Ingresos" dataKey="ingresos" fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} />
                <Bar name="Retiros" dataKey="retiros" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showCargoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl shadow-xl shadow-red-900/20">
                  <PieChart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase italic tracking-tighter text-xl">Análisis por Cargo</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Periodo: {selectedMonthStr}</p>
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
                  return (
                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all hover:bg-white hover:shadow-xl hover:border-slate-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors shadow-sm">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{item.cargo}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5 tracking-widest">{total} Movimientos totales</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 pr-4">
                        <div className="text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Ingresos</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.ingresos}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[9px] font-black text-red-600 uppercase mb-1">Retiros</p>
                          <p className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{item.retiros}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {statsByCargo.length === 0 && (
                  <div className="text-center p-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black text-slate-300 uppercase italic tracking-widest">No se detectaron movimientos en este mes</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargos operacionales y administrativos detallados</p>
            </div>
          </div>
        </div>
      )}

      {viewDetail !== 'none' && (
        <div className="bg-white rounded-[32px] shadow-2xl border-2 border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${viewDetail === 'entries' ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                {viewDetail === 'entries' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-black uppercase italic tracking-tight">
                Detalle de {viewDetail === 'entries' ? 'Ingresos' : 'Retiros'} - {selectedMonthStr}
              </h3>
            </div>

            {/* Filtro por cargo y buscador de persona */}
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

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: 'emerald' | 'red' | 'amber' | 'blue', onClick?: () => void }> = ({ icon, label, value, color, onClick }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-500',
    red: 'bg-red-50 text-red-600 border-red-100 hover:border-red-500',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-500',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-6 rounded-[28px] border-2 transition-all flex items-center gap-4 text-left ${colorMap[color]} ${onClick ? 'cursor-pointer hover:shadow-lg active:scale-95' : 'cursor-default'}`}
    >
      <div className={`p-3 rounded-2xl bg-white shadow-sm`}>{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-xl font-black tracking-tighter leading-none mt-1">{value}</p>
      </div>
    </button>
  );
};

export default EntriesExitsReport;
