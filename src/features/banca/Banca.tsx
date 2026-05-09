import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  BancaData, StoreAssignment, StoreLeader, Certification, BancaRole,
  BANCA_ROLES, Employee, StoreIdeal
} from '@/types';
import { Building2, Users, Award, X, Save, Search, ChevronRight, UserPlus, MapPin, ArrowLeft, FileDown, Target, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

const ALL_CERTS: Certification[] = ['EEA', 'GBR', 'GAR', 'GER'];

const CERT_COLORS: Record<Certification, string> = {
  GBR: 'bg-blue-100 text-blue-700 border-blue-200',
  GAR: 'bg-red-100 text-red-700 border-red-200',
  GER: 'bg-slate-900 text-white border-slate-900',
  EEA: 'bg-slate-200 text-slate-700 border-slate-300',
};

const ROLE_COLORS: Record<BancaRole, string> = {
  'Gerente': 'bg-red-100 text-red-700',
  'Subgerente': 'bg-purple-100 text-purple-700',
  'Líder de turno': 'bg-sky-100 text-sky-700',
  'Entrenador': 'bg-orange-100 text-orange-700',
  'Entrenador HRS': 'bg-amber-100 text-amber-700',
  'Licencia en Curso': 'bg-slate-100 text-slate-700',
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
        {employee && (
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="font-bold uppercase tracking-wide bg-slate-100 px-1.5 py-0.5 rounded">{employee.title}</span>
            <span className="opacity-50">|</span>
            <span className="font-mono text-[9px] uppercase tracking-widest">{employee.restaurant_id}</span>
          </p>
        )}
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
  initialIdeal?: StoreIdeal;
  allEmployees: Employee[];
  onClose: () => void;
  onSave: (a: StoreAssignment, ideal: StoreIdeal) => Promise<void>;
}> = ({ restaurantId, restaurantName, initialAssignment, initialIdeal, allEmployees, onClose, onSave }) => {
  const [members, setMembers] = useState<StoreLeader[]>([...(initialAssignment.members ?? [])]);
  const [ideal, setIdeal] = useState<StoreIdeal>(initialIdeal ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ restaurantId, members }, ideal);
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

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="grid grid-cols-3 gap-4 pb-6 border-b border-slate-50">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ideal Gerentes</label>
              <input type="number" min="0" value={ideal.gerentes} onChange={e => setIdeal({...ideal, gerentes: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-center outline-none focus:border-red-400 transition-all" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ideal Líderes</label>
              <input type="number" min="0" value={ideal.lideresTurno} onChange={e => setIdeal({...ideal, lideresTurno: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-center outline-none focus:border-red-400 transition-all" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ideal Entrenadores</label>
              <input type="number" min="0" value={ideal.entrenadores} onChange={e => setIdeal({...ideal, entrenadores: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-center outline-none focus:border-red-400 transition-all" />
            </div>
          </div>

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
// Compliance Summary
// ─────────────────────────────────────────────────────────────────────────────
const ComplianceSummary: React.FC<{
  title: string;
  subtitle: string;
  restaurantIds: string[];
  bancaData: BancaData;
  onExport: () => void;
}> = ({ title, subtitle, restaurantIds, bancaData, onExport }) => {
  let idealGerentes = 0;
  let realGerentes = 0;
  let idealLideres = 0;
  let realLideres = 0;
  let idealEntrenadores = 0;
  let realEntrenadores = 0;

  restaurantIds.forEach(id => {
    const assignment = bancaData.assignments.find(a => a.restaurantId === id);
    const members = assignment?.members ?? [];
    const ideal = bancaData.storeIdeals?.[id] ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };

    idealGerentes += ideal.gerentes;
    realGerentes += members.filter(m => m.role === 'Gerente' || m.role === 'Subgerente').length;

    idealLideres += ideal.lideresTurno;
    realLideres += members.filter(m => m.role === 'Líder de turno' || m.role === 'Licencia en Curso').length;

    idealEntrenadores += ideal.entrenadores;
    realEntrenadores += members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;
  });

  const getPercent = (real: number, ideal: number) => Math.min(100, Math.round((real / (ideal || 1)) * 100));
  
  const pctGerentes = getPercent(realGerentes, idealGerentes);
  const pctLideres = getPercent(realLideres, idealLideres);
  const pctEntrenadores = getPercent(realEntrenadores, idealEntrenadores);

  const StatCard = ({ title, icon, real, ideal, pct, colorClass, barColor }: any) => (
    <div className="bg-white rounded-3xl border-2 border-slate-100 p-5 relative overflow-hidden group hover:border-red-200 transition-all shadow-sm hover:shadow-xl">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass}`} />
      
      <div className="flex justify-between items-start mb-4 relative">
        <div className={`p-3 rounded-2xl ${colorClass} text-white shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline justify-end gap-1 mt-1">
            <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{real}</span>
            <span className="text-sm font-bold text-slate-400">/ {ideal}</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cumplimiento</span>
          <span className={`text-xs font-black ${pct >= 100 ? 'text-emerald-500' : 'text-slate-700'}`}>{pct}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className={`h-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-2 mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">{title}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
            {subtitle} <span className="w-1 h-1 bg-slate-300 rounded-full" /> {restaurantIds.length} tiendas
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
        >
          <FileDown className="w-4 h-4" />
          <span>Generar Reporte</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Gerentes" 
          icon={<Award className="w-6 h-6" />} 
          real={realGerentes} 
          ideal={idealGerentes} 
          pct={pctGerentes} 
          colorClass="bg-red-500" 
          barColor="bg-red-500" 
        />
        <StatCard 
          title="Líderes de Turno" 
          icon={<Users className="w-6 h-6" />} 
          real={realLideres} 
          ideal={idealLideres} 
          pct={pctLideres} 
          colorClass="bg-blue-500" 
          barColor="bg-blue-500" 
        />
        <StatCard 
          title="Entrenadores" 
          icon={<Target className="w-6 h-6" />} 
          real={realEntrenadores} 
          ideal={idealEntrenadores} 
          pct={pctEntrenadores} 
          colorClass="bg-orange-500" 
          barColor="bg-orange-500" 
        />
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
  ideal?: StoreIdeal;
  allEmployees: Employee[];
  canEdit: boolean;
  onEdit: () => void;
}> = ({ restaurantId, restaurantName, assignment, ideal, allEmployees, canEdit, onEdit }) => {
  const members = assignment.members ?? [];
  const currentIdeal = ideal ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };
  
  const adminIdeal = currentIdeal.gerentes + currentIdeal.lideresTurno;
  const currentAdmin = members.filter(m => m.role !== 'Entrenador').length;
  const adminPercent = Math.min(100, Math.round((currentAdmin / (adminIdeal || 1)) * 100));

  const opIdeal = currentIdeal.entrenadores;
  const currentOp = members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;
  const opPercent = Math.min(100, Math.round((currentOp / (opIdeal || 1)) * 100));

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
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Admin</p>
              <p className={`text-[10px] font-black leading-none ${adminPercent >= 100 ? 'text-emerald-400' : 'text-white'}`}>{adminPercent}%</p>
            </div>
            <div className="text-right">
              <p className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Op</p>
              <p className={`text-[10px] font-black leading-none ${opPercent >= 100 ? 'text-emerald-400' : 'text-white'}`}>{opPercent}%</p>
            </div>
          </div>
          {canEdit && (
            <button onClick={onEdit} className="text-[9px] font-black uppercase px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all">
              Editar
            </button>
          )}
        </div>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 truncate">{emp?.name ?? m.employeeId}</p>
                    {emp && <p className="text-[8px] text-slate-400 font-medium truncate uppercase">{emp.title} · {emp.restaurant_id}</p>}
                  </div>
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
  const canEdit = auth.user?.role === 'ADMIN' || auth.user?.role === 'COORDINATOR' || auth.user?.role === 'LIDER';

  const getAssignment = (id: string) =>
    bancaData.assignments.find(a => a.restaurantId === id) ?? emptyAssignment(id);

  const handleSave = async (updated: StoreAssignment, ideal: StoreIdeal) => {
    const newBanca: BancaData = {
      assignments: [...bancaData.assignments.filter(a => a.restaurantId !== updated.restaurantId), updated],
      storeIdeals: { ...(bancaData.storeIdeals || {}), [updated.restaurantId]: ideal }
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
      if (!rest) return false;
      return !q || id.toLowerCase().includes(q) || rest.name.toLowerCase().includes(q);
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

  let summaryTitle = "Cumplimiento Nacional";
  let summarySubtitle = "Resumen de todas las regiones";
  let summaryIds: string[] = [];

  if (view.level === 'regions') {
    summaryIds = hierarchy.regions.flatMap(r => r.zones.flatMap(z => z.restaurantIds)).filter(id => restaurants.some(r => r.id === id));
  } else if (view.level === 'zones') {
    summaryTitle = `Cumplimiento Región: ${view.region}`;
    summarySubtitle = "Resumen regional";
    const region = hierarchy.regions.find(r => r.name === view.region);
    summaryIds = region ? region.zones.flatMap(z => z.restaurantIds).filter(id => restaurants.some(r => r.id === id)) : [];
  } else if (view.level === 'stores') {
    summaryTitle = `Cumplimiento Jefe de Área: ${view.zone}`;
    summarySubtitle = `Región ${view.region}`;
    const region = hierarchy.regions.find(r => r.name === view.region);
    const zone = region?.zones.find(z => z.name === view.zone);
    summaryIds = zone ? zone.restaurantIds.filter(id => restaurants.some(r => r.id === id)) : [];
  }

  return (
    <div className="space-y-6">
      {/* Navigation Area */}
      <div>
        {breadcrumb()}

        <ComplianceSummary title={summaryTitle} subtitle={summarySubtitle} restaurantIds={summaryIds} bancaData={bancaData} onExport={generateExcelReport} />

        {/* LEVEL 1: Region Cards */}
        {view.level === 'regions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regionsView.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-bold text-sm">No hay regiones configuradas</p>
                <p className="text-slate-300 text-xs mt-1">Importa la jerarquía desde Administración</p>
              </div>
            )}
            {regionsView.map(region => {
              const allIds = region.zones.flatMap(z => z.restaurantIds).filter(id => restaurants.some(r => r.id === id));
              const assigned = countAssigned(allIds);
              return (
                <button key={region.name} onClick={() => { setView({ level: 'zones', region: region.name }); setSearch(''); }}
                  className="group text-left bg-white rounded-[24px] shadow-md hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Header: Dark Style */}
                  <div className="flex h-20 bg-[#1a1c23]">
                    <div className="w-12 bg-[#e60000] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5 pt-1 opacity-20">
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                      </div>
                      <span className="text-white font-black text-[8px] tracking-tighter mt-0.5 relative z-10">KFC</span>
                    </div>
                    <div className="flex-1 flex items-center px-4 gap-3">
                      <div className="w-10 h-10 bg-red-700/80 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{region.name}</h3>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                           <span className="w-1 h-1 bg-red-500 rounded-full" /> {region.zones.length} zonas | {allIds.length} tiendas
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Body: White Footer */}
                  <div className="px-4 py-3 flex items-center justify-between bg-white flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shadow-inner">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] text-red-600 uppercase tracking-[0.2em] font-black mb-0.5">Asignadas</p>
                        <p className="text-xl font-black text-slate-900 leading-none">
                          {assigned}<span className="text-[10px] text-slate-300 ml-0.5 font-bold">/{allIds.length}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* LEVEL 2: Zone Cards */}
        {view.level === 'zones' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {zonesView.map(zone => {
              const validIds = zone.restaurantIds.filter(id => restaurants.some(r => r.id === id));
              const assigned = countAssigned(validIds);
              return (
                <button key={zone.name} onClick={() => { setView({ level: 'stores', region: (view as any).region, zone: zone.name }); setSearch(''); }}
                  className="group text-left bg-white rounded-[24px] shadow-md hover:shadow-2xl border border-slate-100 hover:border-red-200 transition-all duration-300 overflow-hidden flex flex-col">
                  {/* Header: Dark Style */}
                  <div className="flex h-20 bg-[#2d333d]">
                    <div className="w-12 bg-[#e60000] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5 pt-1 opacity-20">
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                        <div className="w-0.5 h-3 bg-white/40 rounded-full" />
                      </div>
                      <span className="text-white font-black text-[8px] tracking-tighter mt-0.5 relative z-10">KFC</span>
                    </div>
                    <div className="flex-1 flex items-center px-4 gap-3">
                      <div className="w-10 h-10 bg-red-600/80 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{zone.name}</h3>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                           <span className="w-1 h-1 bg-red-500 rounded-full" /> {validIds.length} tiendas
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Body: White Footer */}
                  <div className="px-4 py-3 flex items-center justify-between bg-white flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shadow-inner">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] text-red-600 uppercase tracking-[0.2em] font-black mb-0.5">Asignadas</p>
                        <p className="text-xl font-black text-slate-900 leading-none">
                          {assigned}<span className="text-[10px] text-slate-300 ml-0.5 font-bold">/{validIds.length}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform" />
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
                  assignment={getAssignment(restId)} ideal={bancaData.storeIdeals?.[restId]} allEmployees={employees} canEdit={canEdit}
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
          initialAssignment={modalAssignment} initialIdeal={bancaData.storeIdeals?.[modal.restaurantId]} allEmployees={employees}
          onClose={() => setModal(null)} onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Banca;
