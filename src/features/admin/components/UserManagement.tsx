import React, { useState, useMemo } from 'react';
import { User, UserRole, HierarchyData, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';
import { UserPlus, Trash2, Key, X, Globe, Search, Layers, Store, Check, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  currentUser: User;
  users: User[];
  setUsers: (users: User[]) => void;
  hierarchy: HierarchyData;
  restaurants: Restaurant[];
  setImportStatus: (status: { message: string, isError: boolean } | null) => void;
}

export const UserManagement: React.FC<Props> = ({ currentUser, users, setUsers, hierarchy, restaurants, setImportStatus }) => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionSearchTerm, setRegionSearchTerm] = useState('');

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

      // Un coordinador ve a todos los especialistas que compartan al menos una región con él
      const hasSharedRegion = (u.assignedRegions || []).some(reg => currentUser.assignedRegions?.includes(reg));
      if (hasSharedRegion) return true;

      const coordRegions = hierarchy.regions.filter(r => currentUser.assignedRegions?.includes(r.name));
      const coordZones = coordRegions.flatMap(r => r.zones.map(z => z.name));
      return (u.assignedZones || []).some(z => coordZones.includes(z)) ||
        (u.assignedRestaurants || []).some(rid => {
          const rest = restaurants.find(r => r.id === rid);
          return rest && currentUser.assignedRegions?.includes(rest.region);
        });
    });
  }, [users, currentUser, hierarchy, restaurants]);

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

  const handleDeleteUser = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      try {
        await dataService.deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
        setImportStatus({ message: "Usuario eliminado correctamente.", isError: false });
      } catch {
        alert("No se pudo eliminar el usuario.");
      }
    }
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

  return (
    <>
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
    </>
  );
};
