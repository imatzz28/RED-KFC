import React, { useState, useEffect } from 'react';
import { QuickShortcut, UserRole } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { 
  Plus, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Globe, 
  BookOpen, 
  BarChart3, 
  Shield, 
  Store, 
  Zap, 
  Headphones, 
  Sparkles, 
  Layers, 
  Award, 
  FileSpreadsheet, 
  Link2, 
  Heart, 
  Smile, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Compass,
  AlertCircle
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  ExternalLink,
  Compass,
  BookOpen,
  BarChart3,
  Shield,
  Store,
  Zap,
  Headphones,
  Sparkles,
  Layers,
  Award,
  FileSpreadsheet,
  Link2,
  Heart,
  Smile
};

interface Props {
  setImportStatus?: (status: { message: string; isError: boolean } | null) => void;
}

export const QuickShortcutsManager: React.FC<Props> = ({ setImportStatus }) => {
  const { quickShortcuts, loadQuickShortcuts, saveQuickShortcuts, deleteQuickShortcut, showConfirmDialog } = useAppStore();
  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<QuickShortcut | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Globe');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<'_blank' | '_self'>('_blank');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [allRolesSelected, setAllRolesSelected] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadQuickShortcuts();
  }, [loadQuickShortcuts]);

  useEffect(() => {
    setShortcuts(quickShortcuts);
  }, [quickShortcuts]);

  const openAddModal = () => {
    setEditingShortcut(null);
    setTitle('');
    setUrl('https://');
    setSelectedIcon('Globe');
    setDescription('');
    setTarget('_blank');
    setSelectedRoles([]);
    setAllRolesSelected(true);
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sc: QuickShortcut) => {
    setEditingShortcut(sc);
    setTitle(sc.title);
    setUrl(sc.url);
    setSelectedIcon(sc.icon || 'Globe');
    setDescription(sc.description || '');
    setTarget(sc.target || '_blank');
    if (!sc.roles || sc.roles.length === 0) {
      setAllRolesSelected(true);
      setSelectedRoles([]);
    } else {
      setAllRolesSelected(false);
      setSelectedRoles(sc.roles);
    }
    setIsActive(sc.isActive ?? true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleRoleToggle = (role: UserRole) => {
    setAllRolesSelected(false);
    if (selectedRoles.includes(role)) {
      const next = selectedRoles.filter(r => r !== role);
      if (next.length === 0) setAllRolesSelected(true);
      setSelectedRoles(next);
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('El título del acceso directo es obligatorio.');
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      setFormError('Debes ingresar una URL válida que empiece con http:// o https://');
      return;
    }

    const payload: QuickShortcut = {
      id: editingShortcut ? editingShortcut.id : `sc-${Date.now()}`,
      title: title.trim(),
      url: url.trim(),
      icon: selectedIcon,
      description: description.trim(),
      target,
      roles: allRolesSelected ? undefined : selectedRoles,
      isActive,
      order: editingShortcut?.order ?? (shortcuts.length + 1),
      updatedAt: new Date().toISOString()
    };

    let updatedList: QuickShortcut[];
    if (editingShortcut) {
      updatedList = shortcuts.map(s => s.id === editingShortcut.id ? payload : s);
    } else {
      updatedList = [...shortcuts, payload];
    }

    setShortcuts(updatedList);
    await saveQuickShortcuts(updatedList);
    setIsModalOpen(false);

    if (setImportStatus) {
      setImportStatus({
        message: editingShortcut ? 'Acceso directo actualizado correctamente.' : 'Nuevo acceso directo agregado con éxito.',
        isError: false
      });
    }
  };

  const handleDelete = (id: string, scTitle: string) => {
    showConfirmDialog(
      `¿Estás seguro de eliminar el acceso directo "${scTitle}"?`,
      async () => {
        const next = shortcuts.filter(s => s.id !== id);
        setShortcuts(next);
        await deleteQuickShortcut(id);
        if (setImportStatus) {
          setImportStatus({ message: 'Acceso directo eliminado con éxito.', isError: false });
        }
      },
      undefined,
      'Eliminar Acceso Directo'
    );
  };

  const handleToggleActive = async (id: string) => {
    const next = shortcuts.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setShortcuts(next);
    await saveQuickShortcuts(next);
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === shortcuts.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...shortcuts];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    // Reasignar orden secuencial
    const updated = reordered.map((item, idx) => ({ ...item, order: idx + 1 }));
    setShortcuts(updated);
    await saveQuickShortcuts(updated);
  };

  const ALL_APP_ROLES = [
    { role: UserRole.ADMIN, label: 'Superadmin' },
    { role: UserRole.COORDINATOR, label: 'Coordinador' },
    { role: UserRole.LIDER, label: 'Líder' },
    { role: UserRole.SPECIALIST, label: 'Especialista' },
    { role: UserRole.GUEST, label: 'Invitado' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm border border-slate-700/50">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-red-500" />
            Configuración de Accesos Directos
          </h3>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Agrega enlaces externos o internos para que los usuarios puedan acceder rápidamente desde la barra lateral.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Acceso Directo
        </button>
      </div>

      {/* Shortcuts List */}
      {shortcuts.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">No hay accesos directos configurados</p>
          <p className="text-xs text-slate-400 mt-1">Haz clic en &quot;Nuevo Acceso Directo&quot; para agregar el primero.</p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black transition cursor-pointer"
          >
            Agregar Acceso
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shortcuts.map((sc, index) => {
            const IconComp = (sc.icon && ICON_MAP[sc.icon]) || Globe;
            const hasRolesRestriction = sc.roles && sc.roles.length > 0;

            return (
              <div 
                key={sc.id}
                className={`p-4 rounded-2xl border transition-all duration-200 bg-white shadow-xs flex flex-col justify-between ${
                  sc.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-2xs">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-slate-800 tracking-tight leading-tight truncate">
                          {sc.title}
                        </h4>
                        <a 
                          href={sc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-slate-400 hover:text-red-600 truncate flex items-center gap-1 mt-0.5"
                        >
                          <span className="truncate">{sc.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(sc.id)}
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition cursor-pointer shrink-0 ${
                        sc.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {sc.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>

                  {sc.description && (
                    <p className="text-xs text-slate-500 mt-3 font-normal leading-relaxed line-clamp-2">
                      {sc.description}
                    </p>
                  )}

                  {/* Roles and target badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {sc.target === '_self' ? 'Misma Pestaña' : 'Nueva Pestaña'}
                    </span>

                    {!hasRolesRestriction ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                        Todos los Roles
                      </span>
                    ) : (
                      sc.roles?.map(r => (
                        <span key={r} className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === shortcuts.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={sc.url}
                      target={sc.target || '_blank'}
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Probar
                    </a>
                    <button
                      onClick={() => openEditModal(sc)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sc.id, sc.title)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
                  <Compass className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                  {editingShortcut ? 'Editar Acceso Directo' : 'Nuevo Acceso Directo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Título o Nombre del Enlace *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Portal KFC, Learning Zone, PowerBI..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Dirección URL de Destino *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.kfc.co/modulo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Selecciona un Icono
                </label>
                <div className="grid grid-cols-8 gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 max-h-32 overflow-y-auto custom-scrollbar">
                  {Object.entries(ICON_MAP).map(([name, Icon]) => {
                    const isSelected = selectedIcon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedIcon(name)}
                        className={`p-2 rounded-xl flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md scale-105'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                        }`}
                        title={name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Descripción Corta (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve detalle sobre este enlace..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              {/* Target & Active Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Abrir en
                  </label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as '_blank' | '_self')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  >
                    <option value="_blank">Nueva pestaña (_blank)</option>
                    <option value="_self">Misma ventana (_self)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Estado
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition flex items-center justify-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {isActive ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                    {isActive ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>

              {/* Roles Visibility */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Visibilidad por Roles
                </label>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allRolesSelected}
                      onChange={(e) => {
                        setAllRolesSelected(e.target.checked);
                        if (e.target.checked) setSelectedRoles([]);
                      }}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>Visible para todos los roles</span>
                  </label>

                  {!allRolesSelected && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                      {ALL_APP_ROLES.map(({ role, label }) => {
                        const isChecked = selectedRoles.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleRoleToggle(role)}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {editingShortcut ? 'Guardar Cambios' : 'Crear Acceso Directo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
