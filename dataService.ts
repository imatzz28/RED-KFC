
import { Employee, GradeEntry, User, UserRole, JobTitle, Restaurant, HierarchyData } from './types';
import * as XLSX from 'xlsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

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

  // Caché en memoria para evitar parsing repetitivo del localStorage
  _cache: {
    employees: null as Employee[] | null,
    restaurants: null as Restaurant[] | null,
    grades: null as GradeEntry[] | null,
    gradeIndex: null as Map<string, GradeEntry[]> | null
  },

  loadAllFromCloud: async () => {
    try {
      // Optimizamos: No cargamos TODAS las notas de la historia para evitar saturar memoria.
      // Las notas se cargarán bajo demanda por mes.
      const [employees, restaurants, hierarchy, users] = await Promise.all([
        dataService.supabaseFetchAll('employees'),
        dataService.supabaseFetchAll('restaurants'),
        dataService.supabaseFetch('hierarchy').catch(() => []),
        dataService.supabaseFetchAll('users').catch(() => [])
      ]);

      localStorage.setItem('la_akademia_employees', JSON.stringify(employees || []));
      localStorage.setItem('la_akademia_stores', JSON.stringify(restaurants || []));
      localStorage.setItem('la_akademia_users', JSON.stringify(users || []));

      const defaultHierarchy = { lockedMonths: [], regions: [] };
      const cloudHierarchy = (hierarchy && (hierarchy as any)[0]?.data) ? (hierarchy as any)[0].data : defaultHierarchy;
      localStorage.setItem('la_akademia_hierarchy', JSON.stringify(cloudHierarchy));

      // Invalidar caché en memoria
      dataService._cache = { employees: null, restaurants: null, grades: null, gradeIndex: null };

      return true;
    } catch (e) {
      console.error("Error crítico al cargar desde la nube:", e);
      return false;
    }
  },

  loadGradesSummary: async (month: string) => {
    try {
      const monthDate = `${month}-01`;
      console.log(`[BigData] Cargando resúmenes mensuales para: ${month}`);

      // Consultamos la vista de resúmenes (1 fila por empleado en vez de 20)
      const summary = await dataService.supabaseFetchAll('employee_monthly_summary', `?month=eq.${monthDate}`);
      localStorage.setItem('la_akademia_summary', JSON.stringify(summary));
      dataService._cache.grades = null;
      dataService._cache.gradeIndex = null;
      return summary;
    } catch (e) {
      console.error("Error al cargar resúmenes:", e);
      return [];
    }
  },

  loadGradesForStore: async (storeId: string, month: string) => {
    try {
      const monthDate = `${month}-01`;
      console.log(`[BigData] Cargando detalle quirúrgico para tienda: ${storeId}`);

      // Solo cargamos las notas de ESTA tienda y ESTE mes (herencia incluida via lte si es necesario)
      const rawGrades = await dataService.supabaseFetchAll('grades', `?restaurant_id=eq.${storeId}&month=lte.${monthDate}`);

      const grades: GradeEntry[] = (rawGrades || []).map((g: any) => ({
        employeeId: String(g.employee_id).trim(),
        restaurantId: String(g.restaurant_id || '').trim(),
        month: g.month,
        group: g.group,
        category: g.category,
        score: g.score
      }));

      const currentGrades = dataService._cache.grades || [];
      // Filtrar para no duplicar si el usuario recarga la misma tienda
      const filtered = currentGrades.filter(g => g.restaurantId !== storeId);
      const updated = [...filtered, ...grades];

      dataService._cache.grades = updated;
      dataService._cache.gradeIndex = null;
      return updated;
    } catch (e) {
      console.error("Error en carga quirúrgica de tienda:", e);
      return [];
    }
  },

  getEmployees: (): Employee[] => {
    if (dataService._cache.employees) return dataService._cache.employees;
    const data: Employee[] = JSON.parse(localStorage.getItem('la_akademia_employees') || '[]');
    const normalized = data.map(e => ({ ...e, id: String(e.id).trim(), restaurant_id: String(e.restaurant_id).trim() }));
    dataService._cache.employees = normalized;
    return normalized;
  },

  getRestaurants: (): Restaurant[] => {
    if (dataService._cache.restaurants) return dataService._cache.restaurants;
    const data = JSON.parse(localStorage.getItem('la_akademia_stores') || '[]');
    dataService._cache.restaurants = data;
    return data;
  },

  getGrades: (): GradeEntry[] => {
    if (dataService._cache.grades) return dataService._cache.grades;
    const data: GradeEntry[] = JSON.parse(localStorage.getItem('la_akademia_grades') || '[]');
    const normalized = data.map(g => ({ ...g, employeeId: String(g.employeeId).trim(), restaurantId: String(g.restaurantId).trim() }));
    dataService._cache.grades = normalized;
    return normalized;
  },

  getGradesSummary: (): any[] => {
    return JSON.parse(localStorage.getItem('la_akademia_summary') || '[]');
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
    const empGradesRaw = gradeIndex.get(employeeId) || [];

    // Filtrar con el índice ya reducido por empleado
    const empGrades = empGradesRaw.filter(g => {
      const gradeMonth = g.month ? g.month.substring(0, 7) : '';
      if (gradeMonth > upToMonth) return false;
      if (g.group === 'D' && gradeMonth !== upToMonth) return false;
      return true;
    });

    const latestMap = new Map<string, GradeEntry>();
    empGrades.forEach(g => {
      const key = `${g.group}-${g.category}`;
      const existing = latestMap.get(key);
      if (!existing || g.month > existing.month) {
        latestMap.set(key, g);
      }
    });

    return Array.from(latestMap.values());
  },

  getHierarchy: (): HierarchyData => JSON.parse(localStorage.getItem('la_akademia_hierarchy') || '{"lockedMonths":[], "regions":[]}'),
  getUsers: (): User[] => {
    const local: User[] = JSON.parse(localStorage.getItem('la_akademia_users') || '[]');
    const adminExists = local.some((u: User) => u.username === 'admin');
    if (!adminExists) {
      const admin: User = { id: 'admin-master', username: 'admin', password: '123', role: UserRole.ADMIN, assignedZones: [], assignedRestaurants: [], assignedRegions: [] };
      return [admin, ...local];
    }
    return local;
  },

  saveEmployees: async (employees: Employee[]) => {
    localStorage.setItem('la_akademia_employees', JSON.stringify(employees));
    dataService._cache.employees = null; // Invalidate cache
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
    localStorage.setItem('la_akademia_stores', JSON.stringify(restaurants));
    dataService._cache.restaurants = null; // Invalidate cache
    await dataService.supabaseFetch('restaurants', 'POST', restaurants, '?on_conflict=id');
  },

  // Added saveUsers method to persist user data in Supabase
  saveUsers: async (users: User[]) => {
    localStorage.setItem('la_akademia_users', JSON.stringify(users));
    await dataService.supabaseFetch('users', 'POST', users, '?on_conflict=id');
  },

  clearAllDataInCloud: async () => {
    // IMPORTANTE: Primero borrar notas (hijas) y luego empleados (padres) por integridad referencial
    await dataService.supabaseFetch('grades', 'DELETE', null, '?employee_id=not.is.null');
    await dataService.supabaseFetch('employees', 'DELETE', null, '?id=not.is.null');
    localStorage.setItem('la_akademia_employees', '[]');
    localStorage.setItem('la_akademia_grades', '[]');
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
    localStorage.setItem('la_akademia_grades', JSON.stringify(updated));
    // Invalidar caché en memoria para que se reflejen los cambios inmediatamente
    dataService._cache.grades = null;
    dataService._cache.gradeIndex = null;
  },

  saveHierarchy: async (hierarchy: HierarchyData) => {
    localStorage.setItem('la_akademia_hierarchy', JSON.stringify(hierarchy));
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
    localStorage.setItem('la_akademia_users', JSON.stringify(current));
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
      const storeId = String(item.Nombre_Ceco || item.nombre_ceco || '').trim().toUpperCase();
      return storeId !== '' && !storeId.startsWith('H');
    });

    const importedEmployees = filteredRawData.map(item => {
      const storeId = String(item.Nombre_Ceco || item.nombre_ceco || 'SIN_CECO').trim().toUpperCase();
      const docId = String(item.Documento || item.documento || item.id || item.ID || '').trim();
      if (!docId) return null;
      importedIds.add(docId);

      const existing = currentEmployees.find(e => e.id === docId);

      const rawFechaFin = item["Fecha fin"] || item.fecha_fin || item["Fecha retiro"] || item.fecha_retiro || item.FECHA_FIN;
      const parsedFechaFin = rawFechaFin ? parseExcelDate(rawFechaFin) : null;

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
        join_date: parseExcelDate(item["Fecha de ingreso"] || item.fecha_de_ingreso),
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

    const implicitRetires = currentEmployees
      .filter(e => !importedIds.has(e.id) && e.active && uniqueStoresInExcel.has(e.restaurant_id))
      .map(e => ({
        ...e,
        active: false,
        exit_date: today,
        history: [...(e.history || []), { date: today, restaurantName: e.restaurant_id, action: 'RETIRO' as const }]
      }));

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
