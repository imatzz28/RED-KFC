
import { Employee, GradeEntry, User, UserRole, JobTitle, Restaurant, HierarchyData, BancaData, SafeHandsPerson, SafeHandsCert, SafeHandsSettings, DailySchedule } from '@/types';
import * as XLSX from 'xlsx';
import localforage from 'localforage';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: Las variables de entorno de Supabase no están configuradas. Verifica tu archivo .env o la configuración de tu hosting.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getAuthHeaders = async (isUpsert: boolean = false) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || SUPABASE_KEY;
  
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': isUpsert ? 'return=representation,resolution=merge-duplicates' : 'return=representation'
  };
};


const parseExcelDate = (serial: number | string) => {
  if (!serial) return '';
  if (typeof serial === 'string') return serial;
  try {
    const date = XLSX.SSF.parse_date_code(serial);
    const month = String(date.m).padStart(2, '0');
    const day = String(date.d).padStart(2, '0');
    return `${date.y}-${month}-${day}`;
  } catch { // No need to use the error variable
    return String(serial);
  }
};

export const dataService = {
  supabaseFetch: async (table: string, method: string = 'GET', body?: unknown, queryParams: string = '') => {
    const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}`;
    const isUpsert = queryParams.includes('on_conflict');

    const headers = await getAuthHeaders(isUpsert);
    const options: RequestInit = {
      method,
      headers
    };

    if (body) options.body = JSON.stringify(body, (k, v) => v === undefined ? null : v);

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error detallado de Supabase en tabla [${table}]:`, errorText);
        throw new Error(`Supabase Error [${table}]: ${errorText}`);
      }

      if (res.status === 204) return true;
      const text = await res.text();
      return text ? JSON.parse(text) : true;
    } catch (err) {
      console.error("Fallo de red o servidor al conectar con Supabase:", err);
      throw err;
    }
  },

  supabaseFetchAll: async (table: string, queryParams: string = ''): Promise<unknown[]> => {
    // 1. Obtener el conteo total con los filtros aplicados
    const countUrl = `${SUPABASE_URL}/rest/v1/${table}${queryParams}`;
    const headers = await getAuthHeaders();

    const countRes = await fetch(countUrl, {
      method: 'HEAD',
      headers: { ...headers, 'Prefer': 'count=exact' }
    });

    if (!countRes.ok) {
       console.error(`Error al hacer COUNT en ${table}: status ${countRes.status}`);
    }

    const contentRange = countRes.headers.get('content-range');
    let total = 0;
    if (contentRange) {
      total = parseInt(contentRange.split('/')[1]);
    }

    const step = 1000;
    const separator = queryParams ? (queryParams.startsWith('?') ? '&' : '?') : '?';
    
    if (total <= step) {
      const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&limit=${step}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`FetchAll Error en ${table}: ${await res.text()}`);
      }
      return await res.json();
    }

    // 2. Construir URLs de cada chunk
    const numChunks = Math.ceil(total / step);
    const urls: string[] = [];
    for (let i = 0; i < numChunks; i++) {
      const from = i * step;
      urls.push(`${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&offset=${from}&limit=${step}`);
    }

    // 3. Pool de concurrencia: máximo 5 chunks en paralelo para evitar rate limit (429)
    const CONCURRENCY = 5;
    const allResults: unknown[][] = [];
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY).map(url =>
        fetch(url, { headers })
          .then(async r => {
            if (!r.ok) {
              const txt = await r.text();
              throw new Error(`Error en chunk de [${table}]: ${txt}`);
            }
            return r.json() as Promise<unknown[]>;
          })
      );
      const batchResults = await Promise.all(batch);
      allResults.push(...batchResults);
    }

    return allResults.flat();
  },

  supabaseFetchPaginated: async (table: string, queryParams: string = '', page: number = 0, limit: number = 50): Promise<{ data: any[], total: number }> => {
    const separator = queryParams ? (queryParams.startsWith('?') ? '&' : '?') : '?';

    // Primero obtenemos el total (count=exact) y la data juntos
    const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&offset=${page * limit}&limit=${limit}`;

    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error fetching paginated [${table}]: ${txt}`);
    }

    const countRange = res.headers.get('content-range');
    let total = 0;
    if (countRange) {
      total = parseInt(countRange.split('/')[1]);
    }

    const data = await res.json();
    return { data, total };
  },

  supabaseFetchRPC: async (rpcName: string, body: any): Promise<any> => {
    const url = `${SUPABASE_URL}/rest/v1/rpc/${rpcName}`;
    const headers = await getAuthHeaders();
    const options: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error detallado de Supabase en RPC [${rpcName}]:`, errorText);
        throw new Error(`Supabase RPC Error [${rpcName}]: ${errorText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`Fallo de red o servidor al conectar con Supabase RPC ${rpcName}:`, err);
      throw err;
    }
  },

  // Caché en memoria para evitar parsing repetitivo del localStorage
  _cache: {
    employees: null as Employee[] | null,
    restaurants: null as Restaurant[] | null,
    // Mapa keyed: 'storeId::month' -> GradeEntry[]
    gradesByKey: new Map<string, GradeEntry[]>() as Map<string, GradeEntry[]>,
    grades: null as GradeEntry[] | null, // backup fallback (notas guardadas localmente)
    gradeIndex: null as Map<string, GradeEntry[]> | null,
    activeStoreKey: null as string | null,
    summary: null as any[] | null,
    hierarchy: null as HierarchyData | null,
    users: null as User[] | null,
    banca: null as BancaData | null,
    // TTL: momento en que se cargó el último datos maestros desde la nube
    lastCloudSync: null as number | null,
  },

  // Verifica si el caché de datos maestros tiene más de 30 minutos
  isCacheStale: (): boolean => {
    const TTL_MS = 30 * 60 * 1000; // 30 minutos
    if (!dataService._cache.lastCloudSync) return true;
    return (Date.now() - dataService._cache.lastCloudSync) > TTL_MS;
  },

  initLocalCache: async () => {
    try {
      dataService._cache.employees = (await localforage.getItem<Employee[]>('la_akademia_employees')) || [];
      dataService._cache.restaurants = (await localforage.getItem<Restaurant[]>('la_akademia_stores')) || [];
      dataService._cache.grades = (await localforage.getItem<GradeEntry[]>('la_akademia_grades')) || [];
      dataService._cache.summary = (await localforage.getItem<any[]>('la_akademia_summary')) || [];
      dataService._cache.hierarchy = (await localforage.getItem<HierarchyData>('la_akademia_hierarchy')) || { lockedMonths: [], regions: [] };
      dataService._cache.users = (await localforage.getItem<User[]>('la_akademia_users')) || [];
      dataService._cache.banca = (await localforage.getItem<BancaData>('la_akademia_banca')) || { assignments: [] };
      dataService._cache.gradeIndex = null;
    } catch (e) {
      console.error("Error inicializando caché localforage:", e);
    }
  },

  loadAllFromCloud: async (force: boolean = false) => {
    // Si el caché es válido y no se fuerza la recarga, omitir la descarga
    if (!force && !dataService.isCacheStale()) {
      console.log('[Cache] Datos maestros en caché válido. Omitiendo descarga.');
      return true;
    }
    try {
      const [employees, restaurants, hierarchy, users, banca] = await Promise.all([
        dataService.supabaseFetchAll('employees'),
        dataService.supabaseFetchAll('restaurants'),
        dataService.supabaseFetch('hierarchy').catch(() => []),
        dataService.supabaseFetchAll('users').catch(() => []),
        dataService.supabaseFetch('banca').catch(() => [])
      ]);

      await Promise.all([
        localforage.setItem('la_akademia_employees', employees || []),
        localforage.setItem('la_akademia_stores', restaurants || []),
        localforage.setItem('la_akademia_users', users || [])
      ]);

      const defaultHierarchy = { lockedMonths: [], regions: [] };
      const cloudHierarchy = (hierarchy && (hierarchy as any)[0]?.data) ? (hierarchy as any)[0].data : defaultHierarchy;
      await localforage.setItem('la_akademia_hierarchy', cloudHierarchy);

      const defaultBanca: BancaData = { assignments: [] };
      const cloudBanca: BancaData = (banca && (banca as any)[0]?.data) ? (banca as any)[0].data : defaultBanca;
      await localforage.setItem('la_akademia_banca', cloudBanca);

      dataService._cache.employees = (employees as Employee[]) || [];
      dataService._cache.restaurants = (restaurants as Restaurant[]) || [];
      dataService._cache.users = (users as User[]) || [];
      dataService._cache.hierarchy = cloudHierarchy;
      dataService._cache.banca = cloudBanca;
      dataService._cache.gradeIndex = null;
      dataService._cache.lastCloudSync = Date.now(); // Registrar el momento de sincronización

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getLastSettledMonth: async (): Promise<string | null> => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/employee_monthly_summary?select=month&order=month.desc&limit=1`, {
        method: 'GET',
        headers
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0].month : null;
    } catch {
      return null;
    }
  },

  loadGradesSummary: async (month: string) => {
    try {
      const monthDate = `${month}-01`;
      // Consultamos la vista de resúmenes usando 'lte' para permitir herencia en el Dashboard
      // Ordenamos por mes descendente para capturar la nota más reciente primero
      const allSummaries = (await dataService.supabaseFetchAll('employee_monthly_summary',
        `?month=lte.${monthDate}&order=month.desc`)) as any[];

      // Filtramos para quedarnos con el resumen más reciente de cada empleado
      const latestMap = new Map<string, any>();
      allSummaries.forEach(s => {
        const empId = String(s.employee_id).trim();
        if (!latestMap.has(empId)) {
          latestMap.set(empId, s);
        }
      });

      const summary = Array.from(latestMap.values());
      await localforage.setItem('la_akademia_summary', summary);
      dataService._cache.summary = summary;

      // IMPORTANTE: NO limpiamos _cache.grades por completo aquí para permitir la herencia
      // Solo invalidamos el índice para que se reconstruya con los nuevos datos si los hay
      dataService._cache.gradeIndex = null;
      return summary;
    } catch (e) {
      console.error("Error al cargar resúmenes:", e);
      return [];
    }
  },

  loadGradesForStore: async (storeId: string, month: string) => {
    const monthDate = `${month}-01`;
    console.log(`[Grades] Cargando notas robustas para tienda: ${storeId}, mes: ${month}`);

    // Utilidad de reintento con backoff exponencial
    const fetchWithRetry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (err) {
          if (i === retries - 1) throw err;
          const delay = 300 * Math.pow(2, i); // 300ms, 600ms, 1200ms
          console.warn(`[Grades] Reintento ${i + 1}/${retries} en ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    };

    try {
      // 1. Obtener empleados de esta tienda (activos e inactivos para cubrir traslados)
      const storeEmployees = (dataService._cache.employees || []).filter(
        e => e.restaurant_id && e.restaurant_id.trim().toUpperCase() === storeId.trim().toUpperCase()
      );
      const employeeIds = storeEmployees.map(e => String(e.id).trim());

      // 2. Calcular el rango de fechas: 24 meses hacia atrás desde el mes solicitado
      //    Cubre toda la herencia posible sin descargar el historial completo de la tienda
      const rangeStart = new Date(`${month}-01T12:00:00Z`);
      rangeStart.setMonth(rangeStart.getMonth() - 24);
      const rangeStartStr = rangeStart.toISOString().slice(0, 7) + '-01';

      // 3. Fetch A: Por restaurant_id con filtro de rango de mes
      const fetchByStore = () => dataService.supabaseFetchAll(
        'grades',
        `?restaurant_id=eq.${storeId.trim()}&month=gte.${rangeStartStr}&month=lte.${monthDate}`
      );

      // 4. Fetch B: Por employee IDs en chunks con el mismo rango de mes
      const fetchByEmployees = async () => {
        if (employeeIds.length === 0) return [];
        const chunkSize = 40;
        const requests = [];
        for (let i = 0; i < employeeIds.length; i += chunkSize) {
          const chunk = employeeIds.slice(i, i + chunkSize);
          const inFilter = `(${chunk.join(',')})`;
          requests.push(
            dataService.supabaseFetchAll('grades', `?employee_id=in.${inFilter}&month=gte.${rangeStartStr}&month=lte.${monthDate}`)
              .catch(err => {
                console.error(`Error en chunk de empleados:`, err);
                return [];
              })
          );
        }
        const results = await Promise.all(requests);
        return results.flat();
      };

      // 4. Ejecutar ambos fetches de manera segura y loguear
      let byStore: any[] = [];
      let byEmployee: any[] = [];
      try {
        byStore = await fetchWithRetry(fetchByStore);
      } catch (err: any) {
        console.error(`[Grades] byStore fetch error:`, err);
      }

      try {
        byEmployee = await fetchWithRetry(fetchByEmployees);
      } catch (err: any) {
        console.error(`[Grades] byEmployee fetch error:`, err);
      }

      // 5. Deduplicar resultados: usar clave employee_id+month+group+category
      const dedupeMap = new Map<string, any>();
      const mergeRaw = [...(byStore || []), ...(byEmployee || [])];
      mergeRaw.forEach((g: any) => {
        const key = `${g.employee_id}|${g.month}|${g.group}|${g.category}`;
        dedupeMap.set(key, g);
      });

      const grades: GradeEntry[] = Array.from(dedupeMap.values()).map((g: any) => ({
        employeeId: String(g.employee_id).trim(),
        restaurantId: String(g.restaurant_id || storeId).trim(),
        month: g.month,
        group: g.group,
        category: g.category,
        score: g.score
      }));
      
      console.log(`[Grades] store: ${storeId}, month: ${monthDate}, fetched: ${grades.length} grades.`);

      // 6. Guardar en caché keyed por tienda+mes (totalmente aislado)
      const cacheKey = `${storeId.trim().toUpperCase()}::${month}`;
      dataService._cache.gradesByKey.set(cacheKey, grades);
      dataService._cache.activeStoreKey = cacheKey;
      dataService._cache.gradeIndex = null; // Invalidar índice para que se reconstruya
      console.log(`[Grades] ${grades.length} notas (únicas: ${dedupeMap.size}) guardadas en clave: ${cacheKey}`);
      return grades;
    } catch (e: any) {
      console.error('[Grades] Error crítico en carga de tienda:', e);
      // Retornar el bucket existente si ya había algo cargado
      const cacheKey = `${storeId.trim().toUpperCase()}::${month}`;
      return dataService._cache.gradesByKey.get(cacheKey) || [];
    }
  },

  getEmployees: (): Employee[] => {
    return dataService._cache.employees || [];
  },

  getRestaurants: (): Restaurant[] => {
    return dataService._cache.restaurants || [];
  },

  getGrades: (): GradeEntry[] => {
    // Retorna las notas activas del key actual (tienda+mes) si existen, o el fallback de notas locales
    const key = dataService._cache.activeStoreKey;
    if (key && dataService._cache.gradesByKey.has(key)) {
      return dataService._cache.gradesByKey.get(key)!;
    }
    return dataService._cache.grades || [];
  },

  getGradesSummary: (): any[] => {
    return dataService._cache.summary || [];
  },

  // Nuevo: Indexador de notas para búsqueda O(1)
  getGradeIndex: (): Map<string, GradeEntry[]> => {
    if (dataService._cache.gradeIndex) return dataService._cache.gradeIndex;
    const grades = dataService.getGrades();
    const index = new Map<string, GradeEntry[]>();
    grades.forEach(g => {
      if (!index.has(g.employeeId)) index.set(g.employeeId, []);
      index.get(g.employeeId)!.push(g);
    });
    dataService._cache.gradeIndex = index;
    return index;
  },

  getEffectiveGrades: (employeeId: string, upToMonth: string, storeId?: string): GradeEntry[] => {
    const gradeIndex = dataService.getGradeIndex();
    const empGradesRaw = gradeIndex.get(String(employeeId).trim()) || [];

    const empGrades = empGradesRaw.filter(g => {
      const gradeMonth = g.month ? g.month.substring(0, 7) : '';
      if (gradeMonth > upToMonth) return false;

      if (storeId && g.restaurantId && g.restaurantId.trim().toUpperCase() !== storeId.trim().toUpperCase()) return false;

      if ((g.group === 'D' || g.group === 'F') && gradeMonth !== upToMonth) return false;

      return true;
    });

    const latestMap = new Map<string, GradeEntry>();
    const sorted = [...empGrades].sort((a, b) => (a.month || '').localeCompare(b.month || ''));
    sorted.forEach(g => {
      latestMap.set(`${g.group}-${g.category}`, g);
    });

    return Array.from(latestMap.values());
  },

  // ── Dashboard RPC Methods ────────────────────────────────────────────────

  /**
   * Llama al RPC get_dashboard_stats en Supabase.
   * Devuelve estadísticas agregadas (promedio ponderado) por grupo para el mes y scope indicados.
   * Se usa en el Dashboard para vistas de Zona / Región / Nacional.
   */
  getDashboardStats: async (
    month: string,
    storeIds?: string[]
  ): Promise<any[]> => {
    try {
      // Si el usuario provee un arreglo vacío (no tiene tiendas permitidas), 
      // retornamos 0s en lugar de enviar NULL a la BD (que devolvería nivel Nacional).
      if (storeIds && storeIds.length === 0) {
        return [];
      }

      const result = await dataService.supabaseFetchRPC('get_dashboard_stats', {
        p_month:     month,
        p_store_ids: storeIds || null
      });
      return Array.isArray(result) ? result : [];
    } catch (e) {
      console.error('[getDashboardStats] Error llamando RPC:', e);
      return [];
    }
  },

  /**
   * Calcula y persiste las estadísticas por grupo para el mes indicado.
   * Se llama al "Asentar Notas" en SettlementManager.
   */
  settleMonthlyGroupStats: async (month: string): Promise<void> => {
    try {
      await dataService.supabaseFetchRPC('settle_monthly_group_stats', { p_month: month });
      console.log(`[settleMonthlyGroupStats] Stats calculadas para ${month}`);
    } catch (e) {
      console.error('[settleMonthlyGroupStats] Error:', e);
    }
  },

  /**
   * Rellena monthly_group_stats para todos los meses históricos en grades.
   * Solo se ejecuta una vez desde el Admin Panel.
   */
  backfillMonthlyGroupStats: async (): Promise<string> => {
    try {
      const result = await dataService.supabaseFetchRPC('backfill_monthly_group_stats', {});
      return typeof result === 'string' ? result : 'Backfill completado.';
    } catch (e: any) {
      console.error('[backfillMonthlyGroupStats] Error:', e);
      throw e;
    }
  },

  getHierarchy: (): HierarchyData => dataService._cache.hierarchy || { lockedMonths: [], regions: [] },
  getBancaData: (): BancaData => dataService._cache.banca || { assignments: [] },
  getUsers: (): User[] => {
    return dataService._cache.users || [];
  },

  saveBancaData: async (banca: BancaData) => {
    await localforage.setItem('la_akademia_banca', banca);
    dataService._cache.banca = banca;
    await dataService.supabaseFetch('banca', 'POST', { id: 1, data: banca }, '?on_conflict=id');
  },

  saveEmployees: async (employees: Employee[]) => {
    await localforage.setItem('la_akademia_employees', employees);
    dataService._cache.employees = employees;
    // Normalizar para evitar error PGRST102 (llaves faltantes en objetos del array)
    const normalized = employees.map(e => ({
      id: e.id,
      name: e.name,
      join_date: e.join_date,
      exit_date: e.exit_date || null,
      title: e.title,
      restaurant_id: e.restaurant_id,
      zone: e.zone,
      active: e.active,
      history: e.history || []
    }));
    const chunkSize = 100;
    for (let i = 0; i < normalized.length; i += chunkSize) {
      await dataService.supabaseFetch('employees', 'POST', normalized.slice(i, i + chunkSize), '?on_conflict=id');
    }
  },

  saveRestaurants: async (restaurants: Restaurant[]) => {
    await localforage.setItem('la_akademia_stores', restaurants);
    dataService._cache.restaurants = restaurants;
    await dataService.supabaseFetch('restaurants', 'POST', restaurants, '?on_conflict=id');
  },

  // Added saveUsers method to persist user data in Supabase with normalization to avoid PGRST102 error
  saveUsers: async (users: User[]) => {
    await localforage.setItem('la_akademia_users', users);
    dataService._cache.users = users;

    const normalized = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      assignedZones: u.assignedZones || [],
      assignedRestaurants: u.assignedRestaurants || [],
      assignedRegions: u.assignedRegions || [],
      allowedModules: u.allowedModules || [],
      guestCanEdit: u.guestCanEdit ?? false
    }));

    await dataService.supabaseFetch('users', 'POST', normalized, '?on_conflict=id');
  },

  clearAllDataInCloud: async () => {
    // IMPORTANTE: Primero borrar notas (hijas) y luego empleados (padres) por integridad referencial
    await dataService.supabaseFetch('grades', 'DELETE', null, '?employee_id=not.is.null');
    await dataService.supabaseFetch('employees', 'DELETE', null, '?id=not.is.null');
    await localforage.setItem('la_akademia_employees', []);
    await localforage.setItem('la_akademia_grades', []);
    dataService._cache.employees = [];
    dataService._cache.grades = [];
  },

  saveEmployeeGrades: async (employeeId: string, month: string, grades: GradeEntry[]) => {
    const employees = dataService.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    const currentCeco = emp?.restaurant_id || 'SIN_CECO';

    const monthDate = `${month}-01`;

    // Guardamos el estado actual del cache ANTES de modificar (para rollback)
    const previousGrades = dataService.getGrades();

    try {
      // 1. DELETE en Supabase
      const deleteUrl = `${SUPABASE_URL}/rest/v1/grades?employee_id=eq.${employeeId}&month=eq.${monthDate}`;
      const deleteHeaders = await getAuthHeaders();
      const deleteRes = await fetch(deleteUrl, { method: 'DELETE', headers: deleteHeaders });
      if (!deleteRes.ok) throw new Error(`Error al borrar notas previas: ${await deleteRes.text()}`);

      // 2. POST en Supabase (solo si hay notas que guardar)
      if (grades.length > 0) {
        const payload = grades.map(g => ({
          employee_id: g.employeeId,
          restaurant_id: currentCeco,
          month: monthDate,
          group: g.group,
          category: g.category,
          score: g.score
        }));
        await dataService.supabaseFetch('grades', 'POST', payload);
      }

      // 3. Solo actualizamos el cache LOCAL si la BD tuvo éxito
      const allGrades = previousGrades.filter(g => !(g.employeeId === employeeId && g.month && g.month.startsWith(month)));
      const gradesWithContext = grades.map(g => ({ ...g, month: monthDate, restaurantId: currentCeco }));
      const updated = [...allGrades, ...gradesWithContext];

      // Actualizar caché global y persistencia local
      await localforage.setItem('la_akademia_grades', updated);
      dataService._cache.grades = updated;

      // Sincronizar también el bucket específico de la tienda si existe
      const cacheKey = `${currentCeco.trim().toUpperCase()}::${month}`;
      if (dataService._cache.gradesByKey.has(cacheKey)) {
        const storeGrades = dataService._cache.gradesByKey.get(cacheKey)!;
        const filteredStore = storeGrades.filter(g => !(g.employeeId === employeeId && g.month && g.month.startsWith(month)));
        dataService._cache.gradesByKey.set(cacheKey, [...filteredStore, ...gradesWithContext]);
      }

      dataService._cache.gradeIndex = null;

    } catch (err) {
      // Rollback: el cache local NO se modifica. Los datos en BD son el estado de verdad.
      console.error('[saveEmployeeGrades] Error guardando notas. Cache no fue modificado.', err);
      throw err; // Re-lanzamos para que el componente muestre el error al usuario
    }
  },

  saveHierarchy: async (hierarchy: HierarchyData) => {
    await localforage.setItem('la_akademia_hierarchy', hierarchy);
    dataService._cache.hierarchy = hierarchy;
    await dataService.supabaseFetch('hierarchy', 'POST', { id: 1, data: hierarchy }, '?on_conflict=id');
  },

  deleteUser: async (userId: string) => {
    const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
    const headers = await getAuthHeaders();
    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('No se pudo eliminar el usuario');
    const current = dataService.getUsers().filter(u => u.id !== userId);
    await localforage.setItem('la_akademia_users', current);
    dataService._cache.users = current;
  },

  importHierarchyExcel: async (rawData: Record<string, unknown>[]) => {
    const restaurants: Restaurant[] = [];
    const regionMap = new Map<string, Map<string, Set<string>>>();

    rawData.forEach(item => {
      const id = String(item.Nombre_Ceco || item.nombre_ceco || item.Ceco || item.ceco || item.CECO || '').trim().toUpperCase();
      const name = String(item.Nombre || item.nombre || item.Nombre_Ceco || item.nombre_ceco || '').trim().toUpperCase();
      const zone = String(item.Zona || item.zona || item.ZONA || item["Jefe de area"] || 'Sin Zona').trim();
      const region = String(item.Regional || item.regional || item.Region || item.REGION || 'Sin Region').trim();

      if (!id || id === 'SIN_CECO') return;
      restaurants.push({ id, name, zone, region });

      if (!regionMap.has(region)) regionMap.set(region, new Map());
      const zonesInRegion = regionMap.get(region)!;
      if (!zonesInRegion.has(zone)) zonesInRegion.set(zone, new Set());
      zonesInRegion.get(zone)!.add(id);
    });

    await dataService.saveRestaurants(restaurants);
    const currentHierarchy = dataService.getHierarchy();
    const hierarchy: HierarchyData = {
      lockedMonths: currentHierarchy.lockedMonths || [],
      groupDConfig: currentHierarchy.groupDConfig || {},
      regions: Array.from(regionMap.entries()).map(([regionName, zonesMap]) => ({
        name: regionName,
        zones: Array.from(zonesMap.entries()).map(([zoneName, storeIds]) => ({
          name: zoneName,
          restaurantIds: Array.from(storeIds)
        }))
      }))
    };
    await dataService.saveHierarchy(hierarchy);
    return restaurants.length;
  },

  importMonthlyExcel: async (rawData: Record<string, unknown>[]) => {
    // Fix #15: Usar el caché en memoria existente (cargado en el login).
    // No hacer loadAllFromCloud() en cada importación: eso descargaba TODOS los empleados
    // innecesariamente cuando ya los teníamos frescos desde el inicio de sesión.
    const currentEmployees = dataService.getEmployees();
    const currentStores = dataService.getRestaurants();
    const today = new Date().toISOString().split('T')[0];

    const importedIds = new Set();
    const filteredRawData = rawData.filter(item => {
      const storeId = String((item.Nombre_Ceco as string) || (item.nombre_ceco as string) || '').trim().toUpperCase();
      return storeId !== '' && !storeId.startsWith('H');
    });

    const importedEmployees = filteredRawData.map(item => {
      const storeId = String((item.Nombre_Ceco as string) || (item.nombre_ceco as string) || 'SIN_CECO').trim().toUpperCase();
      const docId = String((item.Documento as string) || (item.documento as string) || (item.id as string) || (item.ID as string) || '').trim();
      if (!docId) return null;
      importedIds.add(docId);

      const existing = currentEmployees.find(e => e.id === docId);

      const rawFechaFin = item["Fecha fin"] || item.fecha_fin || item["Fecha retiro"] || item.fecha_retiro || item.FECHA_FIN;
      const parsedFechaFin = rawFechaFin ? parseExcelDate(rawFechaFin as string | number) : null;

      const isActiveInExcel = !parsedFechaFin;

      // Lógica de transformación de Cargos
      const rawCargo = String(item.Cargo || item.cargo || '').trim().toUpperCase();
      let finalTitle: JobTitle = rawCargo as JobTitle;

      if (rawCargo.includes('MIEMBRO DE EQUIPO')) {
        if (rawCargo.includes('OF. VARIOS')) {
          finalTitle = JobTitle.MIEMBRO_EQUIPO_FULL;
        } else {
          // Captura FDS, HRS y cualquier otra variación
          finalTitle = JobTitle.MIEMBRO_EQUIPO_ROLEX;
        }
      }

      const emp: Employee = {
        id: docId,
        name: String(item["Nombre completo"] || item.nombre || 'Sin Nombre').trim(),
        join_date: parseExcelDate((item["Fecha de ingreso"] as string) || (item.fecha_de_ingreso as string)),
        title: finalTitle,
        restaurant_id: storeId,
        zone: currentStores.find(s => s.id === storeId)?.zone || (existing?.zone || 'Sin Clasificar'),
        active: isActiveInExcel,
        history: existing?.history || [],
        exit_date: parsedFechaFin || existing?.exit_date
      };

      if (existing) {
        if (existing.restaurant_id !== storeId && existing.restaurant_id !== 'SIN_CECO') {
          emp.history!.push({ date: today, restaurantName: existing.restaurant_id, action: 'TRASLADO' });
        }
        if (existing.active && !isActiveInExcel && parsedFechaFin) {
          emp.history!.push({ date: parsedFechaFin, restaurantName: storeId, action: 'RETIRO' });
        }
        if (!existing.active && isActiveInExcel) {
          emp.exit_date = undefined;
          emp.history!.push({ date: today, restaurantName: storeId, action: 'INGRESO' });
        }
      } else {
        emp.history = [{ date: emp.join_date || today, restaurantName: storeId, action: 'INGRESO' }];
        if (!isActiveInExcel && parsedFechaFin) {
          emp.history.push({ date: parsedFechaFin, restaurantName: storeId, action: 'RETIRO' });
        }
      }
      return emp;
    }).filter(e => e !== null) as Employee[];

    // La lógica de retiros implícitos se desactiva por solicitud del usuario
    const implicitRetires: Employee[] = [];

    const allProcessedMap = new Map<string, Employee>();
    importedEmployees.forEach(e => allProcessedMap.set(e.id, e));
    implicitRetires.forEach(e => allProcessedMap.set(e.id, e));
    currentEmployees.forEach(old => {
      if (!allProcessedMap.has(old.id)) {
        allProcessedMap.set(old.id, old);
      }
    });

    const finalEmployees = Array.from(allProcessedMap.values());
    await dataService.saveEmployees(finalEmployees);
    return { count: importedEmployees.length };
  },

  // ── Safe Hands Methods ───────────────────────────────────────────────────
  getSafeHandsPersonnel: async (): Promise<SafeHandsPerson[]> => {
    const result = await dataService.supabaseFetch('safe_hands_personnel', 'GET');
    return (result || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      restaurantId: p.restaurant_id,
      lastIssueDate: p.last_issue_date,
      createdAt: p.created_at
    }));
  },

  getSafeHandsPersonnelPaginated: async (page: number, limit: number, search?: string, allowedRestaurantIds?: string[]): Promise<{ data: SafeHandsPerson[], total: number }> => {
    let queryParams = '?order=name.asc';
    if (search) {
      const cleanSearch = search.trim();
      if (cleanSearch) {
        queryParams += `&or=(name.ilike.*${encodeURIComponent(cleanSearch)}*,id.ilike.*${encodeURIComponent(cleanSearch)}*)`;
      }
    }
    if (allowedRestaurantIds) {
      if (allowedRestaurantIds.length === 0) {
        return { data: [], total: 0 };
      }
      queryParams += `&restaurant_id=in.(${allowedRestaurantIds.map(id => encodeURIComponent(id)).join(',')})`;
    }
    const { data, total } = await dataService.supabaseFetchPaginated('safe_hands_personnel', queryParams, page, limit);
    const parsedData = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      restaurantId: p.restaurant_id,
      lastIssueDate: p.last_issue_date,
      createdAt: p.created_at
    }));
    return { data: parsedData, total };
  },

  getSafeHandsCertsForEmployees: async (employeeIds: string[]): Promise<SafeHandsCert[]> => {
    if (!employeeIds || employeeIds.length === 0) return [];
    const query = `?employee_id=in.(${employeeIds.map(id => encodeURIComponent(id)).join(',')})`;
    const result = await dataService.supabaseFetch('safe_hands_certs', 'GET', null, query);
    return (result || []).map((c: any) => ({
      id: c.id,
      employeeId: c.employee_id,
      restaurantId: c.restaurant_id,
      issueDate: c.issue_date,
      expiryDate: c.expiry_date,
      certificateCode: c.certificate_code,
      signatureUrl: c.signature_url,
      createdAt: c.created_at
    }));
  },

  getSafeHandsSummaryCounts: async (allowedRestaurantIds?: string[]): Promise<{ total: number, vigentes: number, vencidos: number, porVencer: number, totalPersonnel: number }> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 1);
    const soonStr = soon.toISOString().split('T')[0];
    const headers = await getAuthHeaders();

    const filterSuffix = allowedRestaurantIds
      ? `&restaurant_id=in.(${allowedRestaurantIds.map(id => encodeURIComponent(id)).join(',')})`
      : '';

    const fetchCount = async (url: string) => {
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          headers: { ...headers, 'Prefer': 'count=exact' }
        });
        const range = res.headers.get('content-range');
        if (range) {
          return parseInt(range.split('/')[1]) || 0;
        }
        return 0;
      } catch (err) {
        console.error(`Error fetching count from ${url}:`, err);
        return 0;
      }
    };

    if (allowedRestaurantIds && allowedRestaurantIds.length === 0) {
      return { total: 0, vigentes: 0, vencidos: 0, porVencer: 0, totalPersonnel: 0 };
    }

    const [total, vigentes, porVencer, vencidos, totalPersonnel] = await Promise.all([
      fetchCount(`${SUPABASE_URL}/rest/v1/safe_hands_certs?id=not.is.null${filterSuffix}`),
      fetchCount(`${SUPABASE_URL}/rest/v1/safe_hands_certs?expiry_date=gte.${soonStr}${filterSuffix}`),
      fetchCount(`${SUPABASE_URL}/rest/v1/safe_hands_certs?expiry_date=gte.${todayStr}&expiry_date=lt.${soonStr}${filterSuffix}`),
      fetchCount(`${SUPABASE_URL}/rest/v1/safe_hands_certs?expiry_date=lt.${todayStr}${filterSuffix}`),
      fetchCount(`${SUPABASE_URL}/rest/v1/safe_hands_personnel?id=not.is.null${filterSuffix}`)
    ]);

    return { total, vigentes, vencidos, porVencer, totalPersonnel };
  },

  saveSafeHandsPersonnel: async (people: SafeHandsPerson[]): Promise<void> => {
    const payload = people.map(p => ({
      id: p.id,
      name: p.name,
      restaurant_id: p.restaurantId,
      last_issue_date: p.lastIssueDate
    }));
    await dataService.supabaseFetch('safe_hands_personnel', 'POST', payload, '?on_conflict=id');
  },

  getSafeHandsCerts: async (employeeId?: string): Promise<SafeHandsCert[]> => {
    const query = employeeId ? `?employee_id=eq.${employeeId}` : '';
    const result = await dataService.supabaseFetch('safe_hands_certs', 'GET', null, query);
    return (result || []).map((c: any) => ({
      id: c.id,
      employeeId: c.employee_id,
      restaurantId: c.restaurant_id,
      issueDate: c.issue_date,
      expiryDate: c.expiry_date,
      certificateCode: c.certificate_code,
      signatureUrl: c.signature_url,
      createdAt: c.created_at
    }));
  },

  getPublicCert: async (codeOrId: string): Promise<{ cert: SafeHandsCert, employee: SafeHandsPerson } | null> => {
    // Sanitizamos el input del usuario con encodeURIComponent para evitar manipulación de la query REST
    const safeCode = encodeURIComponent(codeOrId.trim());
    // Buscar por código de certificado primero, luego por ID de empleado
    let result = await dataService.supabaseFetch('safe_hands_certs', 'GET', null, `?certificate_code=eq.${safeCode}`);
    if (!result || result.length === 0) {
      result = await dataService.supabaseFetch('safe_hands_certs', 'GET', null, `?employee_id=eq.${safeCode}&order=expiry_date.desc&limit=1`);
    }

    if (result && result.length > 0) {
      const c = result[0];
      const personResult = await dataService.supabaseFetch('safe_hands_personnel', 'GET', null, `?id=eq.${c.employee_id}`);
      if (personResult && personResult.length > 0) {
        const p = personResult[0];
        return {
          cert: {
            id: c.id,
            employeeId: c.employee_id,
            restaurantId: c.restaurant_id,
            issueDate: c.issue_date,
            expiryDate: c.expiry_date,
            certificateCode: c.certificate_code,
            signatureUrl: c.signature_url
          },
          employee: {
            id: p.id,
            name: p.name,
            restaurantId: p.restaurant_id,
            lastIssueDate: p.last_issue_date
          }
        };
      }
    }
    return null;
  },

  saveSafeHandsCerts: async (certs: SafeHandsCert[]): Promise<void> => {
    const payload = certs.map(c => ({
      employee_id: c.employeeId,
      restaurant_id: c.restaurantId,
      issue_date: c.issueDate,
      expiry_date: c.expiryDate,
      certificate_code: c.certificateCode,
      signature_url: c.signatureUrl
    }));
    await dataService.supabaseFetch('safe_hands_certs', 'POST', payload, '?on_conflict=employee_id');
  },

  getSafeHandsSettings: async (): Promise<SafeHandsSettings> => {
    const result = await dataService.supabaseFetch('safe_hands_settings', 'GET', null, '?id=eq.1');
    if (result && result.length > 0) {
      return {
        signatureBase64: result[0].signature_base64,
        responsibleName: result[0].responsible_name
      };
    }
    return { responsibleName: 'RESPONSABLE CALIDAD' };
  },

  updateSafeHandsSettings: async (settings: SafeHandsSettings): Promise<void> => {
    const payload = {
      id: 1,
      signature_base64: settings.signatureBase64,
      responsible_name: settings.responsibleName,
      updated_at: new Date().toISOString()
    };
    await dataService.supabaseFetch('safe_hands_settings', 'POST', payload, '?on_conflict=id');
  },

  clearAllSafeHandsData: async (email: string, password: string): Promise<void> => {
    // 1. Crear cliente temporal para autenticar sin alterar la sesión del usuario actual
    const tempSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    const loginEmail = email.includes('@') ? email : `${email}@kfc.co`;
    const { data: authData, error: authError } = await tempSupabase.auth.signInWithPassword({
      email: loginEmail,
      password: password
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "Credenciales incorrectas.");
    }

    // 2. Obtener el rol del usuario autenticado
    const baseUsername = loginEmail.split('@')[0];
    const { data: profileData, error: profileError } = await tempSupabase
      .from('users')
      .select('role')
      .ilike('username', baseUsername)
      .single();

    if (profileError || !profileData) {
      throw new Error("No se pudo verificar el perfil del administrador.");
    }

    if (profileData.role !== 'ADMIN') {
      throw new Error("Acceso denegado: Se requieren credenciales de Administrador.");
    }

    // 3. Borrar certificados y personal
    const { error: certsError } = await tempSupabase
      .from('safe_hands_certs')
      .delete()
      .neq('employee_id', 'FORCE_DELETE_ALL_REST_QUERY');

    if (certsError) {
      throw new Error(`Error al borrar certificados: ${certsError.message}`);
    }

    const { error: personnelError } = await tempSupabase
      .from('safe_hands_personnel')
      .delete()
      .neq('id', 'FORCE_DELETE_ALL_REST_QUERY');

    if (personnelError) {
      throw new Error(`Error al borrar personal de manipulación: ${personnelError.message}`);
    }
  },

  deleteSafeHandsPerson: async (id: string): Promise<void> => {
    await dataService.supabaseFetch('safe_hands_personnel', 'DELETE', null, `?id=eq.${id}`);
  },

  deleteSafeHandsPersonnelBulk: async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const query = `?id=in.(${chunk.map(id => encodeURIComponent(id)).join(',')})`;
      await dataService.supabaseFetch('safe_hands_personnel', 'DELETE', null, query);
    }
  },

  getSchedulesForDateRange: async (startDate: string, endDate: string): Promise<DailySchedule[]> => {
    const query = `?date=gte.${startDate}&date=lte.${endDate}`;
    const result = await dataService.supabaseFetch('schedules', 'GET', null, query);
    return (result || []) as DailySchedule[];
  },

  saveDailySchedule: async (schedule: DailySchedule): Promise<void> => {
    await dataService.supabaseFetch('schedules', 'POST', schedule, '?on_conflict=employee_id,date');
  },

  deleteDailySchedule: async (employeeId: string, date: string): Promise<void> => {
    const query = `?employee_id=eq.${employeeId}&date=eq.${date}`;
    await dataService.supabaseFetch('schedules', 'DELETE', null, query);
  }
};
