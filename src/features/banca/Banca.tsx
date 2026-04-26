import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  BancaData, StoreAssignment, StoreLeader, Certification, BancaRole,
  BANCA_ROLES, Employee
} from '@/types';
import { Building2, Users, Award, X, Save, Search, ChevronRight, UserPlus, MapPin, ArrowLeft, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const ALL_CERTS: Certification[] = ['GBR', 'GAR', 'GER'];

const CERT_COLORS: Record<Certification, string> = {
  GBR: 'bg-blue-100 text-blue-700 border-blue-200',
  GAR: 'bg-amber-100 text-amber-700 border-amber-200',
  GER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ROLE_COLORS: Record<BancaRole, string> = {
  'Gerente': 'bg-red-100 text-red-700',
  'Subgerente': 'bg-purple-100 text-purple-700',
  'Líder de turno': 'bg-sky-100 text-sky-700',
  'Entrenador': 'bg-orange-100 text-orange-700',
};

const emptyAssignment = (restaurantId: string): StoreAssignment => ({ restaurantId, members: [] });

// ─────────────────────────────────────────────────────────────────────────────
// Employee Search
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeSearch: React.FC<{
  allEmployees: Employee[];
  excludeIds: string[];
  onSelect: (emp: Employee) => void;
}> = ({ allEmployees, excludeIds, onSelect }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() =>
    allEmployees
      .filter(e => e.active && !excludeIds.includes(e.id))
      .filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search))
      .slice(0, 8),
    [allEmployees, excludeIds, search]
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50/40 transition-all">
        <UserPlus className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          className="flex-1 text-sm font-medium text-slate-700 bg-transparent outline-none placeholder:text-slate-300"
          placeholder="Buscar persona por nombre o cédula..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {filtered.map(emp => (
            <button key={emp.id} className="w-full text-left px-4 py-3 hover:bg-red-50 transition flex items-center gap-3 group"
              onMouseDown={() => { onSelect(emp); setSearch(''); setOpen(false); }}>
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-red-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:text-red-600 transition-all">
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                <p className="text-[10px] text-slate-400 uppercase">{emp.title} · {emp.restaurant_id}</p>
              </div>
              <p className="text-[10px] text-slate-300 font-mono">{emp.id}</p>
            </button>
          ))}
        </div>
      )}
      {open && search && filtered.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400">No se encontraron colaboradores activos</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Member Row
// ─────────────────────────────────────────────────────────────────────────────
const MemberRow: React.FC<{
  leader: StoreLeader;
  employee: Employee | undefined;
  onChangeRole: (role: BancaRole) => void;
  onToggleCert: (cert: Certification) => void;
  onRemove: () => void;
}> = ({ leader, employee, onChangeRole, onToggleCert, onRemove }) => (
  <div className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500 shrink-0">
        {employee?.name?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{employee?.name ?? leader.employeeId}</p>
        <p className="text-[10px] text-slate-400 uppercase">{employee?.title} · {employee?.restaurant_id}</p>
      </div>
      <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg transition text-slate-300 hover:text-red-500">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          value={leader.role}
          onChange={e => onChangeRole(e.target.value as BancaRole)}
          className={`text-[10px] font-black uppercase tracking-wider pl-2.5 pr-6 py-1.5 rounded-full border-0 outline-none appearance-none cursor-pointer ${ROLE_COLORS[leader.role]}`}
        >
          {BANCA_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 w-3 h-3 pointer-events-none opacity-50" />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <Award className="w-3 h-3 text-slate-300" />
        {ALL_CERTS.map(cert => (
          <button key={cert} onClick={() => onToggleCert(cert)}
            className={`text-[9px] font-black px-2 py-1 rounded-full border transition-all ${leader.certifications.includes(cert) ? CERT_COLORS[cert] : 'bg-slate-100 text-slate-300 border-slate-200 hover:bg-slate-200'}`}>
            {cert}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────────────────────────────────────
const EditModal: React.FC<{
  restaurantId: string;
  restaurantName: string;
  initialAssignment: StoreAssignment;
  allEmployees: Employee[];
  onClose: () => void;
  onSave: (a: StoreAssignment) => Promise<void>;
}> = ({ restaurantId, restaurantName, initialAssignment, allEmployees, onClose, onSave }) => {
  const [members, setMembers] = useState<StoreLeader[]>([...(initialAssignment.members ?? [])]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ restaurantId, members });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-8 pb-4 border-b border-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase italic">{restaurantName}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">CECO: {restaurantId}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Agregar persona</p>
            <EmployeeSearch
              allEmployees={allEmployees}
              excludeIds={members.map(m => m.employeeId)}
              onSelect={emp => setMembers(prev => [...prev, { employeeId: emp.id, role: 'Líder de turno', certifications: [] }])}
            />
          </div>

          {members.length > 0 ? (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipo asignado ({members.length})</p>
              <div className="space-y-2">
                {members.map((m, idx) => (
                  <MemberRow key={m.employeeId} leader={m}
                    employee={allEmployees.find(e => e.id === m.employeeId)}
                    onChangeRole={role => setMembers(prev => prev.map((x, i) => i === idx ? { ...x, role } : x))}
                    onToggleCert={cert => setMembers(prev => prev.map((x, i) => {
                      if (i !== idx) return x;
                      const certs = x.certifications.includes(cert) ? x.certifications.filter(c => c !== cert) : [...x.certifications, cert];
                      return { ...x, certifications: certs };
                    }))}
                    onRemove={() => setMembers(prev => prev.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-300">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">Sin personas asignadas</p>
              <p className="text-xs">Busca y agrega colaboradores arriba</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-50 shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Store Card
// ─────────────────────────────────────────────────────────────────────────────
const StoreCard: React.FC<{
  restaurantId: string;
  restaurantName: string;
  assignment: StoreAssignment;
  allEmployees: Employee[];
  canEdit: boolean;
  onEdit: () => void;
}> = ({ restaurantId, restaurantName, assignment, allEmployees, canEdit, onEdit }) => {
  const members = assignment.members ?? [];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-black text-white uppercase truncate">{restaurantName || restaurantId}</p>
            <p className="text-[9px] text-slate-400">CECO: {restaurantId}</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={onEdit} className="text-[9px] font-black uppercase px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shrink-0 ml-2">
            Editar
          </button>
        )}
      </div>
      <div className="px-4 py-3 flex-1 space-y-1.5">
        {members.length === 0
          ? <p className="text-[10px] text-slate-300 italic text-center py-3">Sin asignaciones</p>
          : members.map(m => {
              const emp = allEmployees.find(e => e.id === m.employeeId);
              return (
                <div key={m.employeeId} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                    {emp?.name?.charAt(0) ?? '?'}
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 truncate flex-1">{emp?.name ?? m.employeeId}</p>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[m.role]}`}>{m.role}</span>
                  <div className="flex gap-0.5">
                    {m.certifications.map(cert => (
                      <span key={cert} className={`text-[7px] font-black px-1 py-0.5 rounded-full border ${CERT_COLORS[cert]}`}>{cert}</span>
                    ))}
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Banca Component — Card Navigation
// ─────────────────────────────────────────────────────────────────────────────
type View = { level: 'regions' } | { level: 'zones'; region: string } | { level: 'stores'; region: string; zone: string };

const Banca: React.FC = () => {
  const { employees, restaurants, auth } = useAppStore();
  const [bancaData, setBancaData] = useState<BancaData>(() => dataService.getBancaData());
  const [view, setView] = useState<View>({ level: 'regions' });
  const [modal, setModal] = useState<{ restaurantId: string; restaurantName: string } | null>(null);
  const [search, setSearch] = useState('');

  const hierarchy = dataService.getHierarchy();
  const isAdmin = auth.user?.role === 'ADMIN';

  const getAssignment = (id: string) =>
    bancaData.assignments.find(a => a.restaurantId === id) ?? emptyAssignment(id);

  const handleSave = async (updated: StoreAssignment) => {
    const newBanca: BancaData = {
      assignments: [...bancaData.assignments.filter(a => a.restaurantId !== updated.restaurantId), updated]
    };
    await dataService.saveBancaData(newBanca);
    setBancaData(newBanca);
  };

  const countAssigned = (ids: string[]) =>
    ids.filter(id => (bancaData.assignments.find(a => a.restaurantId === id)?.members?.length ?? 0) > 0).length;

  // ── Excel Report ───────────────────────────────────────────────────────────
  const generateExcelReport = () => {
    const rows: Record<string, string>[] = [];

    hierarchy.regions.forEach(region => {
      region.zones.forEach(zone => {
        zone.restaurantIds.forEach(restId => {
          const rest = restaurants.find(r => r.id === restId);
          const assignment = bancaData.assignments.find(a => a.restaurantId === restId);
          const members = assignment?.members ?? [];

          if (members.length === 0) {
            rows.push({
              'Región': region.name,
              'Jefe de Área': zone.name,
              'CECO': restId,
              'Tienda': rest?.name ?? restId,
              'Cédula': '',
              'Nombre': 'Sin asignaciones',
              'Cargo (Sistema)': '',
              'Rol en Banca': '',
              'GBR - Gerencia Básica': '',
              'GAR - Gerencia Avanzada': '',
              'GER - Gerencia Experta': '',
            });
          } else {
            members.forEach(m => {
              const emp = employees.find(e => e.id === m.employeeId);
              rows.push({
                'Región': region.name,
                'Jefe de Área': zone.name,
                'CECO': restId,
                'Tienda': rest?.name ?? restId,
                'Cédula': m.employeeId,
                'Nombre': emp?.name ?? m.employeeId,
                'Cargo (Sistema)': emp?.title ?? '',
                'Rol en Banca': m.role,
                'GBR - Gerencia Básica': m.certifications.includes('GBR') ? '✓ Certificado' : '✗ Pendiente',
                'GAR - Gerencia Avanzada': m.certifications.includes('GAR') ? '✓ Certificado' : '✗ Pendiente',
                'GER - Gerencia Experta': m.certifications.includes('GER') ? '✓ Certificado' : '✗ Pendiente',
              });
            });
          }
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 28 },
      { wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 18 },
      { wch: 24 }, { wch: 24 }, { wch: 24 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Banca de Líderes');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Banca_Lideres_${date}.xlsx`);
  };

  // ── View: Regions ──────────────────────────────────────────────────────────
  const regionsView = useMemo(() => {
    const q = search.toLowerCase();
    return hierarchy.regions.filter(r => !q || r.name.toLowerCase().includes(q));
  }, [hierarchy, search]);

  // ── View: Zones ────────────────────────────────────────────────────────────
  const zonesView = useMemo(() => {
    if (view.level !== 'zones') return [];
    const region = hierarchy.regions.find(r => r.name === view.region);
    if (!region) return [];
    const q = search.toLowerCase();
    return region.zones.filter(z => !q || z.name.toLowerCase().includes(q));
  }, [hierarchy, view, search]);

  // ── View: Stores ───────────────────────────────────────────────────────────
  const storesView = useMemo(() => {
    if (view.level !== 'stores') return [];
    const region = hierarchy.regions.find(r => r.name === view.region);
    const zone = region?.zones.find(z => z.name === view.zone);
    if (!zone) return [];
    const q = search.toLowerCase();
    return zone.restaurantIds.filter(id => {
      const rest = restaurants.find(r => r.id === id);
      return !q || id.toLowerCase().includes(q) || rest?.name?.toLowerCase().includes(q);
    });
  }, [hierarchy, view, restaurants, search]);

  // ── Breadcrumb ─────────────────────────────────────────────────────────────
  const breadcrumb = () => {
    if (view.level === 'regions') return null;
    if (view.level === 'zones') return (
      <button onClick={() => { setView({ level: 'regions' }); setSearch(''); }}
        className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-600 transition mb-4">
        <ArrowLeft className="w-4 h-4" /> Todas las regiones / <span className="text-slate-700">{view.region}</span>
      </button>
    );
    return (
      <div className="flex items-center gap-2 text-xs font-black text-slate-400 mb-4 flex-wrap">
        <button onClick={() => { setView({ level: 'regions' }); setSearch(''); }} className="hover:text-red-600 transition flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Regiones
        </button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={() => { setView({ level: 'zones', region: (view as any).region }); setSearch(''); }} className="hover:text-red-600 transition">
          {(view as any).region}
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700">{(view as any).zone}</span>
      </div>
    );
  };

  const modalAssignment = modal ? getAssignment(modal.restaurantId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg"><Users className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">Banca de Líderes</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Jerarquía · Roles · Certificaciones</p>
            </div>
          </div>
          <button
            onClick={generateExcelReport}
            className="flex items-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            <FileDown className="w-4 h-4" />
            <span>Generar Reporte</span>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {ALL_CERTS.map(cert => (
            <div key={cert} className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full border ${CERT_COLORS[cert]}`}>
              <Award className="w-3 h-3" />
              {cert === 'GBR' ? 'GBR — Gerencia Básica de Restaurante' : cert === 'GAR' ? 'GAR — Gerencia Avanzada de Restaurante' : 'GER — Gerencia Experta de Restaurante'}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Area */}
      <div>
        {breadcrumb()}

        {/* LEVEL 1: Region Cards */}
        {view.level === 'regions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regionsView.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm">No hay regiones configuradas</p>
                <p className="text-slate-300 text-xs mt-1">Importa la jerarquía desde Administración</p>
              </div>
            )}
            {regionsView.map(region => {
              const allIds = region.zones.flatMap(z => z.restaurantIds);
              const assigned = countAssigned(allIds);
              return (
                <button key={region.name} onClick={() => { setView({ level: 'zones', region: region.name }); setSearch(''); }}
                  className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-red-200 transition-all overflow-hidden">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-700 group-hover:from-red-700 group-hover:to-red-500 transition-all p-4">
                    <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{region.name}</h3>
                    <p className="text-[10px] text-white/60 mt-0.5">{region.zones.length} zonas · {allIds.length} tiendas</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Asignadas</p>
                      <p className="text-xl font-black text-slate-800">{assigned}<span className="text-xs text-slate-300 font-bold">/{allIds.length}</span></p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* LEVEL 2: Zone Cards */}
        {view.level === 'zones' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zonesView.map(zone => {
              const assigned = countAssigned(zone.restaurantIds);
              return (
                <button key={zone.name} onClick={() => { setView({ level: 'stores', region: (view as any).region, zone: zone.name }); setSearch(''); }}
                  className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-red-200 transition-all overflow-hidden">
                  <div className="bg-gradient-to-br from-slate-700 to-slate-600 group-hover:from-red-600 group-hover:to-red-400 transition-all p-4">
                    <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{zone.name}</h3>
                    <p className="text-[10px] text-white/60 mt-0.5">{zone.restaurantIds.length} tiendas</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Asignadas</p>
                      <p className="text-xl font-black text-slate-800">{assigned}<span className="text-xs text-slate-300 font-bold">/{zone.restaurantIds.length}</span></p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* LEVEL 3: Store Cards */}
        {view.level === 'stores' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {storesView.map(restId => {
              const rest = restaurants.find(r => r.id === restId);
              return (
                <StoreCard key={restId} restaurantId={restId} restaurantName={rest?.name ?? restId}
                  assignment={getAssignment(restId)} allEmployees={employees} canEdit={isAdmin}
                  onEdit={() => setModal({ restaurantId: restId, restaurantName: rest?.name ?? restId })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && modalAssignment && (
        <EditModal restaurantId={modal.restaurantId} restaurantName={modal.restaurantName}
          initialAssignment={modalAssignment} allEmployees={employees}
          onClose={() => setModal(null)} onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Banca;
