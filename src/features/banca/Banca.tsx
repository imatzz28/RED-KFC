import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  BancaData, StoreAssignment, StoreLeader, Certification, BancaRole,
  BANCA_ROLES, Employee, StoreIdeal, UserRole, StoreCategory, HierarchyData, Restaurant,
  BancaExternalPerson
} from '@/types';
import {
  Store, Building2, Users, Award, X, Save, Search, ChevronRight, ChevronLeft,
  UserPlus, MapPin, ArrowLeft, FileDown, Download, Target, TrendingUp, Landmark,
  Plus, Check, Trash2, ChevronDown, AlertTriangle, Info, Calendar, BarChart3,
  Bell, Trophy, Medal, MinusCircle, FileText, CheckCircle2, Maximize2, Minimize2,
  Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ALL_CERTS: Certification[] = ['GER', 'GAR', 'GBR', 'EAE'];

const CERT_NAMES: Record<Certification, string> = {
  GER: 'Gerencia Experta de Restaurante',
  GAR: 'Gerencia Avanzada de Restaurante',
  GBR: 'Gerencia Básica de Restaurante',
  EAE: 'Entrenando al Entrenador',
};

const CERT_COLORS: Record<Certification, string> = {
  GER: 'bg-slate-900 text-white border-slate-950',
  GAR: 'bg-red-500 text-white border-red-600',
  GBR: 'bg-blue-500 text-white border-blue-600',
  EAE: 'bg-emerald-600 text-white border-emerald-700',
};

const normalizeCerts = (certs: (Certification | string)[] = []): Certification[] => {
  return Array.from(
    new Set(
      (certs || [])
        .map(c => (c === 'EEA' ? 'EAE' : c))
        .filter((c): c is Certification => ALL_CERTS.includes(c as Certification))
    )
  );
};

const ROLE_COLORS: Record<BancaRole, string> = {
  'Gerente': 'bg-red-100 text-red-700 border-red-200',
  'Subgerente': 'bg-purple-100 text-purple-700 border-purple-200',
  'Líder de turno': 'bg-sky-100 text-sky-700 border-sky-200',
  'Entrenador': 'bg-amber-100 text-amber-700 border-amber-200',
  'Entrenador HRS': 'bg-orange-100 text-orange-700 border-orange-200',
  'Potencial': 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLE_GROUPS: { label: string; roles: BancaRole[]; badgeBg: string; textCol: string }[] = [
  { label: 'Gerente', roles: ['Gerente'], badgeBg: 'bg-red-600/10 text-red-700', textCol: 'text-red-500' },
  { label: 'Subgerente', roles: ['Subgerente'], badgeBg: 'bg-purple-600/10 text-purple-700', textCol: 'text-purple-500' },
  { label: 'Líder de Turno', roles: ['Líder de turno'], badgeBg: 'bg-sky-600/10 text-sky-700', textCol: 'text-sky-500' },
  { label: 'Potencial', roles: ['Potencial'], badgeBg: 'bg-slate-600/10 text-slate-700', textCol: 'text-slate-400' },
  { label: 'Entrenadores', roles: ['Entrenador'], badgeBg: 'bg-amber-600/10 text-amber-700', textCol: 'text-amber-500' },
  { label: 'Entrenadores operativos', roles: ['Entrenador HRS'], badgeBg: 'bg-orange-600/10 text-orange-700', textCol: 'text-orange-500' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store Settings Modal (Categorización A/B/C/D e Ideales de la Tienda)
// ─────────────────────────────────────────────────────────────────────────────
const StoreSettingsModal: React.FC<{
  restaurantId: string;
  restaurantName: string;
  zoneName: string;
  initialIdeal: StoreIdeal;
  canEdit: boolean;
  onClose: () => void;
  onSave: (ideal: StoreIdeal) => Promise<void>;
}> = ({ restaurantId, restaurantName, zoneName, initialIdeal, canEdit, onClose, onSave }) => {
  const [ideal, setIdeal] = useState<StoreIdeal>({
    gerentes: initialIdeal?.gerentes ?? 1,
    lideresTurno: initialIdeal?.lideresTurno ?? 4,
    entrenadores: initialIdeal?.entrenadores ?? 4,
    category: initialIdeal?.category
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(ideal);
    setSaving(false);
    onClose();
  };

  const categories: { key: StoreCategory; label: string; desc: string; activeBg: string }[] = [
    { key: 'A', label: 'Categoría A', desc: 'Alto volumen', activeBg: 'bg-amber-500 text-white border-amber-600 shadow-md' },
    { key: 'B', label: 'Categoría B', desc: 'Volumen medio', activeBg: 'bg-blue-600 text-white border-blue-700 shadow-md' },
    { key: 'C', label: 'Categoría C', desc: 'Volumen estándar', activeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-md' },
    { key: 'D', label: 'Categoría D', desc: 'Volumen reducido', activeBg: 'bg-purple-600 text-white border-purple-700 shadow-md' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header KFC */}
        <div className="bg-gradient-to-r from-[#e60000] to-red-700 p-6 text-white relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/30 shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight">{restaurantName}</h3>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">
                  CECO: {restaurantId} · {zoneName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-160px)]">
          {/* Categoría A, B, C */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Categoría de Tienda
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map(c => {
                const isSelected = ideal.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setIdeal({ ...ideal, category: c.key })}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      isSelected
                        ? c.activeBg
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-xs font-black uppercase tracking-tight">{c.label}</span>
                    <span className={`text-[8px] font-bold mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {c.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ideales */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Planta Ideal Requerida
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gerentes</label>
                <input
                  type="number"
                  min="0"
                  disabled={!canEdit}
                  value={ideal.gerentes}
                  onChange={e => setIdeal({ ...ideal, gerentes: parseInt(e.target.value) || 0 })}
                  className="w-full text-center font-black text-base bg-white border border-slate-200 rounded-xl py-1 outline-none focus:border-red-500"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Líderes Turno</label>
                <input
                  type="number"
                  min="0"
                  disabled={!canEdit}
                  value={ideal.lideresTurno}
                  onChange={e => setIdeal({ ...ideal, lideresTurno: parseInt(e.target.value) || 0 })}
                  className="w-full text-center font-black text-base bg-white border border-slate-200 rounded-xl py-1 outline-none focus:border-red-500"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Entrenadores</label>
                <input
                  type="number"
                  min="0"
                  disabled={!canEdit}
                  value={ideal.entrenadores}
                  onChange={e => setIdeal({ ...ideal, entrenadores: parseInt(e.target.value) || 0 })}
                  className="w-full text-center font-black text-base bg-white border border-slate-200 rounded-xl py-1 outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
          >
            Cancelar
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-1.5"
            >
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal Flotante de Detalle de Persona
// ─────────────────────────────────────────────────────────────────────────────
const PersonDetailModal: React.FC<{
  leader: StoreLeader;
  employee?: Employee;
  externalPerson?: BancaExternalPerson;
  restaurantId: string;
  restaurantName: string;
  zoneName: string;
  canEdit: boolean;
  onClose: () => void;
  onUpdateRole: (newRole: BancaRole) => void;
  onToggleCert: (cert: Certification) => void;
  onRemove: () => void;
}> = ({ leader, employee, externalPerson, restaurantId, restaurantName, zoneName, canEdit, onClose, onUpdateRole, onToggleCert, onRemove }) => {
  const displayName = externalPerson?.name || employee?.name || leader.employeeId;
  const isExternal = Boolean(externalPerson);

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Decorativo KFC */}
        <div className="bg-gradient-to-r from-[#e60000] to-red-700 p-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl ${isExternal ? 'bg-amber-400/30 text-amber-100' : 'bg-white/20 text-white'} backdrop-blur-md flex items-center justify-center text-xl font-black shadow-inner border border-white/30`}>
                {displayName.charAt(0) || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase italic tracking-tight">{displayName}</h3>
                  {isExternal && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                      Operaciones
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">
                  ID / Cédula: {externalPerson?.document_id || leader.employeeId}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpos de Datos */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tienda Asignada</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{restaurantName}</p>
              <p className="text-[10px] text-slate-400 font-mono">{zoneName}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargo Sistema</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                {isExternal ? 'Personal de Operaciones' : (employee?.title ?? 'Sin definir')}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ingreso Compañía</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                {isExternal ? 'Operaciones' : (employee?.join_date ?? 'No registrada')}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CECO (Asignación)</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate font-mono">
                {employee?.restaurant_id ?? restaurantId}
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Rol en Banca</label>
            {canEdit ? (
              <div className="relative">
                <select
                  value={leader.role}
                  onChange={e => onUpdateRole(e.target.value as BancaRole)}
                  className={`w-full text-xs font-black uppercase tracking-wider px-4 py-3 rounded-xl border appearance-none outline-none cursor-pointer ${ROLE_COLORS[leader.role]}`}
                >
                  {BANCA_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60" />
              </div>
            ) : (
              <span className={`inline-block text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border ${ROLE_COLORS[leader.role]}`}>
                {leader.role}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Certificaciones Obtenidas
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {normalizeCerts(leader.certifications).length} de {ALL_CERTS.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {ALL_CERTS.map(cert => {
                const active = normalizeCerts(leader.certifications).includes(cert);
                return (
                  <button
                    key={cert}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && onToggleCert(cert)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? `${CERT_COLORS[cert]} shadow-md scale-[1.02]`
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div>
                      <p className="text-xs font-black tracking-wide">{cert}</p>
                      <p className={`text-[8px] font-medium leading-tight mt-0.5 ${active ? 'opacity-90' : 'text-slate-400'}`}>
                        {CERT_NAMES[cert]}
                      </p>
                    </div>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {canEdit && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { onRemove(); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Desvincular de Banca</span>
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal para Asignar Persona a Vacante
// ─────────────────────────────────────────────────────────────────────────────
const AssignPersonModal: React.FC<{
  restaurantId: string;
  restaurantName: string;
  targetRole: BancaRole;
  allEmployees: Employee[];
  externalPersonnel: BancaExternalPerson[];
  excludeIds: string[];
  onClose: () => void;
  onAssign: (emp: { id: string; name: string }, role: BancaRole) => void;
  onSaveExternalPerson: (person: BancaExternalPerson) => Promise<void>;
}> = ({ restaurantId, restaurantName, targetRole, allEmployees, externalPersonnel, excludeIds, onClose, onAssign, onSaveExternalPerson }) => {
  const [activeTab, setActiveTab] = useState<'payroll' | 'operations'>('payroll');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<BancaRole>(targetRole);
  const [selectedEmp, setSelectedEmp] = useState<{ id: string; name: string; title?: string; isExternal?: boolean } | null>(null);

  // Formulario Operaciones
  const [opFirstName, setOpFirstName] = useState('');
  const [opLastName, setOpLastName] = useState('');
  const [opDocId, setOpDocId] = useState('');
  const [isSavingOp, setIsSavingOp] = useState(false);

  const filteredPayroll = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allEmployees
      .filter(e => e.active && !excludeIds.includes(e.id))
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.id.includes(q) || e.restaurant_id.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allEmployees, excludeIds, search]);

  const filteredOperations = useMemo(() => {
    const q = search.toLowerCase().trim();
    return externalPersonnel
      .filter(p => !excludeIds.includes(p.id))
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || (p.document_id || '').includes(q));
  }, [externalPersonnel, excludeIds, search]);

  const handleCreateAndAssignExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    const fName = opFirstName.trim();
    const lName = opLastName.trim();
    if (!fName || !lName) return;

    const docId = opDocId.trim();
    const id = docId || `EXT-${Date.now().toString().slice(-6)}`;
    const fullName = `${fName} ${lName}`.toUpperCase();

    const newExternal: BancaExternalPerson = {
      id,
      first_name: fName.toUpperCase(),
      last_name: lName.toUpperCase(),
      name: fullName,
      document_id: docId || undefined,
      role_tag: 'Operaciones',
      created_at: new Date().toISOString()
    };

    setIsSavingOp(true);
    try {
      await onSaveExternalPerson(newExternal);
      onAssign(newExternal, selectedRole);
      onClose();
    } catch (err) {
      console.error('Error saving external person:', err);
    } finally {
      setIsSavingOp(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[100000] animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-50 p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
              ASIGNAR COLABORADOR
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase mt-0.5 tracking-tight">
              {restaurantName}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Tienda / CECO: <span className="font-bold text-slate-800">{restaurantId}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Tipo de Colaborador (Segmented Buttons) */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Colaborador</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('payroll'); setSelectedEmp(null); }}
                className={`px-3 py-3 rounded-xl border text-[10px] font-black uppercase text-center transition-all ${
                  activeTab === 'payroll' 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Colaboradores Nómina
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('operations'); setSelectedEmp(null); }}
                className={`px-3 py-3 rounded-xl border text-[10px] font-black uppercase text-center transition-all ${
                  activeTab === 'operations' 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Personal Operaciones
              </button>
            </div>
          </div>

          {/* Rol a Asignar */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rol en Banca</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as BancaRole)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:border-red-600 transition-all truncate cursor-pointer"
              >
                {BANCA_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* TAB 1: Nómina Activa */}
          {activeTab === 'payroll' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Buscar en Nómina</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nombre, cédula o CECO..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-9 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {filteredPayroll.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <UserPlus className="w-6 h-6 mx-auto mb-1 opacity-40 text-slate-400" />
                    <p className="text-[11px] font-bold">No se encontraron colaboradores activos</p>
                  </div>
                ) : (
                  filteredPayroll.map(emp => {
                    const isSelected = selectedEmp?.id === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmp(emp)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{emp.name}</p>
                            <p className={`text-[9px] uppercase truncate ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{emp.title} · CECO: {emp.restaurant_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${
                            isSelected ? 'bg-white/10 text-white border-white/20' : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            {emp.id}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Personal de Operaciones */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider block">
                  Registrar Nuevo Colaborador de Operaciones
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos"
                      value={opFirstName}
                      onChange={e => setOpFirstName(e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Apellido *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Gómez"
                      value={opLastName}
                      onChange={e => setOpLastName(e.target.value)}
                      className="w-full bg-white border-2 border-slate-100 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Cédula / Documento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 1020304050"
                    value={opDocId}
                    onChange={e => setOpDocId(e.target.value)}
                    className="w-full bg-white border-2 border-slate-100 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </div>

              {externalPersonnel.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider">O Seleccionar de Operaciones Existentes:</span>
                    <span className="text-[9px] font-bold">{filteredOperations.length}</span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {filteredOperations.map(p => {
                      const isSelected = selectedEmp?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedEmp({ id: p.id, name: p.name, isExternal: true })}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-slate-50 border-slate-150 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {p.name.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.name}</p>
                              <p className={`text-[9px] uppercase ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>Operaciones · ID: {p.document_id || p.id}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-slate-150 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
          >
            Cancelar
          </button>
          {activeTab === 'payroll' ? (
            <button
              type="button"
              disabled={!selectedEmp}
              onClick={() => {
                if (selectedEmp) {
                  onAssign(selectedEmp, selectedRole);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:hover:bg-red-300 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={(!selectedEmp && (!opFirstName.trim() || !opLastName.trim())) || isSavingOp}
              onClick={(e) => {
                if (selectedEmp) {
                  onAssign(selectedEmp, selectedRole);
                  onClose();
                } else {
                  handleCreateAndAssignExternal(e);
                }
              }}
              className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:hover:bg-red-300 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingOp ? 'Guardando...' : 'Guardar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal Dashboard Bancas (Filtrado Dinámicamente por Región / Zona / Tienda)
// ─────────────────────────────────────────────────────────────────────────────
const BancaDashboardModal: React.FC<{
  regionsList: HierarchyData['regions'];
  bancaData: BancaData;
  restaurants: Restaurant[];
  employees: Employee[];
  activeEmployeeIds: Set<string>;
  activeRegion?: string;
  activeZone?: string;
  activeStore?: string;
  onClose: () => void;
}> = ({ regionsList, bancaData, restaurants, employees, activeEmployeeIds, activeRegion, activeZone, activeStore, onClose }) => {
  // Filtrar el alcance de regiones/zonas/tiendas dinámicamente
  const filteredRegions = useMemo(() => {
    let list = regionsList;

    if (activeRegion) {
      list = list.filter(r => r.name === activeRegion);
    }

    if (activeZone && activeZone !== 'all') {
      list = list.map(r => ({
        ...r,
        zones: r.zones.filter(z => z.name === activeZone)
      })).filter(r => r.zones.length > 0);
    }

    if (activeStore && activeStore !== 'all') {
      list = list.map(r => ({
        ...r,
        zones: r.zones.map(z => ({
          ...z,
          restaurantIds: z.restaurantIds.filter(id => id === activeStore)
        })).filter(z => z.restaurantIds.length > 0)
      })).filter(r => r.zones.length > 0);
    }

    return list;
  }, [regionsList, activeRegion, activeZone, activeStore]);

  // Título dinámico según filtro aplicado
  const headerTitle = useMemo(() => {
    if (activeStore && activeStore !== 'all') {
      const r = restaurants.find(x => x.id === activeStore);
      return `Dashboard Bancas — Tienda: ${r?.name ?? activeStore}`;
    }
    if (activeZone && activeZone !== 'all') {
      return `Dashboard Bancas — Jefe de Área: ${activeZone}`;
    }
    if (activeRegion) {
      return `Dashboard Bancas — Región: ${activeRegion}`;
    }
    return `Dashboard Bancas`;
  }, [activeRegion, activeZone, activeStore, restaurants]);

  const analytics = useMemo(() => {
    let totalStores = 0;
    let totalIdealGerentes = 0;
    let totalRealGerentes = 0;
    let totalIdealLideres = 0;
    let totalRealLideres = 0;
    let totalIdealEntrenadores = 0;
    let totalRealEntrenadores = 0;
    let totalPotenciales = 0;
    let storesWithoutManager = 0;
    let storesZeroAssigned = 0;

    let certGBR = 0;
    let certGAR = 0;
    let certGER = 0;
    let certEAE = 0;

    let catA = 0;
    let catB = 0;
    let catC = 0;
    let catD = 0;
    let catNone = 0;

    const rankingStats: {
      name: string;
      storesCount?: number;
      compliancePct: number;
      realGerentes: number;
      idealGerentes: number;
    }[] = [];

    let rankingType: 'stores' | 'zones' | 'regions' = 'regions';

    // Determinar el desglose del Ranking
    if (activeZone && activeZone !== 'all') {
      // 1. Si se filtra un Jefe de Área específico -> Desglose por TIENDAS
      rankingType = 'stores';
      filteredRegions.forEach(region => {
        region.zones.forEach(zone => {
          zone.restaurantIds.forEach(id => {
            const rest = restaurants.find(r => r.id === id);
            if (!rest) return;

            const assignment = bancaData.assignments.find(a => a.restaurantId === id);
            const members = (assignment?.members ?? []).filter(m => activeEmployeeIds.has(m.employeeId));
            const ideal = bancaData.storeIdeals?.[id] ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };

            if (ideal.category === 'A') catA++;
            else if (ideal.category === 'B') catB++;
            else if (ideal.category === 'C') catC++;
            else if (ideal.category === 'D') catD++;
            else catNone++;

            const gCount = members.filter(m => m.role === 'Gerente' || m.role === 'Subgerente').length;
            const lCount = members.filter(m => m.role === 'Líder de turno').length;
            const eCount = members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;
            const pCount = members.filter(m => m.role === 'Potencial').length;

            if (gCount === 0) storesWithoutManager++;
            if (members.length === 0) storesZeroAssigned++;

            totalIdealGerentes += ideal.gerentes;
            totalRealGerentes += gCount;
            totalIdealLideres += ideal.lideresTurno;
            totalRealLideres += lCount;
            totalIdealEntrenadores += ideal.entrenadores;
            totalRealEntrenadores += eCount;
            totalPotenciales += pCount;

            totalStores++;

            const sIdealSum = (ideal.gerentes + ideal.lideresTurno + ideal.entrenadores);
            const sRealSum = (gCount + lCount + eCount);
            const pct = sIdealSum > 0 ? Math.min(100, Math.round((sRealSum / sIdealSum) * 100)) : 0;

            members.forEach(m => {
              const norm = normalizeCerts(m.certifications);
              if (norm.includes('GER')) certGER++;
              if (norm.includes('GAR')) certGAR++;
              if (norm.includes('GBR')) certGBR++;
              if (norm.includes('EAE')) certEAE++;
            });

            rankingStats.push({
              name: `${rest.name} (${id})`,
              compliancePct: pct,
              realGerentes: gCount,
              idealGerentes: ideal.gerentes,
            });
          });
        });
      });
    } else if (filteredRegions.length === 1 && filteredRegions[0].zones.length > 1) {
      // 2. Si se filtra 1 sola Región -> Desglose por JEFES DE ÁREA (ZONAS)
      rankingType = 'zones';
      const singleReg = filteredRegions[0];
      singleReg.zones.forEach(zone => {
        const zoneStoreIds = zone.restaurantIds.filter(id => restaurants.some(r => r.id === id));
        totalStores += zoneStoreIds.length;

        let zIdealSum = 0;
        let zRealSum = 0;
        let zRealG = 0;
        let zIdealG = 0;

        zoneStoreIds.forEach(id => {
          const assignment = bancaData.assignments.find(a => a.restaurantId === id);
          const members = (assignment?.members ?? []).filter(m => activeEmployeeIds.has(m.employeeId));
          const ideal = bancaData.storeIdeals?.[id] ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };

          if (ideal.category === 'A') catA++;
          else if (ideal.category === 'B') catB++;
          else if (ideal.category === 'C') catC++;
          else if (ideal.category === 'D') catD++;
          else catNone++;

          const gCount = members.filter(m => m.role === 'Gerente' || m.role === 'Subgerente').length;
          const lCount = members.filter(m => m.role === 'Líder de turno').length;
          const eCount = members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;
          const pCount = members.filter(m => m.role === 'Potencial').length;

          if (gCount === 0) storesWithoutManager++;
          if (members.length === 0) storesZeroAssigned++;

          totalIdealGerentes += ideal.gerentes;
          totalRealGerentes += gCount;
          totalIdealLideres += ideal.lideresTurno;
          totalRealLideres += lCount;
          totalIdealEntrenadores += ideal.entrenadores;
          totalRealEntrenadores += eCount;
          totalPotenciales += pCount;

          zRealG += gCount;
          zIdealG += ideal.gerentes;

          zIdealSum += (ideal.gerentes + ideal.lideresTurno + ideal.entrenadores);
          zRealSum += (gCount + lCount + eCount);

          members.forEach(m => {
            const norm = normalizeCerts(m.certifications);
            if (norm.includes('GER')) certGER++;
            if (norm.includes('GAR')) certGAR++;
            if (norm.includes('GBR')) certGBR++;
            if (norm.includes('EAE')) certEAE++;
          });
        });

        const pct = zIdealSum > 0 ? Math.min(100, Math.round((zRealSum / zIdealSum) * 100)) : 0;
        rankingStats.push({
          name: zone.name,
          storesCount: zoneStoreIds.length,
          compliancePct: pct,
          realGerentes: zRealG,
          idealGerentes: zIdealG,
        });
      });
    } else {
      // 3. Múltiples regiones (Vista Nacional) -> Desglose por REGIONES
      rankingType = 'regions';
      filteredRegions.forEach(region => {
        const regStoreIds = region.zones.flatMap(z => z.restaurantIds).filter(id => restaurants.some(r => r.id === id));
        totalStores += regStoreIds.length;

        let regIdealSum = 0;
        let regRealSum = 0;
        let regRealG = 0;
        let regIdealG = 0;

        regStoreIds.forEach(id => {
          const assignment = bancaData.assignments.find(a => a.restaurantId === id);
          const members = (assignment?.members ?? []).filter(m => activeEmployeeIds.has(m.employeeId));
          const ideal = bancaData.storeIdeals?.[id] ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };

          if (ideal.category === 'A') catA++;
          else if (ideal.category === 'B') catB++;
          else if (ideal.category === 'C') catC++;
          else if (ideal.category === 'D') catD++;
          else catNone++;

          const gCount = members.filter(m => m.role === 'Gerente' || m.role === 'Subgerente').length;
          const lCount = members.filter(m => m.role === 'Líder de turno').length;
          const eCount = members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;
          const pCount = members.filter(m => m.role === 'Potencial').length;

          if (gCount === 0) storesWithoutManager++;
          if (members.length === 0) storesZeroAssigned++;

          totalIdealGerentes += ideal.gerentes;
          totalRealGerentes += gCount;
          totalIdealLideres += ideal.lideresTurno;
          totalRealLideres += lCount;
          totalIdealEntrenadores += ideal.entrenadores;
          totalRealEntrenadores += eCount;
          totalPotenciales += pCount;

          regRealG += gCount;
          regIdealG += ideal.gerentes;

          regIdealSum += (ideal.gerentes + ideal.lideresTurno + ideal.entrenadores);
          regRealSum += (gCount + lCount + eCount);

          members.forEach(m => {
            const norm = normalizeCerts(m.certifications);
            if (norm.includes('GER')) certGER++;
            if (norm.includes('GAR')) certGAR++;
            if (norm.includes('GBR')) certGBR++;
            if (norm.includes('EAE')) certEAE++;
          });
        });

        const pct = regIdealSum > 0 ? Math.min(100, Math.round((regRealSum / regIdealSum) * 100)) : 0;
        rankingStats.push({
          name: region.name,
          storesCount: regStoreIds.length,
          compliancePct: pct,
          realGerentes: regRealG,
          idealGerentes: regIdealG,
        });
      });
    }

    const totalIdealGlobal = totalIdealGerentes + totalIdealLideres + totalIdealEntrenadores;
    const totalRealGlobal = totalRealGerentes + totalRealLideres + totalRealEntrenadores;
    const globalCompliancePct = totalIdealGlobal > 0 ? Math.min(100, Math.round((totalRealGlobal / totalIdealGlobal) * 100)) : 0;

    rankingStats.sort((a, b) => b.compliancePct - a.compliancePct);

    const totalCerts = certGBR + certGAR + certGER + certEAE;

    return {
      totalStores,
      globalCompliancePct,
      totalIdealGerentes,
      totalRealGerentes,
      totalIdealLideres,
      totalRealLideres,
      totalIdealEntrenadores,
      totalRealEntrenadores,
      totalPotenciales,
      storesWithoutManager,
      storesZeroAssigned,
      rankingStats,
      rankingType,
      totalCerts,
      certifications: { certGBR, certGAR, certGER, certEAE },
      categories: { catA, catB, catC, catD, catNone }
    };
  }, [filteredRegions, bancaData, restaurants, activeEmployeeIds, activeZone]);

  // Porcentajes para categorías
  const catTotal = analytics.totalStores || 1;
  const pctCatA = Math.round((analytics.categories.catA / catTotal) * 100);
  const pctCatB = Math.round((analytics.categories.catB / catTotal) * 100);
  const pctCatC = Math.round((analytics.categories.catC / catTotal) * 100);
  const pctCatD = Math.round((analytics.categories.catD / catTotal) * 100);
  const pctCatNone = Math.round((analytics.categories.catNone / catTotal) * 100);

  // Porcentajes de certificaciones (Todas las 4)
  const certTotal = analytics.totalCerts || 1;
  const pctGBR = Math.round((analytics.certifications.certGBR / certTotal) * 100);
  const pctGAR = Math.round((analytics.certifications.certGAR / certTotal) * 100);
  const pctGER = Math.round((analytics.certifications.certGER / certTotal) * 100);
  const pctEAE = Math.round((analytics.certifications.certEAE / certTotal) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
      <div
        className="relative bg-[#F8FAFC] text-slate-900 rounded-[32px] shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Principal */}
        <div className="bg-white px-6 py-3.5 flex items-center justify-between gap-4 border-b border-slate-200 shrink-0">
          {/* Título Limpio */}
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900 uppercase leading-tight">
              {headerTitle}
            </h2>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo Scrollable con Tema Claro Ultra Profesional */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-80px)] text-xs">
          {/* Top 4 KPI Cards (Fondo Blanco) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Cumplimiento Nacional / Cobertura Filtrada */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                    {activeZone ? 'CUMPLIMIENTO ZONA' : activeRegion ? 'CUMPLIMIENTO REGIONAL' : 'CUMPLIMIENTO NACIONAL'}
                  </p>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{analytics.globalCompliancePct}%</span>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {activeZone ? activeZone : activeRegion ? activeRegion : 'Global'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full transition-all duration-700" style={{ width: `${analytics.globalCompliancePct}%` }} />
                </div>
                <p className="text-[10px] font-bold text-slate-400">Meta: 100%</p>
              </div>
            </div>

            {/* Card 2: Vacantes Gerente / Sub */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">VACANTES GERENTE / SUB</p>
                  <div className="flex items-baseline justify-end gap-1 mt-1">
                    <span className="text-3xl font-black text-rose-600 tracking-tight">{analytics.storesWithoutManager}</span>
                    <span className="text-[10px] font-medium text-slate-400">de {analytics.totalStores} tiendas</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-medium text-rose-600/90 mt-3">Requieren atención prioritaria</p>
            </div>

            {/* Card 3: Cobertura de Gerentes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">COBERTURA DE GERENTES</p>
                  <div className="flex items-baseline justify-end gap-1 mt-1">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">{analytics.totalRealGerentes}</span>
                    <span className="text-xs font-bold text-slate-400">/ {analytics.totalIdealGerentes}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((analytics.totalRealGerentes / (analytics.totalIdealGerentes || 1)) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-400">
                  {Math.min(100, Math.round((analytics.totalRealGerentes / (analytics.totalIdealGerentes || 1)) * 100))}% del objetivo ideal
                </p>
              </div>
            </div>

            {/* Card 4: Fuerza de Potenciales */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">FUERZA DE POTENCIALES</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{analytics.totalPotenciales}</span>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      En preparación
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-3">Candidatos a Líderes de Turno</p>
            </div>
          </div>

          {/* Middle Section: Ranking (Left 60%) + Certificaciones y Tipología (Right 40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Columna Izquierda (60%): Ranking Dinámico por Región, Jefe de Área o Tiendas */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-red-600" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        {analytics.rankingType === 'stores' ? 'RANKING POR TIENDAS (CUMPLIMIENTO)' :
                         analytics.rankingType === 'zones' ? 'RANKING POR JEFE DE ÁREA (ZONAS)' :
                         'RANKING DE CUMPLIMIENTO POR REGIÓN'}
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        PORCENTAJE DE COBERTURA VS IDEALES POR UNIDAD OPERATIVA
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {analytics.rankingStats.length} {analytics.rankingType === 'stores' ? 'Tiendas' : analytics.rankingType === 'zones' ? 'Jefes de Área' : 'Regiones'}
                  </span>
                </div>

                <div className="mt-4 space-y-3.5 max-h-80 overflow-y-auto pr-1">
                  {analytics.rankingStats.map((item, idx) => {
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-lg bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-black text-slate-800 uppercase italic tracking-tight">
                              {item.name} {item.storesCount ? <span className="text-[9px] font-bold text-slate-400 uppercase font-normal">({item.storesCount} TIENDAS)</span> : null}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-500">
                              Gerentes: <strong className="text-slate-800">{item.realGerentes}/{item.idealGerentes}</strong>
                            </span>
                            <span className="font-black text-slate-900 text-xs">{item.compliancePct}%</span>
                          </div>
                        </div>

                        {/* Barra de Progreso Unificada */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full transition-all duration-700"
                            style={{ width: `${item.compliancePct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Columna Derecha (40%): Certificaciones y Tipología de Tiendas */}
            <div className="lg:col-span-5 space-y-5">
              {/* Box 1: Distribución de Certificaciones (Todas las 4) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <FileText className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    DISTRIBUCIÓN DE CERTIFICACIONES
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  {/* Visual SVG Donut Chart de 4 Secciones */}
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="4.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* GBR (Slate 500) */}
                      <path
                        className="text-slate-500"
                        strokeWidth="4.5"
                        strokeDasharray={`${pctGBR}, 100`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* GAR (Rojo KFC) */}
                      <path
                        className="text-red-600"
                        strokeWidth="4.5"
                        strokeDasharray={`${pctGAR}, 100`}
                        strokeDashoffset={`-${pctGBR}`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* GER (Negro / Slate) */}
                      <path
                        className="text-slate-900"
                        strokeWidth="4.5"
                        strokeDasharray={`${pctGER}, 100`}
                        strokeDashoffset={`-${pctGBR + pctGAR}`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* EAE (Verde Esmeralda suave) */}
                      <path
                        className="text-emerald-600"
                        strokeWidth="4.5"
                        strokeDasharray={`${pctEAE}, 100`}
                        strokeDashoffset={`-${pctGBR + pctGAR + pctGER}`}
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Total</span>
                      <span className="text-lg font-black text-slate-900 leading-none">{analytics.totalCerts}</span>
                    </div>
                  </div>

                  {/* Leyenda 2x2 con TODAS las 4 Certificaciones */}
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 shrink-0" />
                        <span className="font-black text-slate-800 text-[11px]">GER</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-xs block leading-none">{analytics.certifications.certGER}</span>
                        <span className="text-[8px] text-slate-400 font-bold block">{pctGER}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                        <span className="font-black text-slate-800 text-[11px]">GAR</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-xs block leading-none">{analytics.certifications.certGAR}</span>
                        <span className="text-[8px] text-slate-400 font-bold block">{pctGAR}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                        <span className="font-black text-slate-800 text-[11px]">GBR</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-xs block leading-none">{analytics.certifications.certGBR}</span>
                        <span className="text-[8px] text-slate-400 font-bold block">{pctGBR}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                        <span className="font-black text-slate-800 text-[11px]">EAE</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-xs block leading-none">{analytics.certifications.certEAE}</span>
                        <span className="text-[8px] text-slate-400 font-bold block">{pctEAE}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Tipología de Tiendas */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Store className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    TIPOLOGÍA DE TIENDAS
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 text-center flex flex-col items-center justify-between">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">CAT. A</span>
                    <Trophy className="w-4 h-4 text-slate-500 my-1" />
                    <div>
                      <span className="text-base font-black text-slate-900 block leading-tight">{analytics.categories.catA}</span>
                      <span className="text-[8px] font-bold text-slate-400 block">{pctCatA}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 text-center flex flex-col items-center justify-between">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">CAT. B</span>
                    <Medal className="w-4 h-4 text-slate-500 my-1" />
                    <div>
                      <span className="text-base font-black text-slate-900 block leading-tight">{analytics.categories.catB}</span>
                      <span className="text-[8px] font-bold text-slate-400 block">{pctCatB}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 text-center flex flex-col items-center justify-between">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">CAT. C</span>
                    <Medal className="w-4 h-4 text-slate-500 my-1" />
                    <div>
                      <span className="text-base font-black text-slate-900 block leading-tight">{analytics.categories.catC}</span>
                      <span className="text-[8px] font-bold text-slate-400 block">{pctCatC}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 text-center flex flex-col items-center justify-between">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">CAT. D</span>
                    <Medal className="w-4 h-4 text-slate-500 my-1" />
                    <div>
                      <span className="text-base font-black text-slate-900 block leading-tight">{analytics.categories.catD}</span>
                      <span className="text-[8px] font-bold text-slate-400 block">{pctCatD}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-2.5 rounded-2xl border border-slate-200/70 text-center flex flex-col items-center justify-between col-span-2 sm:col-span-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">SIN CAT.</span>
                    <MinusCircle className="w-4 h-4 text-slate-400 my-1" />
                    <div>
                      <span className="text-base font-black text-slate-900 block leading-tight">{analytics.categories.catNone}</span>
                      <span className="text-[8px] font-bold text-slate-400 block">{pctCatNone}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Banner: Alertas Prioritarias */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">ALERTAS PRIORITARIAS</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">{analytics.storesWithoutManager}</span>
                  <span className="text-[10px] font-bold text-rose-600">Requieren atención</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 mt-1 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 text-[11px] leading-tight">
                    {analytics.storesWithoutManager} tiendas sin Gerente/Subgerente
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">Intervención inmediata recomendada</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 text-[11px] leading-tight">
                    {analytics.storesZeroAssigned} tiendas vacantes
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">Impacta la operación y cumplimiento</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-900 mt-1 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 text-[11px] leading-tight">
                    {analytics.totalPotenciales} potenciales disponibles
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">Revisar y programar ascensos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Compliance Summary KPIs (Tarjetas Superiores Compactas)
// ─────────────────────────────────────────────────────────────────────────────
const ComplianceSummary: React.FC<{
  title: string;
  subtitle?: string;
  restaurantIds: string[];
  bancaData: BancaData;
  activeEmployeeIds: Set<string>;
  onExport: () => void;
  onOpenDashboard: () => void;
  onBack?: () => void;
}> = ({ title, subtitle, restaurantIds, bancaData, activeEmployeeIds, onExport, onOpenDashboard, onBack }) => {
  let idealGerentes = 0;
  let realGerentes = 0;
  let idealLideres = 0;
  let realLideres = 0;
  let idealEntrenadores = 0;
  let realEntrenadores = 0;
  let realPotenciales = 0;

  restaurantIds.forEach(id => {
    const assignment = bancaData.assignments.find(a => a.restaurantId === id);
    const rawMembers = assignment?.members ?? [];
    const members = rawMembers.filter(m => activeEmployeeIds.has(m.employeeId));
    const ideal = bancaData.storeIdeals?.[id] ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 };

    idealGerentes += ideal.gerentes;
    realGerentes += members.filter(m => m.role === 'Gerente' || m.role === 'Subgerente').length;

    idealLideres += ideal.lideresTurno;
    realLideres += members.filter(m => m.role === 'Líder de turno').length;

    idealEntrenadores += ideal.entrenadores;
    realEntrenadores += members.filter(m => m.role === 'Entrenador' || m.role === 'Entrenador HRS').length;

    realPotenciales += members.filter(m => m.role === 'Potencial').length;
  });

  const getPercent = (real: number, ideal: number) => Math.min(100, Math.round((real / (ideal || 1)) * 100));

  const pctGerentes = getPercent(realGerentes, idealGerentes);
  const pctLideres = getPercent(realLideres, idealLideres);
  const pctEntrenadores = getPercent(realEntrenadores, idealEntrenadores);

  const StatCard = ({ title, icon, real, ideal, pct }: any) => (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[95px] hover:border-slate-300 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 tracking-tight leading-none">{real}</span>
              <span className="text-xs font-bold text-slate-400">/{ideal}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base font-black text-slate-900 tracking-tight leading-none">{pct}<span className="text-xs font-bold text-slate-400">%</span></span>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );

  const InfoCard = ({ title, icon, real }: { title: string; icon: React.ReactNode; real: number }) => (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between min-h-[95px] hover:border-slate-300 transition">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
          <span className="text-xl font-black text-slate-900 tracking-tight leading-none mt-0.5 block">{real}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">En lista</span>
    </div>
  );

  return (
    <div className="mb-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Volver a Regiones"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase italic tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Dashboard Banca */}
          <button
            onClick={onOpenDashboard}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 shrink-0 cursor-pointer"
            title="Dashboard Banca"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Banca</span>
          </button>

          {/* Botón Exportar Excel */}
          <button
            onClick={onExport}
            className="p-2.5 bg-white hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 shrink-0 cursor-pointer"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 animate-in fade-in duration-200">
        <StatCard title="Gerentes" icon={<Award className="w-4 h-4 text-slate-600" />} real={realGerentes} ideal={idealGerentes} pct={pctGerentes} />
        <StatCard title="Líderes de Turno" icon={<Users className="w-4 h-4 text-slate-600" />} real={realLideres} ideal={idealLideres} pct={pctLideres} />
        <InfoCard title="Potenciales" icon={<TrendingUp className="w-4 h-4 text-slate-600" />} real={realPotenciales} />
        <StatCard title="Entrenadores" icon={<Target className="w-4 h-4 text-slate-600" />} real={realEntrenadores} ideal={idealEntrenadores} pct={pctEntrenadores} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: Banca
// ─────────────────────────────────────────────────────────────────────────────
type ViewState = { level: 'regions' } | { level: 'table'; region: string };

const Banca: React.FC = () => {
  const { employees, restaurants, auth, syncStatus } = useAppStore();
  const [bancaData, setBancaData] = useState<BancaData>(() => dataService.getBancaData());
  const [view, setView] = useState<ViewState>({ level: 'regions' });
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const toggleTableMaximize = async () => {
    if (!isTableMaximized) {
      setIsTableMaximized(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Pantalla completa nativa no permitida:', err);
      }
    } else {
      setIsTableMaximized(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn('Error saliendo de pantalla completa nativa:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTableMaximized) {
        setIsTableMaximized(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTableMaximized) {
        setIsTableMaximized(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTableMaximized]);

  // Personal externo de operaciones
  const [externalPersonnel, setExternalPersonnel] = useState<BancaExternalPerson[]>(() => dataService.getBancaExternalPersonnel());

  const externalMap = useMemo(() => {
    return new Map(externalPersonnel.map(p => [p.id, p]));
  }, [externalPersonnel]);

  // Set de IDs de colaboradores activos en la nómina + Operaciones
  const activeEmployeeIds = useMemo(() => {
    const set = new Set(employees.filter(e => e.active).map(e => e.id));
    externalPersonnel.forEach(p => set.add(p.id));
    return set;
  }, [employees, externalPersonnel]);

  // Modales
  const [personModal, setPersonModal] = useState<{
    leader: StoreLeader;
    restaurantId: string;
    restaurantName: string;
    zoneName: string;
  } | null>(null);

  const [assignModal, setAssignModal] = useState<{
    restaurantId: string;
    restaurantName: string;
    targetRole: BancaRole;
  } | null>(null);

  const [storeSettingsModal, setStoreSettingsModal] = useState<{
    restaurantId: string;
    restaurantName: string;
    zoneName: string;
    initialIdeal: StoreIdeal;
  } | null>(null);

  // Toast Notification en esquina inferior derecha
  const [toast, setToast] = useState<{ message: string; submessage?: string; type?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setBancaData(dataService.getBancaData());
    setExternalPersonnel(dataService.getBancaExternalPersonnel());
    if (syncStatus !== 'syncing' || (employees.length > 0 && restaurants.length > 0)) {
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, employees.length, restaurants.length]);

  const hierarchy = dataService.getHierarchy();
  const user = auth.user!;
  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || (user.role === UserRole.GUEST && user.guestCanEdit === true);

  const visibleRegionNames = useMemo(() => {
    if (user.role === UserRole.COORDINATOR || user.role === UserRole.LIDER || user.role === UserRole.GUEST) {
      return new Set(user.assignedRegions || []);
    }
    return null;
  }, [user]);

  const regionsList = useMemo(() => {
    let regions = hierarchy.regions;
    if (visibleRegionNames) {
      regions = regions.filter(r => visibleRegionNames.has(r.name));
    }
    return regions;
  }, [hierarchy, visibleRegionNames]);

  const currentRegion = useMemo(() => {
    if (view.level !== 'table') return null;
    return hierarchy.regions.find(r => r.name === view.region) ?? null;
  }, [hierarchy, view]);

  const currentZones = useMemo(() => {
    if (!currentRegion) return [];
    return currentRegion.zones;
  }, [currentRegion]);

  const availableStoreOptions = useMemo(() => {
    if (!currentRegion) return [];
    let zones = currentRegion.zones;
    if (selectedZone !== 'all') {
      zones = zones.filter(z => z.name === selectedZone);
    }
    return zones.flatMap(z => z.restaurantIds).filter(id => restaurants.some(r => r.id === id));
  }, [currentRegion, selectedZone, restaurants]);

  const currentStores = useMemo(() => {
    if (!currentRegion) return [];
    let storeIds: { id: string; zoneName: string }[] = [];

    currentRegion.zones.forEach(z => {
      z.restaurantIds.forEach(id => {
        if (restaurants.some(r => r.id === id)) {
          storeIds.push({ id, zoneName: z.name });
        }
      });
    });

    if (selectedZone !== 'all') {
      storeIds = storeIds.filter(s => s.zoneName === selectedZone);
    }

    if (selectedStore !== 'all') {
      storeIds = storeIds.filter(s => s.id === selectedStore);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      storeIds = storeIds.filter(item => {
        const rest = restaurants.find(r => r.id === item.id);
        const nameMatch = rest?.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        if (nameMatch) return true;

        const assignment = bancaData.assignments.find(a => a.restaurantId === item.id);
        const rawMembers = assignment?.members ?? [];
        const members = rawMembers.filter(m => activeEmployeeIds.has(m.employeeId));
        return members.some(m => {
          const emp = employees.find(e => e.id === m.employeeId);
          return m.employeeId.includes(q) || (emp?.name.toLowerCase().includes(q) ?? false);
        });
      });
    }

    return storeIds;
  }, [currentRegion, restaurants, selectedZone, selectedStore, search, bancaData, employees, activeEmployeeIds]);

  const handleSaveBanca = async (newBanca: BancaData) => {
    // Actualización optimista inmediata del estado local para fluidez de UI
    setBancaData(newBanca);
    try {
      await dataService.saveBancaData(newBanca);
    } catch (err) {
      console.error('[handleSaveBanca] Error al persistir banca en la nube:', err);
    }
  };

  const handleSaveStoreIdeal = async (restaurantId: string, ideal: StoreIdeal) => {
    const newBanca: BancaData = {
      ...bancaData,
      storeIdeals: {
        ...(bancaData.storeIdeals || {}),
        [restaurantId]: ideal
      }
    };
    await handleSaveBanca(newBanca);
  };

  const handleUpdateMemberRole = async (restaurantId: string, employeeId: string, newRole: BancaRole) => {
    const newBanca: BancaData = {
      ...bancaData,
      assignments: (bancaData.assignments || []).map(a => {
        if (a.restaurantId !== restaurantId) return a;
        return {
          ...a,
          members: (a.members ?? []).map(m => m.employeeId === employeeId ? { ...m, role: newRole } : m)
        };
      })
    };
    if (personModal) {
      setPersonModal({
        ...personModal,
        leader: { ...personModal.leader, role: newRole }
      });
    }
    await handleSaveBanca(newBanca);
  };

  const handleToggleMemberCert = async (restaurantId: string, employeeId: string, cert: Certification) => {
    let updatedCerts: Certification[] = [];
    const newBanca: BancaData = {
      ...bancaData,
      assignments: (bancaData.assignments || []).map(a => {
        if (a.restaurantId !== restaurantId) return a;
        return {
          ...a,
          members: (a.members ?? []).map(m => {
            if (m.employeeId !== employeeId) return m;
            const currentCerts = normalizeCerts(m.certifications);
            const certs = currentCerts.includes(cert)
              ? currentCerts.filter(c => c !== cert)
              : [...currentCerts, cert];
            updatedCerts = certs;
            return { ...m, certifications: certs };
          })
        };
      })
    };
    if (personModal) {
      setPersonModal({
        ...personModal,
        leader: { ...personModal.leader, certifications: updatedCerts }
      });
    }
    await handleSaveBanca(newBanca);
  };

  const handleRemoveMember = async (restaurantId: string, employeeId: string) => {
    const newBanca: BancaData = {
      ...bancaData,
      assignments: (bancaData.assignments || []).map(a => {
        if (a.restaurantId !== restaurantId) return a;
        return {
          ...a,
          members: (a.members ?? []).filter(m => m.employeeId !== employeeId)
        };
      })
    };
    await handleSaveBanca(newBanca);
  };

  const handleAssignPerson = async (restaurantId: string, emp: { id: string; name: string }, role: BancaRole) => {
    const existingAssignment = (bancaData.assignments || []).find(a => a.restaurantId === restaurantId);
    const currentMembers = existingAssignment?.members ?? [];
    if (currentMembers.some(m => m.employeeId === emp.id)) return;

    const newLeader: StoreLeader = {
      employeeId: emp.id,
      role: role,
      certifications: []
    };

    const updatedAssignment: StoreAssignment = {
      restaurantId,
      members: [...currentMembers, newLeader]
    };

    const newBanca: BancaData = {
      ...bancaData,
      assignments: [
        ...(bancaData.assignments || []).filter(a => a.restaurantId !== restaurantId),
        updatedAssignment
      ]
    };

    await handleSaveBanca(newBanca);
    setToast({
      message: 'Colaborador Asignado'
    });
  };

  const generateExcelReport = () => {
    const rows: Record<string, string>[] = [];
    hierarchy.regions.forEach(region => {
      region.zones.forEach(zone => {
        zone.restaurantIds.forEach(restId => {
          const rest = restaurants.find(r => r.id === restId);
          const assignment = bancaData.assignments.find(a => a.restaurantId === restId);
          const rawMembers = assignment?.members ?? [];
          const members = rawMembers.filter(m => activeEmployeeIds.has(m.employeeId));
          const storeIdeal = bancaData.storeIdeals?.[restId];

          if (members.length === 0) {
            rows.push({
              'Región': region.name,
              'Jefe de Área': zone.name,
              'CECO': restId,
              'Tienda': rest?.name ?? restId,
              'Categoría': storeIdeal?.category ? storeIdeal.category : 'Sin Categoría',
              'Cédula': '',
              'Nombre': 'Sin asignaciones',
              'Cargo (Sistema)': '',
              'Rol en Banca': '',
              'GER': '',
              'GAR': '',
              'GBR': '',
              'EAE': '',
            });
          } else {
            members.forEach(m => {
              const emp = employees.find(e => e.id === m.employeeId);
              const ext = externalMap.get(m.employeeId);
              const norm = normalizeCerts(m.certifications);
              rows.push({
                'Región': region.name,
                'Jefe de Área': zone.name,
                'CECO': restId,
                'Tienda': rest?.name ?? restId,
                'Categoría': storeIdeal?.category ? storeIdeal.category : 'Sin Categoría',
                'Cédula': ext?.document_id || m.employeeId,
                'Nombre': ext ? `${ext.name} (Operaciones)` : (emp?.name ?? m.employeeId),
                'Cargo (Sistema)': ext ? 'Personal de Operaciones' : (emp?.title ?? 'Sin definir'),
                'Rol en Banca': m.role,
                'GER': norm.includes('GER') ? 'SI' : 'NO',
                'GAR': norm.includes('GAR') ? 'SI' : 'NO',
                'GBR': norm.includes('GBR') ? 'SI' : 'NO',
                'EAE': norm.includes('EAE') ? 'SI' : 'NO',
              });
            });
          }
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Banca de Líderes');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Banca_Lideres_${dateStr}.xlsx`);
  };

  let summaryTitle = "Cumplimiento Nacional";
  let summarySubtitle = "";
  let summaryIds: string[] = [];

  if (view.level === 'regions') {
    summaryIds = regionsList.flatMap(r => r.zones.flatMap(z => z.restaurantIds)).filter(id => restaurants.some(r => r.id === id));
  } else {
    if (selectedZone !== 'all') {
      summaryTitle = `Cumplimiento Jefe de Área: ${selectedZone}`;
      summarySubtitle = "";
    } else {
      summaryTitle = `Cumplimiento Región: ${view.region}`;
      summarySubtitle = "";
    }
    summaryIds = currentStores.map(s => s.id);
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-20 min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-75"></div>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center relative border border-red-100">
              <Landmark className="w-7 h-7 animate-bounce" />
            </div>
          </div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mt-4">Cargando Panel de Banca...</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {/* KPIs Superiores Permanentes */}
      <ComplianceSummary
        title={summaryTitle}
        subtitle={summarySubtitle}
        restaurantIds={summaryIds}
        bancaData={bancaData}
        activeEmployeeIds={activeEmployeeIds}
        onExport={generateExcelReport}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onBack={view.level === 'table' ? () => {
          setIsTableMaximized(false);
          setView({ level: 'regions' });
        } : undefined}
      />

      {/* NIVEL 1: Tarjetas de Selección de Región */}
      {view.level === 'regions' && (
        <div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {regionsList.map(region => {
              const allIds = region.zones.flatMap(z => z.restaurantIds).filter(id => restaurants.some(r => r.id === id));
              const assignedCount = allIds.filter(id => {
                const members = bancaData.assignments.find(a => a.restaurantId === id)?.members ?? [];
                return members.some(m => activeEmployeeIds.has(m.employeeId));
              }).length;

              return (
                <div
                  key={region.name}
                  onClick={() => {
                    setView({ level: 'table', region: region.name });
                    setSelectedZone('all');
                    setSelectedStore('all');
                    setSearch('');
                  }}
                  className="group cursor-pointer bg-white rounded-[20px] shadow-sm hover:shadow-lg border border-slate-100 hover:border-red-200 transition-all duration-200 overflow-hidden flex flex-col hover:-translate-y-0.5"
                >
                  <div className="flex h-14 border-b border-slate-50">
                    <div className="w-14 bg-[#e60000] flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                      <Store className="w-5 h-5 text-white relative z-10" />
                      <span className="text-white font-black text-[7px] tracking-tighter mt-0.5">KFC</span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center px-3.5 min-w-0">
                      <h3 className="text-sm font-black text-slate-900 italic uppercase tracking-tighter leading-tight group-hover:text-red-600 transition-colors truncate">
                        {region.name}
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {region.zones.length} Zonas / Jefes de Área
                      </p>
                    </div>
                  </div>

                  <div className="flex bg-white p-3 items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiendas Asignadas</p>
                        <p className="text-base font-black text-slate-900 tracking-tight">
                          {assignedCount} <span className="text-xs font-bold text-slate-400">/ {allIds.length}</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NIVEL 2: Vista de Tabla Ultra Optimizada por Región */}
      {view.level === 'table' && currentRegion && (() => {
        const tableContent = (
          <div className={
            isTableMaximized 
              ? "fixed inset-0 z-[9000] bg-white w-screen h-screen p-4 md:p-6 flex flex-col space-y-3 overflow-hidden animate-in fade-in duration-200"
              : "bg-white rounded-[24px] border border-slate-100 shadow-sm p-3.5 space-y-2.5 max-w-full overflow-hidden"
          }>
          {/* Header de la Tabla */}
          {isTableMaximized ? (
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-black text-xs uppercase tracking-tight">
                <Store className="w-4 h-4 text-red-600" />
                <span>Región: {currentRegion.name}</span>
              </div>
              <button
                type="button"
                onClick={toggleTableMaximize}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 transition cursor-pointer shadow-xs border border-slate-200/60"
                title="Restaurar pantalla normal"
              >
                <Minimize2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end pb-1">
              <button
                type="button"
                onClick={toggleTableMaximize}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-red-600 transition cursor-pointer shadow-xs border border-slate-200/60"
                title="Maximizar tabla a pantalla completa"
              >
                <Maximize2 className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          )}

            {/* Barra de Filtros Compacta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/80 p-2 rounded-2xl border border-slate-100">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                  Jefe de Área (Zona)
                </label>
                <div className="relative">
                  <select
                    value={selectedZone}
                    onChange={e => {
                      setSelectedZone(e.target.value);
                      setSelectedStore('all');
                    }}
                    className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 outline-none appearance-none cursor-pointer focus:border-red-500 transition-colors"
                  >
                    <option value="all">Todos los Jefes de Área</option>
                    {currentZones.map(z => (
                      <option key={z.name} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                  Tienda / CECO
                </label>
                <div className="relative">
                  <select
                    value={selectedStore}
                    onChange={e => setSelectedStore(e.target.value)}
                    className="w-full bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 outline-none appearance-none cursor-pointer focus:border-red-500 transition-colors"
                  >
                    <option value="all">Todas las Tiendas</option>
                    {availableStoreOptions.map(id => {
                      const r = restaurants.find(x => x.id === id);
                      return (
                        <option key={id} value={id}>
                          {id} - {r?.name ?? id}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                  Buscar Colaborador o Tienda
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nombre, cédula o CECO..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition-colors placeholder:text-slate-300"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TABLA DE TIENDAS */}
            <div className={`w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white ${
              isTableMaximized ? "flex-1 min-h-0 overflow-y-auto" : "max-h-[calc(100vh-230px)] overflow-y-auto"
            }`}>
              <table className="w-full table-fixed text-left border-collapse min-w-[960px]">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider divide-x divide-slate-800">
                    <th className="py-2.5 px-2.5 bg-slate-950">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">Tienda / CECO</span>
                      </div>
                    </th>
                    {ROLE_GROUPS.map(g => (
                      <th key={g.label} className="py-2.5 px-2 bg-slate-900">
                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${g.textCol.replace('text-', 'bg-')}`} />
                          <span className="truncate">{g.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {currentStores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <Store className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                        <p className="text-xs font-bold">No hay tiendas que coincidan con los filtros aplicados</p>
                      </td>
                    </tr>
                  ) : (
                    currentStores.map(({ id: restId, zoneName }) => {
                      const rest = restaurants.find(r => r.id === restId);
                      const assignment = bancaData.assignments.find(a => a.restaurantId === restId);
                      const rawMembers = assignment?.members ?? [];
                      const members = rawMembers.filter(m => activeEmployeeIds.has(m.employeeId));

                      const storeIdeal = bancaData.storeIdeals?.[restId];
                      const category = storeIdeal?.category;

                      return (
                        <tr key={restId} className="hover:bg-slate-50/90 transition-colors divide-x divide-slate-100">
                          {/* Columna 1: Nombre de Tienda, CECO y Badge Único de Letra A, B, C */}
                          <td className="py-1.5 px-2.5 align-top bg-slate-50/40">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setStoreSettingsModal({
                                  restaurantId: restId,
                                  restaurantName: rest?.name ?? restId,
                                  zoneName,
                                  initialIdeal: storeIdeal ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 }
                                })}
                                className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-600 flex items-center justify-center shrink-0 font-black text-[9px] transition-colors"
                                title="Configurar Categoría e Ideales de la Tienda"
                              >
                                <Store className="w-3 h-3" />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span
                                    onClick={() => setStoreSettingsModal({
                                      restaurantId: restId,
                                      restaurantName: rest?.name ?? restId,
                                      zoneName,
                                      initialIdeal: storeIdeal ?? { gerentes: 1, lideresTurno: 4, entrenadores: 4 }
                                    })}
                                    className="font-black text-slate-900 uppercase italic tracking-tight text-[11px] truncate cursor-pointer hover:text-red-600 transition-colors"
                                    title="Configurar Categoría e Ideales de la Tienda"
                                  >
                                    {rest?.name ?? restId}
                                  </span>

                                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-200/70 text-slate-600 font-black">
                                    {restId}
                                  </span>

                                  {category && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-xs ${
                                      category === 'A' ? 'bg-amber-500 text-white' :
                                      category === 'B' ? 'bg-blue-600 text-white' :
                                      category === 'C' ? 'bg-emerald-600 text-white' :
                                      'bg-purple-600 text-white'
                                    }`}>
                                      {category}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                  {zoneName}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Columnas de Roles */}
                          {ROLE_GROUPS.map(group => {
                            const matchingMembers = members.filter(m => group.roles.includes(m.role));
                            const targetRoleForAdd = group.roles[0];

                            return (
                              <td key={group.label} className="py-1.5 px-1.5 align-top">
                                <div className="space-y-1">
                                  {matchingMembers.map(m => {
                                    const emp = employees.find(e => e.id === m.employeeId);
                                    const isExternal = externalMap.has(m.employeeId);
                                    const extPerson = externalMap.get(m.employeeId);
                                    const displayName = extPerson?.name || emp?.name || m.employeeId;

                                    return (
                                      <div
                                        key={m.employeeId}
                                        onClick={() => setPersonModal({
                                          leader: m,
                                          restaurantId: restId,
                                          restaurantName: rest?.name ?? restId,
                                          zoneName
                                        })}
                                        className={`px-1.5 py-0.5 bg-white rounded-lg border ${
                                          isExternal ? 'border-amber-300 bg-amber-50/25' : 'border-slate-200'
                                        } hover:border-red-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between gap-1 group/item`}
                                      >
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                          <div className={`w-3.5 h-3.5 rounded ${
                                            isExternal ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 group-hover/item:bg-red-100 group-hover/item:text-red-600 text-slate-600'
                                          } flex items-center justify-center text-[7.5px] font-black shrink-0 transition-colors`}>
                                            {displayName.charAt(0) || '?'}
                                          </div>
                                          <span className="font-bold text-slate-800 text-[10px] truncate group-hover/item:text-red-700 transition-colors">
                                            {displayName}
                                          </span>
                                          {isExternal && (
                                            <span className="text-[6.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-amber-500 text-white shrink-0 shadow-2xs">
                                              Operaciones
                                            </span>
                                          )}
                                        </div>

                                        {/* Certificaciones Badges Compactas */}
                                        {m.certifications.length > 0 && (
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            {normalizeCerts(m.certifications).map(c => (
                                              <span key={c} title={CERT_NAMES[c]} className={`text-[6px] font-black px-0.5 py-0 leading-tight rounded-[3px] tracking-tighter ${CERT_COLORS[c]}`}>
                                                {c}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Botón de Asignación en celda vacía */}
                                  {canEdit && (
                                    <button
                                      onClick={() => setAssignModal({
                                        restaurantId: restId,
                                        restaurantName: rest?.name ?? restId,
                                        targetRole: targetRoleForAdd
                                      })}
                                      className="w-full flex items-center justify-center gap-1 py-1 px-1 bg-slate-50/80 hover:bg-red-50 border border-dashed border-slate-200 hover:border-red-300 rounded-lg text-[9px] font-bold text-slate-400 hover:text-red-600 transition-all"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>{matchingMembers.length === 0 ? 'Asignar' : '+ Otro'}</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

        return isTableMaximized ? createPortal(tableContent, document.body) : tableContent;
      })()}

      {/* Modal Dashboard Bancas (Filtrado Dinámicamente por Región / Zona / Tienda o Rol de Usuario) */}
      {isDashboardOpen && (
        <BancaDashboardModal
          regionsList={regionsList}
          bancaData={bancaData}
          restaurants={restaurants}
          employees={employees}
          activeEmployeeIds={activeEmployeeIds}
          activeRegion={view.level === 'table' ? view.region : undefined}
          activeZone={selectedZone !== 'all' ? selectedZone : undefined}
          activeStore={selectedStore !== 'all' ? selectedStore : undefined}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}

      {/* Modal Flotante de Configuración e Ideales de la Tienda (Categorización A/B/C) */}
      {storeSettingsModal && (
        <StoreSettingsModal
          restaurantId={storeSettingsModal.restaurantId}
          restaurantName={storeSettingsModal.restaurantName}
          zoneName={storeSettingsModal.zoneName}
          initialIdeal={storeSettingsModal.initialIdeal}
          canEdit={canEdit}
          onClose={() => setStoreSettingsModal(null)}
          onSave={ideal => handleSaveStoreIdeal(storeSettingsModal.restaurantId, ideal)}
        />
      )}

      {/* Modal Flotante de Detalle de Colaborador */}
      {personModal && (
        <PersonDetailModal
          leader={personModal.leader}
          employee={employees.find(e => e.id === personModal.leader.employeeId)}
          externalPerson={externalMap.get(personModal.leader.employeeId)}
          restaurantId={personModal.restaurantId}
          restaurantName={personModal.restaurantName}
          zoneName={personModal.zoneName}
          canEdit={canEdit}
          onClose={() => setPersonModal(null)}
          onUpdateRole={newRole => handleUpdateMemberRole(personModal.restaurantId, personModal.leader.employeeId, newRole)}
          onToggleCert={cert => handleToggleMemberCert(personModal.restaurantId, personModal.leader.employeeId, cert)}
          onRemove={() => handleRemoveMember(personModal.restaurantId, personModal.leader.employeeId)}
        />
      )}

      {/* Modal de Asignación a Vacante */}
      {assignModal && (
        <AssignPersonModal
          restaurantId={assignModal.restaurantId}
          restaurantName={assignModal.restaurantName}
          targetRole={assignModal.targetRole}
          allEmployees={employees}
          externalPersonnel={externalPersonnel}
          excludeIds={(bancaData.assignments.find(a => a.restaurantId === assignModal.restaurantId)?.members ?? []).map(m => m.employeeId)}
          onClose={() => setAssignModal(null)}
          onAssign={(emp, role) => handleAssignPerson(assignModal.restaurantId, emp, role)}
          onSaveExternalPerson={async (p) => {
            await dataService.saveBancaExternalPerson(p);
            setExternalPersonnel(dataService.getBancaExternalPersonnel());
          }}
        />
      )}

      {/* Toast Notification en la esquina inferior derecha */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100010] flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black uppercase tracking-tight text-white">
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-0.5 ml-1 transition-colors shrink-0"
            title="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Banca;
