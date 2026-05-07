import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APPROVAL_THRESHOLD, EVALUATION_GROUPS } from '@/utils/constants';
import { APP_LOGO_B64 } from '@/utils/logo_final';
import { Restaurant, Employee, JobTitle, JobHierarchy } from '@/types';
import { getMonthText, normalizeRole } from './storeUtils';
import { dataService } from '@/services/dataService';

export const generateStorePdf = async (
    selectedStore: Restaurant,
    pdfMonth: string,
    employees: Employee[],
    stats: any
) => {
    return new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
            try {
                const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
                const storeEmps = employees.filter(e => e.restaurant_id === selectedStore.id && e.active);

                const colors: Record<string, [number, number, number]> = {
                    kfcRed: [227, 24, 55],
                    dark: [26, 32, 44],
                    emerald: [16, 185, 129]
                };

                const drawHeader = (d: typeof doc, isPage1 = true) => {
                    const headerH = isPage1 ? 45 : 18; // Extremadamente pequeño en Pág 2 (18mm)

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
                        d.addImage(APP_LOGO_B64, 'PNG', 190, 2, 42, 42);
                    } else {
                        d.setFontSize(7.5);
                        d.setFont('helvetica', 'normal');
                        d.text(`CECO: ${selectedStore.id} | ${selectedStore.region} | ${getMonthText(pdfMonth)}`, 130, 13);
                        d.addImage(APP_LOGO_B64, 'PNG', 225, 1, 15, 15);
                    }
                };

                drawHeader(doc, true);

                // --- PÁGINA 1: RESUMEN EJECUTIVO ---
                doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('RESUMEN EJECUTIVO DE TIENDA', 20, 60);

                // Sección Censo (Tabla más elegante)
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
                    const rate = stats.groupStats[gid]?.approvalRate || 0;
                    const isApp = rate >= APPROVAL_THRESHOLD;

                    doc.setFontSize(8.5);
                    doc.setTextColor(50);
                    doc.setFont('helvetica', 'bold');
                    doc.text(config.name.toUpperCase(), 140, barY);

                    // Fondo de la barra
                    doc.setFillColor(245, 245, 245);
                    doc.roundedRect(140, barY + 2, 120, 4, 1, 1, 'F');

                    // Progreso
                    const barColor = isApp ? [16, 185, 129] : [227, 24, 55];
                    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
                    if (rate > 0) {
                        doc.roundedRect(140, barY + 2, (rate / 100) * 120, 4, 1, 1, 'F');
                    }

                    // Etiqueta de porcentaje con color dinámico
                    doc.setTextColor(barColor[0], barColor[1], barColor[2]);
                    doc.text(`${rate}%`, 265, barY + 5.5);

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
                drawHeader(doc, false);

                const startTableY = 26; // Empezamos mucho más arriba
                doc.setTextColor(227, 24, 55);
                doc.setFontSize(8.5); // Título minúsculo
                doc.setFont('helvetica', 'bold');
                doc.text(`DESGLOSE DETALLADO DE CALIFICACIONES`, 25, 23.5);

                const tableData = storeEmps
                    .sort((a, b) => {
                        const rawA = normalizeRole(a.title);
                        const rawB = normalizeRole(b.title);
                        const rankA = JobHierarchy[rawA] || 99;
                        const rankB = JobHierarchy[rawB] || 99;
                        if (rankA !== rankB) return rankA - rankB;
                        return a.name.localeCompare(b.name);
                    })
                    .map(emp => {
                        const effective = dataService.getEffectiveGrades(emp.id, pdfMonth, selectedStore.id);
                        const getScore = (gid: string) => {
                            const gGrades = effective.filter(g => g.group === gid);
                            const gConf = EVALUATION_GROUPS[gid as keyof typeof EVALUATION_GROUPS];
                            return gGrades.length > 0 ? `${Math.round(gGrades.reduce((s, g) => s + g.score, 0) / gConf.categories.length)}%` : '0%';
                        };

                        return [
                            emp.id,
                            emp.name.toUpperCase(),
                            emp.join_date,
                            emp.title.toUpperCase(),
                            getScore('AK'), getScore('A'), getScore('B'), getScore('C'), getScore('D'), getScore('F'), getScore('E')
                        ];
                    });

                // Ajuste DINÁMICO MATEMÁTICO para forzar una sola página
                const availableHeight = 210 - startTableY - 5; // ~179mm disponibles
                const rowsNeeded = tableData.length + 1;
                const targetRowHeight = availableHeight / rowsNeeded;

                // Relación: Altura de fila = (FontSize * 0.352777) + (2 * Padding)
                // Intentamos un balance donde FontSize sea legible pero Padding no sea cero
                let dynamicFontSize = Math.min(7.5, Math.max(2.8, targetRowHeight * 1.3));
                let dynamicPadding = Math.max(0.1, (targetRowHeight - (dynamicFontSize * 0.3528)) / 2.2);

                autoTable(doc, {
                    startY: startTableY,
                    head: [['ID', 'NOMBRE', 'INGRESO', 'CARGO', 'AKAD', 'BAS.', 'STAR', 'ALLS.', 'P. CAP', 'SST', 'VAUL.']],
                    body: tableData,
                    theme: 'grid',
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
                        0: { cellWidth: 23 },
                        1: { halign: 'left', cellWidth: 58 },
                        2: { cellWidth: 20 },
                        3: { halign: 'left', cellWidth: 48 },
                        4: { cellWidth: 14 }, 5: { cellWidth: 14 }, 6: { cellWidth: 14 }, 7: { cellWidth: 14 }, 8: { cellWidth: 14 }, 9: { cellWidth: 14 }, 10: { cellWidth: 14 }
                    },
                    margin: { top: 18, bottom: 2, left: 25, right: 25 },
                    pageBreak: 'auto', // Cambiado a 'auto' para que si falla por 1mm no salte TODA la tabla
                    didDrawPage: (data) => {
                        if (data.pageNumber > 2) {
                            drawHeader(doc, false);
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
