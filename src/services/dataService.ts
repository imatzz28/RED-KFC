
import { Employee, GradeEntry, User, UserRole, JobTitle, Restaurant, HierarchyData, BancaData } from '@/types';
import * as XLSX from 'xlsx';
import localforage from 'localforage';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ERROR: Las variables de entorno de Supabase no están configuradas. Verifica tu archivo .env o la configuración de tu hosting.");
}


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

    const options: RequestInit = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': isUpsert ? 'return=representation,resolution=merge-duplicates' : 'return=representation'
      }
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
    const separator = queryParams ? (queryParams.startsWith('?') ? '&' : '?') : '?';
    const countUrl = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=id&limit=1`;

    const countRes = await fetch(countUrl, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' }
    });

    const contentRange = countRes.headers.get('content-range');
    let total = 0;
    if (contentRange) {
      total = parseInt(contentRange.split('/')[1]);
    }

    const step = 1000;
    if (total <= step) {
      const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&limit=${step}`;
      const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
      return res.ok ? await res.json() : [];
    }

    const numChunks = Math.ceil(total / step);
    const promises = [];
    for (let i = 0; i < numChunks; i++) {
      const from = i * step;
      const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&offset=${from}&limit=${step}`;
      promises.push(
        fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } })
          .then(async r => {
            if (!r.ok) {
              const txt = await r.text();
              throw new Error(`Error en chunk ${i} de [${table}]: ${txt}`);
            }
            return r.json();
          })
      );
    }

    const results = await Promise.all(promises);
    return results.flat();
  },

  supabaseFetchPaginated: async (table: string, queryParams: string = '', page: number = 0, limit: number = 50): Promise<{ data: any[], total: number }> => {
    const separator = queryParams ? (queryParams.startsWith('?') ? '&' : '?') : '?';

    // Primero obtenemos el total (count=exact) y la data juntos
    const url = `${SUPABASE_URL}/rest/v1/${table}${queryParams}${separator}select=*&offset=${page * limit}&limit=${limit}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
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
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
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
    banca: null as BancaData | null
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

  loadAllFromCloud: async () => {
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

      return true;
    } catch (e) {
      console.error("Error crítico al cargar desde la nube:", e);
      return false;
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
      // 1. Obtener empleados activos de esta tienda
      const storeEmployees = (dataService._cache.employees || []).filter(
        e => e.restaurant_id.trim().toUpperCase() === storeId.trim().toUpperCase()
      );
      const employeeIds = storeEmployees.map(e => String(e.id).trim());

      // 2. Fetch A: Por restaurant_id (el path normal)
      const fetchByStore = () => dataService.supabaseFetchAll(
        'grades',
        `?restaurant_id=eq.${storeId}&month=lte.${monthDate}`
      );

      // 3. Fetch B: Por employee IDs (seguro ante diferencias de formato de CECO)
      const fetchByEmployees = async () => {
        if (employeeIds.length === 0) return [];
        // Supabase 'in' filter: ?employee_id=in.(id1,id2,...)
        const inFilter = `(${employeeIds.join(',')})` ;
        return dataService.supabaseFetchAll(
          'grades',
          `?employee_id=in.${inFilter}&month=lte.${monthDate}`
        );
      };

      // 4. Ejecutar ambos fetches en paralelo con retry
      const [byStore, byEmployee] = await Promise.all([
        fetchWithRetry(fetchByStore),
        fetchWithRetry(fetchByEmployees)
      ]);

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

      // 6. Guardar en caché keyed por tienda+mes (totalmente aislado)
      const cacheKey = `${storeId.trim().toUpperCase()}::${month}`;
      dataService._cache.gradesByKey.set(cacheKey, grades);
      dataService._cache.activeStoreKey = cacheKey;
      dataService._cache.gradeIndex = null; // Invalidar índice para que se reconstruya
      console.log(`[Grades] ${grades.length} notas (únicas: ${dedupeMap.size}) guardadas en clave: ${cacheKey}`);
      return grades;
    } catch (e) {
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

  getEffectiveGrades: (employeeId: string, upToMonth: string): GradeEntry[] => {
    const gradeIndex = dataService.getGradeIndex();
    const empGradesRaw = gradeIndex.get(String(employeeId).trim()) || [];

    const empGrades = empGradesRaw.filter(g => {
      const gradeMonth = g.month ? g.month.substring(0, 7) : '';
      if (gradeMonth > upToMonth) return false;
      // Grupos no heredables: solo valen para su propio mes
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

  getHierarchy: (): HierarchyData => dataService._cache.hierarchy || { lockedMonths: [], regions: [] },
  getBancaData: (): BancaData => dataService._cache.banca || { assignments: [] },
  getUsers: (): User[] => {
    const local: User[] = dataService._cache.users || [];
    const adminExists = local.some((u: User) => u.username === 'admin');
    if (!adminExists) {
      const admin: User = { id: 'admin-master', username: 'admin', password: '123', role: UserRole.ADMIN, assignedZones: [], assignedRestaurants: [], assignedRegions: [] };
      return [admin, ...local];
    }
    return local;
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
      password: u.password || '', // Asegurar que la llave siempre exista
      role: u.role,
      assignedZones: u.assignedZones || [],
      assignedRestaurants: u.assignedRestaurants || [],
      assignedRegions: u.assignedRegions || []
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
    const deleteUrl = `${SUPABASE_URL}/rest/v1/grades?employee_id=eq.${employeeId}&month=eq.${monthDate}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

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

    const allGrades = dataService.getGrades().filter(g => !(g.employeeId === employeeId && g.month && g.month.startsWith(month)));
    const gradesWithContext = grades.map(g => ({ ...g, month: monthDate, restaurantId: currentCeco }));
    const updated = [...allGrades, ...gradesWithContext];
    await localforage.setItem('la_akademia_grades', updated);
    dataService._cache.grades = updated;
    dataService._cache.gradeIndex = null;
  },

  saveHierarchy: async (hierarchy: HierarchyData) => {
    await localforage.setItem('la_akademia_hierarchy', hierarchy);
    dataService._cache.hierarchy = hierarchy;
    await dataService.supabaseFetch('hierarchy', 'POST', { id: 1, data: hierarchy }, '?on_conflict=id');
  },

  deleteUser: async (userId: string) => {
    const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
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
    await dataService.loadAllFromCloud();
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

    const uniqueStoresInExcel = new Set(filteredRawData.map(item => String(item.Nombre_Ceco || item.nombre_ceco || '').trim().toUpperCase()));

    // La lógica de retiros implícitos se desactiva por solicitud del usuario:
    // "si el ID del usuario no aparece en el siguiente activos y retirados, la app no lo debera marcar como retirado"
    const implicitRetires: Employee[] = [];
    /*
    const implicitRetires = currentEmployees
      .filter(e => !importedIds.has(e.id) && e.active && uniqueStoresInExcel.has(e.restaurant_id))
      .map(e => ({
        ...e,
        active: false,
        exit_date: today,
        history: [...(e.history || []), { date: today, restaurantName: e.restaurant_id, action: 'RETIRO' as const }]
      }));
    */

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
  }
};
