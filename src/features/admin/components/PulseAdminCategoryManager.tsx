import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { Tag, Plus, Trash2, CheckCircle2, Sparkles, FolderPlus } from 'lucide-react';

interface PulseAdminCategoryManagerProps {
  setImportStatus: (status: { message: string; isError: boolean } | null) => void;
}

export const PulseAdminCategoryManager: React.FC<PulseAdminCategoryManagerProps> = ({
  setImportStatus,
}) => {
  const [categories, setCategories] = useState<string[]>(() => dataService.getSurveyCategories());
  const [newCatName, setNewCatName] = useState('');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCatName.trim();
    if (!clean) return;

    if (categories.some(c => c.toLowerCase() === clean.toLowerCase())) {
      setImportStatus({ message: 'La categoría ya existe.', isError: true });
      return;
    }

    const updated = [...categories, clean];
    setCategories(updated);
    await dataService.saveSurveyCategories(updated);
    setNewCatName('');
    setImportStatus({ message: `Categoría "${clean}" creada exitosamente en Pulse.`, isError: false });
  };

  const handleDeleteCategory = async (catName: string) => {
    if (categories.length <= 1) {
      setImportStatus({ message: 'Debe haber al menos 1 categoría activa.', isError: true });
      return;
    }

    const updated = categories.filter(c => c !== catName);
    setCategories(updated);
    await dataService.saveSurveyCategories(updated);
    setImportStatus({ message: `Categoría "${catName}" eliminada.`, isError: false });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#E4002B]" />
              Gestión de Categorías - RED Pulse
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Administra las categorías oficiales para clasificar encuestas y evaluaciones.
            </p>
          </div>
          <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
            {categories.length} categorías activas
          </span>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddCategory} className="flex items-center gap-3 pt-2">
          <div className="relative flex-1">
            <FolderPlus className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="Nueva categoría (ej. Auditorías de Calidad)..."
              className="w-full bg-white border border-slate-200 focus:border-[#E4002B] focus:ring-4 focus:ring-red-500/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={!newCatName.trim()}
            className="px-5 py-2.5 rounded-2xl bg-[#E4002B] hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-red-600/20 transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agregar Categoría</span>
          </button>
        </form>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#E4002B] font-black text-xs flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-900 truncate">
                {cat}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteCategory(cat)}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition cursor-pointer"
              title="Eliminar categoría"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
