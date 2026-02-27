
import React, { useMemo, useState } from 'react';
import { GradeEntry, Employee, User, Restaurant, UserRole } from '../types';
import { dataService } from '../dataService';
import { EVALUATION_GROUPS, APPROVAL_THRESHOLD, TOTAL_CATEGORIES_COUNT } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Activity, XCircle, Users, Award, TrendingUp, Search, MapPin, Filter, Download, X, Check, FileText, ArrowUpCircle, ArrowDownCircle, RefreshCw, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  employees: Employee[];
  restaurants: Restaurant[];
  selectedMonth: string;
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ employees: initialEmployees, restaurants, selectedMonth, user }) => {
  const [searchPerson, setSearchPerson] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');

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

  const employeesWithEffectiveGrades = useMemo(() => {
    const summaries = dataService.getGradesSummary();
    const summaryMap = new Map(summaries.map(s => [String(s.employee_id).trim(), s]));

    return initialEmployees.map(emp => {
      const empId = String(emp.id).trim();
      const summary = summaryMap.get(empId);

      const avg = summary ? Math.round(summary.avg_score) : 0;
      const isApproved = summary ? summary.is_approved : false;
      const isPending = !summary;
      const storeIdAtPeriod = summary ? summary.restaurant_id : emp.restaurant_id;

      return {
        ...emp,
        effectiveGrades: [], // En vista global no cargamos detalle de categorías
        summary, // Guardamos el resumen para las barras
        storeIdAtPeriod,
        avg,
        isApproved,
        isPending
      };
    });
  }, [initialEmployees, selectedMonth]);

  const filteredData = useMemo(() => {
    const searchLower = searchPerson.toLowerCase();
    const isSpecialist = user.role === UserRole.SPECIALIST;
    const isCoordinator = user.role === UserRole.COORDINATOR;
    const assignedRegions = user.assignedRegions || [];

    const restaurantMap = new Map<string, Restaurant>(restaurants.map(r => [r.id.trim().toUpperCase(), r]));

    return employeesWithEffectiveGrades.filter(e => {
      const matchPerson = searchPerson === '' || e.name.toLowerCase().includes(searchLower) || e.id.includes(searchPerson);
      if (!matchPerson) return false;

      const normalizedStoreId = String(e.storeIdAtPeriod || '').trim().toUpperCase();
      const store = restaurantMap.get(normalizedStoreId);

      const matchRegion = filterRegion === 'all'
        ? (isCoordinator ? assignedRegions.includes(store?.region || '') : true)
        : store?.region === filterRegion;
      if (!matchRegion) return false;

      const matchZone = filterZone === 'all' ? true : store?.zone === filterZone;
      if (!matchZone) return false;

      const matchStore = filterStore === 'all' ? true : normalizedStoreId === String(filterStore).trim().toUpperCase();
      return matchStore;
    });
  }, [employeesWithEffectiveGrades, searchPerson, filterStore, filterZone, filterRegion, restaurants, user]);

  const stats = useMemo(() => {
    let approvedCount = 0;
    let pendingCount = 0;

    filteredData.forEach(e => {
      if (e.isApproved) approvedCount++;
      if (e.isPending) pendingCount++;
    });

    const groupAvgs = Object.keys(EVALUATION_GROUPS).map(gid => {
      const gCert = filteredData.filter(e => {
        if (e.isPending || !e.summary) return false;
        const val = e.summary[`avg_${gid.toLowerCase()}`];
        return val !== null && val !== undefined && val >= APPROVAL_THRESHOLD;
      }).length;

      const gTotal = filteredData.length; // Total de trabajadores activos del periodo

      return {
        id: gid,
        name: EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS].name,
        avg: gTotal > 0 ? Math.round((gCert / gTotal) * 100) : 0
      };
    });

    const globalProgress = filteredData.length > 0
      ? Math.round(filteredData.reduce((acc, e) => acc + (e.avg || 0), 0) / filteredData.length)
      : 0;

    // --- Cálculo de Ingresos, Retiros, Rotación y Retención (Filtrado) ---
    const isSpecialist = user.role === UserRole.SPECIALIST;
    const isCoordinator = user.role === UserRole.COORDINATOR;
    const assignedRegions = user.assignedRegions || [];

    // Pre-calculamos el set de tiendas en alcance para velocidad
    const scopeStoresSet = new Set(restaurants
      .filter(r => {
        const matchRegion = filterRegion === 'all'
          ? (isCoordinator ? assignedRegions.includes(r.region) : true)
          : r.region === filterRegion;
        const matchZone = filterZone === 'all' ? true : r.zone === filterZone;
        const matchStore = filterStore === 'all' ? true : r.id === filterStore;
        return matchRegion && matchZone && matchStore;
      })
      .map(r => r.id.trim().toUpperCase())
    );

    const isInScope = (idOrName: string) => {
      if (!idOrName) return false;
      const search = idOrName.trim().toUpperCase();
      // Buscamos si es un ID directo en el set
      if (scopeStoresSet.has(search)) return true;
      // Si es un nombre, buscamos el ID correspondiente en la lista global de tiendas
      const store = restaurants.find(r => r.name.trim().toUpperCase() === search);
      return store ? scopeStoresSet.has(store.id.trim().toUpperCase()) : false;
    };

    const entries = initialEmployees.reduce((acc, emp) => {
      const hasHistoryIngreso = emp.history?.some(h =>
        h.action === 'INGRESO' && h.date.startsWith(selectedMonth) && isInScope(h.restaurantName)
      );
      if (hasHistoryIngreso) return acc + 1;

      const matchesJoinDate = emp.join_date?.startsWith(selectedMonth) && isInScope(emp.restaurant_id);
      return matchesJoinDate ? acc + 1 : acc;
    }, 0);

    const exits = initialEmployees.reduce((acc, emp) => {
      const hasHistoryRetiro = emp.history?.some(h =>
        h.action === 'RETIRO' && h.date.startsWith(selectedMonth) && isInScope(h.restaurantName)
      );
      if (hasHistoryRetiro) return acc + 1;

      const matchesExitDate = emp.exit_date?.startsWith(selectedMonth) && isInScope(emp.restaurant_id);
      return matchesExitDate ? acc + 1 : acc;
    }, 0);

    const activeInScope = filteredData.length;
    const rotationRate = activeInScope > 0 ? (exits / activeInScope) * 100 : 0;
    const empsInicio = (activeInScope - entries + exits);
    const retentionRate = empsInicio > 0 ? ((activeInScope - entries) / empsInicio) * 100 : 0;

    return {
      totalEmployees: filteredData.length,
      approvedCount,
      pendingCount,
      groupAvgs,
      globalProgress,
      entries,
      exits,
      rotation: rotationRate.toFixed(1),
      retention: Math.min(100, retentionRate).toFixed(1)
    };
  }, [filteredData, initialEmployees, selectedMonth, filterRegion, filterZone, filterStore, restaurants, user.assignedRegions, user.role]);

  const handleExportFinal = async () => {
    let allGradesForMonth: GradeEntry[] = [];

    // Si se requiere detalle, traemos toda la base de datos de notas de ese mes una sola vez
    if (exportConfig.includeDetails) {
      const raw = await dataService.supabaseFetchAll('grades', `?month=eq.${selectedMonth}-01`);
      allGradesForMonth = (raw || []).map((g: any) => ({
        employeeId: String(g.employee_id).trim(),
        restaurantId: String(g.restaurant_id || '').trim(),
        month: g.month,
        group: g.group,
        category: g.category,
        score: g.score
      }));
    }

    const restaurantMap = new Map<string, Restaurant>(restaurants.map(r => [r.id, r]));
    const gradeIndex = new Map<string, GradeEntry[]>();

    if (exportConfig.includeDetails) {
      allGradesForMonth.forEach(g => {
        if (!gradeIndex.has(g.employeeId)) gradeIndex.set(g.employeeId, []);
        gradeIndex.get(g.employeeId)!.push(g);
      });
    }

    const exportData = filteredData.map(emp => {
      const empStore = restaurantMap.get(emp.storeIdAtPeriod);
      const dynamicColumns: { [key: string]: string } = {};
      const empId = String(emp.id).trim();

      exportConfig.groups.forEach(gid => {
        const gConfig = EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS];

        // Usar promedio del resumen para la columna general del grupo
        const groupAvg = emp.summary ? Math.round(emp.summary[`avg_${gid.toLowerCase()}`] || 0) : 0;
        dynamicColumns[`${gConfig.name} %`] = `${groupAvg}%`;

        if (exportConfig.includeDetails) {
          const empGrades = gradeIndex.get(empId) || [];
          const gGrades = empGrades.filter(g => g.group === gid);

          gConfig.categories.forEach((cat: string, index: number) => {
            let catName = cat;
            if (gid === 'D') {
              const cfg = hierarchy.groupDConfig?.[selectedMonth];
              if (index === 0) catName = cfg?.cat1 || "Guías Plan de Capacitación";
              if (index === 1) catName = cfg?.cat2 || "Guías de SST";
            }
            const grade = gGrades.find(g => g.category === cat);
            dynamicColumns[`[${gConfig.name}] ${catName}`] = grade ? `${grade.score}%` : '0%';
          });
        }
      });

      return {
        "Documento": emp.id,
        "Nombre completo": emp.name,
        "Estado": emp.active ? "Activo" : "Retirado",
        "Cargo": emp.title,
        "Tienda Reportada": empStore?.name || emp.storeIdAtPeriod,
        "Ceco": emp.storeIdAtPeriod,
        "Jefe de area": empStore?.zone || emp.zone,
        "Mes Reporte": selectedMonth,
        "Promedio General": `${emp.avg}%`,
        "Certificación": emp.isPending ? 'Pendiente' : (emp.isApproved ? 'Aprobado' : 'No Cumple'),
        "Origen Nota": emp.isPending ? 'N/A' : (emp.summary ? 'Registrada' : 'S/N'),
        ...dynamicColumns
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Akademia");
    XLSX.writeFile(wb, `Reporte_Akademia_${selectedMonth}.xlsx`);
    setShowExportModal(false);
  };

  const selectClasses = "w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase text-slate-800 outline-none focus:border-red-500 transition-all shadow-sm";

  return (
    <div className="space-y-6 bg-slate-50/50 -m-8 p-8 min-h-screen">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
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
          <Download className="w-4 h-4" /> <span>Exportar Excel</span>
        </button>
      </div>

      {/* Panel de Indicadores Principales */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Equipo" value={stats.totalEmployees} />
          <StatCard icon={<Award className="w-5 h-5" />} label="Certificados" value={stats.approvedCount} color="green" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Curva Global" value={`${stats.globalProgress}%`} color="blue" />
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Pendientes" value={filteredData.filter(e => e.isPending).length} color="red" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<ArrowUpCircle className="w-5 h-5" />} label="Ingresos" value={stats.entries} color="green" />
          <StatCard icon={<ArrowDownCircle className="w-5 h-5" />} label="Retiros" value={stats.exits} color="red" />
          <StatCard icon={<RefreshCw className="w-5 h-5" />} label="Rotación" value={`${stats.rotation}%`} color="amber" />
          <StatCard icon={<UserCheck className="w-5 h-5" />} label="Retención" value={`${stats.retention}%`} color="blue" />
        </div>
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
                className="w-full py-6 bg-red-600 text-white font-black rounded-[32px] hover:bg-red-700 shadow-2xl transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                Generar Reporte Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color?: string }> = ({ icon, label, value, color = 'gray' }) => {
  const colorMap: { [key: string]: string } = {
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    gray: 'bg-slate-50 text-slate-500 border-slate-100'
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:shadow-md group flex items-center gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <h4 className="text-xl font-black text-slate-800 tracking-tighter leading-none mb-1 truncate">{value}</h4>
        <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] leading-none">{label}</p>

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

export default Dashboard;
