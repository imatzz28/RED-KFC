import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import { SafeHandsCert, SafeHandsSettings, Employee } from '@/types';
import { 
  ShieldCheck, Upload, Download, Search, MapPin, 
  ChevronRight, ArrowLeft, FileDown, Plus, 
  Trash2, Filter, CheckCircle2, AlertCircle, Clock,
  Signature
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { safeHandsGenerator } from './utils/safeHandsGenerator';

const SafeHands: React.FC = () => {
  const { employees, restaurants, auth } = useAppStore();
  const [certs, setCerts] = useState<SafeHandsCert[]>([]);
  const [settings, setSettings] = useState<SafeHandsSettings>({ responsibleName: '' });
  const [view, setView] = useState<{ level: 'regions' | 'zones' | 'stores', region?: string, zone?: string }>({ level: 'regions' });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const hierarchy = dataService.getHierarchy();
  const canEdit = auth.user?.role === 'ADMIN' || auth.user?.role === 'COORDINATOR';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [certsData, settingsData] = await Promise.all([
        dataService.getSafeHandsCerts(),
        dataService.getSafeHandsSettings()
      ]);
      setCerts(certsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading Safe Hands data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Excel Import ───────────────────────────────────────────────────────────
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newCerts: SafeHandsCert[] = data.map((item: any) => {
          const cedula = String(item.Cédula || item.cedula || '').trim();
          const emp = employees.find(emp => emp.id === cedula);
          if (!emp) return null;

          const issueDate = item.Fecha_Emision || item.fecha_emision || item.Fecha || item.fecha;
          // Lógica simple para calcular vencimiento (1 año después)
          const d = new Date(issueDate);
          const expiryDate = new Date(d.setFullYear(d.getFullYear() + 1)).toISOString().split('T')[0];

          return {
            employeeId: cedula,
            restaurantId: emp.restaurant_id,
            issueDate: new Date(issueDate).toISOString().split('T')[0],
            expiryDate: expiryDate,
            certificateCode: `SH-${cedula}-${new Date().getTime()}`
          };
        }).filter(c => c !== null) as SafeHandsCert[];

        if (newCerts.length > 0) {
          await dataService.saveSafeHandsCerts(newCerts);
          await loadData();
          alert(`${newCerts.length} certificados cargados correctamente.`);
        }
      } catch (err) {
        alert("Error al procesar el archivo Excel. Verifica el formato.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
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
    await dataService.updateSafeHandsSettings(settings);
    setShowSettings(false);
    alert("Configuración guardada correctamente.");
  };

  const handleDownload = async (cert: SafeHandsCert, emp: Employee) => {
    try {
      await safeHandsGenerator.downloadCertificate(cert, emp, settings);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error al generar el certificado.");
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

  const filteredRegions = useMemo(() => {
    const q = search.toLowerCase();
    return hierarchy.regions.filter(r => !q || r.name.toLowerCase().includes(q));
  }, [hierarchy, search]);

  const filteredZones = useMemo(() => {
    if (view.level !== 'zones') return [];
    const region = hierarchy.regions.find(r => r.name === view.region);
    const q = search.toLowerCase();
    return region?.zones.filter(z => !q || z.name.toLowerCase().includes(q)) || [];
  }, [hierarchy, view, search]);

  const filteredStores = useMemo(() => {
    if (view.level !== 'stores') return [];
    const region = hierarchy.regions.find(r => r.name === view.region);
    const zone = region?.zones.find(z => z.name === view.zone);
    const q = search.toLowerCase();
    return zone?.restaurantIds.filter(id => {
      const rest = restaurants.find(r => r.id === id);
      return !q || id.toLowerCase().includes(q) || rest?.name.toLowerCase().includes(q);
    }) || [];
  }, [hierarchy, view, restaurants, search]);

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
            Certificaciones de Manipulación de Alimentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button onClick={() => setShowSettings(true)} className="p-3 bg-white border-2 border-slate-100 rounded-xl hover:border-red-500 transition-all shadow-sm">
                <Signature className="w-5 h-5 text-slate-400" />
              </button>
              <label className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Cargar Excel</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Navigation & Stats */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
             <input 
               type="text" 
               placeholder="Buscar por región, zona o tienda..." 
               className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:border-red-500 transition-all text-sm font-medium"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
        </div>

        {view.level !== 'regions' && (
          <button 
            onClick={() => setView({ level: view.level === 'stores' ? 'zones' : 'regions', region: view.region })}
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-600 transition mb-6 uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        )}

        {/* Level 1: Regions */}
        {view.level === 'regions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRegions.map(region => {
               const ids = region.zones.flatMap(z => z.restaurantIds);
               const empsInRegion = employees.filter(e => ids.includes(e.restaurant_id) && e.active);
               const certifiedCount = empsInRegion.filter(e => getEmpStatus(e.id) === 'VIGENTE').length;
               return (
                 <button 
                   key={region.name}
                   onClick={() => setView({ level: 'zones', region: region.name })}
                   className="group bg-slate-50/50 hover:bg-white p-5 rounded-[24px] border-2 border-transparent hover:border-red-100 transition-all text-left shadow-sm hover:shadow-xl"
                 >
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm text-red-600 group-hover:scale-110 transition-transform">
                       <MapPin className="w-5 h-5" />
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                   </div>
                   <h3 className="text-sm font-black text-slate-800 uppercase truncate mb-1">{region.name}</h3>
                   <div className="flex items-center justify-between">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{empsInRegion.length} Personal</p>
                     <p className="text-xs font-black text-emerald-600">{certifiedCount} <span className="text-[8px] text-slate-300 uppercase">Cert.</span></p>
                   </div>
                 </button>
               );
            })}
          </div>
        )}

        {/* Level 2: Zones */}
        {view.level === 'zones' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredZones.map(zone => {
               const empsInZone = employees.filter(e => zone.restaurantIds.includes(e.restaurant_id) && e.active);
               const certifiedCount = empsInZone.filter(e => getEmpStatus(e.id) === 'VIGENTE').length;
               return (
                 <button 
                   key={zone.name}
                   onClick={() => setView({ level: 'stores', region: view.region, zone: zone.name })}
                   className="group bg-slate-50/50 hover:bg-white p-5 rounded-[24px] border-2 border-transparent hover:border-red-100 transition-all text-left shadow-sm hover:shadow-xl"
                 >
                   <div className="flex justify-between items-start mb-4">
                     <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                       <ShieldCheck className="w-5 h-5" />
                     </div>
                     <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                   </div>
                   <h3 className="text-sm font-black text-slate-800 uppercase truncate mb-1">{zone.name}</h3>
                   <div className="flex items-center justify-between">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{empsInZone.length} Personal</p>
                     <p className="text-xs font-black text-emerald-600">{certifiedCount} <span className="text-[8px] text-slate-300 uppercase">Cert.</span></p>
                   </div>
                 </button>
               );
            })}
          </div>
        )}

        {/* Level 3: Stores Table */}
        {view.level === 'stores' && (
          <div className="space-y-6">
            {filteredStores.map(storeId => {
              const rest = restaurants.find(r => r.id === storeId);
              const empsInStore = employees.filter(e => e.restaurant_id === storeId && e.active);
              
              return (
                <div key={storeId} className="bg-slate-50/30 rounded-[28px] border border-slate-100 overflow-hidden">
                  <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase italic">{rest?.name || storeId}</h4>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{storeId} · {empsInStore.length} Personas</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
                          <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Emisión</th>
                          <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Vencimiento</th>
                          <th className="px-6 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                          <th className="px-6 py-3 text-right text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {empsInStore.map(emp => {
                          const cert = certs.find(c => c.employeeId === emp.id);
                          const status = getEmpStatus(emp.id);
                          return (
                            <tr key={emp.id} className="hover:bg-white transition-colors group">
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-700">{emp.name}</p>
                                <p className="text-[9px] font-mono text-slate-300">{emp.id}</p>
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                                {cert?.issueDate || '-'}
                              </td>
                              <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                                {cert?.expiryDate || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <StatusBadge status={status} />
                              </td>
                              <td className="px-6 py-4 text-right">
                                {cert && (
                                  <button 
                                    onClick={() => handleDownload(cert, emp)}
                                    className="p-2 bg-white border border-slate-100 rounded-lg text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <FileDown className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
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
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-3">
               <button onClick={() => setShowSettings(false)} className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400">Cancelar</button>
               <button onClick={saveSettings} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-200 transition-all hover:bg-red-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeHands;
