import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  Employee,
  Restaurant,
  StoreHistory,
  GradeEntry,
  SafeHandsCert,
  BancaData,
  StoreLeader,
  SafeHandsPerson,
  UserRole
} from '@/types';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Calcula antigüedad en formato legible (ej: 1a 4m, 8m, etc.)
const formatTenure = (joinDateStr?: string, exitDateStr?: string): string => {
  if (!joinDateStr) return '-';
  const start = new Date(joinDateStr);
  if (isNaN(start.getTime())) return '-';
  const end = exitDateStr ? new Date(exitDateStr) : new Date();
  if (isNaN(end.getTime())) return '-';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '0 m';

  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0 && months > 0) return `${years}a ${months}m`;
  if (years > 0) return `${years}a`;
  return `${Math.max(1, months)}m`;
};

// Formatea fechas a formato local legible
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Determina el estado del carnet de manipulación
const getCertStatus = (cert?: SafeHandsCert): { label: string; color: string; status: 'vigente' | 'por_vencer' | 'vencido' | 'sin_carnet' } => {
  if (!cert || !cert.expiryDate) {
    return { label: 'Sin carnet', color: 'bg-slate-100 text-slate-500 border-slate-200', status: 'sin_carnet' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(cert.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Vencido', color: 'bg-rose-50 text-rose-700 border-rose-200', status: 'vencido' };
  }
  if (diffDays <= 30) {
    return { label: 'Por vencer', color: 'bg-amber-50 text-amber-700 border-amber-200', status: 'por_vencer' };
  }
  return { label: 'Vigente', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'vigente' };
};

const CERT_NAMES: Record<string, string> = {
  GER: 'Gerencia Experta de Restaurante',
  GAR: 'Gerencia Avanzada de Restaurante',
  GBR: 'Gerencia Básica de Restaurante',
  EAE: 'Entrenando al Entrenador',
};

export const CollaboratorSearch: React.FC = () => {
  const { filteredEmployees, restaurants, initData, auth } = useAppStore();

  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterTitle, setFilterTitle] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Colaborador seleccionado para ver ficha
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Estados detallados para la ficha del colaborador seleccionado
  const [activeTab, setActiveTab] = useState<'movimientos' | 'carnet' | 'notas' | 'banca'>('movimientos');
  const [employeeGrades, setEmployeeGrades] = useState<GradeEntry[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [employeeCerts, setEmployeeCerts] = useState<SafeHandsCert[]>([]);
  const [safeHandsPerson, setSafeHandsPerson] = useState<SafeHandsPerson | null>(null);

  // Datos globales de Banca en caché
  const bancaData = useMemo<BancaData>(() => dataService.getBancaData(), []);

  // Mapas de ayuda para restaurantes (null-safe)
  const restaurantById = useMemo(() => {
    const map = new Map<string, Restaurant>();
    (restaurants || []).forEach(r => {
      if (r?.id != null) {
        map.set(String(r.id).trim().toUpperCase(), r);
      }
      if (r?.name != null) {
        map.set(String(r.name).trim().toUpperCase(), r);
      }
    });
    return map;
  }, [restaurants]);

  // Lista de cargos únicos para el dropdown
  const uniqueTitles = useMemo(() => {
    const set = new Set<string>();
    (filteredEmployees || []).forEach(e => {
      if (e?.title) set.add(String(e.title).trim());
    });
    return Array.from(set).sort();
  }, [filteredEmployees]);

  // Manejo de refresco
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await initData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrado de colaboradores con protección completa contra null / undefined
  const filteredList = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();

    return (filteredEmployees || []).filter(emp => {
      if (!emp) return false;

      // 1. Búsqueda por texto (cédula, nombre, tienda)
      if (term) {
        const empId = emp.id != null ? String(emp.id).toLowerCase() : '';
        const empName = emp.name != null ? String(emp.name).toLowerCase() : '';
        const rawStoreId = emp.restaurant_id != null ? String(emp.restaurant_id).trim() : '';
        const storeIdLower = rawStoreId.toLowerCase();

        const storeObj = rawStoreId ? restaurantById.get(rawStoreId.toUpperCase()) : undefined;
        const storeNameLower = storeObj?.name != null ? String(storeObj.name).toLowerCase() : '';

        const idMatch = empId.includes(term);
        const nameMatch = empName.includes(term);
        const storeIdMatch = storeIdLower.includes(term);
        const storeNameMatch = storeNameLower.includes(term);

        if (!idMatch && !nameMatch && !storeIdMatch && !storeNameMatch) {
          return false;
        }
      }

      // 2. Filtro por Tienda
      if (filterStore !== 'all') {
        const empStore = emp.restaurant_id != null ? String(emp.restaurant_id).trim().toUpperCase() : '';
        if (empStore !== filterStore.trim().toUpperCase()) {
          return false;
        }
      }

      // 3. Filtro por Cargo
      if (filterTitle !== 'all') {
        const empTitle = emp.title != null ? String(emp.title).trim() : '';
        if (empTitle !== filterTitle.trim()) return false;
      }

      // 4. Filtro por Estado
      if (filterStatus === 'active' && (!emp.active || emp.suspended_since)) return false;
      if (filterStatus === 'inactive' && emp.active) return false;
      if (filterStatus === 'suspended' && !emp.suspended_since) return false;

      return true;
    });
  }, [filteredEmployees, searchTerm, filterStore, filterTitle, filterStatus, restaurantById]);

  // Paginación
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Reiniciar a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStore, filterTitle, filterStatus, pageSize]);

  // Cargar datos detallados cuando se abre un colaborador
  useEffect(() => {
    if (!selectedEmployee) {
      setEmployeeGrades([]);
      setEmployeeCerts([]);
      setSafeHandsPerson(null);
      return;
    }

    const empId = String(selectedEmployee.id);

    // 1. Cargar Notas
    setIsLoadingGrades(true);
    dataService.fetchEmployeeGradesHistory(empId)
      .then(grades => setEmployeeGrades(grades || []))
      .catch(err => console.warn('Error cargando notas del colaborador:', err))
      .finally(() => setIsLoadingGrades(false));

    // 2. Cargar Certificados Safe Hands
    dataService.getSafeHandsCerts(empId)
      .then(certs => setEmployeeCerts(certs || []))
      .catch(err => console.warn('Error cargando certificados:', err));

    // 3. Cargar registro de personal Safe Hands si existe
    dataService.getSafeHandsPersonnel().then(personnel => {
      const match = (personnel || []).find(p => String(p.id).trim() === empId.trim());
      if (match) setSafeHandsPerson(match);
    }).catch(() => {});

  }, [selectedEmployee]);

  // Bloquear scroll de la página de fondo cuando la ficha está abierta
  useEffect(() => {
    if (selectedEmployee) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEmployee]);

  // Consulta de asignación en Banca para el colaborador seleccionado
  const selectedBancaLeader = useMemo<StoreLeader | null>(() => {
    if (!selectedEmployee) return null;
    const empId = String(selectedEmployee.id).trim();
    for (const assignment of bancaData.assignments || []) {
      const match = (assignment.members || []).find(m => String(m.employeeId).trim() === empId);
      if (match) return match;
    }
    return null;
  }, [selectedEmployee, bancaData]);

  // Exportar listado filtrado a Excel
  const handleExportExcel = () => {
    if (filteredList.length === 0) return;

    const dataToExport = filteredList.map(emp => {
      const rawStoreId = emp.restaurant_id != null ? String(emp.restaurant_id).trim() : '';
      const storeObj = rawStoreId ? restaurantById.get(rawStoreId.toUpperCase()) : undefined;

      return {
        'Cédula / ID': emp.id != null ? String(emp.id) : '-',
        'Nombre': emp.name || '-',
        'Cargo': emp.title || '-',
        'CECO Tienda': emp.restaurant_id || '-',
        'Nombre Tienda': storeObj?.name || '-',
        'Zona': storeObj?.zone || emp.zone || '-',
        'Región': storeObj?.region || '-',
        'Estado': emp.suspended_since ? 'Suspendido' : (emp.active ? 'Activo' : 'Retirado'),
        'Fecha Ingreso': emp.join_date || '-',
        'Fecha Retiro': emp.exit_date || '-',
        'Antigüedad': formatTenure(emp.join_date, emp.exit_date)
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
    XLSX.writeFile(wb, `Colaboradores_RED_KFC_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Contadores rápidos
  const totalEmployees = (filteredEmployees || []).length;
  const activeCount = useMemo(() => (filteredEmployees || []).filter(e => e.active && !e.suspended_since).length, [filteredEmployees]);
  const inactiveCount = useMemo(() => (filteredEmployees || []).filter(e => !e.active).length, [filteredEmployees]);
  const suspendedCount = useMemo(() => (filteredEmployees || []).filter(e => !!e.suspended_since).length, [filteredEmployees]);

  const user = auth.user;
  const isAuthorized = user && (user.role === UserRole.ADMIN || user.role === UserRole.LIDER);

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-slate-900 leading-tight">
            Buscar Colaborador
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-white hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl transition-all duration-200 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refrescar lista de colaboradores"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
            title="Descargar listado en Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Numérico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Total Colaboradores
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {totalEmployees.toLocaleString()}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Activos
          </span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {activeCount.toLocaleString()}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Retirados
          </span>
          <span className="text-xl font-black text-slate-500 mt-1 block">
            {inactiveCount.toLocaleString()}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Suspendidos
          </span>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {suspendedCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
          {/* Búsqueda por Cédula / Nombre / Tienda */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cédula, nombre o tienda..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Tienda */}
          <div>
            <select
              value={filterStore}
              onChange={e => setFilterStore(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="all">Todas las tiendas</option>
              {(restaurants || []).map(r => (
                <option key={r.id} value={r.id}>
                  {r.id} - {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Cargo */}
          <div>
            <select
              value={filterTitle}
              onChange={e => setFilterTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="all">Todos los cargos</option>
              {uniqueTitles.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-red-500 transition cursor-pointer"
            >
              <option value="all">Estado: Todos</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Retirados</option>
              <option value="suspended">Solo Suspendidos</option>
            </select>
          </div>
        </div>

        {/* Limpiar filtros si hay alguno activo */}
        {(searchTerm || filterStore !== 'all' || filterTitle !== 'all' || filterStatus !== 'all') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-500">
              Filtros activos · {filteredList.length} resultados encontrados
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStore('all');
                setFilterTitle('all');
                setFilterStatus('all');
              }}
              className="text-[11px] font-black text-red-600 hover:text-red-700 transition cursor-pointer uppercase tracking-wider"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Colaboradores */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Cédula</th>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Cargo</th>
                <th className="py-3 px-4">Tienda Actual</th>
                <th className="py-3 px-4">Zona / Región</th>
                <th className="py-3 px-4">Antigüedad</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right sticky right-0 bg-slate-50/95 backdrop-blur-xs z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No se encontraron colaboradores que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedList.map(emp => {
                  const rawStoreId = emp.restaurant_id != null ? String(emp.restaurant_id).trim() : '';
                  const storeObj = rawStoreId ? restaurantById.get(rawStoreId.toUpperCase()) : undefined;
                  const isSuspended = !!emp.suspended_since;
                  const isActive = emp.active && !isSuspended;

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Cédula */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {emp.id}
                      </td>

                      {/* Nombre */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{emp.name || '-'}</span>
                          {isSuspended && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Susp.
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {emp.title || '-'}
                      </td>

                      {/* Tienda */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          {emp.restaurant_id || '-'}
                        </span>
                        {storeObj && (
                          <span className="text-slate-500 ml-1.5 text-[11px]">
                            {storeObj.name}
                          </span>
                        )}
                      </td>

                      {/* Zona / Región */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {storeObj?.zone || emp.zone || '-'}
                        {storeObj?.region && ` · ${storeObj.region}`}
                      </td>

                      {/* Antigüedad */}
                      <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                        {formatTenure(emp.join_date, emp.exit_date)}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Activo
                          </span>
                        ) : isSuspended ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                            Suspendido
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                            Retirado
                          </span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployee(emp);
                          }}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredList.length > 0 && (
          <div className="p-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-bold">
              Mostrando{' '}
              <strong className="text-slate-900">
                {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredList.length)}
              </strong>{' '}
              de <strong className="text-slate-900">{filteredList.length.toLocaleString()}</strong> colaboradores
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value={15}>15 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-slate-700 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE FICHA INTEGRAL DEL COLABORADOR */}
      {selectedEmployee && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmployee(null);
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-white w-full max-w-5xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden relative animate-in zoom-in-95 duration-200">
            {/* Banda roja corporativa superior */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 rounded-t-[28px] sm:rounded-t-[32px] z-20 pointer-events-none" />

            {/* Cabecera del Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 relative z-10 bg-white shrink-0">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-xl font-black uppercase italic tracking-tight text-slate-900 leading-tight">
                    {selectedEmployee.name || 'Colaborador'}
                  </h2>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    ID: {selectedEmployee.id}
                  </span>
                  {selectedEmployee.suspended_since ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                      Suspendido desde {formatDate(selectedEmployee.suspended_since)}
                    </span>
                  ) : selectedEmployee.active ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      Retirado ({formatDate(selectedEmployee.exit_date)})
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                  <span className="font-bold text-slate-800">
                    {selectedEmployee.title || 'Cargo no especificado'}
                  </span>
                  <span>·</span>
                  <span>
                    Tienda: <strong className="text-slate-800">{selectedEmployee.restaurant_id || '-'}</strong>
                    {selectedEmployee.restaurant_id && restaurantById.get(String(selectedEmployee.restaurant_id).trim().toUpperCase()) && (
                      ` (${restaurantById.get(String(selectedEmployee.restaurant_id).trim().toUpperCase())?.name})`
                    )}
                  </span>
                  <span>·</span>
                  <span>
                    Ingreso: <strong className="text-slate-800">{formatDate(selectedEmployee.join_date)}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Antigüedad: <strong className="text-slate-800">{formatTenure(selectedEmployee.join_date, selectedEmployee.exit_date)}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas de la Ficha */}
            <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/90 overflow-x-auto custom-scrollbar shrink-0 relative z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('movimientos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition flex items-center gap-2 ${
                  activeTab === 'movimientos'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span>Movimientos</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  activeTab === 'movimientos'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedEmployee.history?.length || 1}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('carnet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition flex items-center gap-2 ${
                  activeTab === 'carnet'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span>Carnet Manipulación</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  activeTab === 'carnet'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {employeeCerts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition flex items-center gap-2 ${
                  activeTab === 'notas'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span>Notas y Curvas</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                  activeTab === 'notas'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {employeeGrades.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('banca')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition flex items-center gap-2 ${
                  activeTab === 'banca'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span>Banca</span>
                {selectedBancaLeader && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                    activeTab === 'banca'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    Asignado
                  </span>
                )}
              </button>
            </div>

            {/* Contenido del Tab Activo */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-white">
              {/* TAB 1: MOVIMIENTOS & TRASLADOS */}
              {activeTab === 'movimientos' && (
                <div className="space-y-4">
                  {(!selectedEmployee.history || selectedEmployee.history.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Historial Inicial
                      </span>
                      <p className="text-xs font-bold text-slate-700">
                        Ingreso registrado el {formatDate(selectedEmployee.join_date)} en la tienda {selectedEmployee.restaurant_id || '-'}. Sin traslados posteriores registrados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEmployee.history.map((mov, mIdx) => {
                        const isRetiro = mov.action === 'RETIRO';
                        const isTraslado = mov.action === 'TRASLADO';
                        const isIngreso = mov.action === 'INGRESO';

                        const rawStore = mov.restaurantName != null ? String(mov.restaurantName).trim().toUpperCase() : '';
                        const storeObj = rawStore ? restaurantById.get(rawStore) : undefined;

                        return (
                          <div
                            key={mIdx}
                            className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                                isIngreso
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isTraslado
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {mov.action}
                              </span>

                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  Tienda: {mov.restaurantName || '-'} {storeObj ? `(${storeObj.name})` : ''}
                                </span>
                                {storeObj && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Zona {storeObj.zone} · Región {storeObj.region}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-bold text-slate-600 font-mono">
                              {formatDate(mov.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CARNET DE MANIPULACIÓN (SAFE HANDS) */}
              {activeTab === 'carnet' && (
                <div className="space-y-4">
                  {employeeCerts.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-600">
                        No se encontraron certificados de manipulación registrados para la cédula {selectedEmployee.id}.
                      </p>
                      {safeHandsPerson && safeHandsPerson.category && (
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Categoría en Safe Hands: <strong>{safeHandsPerson.category}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employeeCerts.map(cert => {
                        const statusInfo = getCertStatus(cert);
                        return (
                          <div
                            key={cert.id || cert.certificateCode}
                            className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-slate-900">
                                  {cert.certificateCode}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </div>

                              <a
                                href={`/verify/${cert.certificateCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ver certificado público</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Fecha Emisión
                                </span>
                                <span className="font-bold text-slate-800">
                                  {formatDate(cert.issueDate)}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Fecha Vencimiento
                                </span>
                                <span className="font-bold text-slate-800">
                                  {formatDate(cert.expiryDate)}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Tienda Asociada
                                </span>
                                <span className="font-bold text-slate-800">
                                  {cert.restaurantId || '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: NOTAS Y CURVAS */}
              {activeTab === 'notas' && (
                <div className="space-y-4">
                  {isLoadingGrades ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-500">
                      Cargando historial de notas...
                    </div>
                  ) : employeeGrades.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-600">
                        No hay registros de calificaciones ni curvas asociadas a este colaborador.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Promedio general */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Promedio General Histórico
                          </span>
                          <span className="text-xl font-black text-slate-900 mt-0.5 block">
                            {Math.round(
                              employeeGrades.reduce((sum, g) => sum + (g.score || 0), 0) / employeeGrades.length
                            )} / 100 pts
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {employeeGrades.length} evaluaciones
                        </span>
                      </div>

                      {/* Tabla de notas con contenedor scrollable propio y cabecera fija */}
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 sticky top-0 z-10 shadow-2xs">
                              <tr>
                                <th className="py-2.5 px-3 bg-slate-100">Mes</th>
                                <th className="py-2.5 px-3 bg-slate-100">Grupo</th>
                                <th className="py-2.5 px-3 bg-slate-100">Categoría</th>
                                <th className="py-2.5 px-3 bg-slate-100">Tienda</th>
                                <th className="py-2.5 px-3 text-right bg-slate-100">Puntaje</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium bg-white">
                              {employeeGrades.map((g, gIdx) => (
                                <tr key={gIdx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                    {g.month}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-800">
                                    Grupo {g.group}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700">
                                    {g.category}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                                    {g.restaurantId || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={`font-black text-xs px-2 py-0.5 rounded-lg inline-block ${
                                      g.score >= 80
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : g.score >= 70
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {g.score}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BANCA & CERTIFICACIONES */}
              {activeTab === 'banca' && (
                <div className="space-y-4">
                  {!selectedBancaLeader ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
                      <p className="text-xs font-bold text-slate-600">
                        El colaborador no se encuentra asignado en la estructura activa de Banca.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Rol en Banca
                        </span>
                        <span className="text-sm font-black text-slate-900 uppercase">
                          {selectedBancaLeader.role}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                          Certificaciones Yum! Acreditadas
                        </span>
                        {(!selectedBancaLeader.certifications || selectedBancaLeader.certifications.length === 0) ? (
                          <span className="text-xs text-slate-500 font-medium">Sin certificaciones registradas.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedBancaLeader.certifications.map(cert => (
                              <div
                                key={cert}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2"
                              >
                                <span className="font-mono text-xs font-black text-slate-900 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                                  {cert}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700">
                                  {CERT_NAMES[cert] || cert}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pie de la Ficha */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-end relative z-10 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CollaboratorSearch;
