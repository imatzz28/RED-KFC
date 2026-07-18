import React from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Network, FileDown } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { HierarchyData, Restaurant } from '@/types';

import { useAppStore } from '@/store/useAppStore';

interface Props {
  setImportStatus: (status: { message: string, isError: boolean } | null) => void;
  onEmployeesImported: () => void;
  setHierarchy: (h: HierarchyData) => void;
  setRestaurants: (r: Restaurant[]) => void;
}

export const DataUploader: React.FC<Props> = ({ setImportStatus, onEmployeesImported, setHierarchy, setRestaurants }) => {
  const showConfirmDialog = useAppStore(state => state.showConfirmDialog);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'employees' | 'hierarchy') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const label = type === 'employees' ? 'la nómina de personal' : 'la estructura de tiendas';
    
    showConfirmDialog(
      `¿Estás seguro de que deseas importar "${file.name}" como ${label}?\n\nEsta acción actualizará los datos en producción.`,
      () => {
        setImportStatus({ message: 'Procesando archivo...', isError: false });
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
              setImportStatus({ message: 'Error: El archivo está vacío o no tiene el formato correcto.', isError: true });
              return;
            }

            if (type === 'employees') {
              const res = await dataService.importMonthlyExcel(data as Record<string, unknown>[]);
              setImportStatus({ message: `Carga exitosa: ${res.count} trabajadores sincronizados.`, isError: false });
            } else {
              const count = await dataService.importHierarchyExcel(data as Record<string, unknown>[]);
              setImportStatus({ message: `Éxito: ${count} tiendas sincronizadas correctamente.`, isError: false });
              setHierarchy(dataService.getHierarchy());
              setRestaurants(dataService.getRestaurants());
            }
            onEmployeesImported();
          } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setImportStatus({ message: `Error: ${errorMessage}`, isError: true });
          }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
      },
      () => {
        e.target.value = '';
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <button
          onClick={() => {
            const templateData = [{ "Documento": "12345678", "Nombre completo": "JUAN PEREZ", "Fecha de ingreso": "2023-01-15", "Cargo": "Miembro de equipo", "Nombre_Ceco": "CECO001", "Fecha fin": "" }];
            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
            XLSX.writeFile(wb, "Plantilla_Nomina_KFC.xlsx");
          }}
          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-red-500 hover:text-red-600 transition-all shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          Descargar Plantilla
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-red-600"><FileSpreadsheet className="w-8 h-8" /></div>
          <h3 className="text-sm font-black uppercase italic tracking-tight">Plantilla Personal Mensual</h3>
          <label className="cursor-pointer bg-red-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Cargar Nómina
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'employees')} />
          </label>
        </div>
        <div className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-600"><Network className="w-8 h-8" /></div>
          <h3 className="text-sm font-black uppercase italic tracking-tight">Maestro Estructura (CECOs)</h3>
          <label className="cursor-pointer bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Cargar Estructura
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'hierarchy')} />
          </label>
        </div>
      </div>
    </div>
  );
};
