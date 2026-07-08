import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, HierarchyData, Restaurant } from '@/types';
import { dataService, supabase } from '@/services/dataService';
import { 
  UserPlus, Trash2, Key, X, Globe, Search, Layers, Store, Check, 
  RefreshCw, CheckCircle2, Users, User as UserIcon, MapPin, 
  MoreVertical, Eye, Pencil, ChevronLeft, ChevronRight, SlidersHorizontal,
  UserCheck, ShieldAlert
} from 'lucide-react';

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
  
  // New user credentials state
  const [password, setPassword] = useState('');
  
  // Custom confirmation state
  const [userToDelete, setUserToDelete] = useState<{ id: string, username: string } | null>(null);
  
  // Dropdown filter states
  const [filterRegion, setFilterRegion] = useState('Todos');
  const [filterRole, setFilterRole] = useState('Todos');
  const [filterCoordinator, setFilterCoordinator] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  
  // Interactive list states
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    role: UserRole.SPECIALIST,
    assignedZones: [],
    assignedRestaurants: [],
    assignedRegions: []
  });

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuUserId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Format username to full name
  const formatName = (username: string) => {
    if (!username) return '';
    return username
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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

  // Find coordinator for a specific user (specialist) sharing a region
  const getCoordinatorForUser = (user: User) => {
    if (user.role === UserRole.COORDINATOR || user.role === UserRole.ADMIN) {
      return null;
    }
    const coord = users.find(u => 
      u.role === UserRole.COORDINATOR && 
      (u.assignedRegions || []).some(reg => (user.assignedRegions || []).includes(reg))
    );
    return coord || null;
  };

  const coordinatorsList = useMemo(() => {
    return visibleUsers.filter(u => u.role === UserRole.COORDINATOR);
  }, [visibleUsers]);

  // Apply filters
  const filteredUsers = useMemo(() => {
    let result = visibleUsers;

    // 1. Search Query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.username.toLowerCase().includes(q) || 
        formatName(u.username).toLowerCase().includes(q)
      );
    }

    // 2. Filter Region
    if (filterRegion !== 'Todos') {
      result = result.filter(u => (u.assignedRegions || []).includes(filterRegion));
    }

    // 3. Filter Role
    if (filterRole !== 'Todos') {
      result = result.filter(u => u.role === filterRole);
    }

    // 4. Filter Coordinator
    if (filterCoordinator !== 'Todos') {
      result = result.filter(u => {
        const coord = getCoordinatorForUser(u);
        return coord && coord.username === filterCoordinator;
      });
    }

    // 5. Filter Status
    if (filterStatus === 'Inactivo') {
      return []; // All users are active in our system
    }

    return result;
  }, [visibleUsers, searchTerm, filterRegion, filterRole, filterCoordinator, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filterRegion, filterRole, filterCoordinator, filterStatus, pageSize]);

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

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

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSaving(true);
    try {
      // 1. Eliminar de auth.users mediante RPC
      const { error: authError } = await supabase.rpc('manage_user_auth', {
        p_username: userToDelete.username,
        p_password: '',
        p_action: 'DELETE'
      });
      
      if (authError) {
        console.error("Error al borrar en auth.users:", authError);
      }

      // 2. Eliminar del perfil en public.users
      await dataService.deleteUser(userToDelete.id);
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setImportStatus({ message: "Usuario eliminado correctamente.", isError: false });
      setUserToDelete(null);
    } catch {
      alert("No se pudo eliminar el usuario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!newUser.username || !newUser.role) {
      alert("El usuario y el rol son obligatorios.");
      return;
    }
    
    // Limpiar el sufijo @kfc.co si el usuario lo ingresó por error
    const cleanUsername = newUser.username.includes('@') 
      ? newUser.username.split('@')[0].trim() 
      : newUser.username.trim();
    
    const userToProcess = { ...newUser, username: cleanUsername };
    
    // Validate password for new user
    if (!selectedUser && !password) {
      alert("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    setIsSaving(true);
    try {
      let userId = selectedUser?.id;

      if (!selectedUser) {
        // 1. Crear en auth.users mediante RPC
        const { data: generatedId, error: rpcError } = await supabase.rpc('manage_user_auth', {
          p_username: userToProcess.username!,
          p_password: password,
          p_action: 'CREATE'
        });

        if (rpcError || !generatedId) {
          throw new Error(rpcError?.message || "No se pudo crear el acceso de autenticación.");
        }
        userId = generatedId;
      } else if (password) {
        // 2. Modificar contraseña mediante RPC si se ingresó una para un usuario existente
        const { error: rpcError } = await supabase.rpc('manage_user_auth', {
          p_username: userToProcess.username!,
          p_password: password,
          p_action: 'UPDATE_PASSWORD'
        });

        if (rpcError) {
          throw new Error(rpcError?.message || "No se pudo actualizar la contraseña del usuario.");
        }
      }

      // 3. Crear o actualizar perfil en public.users
      const userToSave: User = selectedUser
        ? { ...selectedUser, ...userToProcess as User }
        : {
          id: userId!,
          username: userToProcess.username!,
          role: currentUser.role === UserRole.COORDINATOR ? UserRole.SPECIALIST : userToProcess.role!,
          assignedZones: userToProcess.assignedZones || [],
          assignedRestaurants: userToProcess.assignedRestaurants || [],
          assignedRegions: userToProcess.assignedRegions || []
        };

      const updatedUsersList = selectedUser
        ? users.map(u => u.id === userToSave.id ? userToSave : u)
        : [...users, userToSave];

      await dataService.saveUsers(updatedUsersList);
      setUsers(updatedUsersList);
      setShowUserModal(false);
      setSelectedUser(null);
      setNewUser({ username: '', role: UserRole.SPECIALIST, assignedZones: [], assignedRestaurants: [], assignedRegions: [] });
      setPassword('');
      setRegionSearchTerm('');
      setSearchTerm('');
      setImportStatus({ message: `Usuario @${userToSave.username} guardado exitosamente.`, isError: false });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      alert(`Error al guardar: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Compute stats
  const totalCount = visibleUsers.length;
  const specialistsCount = visibleUsers.filter(u => u.role === UserRole.SPECIALIST).length;
  const coordinatorsCount = visibleUsers.filter(u => u.role === UserRole.COORDINATOR).length;
  const specialistsPercent = totalCount > 0 ? Math.round((specialistsCount / totalCount) * 100) : 0;
  const coordinatorsPercent = totalCount > 0 ? Math.round((coordinatorsCount / totalCount) * 100) : 0;
  const regionsCount = availableRegions.length;
  
  const assignedCoordinatorsCount = useMemo(() => {
    const coordinators = visibleUsers.filter(u => u.role === UserRole.COORDINATOR);
    return coordinators.filter(c => 
      visibleUsers.some(s => s.role === UserRole.SPECIALIST && (s.assignedRegions || []).some(reg => (c.assignedRegions || []).includes(reg)))
    ).length;
  }, [visibleUsers]);

  return (
    <div className="space-y-6">
      {/* Title & Subtitle Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-red-600" />
            Usuarios
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gestiona y administra especialistas y coordinadores
          </p>
        </div>

        <button 
          onClick={() => {
            setSelectedUser(null);
            setNewUser({
              role: UserRole.SPECIALIST,
              assignedZones: [],
              assignedRestaurants: [],
              assignedRegions: currentUser.role === UserRole.COORDINATOR ? currentUser.assignedRegions : []
            });
            setPassword('');
            setRegionSearchTerm(''); 
            setSearchTerm(''); 
            setShowUserModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-2 animate-in fade-in duration-300">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[90px]">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total usuarios</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{totalCount}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">En el sistema</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[90px]">
          <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Especialistas</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{specialistsCount}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{specialistsPercent}% del total</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[90px]">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Coordinadores</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{coordinatorsCount}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{coordinatorsPercent}% del total</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[90px]">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Regiones</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{regionsCount}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Activas</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 min-h-[90px]">
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Coords asignados</p>
            <p className="text-2xl font-black text-slate-800 leading-none mt-1">{assignedCoordinatorsCount}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Con especialistas</p>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-red-500 text-sm font-semibold transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Region Filter */}
          <select 
            className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-red-500 cursor-pointer"
            value={filterRegion}
            onChange={e => setFilterRegion(e.target.value)}
          >
            <option value="Todos">Región: Todas</option>
            {availableRegions.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>

          {/* Cargo Filter */}
          <select 
            className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-red-500 cursor-pointer"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="Todos">Cargo: Todos</option>
            <option value={UserRole.SPECIALIST}>Especialista</option>
            <option value={UserRole.COORDINATOR}>Coordinador</option>
            <option value={UserRole.GUEST}>Invitado</option>
            <option value={UserRole.ADMIN}>Administrador</option>
          </select>

          {/* Coordinator Filter */}
          <select 
            className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-red-500 cursor-pointer"
            value={filterCoordinator}
            onChange={e => setFilterCoordinator(e.target.value)}
          >
            <option value="Todos">Coordinador: Todos</option>
            {coordinatorsList.map(c => (
              <option key={c.id} value={c.username}>{formatName(c.username)}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-red-500 cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          {/* Clear Filters Button */}
          {(searchTerm || filterRegion !== 'Todos' || filterRole !== 'Todos' || filterCoordinator !== 'Todos' || filterStatus !== 'Todos') && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterRegion('Todos');
                setFilterRole('Todos');
                setFilterCoordinator('Todos');
                setFilterStatus('Todos');
              }}
              className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all ml-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* User Table Grid */}
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
        <div className="overflow-x-auto min-h-[280px]">
          {totalItems === 0 ? (
            <div className="py-24 text-center">
              <UserIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold text-sm">No se encontraron usuarios</p>
              <p className="text-xs text-slate-300 mt-1">Prueba cambiando los criterios de búsqueda o filtros.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] pl-8">Usuario</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cargo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Región</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Coordinador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Estado</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] pr-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedUsers.map(u => {
                  const initials = getInitials(formatName(u.username));
                  
                  // Color templates based on username hash
                  const colors = [
                    'bg-rose-50 text-rose-600 border-rose-100',
                    'bg-blue-50 text-blue-600 border-blue-100',
                    'bg-emerald-50 text-emerald-600 border-emerald-100',
                    'bg-amber-50 text-amber-600 border-amber-100',
                    'bg-violet-50 text-violet-600 border-violet-100',
                    'bg-sky-50 text-sky-600 border-sky-100'
                  ];
                  const colorIndex = u.username.charCodeAt(0) % colors.length;
                  const avatarClass = colors[colorIndex];
                  
                  const roleBadge = u.role === UserRole.ADMIN
                    ? 'bg-slate-900/10 text-slate-800 border-slate-200'
                    : u.role === UserRole.COORDINATOR
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : u.role === UserRole.GUEST
                        ? 'bg-purple-50 text-purple-600 border-purple-100'
                        : 'bg-red-50 text-red-600 border-red-100';
                      
                  const roleLabel = u.role === UserRole.ADMIN 
                    ? 'Admin' 
                    : u.role === UserRole.COORDINATOR 
                      ? 'Coordinador' 
                      : u.role === UserRole.GUEST 
                        ? 'Invitado' 
                        : 'Especialista';
                  const coordinator = getCoordinatorForUser(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                      {/* Usuario */}
                      <td className="px-6 py-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${avatarClass}`}>
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700">{formatName(u.username)}</span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border tracking-widest ${roleBadge}`}>
                                {u.role}
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold text-slate-400 font-mono tracking-tight">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                        {roleLabel}
                      </td>

                      {/* Región */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-600 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={(u.assignedRegions || []).join(', ')}>
                            {(u.assignedRegions || []).join(', ') || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Coordinador */}
                      <td className="px-6 py-4">
                        {coordinator ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-black text-blue-600 shrink-0">
                              {getInitials(formatName(coordinator.username))}
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                              {formatName(coordinator.username)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-350 font-bold">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                          Activo
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right pr-8 relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>

                        {/* Floating Action Dropdown Menu */}
                        {activeMenuUserId === u.id && (
                          <div className="absolute right-8 top-12 bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 w-52 z-[200] animate-in fade-in zoom-in-95 duration-150 text-left">
                            <button 
                              onClick={() => {
                                setSelectedUser(u);
                                setNewUser(u);
                                setRegionSearchTerm('');
                                setSearchTerm('');
                                setPassword('');
                                setShowUserModal(true);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-slate-400" />
                              <span>Modificar Usuario</span>
                            </button>

                            <button 
                              onClick={() => {
                                setSelectedUser(u);
                                setNewUser(u);
                                setRegionSearchTerm('');
                                setSearchTerm('');
                                setPassword('');
                                setShowUserModal(true);
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-colors"
                            >
                              <Key className="w-4 h-4 text-slate-400" />
                              <span>Restablecer clave</span>
                            </button>

                            {u.username !== 'admin' && (u.role === UserRole.SPECIALIST || currentUser.role === UserRole.ADMIN) && (
                              <div className="border-t border-slate-50 mt-1 pt-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserToDelete({ id: u.id, username: u.username });
                                    setActiveMenuUserId(null);
                                  }}
                                  className="w-full px-4 py-2.5 hover:bg-red-50 text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-2.5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                  <span>Eliminar usuario</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer controls */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
              Mostrando {currentPage * pageSize + 1} a {Math.min((currentPage + 1) * pageSize, totalItems)} de {totalItems} usuarios
            </span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mostrar</span>
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer shadow-sm focus:border-red-500 transition-all"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">por página</span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-2">{currentPage + 1} de {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages - 1}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal - User Management */}
      {showUserModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden border-2 border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black uppercase italic tracking-tighter text-xl">
                {selectedUser ? 'Configurar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Usuario</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={!!selectedUser}
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                      placeholder="Ej: andres.matiz"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                    Contraseña {selectedUser ? '(Opcional, dejar vacío para no cambiar)' : '(Obligatorio)'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                      placeholder={selectedUser ? "••••••••" : "Ingresar contraseña"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Perfil de Usuario</label>
                  {currentUser.role === UserRole.ADMIN ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[UserRole.SPECIALIST, UserRole.COORDINATOR, UserRole.GUEST, UserRole.ADMIN].map(role => (
                        <button key={role} onClick={() => setNewUser({ ...newUser, role })} className={`py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${newUser.role === role ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                          {role === UserRole.SPECIALIST ? 'Especialista' : role === UserRole.COORDINATOR ? 'Coordinador' : role === UserRole.GUEST ? 'Invitado' : 'Admin'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 px-4 rounded-xl text-xs font-black uppercase border-2 bg-slate-100 text-slate-500 border-slate-200">
                      {newUser.role === UserRole.SPECIALIST ? 'Especialista' : newUser.role}
                    </div>
                  )}
                </div>
              </div>

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

      {/* Custom Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-6 shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">¿Eliminar Usuario?</h4>
            <p className="text-xs text-slate-500 font-bold mt-2 px-2 leading-relaxed">
              ¿Estás seguro de que deseas eliminar al usuario <span className="text-slate-800 font-extrabold">@{userToDelete.username}</span>? Esta acción eliminará permanentemente tanto sus accesos como su perfil.
            </p>
            
            <div className="flex items-center gap-3 w-full mt-6">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteUser}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-red-200 disabled:opacity-50"
              >
                {isSaving ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
