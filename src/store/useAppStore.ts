import { create } from 'zustand';
import { User, UserRole, AuthState, Employee, Restaurant } from '@/types';
import { dataService } from '@/services/dataService';

interface AppState {
    // Auth
    auth: AuthState;
    handleLogin: (user: User) => Promise<void>;
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
    initData: (force?: boolean) => Promise<void>;
    loadMonthly: () => Promise<void>;
}

const computeFilteredEmployees = (employees: Employee[], restaurants: Restaurant[], user: User | null): Employee[] => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) return employees;

    const assignedRegions = new Set((user.assignedRegions || []).map(r => (r || '').trim().toUpperCase()));
    const assignedZones = new Set((user.assignedZones || []).map(z => (z || '').trim().toUpperCase()));
    const assignedStoresSet = new Set((user.assignedRestaurants || []).map(s => (s || '').trim().toUpperCase()));

    // Fix #16: Pre-construir mapas de búsqueda O(1) en lugar de .find() O(N) dentro del loop
    const restaurantById = new Map<string, Restaurant>(restaurants.map(r => [(r.id || '').trim().toUpperCase(), r]));
    const restaurantByName = new Map<string, Restaurant>(restaurants.map(r => [(r.name || '').trim().toUpperCase(), r]));

    const findRestaurant = (nameOrId: string): Restaurant | undefined => {
        const key = nameOrId.trim().toUpperCase();
        return restaurantById.get(key) || restaurantByName.get(key);
    };

    if (user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || user.role === UserRole.GUEST) {
        return employees.filter(e => {
            const currentStore = restaurantById.get((e.restaurant_id || '').trim().toUpperCase());
            if (currentStore && assignedRegions.has((currentStore.region || '').trim().toUpperCase())) return true;
            return e.history?.some(h => {
                const histStore = findRestaurant(h.restaurantName || '');
                return histStore && assignedRegions.has((histStore.region || '').trim().toUpperCase());
            });
        });
    }

    return employees.filter(e => {
        const empStoreId = (e.restaurant_id || '').trim().toUpperCase();
        const empZone = (e.zone || '').trim().toUpperCase();

        if (assignedZones.has(empZone) || assignedStoresSet.has(empStoreId)) return true;

        return e.history?.some(h => {
            const histStore = findRestaurant(h.restaurantName || '');
            return histStore && (
                assignedZones.has((histStore.zone || '').trim().toUpperCase()) ||
                assignedStoresSet.has((histStore.id || '').trim().toUpperCase())
            );
        });
    });
};

const getInitialFallbackMonth = () => {
    return new Date().toISOString().slice(0, 7);
};

let _isLoggingOut = false; // Bandera para evitar loop en onAuthStateChange

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
        await get().initData(true); // Forzar recarga completa al iniciar sesión
    },

    handleLogout: async () => {
        if (_isLoggingOut) return; // Prevenir llamadas recursivas del listener
        _isLoggingOut = true;
        try {
            const { supabase } = await import('@/services/dataService');
            await supabase.auth.signOut();
            const localforage = (await import('localforage')).default;
            // Borrar SOLO las claves de esta app, no todo el storage del dominio
            const APP_KEYS = [
                'la_akademia_employees', 'la_akademia_stores', 'la_akademia_grades',
                'la_akademia_summary', 'la_akademia_hierarchy', 'la_akademia_users', 'la_akademia_banca'
            ];
            await Promise.all(APP_KEYS.map(key => localforage.removeItem(key)));
        } catch (err) {
            console.error('[handleLogout] Error al cerrar sesión en Supabase. La sesión local fue limpiada de todas formas.', err);
        }
        set({ 
            auth: { user: null, isAuthenticated: false }, 
            filteredEmployees: [],
            employees: [],
            restaurants: []
        });
        _isLoggingOut = false;
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

    initData: async (force: boolean = false) => {
        set({ syncStatus: 'syncing' });

        // 1. Carga instantánea desde localforage (offline-first)
        await dataService.initLocalCache();
        get().refreshData();

        // 2. Sincronización con la nube (respeta TTL de 30 min salvo que sea forzado)
        const success = await dataService.loadAllFromCloud(force);

        // 3. Selección inteligente del mes basada en meses asentados
        try {
            const hierarchy = dataService.getHierarchy();
            const lockedMonths = hierarchy?.lockedMonths || [];
            
            if (lockedMonths.length > 0) {
                const sortedLocked = [...lockedMonths].sort((a, b) => b.localeCompare(a));
                const lastSettledPrefix = sortedLocked[0].substring(0, 7);
                
                const nextEvalMonth = new Date(`${lastSettledPrefix}-01T12:00:00Z`);
                nextEvalMonth.setMonth(nextEvalMonth.getMonth() + 1);
                const evalMonthPrefix = nextEvalMonth.toISOString().slice(0, 7);
                
                set({ selectedMonth: evalMonthPrefix });
            }
        } catch (err) {
            console.warn('[initData] Error al calcular mes óptimo desde meses asentados. Usando mes actual como fallback.', err);
        }

        await dataService.loadGradesSummary(get().selectedMonth);

        get().refreshData();
        set({ syncStatus: success ? 'online' : 'offline' });
    },

    loadMonthly: async () => {
        set({ syncStatus: 'syncing' });
        await dataService.loadGradesSummary(get().selectedMonth);
        get().refreshData();
        set({ syncStatus: 'online' });
    }
}));

// Fix #18: Listener global de sesión expirada de Supabase.
// Si el token JWT vence, Supabase emite SIGNED_OUT y la app hace logout limpio.
// La bandera _isLoggingOut evita el loop: el propio handleLogout dispara SIGNED_OUT,
// sin la bandera el listener volvería a llamar handleLogout indefinidamente.
// Guardamos la suscripción para poder cancelarla si fuera necesario
let _authSubscription: { unsubscribe: () => void } | null = null;
(async () => {
    const { supabase } = await import('@/services/dataService');
    const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            const store = useAppStore.getState();
            // Solo actuar si es una expiración externa (no un logout iniciado por nosotros)
            if (store.auth.isAuthenticated && !_isLoggingOut) {
                console.warn('[Auth] Sesión expirada. Cerrando sesión automáticamente.');
                store.handleLogout();
            }
        }
    });
    _authSubscription = data.subscription;
})();

export const unsubscribeAuth = () => _authSubscription?.unsubscribe();
