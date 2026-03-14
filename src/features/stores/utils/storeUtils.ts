import { JobTitle } from '@/types';

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
