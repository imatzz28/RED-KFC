import * as XLSX from 'xlsx';

self.onmessage = (e) => {
    const {
        initialEmployees,
        restaurants,
        summaries,
        allGradesForMonth,
        exportConfig,
        selectedMonth,
        filterRegion,
        filterZone,
        filterStore,
        searchPerson,
        userRole,
        assignedRegions,
        evaluationGroups,
        hierarchy
    } = e.data;

    try {
        const restaurantMap = new Map(restaurants.map((r: any) => [r.id, r]));
        const gradeIndex = new Map<string, any[]>();

        if (exportConfig.includeDetails) {
            allGradesForMonth.forEach((g: any) => {
                if (!gradeIndex.has(g.employeeId)) gradeIndex.set(g.employeeId, []);
                gradeIndex.get(g.employeeId)!.push(g);
            });
        }

        const summaryMap = new Map(summaries.map((s: any) => [String(s.employee_id).trim(), s]));

        const searchLower = (searchPerson || '').toLowerCase();
        const isCoordinator = userRole === 'COORDINATOR';

        const exportData = initialEmployees
            .map((emp: any) => {
                const empId = String(emp.id).trim();
                const summary = summaryMap.get(empId);
                const storeIdAtPeriod = summary ? summary.restaurant_id : emp.restaurant_id;

                return {
                    ...emp,
                    summary,
                    storeIdAtPeriod,
                    avg: summary ? Math.round(summary.avg_score) : 0,
                    isApproved: summary ? summary.is_approved : false,
                    isPending: !summary
                };
            })
            .filter((e: any) => {
                const matchPerson = searchPerson === '' || e.name.toLowerCase().includes(searchLower) || e.id.includes(searchPerson);
                if (!matchPerson) return false;

                const normalizedStoreId = String(e.storeIdAtPeriod || '').trim().toUpperCase();
                const store = restaurantMap.get(normalizedStoreId);

                const matchRegion = filterRegion === 'all'
                    ? (isCoordinator ? assignedRegions.includes(store?.region || '') : true)
                    : store?.region === filterRegion;
                if (!matchRegion) return false;

                const matchZone = filterZone === 'all' ? true : store?.zone === filterZone;
                if (!matchZone) return false;

                const matchStore = filterStore === 'all' ? true : normalizedStoreId === String(filterStore).trim().toUpperCase();
                return matchStore;
            })
            .map((emp: any) => {
                const empStore = restaurantMap.get(emp.storeIdAtPeriod);
                const dynamicColumns: { [key: string]: string } = {};
                const empId = String(emp.id).trim();

                exportConfig.groups.forEach((gid: string) => {
                    const gConfig = evaluationGroups[gid];

                    const groupAvg = emp.summary ? Math.round(emp.summary[`avg_${gid.toLowerCase()}`] || 0) : 0;
                    dynamicColumns[`${gConfig.name} %`] = `${groupAvg}%`;

                    if (exportConfig.includeDetails) {
                        const empGrades = gradeIndex.get(empId) || [];
                        const gGrades = empGrades.filter(g => g.group === gid);

                        gConfig.categories.forEach((cat: string, index: number) => {
                            let catName = cat;
                            if (gid === 'D') {
                                const cfg = hierarchy?.groupDConfig?.[selectedMonth];
                                if (index === 0) catName = cfg?.cat1 || "Guías Plan de Capacitación";
                                if (index === 1) catName = cfg?.cat2 || "Guías de SST";
                            }
                            const grade = gGrades.find(g => g.category === cat);
                            dynamicColumns[`[${gConfig.name}] ${catName}`] = grade ? `${grade.score}%` : '0%';
                        });
                    }
                });

                return {
                    "Documento": emp.id,
                    "Nombre completo": emp.name,
                    "Estado": emp.active ? "Activo" : "Retirado",
                    "Cargo": emp.title,
                    "Tienda Reportada": empStore?.name || emp.storeIdAtPeriod,
                    "Ceco": emp.storeIdAtPeriod,
                    "Jefe de area": empStore?.zone || emp.zone,
                    "Mes Reporte": selectedMonth,
                    "Promedio General": `${emp.avg}%`,
                    "Certificación": emp.isPending ? 'Pendiente' : (emp.isApproved ? 'Aprobado' : 'No Cumple'),
                    "Origen Nota": emp.isPending ? 'N/A' : (emp.summary ? 'Registrada' : 'S/N'),
                    ...dynamicColumns
                };
            });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_Akademia");

        // Instead of writing the file in the worker directly which requires file-saver, 
        // it's better to write it and return the binary string or blob, 
        // OR we can just use write() to get an arraybuffer and pass it back.
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        self.postMessage({ success: true, data: excelBuffer });
    } catch (err: any) {
        self.postMessage({ success: false, error: err.message });
    }
};
