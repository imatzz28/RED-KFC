
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, AuthState, Employee, Restaurant } from './types';
import { dataService } from './dataService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import MyStores from './components/MyStores';
import EntriesExitsReport from './components/EntriesExitsReport';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-stores' | 'admin' | 'entries-exits'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'online' | 'offline'>('syncing');

  const refreshData = useCallback(() => {
    setEmployees(dataService.getEmployees());
    setRestaurants(dataService.getRestaurants());
  }, []);

  const initData = useCallback(async () => {
    setSyncStatus('syncing');
    const success = await dataService.loadAllFromCloud();
    // Cargamos los resúmenes (Big Data Ready)
    await dataService.loadGradesSummary(selectedMonth);
    refreshData();
    setSyncStatus(success ? 'online' : 'offline');
  }, [refreshData, selectedMonth]);

  useEffect(() => {
    const load = async () => {
      await initData();
    };
    void load();
    const interval = setInterval(() => {
      void initData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [initData]);

  // Nuevo: Cargar notas automáticamente al cambiar el mes para soportar millones de registros
  useEffect(() => {
    const loadMonthly = async () => {
      setSyncStatus('syncing');
      await dataService.loadGradesSummary(selectedMonth);
      refreshData();
      setSyncStatus('online');
    };
    if (auth.isAuthenticated) {
      void loadMonthly();
    }
  }, [selectedMonth, auth.isAuthenticated, refreshData]);

  const handleLogin = (user: User) => {
    setAuth({ user, isAuthenticated: true });
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  const filteredEmployees = useMemo(() => {
    if (!auth.user) return [];
    if (auth.user.role === UserRole.ADMIN) return employees;

    // Convertir arreglos a Sets para búsquedas O(1)
    const assignedRegions = new Set(auth.user.assignedRegions || []);
    const assignedZones = new Set(auth.user.assignedZones || []);
    const assignedStoresSet = new Set(auth.user.assignedRestaurants || []);

    // Si es Coordinador, incluimos empleados cuya tienda actual O histórico de tiendas esté en sus regiones asignadas
    if (auth.user.role === UserRole.COORDINATOR) {
      const restaurantMap = new Map<string, Restaurant>(restaurants.map(r => [r.id, r]));
      return employees.filter(e => {
        // En alcance si su tienda actual está en la región
        const currentStore = restaurantMap.get(e.restaurant_id);
        if (currentStore && assignedRegions.has(currentStore.region)) return true;

        // O si alguna vez estuvo en una tienda de la región (historial)
        return e.history?.some(h => {
          const histStore = restaurants.find(r => r.id === h.restaurantName || r.name === h.restaurantName);
          return histStore && assignedRegions.has(histStore.region);
        });
      });
    }

    // Para Especialistas o Gerentes, revisamos zonas/tiendas asignadas
    return employees.filter(e => {
      if (assignedZones.has(e.zone) || assignedStoresSet.has(e.restaurant_id)) return true;

      return e.history?.some(h => {
        const histStore = restaurants.find(r => r.id === h.restaurantName || r.name === h.restaurantName);
        return histStore && (assignedZones.has(histStore.zone) || assignedStoresSet.has(histStore.id));
      });
    });
  }, [employees, restaurants, auth.user]);

  if (!auth.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <div className={`fixed bottom-6 left-6 z-[200] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all duration-500 border-2 ${syncStatus === 'syncing' ? 'bg-slate-900 border-red-500 text-white animate-pulse' :
        syncStatus === 'online' ? 'bg-white border-emerald-500 text-emerald-600' :
          'bg-white border-red-500 text-red-600'
        }`}>
        {syncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
          syncStatus === 'online' ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'online' ? 'Nube Conectada' : 'Modo Offline'}
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab as 'dashboard' | 'my-stores' | 'admin' | 'entries-exits'); setIsSidebarOpen(false); }}
        role={auth.user!.role}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          user={auth.user!}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {activeTab === 'dashboard' && <Dashboard employees={filteredEmployees} restaurants={restaurants} selectedMonth={selectedMonth} user={auth.user!} />}
          {activeTab === 'my-stores' && <MyStores user={auth.user!} restaurants={restaurants} employees={employees} selectedMonth={selectedMonth} onUpdate={refreshData} />}
          {activeTab === 'entries-exits' && (auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COORDINATOR) && <EntriesExitsReport employees={filteredEmployees} restaurants={restaurants} />}
          {activeTab === 'admin' && (auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COORDINATOR) && <AdminPanel currentUser={auth.user!} onEmployeesImported={refreshData} />}
        </main>
      </div>
    </div>
  );
};

export default App;
