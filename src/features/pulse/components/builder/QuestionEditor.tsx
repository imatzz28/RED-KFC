import React, { useState } from 'react';
import { Question, QuestionType, QuestionOption, JumpRule } from '@/types';
import {
  Type, AlignLeft, CircleDot, CheckSquare, Star, ToggleLeft,
  Calendar, Upload, Plus, Trash2, GitFork, GripVertical,
  ChevronDown, ChevronUp, ListPlus, FileText, X, Sparkles,
  Minimize2, MapPin, ListOrdered, Pencil, BookTemplate, Award
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

const OPTION_TEMPLATES: { name: string; category: string; options: string[] }[] = [
  {
    name: 'Nivel de Satisfacción',
    category: 'Satisfacción',
    options: ['Muy Satisfecho', 'Satisfecho', 'Neutral / Regular', 'Insatisfecho', 'Muy Insatisfecho'],
  },
  {
    name: 'Escala de Acuerdo',
    category: 'Opinión',
    options: ['Totalmente de Acuerdo', 'De Acuerdo', 'Neutral', 'En Desacuerdo', 'Totalmente en Desacuerdo'],
  },
  {
    name: 'Calificación de Desempeño',
    category: 'Evaluación',
    options: ['Excelente', 'Bueno', 'Regular', 'Deficiente'],
  },
  {
    name: 'Frecuencia de Ocurrencia',
    category: 'Frecuencia',
    options: ['Siempre', 'Casi Siempre', 'Frecuentemente', 'Rara Vez', 'Nunca'],
  },
  {
    name: 'Probabilidad / Recomendación',
    category: 'Recomendación',
    options: ['Definitivamente Sí', 'Probablemente Sí', 'Probablemente No', 'Definitivamente No'],
  },
  {
    name: 'Cumplimiento Operativo KFC',
    category: 'Auditoría',
    options: ['Cumple al 100%', 'Cumple Parcialmente', 'No Cumple / Crítico'],
  },
  {
    name: 'Sí / No / No Aplica',
    category: 'Dicotómica',
    options: ['Sí', 'No', 'No Aplica'],
  },
  {
    name: 'Verdadero / Falso',
    category: 'Quiz',
    options: ['Verdadero', 'Falso'],
  },
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState('');
  const [bulkOptionsMode, setBulkOptionsMode] = useState<'add' | 'replace'>('add');

  const availableQuestionTypes = QUESTION_TYPES;

  const currentTypeObj = QUESTION_TYPES.find((t) => t.type === question.type) || QUESTION_TYPES[0];
  const CurrentTypeIcon = currentTypeObj.icon;
  const isCollapsed = isExpanded !== undefined ? !isExpanded : question.isCollapsed;
  const isGradable = ['single_choice', 'multiple_choice', 'ordering', 'yes_no'].includes(question.type);

  const handleExpand = () => {
    if (onSelectQuestion) onSelectQuestion();
    else onUpdate({ ...question, isCollapsed: false });
  };

  const handleMinimize = () => {
    if (onMinimizeQuestion) onMinimizeQuestion();
    else onUpdate({ ...question, isCollapsed: true });
  };

  const handleUpdateOption = (optId: string, updates: Partial<QuestionOption>) => {
    const updatedOptions = (question.options || []).map((opt) =>
      opt.id === optId ? { ...opt, ...updates } : opt
    );
    onUpdate({ ...question, options: updatedOptions });
  };

  const handleAddOption = () => {
    const currentOptions = question.options || [];
    const newIndex = currentOptions.length + 1;
    const newOpt: QuestionOption = {
      id: generateId('opt'),
      question_id: question.id,
      text: `Opción ${newIndex}`,
      value: `opt_${newIndex}`,
      is_correct: false,
    };
    onUpdate({ ...question, options: [...currentOptions, newOpt] });
  };

  const handleRemoveOption = (optId: string) => {
    const updatedOptions = (question.options || []).filter((opt) => opt.id !== optId);
    onUpdate({ ...question, options: updatedOptions });
  };

  const handleApplyTemplate = (template: typeof OPTION_TEMPLATES[0]) => {
    const newOptions: QuestionOption[] = template.options.map((optText, idx) => ({
      id: generateId('opt'),
      question_id: question.id,
      text: optText,
      value: `opt_${idx + 1}`,
      is_correct: surveyType === 'quiz' && idx === 0 ? true : false,
    }));
    onUpdate({ ...question, options: newOptions });
    setShowTemplates(false);
  };

  const handleApplyBulkOptions = () => {
    const lines = bulkOptionsText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const newOptions: QuestionOption[] = lines.map((line, idx) => ({
      id: generateId('opt'),
      question_id: question.id,
      text: line,
      value: `opt_${idx + 1}`,
      is_correct: false,
    }));

    if (bulkOptionsMode === 'replace') {
      onUpdate({ ...question, options: newOptions });
    } else {
      const current = question.options || [];
      onUpdate({ ...question, options: [...current, ...newOptions] });
    }

    setBulkOptionsText('');
    setShowBulkOptions(false);
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
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
            #{question.order}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {currentTypeObj.label}
              </span>
              {surveyType === 'quiz' && (
                isGradable ? (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Award className="w-2.5 h-2.5" />
                    {question.points ?? 10} pts
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                    Informativa
                  </span>
                )
              )}
              {question.required && (
                <span className="text-[9px] font-black text-[#E4002B] uppercase tracking-wider">* Obligatoria</span>
              )}
            </div>
            <h4 className="text-xs font-black text-slate-900 truncate">
              {question.title || 'Pregunta sin título'}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExpand}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition cursor-pointer"
            title="Eliminar Pregunta"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // EXPANDED / FULL EDITOR VIEW
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-5 space-y-5 border-l-4 border-l-[#E4002B] animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-[#E4002B] text-white font-black text-xs flex items-center justify-center shadow-xs">
            #{question.order}
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo de Pregunta</span>
            <select
              value={question.type}
              onChange={(e) => onUpdate({ ...question, type: e.target.value as QuestionType })}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-black text-slate-800 outline-none focus:border-[#E4002B] cursor-pointer"
            >
              {availableQuestionTypes.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>

          {surveyType === 'quiz' && (
            isGradable ? (
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Puntos</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={question.points ?? 10}
                    onChange={(e) => onUpdate({ ...question, points: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-16 bg-emerald-50/70 border border-emerald-300 rounded-xl px-2.5 py-1 text-xs font-black text-emerald-900 outline-none focus:border-emerald-500 text-center"
                  />
                  <span className="text-[10px] font-black text-emerald-700">pts</span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Calificación</span>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl block">
                  Campo Informativo (Sin Puntos)
                </span>
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMinimize}
            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Minimizar</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Eliminar Pregunta"
          >
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              {question.type === 'ordering' ? 'Secuencia de Elementos a Ordenar' : 'Opciones de Respuesta'}
            </label>

            {/* Template & Bulk Actions */}
            <div className="flex items-center gap-2">
              {question.type !== 'ordering' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplates(!showTemplates);
                      setShowBulkOptions(false);
                    }}
                    className="text-xs font-black text-[#E4002B] bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <BookTemplate className="w-3.5 h-3.5" />
                    <span>Plantillas de Respuestas</span>
                  </button>

                  {/* Dropdown Menu de Plantillas */}
                  {showTemplates && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 z-50 animate-in zoom-in-95 duration-150 space-y-1">
                      <div className="px-2 py-1 border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selecciona una Plantilla</span>
                        <button type="button" onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                        {OPTION_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            className="w-full text-left p-2 rounded-xl hover:bg-red-50 group transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 group-hover:text-[#E4002B]">
                                {tpl.name}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {tpl.options.length}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              {tpl.options.join(' • ')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowBulkOptions(!showBulkOptions);
                  setShowTemplates(false);
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Importar Masivo</span>
              </button>
            </div>
          </div>

          {/* Bulk Options Importer Box */}
          {showBulkOptions && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-slate-700">Pega las opciones (una por línea):</span>
              <textarea
                value={bulkOptionsText}
                onChange={(e) => setBulkOptionsText(e.target.value)}
                placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none h-24 shadow-2xs"
              />
              <div className="flex items-center justify-between">
                <select
                  value={bulkOptionsMode}
                  onChange={(e) => setBulkOptionsMode(e.target.value as any)}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="add">Añadir a las existentes</option>
                  <option value="replace">Reemplazar existentes</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyBulkOptions}
                  className="px-5 py-2 bg-[#E4002B] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 cursor-pointer"
                >
                  Aplicar Opciones
                </button>
              </div>
            </div>
          )}

          {/* Individual Options List */}
          <div className="space-y-2">
            {(question.options || []).map((opt, oIdx) => (
              <div key={opt.id} className="flex items-center gap-2 bg-slate-50/60 p-1.5 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-black text-slate-400 w-6 text-center">{oIdx + 1}.</span>
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
                    className="w-4 h-4 rounded border-slate-300 text-[#E4002B] focus:ring-red-500 cursor-pointer"
                    title="Marcar como respuesta correcta"
                  />
                )}
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleUpdateOption(opt.id, { text: e.target.value })}
                  className="flex-1 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#E4002B]"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteOption(opt.id)}
                  className="text-slate-400 hover:text-red-600 p-1.5 transition cursor-pointer"
                  title="Eliminar Opción"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              className="text-xs font-black text-[#E4002B] hover:text-red-700 flex items-center gap-1.5 pt-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Opción Manual</span>
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
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#E4002B]"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Etiqueta Máxima (5)</label>
            <input
              type="text"
              value={question.rating_max_label || ''}
              onChange={(e) => onUpdate({ ...question, rating_max_label: e.target.value })}
              placeholder="Ej. Muy Satisfecho"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#E4002B]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
