
import React, { useMemo, useState } from 'react';
import { User, Restaurant, Employee, UserRole, JobHierarchy, JobTitle } from '../types';
import { Store, MapPin, Users, Award, ArrowLeft, TrendingUp, Search, Edit3, LineChart, Download, X, Calendar, RefreshCw, ChevronRight, Activity, BookOpen, GraduationCap, Star, Trophy, ClipboardCheck, Vault } from 'lucide-react';
import { dataService } from '../dataService';
import { APPROVAL_THRESHOLD, TOTAL_CATEGORIES_COUNT, EVALUATION_GROUPS } from '../constants';
import GradeEditor from './GradeEditor';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MyStoresProps {
  user: User;
  restaurants: Restaurant[];
  employees: Employee[];
  selectedMonth: string;
  onUpdate: () => void;
}

const GroupIcons: Record<string, React.ReactNode> = {
  'AK': <BookOpen className="w-4 h-4" />,
  'A': <GraduationCap className="w-4 h-4" />,
  'B': <Star className="w-4 h-4" />,
  'C': <Trophy className="w-4 h-4" />,
  'D': <ClipboardCheck className="w-4 h-4" />,
  'E': <Vault className="w-4 h-4" />,
};

const MyStores: React.FC<MyStoresProps> = ({ user, restaurants, employees, selectedMonth, onUpdate }) => {
  const [selectedStore, setSelectedStore] = useState<Restaurant | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMonth, setPdfMonth] = useState(selectedMonth);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  React.useEffect(() => {
    if (selectedStore) {
      dataService.loadGradesForStore(selectedStore.id, selectedMonth).then(() => {
        onUpdate();
      });
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

  const storesWithStats = useMemo(() => {
    // Optimización: Agrupar empleados por tienda una sola vez (O(N))
    const employeesByStore = new Map<string, Employee[]>();
    employees.forEach(e => {
      if (e.active) {
        if (!employeesByStore.has(e.restaurant_id)) employeesByStore.set(e.restaurant_id, []);
        employeesByStore.get(e.restaurant_id)!.push(e);
      }
    });

    return assigned.map(store => {
      const storeEmps = employeesByStore.get(store.id) || [];
      if (storeEmps.length === 0) return { ...store, stats: { total: 0, approved: 0, percent: 0, groupStats: {} as Record<string, { avg: number, approvalRate: number }>, cargoCounts: {} as Record<string, number> } };

      let storeApprovedCount = 0;
      const groupData: Record<string, { scores: number[], passed: number }> = {};
      const cargoCounts: Record<string, number> = {};

      Object.keys(EVALUATION_GROUPS).forEach(gid => {
        groupData[gid] = { scores: [], passed: 0 };
      });

      storeEmps.forEach(emp => {
        cargoCounts[emp.title] = (cargoCounts[emp.title] || 0) + 1;
        const effective = dataService.getEffectiveGrades(emp.id, selectedMonth);

        let sum = 0;
        effective.forEach(g => sum += g.score);

        const totalAvg = TOTAL_CATEGORIES_COUNT > 0 ? sum / TOTAL_CATEGORIES_COUNT : 0;
        if (effective.length > 0 && totalAvg >= APPROVAL_THRESHOLD) storeApprovedCount++;

        Object.entries(EVALUATION_GROUPS).forEach(([gid, gconfig]) => {
          const groupGrades = effective.filter(g => g.group === gid);

          let gSum = 0;
          groupGrades.forEach(g => gSum += g.score);

          const gAvg = gSum / gconfig.categories.length;
          groupData[gid].scores.push(gAvg);
          if (gAvg >= APPROVAL_THRESHOLD) groupData[gid].passed++;
        });
      });

      const groupStats: Record<string, { avg: number, approvalRate: number }> = {};
      Object.keys(EVALUATION_GROUPS).forEach(gid => {
        const avg = groupData[gid].scores.length > 0 ? groupData[gid].scores.reduce((a, b) => a + b, 0) / groupData[gid].scores.length : 0;
        const rate = storeEmps.length > 0 ? (groupData[gid].passed / storeEmps.length) * 100 : 0;
        groupStats[gid] = { avg: Math.round(avg), approvalRate: Math.round(rate) };
      });

      return {
        ...store,
        stats: {
          total: storeEmps.length,
          approved: storeApprovedCount,
          percent: Math.round((storeApprovedCount / storeEmps.length) * 100),
          groupStats,
          cargoCounts
        }
      };
    });
  }, [assigned, employees, selectedMonth]);

  const getStoreStatsForMonth = (storeId: string, month: string) => {
    // Si es el mes seleccionado, usamos la versión memoizada
    if (month === selectedMonth) {
      const found = storesWithStats.find(s => s.id === storeId);
      if (found) return found.stats;
    }

    // Si no, hacemos el cálculo (para PDFs históricos por ejemplo)
    const storeEmps = employees.filter(e => e.restaurant_id === storeId && e.active);
    if (storeEmps.length === 0) return { total: 0, approved: 0, percent: 0, groupStats: {} as Record<string, { avg: number, approvalRate: number }>, cargoCounts: {} as Record<string, number> };

    let storeApprovedCount = 0;
    const groupData: Record<string, { scores: number[], passed: number }> = {};
    const cargoCounts: Record<string, number> = {};

    Object.keys(EVALUATION_GROUPS).forEach(gid => {
      groupData[gid] = { scores: [], passed: 0 };
    });

    storeEmps.forEach(emp => {
      cargoCounts[emp.title] = (cargoCounts[emp.title] || 0) + 1;
      const effective = dataService.getEffectiveGrades(emp.id, month);
      const sum = effective.reduce((s, g) => s + g.score, 0);
      const totalAvg = TOTAL_CATEGORIES_COUNT > 0 ? sum / TOTAL_CATEGORIES_COUNT : 0;
      if (effective.length > 0 && totalAvg >= APPROVAL_THRESHOLD) storeApprovedCount++;

      Object.entries(EVALUATION_GROUPS).forEach(([gid, gconfig]) => {
        const groupGrades = effective.filter(g => g.group === gid);
        const gSum = groupGrades.reduce((s, g) => s + g.score, 0);
        const gAvg = gSum / gconfig.categories.length;
        groupData[gid].scores.push(gAvg);
        if (gAvg >= APPROVAL_THRESHOLD) groupData[gid].passed++;
      });
    });

    const groupStats: Record<string, { avg: number, approvalRate: number }> = {};
    Object.keys(EVALUATION_GROUPS).forEach(gid => {
      const avg = groupData[gid].scores.length > 0 ? groupData[gid].scores.reduce((a, b) => a + b, 0) / groupData[gid].scores.length : 0;
      const rate = storeEmps.length > 0 ? (groupData[gid].passed / storeEmps.length) * 100 : 0;
      groupStats[gid] = { avg: Math.round(avg), approvalRate: Math.round(rate) };
    });

    return { total: storeEmps.length, approved: storeApprovedCount, percent: Math.round((storeApprovedCount / storeEmps.length) * 100), groupStats, cargoCounts };
  };

  const getSeniorityMonths = (joinDate: string, targetMonth: string) => {
    if (!joinDate) return 0;
    const start = new Date(joinDate);
    const end = new Date(targetMonth + "-01");
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, diff);
  };

  const handleGeneratePDF = async () => {
    if (!selectedStore || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    setTimeout(async () => {
      try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const stats = getStoreStatsForMonth(selectedStore.id, pdfMonth);
        const storeEmps = employees.filter(e => e.restaurant_id === selectedStore.id && e.active);

        const colors: Record<string, [number, number, number]> = {
          kfcRed: [227, 24, 55],
          dark: [26, 32, 44],
          emerald: [16, 185, 129]
        };

        doc.setFillColor(colors.kfcRed[0], colors.kfcRed[1], colors.kfcRed[2]);
        doc.rect(0, 0, 210, 50, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('REPORTE DE CERTIFICACIÓN - GENERAR CURVAS', 20, 15);
        doc.setFontSize(26);
        doc.text(selectedStore.name.toUpperCase(), 20, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`CECO: ${selectedStore.id} | REGIÓN: ${selectedStore.region} | PERIODO: ${pdfMonth}`, 20, 38);

        doc.setFillColor(255, 255, 255);
        doc.circle(170, 25, 18, 'F');
        doc.setTextColor(colors.kfcRed[0], colors.kfcRed[1], colors.kfcRed[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${stats.percent}%`, 170, 27, { align: 'center' });
        doc.setFontSize(6);
        doc.text('CURVA TOTAL', 170, 32, { align: 'center' });

        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('CENSO DE EQUIPO (ESTRUCTURA DE MANDO)', 20, 65);

        const roleData = [
          [JobTitle.GERENTE, stats.cargoCounts[JobTitle.GERENTE] || 0],
          [JobTitle.SUBGERENTE, stats.cargoCounts[JobTitle.SUBGERENTE] || 0],
          [JobTitle.LIDER_TURNO, stats.cargoCounts[JobTitle.LIDER_TURNO] || 0],
          [JobTitle.ENTRENADOR, stats.cargoCounts[JobTitle.ENTRENADOR] || 0],
          [JobTitle.MIEMBRO_EQUIPO_FULL, stats.cargoCounts[JobTitle.MIEMBRO_EQUIPO_FULL] || 0],
          [JobTitle.MIEMBRO_EQUIPO_ROLEX, stats.cargoCounts[JobTitle.MIEMBRO_EQUIPO_ROLEX] || 0],
          [JobTitle.DOMICILIARIO, stats.cargoCounts[JobTitle.DOMICILIARIO] || 0],
          [{ content: 'TOTAL PERSONAL ACTIVO', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: stats.total, styles: { fontStyle: 'bold', fillColor: colors.kfcRed, textColor: 255 } }]
        ].map(row => {
          if (Array.isArray(row) && typeof row[0] === 'string') {
            return [row[0].toUpperCase(), row[1]];
          }
          return row;
        });

        autoTable(doc, {
          startY: 70,
          head: [['CARGO EN TIENDA', 'CANTIDAD']],
          body: roleData as any,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
          headStyles: { fillColor: colors.dark, textColor: 255 },
          margin: { left: 20, right: 110 }
        });

        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('PORCENTAJE DE APROBACIÓN POR CURVA', 110, 65);

        let barY = 70;
        Object.entries(EVALUATION_GROUPS).forEach(([gid, config]) => {
          const rate = stats.groupStats[gid]?.approvalRate || 0;
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(config.name.toUpperCase(), 110, barY + 4);
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(110, barY + 6, 80, 4, 1, 1, 'F');
          const barColor = rate >= 90 ? colors.emerald : colors.kfcRed;
          doc.setFillColor(barColor[0], barColor[1], barColor[2]);
          doc.roundedRect(110, barY + 6, (rate / 100) * 80, 4, 1, 1, 'F');
          doc.setTextColor(barColor[0], barColor[1], barColor[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(`${rate}%`, 192, barY + 9.5);
          barY += 15;
        });

        doc.addPage();
        doc.setFillColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`DESGLOSE DETALLADO DE CALIFICACIONES - ${pdfMonth}`, 15, 10);

        const tableData = storeEmps
          .sort((a, b) => (JobHierarchy[a.title] || 99) - (JobHierarchy[b.title] || 99))
          .map(emp => {
            const effective = dataService.getEffectiveGrades(emp.id, pdfMonth);
            const sum = effective.reduce((s, g) => s + g.score, 0);
            const avg = Math.round(sum / TOTAL_CATEGORIES_COUNT);
            const isCert = avg >= APPROVAL_THRESHOLD;
            const getScore = (gid: string) => {
              const gGrades = effective.filter(g => g.group === gid);
              const gConf = EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS];
              return gGrades.length > 0 ? `${Math.round(gGrades.reduce((s, g) => s + g.score, 0) / gConf.categories.length)}%` : '0%';
            };
            return [
              emp.id,
              emp.name.toUpperCase(),
              emp.join_date,
              emp.title.toUpperCase(),
              { content: `${avg}%`, styles: { fontStyle: 'bold', textColor: isCert ? colors.emerald : colors.kfcRed } },
              getScore('A'), getScore('B'), getScore('C'), getScore('D'), getScore('E')
            ];
          });

        autoTable(doc, {
          startY: 20,
          head: [['ID', 'NOMBRE', 'INGRESO', 'CARGO', 'PROM.', 'BAS.', 'STAR', 'ALLS.', 'SST', 'VAUL.']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 7, halign: 'center', cellPadding: 2 },
          headStyles: { fillColor: colors.kfcRed, textColor: 255 },
          columnStyles: {
            1: { halign: 'left', cellWidth: 35 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'left', cellWidth: 30 }
          }
        });

        doc.save(`Curvas_Certificacion_${selectedStore.id}_${pdfMonth}.pdf`);
        setShowPdfModal(false);
      } catch (err) {
        console.error(err);
        alert("Error al generar el reporte PDF.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 200);
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
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                placeholder="Buscar personal..."
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black shadow-sm outline-none focus:border-red-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DetailStatCard icon={<Users className="w-6 h-6" />} label="Estructura Total" value={stats.total} color="blue" />
          <DetailStatCard icon={<Award className="w-6 h-6" />} label="Certificados" value={stats.approved} color="green" />
          <DetailStatCard icon={<TrendingUp className="w-6 h-6" />} label="Curva Global" value={`${stats.percent}%`} color="red" />
        </div>

        {/* Widgets de Cumplimiento por Grupo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(EVALUATION_GROUPS).map(([id, group]) => {
            const groupAvg = stats.groupStats[id]?.avg || 0;
            return (
              <div key={id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className={`p-2 rounded-xl mb-2 ${groupAvg >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {GroupIcons[id]}
                </div>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter mb-1 truncate w-full">{group.name}</p>
                <p className={`text-lg font-black tracking-tighter ${groupAvg >= 90 ? 'text-emerald-700' : 'text-red-700'}`}>{groupAvg}%</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="text-[10px] font-black uppercase italic tracking-widest flex items-center">
              <Activity className="w-4 h-4 mr-2 text-red-600" /> Registro de Notas
            </h3>
          </div>
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
                  const effective = dataService.getEffectiveGrades(emp.id, selectedMonth);
                  const sum = effective.reduce((s, g) => s + g.score, 0);
                  const avg = Math.round(sum / TOTAL_CATEGORIES_COUNT);
                  const status = effective.length === 0 ? 'PENDING' : (avg >= APPROVAL_THRESHOLD ? 'APPROVED' : 'FAILED');
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
        {assigned.map(store => {
          const stats = getStoreStatsForMonth(store.id, selectedMonth);
          return (
            <div key={store.id} onClick={() => setSelectedStore(store)} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden hover:border-red-400 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 group cursor-pointer flex flex-col p-8 md:p-10 relative">
              <div className="absolute top-8 right-8 text-slate-200 group-hover:translate-x-1 group-hover:text-red-500 transition-all duration-300"><ChevronRight className="w-8 h-8" /></div>
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 bg-slate-50/50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-red-600 group-hover:text-white transition-all shadow-inner border border-slate-100/50"><Store className="w-8 h-8" /></div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 text-xl truncate uppercase tracking-tighter leading-tight italic">{store.name}</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase truncate tracking-widest mt-1.5 opacity-80">{store.region} • {store.zone}</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto">
                <div className="bg-slate-50/50 p-5 rounded-[28px] border border-slate-100/50 text-center transition-colors group-hover:bg-red-50/50 group-hover:border-red-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest group-hover:text-red-400 transition-colors">Equipo Total</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter group-hover:text-red-700 transition-colors">{stats.total} <span className="text-sm font-bold text-slate-400 group-hover:text-red-400 uppercase tracking-tight">Colab.</span></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DetailStatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };
  return (
    <div className={`bg-white p-6 rounded-[32px] border-2 shadow-sm flex items-center space-x-5 transition-transform hover:scale-[1.03] ${colorMap[color]}`}>
      <div className={`p-4 rounded-2xl bg-white shadow-lg`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</p>
        <h4 className="text-3xl font-black tracking-tighter leading-none mt-1">{value}</h4>
      </div>
    </div>
  );
};

export default MyStores;
