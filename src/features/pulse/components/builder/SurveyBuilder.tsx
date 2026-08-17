import React, { useState } from 'react';
import { Survey, Question, QuestionType, QuestionOption, SurveyStatus, ThemeConfig, ThankYouConfig } from '@/types';
import {
  Save, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, Settings,
  Sparkles, Layers, Palette, Eye, HelpCircle, Check, Clock, Shuffle,
  Lock, FileText, ArrowRight, ShieldCheck, Zap, GitFork, LayoutGrid,
  ListOrdered, Award
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

  const isQuiz = survey.type === 'quiz';

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

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
        {/* Top Metadata Badges */}
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            isQuiz ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
          }`}>
            {isQuiz ? 'EVALUACIÓN (QUIZ)' : 'ENCUESTA ESTÁNDAR'}
          </span>
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Título del Formulario
          </label>
        </div>

        {/* Input & Save Button Row - 100% Pixel-Perfect Horizontal Alignment */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onCancel}
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

          <button
            onClick={() => onSave(survey)}
            className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs shadow-md shadow-red-600/20 transition cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs matching RED Pulse icons & labels */}
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
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Agregar Pregunta</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { type: 'single_choice', label: 'Opción Única', color: 'bg-red-600' },
                  { type: 'multiple_choice', label: 'Opción Múltiple', color: 'bg-purple-600' },
                  { type: 'ordering', label: 'Ordenar Secuencia', color: 'bg-indigo-600' },
                  { type: 'rating', label: 'Escala / Estrellas', color: 'bg-amber-500' },
                  { type: 'yes_no', label: 'Sí / No', color: 'bg-emerald-600' },
                  { type: 'short_text', label: 'Texto Corto', color: 'bg-blue-500' },
                  { type: 'long_text', label: 'Texto Largo', color: 'bg-sky-500' },
                  { type: 'date', label: 'Fecha', color: 'bg-pink-500' },
                  { type: 'store_hierarchy', label: 'Selección de Tienda KFC', color: 'bg-teal-600' },
                ].map(item => (
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
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-150 ${draggedIdx === idx ? 'opacity-30 scale-[0.98]' : 'opacity-100'}`}
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

      {/* TAB 2: DIAGRAMA DE LÓGICA (CANVAS FLOW) */}
      {activeTab === 'logic' && (
        <LogicFlowPanel
          survey={survey}
          onUpdateQuestion={handleUpdateQuestion}
        />
      )}

      {/* TAB 3: DISEÑO & TEMA */}
      {activeTab === 'theme' && (
        <ThemeEditor
          theme={survey.theme}
          thankYou={survey.thank_you}
          category={survey.category}
          onThemeUpdate={theme => setSurvey({ ...survey, theme })}
          onThankYouUpdate={thank_you => setSurvey({ ...survey, thank_you })}
          onCategoryUpdate={category => setSurvey({ ...survey, category })}
        />
      )}

      {/* TAB 4: ACCESO & ENLACES */}
      {activeTab === 'access' && (
        <AccessSettings
          survey={survey}
          onUpdateSurvey={updated => setSurvey({ ...survey, ...updated })}
        />
      )}

      {/* TAB 5: AJUSTES DE EVALUACIÓN */}
      {activeTab === 'quiz' && isQuiz && (
        <QuizSettings
          survey={survey}
          onUpdateSurvey={updated => setSurvey({ ...survey, ...updated })}
        />
      )}
    </div>
  );
};
