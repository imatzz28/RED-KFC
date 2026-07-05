import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import { SafeHandsCert, SafeHandsSettings, SafeHandsPerson } from '@/types';
import { 
  ShieldCheck, Upload, Download, Search, 
  FileDown, Trash2, Signature,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import localforage from 'localforage';
import { safeHandsGenerator } from './utils/safeHandsGenerator';

const SafeHands: React.FC = () => {
  const { auth } = useAppStore();
  const [personnel, setPersonnel] = useState<SafeHandsPerson[]>([]);
  const [certs, setCerts] = useState<SafeHandsCert[]>([]);
  const [settings, setSettings] = useState<SafeHandsSettings>({ responsibleName: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Server-side pagination states
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [vigentesCount, setVigentesCount] = useState(0);
  const [vencidosCount, setVencidosCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const canEdit = auth.user?.role === 'ADMIN';

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset page on search
    }, 450);
    return () => clearTimeout(handler);
  }, [search]);

  // Load data when page or debouncedSearch changes
  useEffect(() => {
    loadData(page, debouncedSearch);
  }, [page, debouncedSearch]);

  const loadData = async (currentPage: number, searchVal: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch paginated personnel
      const { data: peopleData, total } = await dataService.getSafeHandsPersonnelPaginated(currentPage, 50, searchVal);
      setPersonnel(peopleData);
      setTotalRows(total);

      // 2. Fetch certs for these employees
      const employeeIds = peopleData.map(p => p.id);
      const [certsData, summaryCounts, settingsData] = await Promise.all([
        dataService.getSafeHandsCertsForEmployees(employeeIds),
        dataService.getSafeHandsSummaryCounts(),
        dataService.getSafeHandsSettings()
      ]);

      let activeSettings = settingsData;
      try {
        const localSettings = await localforage.getItem<SafeHandsSettings>('safe_hands_settings_local');
        if (localSettings) {
          activeSettings = {
            ...settingsData,
            ...localSettings
          };
        }
      } catch (err) {
        console.warn("Error leyendo safe_hands_settings_local:", err);
      }

      setCerts(certsData);
      setVigentesCount(summaryCounts.vigentes);
      setVencidosCount(summaryCounts.vencidos);
      setSettings(activeSettings);
    } catch (error) {
      console.error("Error loading Safe Hands data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Excel Import ───────────────────────────────────────────────────────────
  const parseSpanishDate = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    
    const months: { [key: string]: string } = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };

    try {
      const cleanStr = dateStr.toLowerCase().trim().replace(/\s+/g, ' ');
      const parts = cleanStr.split(' ');
      
      // Buscamos el año (el último grupo de 4 dígitos)
      const year = parts.find(p => /^\d{4}$/.test(p));
      // El día suele ser el primero
      const day = parts[0].padStart(2, '0');
      // El mes es cualquier palabra que coincida con nuestro diccionario
      const monthName = parts.find(p => months[p]);
      const month = monthName ? months[monthName] : null;

      if (day && month && year) {
        return `${year}-${month}-${day}`;
      }
      
      // Fallback si el formato es estándar
      const fallback = new Date(dateStr);
      if (!isNaN(fallback.getTime())) {
        return fallback.toISOString().split('T')[0];
      }
      return '';
    } catch (e) {
      console.error("Error parsing date:", dateStr);
      return '';
    }
  };

  const formatSpanishDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(day)} de ${months[parseInt(month) - 1]} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Mapeo: Cedula, Nombre, Fecha
        const newPeople: SafeHandsPerson[] = [];
        const newCerts: SafeHandsCert[] = [];

        data.forEach((item: any) => {
          const cedula = String(item.Cedula || item.cedula || item.Cédula || '').trim();
          if (!cedula) return;

          const name = String(item.Nombre || item.nombre || 'Sin Nombre').trim();
          const rawDate = item.Fecha || item.fecha || item.Fecha_Emision;
          
          if (!rawDate) return;

          let issueDate = '';

          if (rawDate instanceof Date) {
            // Si ya es un objeto Date (gracias a cellDates: true)
            issueDate = rawDate.toISOString().split('T')[0];
          } else {
            const dateStr = String(rawDate).trim();
            if (dateStr.includes(' de ')) {
              issueDate = parseSpanishDate(dateStr);
            } else if (dateStr.includes('/')) {
              // Formato DD/MM/YYYY
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                issueDate = `${year}-${month}-${day}`;
              }
            } else {
              // Intento estándar
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                issueDate = d.toISOString().split('T')[0];
              }
            }
          }

          if (!issueDate || issueDate === 'NaN-NaN-NaN' || issueDate.includes('undefined') || issueDate.startsWith('1970')) return;

          const d = new Date(issueDate);
          const expiryDate = new Date(d.setFullYear(d.getFullYear() + 1)).toISOString().split('T')[0];

          newPeople.push({
            id: cedula,
            name: name,
            lastIssueDate: issueDate
          });

          newCerts.push({
            employeeId: cedula,
            restaurantId: 'SAFE_HANDS_IND',
            issueDate: issueDate,
            expiryDate: expiryDate,
            certificateCode: `SH-${cedula}-${new Date(issueDate).getTime()}`
          });
        });

        if (newPeople.length > 0) {
          await dataService.saveSafeHandsPersonnel(newPeople);
          await dataService.saveSafeHandsCerts(newCerts);
          await loadData(page, debouncedSearch);
          alert(`${newPeople.length} registros procesados correctamente.`);
        }
      } catch (err) {
        console.error(err);
        alert("Error al procesar el archivo Excel. Verifica el formato de CM.xlsx.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Cedula': '12345678',
          'Nombre': 'Juan Perez',
          'Fecha': '2026-07-04'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
      XLSX.writeFile(wb, "Plantilla_SafeHands.xlsx");
    } catch (error) {
      console.error("Error al descargar la plantilla:", error);
      alert("Error al generar la plantilla de descarga.");
    }
  };

  // ── Signature Management ───────────────────────────────────────────────────
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      setSettings(prev => ({ ...prev, signatureBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    try {
      // 1. Guardar localmente primero (para asegurar persistencia inmediata en el navegador actual)
      await localforage.setItem('safe_hands_settings_local', settings);
      
      // 2. Intentar guardar en Supabase (puede fallar por políticas de RLS)
      try {
        await dataService.updateSafeHandsSettings(settings);
      } catch (dbErr) {
        console.warn("No se pudo persistir la firma en Supabase (RLS o conexión), usando respaldo local:", dbErr);
      }

      setShowSettings(false);
      setToastMessage("¡Firma actualizada correctamente!");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error al guardar la configuración local:", err);
      alert("Error local al guardar la firma.");
    }
  };

  const handleDownload = async (cert: SafeHandsCert, person: SafeHandsPerson) => {
    try {
      // Necesitamos adaptar SafeHandsPerson a lo que espera el generador si es necesario
      // pero por ahora pasamos el objeto directamente ya que tiene id y name
      await safeHandsGenerator.downloadCertificate(cert, person as any, settings);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el certificado.");
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await dataService.clearAllSafeHandsData(confirmEmail, confirmPassword);
      
      setShowDeleteConfirm(false);
      setConfirmEmail('');
      setConfirmPassword('');
      setToastMessage("¡Base de datos limpiada con éxito!");
      
      loadData(0, debouncedSearch);
      setPage(0);
      
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al borrar base de datos:", err);
      setDeleteError(err.message || "Error al autenticar administrador.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Logic ──────────────────────────────────────────────────────────────────
  const getEmpStatus = (empId: string) => {
    const cert = certs.find(c => c.employeeId === empId);
    if (!cert) return 'PENDIENTE';
    const expiry = new Date(cert.expiryDate);
    const today = new Date();
    if (expiry < today) return 'VENCIDO';
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 1);
    if (expiry < soon) return 'POR_VENCER';
    return 'VIGENTE';
  };

  const totalPages = Math.ceil(totalRows / 50);

  // ── UI Components ──────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      'VIGENTE': 'bg-emerald-50 text-emerald-600 border-emerald-100',
      'VENCIDO': 'bg-red-50 text-red-600 border-red-100',
      'POR_VENCER': 'bg-amber-50 text-amber-600 border-amber-100',
      'PENDIENTE': 'bg-slate-50 text-slate-400 border-slate-100'
    };
    return (
      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-red-600" />
            Safe Hands
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gestión Consolidada
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-red-600 hover:bg-red-50/20 transition-all shadow-sm group"
                title="Borrar todos los datos"
              >
                <Trash2 className="w-5 h-5 text-red-500 group-hover:scale-105 transition-transform" />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-red-500 transition-all shadow-sm">
                <Signature className="w-5 h-5 text-slate-400" />
              </button>
              <button 
                onClick={handleDownloadTemplate} 
                className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 hover:border-red-600 text-slate-700 hover:text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                title="Descargar Plantilla Excel para cargar base de datos"
              >
                <Download className="w-4 h-4 text-red-600" />
                <span>Descargar Plantilla</span>
              </button>
              <label className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Cargar Consolidado</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Main List Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm min-h-[600px] flex flex-col">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
           <div className="relative flex-1 w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
             <input 
               type="text" 
               placeholder="Buscar por nombre o cédula..." 
               className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-red-500 transition-all text-sm font-medium"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
           <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-2xl shrink-0">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full" />
               <span className="text-[10px] font-black text-slate-400 uppercase">Vigentes: {vigentesCount}</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-red-500 rounded-full" />
               <span className="text-[10px] font-black text-slate-400 uppercase">Vencidos: {vencidosCount}</span>
             </div>
           </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando Personal Safe Hands...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
                  <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Emisión</th>
                  <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                  <th className="px-6 py-3 text-right text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personnel.map(person => {
                  const cert = certs.find(c => c.employeeId === person.id);
                  const status = getEmpStatus(person.id);
                  return (
                    <tr key={person.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700 uppercase">{person.name}</p>
                        <p className="text-[9px] font-mono text-slate-300">{person.id}</p>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                        {formatSpanishDate(cert?.issueDate || '')}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                        {formatSpanishDate(cert?.expiryDate || '')}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-all">
                          {cert && (
                            <>
                              
                              <button 
                                onClick={() => handleDownload(cert, person)}
                                className="p-2 bg-white border border-slate-100 rounded-lg text-red-600 hover:bg-red-50 transition-all shadow-sm"
                                title="Descargar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-slate-50">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-slate-100 bg-white hover:border-red-500 hover:text-red-600 disabled:opacity-50 disabled:hover:border-slate-100 disabled:hover:text-slate-800 transition-all shadow-sm"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">
              Página {page + 1} de {totalPages} ({totalRows} registros)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 border-slate-100 bg-white hover:border-red-500 hover:text-red-600 disabled:opacity-50 disabled:hover:border-slate-100 disabled:hover:text-slate-800 transition-all shadow-sm"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>


      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-900 text-white">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Ajustes Safe Hands</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Configuración de Certificados</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre del Responsable</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-red-500 transition-all text-xs font-bold"
                  value={settings.responsibleName}
                  onChange={e => setSettings(prev => ({ ...prev, responsibleName: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Firma Digital (PNG/SVG)</label>
                <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  {settings.signatureBase64 ? (
                    <div className="relative group">
                      <img src={settings.signatureBase64} alt="Firma" className="max-h-24 object-contain" />
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, signatureBase64: undefined }))}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Signature className="w-10 h-10 text-slate-200" />
                      <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600 transition-all shadow-sm">
                        Cargar Imagen
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                    </>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-3 text-center">
                  Dimensiones recomendadas: 300 x 100 px (relación 3:1) en formato PNG con fondo transparente.
                </p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-3">
               <button onClick={() => setShowSettings(false)} className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
               <button onClick={saveSettings} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-200 transition-all hover:bg-red-700">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => { if (!isDeleting) setShowDeleteConfirm(false); }} />
          <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-red-50 bg-red-600 text-white">
              <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <AlertCircle className="w-6 h-6 animate-bounce" />
                ¿Confirmar Borrado Total?
              </h3>
              <p className="text-[10px] text-red-100 font-bold uppercase tracking-[0.2em] mt-1">
                Esta acción eliminará todos los carnets y personal de manipulación
              </p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-[10px] font-bold text-red-600 uppercase leading-relaxed">
                ¡Advertencia! Se eliminará toda la información almacenada en las tablas de manipuladores de alimentos de forma irreversible. Por seguridad, valide sus credenciales de Administrador.
              </div>

              {deleteError && (
                <div className="bg-red-100 border border-red-200 rounded-2xl p-4 text-[10px] font-bold text-red-700 uppercase">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Correo de Administrador</label>
                <input 
                  type="email" 
                  disabled={isDeleting}
                  placeholder="admin@kfc.co"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-red-500 transition-all text-xs font-bold"
                  value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contraseña</label>
                <input 
                  type="password" 
                  disabled={isDeleting}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-red-500 transition-all text-xs font-bold"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-3">
               <button 
                 disabled={isDeleting}
                 onClick={() => {
                   setShowDeleteConfirm(false);
                   setConfirmEmail('');
                   setConfirmPassword('');
                   setDeleteError('');
                 }} 
                 className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-50"
               >
                 Cancelar
               </button>
               <button 
                 disabled={isDeleting || !confirmEmail || !confirmPassword}
                 onClick={handleDeleteAllData} 
                 className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-200 transition-all hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {isDeleting ? (
                   <>
                     <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     <span>Borrando...</span>
                   </>
                 ) : (
                   <span>Confirmar Borrado</span>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] flex items-center gap-3 px-5 py-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SafeHands;
