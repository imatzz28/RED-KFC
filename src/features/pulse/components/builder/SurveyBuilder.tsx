import React, { useState, useRef, useEffect } from 'react';
import { Survey, Question, QuestionType, QuestionOption, SurveyStatus, ThemeConfig, ThankYouConfig } from '@/types';
import {
  Save, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Settings,
  Sparkles, Layers, Palette, Eye, HelpCircle, Check, Clock, Shuffle,
  Lock, FileText, ArrowRight, ShieldCheck, Zap, GitFork, LayoutGrid,
  ListOrdered, Award, RefreshCw
} from 'lucide-react';
import { QuestionEditor } from './QuestionEditor';
import { LogicFlowPanel } from './LogicFlowPanel';
import { ThemeEditor } from './ThemeEditor';
import { AccessSettings } from './AccessSettings';
import { QuizSettings } from './QuizSettings';

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
  const [activeTab, setActiveTab] = useState<'questions' | 'logic' | 'theme' | 'access' | 'quiz'>('questions');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    survey.questions[0]?.id || null
  );

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isQuiz = survey.type === 'quiz';

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newQuestions = [...survey.questions];
    const draggedItem = newQuestions[draggedIdx];
    newQuestions.splice(draggedIdx, 1);
    newQuestions.splice(index, 0, draggedItem);
    newQuestions.forEach((q, i) => (q.order = i + 1));

    setDraggedIdx(index);
    setSurvey(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

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
      options: ['single_choice', 'multiple_choice', 'ordering'].includes(type)
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
    setExpandedQuestionId(newQuestion.id);
  };

  const handleUpdateQuestion = (updatedQ: Question) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === updatedQ.id ? updatedQ : q),
    }));
  };

  const handleDeleteQuestion = (qId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== qId).map((q, idx) => ({ ...q, order: idx + 1 })),
    }));
  };

  const handleMoveUp = (idx: number) => {
    if (idx <= 0) return;
    const newQuestions = [...survey.questions];
    const temp = newQuestions[idx];
    newQuestions[idx] = newQuestions[idx - 1];
    newQuestions[idx - 1] = temp;
    newQuestions.forEach((q, i) => (q.order = i + 1));
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= survey.questions.length - 1) return;
    const newQuestions = [...survey.questions];
    const temp = newQuestions[idx];
    newQuestions[idx] = newQuestions[idx + 1];
    newQuestions[idx + 1] = temp;
    newQuestions.forEach((q, i) => (q.order = i + 1));
    setSurvey({ ...survey, questions: newQuestions });
  };

  // Tipos de pregunta permitidos: si es quiz/evaluación, solo Opción Única, Opción Múltiple, Ordenar Secuencia
  const availableQuestionTypes = [
    { type: 'single_choice', label: 'Opción Única', color: 'bg-red-600' },
    { type: 'multiple_choice', label: 'Opción Múltiple', color: 'bg-red-700' },
    { type: 'ordering', label: 'Ordenar Secuencia', color: 'bg-slate-900' },
    { type: 'rating', label: 'Escala / Estrellas', color: 'bg-[#E4002B]' },
    { type: 'yes_no', label: 'Sí / No', color: 'bg-slate-800' },
    { type: 'short_text', label: 'Texto Corto', color: 'bg-slate-700' },
    { type: 'long_text', label: 'Texto Largo', color: 'bg-slate-600' },
    { type: 'date', label: 'Fecha', color: 'bg-slate-500' },
    { type: 'store_hierarchy', label: 'Selección de Tienda KFC', color: 'bg-[#E4002B]' },
  ].filter(item => {
    if (isQuiz) {
      return ['single_choice', 'multiple_choice', 'ordering'].includes(item.type);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
        {/* Top Metadata Badges */}
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
            isQuiz ? 'bg-red-50 text-[#E4002B] border border-red-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}>
            {isQuiz ? 'EVALUACIÓN OPERATIVA (QUIZ)' : 'ENCUESTA ESTÁNDAR'}
          </span>
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Título del Formulario
          </label>
        </div>

        {/* Input & Save Button Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleAttemptExit}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition text-slate-700 cursor-pointer shrink-0 h-11 flex items-center justify-center"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-[#E4002B]" />
          </button>

          <input
            type="text"
            value={survey.title}
            onChange={e => setSurvey({ ...survey, title: e.target.value })}
            className="flex-1 w-full bg-slate-50 border-2 border-slate-200 focus:border-[#E4002B] focus:bg-white focus:ring-4 focus:ring-red-500/10 rounded-2xl px-4 text-sm font-black text-slate-900 outline-none transition shadow-2xs h-11"
            placeholder="Escribe el Título del Formulario aquí..."
          />

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                Cambios sin guardar
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs shadow-md shadow-red-600/20 transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-white" />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 text-xs font-black tracking-tight transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'questions' ? 'text-[#E4002B] border-b-2 border-[#E4002B]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-slate-500" />
          <span>Preguntas ({survey.questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logic')}
          className={`pb-3 text-xs font-black tracking-tight transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'logic' ? 'text-[#E4002B] border-b-2 border-[#E4002B]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitFork className="w-4 h-4 text-[#E4002B]" />
          <span>Flujo Lógico</span>
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          className={`pb-3 text-xs font-black tracking-tight transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'theme' ? 'text-[#E4002B] border-b-2 border-[#E4002B]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Palette className="w-4 h-4 text-slate-500" />
          <span>Diseño & Tema</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`pb-3 text-xs font-black tracking-tight transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'access' ? 'text-[#E4002B] border-b-2 border-[#E4002B]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>Acceso & Enlaces</span>
        </button>

        {isQuiz && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`pb-3 text-xs font-black tracking-tight transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'quiz' ? 'text-[#E4002B] border-b-2 border-[#E4002B]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-slate-500" />
            <span>Ajustes de Evaluación</span>
          </button>
        )}
      </div>

      {/* TAB 1: PREGUNTAS */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Añadir Preguntas */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {isQuiz ? 'Preguntas Permitidas' : 'Agregar Pregunta'}
                </h3>
                {isQuiz && (
                  <span className="text-[8px] font-black uppercase bg-red-50 text-[#E4002B] px-2 py-0.5 rounded">
                    Quiz
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {availableQuestionTypes.map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleAddQuestion(item.type as QuestionType)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200/60 font-bold text-xs text-slate-700 transition flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listado de Preguntas con Drag and Drop */}
          <div className="lg:col-span-3 space-y-4">
            {survey.questions.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Selecciona un tipo de pregunta en el menú para comenzar.</p>
              </div>
            ) : (
              survey.questions.map((q, idx) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-150 ${draggedIdx === idx ? 'opacity-40 scale-[0.98]' : 'opacity-100'}`}
                >
                  <QuestionEditor
                    question={q}
                    allQuestions={survey.questions}
                    surveyType={survey.type}
                    onUpdate={handleUpdateQuestion}
                    onDelete={() => handleDeleteQuestion(q.id)}
                    onMoveUp={() => handleMoveUp(idx)}
                    onMoveDown={() => handleMoveDown(idx)}
                    isFirst={idx === 0}
                    isLast={idx === survey.questions.length - 1}
                    isExpanded={expandedQuestionId === q.id}
                    onSelectQuestion={() => setExpandedQuestionId(q.id)}
                    onMinimizeQuestion={() => setExpandedQuestionId(null)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FLUJO LÓGICO */}
      {activeTab === 'logic' && (
        <LogicFlowPanel
          survey={survey}
          onUpdateQuestion={handleUpdateQuestion}
        />
      )}

      {/* TAB 3: TEMA VISUAL */}
      {activeTab === 'theme' && (
        <ThemeEditor
          theme={survey.theme}
          thankYou={survey.thank_you || { title: '¡Muchas Gracias!', message: 'Tus respuestas han sido registradas exitosamente.', show_button: false }}
          category={survey.category}
          onThemeUpdate={(theme) => setSurvey(prev => ({ ...prev, theme }))}
          onThankYouUpdate={(thankYou) => setSurvey(prev => ({ ...prev, thank_you: thankYou }))}
          onCategoryUpdate={(category) => setSurvey(prev => ({ ...prev, category }))}
        />
      )}

      {/* TAB 4: ACCESO */}
      {activeTab === 'access' && (
        <AccessSettings
          survey={survey}
          onUpdateSurvey={(updates) => setSurvey(prev => ({ ...prev, ...updates }))}
        />
      )}

      {/* TAB 5: QUIZ */}
      {activeTab === 'quiz' && isQuiz && (
        <QuizSettings
          survey={survey}
          onUpdateSurvey={(updates) => setSurvey(prev => ({ ...prev, ...updates }))}
        />
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
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E4002B] flex items-center justify-center">
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
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#E4002B] hover:bg-red-700 text-white transition cursor-pointer shadow-md shadow-red-600/20"
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
