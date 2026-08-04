import { Employee, JobTitle } from '@/types';
import { dataService } from '@/services/dataService';

export const normalizeRole = (title: string): string => {
    const upper = (title || '').toUpperCase();
    if (upper.includes('SUBGERENTE')) return JobTitle.SUBGERENTE;
    if (upper.includes('GERENTE')) return JobTitle.GERENTE;
    if (upper.includes('LÍDER') || upper.includes('LIDER')) return JobTitle.LIDER_TURNO;
    if (upper.includes('ENTRENADOR')) return JobTitle.ENTRENADOR;
    if (upper.includes('DOMICILIARIO')) return JobTitle.DOMICILIARIO;
    if (upper.includes('ROLEX') || upper.includes('FDS') || upper.includes('HRS') || upper.includes('FIN DE SEMANA')) return JobTitle.MIEMBRO_EQUIPO_ROLEX;
    return JobTitle.MIEMBRO_EQUIPO_FULL;
};

export const getSeniorityMonths = (joinDate: string, targetMonth: string) => {
    if (!joinDate) return 0;
    const start = new Date(joinDate);
    const end = new Date(targetMonth + "-01");
    const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, diff);
};

export const getMonthText = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
};

export const getStoreEmployeesForMonth = (
    storeId: string,
    month: string,
    employees: Employee[],
    summaryMap?: Map<string, any>
): Employee[] => {
    const normStoreId = storeId.trim().toUpperCase();
    const [yVal, mVal] = month.split('-').map(Number);
    const lastDayVal = new Date(yVal, mVal, 0).getDate();
    const periodEndStr = `${month}-${String(lastDayVal).padStart(2, '0')}`;
    const periodStartStr = `${month}-01`;

    return employees.filter(e => {
        const empStoreId = (e.restaurant_id || '').trim().toUpperCase();
        if (empStoreId !== normStoreId) return false;

        const joinDateStr = e.join_date ? e.join_date.substring(0, 10) : '0000-01-01';
        const exitDateStr = e.exit_date ? e.exit_date.substring(0, 10) : '9999-12-31';

        // Estaba contratado en el período: ingresó antes del fin de mes Y no salió antes del inicio
        let isHistoricalActive = (joinDateStr <= periodEndStr) && (exitDateStr > periodStartStr);

        if (isHistoricalActive) {
            const isRetired = !e.active || (e.exit_date && e.exit_date.trim() !== '');
            if (isRetired) {
                const empSummary = summaryMap?.get(String(e.id).trim());
                const effective = dataService.getEffectiveGrades(e.id, month, normStoreId);
                const hasNotes = (effective && effective.length > 0) || !!empSummary;
                // Si el empleado está retirado y NO tiene notas grabadas para este período, no se incluye
                if (!hasNotes && (exitDateStr <= periodEndStr || !e.active)) {
                    isHistoricalActive = false;
                }
            }
        }

        return isHistoricalActive;
    });
};

