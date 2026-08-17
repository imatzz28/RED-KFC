import React, { useState } from 'react';
import { Question, QuestionType, QuestionOption, JumpRule } from '@/types';
import {
  Type, AlignLeft, CircleDot, CheckSquare, Star, ToggleLeft,
  Calendar, Upload, Plus, Trash2, GitFork, GripVertical,
  ChevronDown, ChevronUp, ListPlus, FileText, X, Sparkles,
  Minimize2, MapPin, ListOrdered, Pencil
} from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  allQuestions: Question[];
  surveyType: 'survey' | 'quiz';
  onUpdate: (updated: Question) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isExpanded?: boolean;
  onSelectQuestion?: () => void;
  onMinimizeQuestion?: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: any; description: string }[] = [
  { type: 'single_choice', label: 'Opción única', icon: CircleDot, description: 'Seleccionar una sola opción' },
  { type: 'multiple_choice', label: 'Opción múltiple', icon: CheckSquare, description: 'Seleccionar varias opciones' },
  { type: 'ordering', label: 'Ordenar secuencia', icon: ListOrdered, description: 'Organizar las opciones en el orden secuencial correcto' },
  { type: 'rating', label: 'Escala / Rating', icon: Star, description: 'Calificación numérica (1-5, 1-10)' },
  { type: 'yes_no', label: 'Sí / No', icon: ToggleLeft, description: 'Respuesta dicotómica rápida' },
  { type: 'short_text', label: 'Texto corto', icon: Type, description: 'Respuestas breves de una línea' },
  { type: 'long_text', label: 'Texto largo', icon: AlignLeft, description: 'Párrafos y comentarios abiertos' },
  { type: 'date', label: 'Fecha', icon: Calendar, description: 'Selector de fecha' },
  { type: 'store_hierarchy', label: 'Jerarquía KFC', icon: MapPin, description: 'Selector de Tienda / CECO' },
];

function generateId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  allQuestions,
  surveyType,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isExpanded,
  onSelectQuestion,
  onMinimizeQuestion,
}) => {
  const [showLogicEditor, setShowLogicEditor] = useState(false);
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState('');
  const [bulkOptionsMode, setBulkOptionsMode] = useState<'add' | 'replace'>('add');

  const currentTypeObj = QUESTION_TYPES.find((t) => t.type === question.type) || QUESTION_TYPES[0];
  const CurrentTypeIcon = currentTypeObj.icon;
  const isCollapsed = isExpanded !== undefined ? !isExpanded : question.isCollapsed;

  const handleExpand = () => {
    if (onSelectQuestion) onSelectQuestion();
    else onUpdate({ ...question, isCollapsed: false });
  };

  const handleMinimize = () => {
    if (onMinimizeQuestion) onMinimizeQuestion();
    else onUpdate({ ...question, isCollapsed: true });
  };

  const handleAddOption = () => {
    const currentOpts = question.options || [];
    const newOpt: QuestionOption = {
      id: generateId('opt'),
      question_id: question.id,
      text: `Opción ${currentOpts.length + 1}`,
      value: `opcion_${currentOpts.length + 1}`,
      is_correct: false,
      weight: 1,
    };
    onUpdate({ ...question, options: [...currentOpts, newOpt] });
  };

  const handleApplyBulkOptions = () => {
    const lines = bulkOptionsText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const newGeneratedOpts: QuestionOption[] = lines.map((text, idx) => ({
      id: generateId(`opt_${idx}`),
      question_id: question.id,
      text,
      value: text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `opcion_${idx + 1}`,
      is_correct: false,
      weight: 1,
    }));

    let finalOpts = [...(question.options || [])];
    if (bulkOptionsMode === 'replace') finalOpts = newGeneratedOpts;
    else finalOpts = [...finalOpts, ...newGeneratedOpts];

    onUpdate({ ...question, options: finalOpts });
    setBulkOptionsText('');
    setShowBulkOptions(false);
  };

  const handleUpdateOption = (optId: string, updates: Partial<QuestionOption>) => {
    const currentOpts = question.options || [];
    const updatedOpts = currentOpts.map((o) => (o.id === optId ? { ...o, ...updates } : o));
    onUpdate({ ...question, options: updatedOpts });
  };

  const handleDeleteOption = (optId: string) => {
    const currentOpts = question.options || [];
    onUpdate({ ...question, options: currentOpts.filter((o) => o.id !== optId) });
  };

  const handleAddJumpRule = () => {
    const currentRules = question.jump_rules || [];
    let defaultConditionType: any = 'option_equals';
    let defaultValue = '';

    if (question.type === 'rating') {
      defaultConditionType = 'rating_less';
      defaultValue = '3';
    } else if (question.type === 'yes_no') {
      defaultConditionType = 'yes_no_equals';
      defaultValue = 'si';
    } else if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      defaultConditionType = 'option_equals';
      defaultValue = question.options?.[0]?.value || question.options?.[0]?.id || '';
    }

    const newRule: JumpRule = {
      id: generateId('rule'),
      question_id: question.id,
      condition_type: defaultConditionType,
      value: defaultValue,
      target_question_id: '',
    };
    onUpdate({ ...question, jump_rules: [...currentRules, newRule] });
  };

  // COLLAPSED / MINIMIZED VIEW
  if (isCollapsed) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 mb-4 border-l-4 border-l-[#E4002B] flex flex-wrap items-center justify-between gap-3 group">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-colors">
            <GripVertical className="w-4 h-4 cursor-grab" />
            <div className="flex flex-col gap-0.5">
              <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer">
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button onClick={onMoveDown} disabled={isLast} className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer">
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>

          <span className="w-7 h-7 rounded-lg bg-[#E4002B] text-white font-black text-xs flex items-center justify-center shrink-0">
            #{question.order}
          </span>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={handleExpand}>
            <h4 className="text-sm font-black text-slate-800 truncate group-hover:text-[#E4002B] transition-colors">
              {question.title || <span className="italic text-slate-400 font-normal">Sin título de pregunta</span>}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 font-extrabold text-slate-700 bg-slate-100 border border-slate-200/60 rounded-md px-2 py-0.5">
                <CurrentTypeIcon className="w-3 h-3 text-[#E4002B]" />
                {currentTypeObj.label}
              </span>

              {question.required && (
                <span className="bg-red-50 text-[#E4002B] font-extrabold text-[10px] rounded px-2 py-0.5 border border-red-200/60">
                  Obligatoria
                </span>
              )}

              {['single_choice', 'multiple_choice', 'ordering'].includes(question.type) && (
                <span className="text-slate-500 font-bold bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200/50">
                  {question.options?.length || 0} elementos
                </span>
              )}

              {surveyType === 'quiz' && (
                <span className="bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded px-2 py-0.5">
                  {question.points || 10} pts
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={handleExpand} className="px-3 py-1.5 bg-slate-100 hover:bg-[#E4002B] hover:text-white text-slate-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1">
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // EXPANDED EDITING VIEW
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 mb-6 relative space-y-6 border-t-4 border-t-[#E4002B]">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-[#E4002B] text-white font-black text-xs flex items-center justify-center">
            #{question.order}
          </span>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo de Pregunta</span>
            <select
              value={question.type}
              onChange={(e) => onUpdate({ ...question, type: e.target.value as QuestionType })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-black text-slate-800 outline-none focus:border-red-500 cursor-pointer"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleMinimize} className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition flex items-center gap-1">
            <Minimize2 className="w-4 h-4" />
            <span>Minimizar</span>
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Title Card */}
      <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#E4002B]" />
              <span>Pregunta #{question.order} - Enunciado Principal</span>
            </label>
            {question.required && (
              <span className="text-[10px] font-black text-[#E4002B] uppercase">Campo Obligatorio</span>
            )}
          </div>
          <input
            type="text"
            value={question.title}
            onChange={(e) => onUpdate({ ...question, title: e.target.value })}
            className="w-full bg-white border-2 border-slate-200 focus:border-[#E4002B] focus:ring-4 focus:ring-red-500/10 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 outline-none transition shadow-2xs"
            placeholder="Escribe la pregunta completa aquí (ej. ¿Cuál es el procedimiento correcto de lavado de manos?)..."
          />
        </div>
      </div>

      {/* Options Editor for Choice & Ordering Types */}
      {['single_choice', 'multiple_choice', 'ordering'].includes(question.type) && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              {question.type === 'ordering' ? 'Secuencia de Elementos a Ordenar' : 'Opciones de Respuesta'}
            </label>
            <button
              onClick={() => setShowBulkOptions(!showBulkOptions)}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Importar Masivo</span>
            </button>
          </div>

          {showBulkOptions && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-slate-700">Pega las opciones (una por línea):</span>
              <textarea
                value={bulkOptionsText}
                onChange={(e) => setBulkOptionsText(e.target.value)}
                placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none h-24"
              />
              <div className="flex items-center justify-between">
                <select
                  value={bulkOptionsMode}
                  onChange={(e) => setBulkOptionsMode(e.target.value as any)}
                  className="bg-white border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold"
                >
                  <option value="add">Añadir a las existentes</option>
                  <option value="replace">Reemplazar existentes</option>
                </select>
                <button
                  onClick={handleApplyBulkOptions}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(question.options || []).map((opt, oIdx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 w-5 text-center">{oIdx + 1}.</span>
                {surveyType === 'quiz' && question.type !== 'ordering' && (
                  <input
                    type="checkbox"
                    checked={opt.is_correct || false}
                    onChange={(e) => {
                      if (question.type === 'single_choice') {
                        const resetOpts = (question.options || []).map((o) => ({ ...o, is_correct: o.id === opt.id ? e.target.checked : false }));
                        onUpdate({ ...question, options: resetOpts });
                      } else {
                        handleUpdateOption(opt.id, { is_correct: e.target.checked });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    title="Marcar como respuesta correcta"
                  />
                )}
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleUpdateOption(opt.id, { text: e.target.value })}
                  className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                />
                <button onClick={() => handleDeleteOption(opt.id)} className="text-slate-400 hover:text-red-600 p-1">
                  ✕
                </button>
              </div>
            ))}
            <button onClick={handleAddOption} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 pt-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Elemento</span>
            </button>
          </div>
        </div>
      )}

      {/* Rating Range Settings */}
      {question.type === 'rating' && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Etiqueta Mínima (1)</label>
            <input
              type="text"
              value={question.rating_min_label || ''}
              onChange={(e) => onUpdate({ ...question, rating_min_label: e.target.value })}
              placeholder="Ej. Muy Insatisfecho"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Etiqueta Máxima (5)</label>
            <input
              type="text"
              value={question.rating_max_label || ''}
              onChange={(e) => onUpdate({ ...question, rating_max_label: e.target.value })}
              placeholder="Ej. Excelente"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
            />
          </div>
        </div>
      )}

      {/* Quiz Settings for Question */}
      {surveyType === 'quiz' && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Configuración de Quiz para esta Pregunta
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-800">Puntos:</span>
              <input
                type="number"
                min="0"
                value={question.points ?? 10}
                onChange={(e) => onUpdate({ ...question, points: parseInt(e.target.value) || 0 })}
                className="w-16 text-center font-black text-xs bg-white border border-amber-300 rounded-xl py-1 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">Retroalimentación si Acierta</label>
            <input
              type="text"
              value={question.correct_feedback || ''}
              onChange={(e) => onUpdate({ ...question, correct_feedback: e.target.value })}
              placeholder="Explicación si acierta la respuesta..."
              className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
            />
          </div>
        </div>
      )}

      {/* Footer controls: Required toggle & Jump logic toggle */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>Respuesta Obligatoria</span>
        </label>
      </div>
    </div>
  );
};
