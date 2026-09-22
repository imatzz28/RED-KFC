import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APPROVAL_THRESHOLD, EVALUATION_GROUPS } from '@/utils/constants';
import * as LogoModule from '@/utils/logo_final';
const APP_LOGO_B64 = LogoModule.APP_LOGO_B64;
const APP_LOGO_RATIO = ((LogoModule as any).APP_LOGO_RATIO && !isNaN((LogoModule as any).APP_LOGO_RATIO))
    ? Number((LogoModule as any).APP_LOGO_RATIO)
    : 1;
import { Restaurant, Employee, JobTitle, JobHierarchy } from '@/types';
import { getMonthText, normalizeRole, getStoreEmployeesForMonth, getSeniorityMonths } from './storeUtils';
import { dataService } from '@/services/dataService';

export const generateStorePdf = async (
    selectedStore: Restaurant,
    pdfMonth: string,
    employees: Employee[],
    stats: any,
    summaryMap?: Map<string, any>
) => {
    return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
            try {
                const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

                // Asegurar mapa de resumen histórico de notas
                const effectiveSummaryMap = summaryMap || new Map((dataService.getGradesSummary() || []).map(s => [String(s.employee_id).trim(), s]));

                // Filtrado consistente de colaboradores para el PDF usando el summaryMap
                const storeEmps = getStoreEmployeesForMonth(selectedStore.id, pdfMonth, employees, effectiveSummaryMap);

                const colors: Record<string, [number, number, number]> = {
                    kfcRed: [227, 24, 55],
                    dark: [26, 32, 44],
                    emerald: [16, 185, 129]
                };

                let activeLogoB64 = APP_LOGO_B64;
                let activeRatio = APP_LOGO_RATIO;

                try {
                    const res = await fetch('/logo_reporte.png');
                    if (res.ok) {
                        const blob = await res.blob();
                        activeLogoB64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.onerror = () => resolve(APP_LOGO_B64);
                            reader.readAsDataURL(blob);
                        });
                        await new Promise<void>((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                if (img.naturalWidth && img.naturalHeight) {
                                    activeRatio = img.naturalWidth / img.naturalHeight;
                                }
                                resolve();
                            };
                            img.onerror = () => resolve();
                            img.src = activeLogoB64;
                        });
                    }
                } catch {
                    // Fallback to activeLogoB64
                }

                const drawHeader = (d: typeof doc, isPage1 = true) => {
                    const headerH = isPage1 ? 45 : 18;

                    // Fondo Rojo Corporativo KFC
                    d.setFillColor(227, 24, 55);
                    d.rect(0, 0, 297, headerH, 'F');

                    // Línea de acento inferior oscura
                    d.setFillColor(26, 32, 44);
                    d.rect(0, headerH, 297, 1.5, 'F');

                    // Patrón de franjas KFC moderno
                    d.setFillColor(255, 255, 255);
                    const stripeW = isPage1 ? 4 : 2;
                    const stripeG = isPage1 ? 3 : 1.5;
                    const sX = 255;
                    d.rect(sX, 0, stripeW, headerH, 'F');
                    d.rect(sX + stripeW + stripeG, 0, stripeW, headerH, 'F');
                    d.rect(sX + (stripeW + stripeG) * 2, 0, stripeW, headerH, 'F');

                    d.setTextColor(255, 255, 255);
                    d.setFont('helvetica', 'bold');
                    d.setFontSize(isPage1 ? 9 : 6);
                    d.text('REPORTE DE CAPACITACIÓN Y CURVAS', 20, isPage1 ? 12 : 6);

                    d.setFontSize(isPage1 ? 34 : 16);
                    d.text(selectedStore.name.toUpperCase(), 18, isPage1 ? 26 : 13);

                    if (isPage1) {
                        d.setFontSize(10);
                        d.setFont('helvetica', 'normal');
                        d.text(`CECO: ${selectedStore.id}  •  REGIÓN: ${selectedStore.region}  •  PERIODO: ${getMonthText(pdfMonth)}`, 20, 36);

                        // Centrado vertical exacto en la barra roja con mayor tamaño y legibilidad
                        const maxH = 37;
                        const maxW = 50;
                        let logoH = maxH;
                        let logoW = logoH * activeRatio;
                        if (logoW > maxW) {
                            logoW = maxW;
                            logoH = logoW / activeRatio;
                        }
                        const logoX = 250 - logoW;
                        const logoY = (headerH - logoH) / 2;
                        d.addImage(activeLogoB64, 'PNG', logoX, logoY, logoW, logoH, 'logo', 'FAST');
                    } else {
                        d.setFontSize(7.5);
                        d.setFont('helvetica', 'normal');
                        d.text(`CECO: ${selectedStore.id} | ${selectedStore.region} | ${getMonthText(pdfMonth)}`, 130, 13);

                        const maxH2 = 13.5;
                        const maxW2 = 25;
                        let logoH2 = maxH2;
                        let logoW2 = logoH2 * activeRatio;
                        if (logoW2 > maxW2) {
                            logoW2 = maxW2;
                            logoH2 = logoW2 / activeRatio;
                        }
                        const logoX2 = 252 - logoW2;
                        const logoY2 = (headerH - logoH2) / 2;
                        d.addImage(activeLogoB64, 'PNG', logoX2, logoY2, logoW2, logoH2, 'logo', 'FAST');
                    }
                };

                drawHeader(doc, true);

                // --- PÁGINA 1: RESUMEN EJECUTIVO ---
                doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('RESUMEN EJECUTIVO DE TIENDA', 20, 60);

                // Sección Censo (Tabla)
                const roleData = [
                    [JobTitle.GERENTE, stats.cargoCounts[JobTitle.GERENTE] || 0],
                    [JobTitle.SUBGERENTE, stats.cargoCounts[JobTitle.SUBGERENTE] || 0],
                    [JobTitle.LIDER_TURNO, stats.cargoCounts[JobTitle.LIDER_TURNO] || 0],
                    [JobTitle.ENTRENADOR, stats.cargoCounts[JobTitle.ENTRENADOR] || 0],
                    [JobTitle.MIEMBRO_EQUIPO_FULL, stats.cargoCounts[JobTitle.MIEMBRO_EQUIPO_FULL] || 0],
                    [JobTitle.MIEMBRO_EQUIPO_ROLEX, stats.cargoCounts[JobTitle.MIEMBRO_EQUIPO_ROLEX] || 0],
                    [JobTitle.DOMICILIARIO, stats.cargoCounts[JobTitle.DOMICILIARIO] || 0],
                    [{ content: 'CENSO TOTAL ACTIVO', styles: { fontStyle: 'bold', fillColor: [26, 32, 44], textColor: 255 } }, { content: stats.total, styles: { fontStyle: 'bold', fillColor: [227, 24, 55], textColor: 255 } }]
                ].map(row => (Array.isArray(row) && typeof row[0] === 'string' ? [row[0].toUpperCase(), row[1]] : row));

                autoTable(doc, {
                    startY: 70,
                    head: [['ESTRUCTURA DE MANDO', 'CANT.']],
                    body: roleData as any,
                    theme: 'grid',
                    styles: { fontSize: 8.5, cellPadding: 3, halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1 },
                    headStyles: { fillColor: [26, 32, 44], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [250, 250, 250] },
                    margin: { left: 20 },
                    tableWidth: 100
                });

                // Sección Barras de Progreso (Dashboard Look)
                doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('DESEMPEÑO GLOBAL POR NIVEL', 140, 65);

                let barY = 75;
                Object.entries(EVALUATION_GROUPS).forEach(([gid, config]) => {
                    const gStat = stats.groupStats[gid];
                    const hasGrades = gStat?.hasGrades ?? false;
                    const rate = gStat?.avg || 0;
                    const isApp = rate >= APPROVAL_THRESHOLD;

                    doc.setFontSize(8.5);
                    doc.setTextColor(50);
                    doc.setFont('helvetica', 'bold');
                    doc.text(config.name.toUpperCase(), 140, barY);

                    // Fondo de la barra
                    doc.setFillColor(245, 245, 245);
                    doc.roundedRect(140, barY + 2, 120, 4, 1, 1, 'F');

                    if (hasGrades && rate > 0) {
                        const barColor = isApp ? [16, 185, 129] : [227, 24, 55];
                        doc.setFillColor(barColor[0], barColor[1], barColor[2]);
                        doc.roundedRect(140, barY + 2, Math.min(120, (rate / 100) * 120), 4, 1, 1, 'F');

                        doc.setTextColor(barColor[0], barColor[1], barColor[2]);
                        doc.text(`${rate}%`, 265, barY + 5.5);
                    } else if (hasGrades && rate === 0) {
                        doc.setTextColor(227, 24, 55);
                        doc.text('0%', 265, barY + 5.5);
                    } else {
                        // Sin notas registradas
                        doc.setTextColor(160, 160, 160);
                        doc.text('S/N', 265, barY + 5.5);
                    }

                    barY += 12;
                });

                // Curva Global Destacada
                doc.setFillColor(26, 32, 44);
                doc.roundedRect(20, 165, 257, 15, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.text('NIVEL DE CUMPLIMIENTO GLOBAL DE LA TIENDA:', 35, 174.5);
                doc.setFontSize(16);
                doc.setTextColor(255, 255, 255);
                doc.text(`${stats.percent}%`, 245, 175);

                // Forzar salto de página para la tabla detallada
                doc.addPage();

                const tableData = [...storeEmps]
                    .sort((a, b) => {
                        const rawA = normalizeRole(a.title);
                        const rawB = normalizeRole(b.title);
                        const rankA = JobHierarchy[rawA] || 99;
                        const rankB = JobHierarchy[rawB] || 99;
                        if (rankA !== rankB) return rankA - rankB;
                        return a.name.localeCompare(b.name);
                    })
                    .map(emp => {
                        // 1. Obtener notas efectivas: primero con tienda, si está vacío fallback sin tienda (traslados)
                        let effective = dataService.getEffectiveGrades(emp.id, pdfMonth, selectedStore.id);
                        if (effective.length === 0) {
                            effective = dataService.getEffectiveGrades(emp.id, pdfMonth);
                        }
                        const empSummary = effectiveSummaryMap.get(String(emp.id).trim());
                        const seniority = getSeniorityMonths(emp.join_date, pdfMonth);

                        const getScore = (gid: string) => {
                            // REGLA All-Star (Grupo C): Personal con antigüedad <= 2 meses no aplica
                            if (gid === 'C' && seniority <= 2) {
                                return 'N/A';
                            }

                            const gGrades = effective.filter(g => g.group === gid);
                            const gConf = EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS];

                            if (gGrades.length > 0) {
                                const sum = gGrades.reduce((s, g) => s + g.score, 0);
                                return `${Math.round(sum / gConf.categories.length)}%`;
                            }

                            // Fallback al resumen histórico consolidado (excepto D y F que son mensuales)
                            if (empSummary && gid !== 'D' && gid !== 'F') {
                                const raw = empSummary[`avg_${gid.toLowerCase()}`];
                                if (raw != null && Number(raw) > 0) {
                                    return `${Math.round(Number(raw))}%`;
                                }
                            }

                            return '0%';
                        };

                        return [
                            emp.id,
                            emp.name.toUpperCase(),
                            emp.join_date || '—',
                            emp.title.toUpperCase(),
                            getScore('AK'), getScore('A'), getScore('B'), getScore('C'), getScore('D'), getScore('F'), getScore('E')
                        ];
                    });

                // Paginado y dimensionamiento óptimo:
                // Si son hasta 25 empleados, entra con comodidad en una página (Pág. 2).
                // Si son más, se permite paginado fluido con cabecera repetida en cada página adicional.
                const isSinglePageTable = tableData.length <= 25;
                const dynamicFontSize = isSinglePageTable ? 7.2 : 6.5;
                const dynamicPadding = isSinglePageTable ? 1.6 : 1.2;

                autoTable(doc, {
                    startY: 26,
                    head: [['ID', 'NOMBRE', 'INGRESO', 'CARGO', 'AKAD', 'BAS.', 'STAR', 'ALLS.', 'P. CAP', 'SST', 'VAUL.']],
                    body: tableData,
                    theme: 'grid',
                    showHead: 'everyPage',
                    styles: {
                        fontSize: dynamicFontSize,
                        halign: 'center',
                        cellPadding: dynamicPadding,
                        overflow: 'linebreak',
                        lineColor: [200, 200, 200],
                        lineWidth: 0.1
                    },
                    headStyles: { fillColor: [227, 24, 55], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [252, 252, 252] },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { halign: 'left', cellWidth: 58 },
                        2: { cellWidth: 20 },
                        3: { halign: 'left', cellWidth: 47 },
                        4: { cellWidth: 15 },
                        5: { cellWidth: 15 },
                        6: { cellWidth: 16 },
                        7: { cellWidth: 16 },
                        8: { cellWidth: 16 },
                        9: { cellWidth: 16 },
                        10: { cellWidth: 16 }
                    },
                    margin: { top: 25, bottom: 10, left: 20, right: 20 },
                    pageBreak: 'auto',
                    didDrawPage: (data) => {
                        if (data.pageNumber >= 2) {
                            drawHeader(doc, false);
                            doc.setFontSize(8);
                            doc.setTextColor(227, 24, 55);
                            doc.setFont('helvetica', 'bold');
                            const pageLabel = doc.getNumberOfPages() > 2 ? ` (PARTE ${data.pageNumber - 1})` : '';
                            doc.text(`DESGLOSE DETALLADO DE CALIFICACIONES${pageLabel}`, 20, 22.5);
                        }
                    }
                });

                doc.save(`Curvas_Certificacion_${selectedStore.id}_${pdfMonth}.pdf`);
                resolve();
            } catch (err) {
                console.error(err);
                reject(err);
            }
        }, 200);
    });
};
