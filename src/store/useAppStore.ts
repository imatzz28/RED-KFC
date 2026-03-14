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

    const assignedRegions = new Set((user.assignedRegions || []).map(r => r.trim().toUpperCase()));
    const assignedZones = new Set((user.assignedZones || []).map(z => z.trim().toUpperCase()));
    const assignedStoresSet = new Set((user.assignedRestaurants || []).map(s => s.trim().toUpperCase()));

    if (user.role === UserRole.COORDINATOR) {
        const restaurantMap = new Map<string, Restaurant>(restaurants.map(r => [r.id.trim().toUpperCase(), r]));
        return employees.filter(e => {
            const currentStore = restaurantMap.get(e.restaurant_id.trim().toUpperCase());
            if (currentStore && assignedRegions.has((currentStore.region || '').trim().toUpperCase())) return true;
            return e.history?.some(h => {
                const histStoreName = (h.restaurantName || '').trim().toUpperCase();
                const histStore = restaurants.find(r =>
                    r.id.trim().toUpperCase() === histStoreName ||
                    r.name.trim().toUpperCase() === histStoreName
                );
                return histStore && assignedRegions.has((histStore.region || '').trim().toUpperCase());
            });
        });
    }

    return employees.filter(e => {
        const empStoreId = e.restaurant_id.trim().toUpperCase();
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

export const useAppStore = create<AppState>((set, get) => ({
    auth: { user: null, isAuthenticated: false },
    employees: [],
    restaurants: [],
    filteredEmployees: [],
    selectedMonth: new Date().toISOString().slice(0, 7),
    isSidebarOpen: false,
    syncStatus: 'syncing',

    handleLogin: (user) => {
        set({ auth: { user, isAuthenticated: true } });
        get().refreshData();
    },

    handleLogout: () => {
        set({ auth: { user: null, isAuthenticated: false }, filteredEmployees: [] });
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
