import React from 'react';
import { Survey } from '@/types';
import { Award, Clock, RotateCcw, Target } from 'lucide-react';

interface QuizSettingsProps {
  survey: Survey;
  onUpdateSurvey: (updated: Partial<Survey>) => void;
}

export const QuizSettings: React.FC<QuizSettingsProps> = ({ survey, onUpdateSurvey }) => {
  const isQuiz = survey.type === 'quiz';

  if (!isQuiz) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center text-amber-900">
        <p className="font-bold text-sm">Esta es una Encuesta estándar de recolección de datos.</p>
        <p className="text-xs text-amber-700 mt-1">
          Para habilitar calificación, temporizador y evaluaciones avanzadas, cambia el tipo a <strong>Evaluación / Quiz</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      {/* Encabezado Verde como en la captura */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Award className="w-5 h-5 text-emerald-600" />
        <h3 className="font-black text-slate-900 text-sm">Módulo de Evaluación con Calificación</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna Izquierda: Modo de Calificación y Umbral */}
        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Modo de Calificación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSurvey({ scoring_type: 'simple' })}
                className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                  (survey.scoring_type || 'simple') === 'simple'
                    ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="font-black">Simple (% Aciertos)</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Todas las preguntas valen igual.</p>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSurvey({ scoring_type: 'weighted' })}
                className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                  survey.scoring_type === 'weighted'
                    ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                <p className="font-black">Ponderado (Puntos)</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Cada pregunta tiene sus propios puntos.</p>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Umbral Mínimo de Aprobación (%)
              </label>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={survey.passing_score_percent ?? 70}
                onChange={(e) => onUpdateSurvey({ passing_score_percent: Number(e.target.value) })}
                className="flex-1 accent-emerald-600 cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={survey.passing_score_percent ?? 70}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  onUpdateSurvey({ passing_score_percent: val });
                }}
                className="w-16 text-xs font-black text-emerald-900 bg-emerald-50/60 border border-emerald-300 rounded-xl px-2 py-1 text-center outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Visibilidad de Resultados al Finalizar
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Configura si el evaluado podrá ver su calificación y estado de aprobación al terminar.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition shadow-2xs">
                <input
                  type="checkbox"
                  checked={survey.show_results_immediately ?? true}
                  onChange={(e) => onUpdateSurvey({ show_results_immediately: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-black text-slate-900 block">
                    Mostrar resultado y puntaje al finalizar
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    El usuario verá su puntaje (% obtenido) y si aprobó o no la evaluación al enviar sus respuestas.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition shadow-2xs">
                <input
                  type="checkbox"
                  checked={survey.show_results_in_reports ?? true}
                  onChange={(e) => onUpdateSurvey({ show_results_in_reports: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-black text-slate-900 block">
                    Registrar en reportes de coordinador / admin
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Permite consolidar la nota y métricas de este intento en el panel de reportes gerenciales.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Temporizador, Intentos y Aleatorización */}
        <div className="space-y-5 md:border-l md:border-slate-100 md:pl-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Tiempo Límite (Temporizador)
              </label>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {(survey.time_limit_seconds || 0) > 0 ? `${Math.round((survey.time_limit_seconds || 0) / 60)} min (${survey.time_limit_seconds}s)` : 'Sin límite'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={survey.time_limit_seconds || 0}
                  onChange={(e) => {
                    onUpdateSurvey({ time_limit_seconds: Number(e.target.value) });
                  }}
                  className="flex-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={0}>Sin límite de tiempo</option>
                  <option value={60}>1 minuto</option>
                  <option value={180}>3 minutos</option>
                  <option value={300}>5 minutos</option>
                  <option value={600}>10 minutos</option>
                  <option value={900}>15 minutos</option>
                  <option value={1200}>20 minutos</option>
                  <option value={1500}>25 minutos</option>
                  <option value={1800}>30 minutos</option>
                  <option value={2700}>45 minutos</option>
                  <option value={3600}>60 minutos</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Límite de Intentos por Persona
            </label>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={survey.max_attempts || 0}
                onChange={(e) => onUpdateSurvey({ max_attempts: Number(e.target.value) })}
                className="flex-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={0}>Intentos Ilimitados</option>
                <option value={1}>1 solo intento (Estricto)</option>
                <option value={2}>2 intentos</option>
                <option value={3}>3 intentos</option>
                <option value={5}>5 intentos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Aleatorización por Intento
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={survey.shuffle_questions ?? false}
                  onChange={(e) => onUpdateSurvey({ shuffle_questions: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Mezclar orden de las preguntas</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={survey.shuffle_options ?? false}
                  onChange={(e) => onUpdateSurvey({ shuffle_options: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Mezclar orden de opciones de respuesta</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
