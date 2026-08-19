import React, { useState, useRef, useEffect } from 'react';
import { Survey, Question, QuestionType, QuestionOption, SurveyStatus, ThemeConfig } from '@/types';
import {
  Save, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Settings,
  Sparkles, Layers, Palette, Eye, HelpCircle, Check, Clock, Shuffle,
  Lock, FileText, ArrowRight, ShieldCheck, Zap, RefreshCw
} from 'lucide-react';

interface SurveyBuilderProps {
  initialSurvey: Survey;
  onSave: (survey: Survey) => void;
  onCancel: () => void;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({
  initialSurvey,
  onSave,
  onCancel,
}) => {
  const [survey, setSurvey] = useState<Survey>(initialSurvey);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'theme' | 'logic'>('questions');
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialSnapshotRef = useRef<string>(JSON.stringify(initialSurvey));
  const hasUnsavedChanges = JSON.stringify(survey) !== initialSnapshotRef.current;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAttemptExit = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      onCancel();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    initialSnapshotRef.current = JSON.stringify(survey);
    await onSave(survey);
    setIsSaving(false);
  };

  const isQuiz = survey.type === 'quiz';

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      survey_id: survey.id,
      type,
      title: 'Nueva Pregunta',
      description: '',
      order: survey.questions.length + 1,
      required: true,
      points: isQuiz ? 10 : undefined,
      options: ['single_choice', 'multiple_choice'].includes(type)
        ? [
            { id: `opt_1_${Date.now()}`, question_id: '', text: 'Opción 1', value: 'opt_1', is_correct: isQuiz ? true : undefined },
            { id: `opt_2_${Date.now()}`, question_id: '', text: 'Opción 2', value: 'opt_2', is_correct: false },
          ]
        : undefined,
    };

    setSurvey(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  const handleUpdateQuestion = (qId: string, updates: Partial<Question>) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === qId ? { ...q, ...updates } : q),
    }));
  };

  const handleDeleteQuestion = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== qId),
    }));
  };

  const handleAddOption = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        const optCount = (q.options?.length || 0) + 1;
        const newOpt: QuestionOption = {
          id: `opt_${optCount}_${Date.now()}`,
          question_id: qId,
          text: `Opción ${optCount}`,
          value: `opt_${optCount}`,
          is_correct: false,
        };
        return {
          ...q,
          options: [...(q.options || []), newOpt],
        };
      }),
    }));
  };

  const handleUpdateOption = (qId: string, optId: string, updates: Partial<QuestionOption>) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).map(opt => {
            if (opt.id !== optId) return opt;
            return { ...opt, ...updates };
          }),
        };
      }),
    }));
  };

  const handleDeleteOption = (qId: string, optId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).filter(opt => opt.id !== optId),
        };
      }),
    }));
  };

  const handleToggleCorrectOption = (qId: string, optId: string, isSingle: boolean) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).map(opt => {
            if (isSingle) {
              return { ...opt, is_correct: opt.id === optId };
            } else {
              return opt.id === optId ? { ...opt, is_correct: !opt.is_correct } : opt;
            }
          }),
        };
      }),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAttemptExit}
            className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500 cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-red-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isQuiz ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {isQuiz ? 'Evaluación (Quiz)' : 'Encuesta'}
              </span>
              <input
                type="text"
                value={survey.title}
                onChange={e => setSurvey({ ...survey, title: e.target.value })}
                className="text-base font-black text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-red-500 outline-none transition bg-transparent"
                placeholder="Título de la Encuesta..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              Cambios sin guardar
            </span>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs shadow-md shadow-red-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
            activeTab === 'questions' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          1. Preguntas ({survey.questions.length})
        </button>
        <button
          onClick={() => setActiveTab('logic')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
            activeTab === 'logic' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          2. Lógica de Saltos (*Skip Logic*)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
            activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          3. Parámetros {isQuiz && '& Quiz'}
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
            activeTab === 'theme' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          4. Tema Visual
        </button>
      </div>

      {/* TAB 1: PREGUNTAS */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Añadir Preguntas */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {isQuiz ? 'Preguntas Permitidas (Quiz)' : 'Agregar Pregunta'}
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { type: 'single_choice', label: 'Selección Única', color: 'bg-[#E4002B]' },
                  { type: 'multiple_choice', label: 'Selección Múltiple', color: 'bg-red-700' },
                  { type: 'ordering', label: 'Ordenar Secuencia', color: 'bg-slate-900' },
                  { type: 'rating', label: 'Calificación (1-5 Estrellas)', color: 'bg-[#E4002B]' },
                  { type: 'yes_no', label: 'Sí / No', color: 'bg-slate-800' },
                  { type: 'short_text', label: 'Texto Corto', color: 'bg-slate-700' },
                  { type: 'long_text', label: 'Respuesta Larga', color: 'bg-slate-600' },
                  { type: 'store_hierarchy', label: 'Selección de Tienda (CECO)', color: 'bg-[#E4002B]' },
                ].filter(item => {
                  if (isQuiz) {
                    return ['single_choice', 'multiple_choice', 'ordering'].includes(item.type);
                  }
                  return true;
                }).map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddQuestion(item.type as QuestionType)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-[#E4002B] border border-slate-200/60 font-bold text-xs text-slate-700 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listado de Preguntas en Edición */}
          <div className="lg:col-span-3 space-y-4">
            {survey.questions.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Selecciona un tipo de pregunta en el menú de la izquierda para comenzar.</p>
              </div>
            ) : (
              survey.questions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 relative group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={q.title}
                        onChange={e => handleUpdateQuestion(q.id, { title: e.target.value })}
                        className="w-full font-black text-sm text-slate-900 border-b border-slate-200 focus:border-red-500 outline-none pb-1"
                        placeholder="Título de la pregunta..."
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Descripción opcional */}
                  <div>
                    <input
                      type="text"
                      value={q.description || ''}
                      onChange={e => handleUpdateQuestion(q.id, { description: e.target.value })}
                      className="w-full text-xs font-medium text-slate-500 border-b border-slate-100 focus:border-slate-300 outline-none pb-0.5"
                      placeholder="Instrucción adicional (opcional)..."
                    />
                  </div>

                  {/* Edición de Opciones para Selección Única / Múltiple */}
                  {['single_choice', 'multiple_choice'].includes(q.type) && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Opciones de Respuesta</label>
                      {(q.options || []).map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                          {isQuiz && (
                            <button
                              onClick={() => handleToggleCorrectOption(q.id, opt.id, q.type === 'single_choice')}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                                opt.is_correct ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-400 border-slate-200'
                              }`}
                              title={opt.is_correct ? 'Opción Correcta' : 'Marcar como Respuesta Correcta'}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => handleUpdateOption(q.id, opt.id, { text: e.target.value })}
                            className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-red-500"
                          />
                          <button
                            onClick={() => handleDeleteOption(q.id, opt.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddOption(q.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Opción</span>
                      </button>
                    </div>
                  )}

                  {/* Puntos y Retroalimentación para Quiz */}
                  {isQuiz && (
                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Puntaje asignado:</span>
                        <input
                          type="number"
                          min="1"
                          value={q.points || 10}
                          onChange={e => handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 0 })}
                          className="w-20 text-center font-black text-xs bg-slate-50 border border-slate-200 rounded-xl py-1 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Retroalimentación Correcta</label>
                        <input
                          type="text"
                          value={q.correct_feedback || ''}
                          onChange={e => handleUpdateQuestion(q.id, { correct_feedback: e.target.value })}
                          placeholder="Explicación si acierta (ej. ¡Excelente! El estándar es de 180°C)..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-medium outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LÓGICA DE SALTOS (SKIP LOGIC) */}
      {activeTab === 'logic' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Reglas de Saltos Condicionales (*Skip Logic*)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Redirige al participante a preguntas específicas según la opción que seleccione.
            </p>
          </div>

          <div className="space-y-4">
            {survey.questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-black text-xs text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{q.title}</span>
                </div>

                {['single_choice', 'yes_no'].includes(q.type) ? (
                  <div className="space-y-2 pl-7">
                    {(q.options || (q.type === 'yes_no' ? [{ id: 'y', text: 'Sí', value: 'si' }, { id: 'n', text: 'No', value: 'no' }] : [])).map(opt => (
                      <div key={opt.id} className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-slate-600 min-w-[100px]">Si elige "{opt.text}":</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          value={opt.next_question_id || 'next'}
                          onChange={e => handleUpdateOption(q.id, opt.id, { next_question_id: e.target.value === 'next' ? undefined : e.target.value })}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 outline-none"
                        >
                          <option value="next">Ir a la Siguiente Pregunta</option>
                          {survey.questions.filter(otherQ => otherQ.id !== q.id).map((otherQ, otherIdx) => (
                            <option key={otherQ.id} value={otherQ.id}>
                              Saltar a P{otherIdx + 1}: {otherQ.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 italic pl-7">
                    Los saltos condicionales están disponibles para preguntas de Selección Única y Sí/No.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN Y QUIZ SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-2xl space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Parámetros de la Encuesta</h3>

          {/* Categoría */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoría</label>
            <input
              type="text"
              value={survey.category || 'General'}
              onChange={e => setSurvey({ ...survey, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
            />
          </div>

          {/* Reglas de Examen en Quizzes */}
          {isQuiz && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Configuración de Calificación
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">Nota Mínima de Aprobación (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={survey.passing_score_percent || 70}
                    onChange={e => setSurvey({ ...survey, passing_score_percent: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">Límite de Tiempo (Segundos)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 para sin límite"
                    value={survey.time_limit_seconds || 0}
                    onChange={e => setSurvey({ ...survey, time_limit_seconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-black outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={survey.shuffle_questions || false}
                    onChange={e => setSurvey({ ...survey, shuffle_questions: e.target.checked })}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Aleatorizar orden de preguntas</span>
                </label>
              </div>
            </div>
          )}

          {/* Mensaje de Agradecimiento */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Pantalla Final (Agradecimiento)</h4>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Título Final</label>
              <input
                type="text"
                value={survey.thank_you.title}
                onChange={e => setSurvey({ ...survey, thank_you: { ...survey.thank_you, title: e.target.value } })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mensaje Final</label>
              <textarea
                value={survey.thank_you.message}
                onChange={e => setSurvey({ ...survey, thank_you: { ...survey.thank_you, message: e.target.value } })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none h-20"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEMA VISUAL */}
      {activeTab === 'theme' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm max-w-xl space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Palette className="w-4 h-4 text-red-600" />
            Personalización Visual de la Encuesta
          </h3>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Color Principal de Marca</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={survey.theme.primary_color || '#E4002B'}
                onChange={e => setSurvey({ ...survey, theme: { ...survey.theme, primary_color: e.target.value } })}
                className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-700">{survey.theme.primary_color}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estilo de Tarjeta</label>
            <div className="grid grid-cols-3 gap-3">
              {(['standard', 'glass', 'minimal'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setSurvey({ ...survey, theme: { ...survey.theme, card_style: style } })}
                  className={`p-3 rounded-2xl border text-center font-bold text-xs capitalize transition ${
                    survey.theme.card_style === style
                      ? 'bg-red-600 text-white border-red-700 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación: Salir sin Guardar */}
      {showExitConfirmModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowExitConfirmModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">¿Salir sin guardar los cambios?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Tienes modificaciones pendientes en este formulario. Si sales ahora, se perderán los cambios recientes.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onCancel();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-md shadow-rose-600/20"
              >
                Salir sin Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
