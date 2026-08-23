import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Employee, Restaurant, SafeHandsPerson, SafeHandsCert, SafeHandsOrphanCategory, UserRole } from '@/types';
import { dataService } from '@/services/dataService';
import {
  X,
  Search,
  Download,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Tag,
  Building2,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserX,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export type ReconciliationTab =
  | 'all'
  | 'active_match'
  | 'retired_match'
  | 'orphan_categorized'
  | 'orphan_uncategorized'
  | 'active_no_carnet';

export interface ReconciliationItem {
  id: string; // Cédula
  personName: string; // Nombre en carnet (o en empleado si no hay carnet)
  employeeName?: string; // Nombre en nómina si existe
  matchType: 'active_match' | 'retired_match' | 'orphan_categorized' | 'orphan_uncategorized' | 'active_no_carnet';
  restaurantId?: string; // CECO
  restaurantName?: string;
  zone?: string;
  region?: string;
  jobTitle?: string;
  certCode?: string;
  issueDate?: string;
  expiryDate?: string;
  isCertExpired?: boolean;
  isCertExpiringSoon?: boolean;
  category?: string; // Categoría asignada para huérfanos/especiales
  hasCarnet: boolean;
  employeeActive?: boolean;
}

interface SafeHandsReconciliationModalProps {
  onClose: () => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-600 text-white' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-600 text-white' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-600 text-white' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-600 text-white' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-600 text-white' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-600 text-white' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-600 text-white' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-600 text-white' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-600 text-white' },
};

export const SafeHandsReconciliationModal: React.FC<SafeHandsReconciliationModalProps> = ({ onClose }) => {
  const { auth, restaurants, employees } = useAppStore();
  const isAdmin = auth.user?.role === UserRole.ADMIN;

  // Data states
  const [personnel, setPersonnel] = useState<SafeHandsPerson[]>([]);
  const [certs, setCerts] = useState<SafeHandsCert[]>([]);
  const [categories, setCategories] = useState<SafeHandsOrphanCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hierarchical Filter States
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ReconciliationTab>('all');

  // Bulk Selection & Categorization States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isApplyingCategory, setIsApplyingCategory] = useState(false);

  // Category Manager Modal
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('purple');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load All Safe Hands Personnel and Certs
  const loadData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [reconciliationData, loadedCategories] = await Promise.all([
        dataService.getAllSafeHandsPersonnelAndCertsForReconciliation(),
        dataService.getSafeHandsOrphanCategories()
      ]);
      setPersonnel(reconciliationData.personnel);
      setCerts(reconciliationData.certs);
      setCategories(loadedCategories);
    } catch (err) {
      console.error('Error cargando datos para conciliación:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hierarchy = useMemo(() => {
    try {
      return dataService.getHierarchy() || { lockedMonths: [], regions: [] };
    } catch {
      return { lockedMonths: [], regions: [] };
    }
  }, []);

  // Allowed hierarchical scopes based on role
  const allRegionsList = useMemo(() => {
    const fromRests = Array.from(new Set(restaurants.map(r => r.region).filter(Boolean))).sort();
    if (fromRests.length > 0) return fromRests;
    if (hierarchy?.regions) return hierarchy.regions.map(r => r.name).sort();
    return [];
  }, [restaurants, hierarchy]);

  const allowedRegions = useMemo(() => {
    if (!auth.user) return [];
    if (auth.user.role === UserRole.ADMIN) return allRegionsList;
    return auth.user.assignedRegions && auth.user.assignedRegions.length > 0 ? auth.user.assignedRegions : allRegionsList;
  }, [auth.user, allRegionsList]);

  const availableZones = useMemo(() => {
    let list = restaurants;
    if (selectedRegion) {
      list = list.filter(r => r.region === selectedRegion);
    } else if (allowedRegions.length > 0) {
      list = list.filter(r => allowedRegions.includes(r.region));
    }
    
    if (auth.user?.role !== UserRole.ADMIN && auth.user?.assignedZones && auth.user.assignedZones.length > 0) {
      list = list.filter(r => auth.user?.assignedZones?.includes(r.zone));
    }
    return Array.from(new Set(list.map(r => r.zone).filter(Boolean))).sort();
  }, [restaurants, selectedRegion, allowedRegions, auth.user]);

  const filteredRestaurants = useMemo(() => {
    let list = restaurants;
    if (selectedRegion) list = list.filter(r => r.region === selectedRegion);
    if (selectedZone) list = list.filter(r => r.zone === selectedZone);
    if (auth.user && auth.user.role !== UserRole.ADMIN) {
      list = list.filter(r => {
        if (auth.user?.assignedRegions?.includes(r.region)) return true;
        if (auth.user?.assignedZones?.includes(r.zone)) return true;
        if (auth.user?.assignedRestaurants?.includes(r.id)) return true;
        return false;
      });
    }
    return list;
  }, [restaurants, selectedRegion, selectedZone, auth.user]);

  // Build Certs lookup map
  const certsMap = useMemo(() => {
    const map = new Map<string, SafeHandsCert>();
    certs.forEach(c => {
      if (!map.has(c.employeeId) || (c.expiryDate > (map.get(c.employeeId)?.expiryDate || ''))) {
        map.set(c.employeeId, c);
      }
    });
    return map;
  }, [certs]);

  // Build Employees lookup map
  const employeesMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => {
      const cleanId = String(e.id).trim();
      map.set(cleanId, e);
    });
    return map;
  }, [employees]);

  // Restaurants lookup map
  const restMap = useMemo(() => {
    const map = new Map<string, Restaurant>();
    restaurants.forEach(r => map.set(r.id, r));
    return map;
  }, [restaurants]);

  // Perform Reconciliation (in-memory matching)
  const allReconciliationItems = useMemo(() => {
    const items: ReconciliationItem[] = [];
    const processedEmployeeIds = new Set<string>();
    const todayStr = new Date().toISOString().split('T')[0];
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 1);
    const soonStr = soon.toISOString().split('T')[0];

    // 1. Process all personnel in Safe Hands
    personnel.forEach(person => {
      const cleanId = String(person.id).trim();
      const cert = certsMap.get(cleanId);
      const emp = employeesMap.get(cleanId);
      if (emp) processedEmployeeIds.add(cleanId);

      const isRetired = emp ? (!emp.active || Boolean(emp.exit_date && emp.exit_date.trim() !== '')) : false;
      const isActive = emp ? !isRetired : false;

      let matchType: ReconciliationItem['matchType'];
      if (emp) {
        matchType = isActive ? 'active_match' : 'retired_match';
      } else {
        matchType = person.category ? 'orphan_categorized' : 'orphan_uncategorized';
      }

      const restId = person.restaurantId || emp?.restaurant_id;
      const restObj = restId ? restMap.get(restId) : undefined;

      const isExpired = cert ? cert.expiryDate < todayStr : false;
      const isExpiringSoon = cert ? (cert.expiryDate >= todayStr && cert.expiryDate < soonStr) : false;

      items.push({
        id: cleanId,
        personName: person.name,
        employeeName: emp?.name,
        matchType,
        restaurantId: restId,
        restaurantName: restObj?.name || restId,
        zone: restObj?.zone || emp?.zone,
        region: restObj?.region,
        jobTitle: emp?.title,
        certCode: cert?.certificateCode,
        issueDate: cert?.issueDate || person.lastIssueDate,
        expiryDate: cert?.expiryDate,
        isCertExpired: isExpired,
        isCertExpiringSoon: isExpiringSoon,
        category: person.category,
        hasCarnet: true,
        employeeActive: isActive
      });
    });

    // 2. Process active employees WITHOUT a Safe Hands carnet
    employees.forEach(emp => {
      const cleanId = String(emp.id).trim();
      if (processedEmployeeIds.has(cleanId)) return;

      const isRetired = !emp.active || Boolean(emp.exit_date && emp.exit_date.trim() !== '');
      if (isRetired) return; // Only interested in active employees without carnet

      const restObj = emp.restaurant_id ? restMap.get(emp.restaurant_id) : undefined;

      items.push({
        id: cleanId,
        personName: emp.name,
        employeeName: emp.name,
        matchType: 'active_no_carnet',
        restaurantId: emp.restaurant_id,
        restaurantName: restObj?.name || emp.restaurant_id,
        zone: restObj?.zone || emp.zone,
        region: restObj?.region,
        jobTitle: emp.title,
        hasCarnet: false,
        employeeActive: true
      });
    });

    return items;
  }, [personnel, certsMap, employeesMap, employees, restMap]);

  // Apply Hierarchical and Text Filters
  const filteredItems = useMemo(() => {
    return allReconciliationItems.filter(item => {
      // 1. Regional filter
      if (selectedRegion && item.region !== selectedRegion) return false;
      // 2. Zone filter
      if (selectedZone && item.zone !== selectedZone) return false;
      // 3. Restaurant filter
      if (selectedRestaurant && item.restaurantId !== selectedRestaurant) return false;

      // 4. Role Scope filter (for non-admins)
      if (auth.user && auth.user.role !== UserRole.ADMIN) {
        const allowedRests = filteredRestaurants.map(r => r.id);
        if (item.restaurantId && !allowedRests.includes(item.restaurantId)) return false;
      }

      // 5. Tab filter
      if (activeTab !== 'all' && item.matchType !== activeTab) return false;

      // 6. Search text
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = item.id.toLowerCase().includes(q);
        const matchName = item.personName.toLowerCase().includes(q);
        const matchEmpName = item.employeeName?.toLowerCase().includes(q);
        const matchRest = item.restaurantName?.toLowerCase().includes(q) || item.restaurantId?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchEmpName && !matchRest && !matchCategory) return false;
      }

      return true;
    });
  }, [allReconciliationItems, selectedRegion, selectedZone, selectedRestaurant, auth.user, filteredRestaurants, activeTab, search]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [selectedRegion, selectedZone, selectedRestaurant, activeTab, search]);

  // KPI Metrics (based on current hierarchical filter, disregarding tab filter)
  const metrics = useMemo(() => {
    const scopedItems = allReconciliationItems.filter(item => {
      if (selectedRegion && item.region !== selectedRegion) return false;
      if (selectedZone && item.zone !== selectedZone) return false;
      if (selectedRestaurant && item.restaurantId !== selectedRestaurant) return false;
      if (auth.user && auth.user.role !== UserRole.ADMIN) {
        const allowedRests = filteredRestaurants.map(r => r.id);
        if (item.restaurantId && !allowedRests.includes(item.restaurantId)) return false;
      }
      return true;
    });

    const totalCarnets = scopedItems.filter(i => i.hasCarnet).length;
    const activeMatch = scopedItems.filter(i => i.matchType === 'active_match').length;
    const retiredMatch = scopedItems.filter(i => i.matchType === 'retired_match').length;
    const orphanCategorized = scopedItems.filter(i => i.matchType === 'orphan_categorized').length;
    const orphanUncategorized = scopedItems.filter(i => i.matchType === 'orphan_uncategorized').length;
    const activeNoCarnet = scopedItems.filter(i => i.matchType === 'active_no_carnet').length;

    const pct = (val: number, total: number) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

    return {
      totalCarnets,
      activeMatch,
      pctActive: pct(activeMatch, totalCarnets),
      retiredMatch,
      pctRetired: pct(retiredMatch, totalCarnets),
      orphanCategorized,
      pctCategorized: pct(orphanCategorized, totalCarnets),
      orphanUncategorized,
      pctUncategorized: pct(orphanUncategorized, totalCarnets),
      activeNoCarnet
    };
  }, [allReconciliationItems, selectedRegion, selectedZone, selectedRestaurant, auth.user, filteredRestaurants]);

  // Paginated View
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Assign single category to orphan
  const handleAssignCategory = async (personId: string, categoryId: string) => {
    try {
      await dataService.updateSafeHandsPersonCategory(personId, categoryId || null);
      setPersonnel(prev => prev.map(p => p.id === personId ? { ...p, category: categoryId || undefined } : p));
    } catch (err) {
      console.error('Error asignando categoría:', err);
    }
  };

  // Bulk Assign Category
  const handleBulkAssign = async () => {
    if (selectedIds.size === 0 || !bulkCategory) return;
    setIsApplyingCategory(true);
    try {
      const idsArray = Array.from(selectedIds);
      const catToApply = bulkCategory === 'CLEAR' ? null : bulkCategory;
      await dataService.bulkUpdateSafeHandsPersonnelCategory(idsArray, catToApply);
      setPersonnel(prev =>
        prev.map(p => (selectedIds.has(p.id) ? { ...p, category: catToApply || undefined } : p))
      );
      setSelectedIds(new Set());
      setBulkCategory('');
    } catch (err) {
      console.error('Error en asignación masiva:', err);
    } finally {
      setIsApplyingCategory(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllOnPage = () => {
    const selectable = paginatedItems.filter(i => i.hasCarnet && (i.matchType === 'orphan_uncategorized' || i.matchType === 'orphan_categorized'));
    const allSelected = selectable.every(i => selectedIds.has(i.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      selectable.forEach(i => next.delete(i.id));
    } else {
      selectable.forEach(i => next.add(i.id));
    }
    setSelectedIds(next);
  };

  // Category Manager: Create new category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = newCatName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newCat: SafeHandsOrphanCategory = {
      id: catId,
      name: newCatName.trim(),
      color: newCatColor,
      created_at: new Date().toISOString()
    };
    await dataService.saveSafeHandsOrphanCategory(newCat);
    setCategories(prev => prev.filter(c => c.id !== catId).concat(newCat));
    setNewCatName('');
  };

  const handleDeleteCategory = async (catId: string) => {
    await dataService.deleteSafeHandsOrphanCategory(catId);
    setCategories(prev => prev.filter(c => c.id !== catId));
  };

  // Export Reconciliation to Multi-sheet Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Resumen Ejecutivo
    const summaryData = [
      ['CONCILIACIÓN Y AUDITORÍA DE CARNETS DE MANIPULACIÓN DE ALIMENTOS - KFC'],
      ['Fecha de Reporte:', new Date().toLocaleString()],
      ['Filtro Región:', selectedRegion || 'Todas'],
      ['Filtro Zona:', selectedZone || 'Todas'],
      ['Filtro Tienda/CECO:', selectedRestaurant || 'Todas'],
      [],
      ['MÉTRICA', 'CANTIDAD', 'PORCENTAJE (%)'],
      ['Total Carnets Registrados', metrics.totalCarnets, '100%'],
      ['Carnets de Colaboradores Activos (En Nómina)', metrics.activeMatch, `${metrics.pctActive}%`],
      ['Carnets de Colaboradores Retirados', metrics.retiredMatch, `${metrics.pctRetired}%`],
      ['Carnets Especiales Categorizados (Otros Dpts.)', metrics.orphanCategorized, `${metrics.pctCategorized}%`],
      ['Carnets Huérfanos Sin Clasificar', metrics.orphanUncategorized, `${metrics.pctUncategorized}%`],
      ['Colaboradores Activos SIN Carnet (Brecha Operativa)', metrics.activeNoCarnet, '—'],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Ejecutivo');

    const formatRow = (i: ReconciliationItem) => {
      const catObj = categories.find(c => c.id === i.category);
      return {
        'Cédula': i.id,
        'Nombre en Carnet': i.personName,
        'Nombre en Nómina': i.employeeName || '—',
        'Estado Laboral': i.matchType === 'active_match' ? 'ACTIVO' : i.matchType === 'retired_match' ? 'RETIRADO' : i.matchType === 'active_no_carnet' ? 'ACTIVO SIN CARNET' : 'NO REGISTRADO EN EMPLEADOS',
        'Categoría Asignada': catObj ? catObj.name : i.category || '—',
        'Cargo': i.jobTitle || '—',
        'CECO': i.restaurantId || '—',
        'Restaurante': i.restaurantName || '—',
        'Zona': i.zone || '—',
        'Región': i.region || '—',
        'Código Certificado': i.certCode || '—',
        'Fecha Emisión': i.issueDate || '—',
        'Fecha Vencimiento': i.expiryDate || '—',
        'Estado Carnet': !i.hasCarnet ? 'SIN CARNET' : i.isCertExpired ? 'VENCIDO' : i.isCertExpiringSoon ? 'POR VENCER' : 'VIGENTE'
      };
    };

    // 2. Activos con Carnet
    const activeMatchItems = filteredItems.filter(i => i.matchType === 'active_match');
    if (activeMatchItems.length > 0) {
      const ws = XLSX.utils.json_to_sheet(activeMatchItems.map(formatRow));
      XLSX.utils.book_append_sheet(wb, ws, 'Activos_Con_Carnet');
    }

    // 3. Retirados con Carnet
    const retiredMatchItems = filteredItems.filter(i => i.matchType === 'retired_match');
    if (retiredMatchItems.length > 0) {
      const ws = XLSX.utils.json_to_sheet(retiredMatchItems.map(formatRow));
      XLSX.utils.book_append_sheet(wb, ws, 'Retirados_Con_Carnet');
    }

    // 4. Categorizados Especiales
    const categorizedItems = filteredItems.filter(i => i.matchType === 'orphan_categorized');
    if (categorizedItems.length > 0) {
      const ws = XLSX.utils.json_to_sheet(categorizedItems.map(formatRow));
      XLSX.utils.book_append_sheet(wb, ws, 'Especiales_Categorizados');
    }

    // 5. Huérfanos Sin Clasificar
    const orphanItems = filteredItems.filter(i => i.matchType === 'orphan_uncategorized');
    if (orphanItems.length > 0) {
      const ws = XLSX.utils.json_to_sheet(orphanItems.map(formatRow));
      XLSX.utils.book_append_sheet(wb, ws, 'Huerfanos_Sin_Clasificar');
    }

    // 6. Activos Sin Carnet
    const activeNoCarnetItems = filteredItems.filter(i => i.matchType === 'active_no_carnet');
    if (activeNoCarnetItems.length > 0) {
      const ws = XLSX.utils.json_to_sheet(activeNoCarnetItems.map(formatRow));
      XLSX.utils.book_append_sheet(wb, ws, 'Activos_Sin_Carnet');
    }

    XLSX.writeFile(wb, `Conciliacion_Carnets_KFC_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-7xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f1c2d] via-slate-900 to-slate-800 p-5 sm:p-6 text-white shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white uppercase italic">
                Auditoría SafeHands
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Relación de Carnets de Manipulacion de Alimentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer disabled:opacity-50"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hierarchical Filters Toolbar */}
        <div className="bg-slate-50/90 p-4 border-b border-slate-200/80 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Region Filter */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Región</label>
              <select
                value={selectedRegion}
                onChange={e => {
                  setSelectedRegion(e.target.value);
                  setSelectedZone('');
                  setSelectedRestaurant('');
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition"
              >
                <option value="">Todas las Regiones</option>
                {allowedRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Zona / Área</label>
              <select
                value={selectedZone}
                onChange={e => {
                  setSelectedZone(e.target.value);
                  setSelectedRestaurant('');
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition"
              >
                <option value="">Todas las Zonas</option>
                {availableZones.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Restaurant Filter */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tienda / CECO</label>
              <select
                value={selectedRestaurant}
                onChange={e => setSelectedRestaurant(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition truncate"
              >
                <option value="">Todas las Tiendas</option>
                {filteredRestaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Búsqueda Rápida</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cédula, nombre o CECO..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 p-4 bg-white border-b border-slate-100 shrink-0">
          <div
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Total Carnets</span>
            <span className="text-xl font-black block mt-0.5">{metrics.totalCarnets}</span>
            <span className="text-[9.5px] font-bold opacity-70 block">Registrados</span>
          </div>

          <div
            onClick={() => setActiveTab('active_match')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'active_match' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200 text-emerald-950'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">🟢 Activos</span>
            <span className="text-xl font-black block mt-0.5">{metrics.activeMatch}</span>
            <span className="text-[9.5px] font-bold opacity-80 block">{metrics.pctActive}% del total</span>
          </div>

          <div
            onClick={() => setActiveTab('retired_match')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'retired_match' ? 'bg-amber-600 border-amber-600 text-white shadow-md' : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-950'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">🟠 Retirados</span>
            <span className="text-xl font-black block mt-0.5">{metrics.retiredMatch}</span>
            <span className="text-[9.5px] font-bold opacity-80 block">{metrics.pctRetired}% del total</span>
          </div>

          <div
            onClick={() => setActiveTab('orphan_categorized')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'orphan_categorized' ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-200 text-purple-950'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">🟣 Categorizados</span>
            <span className="text-xl font-black block mt-0.5">{metrics.orphanCategorized}</span>
            <span className="text-[9.5px] font-bold opacity-80 block">{metrics.pctCategorized}% (Otros Dpts.)</span>
          </div>

          <div
            onClick={() => setActiveTab('orphan_uncategorized')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'orphan_uncategorized' ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-rose-950'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">🔴 Sin Clasificar</span>
            <span className="text-xl font-black block mt-0.5">{metrics.orphanUncategorized}</span>
            <span className="text-[9.5px] font-bold opacity-80 block">{metrics.pctUncategorized}% (Huérfanos)</span>
          </div>

          <div
            onClick={() => setActiveTab('active_no_carnet')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'active_no_carnet' ? 'bg-red-700 border-red-700 text-white shadow-md' : 'bg-red-50/70 hover:bg-red-100/70 border-red-200 text-red-950'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">⚠️ Sin Carnet</span>
            <span className="text-xl font-black block mt-0.5">{metrics.activeNoCarnet}</span>
            <span className="text-[9.5px] font-bold opacity-80 block">Activos en tienda</span>
          </div>
        </div>

        {/* Tab Selection & Actions Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'Todos los Registros', count: metrics.totalCarnets + metrics.activeNoCarnet },
              { key: 'active_match', label: 'Activos con Carnet', count: metrics.activeMatch, color: 'text-emerald-700 bg-emerald-100' },
              { key: 'retired_match', label: 'Retirados', count: metrics.retiredMatch, color: 'text-amber-700 bg-amber-100' },
              { key: 'orphan_categorized', label: 'Categorizados', count: metrics.orphanCategorized, color: 'text-purple-700 bg-purple-100' },
              { key: 'orphan_uncategorized', label: 'Huérfanos', count: metrics.orphanUncategorized, color: 'text-rose-700 bg-rose-100' },
              { key: 'active_no_carnet', label: 'Activos Sin Carnet', count: metrics.activeNoCarnet, color: 'text-red-700 bg-red-100' }
            ].map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as ReconciliationTab)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : (tab.color || 'bg-slate-100 text-slate-600')
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowCategoryManager(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-2xs"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Gestionar Categorías</span>
              </button>
            )}

            {/* Bulk Categorization if items selected */}
            {selectedIds.size > 0 && isAdmin && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl animate-fade-in">
                <span className="text-[10px] font-black text-purple-900 uppercase">
                  {selectedIds.size} seleccionados:
                </span>
                <select
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                  className="text-xs font-bold bg-white border border-purple-300 rounded-lg px-2 py-1 outline-none text-purple-950"
                >
                  <option value="">Elegir categoría...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="CLEAR">Quitar Categoría (Volver Huérfano)</option>
                </select>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkCategory || isApplyingCategory}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase rounded-lg transition cursor-pointer"
                >
                  {isApplyingCategory ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
              <p className="text-xs font-bold uppercase tracking-widest">Cruza de bases de datos en curso...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <HelpCircle className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No se encontraron registros con los filtros seleccionados.</p>
              <p className="text-xs text-slate-400">Prueba ajustando la búsqueda o el filtro de región/zona.</p>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                    {isAdmin && (
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllOnPage}
                          className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-3">Cédula</th>
                    <th className="p-3">Nombre Colaborador / Carnet</th>
                    <th className="p-3">Estado Nómina</th>
                    <th className="p-3">Categoría Asignada</th>
                    <th className="p-3">Tienda / CECO</th>
                    <th className="p-3">Zona / Región</th>
                    <th className="p-3">Estado Carnet</th>
                    <th className="p-3">Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedItems.map(item => {
                    const isSelected = selectedIds.has(item.id);
                    const catObj = categories.find(c => c.id === item.category);
                    const colorStyle = catObj?.color && COLOR_MAP[catObj.color] ? COLOR_MAP[catObj.color] : COLOR_MAP['purple'];

                    return (
                      <tr key={`${item.matchType}-${item.id}`} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-purple-50/40' : ''}`}>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            {item.hasCarnet && (item.matchType === 'orphan_uncategorized' || item.matchType === 'orphan_categorized') ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}

                        {/* Cédula */}
                        <td className="p-3 font-mono font-black text-slate-900">
                          {item.id}
                        </td>

                        {/* Nombre */}
                        <td className="p-3">
                          <p className="font-black text-slate-900">{item.personName}</p>
                          {item.employeeName && item.employeeName !== item.personName && (
                            <p className="text-[10px] text-slate-400 font-bold">Nómina: {item.employeeName}</p>
                          )}
                          {item.jobTitle && (
                            <span className="text-[9.5px] font-bold text-slate-500 block">{item.jobTitle}</span>
                          )}
                        </td>

                        {/* Estado Nómina */}
                        <td className="p-3">
                          {item.matchType === 'active_match' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              ACTIVO EN NÓMINA
                            </span>
                          )}
                          {item.matchType === 'retired_match' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              RETIRADO / INACTIVO
                            </span>
                          )}
                          {(item.matchType === 'orphan_categorized' || item.matchType === 'orphan_uncategorized') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                              <UserX className="w-3 h-3 text-slate-500" />
                              SIN VÍNCULO NÓMINA
                            </span>
                          )}
                          {item.matchType === 'active_no_carnet' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              ACTIVO SIN CARNET
                            </span>
                          )}
                        </td>

                        {/* Categoría Asignada */}
                        <td className="p-3">
                          {item.matchType === 'orphan_uncategorized' || item.matchType === 'orphan_categorized' ? (
                            <div className="flex items-center gap-1.5">
                              {isAdmin ? (
                                <select
                                  value={item.category || ''}
                                  onChange={e => handleAssignCategory(item.id, e.target.value)}
                                  className={`text-[11px] font-bold rounded-lg px-2.5 py-1 outline-none border transition cursor-pointer ${
                                    catObj ? `${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}` : 'bg-slate-50 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <option value="">🔴 Sin Clasificar (Huérfano)</option>
                                  {categories.map(c => (
                                    <option key={c.id} value={c.id}>🟣 {c.name}</option>
                                  ))}
                                </select>
                              ) : (
                                catObj ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                                    {catObj.name}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    Huérfano
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-bold">Nómina Directa</span>
                          )}
                        </td>

                        {/* Tienda / CECO */}
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{item.restaurantName || '—'}</p>
                          {item.restaurantId && (
                            <span className="font-mono text-[10px] text-slate-400 font-black">CECO: {item.restaurantId}</span>
                          )}
                        </td>

                        {/* Zona / Región */}
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{item.zone || '—'}</p>
                          {item.region && (
                            <span className="text-[10px] text-slate-400 block">{item.region}</span>
                          )}
                        </td>

                        {/* Estado Carnet */}
                        <td className="p-3">
                          {!item.hasCarnet ? (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              PENDIENTE
                            </span>
                          ) : item.isCertExpired ? (
                            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                              CADUCADO
                            </span>
                          ) : item.isCertExpiringSoon ? (
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                              POR VENCER
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              VIGENTE
                            </span>
                          )}
                        </td>

                        {/* Vencimiento */}
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {item.expiryDate ? item.expiryDate.split('-').reverse().join('/') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-bold">
            Mostrando {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredItems.length)} de {filteredItems.length} registros
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-slate-600 font-black">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition shadow-2xs"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        {/* ── Category Manager Floating Modal ─────────────────────────────── */}
        {showCategoryManager && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowCategoryManager(false)}
          >
            <div
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  Catálogo de Categorías de Huérfanos
                </h4>
                <button onClick={() => setShowCategoryManager(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  ✕
                </button>
              </div>

              {/* Add New Category */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Crear Nueva Categoría</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Aprendiz SENA, Proveedor..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-purple-500"
                  />
                  <select
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                  >
                    <option value="emerald">Verde</option>
                    <option value="blue">Azul</option>
                    <option value="amber">Ámbar</option>
                    <option value="indigo">Índigo</option>
                    <option value="violet">Violeta</option>
                    <option value="teal">Turquesa</option>
                    <option value="purple">Púrpura</option>
                    <option value="rose">Rosa</option>
                  </select>
                </div>
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCatName.trim()}
                  className="w-full mt-1.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xs"
                >
                  Agregar Categoría
                </button>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Categorías Registradas</label>
                {categories.map(cat => {
                  const style = COLOR_MAP[cat.color || 'purple'] || COLOR_MAP['purple'];
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
                        {cat.name}
                      </span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
