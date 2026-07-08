
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GradeEntry, Employee, JobTitle, User, Restaurant, UserRole } from '@/types';
import { dataService } from '@/services/dataService';
import { EVALUATION_GROUPS, APPROVAL_THRESHOLD, TOTAL_CATEGORIES_COUNT } from '@/utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area, Line, LineChart, Legend } from 'recharts';
import { Activity, XCircle, Users, Award, TrendingUp, Search, MapPin, Filter, Download, X, Check, FileText, ArrowUpCircle, ArrowDownCircle, RefreshCw, UserCheck, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExportWorker from '@/workers/exportWorker?worker';

import { getSeniorityMonths } from '@/features/stores/utils/storeUtils';
import { useAppStore } from '@/store/useAppStore';

// Clasificación de cargos para rotación operativa vs administrativa
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

const Dashboard: React.FC = () => {
  const { filteredEmployees: initialEmployees, restaurants, selectedMonth, auth } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const user = auth.user!;
  const [searchPerson, setSearchPerson] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [dashboardMonth, setDashboardMonth] = useState(selectedMonth);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    groups: Object.keys(EVALUATION_GROUPS),
    includeDetails: false
  });


  const hierarchy = useMemo(() => dataService.getHierarchy(), []);

  const dynamicRegions = useMemo(() => {
    let regions = Array.from(new Set(restaurants.map(r => r.region))).filter(Boolean).sort();
    if (user.role === UserRole.COORDINATOR) {
      regions = regions.filter(r => user.assignedRegions.includes(r));
    }
    return regions;
  }, [restaurants, user]);

  const dynamicZones = useMemo(() => {
    let baseStores = restaurants;
    if (filterRegion !== 'all') baseStores = baseStores.filter(r => r.region === filterRegion);
    else if (user.role === UserRole.COORDINATOR) baseStores = baseStores.filter(r => user.assignedRegions.includes(r.region));

    let zones = Array.from(new Set(baseStores.map(r => r.zone))).filter(Boolean).sort();
    if (user.role === UserRole.SPECIALIST) zones = zones.filter(z => user.assignedZones.includes(z));
    return zones;
  }, [restaurants, filterRegion, user]);

  const dynamicStores = useMemo(() => {
    let baseStores = restaurants;
    if (filterRegion !== 'all') baseStores = baseStores.filter(r => r.region === filterRegion);
    else if (user.role === UserRole.COORDINATOR) baseStores = baseStores.filter(r => user.assignedRegions.includes(r.region));

    if (filterZone !== 'all') baseStores = baseStores.filter(r => r.zone === filterZone);
    if (user.role === UserRole.SPECIALIST) baseStores = baseStores.filter(r => user.assignedRestaurants.includes(r.id) || user.assignedZones.includes(r.zone));

    return baseStores.sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, filterRegion, filterZone, user]);



  const scopeStoresSet = useMemo<Set<string>>(() => {
    const isCoordinator = user.role === UserRole.COORDINATOR;
    const isSpecialist = user.role === UserRole.SPECIALIST;
    const assignedRegions = user.assignedRegions || [];
    const assignedZones = user.assignedZones || [];
    const assignedRestaurants = user.assignedRestaurants || [];

    return new Set(restaurants
      .filter(r => {
        // Filtro por rol base (sin filtros manuales seleccionados)
        if (isCoordinator && filterRegion === 'all' && !assignedRegions.includes(r.region)) return false;
        if (isSpecialist) {
          const inZone = assignedZones.includes(r.zone);
          const inStore = assignedRestaurants.includes(r.id);
          if (!inZone && !inStore) return false;
        }

        // Filtros manuales del usuario
        const matchRegion = filterRegion === 'all'
          ? true
          : r.region === filterRegion;
        const matchZone = filterZone === 'all' ? true : r.zone === filterZone;
        const matchStore = filterStore === 'all' ? true : r.id === filterStore;
        return matchRegion && matchZone && matchStore;
      })
      .map(r => r.id.trim().toUpperCase())
    );
  }, [restaurants, filterRegion, filterZone, filterStore, user]);

  const { data: statsMap, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', dashboardMonth, filterRegion, filterZone, filterStore],
    queryFn: async () => {
      const storeIds    = Array.from(scopeStoresSet);
      const isSingleStore = filterStore !== 'all';

      // ── CAMINO A: Zona / Región / Nacional → RPC get_dashboard_stats ──────
      // Datos precalculados en monthly_group_stats (históricos y correctos).
      // Un solo request HTTP, sin importar cuántas tiendas haya en el scope.
      if (!isSingleStore) {
        // Para evitar errores cuando un Especialista no tiene zona pero tiene tiendas,
        // o tiene múltiples zonas, simplemente le pasamos a Supabase el array exacto
        // de tiendas a las que tiene acceso (storeIds).
        const rpcData = await dataService.getDashboardStats(
          dashboardMonth,
          storeIds
        );

        const groupAvgs = Object.keys(EVALUATION_GROUPS).map(gid => {
          const row = rpcData.find((r: any) => r.group_id === gid);
          return {
            id:   gid,
            name: EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS].name,
            avg:  row ? Math.round(Number(row.avg_score))     : 0,
            rate: row ? Math.round(Number(row.approval_rate)) : 0
          };
        });

        // El total de empleados viene del grupo AK (sin restricción de antigüedad)
        const akRow = rpcData.find((r: any) => r.group_id === 'AK');
        const totalEmployees  = akRow ? Number(akRow.employee_count) : 0;
        const approvedCount   = akRow ? Number(akRow.approved_count) : 0;
        const globalProgress  = groupAvgs.length > 0
          ? Math.round(groupAvgs.reduce((acc, g) => acc + g.avg, 0) / groupAvgs.length)
          : 0;

        return { totalEmployees, approvedCount, pendingCount: totalEmployees - approvedCount, globalProgress, groupAvgs };
      }

      // ── CAMINO B: Tienda específica → grades reales (mismo cálculo que MyStores) ──
      // Carga las notas desde Supabase en tiempo real con herencia correcta.
      if (storeIds.length > 0) {
        await Promise.all(storeIds.map(sid => dataService.loadGradesForStore(sid as string, dashboardMonth as string)));
        dataService._cache.gradeIndex = null;
      }

      const summaryMap = new Map((dataService.getGradesSummary() || []).map(s => [String(s.employee_id).trim(), s]));

      // Obtener el último día del mes en formato string "YYYY-MM-DD"
      const year = parseInt(dashboardMonth.split('-')[0]);
      const month = parseInt(dashboardMonth.split('-')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const periodEndStr = `${dashboardMonth}-${String(lastDay).padStart(2, '0')}`;
      const periodStartStr = `${dashboardMonth}-01`;

      const validEmployees = initialEmployees.filter(emp => {
        const normalizedEmpStore = String(emp.restaurant_id || '').trim().toUpperCase();
        if (!storeIds.includes(normalizedEmpStore)) return false;
        
        const joinDateStr = emp.join_date ? emp.join_date.substring(0, 10) : '0000-01-01';
        const exitDateStr = emp.exit_date ? emp.exit_date.substring(0, 10) : '9999-12-31';
        
        // Estaba contratado: entró antes del fin de mes Y no se fue antes del inicio de mes
        let isHistoricalActive = (joinDateStr <= periodEndStr) && (exitDateStr >= periodStartStr);
        if (isHistoricalActive) {
          const isRetired = !emp.active || (emp.exit_date && emp.exit_date.trim() !== '');
          if (isRetired) {
            const empSummary = summaryMap.get(String(emp.id).trim());
            const effective = dataService.getEffectiveGrades(emp.id, dashboardMonth, normalizedEmpStore);
            const hasNotes = (effective && effective.length > 0) || !!empSummary;
            if (!hasNotes) {
              isHistoricalActive = false;
            }
          }
        }
        
        return isHistoricalActive;
      });

      let approvedCount = 0;
      const groupData: Record<string, { scores: number[], passed: number }> = {};
      Object.keys(EVALUATION_GROUPS).forEach(gid => { groupData[gid] = { scores: [], passed: 0 }; });

      validEmployees.forEach(emp => {
        const seniority  = getSeniorityMonths(emp.join_date, dashboardMonth);
        const empSummary = summaryMap.get(String(emp.id).trim());
        const storeId    = String(emp.restaurant_id || '').trim().toUpperCase();
        const effective  = dataService.getEffectiveGrades(emp.id, dashboardMonth, storeId);

        let empTotalSum = 0;

        Object.entries(EVALUATION_GROUPS).forEach(([gid, gconfig]) => {
          if (gid === 'C' && seniority <= 2) return;

          let gAvg = 0;
          const groupGrades = effective.filter(g => g.group === gid);

          if (groupGrades.length > 0) {
            gAvg = groupGrades.reduce((s, g) => s + g.score, 0) / gconfig.categories.length;
          } else if (empSummary && gid !== 'D' && gid !== 'F') {
            // D y F NO heredan del summary: solo cuentan si hay nota directa en el mes
            gAvg = empSummary[`avg_${gid.toLowerCase()}`] || 0;
          }

          groupData[gid].scores.push(gAvg);
          if (gAvg >= APPROVAL_THRESHOLD) groupData[gid].passed++;
          empTotalSum += gAvg;
        });

        if ((empTotalSum / Object.keys(EVALUATION_GROUPS).length) >= APPROVAL_THRESHOLD) approvedCount++;
      });

      const totalEmployees    = validEmployees.length;
      const eligibleAllStar   = validEmployees.filter(e => getSeniorityMonths(e.join_date, dashboardMonth) > 2).length;

      const groupAvgs = Object.keys(EVALUATION_GROUPS).map(gid => {
        const scores = groupData[gid].scores;
        const avg    = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const denom  = gid === 'C' ? eligibleAllStar : totalEmployees;
        return {
          id:   gid,
          name: EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS].name,
          avg:  Math.round(avg),
          rate: denom > 0 ? Math.round((groupData[gid].passed / denom) * 100) : 0
        };
      });

      // Solo promediar grupos que tienen al menos una nota registrada
      const globalProgress = groupAvgs.length > 0
        ? Math.round(groupAvgs.reduce((acc, g) => acc + g.avg, 0) / groupAvgs.length)
        : 0;

      return { totalEmployees, approvedCount, pendingCount: totalEmployees - approvedCount, globalProgress, groupAvgs };
    },
    staleTime: 60 * 1000
  });

  const stats = statsMap || {
    totalEmployees: 0,
    approvedCount: 0,
    pendingCount: 0,
    globalProgress: 0,
    groupAvgs: Object.keys(EVALUATION_GROUPS).map(gid => ({ id: gid, name: EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS].name, avg: 0 }))
  };

  const handleExportFinal = async () => {
    setIsExporting(true);
    let allGradesForMonth: GradeEntry[] = [];

    // Si se requiere detalle, traemos solo las notas de los empleados que aplican al filtro
    if (exportConfig.includeDetails) {
      const storeIds = Array.from(scopeStoresSet);
      
      // Filtrar empleados que pertenecen a las tiendas seleccionadas
      const validEmployees = initialEmployees.filter(emp => {
        const normalizedStore = String(emp.restaurant_id || '').trim().toUpperCase();
        return storeIds.includes(normalizedStore);
      });

      const empIdsToFetch = validEmployees.map(e => String(e.id).trim());

      if (empIdsToFetch.length > 0) {
        // Separar en chunks de 100 para evitar límite de longitud de URL en Supabase
        const CHUNK_SIZE = 100;
        const chunks = [];
        for (let i = 0; i < empIdsToFetch.length; i += CHUNK_SIZE) {
          chunks.push(empIdsToFetch.slice(i, i + CHUNK_SIZE));
        }

        const allResults = await Promise.all(
          chunks.map(chunk => {
            const inFilter = chunk.map(id => `"${id}"`).join(',');
            return dataService.supabaseFetchAll('grades', `?employee_id=in.(${inFilter})&month=lte.${dashboardMonth}-01`);
          })
        );

        const raw = allResults.flat();
        allGradesForMonth = (raw || []).map((g: any) => ({
          employeeId: String(g.employee_id).trim(),
          restaurantId: String(g.restaurant_id || '').trim(),
          month: g.month,
          group: g.group,
          category: g.category,
          score: g.score
        }));
      }
    }

    const summaries = dataService.getGradesSummary();

    const worker = new ExportWorker();
    worker.postMessage({
      initialEmployees,
      restaurants,
      summaries,
      allGradesForMonth,
      exportConfig,
      selectedMonth: dashboardMonth,
      filterRegion,
      filterZone,
      filterStore,
      searchPerson,
      userRole: user.role,
      assignedRegions: user.assignedRegions || [],
      evaluationGroups: EVALUATION_GROUPS,
      hierarchy: dataService.getHierarchy()
    });

    worker.onmessage = (e) => {
      setIsExporting(false);
      if (e.data.success) {
        // e.data.data is the ArrayBuffer holding the XLSX
        const blob = new Blob([e.data.data], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Akademia_${dashboardMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportModal(false);
      } else {
        console.error("Error en Web Worker de Exportación:", e.data.error);
        alert("Ocurrió un error al exportar el archivo. Revisa la consola.");
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      setIsExporting(false);
      console.error("Worker fatal error:", err);
      alert("Error crítico en el proceso de exportación.");
      worker.terminate();
    };
  };

  const selectClasses = "w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase text-slate-800 outline-none focus:border-red-500 transition-all shadow-sm";

  return (
    <div className="space-y-6 bg-slate-50/50 -m-8 p-8 min-h-screen">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end">
        <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"><Calendar className="w-3 h-3 mr-1 inline" /> Periodo</label>
          <div className="flex gap-2">
            <select value={dashboardMonth.split('-')[0]} onChange={(e) => setDashboardMonth(`${e.target.value}-${dashboardMonth.split('-')[1]}`)} className={selectClasses}>
              {['2023', '2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={dashboardMonth.split('-')[1]} onChange={(e) => setDashboardMonth(`${dashboardMonth.split('-')[0]}-${e.target.value}`)} className={selectClasses}>
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, idx) => (
                <option key={m} value={m}>{['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][idx]}</option>
              ))}
            </select>
          </div>
        </div>
        {(user.role === UserRole.ADMIN || user.role === UserRole.COORDINATOR) && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"><MapPin className="w-3 h-3 mr-1 inline" /> Región</label>
            <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectClasses}>
              <option value="all">{user.role === UserRole.COORDINATOR ? 'Mis Regiones' : 'Todas'}</option>
              {dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"><Filter className="w-3 h-3 mr-1 inline" /> Zona</label>
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className={selectClasses}>
            <option value="all">Todas</option>
            {dynamicZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"><Filter className="w-3 h-3 mr-1 inline" /> Tienda</label>
          <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className={selectClasses}>
            <option value="all">Todas</option>
            {dynamicStores.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1"><Search className="w-3 h-3 mr-1 inline" /> Persona</label>
          <input type="text" placeholder="ID o Nombre..." value={searchPerson} onChange={(e) => setSearchPerson(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase text-slate-800" />
        </div>
        <button onClick={() => setShowExportModal(true)} className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">
          <Download className="w-4 h-4" /> <span>Generar Reporte</span>
        </button>
      </div>

      {/* Panel de Indicadores Principales */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Equipo" value={stats.totalEmployees} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Curva Global" value={`${stats.globalProgress}%`} color="blue" />
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center mb-8"><TrendingUp className="w-4 h-4 mr-2 text-red-500" /> Desempeño por Grupo</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.groupAvgs} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="avg" radius={[10, 10, 0, 0]} barSize={45}>
                <LabelList dataKey="avg" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: '10px', fontWeight: '900', fill: '#64748b' }} />
                {stats.groupAvgs.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.avg >= APPROVAL_THRESHOLD ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica de Tendencia Histórica */}
      <TrendChart 
        dashboardMonth={dashboardMonth} 
        filterRegion={filterRegion} 
        filterZone={filterZone} 
        filterStore={filterStore}
        user={user}
      />



      {showExportModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black uppercase italic tracking-tighter text-xl leading-none">Configurar Exportación</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{selectedMonth}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Seleccionar Grupos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(EVALUATION_GROUPS).map(([id, group]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setExportConfig(prev => ({
                          ...prev,
                          groups: prev.groups.includes(id) ? prev.groups.filter(gid => gid !== id) : [...prev.groups, id]
                        }));
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${exportConfig.groups.includes(id) ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-slate-50 border-transparent text-slate-400 opacity-60 hover:opacity-100'}`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-tight">{group.name}</span>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${exportConfig.groups.includes(id) ? 'bg-red-600 text-white' : 'bg-slate-200'}`}>
                        {exportConfig.groups.includes(id) && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[32px] border-2 border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-all ${exportConfig.includeDetails ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-900 leading-none">Detalle por categoría</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Exportar notas individuales por item</p>
                  </div>
                </div>
                <button
                  onClick={() => setExportConfig(prev => ({ ...prev, includeDetails: !prev.includeDetails }))}
                  className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${exportConfig.includeDetails ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${exportConfig.includeDetails ? 'left-8' : 'left-1'}`} />
                </button>
              </div>

              <button
                onClick={handleExportFinal}
                disabled={isExporting}
                className={`w-full py-6 text-white font-black rounded-[32px] shadow-2xl transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 group ${isExporting ? 'bg-slate-400 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-700 hover:-translate-y-1'}`}
              >
                {isExporting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                )}
                {isExporting ? 'Procesando miles de registros...' : 'Generar Reporte Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, sublabel?: string, value: string | number, color?: string }> = ({ icon, label, sublabel, value, color = 'gray' }) => {
  const colorMap: { [key: string]: string } = {
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    gray: 'bg-slate-50 text-slate-500 border-slate-100'
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md group flex items-center gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <h4 className="text-xl font-black text-slate-800 tracking-tighter leading-none mb-0.5 truncate">{value}</h4>
        <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] leading-none">{label}</p>
        {sublabel && <p className="text-[7px] text-slate-300 font-bold uppercase tracking-wide leading-none mt-0.5 truncate">{sublabel}</p>}

        {label === 'Curva Global' && (
          <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-1000 ${parseInt(String(value)) >= 90 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${parseInt(String(value)) || 0}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const TrendChart: React.FC<{ dashboardMonth: string, filterRegion: string, filterZone: string, filterStore: string, user: User }> = ({ dashboardMonth, filterRegion, filterZone, filterStore, user }) => {
  const hierarchy = useMemo(() => dataService.getHierarchy(), []);
  const lockedMonths = hierarchy?.lockedMonths || [];

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['dashboard-trend-detailed', dashboardMonth, filterRegion, filterZone, filterStore, lockedMonths.length, user.id],
    queryFn: async () => {
      const [year, currentMonthNum] = dashboardMonth.split('-').map(Number);
      const months: string[] = [];
      
      // Generar desde Enero (01) hasta el mes actual del año seleccionado
      for (let i = 1; i <= currentMonthNum; i++) {
        const mStr = `${year}-${String(i).padStart(2, '0')}`;
        // SOLO TENER EN CUENTA MESES ASENTADOS
        if (lockedMonths.includes(mStr)) {
          months.push(mStr);
        }
      }

      if (months.length === 0) return [];

      const history = await Promise.all(months.map(async (m) => {
        // Aplicar scope del usuario igual que en las métricas principales
        const effectiveZone = filterZone !== 'all'
          ? filterZone
          : (user.role === UserRole.SPECIALIST && user.assignedZones?.length > 0)
            ? user.assignedZones[0]
            : undefined;

        const effectiveRegion = filterRegion !== 'all'
          ? filterRegion
          : (user.role === UserRole.COORDINATOR && user.assignedRegions?.length > 0)
            ? user.assignedRegions[0]
            : undefined;

        const rpcData = await dataService.getDashboardStats(
          m,
          filterStore !== 'all' ? filterStore : undefined,
          effectiveZone,
          effectiveRegion
        );

        const dataPoint: any = { 
          month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][new Date(m + '-02').getMonth()]
        };

        // Extraer promedio de cada grupo
        Object.keys(EVALUATION_GROUPS).forEach(gid => {
          const row = rpcData?.find((r: any) => r.group_id === gid);
          dataPoint[gid] = row ? Math.round(Number(row.avg_score)) : 0;
        });
        
        return dataPoint;
      }));

      return history;
    },
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return (
    <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-24 min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></div>
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center relative border border-red-100">
            <TrendingUp className="w-7 h-7 animate-bounce" />
          </div>
        </div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mt-4">Calculando Historial Anual...</h4>
        <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">
          Por favor espera un momento mientras procesamos los datos del período de evaluación.
        </p>
      </div>
    </div>
  );

  const LINE_COLORS: Record<string, string> = {
    'AK': '#ef4444', // Rojo
    'A': '#f59e0b',  // Ambar
    'B': '#10b981',  // Esmeralda
    'C': '#3b82f6',  // Azul
    'D': '#8b5cf6',  // Violeta
    'E': '#ec4899',  // Rosa
    'F': '#6366f1'   // Indigo
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
            <Activity className="w-4 h-4 mr-2 text-red-500" /> Evolución Detallada por Nota
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Tendencia acumulada del año actual</p>
        </div>
      </div>
      
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-[9px] font-black uppercase text-slate-500 ml-1">{EVALUATION_GROUPS[value as keyof typeof EVALUATION_GROUPS]?.name || value}</span>}
            />
            {Object.keys(EVALUATION_GROUPS).map(gid => (
              <Line 
                key={gid}
                type="monotone" 
                dataKey={gid} 
                stroke={LINE_COLORS[gid]} 
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
