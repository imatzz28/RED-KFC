
import React, { useState, useMemo } from 'react';
import { dataService } from '../dataService';
import { UserRole, User, HierarchyData, Restaurant } from '../types';
import * as XLSX from 'xlsx';
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Network,
  UserPlus,
  Trash2,
  Key,
  Layers,
  Check,
  RefreshCw,
  Globe,
  UploadCloud,
  FileDown,
  Search,
  Users,
  Lock,
  Unlock,
  Calendar,
  Store,
  Save,
  Activity
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  onEmployeesImported: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onEmployeesImported }) => {
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'users' | 'hierarchy' | 'settlement' | 'sst-config'>(
    currentUser.role === UserRole.ADMIN ? 'import' : 'users'
  );
  const [importStatus, setImportStatus] = useState<{ message: string, isError: boolean } | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyData>(dataService.getHierarchy());
  const [users, setUsers] = useState<User[]>(dataService.getUsers());
  const [restaurants, setRestaurants] = useState<Restaurant[]>(dataService.getRestaurants());

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionSearchTerm, setRegionSearchTerm] = useState('');

  // Estado para configuración de SST
  const [sstMonth, setSstMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [sstCat1, setSstCat1] = useState('');
  const [sstCat2, setSstCat2] = useState('');

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    role: UserRole.SPECIALIST,
    assignedZones: [],
    assignedRestaurants: [],
    assignedRegions: []
  });

  const availableRegions = useMemo(() => {
    const all = hierarchy.regions.map(r => r.name).sort();
    if (currentUser.role === UserRole.COORDINATOR) {
      return all.filter(r => currentUser.assignedRegions?.includes(r));
    }
    return all;
  }, [hierarchy, currentUser]);

  const filteredRegions = useMemo(() => {
    if (!regionSearchTerm) return availableRegions;
    return availableRegions.filter(r => r.toLowerCase().includes(regionSearchTerm.toLowerCase()));
  }, [availableRegions, regionSearchTerm]);

  const availableZones = useMemo(() => {
    const zonesSet = new Set<string>();
    hierarchy.regions.forEach(r => {
      if (currentUser.role === UserRole.ADMIN || currentUser.assignedRegions?.includes(r.name)) {
        r.zones.forEach(z => zonesSet.add(z.name));
      }
    });
    return Array.from(zonesSet).sort();
  }, [hierarchy, currentUser]);

  const visibleUsers = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN) return users;
    return users.filter(u => {
      if (u.role !== UserRole.SPECIALIST) return false;
      const coordRegions = hierarchy.regions.filter(r => currentUser.assignedRegions?.includes(r.name));
      const coordZones = coordRegions.flatMap(r => r.zones.map(z => z.name));
      return (u.assignedZones || []).some(z => coordZones.includes(z)) ||
        (u.assignedRestaurants || []).some(rid => {
          const rest = restaurants.find(r => r.id === rid);
          return rest && currentUser.assignedRegions?.includes(rest.region);
        });
    });
  }, [users, currentUser, hierarchy, restaurants]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'employees' | 'hierarchy') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus({ message: 'Procesando archivo...', isError: false });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (type === 'employees') {
          const res = await dataService.importMonthlyExcel(data);
          setImportStatus({ message: `Carga exitosa: ${res.count} trabajadores sincronizados.`, isError: false });
        } else {
          const count = await dataService.importHierarchyExcel(data);
          setImportStatus({ message: `Éxito: ${count} tiendas sincronizadas correctamente.`, isError: false });
          setHierarchy(dataService.getHierarchy());
          setRestaurants(dataService.getRestaurants());
        }
        onEmployeesImported();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
        setImportStatus({ message: `Error: ${errorMessage}`, isError: true });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSaveSstConfig = async () => {
    setIsSaving(true);
    try {
      const newHierarchy = { ...hierarchy };
      if (!newHierarchy.groupDConfig) newHierarchy.groupDConfig = {};
      newHierarchy.groupDConfig[sstMonth] = { cat1: sstCat1, cat2: sstCat2 };

      await dataService.saveHierarchy(newHierarchy);
      setHierarchy(newHierarchy);
      setImportStatus({ message: `Temas de Guías para ${sstMonth} actualizados correctamente.`, isError: false });
    } catch {
      alert("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMonthChangeSst = (m: string) => {
    setSstMonth(m);
    const cfg = hierarchy.groupDConfig?.[m];
    setSstCat1(cfg?.cat1 || '');
    setSstCat2(cfg?.cat2 || '');
  };

  const handleSaveUser = async () => {
    if (!newUser.username || (!selectedUser && !newUser.password)) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }
    setIsSaving(true);
    try {
      const userToSave: User = selectedUser
        ? { ...selectedUser, ...newUser as User }
        : {
          id: `user_${Date.now()}`,
          username: newUser.username!,
          password: newUser.password!,
          role: currentUser.role === UserRole.COORDINATOR ? UserRole.SPECIALIST : newUser.role!,
          assignedZones: newUser.assignedZones || [],
          assignedRestaurants: newUser.assignedRestaurants || [],
          assignedRegions: newUser.assignedRegions || []
        };

      const updatedUsersList = selectedUser
        ? users.map(u => u.id === userToSave.id ? userToSave : u)
        : [...users, userToSave];

      await dataService.saveUsers(updatedUsersList);
      setUsers(updatedUsersList);
      setShowUserModal(false);
      setSelectedUser(null);
      setNewUser({ username: '', password: '', role: UserRole.SPECIALIST, assignedZones: [], assignedRestaurants: [], assignedRegions: [] });
      setImportStatus({ message: `Especialista @${userToSave.username} guardado exitosamente.`, isError: false });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      alert(`Error al guardar: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      try {
        await dataService.deleteUser(id);
        setUsers(prev => prev.filter(u => u.id !== id));
        setImportStatus({ message: "Usuario eliminado correctamente.", isError: false });
      } catch {
        alert(`No se pudo eliminar el usuario.`);
      }
    }
  };

  const toggleMonthLock = async (month: string) => {
    const isLocked = hierarchy.lockedMonths.includes(month);
    let newLockedMonths;
    if (isLocked) {
      newLockedMonths = hierarchy.lockedMonths.filter(m => m !== month);
    } else {
      newLockedMonths = [...hierarchy.lockedMonths, month];
    }

    const newHierarchy = { ...hierarchy, lockedMonths: newLockedMonths };
    setIsSaving(true);
    try {
      await dataService.saveHierarchy(newHierarchy);
      setHierarchy(newHierarchy);
      setImportStatus({
        message: isLocked ? `Periodo ${month} abierto para edición.` : `Periodo ${month} cerrado (Asentado).`,
        isError: false
      });
    } catch {
      alert("Error al actualizar el estado del periodo.");
    } finally {
      setIsSaving(false);
    }
  };

  const monthsToManage = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dates.push(d.toISOString().slice(0, 7));
    }
    return dates;
  }, []);

  const toggleItem = (val: string, field: 'assignedZones' | 'assignedRegions' | 'assignedRestaurants') => {
    const current = newUser[field] || [];
    if (current.includes(val)) {
      setNewUser({ ...newUser, [field]: current.filter((v: string) => v !== val) });
    } else {
      setNewUser({ ...newUser, [field]: [...current, val] });
    }
  };

  const filteredStores = useMemo(() => {
    let base = restaurants;
    if (currentUser.role === UserRole.COORDINATOR) {
      base = base.filter(r => currentUser.assignedRegions?.includes(r.region));
    }
    if (!searchTerm) return [];
    return base.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [restaurants, searchTerm, currentUser]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg">
              {currentUser.role === UserRole.ADMIN ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                {currentUser.role === UserRole.ADMIN ? 'Panel Administración' : 'Gestión de Equipo'}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentUser.role === UserRole.ADMIN && (
                  <>
                    <button onClick={() => setActiveSubTab('import')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'import' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Carga Excel</button>
                    <button onClick={() => setActiveSubTab('sst-config')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'sst-config' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Configuración Guías Mensual</button>
                    <button onClick={() => setActiveSubTab('settlement')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'settlement' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Asentar Notas</button>
                    <button onClick={() => setActiveSubTab('hierarchy')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'hierarchy' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Estructura</button>
                  </>
                )}
                <button onClick={() => setActiveSubTab('users')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Gestión de Usuarios</button>
              </div>
            </div>
          </div>
        </div>

        {importStatus && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${importStatus.isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {importStatus.isError ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p className="text-[10px] font-black uppercase tracking-widest">{importStatus.message}</p>
            <button onClick={() => setImportStatus(null)} className="ml-auto p-1 hover:bg-black/5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeSubTab === 'import' && currentUser.role === UserRole.ADMIN && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const templateData = [{ "Documento": "12345678", "Nombre completo": "JUAN PEREZ", "Fecha de ingreso": "2023-01-15", "Cargo": "Miembro de equipo", "Nombre_Ceco": "CECO001", "Fecha fin": "" }];
                  const ws = XLSX.utils.json_to_sheet(templateData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
                  XLSX.writeFile(wb, "Plantilla_Nomina_KFC.xlsx");
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-red-500 hover:text-red-600 transition-all shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                Descargar Plantilla
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-red-600"><FileSpreadsheet className="w-8 h-8" /></div>
                <h3 className="text-sm font-black uppercase italic tracking-tight">Plantilla Personal Mensual</h3>
                <label className="cursor-pointer bg-red-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Cargar Nómina
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'employees')} />
                </label>
              </div>
              <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-600"><Network className="w-8 h-8" /></div>
                <h3 className="text-sm font-black uppercase italic tracking-tight">Maestro Estructura (CECOs)</h3>
                <label className="cursor-pointer bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Cargar Estructura
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'hierarchy')} />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'sst-config' && currentUser.role === UserRole.ADMIN && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-red-600 text-white rounded-[24px] shadow-xl"><Activity className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Configuración de Guías Mensual</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Asigna los temas de capacitación y SST para cada mes del año.</p>
                </div>
              </div>

              <div className="max-w-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo a Configurar</label>
                  {/* Importante: datepicker-container para confinar el área de click absoluta */}
                  <div className="datepicker-container relative">
                    <input
                      type="month"
                      value={sstMonth}
                      onChange={e => handleMonthChangeSst(e.target.value)}
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guías Plan de Capacitación</label>
                    <input
                      type="text"
                      value={sstCat1}
                      onChange={e => setSstCat1(e.target.value)}
                      placeholder="Guías Plan de Capacitación"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guías de SST</label>
                    <input
                      type="text"
                      value={sstCat2}
                      onChange={e => setSstCat2(e.target.value)}
                      placeholder="Guías de SST"
                      className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveSstConfig}
                  disabled={isSaving}
                  className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3"
                >
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSaving ? 'Guardando...' : `Guardar Temas para ${sstMonth}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'settlement' && currentUser.role === UserRole.ADMIN && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-red-600 text-white rounded-[24px] shadow-xl"><Calendar className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Asentar Calificaciones</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">* Una vez asentado un mes, no se podrán realizar más cambios en las notas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monthsToManage.map(m => {
                  const isLocked = hierarchy.lockedMonths.includes(m);
                  return (
                    <div key={m} className={`p-6 rounded-[32px] border-2 flex items-center justify-between transition-all ${isLocked ? 'bg-white border-red-500 shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isLocked ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        </div>
                        <span className="text-lg font-black uppercase italic tracking-tighter text-slate-800">{m}</span>
                      </div>
                      <button
                        onClick={() => toggleMonthLock(m)}
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all ${isLocked ? 'bg-red-600 text-white shadow-lg hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-black shadow-md'}`}
                      >
                        {isLocked ? 'Abrir Periodo' : 'Asentar Notas'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'hierarchy' && currentUser.role === UserRole.ADMIN && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hierarchy.regions.map(region => (
                <div key={region.name} className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden flex flex-col">
                  <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600 rounded-xl shadow-lg">
                        <Globe className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase italic tracking-tight">{region.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{region.zones.length} Zonas</span>
                  </div>
                  <div className="p-4 space-y-3 flex-1">
                    {region.zones.map(zone => (
                      <div key={zone.name} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-800 uppercase italic">{zone.name}</span>
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{zone.restaurantIds.length} Tiendas</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {zone.restaurantIds.map(rid => {
                            const rest = restaurants.find(r => r.id === rid);
                            return (
                              <div key={rid} className="group relative">
                                <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 cursor-default hover:bg-slate-900 hover:text-white transition-all">
                                  {rid}
                                </span>
                                {rest && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10 uppercase italic">
                                    {rest.name}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
            <button onClick={() => {
              setSelectedUser(null);
              setNewUser({
                role: UserRole.SPECIALIST,
                assignedZones: [],
                assignedRestaurants: [],
                assignedRegions: currentUser.role === UserRole.COORDINATOR ? currentUser.assignedRegions : []
              });
              setRegionSearchTerm(''); setSearchTerm(''); setShowUserModal(true);
            }}
              className="p-6 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors group"
            >
              <UserPlus className="w-6 h-6 mb-2" />
              <span className="text-[9px] font-black uppercase">Nuevo Especialista</span>
            </button>
            {visibleUsers.map(u => (
              <div
                key={u.id}
                onClick={() => { setSelectedUser(u); setNewUser(u); setRegionSearchTerm(''); setSearchTerm(''); setShowUserModal(true); }}
                className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:border-red-400 hover:shadow-xl hover:shadow-red-50 transition-all relative cursor-pointer"
              >
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  {u.username !== 'admin' && (u.role === UserRole.SPECIALIST || currentUser.role === UserRole.ADMIN) && (
                    <button
                      onClick={(e) => handleDeleteUser(e, u.id)}
                      className="p-2 text-slate-300 hover:text-red-600 bg-slate-50 rounded-lg shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-400"><Key className="w-5 h-5" /></div>
                  <p className="text-sm font-black text-slate-800 uppercase truncate italic leading-none">{u.username}</p>
                  <p className={`text-[8px] font-black uppercase mt-2 tracking-widest inline-block px-2 py-0.5 rounded ${u.role === UserRole.ADMIN ? 'bg-slate-900 text-white' : u.role === UserRole.COORDINATOR ? 'bg-blue-600 text-white' : 'bg-red-100 text-red-600'}`}>
                    {u.role === UserRole.ADMIN ? 'ADMIN' : u.role === UserRole.COORDINATOR ? 'COORDINADOR' : 'ESPECIALISTA'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden border-2 border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black uppercase italic tracking-tighter text-xl">
                {selectedUser ? 'Configurar Especialista' : 'Nuevo Especialista'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID de Acceso</label>
                  <input
                    type="text"
                    disabled={!!selectedUser}
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className={`w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-red-500 ${selectedUser ? 'opacity-50' : ''}`}
                    placeholder="Usuario"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-red-500"
                    placeholder={selectedUser ? "Escriba nueva clave" : "Clave inicial"}
                  />
                </div>
              </div>

              {currentUser.role === UserRole.ADMIN && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perfil de Usuario</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[UserRole.SPECIALIST, UserRole.COORDINATOR, UserRole.ADMIN].map(role => (
                      <button key={role} onClick={() => setNewUser({ ...newUser, role })} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${newUser.role === role ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                        {role === UserRole.SPECIALIST ? 'Especialista' : role === UserRole.COORDINATOR ? 'Coordinador' : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100">
                {newUser.role === UserRole.COORDINATOR && currentUser.role === UserRole.ADMIN && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Globe className="w-3 h-3 text-red-600" /> Buscar y Asignar Regiones</p>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input type="text" placeholder="Buscar región..." value={regionSearchTerm} onChange={e => setRegionSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto no-scrollbar p-1">
                      {filteredRegions.map(reg => (
                        <button key={reg} onClick={() => toggleItem(reg, 'assignedRegions')} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 text-left flex items-center justify-between transition-all ${newUser.assignedRegions?.includes(reg) ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                          <span className="truncate pr-2">{reg}</span>
                          {newUser.assignedRegions?.includes(reg) && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(newUser.role === UserRole.SPECIALIST) && (
                  <>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Layers className="w-3 h-3 text-red-600" /> Zonas de Gestión</p>
                      <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto p-1">
                        {availableZones.map(zone => (
                          <button key={zone} onClick={() => toggleItem(zone, 'assignedZones')} className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 text-left flex items-center justify-between ${newUser.assignedZones?.includes(zone) ? 'bg-red-50 border-red-600 text-red-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                            <span className="truncate pr-1">{zone}</span> {newUser.assignedZones?.includes(zone) && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Store className="w-3 h-3 text-red-600" /> Tiendas Específicas</p>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Buscar por CECO o Nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" />
                      </div>
                      {filteredStores.length > 0 && (
                        <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 space-y-1">
                          {filteredStores.map(st => (
                            <button key={st.id} onClick={() => toggleItem(st.id, 'assignedRestaurants')} className={`w-full p-2.5 rounded-xl text-left text-[9px] font-black uppercase flex items-center justify-between transition-colors ${newUser.assignedRestaurants?.includes(st.id) ? 'bg-white text-red-600 shadow-sm' : 'hover:bg-slate-100 text-slate-400'}`}>
                              <span>{st.id} - {st.name}</span>
                              {newUser.assignedRestaurants?.includes(st.id) && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button onClick={handleSaveUser} disabled={isSaving} className="w-full py-5 bg-red-600 text-white font-black rounded-full shadow-xl hover:bg-red-700 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 mt-4">
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : selectedUser ? 'Actualizar Información' : 'Crear Acceso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
