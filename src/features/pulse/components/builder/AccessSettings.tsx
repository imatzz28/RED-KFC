import React from 'react';
import { Survey, AccessMode, HiddenFieldConfig } from '@/types';
import { Lock, Key, EyeOff, Plus, Trash2, ShieldCheck, Tag } from 'lucide-react';

interface AccessSettingsProps {
  survey: Survey;
  onUpdateSurvey: (updated: Partial<Survey>) => void;
}

export const AccessSettings: React.FC<AccessSettingsProps> = ({ survey, onUpdateSurvey }) => {
  const accessMode = survey.access_mode || 'open';
  const hiddenFields = survey.hidden_fields || [];

  const handleAddHiddenField = () => {
    const newField: HiddenFieldConfig = {
      key: `field_${hiddenFields.length + 1}`,
      label: `Campo Oculto ${hiddenFields.length + 1}`,
      default_value: '',
    };
    onUpdateSurvey({ hidden_fields: [...hiddenFields, newField] });
  };

  const handleUpdateHiddenField = (idx: number, updates: Partial<HiddenFieldConfig>) => {
    const updated = hiddenFields.map((f, i) => (i === idx ? { ...f, ...updates } : f));
    onUpdateSurvey({ hidden_fields: updated });
  };

  const handleDeleteHiddenField = (idx: number) => {
    onUpdateSurvey({ hidden_fields: hiddenFields.filter((_, i) => i !== idx) });
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-xl space-y-6">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
        <Lock className="w-4 h-4 text-[#E4002B]" />
        Control de Acceso y Campos Ocultos
      </h3>

      {/* Modo de Acceso */}
      <div className="space-y-3">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Modo de Acceso</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { mode: 'open', label: 'Abierto (Público)', desc: 'Cualquier persona con el link puede responder' },
            { mode: 'password', label: 'Con Contraseña', desc: 'Requiere clave genérica para ingresar' },
          ].map(item => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onUpdateSurvey({ access_mode: item.mode as AccessMode })}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                accessMode === item.mode
                  ? 'bg-slate-900 text-white border-slate-950 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="font-black text-xs block">{item.label}</span>
              <span className="text-[9px] font-medium opacity-70 mt-1">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clave de Acceso si es modo Contraseña */}
      {accessMode === 'password' && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in duration-200">
          <label className="text-[10px] font-black text-amber-900 uppercase tracking-widest block">Contraseña de Ingreso</label>
          <input
            type="text"
            value={survey.access_password || ''}
            onChange={e => onUpdateSurvey({ access_password: e.target.value })}
            placeholder="Clave personalizada para los participantes..."
            className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black outline-none"
          />
        </div>
      )}
    </div>
  );
};
