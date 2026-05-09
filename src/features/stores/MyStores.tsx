
import React, { useMemo, useState } from 'react';
import { User, Restaurant, Employee, UserRole, JobHierarchy, JobTitle } from '@/types';
import { Store, MapPin, Users, Award, ArrowLeft, TrendingUp, Search, Edit3, LineChart, Download, X, Calendar, RefreshCw, ChevronRight, Activity, BookOpen, GraduationCap, Star, Trophy, ClipboardCheck, Vault } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { APPROVAL_THRESHOLD, TOTAL_CATEGORIES_COUNT, EVALUATION_GROUPS } from '@/utils/constants';
import GradeEditor from '@/features/dashboard/GradeEditor';
import { generateStorePdf } from './utils/pdfGenerator';
import { getSeniorityMonths, normalizeRole } from './utils/storeUtils';


import { useAppStore } from '@/store/useAppStore';

const GroupIcons: Record<string, React.ReactNode> = {
  'AK': <BookOpen className="w-4 h-4" />,
  'A': <GraduationCap className="w-4 h-4" />,
  'B': <Star className="w-4 h-4" />,
  'C': <Trophy className="w-4 h-4" />,
  'D': <ClipboardCheck className="w-4 h-4" />,
  'E': <Vault className="w-4 h-4" />,
  'F': <Activity className="w-4 h-4" />,
};



const MyStores: React.FC = () => {
  const { auth, restaurants, employees, selectedMonth, refreshData: onUpdate } = useAppStore();
  const user = auth.user!;
  const [selectedStore, setSelectedStore] = useState<Restaurant | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const STORES_PER_PAGE = 12;

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMonth, setPdfMonth] = useState(selectedMonth);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [gradeVersion, setGradeVersion] = useState(0); // Trigger re-render tras carga async

  React.useEffect(() => {
    if (selectedStore) {
      // Activar la clave del bucket correcto de forma SINCRÓNICA
      // para que cualquier render que ocurra durante la carga apunte al store+mes correcto
      const cacheKey = `${selectedStore.id.trim().toUpperCase()}::${selectedMonth}`;
      dataService._cache.activeStoreKey = cacheKey;
      dataService._cache.gradeIndex = null;

      setIsLoadingGrades(true);
      dataService.loadGradesForStore(selectedStore.id, selectedMonth).then(() => {
        onUpdate();
        setGradeVersion(v => v + 1); // Fuerza re-computacion de efectivos
        setIsLoadingGrades(false);
      }).catch(() => setIsLoadingGrades(false));
    }
  }, [selectedStore, selectedMonth]);

  const dynamicRegions = useMemo(() => {
    const all = Array.from(new Set(restaurants.map(r => r.region))).filter(Boolean).sort();
    if (user.role === UserRole.COORDINATOR) {
      return all.filter(r => user.assignedRegions?.includes(r));
    }
    return all;
  }, [restaurants, user]);

  const dynamicZones = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') {
      base = base.filter(r => r.region === filterRegion);
    } else if (user.role === UserRole.COORDINATOR) {
      base = base.filter(r => user.assignedRegions?.includes(r.region));
    }

    let zones = Array.from(new Set(base.map(r => r.zone))).filter(Boolean).sort();
    if (user.role === UserRole.SPECIALIST) {
      zones = zones.filter(z => user.assignedZones.includes(z));
    }
    return zones;
  }, [restaurants, filterRegion, user]);

  const assigned = useMemo(() => {
    let base = restaurants;
    if (user.role === UserRole.COORDINATOR) {
      base = restaurants.filter(r => user.assignedRegions?.includes(r.region));
    } else if (user.role === UserRole.SPECIALIST) {
      base = restaurants.filter(r => user.assignedRestaurants.includes(r.id) || user.assignedZones.includes(r.zone));
    }

    return base.filter(r => {
      const matchSearch = storeSearch === '' || r.name.toLowerCase().includes(storeSearch.toLowerCase()) || r.id.includes(storeSearch);
      const matchRegion = filterRegion === 'all' || r.region === filterRegion;
      const matchZone = filterZone === 'all' || r.zone === filterZone;
      return matchSearch && matchRegion && matchZone;
    });
  }, [user, restaurants, storeSearch, filterRegion, filterZone]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [storeSearch, filterRegion, filterZone]);

  const totalPages = Math.ceil(assigned.length / STORES_PER_PAGE);
  const paginatedStores = useMemo(() => {
    const startIndex = (currentPage - 1) * STORES_PER_PAGE;
    return assigned.slice(startIndex, startIndex + STORES_PER_PAGE);
  }, [assigned, currentPage]);

  const storesWithStats = useMemo(() => {
    // Optimización: Agrupar empleados por tienda una sola vez (O(N))
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const periodEndStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    const periodStartStr = `${selectedMonth}-01`;

    const employeesByStore = new Map<string, Employee[]>();
    employees.forEach(e => {
      // Lógica Histórica
      const joinDateStr = e.join_date ? e.join_date.substring(0, 10) : '0000-01-01';
      const exitDateStr = e.exit_date ? e.exit_date.substring(0, 10) : '9999-12-31';
      const isHistoricalActive = (joinDateStr <= periodEndStr) && (exitDateStr >= periodStartStr);

      if (isHistoricalActive) {
        const normId = (e.restaurant_id || '').trim().toUpperCase();
        if (!employeesByStore.has(normId)) employeesByStore.set(normId, []);
        employeesByStore.get(normId)!.push(e);
      }
    });

    return assigned.map(store => {
      const normStoreId = store.id.trim().toUpperCase();
      const storeEmps = employeesByStore.get(normStoreId) || [];
      if (storeEmps.length === 0) return { ...store, stats: { total: 0, approved: 0, percent: 0, groupStats: {} as Record<string, { avg: number, approvalRate: number }>, cargoCounts: {} as Record<string, number> } };

      let storeApprovedCount = 0;
      const groupData: Record<string, { scores: number[], passed: number }> = {};
      const cargoCounts: Record<string, number> = {};

      Object.keys(EVALUATION_GROUPS).forEach(gid => {
        groupData[gid] = { scores: [], passed: 0 };
      });

      const summaryMap = new Map((dataService.getGradesSummary() || []).map(s => [String(s.employee_id).trim(), s]));

      storeEmps.forEach(emp => {
        const normTitle = normalizeRole(emp.title);
        cargoCounts[normTitle] = (cargoCounts[normTitle] || 0) + 1;

        const effective = dataService.getEffectiveGrades(emp.id, selectedMonth, store.id);
        const empSummary = summaryMap.get(String(emp.id).trim());

        let sum = 0;
        let isApproved = false;

        if (effective.length > 0) {
          sum = effective.reduce((s, g) => s + g.score, 0);
          isApproved = (sum / TOTAL_CATEGORIES_COUNT) >= APPROVAL_THRESHOLD;
        } else if (empSummary) {
          sum = empSummary.avg_score * TOTAL_CATEGORIES_COUNT;
          isApproved = empSummary.is_approved;
        }

        if (isApproved) storeApprovedCount++;

        Object.entries(EVALUATION_GROUPS).forEach(([gid, gconfig]) => {
          // REGLA: El indicador All-Star (Grupo C) solo cuenta para personal con +3 meses
          const seniority = getSeniorityMonths(emp.join_date, selectedMonth);
          if (gid === 'C' && seniority <= 3) return;

          let gAvg = 0;
          const groupGrades = effective.filter(g => g.group === gid);

          if (groupGrades.length > 0) {
            const gSum = groupGrades.reduce((s, g) => s + g.score, 0);
            gAvg = gSum / gconfig.categories.length;
          } else if (empSummary) {
            gAvg = empSummary[`avg_${gid.toLowerCase()}`] || 0;
          }

          groupData[gid].scores.push(gAvg);
          if (gAvg >= APPROVAL_THRESHOLD) groupData[gid].passed++;
        });
      });

      const groupStats: Record<string, { avg: number, approvalRate: number }> = {};
      let totalAvgSum = 0;
      const eligibleForAllStar = storeEmps.filter(e => getSeniorityMonths(e.join_date, selectedMonth) > 3).length;
      Object.keys(EVALUATION_GROUPS).forEach(gid => {
        const avg = groupData[gid].scores.length > 0 ? groupData[gid].scores.reduce((a, b) => a + b, 0) / groupData[gid].scores.length : 0;
        
        let rate = 0;
        if (gid === 'C') {
          rate = eligibleForAllStar > 0 ? (groupData[gid].passed / eligibleForAllStar) * 100 : 0;
        } else {
          rate = storeEmps.length > 0 ? (groupData[gid].passed / storeEmps.length) * 100 : 0;
        }

        const roundedAvg = Math.round(avg);
        groupStats[gid] = { avg: roundedAvg, approvalRate: Math.round(rate) };
        totalAvgSum += roundedAvg;
      });

      return {
        ...store,
        stats: {
          total: storeEmps.length,
          approved: storeApprovedCount, // Contador de personas con >90% global
          percent: Math.round(totalAvgSum / Object.keys(EVALUATION_GROUPS).length), // Promedio de promedios para la "Curva Global"
          groupStats,
          cargoCounts
        }
      };
    });
  }, [assigned, employees, selectedMonth, gradeVersion]);

  const getStoreStatsForMonth = (storeId: string, month: string) => {
    // Si es el mes seleccionado, usamos la versión memoizada
    if (month === selectedMonth) {
      const found = storesWithStats.find(s => s.id === storeId);
      if (found) return found.stats;
    }

    // Si no, hacemos el cálculo (para PDFs históricos por ejemplo)
    const normStoreId = storeId.trim().toUpperCase();
    const [yVal, mVal] = month.split('-').map(Number);
    const lastDayVal = new Date(yVal, mVal, 0).getDate();
    const periodEndStr = `${month}-${String(lastDayVal).padStart(2, '0')}`;
    const periodStartStr = `${month}-01`;

    const storeEmps = employees.filter(e => {
      const joinDateStr = e.join_date ? e.join_date.substring(0, 10) : '0000-01-01';
      const exitDateStr = e.exit_date ? e.exit_date.substring(0, 10) : '9999-12-31';
      const isHistoricalActive = (joinDateStr <= periodEndStr) && (exitDateStr >= periodStartStr);
      return (e.restaurant_id || '').trim().toUpperCase() === normStoreId && isHistoricalActive;
    });
    if (storeEmps.length === 0) return { total: 0, approved: 0, percent: 0, groupStats: {} as Record<string, { avg: number, approvalRate: number }>, cargoCounts: {} as Record<string, number> };

    let storeApprovedCount = 0;
    const groupData: Record<string, { scores: number[], passed: number }> = {};
    const cargoCounts: Record<string, number> = {};

    Object.keys(EVALUATION_GROUPS).forEach(gid => {
      groupData[gid] = { scores: [], passed: 0 };
    });

    const summaryMap = new Map((dataService.getGradesSummary() || []).map(s => [String(s.employee_id).trim(), s]));

    storeEmps.forEach(emp => {
      const normTitle = normalizeRole(emp.title);
      cargoCounts[normTitle] = (cargoCounts[normTitle] || 0) + 1;

      const effective = dataService.getEffectiveGrades(emp.id, month, storeId);
      const empSummary = summaryMap.get(String(emp.id).trim());

      let sum = 0;
      let isApproved = false;

      if (effective.length > 0) {
        sum = effective.reduce((s, g) => s + g.score, 0);
        isApproved = (sum / TOTAL_CATEGORIES_COUNT) >= APPROVAL_THRESHOLD;
      } else if (empSummary) {
        sum = empSummary.avg_score * TOTAL_CATEGORIES_COUNT;
        isApproved = empSummary.is_approved;
      }

      if (isApproved) storeApprovedCount++;

      Object.entries(EVALUATION_GROUPS).forEach(([gid, gconfig]) => {
        // REGLA: El indicador All-Star (Grupo C) solo cuenta para personal con +3 meses
        const seniority = getSeniorityMonths(emp.join_date, month);
        if (gid === 'C' && seniority <= 3) return;

        let gAvg = 0;
        const groupGrades = effective.filter(g => g.group === gid);

        if (groupGrades.length > 0) {
          const gSum = groupGrades.reduce((s, g) => s + g.score, 0);
          gAvg = gSum / gconfig.categories.length;
        } else if (empSummary) {
          gAvg = empSummary[`avg_${gid.toLowerCase()}`] || 0;
        }

        groupData[gid].scores.push(gAvg);
        if (gAvg >= APPROVAL_THRESHOLD) groupData[gid].passed++;
      });
    });

    const groupStats: Record<string, { avg: number, approvalRate: number }> = {};
    let totalAvgSum = 0;
    const eligibleForAllStar = storeEmps.filter(e => getSeniorityMonths(e.join_date, month) > 3).length;
    Object.keys(EVALUATION_GROUPS).forEach(gid => {
      const avg = groupData[gid].scores.length > 0 ? groupData[gid].scores.reduce((a, b) => a + b, 0) / groupData[gid].scores.length : 0;
      
      let rate = 0;
      if (gid === 'C') {
        rate = eligibleForAllStar > 0 ? (groupData[gid].passed / eligibleForAllStar) * 100 : 0;
      } else {
        rate = storeEmps.length > 0 ? (groupData[gid].passed / storeEmps.length) * 100 : 0;
      }

      const roundedAvg = Math.round(avg);
      groupStats[gid] = { avg: roundedAvg, approvalRate: Math.round(rate) };
      totalAvgSum += roundedAvg;
    });

    return { total: storeEmps.length, approved: storeApprovedCount, percent: Math.round(totalAvgSum / Object.keys(EVALUATION_GROUPS).length), groupStats, cargoCounts };
  };



  const handleGeneratePDF = async () => {
    if (!selectedStore || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const stats = getStoreStatsForMonth(selectedStore.id, pdfMonth);
      await generateStorePdf(selectedStore, pdfMonth, employees, stats);
      setShowPdfModal(false);
    } catch (err) {
      console.error(err);
      alert("Error al generar el reporte PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectClasses = "p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-800 outline-none focus:border-red-500 transition-all shadow-sm";

  if (selectedStore) {
    const stats = getStoreStatsForMonth(selectedStore.id, selectedMonth);
    const storeEmps = employees
      .filter(e => e.restaurant_id === selectedStore.id && e.active)
      .filter(e => empSearch === '' || e.name.toLowerCase().includes(empSearch.toLowerCase()) || e.id.includes(empSearch))
      .sort((a, b) => (JobHierarchy[a.title] || 99) - (JobHierarchy[b.title] || 99));

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <button type="button" onClick={() => { setSelectedStore(null); setEmpSearch(''); }} className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-red-600 transition-all shadow-sm relative z-20"><ArrowLeft className="w-5 h-5" /></button>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter uppercase italic leading-none truncate">{selectedStore.name}</h2>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center mt-2 truncate"><MapPin className="w-3 h-3 mr-1.5 text-red-500" /> {selectedStore.zone} • {selectedStore.region}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setPdfMonth(selectedMonth); setShowPdfModal(true); }}
              className="flex items-center gap-2 px-6 py-3.5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg"
            >
              <LineChart className="w-4 h-4" /> <span>Generar Curvas</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailStatCard icon={<Users className="w-6 h-6" />} label="Estructura Total" value={stats.total} color="blue" />
          <DetailStatCard icon={<TrendingUp className="w-6 h-6" />} label="Curva Global" value={`${stats.percent}%`} color="dark" />
        </div>



        {/* Widgets de Cumplimiento por Grupo */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(EVALUATION_GROUPS).map(([id, group]) => {
            const groupAvg = stats.groupStats[id]?.avg || 0;
            return (
              <div key={id} className={`bg-white p-5 rounded-[28px] border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group ${groupAvg >= 90 ? 'hover:border-emerald-200 border-slate-100' : 'hover:border-slate-300 border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 shadow-sm shrink-0 ${groupAvg >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                    {React.cloneElement(GroupIcons[id] as React.ReactElement, { className: 'w-5 h-5' })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.15em] truncate pr-2">{group.name}</p>
                    <p className={`text-2xl font-black italic tracking-tighter leading-none mt-1 ${groupAvg >= 90 ? 'text-emerald-700' : 'text-slate-800'}`}>{groupAvg}%</p>
                  </div>
                </div>

                <div className="w-full md:w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 mt-2 md:mt-0 relative" title={`${groupAvg}% completado`}>
                  <div className={`absolute top-0 left-0 bottom-0 transition-all duration-1000 ${groupAvg >= 90 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} style={{ width: `${groupAvg}%` }} />
                </div>
              </div>
            );
          })}
        </div>


        <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden relative">
          <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-[10px] font-black uppercase italic tracking-widest flex items-center shrink-0">
              <Activity className="w-4 h-4 mr-2 text-red-600" /> Registro de Notas
              <span className="ml-3 text-slate-400 font-bold normal-case not-italic tracking-normal">
                ({storeEmps.length} colaborador{storeEmps.length !== 1 ? 'es' : ''})
              </span>
            </h3>
            <div className="relative w-full md:w-72 ml-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                placeholder="Buscar personal..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black shadow-sm outline-none focus:border-red-500 transition-all"
              />
            </div>
          </div>

          {/* Overlay bloqueador durante carga */}
          {isLoadingGrades && (
            <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-[32px] md:rounded-[40px]">
              <div className="p-5 bg-slate-900 rounded-3xl shadow-2xl flex items-center gap-4">
                <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Cargando historial de notas</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">Sincronizando con la base de datos...</p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-4 md:px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Gestión</th>
                  <th className="px-4 md:px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="px-4 md:px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Antigüedad</th>
                  <th className="px-4 md:px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {storeEmps.map(emp => {
                  const empSummary = (dataService.getGradesSummary() || []).find((s: any) => String(s.employee_id).trim() === String(emp.id).trim());
                  const effective = dataService.getEffectiveGrades(emp.id, selectedMonth);

                  let avg = 0;
                  let status = 'PENDING';

                  if (effective.length > 0) {
                    const sum = effective.reduce((s, g) => s + g.score, 0);
                    avg = Math.round(sum / TOTAL_CATEGORIES_COUNT);
                    status = avg >= APPROVAL_THRESHOLD ? 'APPROVED' : 'FAILED';
                  } else if (empSummary) {
                    avg = Math.round(empSummary.avg_score);
                    status = empSummary.is_approved ? 'APPROVED' : 'FAILED';
                  }

                  const seniority = getSeniorityMonths(emp.join_date, selectedMonth);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-all group relative">
                      <td className="px-4 md:px-8 py-6 text-center">
                        <button type="button" onClick={() => setEditingEmployee(emp)} className="w-9 h-9 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all flex items-center justify-center mx-auto shadow-md"><Edit3 className="w-4 h-4" /></button>
                      </td>
                      <td className="px-4 md:px-8 py-6">
                        <p className="font-black text-slate-800 text-[12px] uppercase italic">{emp.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[8px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-widest border border-slate-200">{emp.title}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">ID: {emp.id}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xl font-black text-slate-900 leading-none">{seniority}</span>
                          <span className="text-[7px] font-black uppercase text-slate-400 mt-1 tracking-widest">Meses</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-6 text-center">
                        {status !== 'PENDING' ? (
                          <div className={`text-sm font-black ${status === 'APPROVED' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {avg}%
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase italic">S/N</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {editingEmployee && <GradeEditor employee={editingEmployee} month={selectedMonth} onClose={() => { setEditingEmployee(null); onUpdate(); }} />}

        {showPdfModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border-2 border-white/20 relative">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <LineChart className="w-6 h-6 text-red-500" />
                  <h3 className="font-black uppercase italic tracking-tighter text-xl">Generar Curvas</h3>
                </div>
                <button type="button" onClick={() => setShowPdfModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-10 space-y-8 bg-white relative z-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Periodo a Consultar</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-red-600"><Calendar className="w-4 h-4" /></div>
                    <input
                      type="month"
                      value={pdfMonth}
                      onChange={e => setPdfMonth(e.target.value)}
                      className="w-full pl-12 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-black text-slate-900 outline-none focus:border-red-500 transition-all shadow-inner cursor-pointer"
                    />
                  </div>
                </div>

                <button onClick={handleGeneratePDF} disabled={isGeneratingPdf} className="w-full py-6 bg-red-600 text-white font-black rounded-[32px] hover:bg-red-700 shadow-2xl transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-4 disabled:opacity-50">
                  {isGeneratingPdf ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isGeneratingPdf ? 'Calculando...' : 'Descargar Curvas'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Región</label>
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className={selectClasses + " w-full"}>
            <option value="all">Todas las Regiones</option>
            {dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Zona</label>
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className={selectClasses + " w-full"}>
            <option value="all">Todas las Zonas</option>
            {dynamicZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Buscar Tienda</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Nombre o CECO..." value={storeSearch} onChange={e => setStoreSearch(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black uppercase shadow-inner outline-none focus:bg-white focus:border-red-500 transition-all" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedStores.map(store => {
          const stats = getStoreStatsForMonth(store.id, selectedMonth);
          return (
            <div key={store.id} onClick={() => setSelectedStore(store)} className="bg-white rounded-[24px] shadow-sm hover:shadow-xl border-2 border-slate-100 hover:border-red-500 transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-[16px] flex shrink-0 items-center justify-center text-red-600 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Store className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tighter leading-none italic group-hover:text-red-700 transition-colors truncate">{store.name}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 text-red-400 shrink-0" /> {store.region} • {store.zone}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-[16px] border border-slate-100 flex flex-col items-center justify-center group-hover:bg-rose-50/50 transition-colors">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Personal</p>
                    <p className="text-xl font-black text-slate-800 tracking-tighter leading-none">
                      {stats.total} <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase ml-0.5">Pers.</span>
                    </p>
                  </div>
                  <div className={`p-3.5 rounded-[16px] border flex flex-col items-center justify-center transition-colors ${stats.percent >= 90 ? 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100/50' : 'bg-slate-800 border-slate-700 group-hover:bg-slate-700'}`}>
                    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 text-center ${stats.percent >= 90 ? 'text-emerald-600' : 'text-slate-400'}`}>Curva Global</p>
                    <p className={`text-xl font-black tracking-tighter leading-none ${stats.percent >= 90 ? 'text-emerald-700' : 'text-white'}`}>
                      {stats.percent}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest border-2 border-slate-100 bg-white hover:border-red-500 hover:text-red-600 disabled:opacity-50 disabled:hover:border-slate-100 disabled:hover:text-slate-800 transition-all"
          >
            Anterior
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest border-2 border-slate-100 bg-white hover:border-red-500 hover:text-red-600 disabled:opacity-50 disabled:hover:border-slate-100 disabled:hover:text-slate-800 transition-all"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

const DetailStatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    dark: 'bg-slate-800 text-white border-slate-700 shadow-xl'
  };

  const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value;

  return (
    <div className={`p-6 md:p-8 rounded-[32px] border flex flex-col justify-center transition-transform hover:-translate-y-1 ${colorMap[color]}`}>
      <div className="flex items-center space-x-5">
        <div className={`p-4 rounded-2xl shadow-sm ring-1 ${color === 'dark' ? 'bg-slate-800 text-slate-300 ring-white/10' : 'bg-white ring-black/5'}`}>{React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{label}</p>
          <div className="flex items-baseline gap-3 mt-1">
            <h4 className="text-3xl font-black tracking-tighter leading-none truncate">{value}</h4>
            {label.includes('Curva') && (
              <div className={`w-20 h-1.5 rounded-full overflow-hidden ${color === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}>
                <div
                  className={`h-full transition-all duration-1000 ${numericValue >= 90 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}
                  style={{ width: `${numericValue}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyStores;
