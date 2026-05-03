import { create } from 'zustand';
import { User, UserRole, AuthState, Employee, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';

interface AppState {
    // Auth
    auth: AuthState;
    handleLogin: (user: User) => void;
    handleLogout: () => void;

    // Data
    employees: Employee[];
    restaurants: Restaurant[];
    filteredEmployees: Employee[];

    // UI & Sync
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    syncStatus: 'syncing' | 'online' | 'offline';
    setSyncStatus: (status: 'syncing' | 'online' | 'offline') => void;

    // Actions
    refreshData: () => void;
    initData: () => Promise<void>;
    loadMonthly: () => Promise<void>;
}

const computeFilteredEmployees = (employees: Employee[], restaurants: Restaurant[], user: User | null): Employee[] => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) return employees;

    const assignedRegions = new Set((user.assignedRegions || []).map(r => (r || '').trim().toUpperCase()));
    const assignedZones = new Set((user.assignedZones || []).map(z => (z || '').trim().toUpperCase()));
    const assignedStoresSet = new Set((user.assignedRestaurants || []).map(s => (s || '').trim().toUpperCase()));

    if (user.role === UserRole.COORDINATOR) {
        const restaurantMap = new Map<string, Restaurant>(restaurants.map(r => [(r.id || '').trim().toUpperCase(), r]));
        return employees.filter(e => {
            const currentStore = restaurantMap.get((e.restaurant_id || '').trim().toUpperCase());
            if (currentStore && assignedRegions.has((currentStore.region || '').trim().toUpperCase())) return true;
            return e.history?.some(h => {
                const histStoreName = (h.restaurantName || '').trim().toUpperCase();
                const histStore = restaurants.find(r =>
                    (r.id || '').trim().toUpperCase() === histStoreName ||
                    (r.name || '').trim().toUpperCase() === histStoreName
                );
                return histStore && assignedRegions.has((histStore.region || '').trim().toUpperCase());
            });
        });
    }

    return employees.filter(e => {
        const empStoreId = (e.restaurant_id || '').trim().toUpperCase();
        const empZone = (e.zone || '').trim().toUpperCase();

        if (assignedZones.has(empZone) || assignedStoresSet.has(empStoreId)) return true;

        return e.history?.some(h => {
            const histStoreName = (h.restaurantName || '').trim().toUpperCase();
            const histStore = restaurants.find(r =>
                r.id.trim().toUpperCase() === histStoreName ||
                r.name.trim().toUpperCase() === histStoreName
            );
            return histStore && (assignedZones.has((histStore.zone || '').trim().toUpperCase()) || assignedStoresSet.has(histStore.id.trim().toUpperCase()));
        });
    });
};

const getInitialFallbackMonth = () => {
    return new Date().toISOString().slice(0, 7);
};

export const useAppStore = create<AppState>((set, get) => ({
    auth: { user: null, isAuthenticated: false },
    employees: [],
    restaurants: [],
    filteredEmployees: [],
    selectedMonth: getInitialFallbackMonth(),
    isSidebarOpen: false,
    syncStatus: 'syncing',

    handleLogin: async (user) => {
        set({ auth: { user, isAuthenticated: true } });
        await get().initData();
    },

    handleLogout: async () => {
        try {
            const { supabase } = await import('@/services/dataService');
            await supabase.auth.signOut();
            const localforage = (await import('localforage')).default;
            await localforage.clear();
        } catch {}
        set({ 
            auth: { user: null, isAuthenticated: false }, 
            filteredEmployees: [],
            employees: [],
            restaurants: []
        });
    },

    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setSyncStatus: (status) => set({ syncStatus: status }),

    refreshData: () => {
        const emps = dataService.getEmployees();
        const rests = dataService.getRestaurants();
        const filtered = computeFilteredEmployees(emps, rests, get().auth.user);
        set({ employees: emps, restaurants: rests, filteredEmployees: filtered });
    },

    initData: async () => {
        set({ syncStatus: 'syncing' });

        // 1. Instant offline-first load using localforage
        await dataService.initLocalCache();
        get().refreshData();

        // 2. Background sync with cloud
        const success = await dataService.loadAllFromCloud();

        // 3. Smart month selection based on hierarchy lockedMonths
        try {
            const hierarchy = dataService.getHierarchy();
            const lockedMonths = hierarchy?.lockedMonths || [];
            
            if (lockedMonths.length > 0) {
                // Find the latest locked month
                const sortedLocked = [...lockedMonths].sort((a, b) => b.localeCompare(a));
                const lastSettledPrefix = sortedLocked[0].substring(0, 7);
                
                // Si el último asentado es Marzo, queremos que la app abra en Abril.
                const nextEvalMonth = new Date(`${lastSettledPrefix}-01T12:00:00Z`);
                nextEvalMonth.setMonth(nextEvalMonth.getMonth() + 1);
                const evalMonthPrefix = nextEvalMonth.toISOString().slice(0, 7);
                
                set({ selectedMonth: evalMonthPrefix });
            }
        } catch {}

        await dataService.loadGradesSummary(get().selectedMonth);

        get().refreshData(); // Final render with fresh data
        set({ syncStatus: success ? 'online' : 'offline' });
    },

    loadMonthly: async () => {
        set({ syncStatus: 'syncing' });
        await dataService.loadGradesSummary(get().selectedMonth);
        get().refreshData();
        set({ syncStatus: 'online' });
    }
}));
