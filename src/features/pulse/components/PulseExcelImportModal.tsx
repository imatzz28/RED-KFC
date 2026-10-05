import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload, FileDown, CheckCircle2, AlertTriangle,
  X, Clock, Award, Check, RefreshCw
} from 'lucide-react';
import { Survey } from '@/types';
import {
  PulseExcelImportResult,
  downloadPulseExcelTemplate,
  parsePulseExcel
} from '../utils/pulseExcelUtils';

const getQuestionTypeBadgeLabel = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'single_choice':
      return 'Opción Única';
    case 'multiple_choice':
      return 'Opción Múltiple';
    case 'yes_no':
      return 'Sí / No';
    case 'ordering':
      return 'Ordenamiento';
    case 'rating':
      return 'Calificación';
    case 'short_text':
      return 'Texto Corto';
    case 'long_text':
      return 'Texto Largo';
    case 'store_hierarchy':
      return 'Jerarquía';
    case 'date':
      return 'Fecha';
    case 'file_upload':
      return 'Archivo';
    default:
      return (type || '').replace(/_/g, ' ');
  }
};

interface PulseExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (survey: Survey, openInBuilder: boolean) => void;
  currentUserId?: string;
  currentUsername?: string;
}

export const PulseExcelImportModal: React.FC<PulseExcelImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  currentUserId,
  currentUsername,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<PulseExcelImportResult | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Por favor selecciona un archivo de Excel válido (.xlsx o .xls).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await parsePulseExcel(file, {
        id: currentUserId || 'admin',
        username: currentUsername || 'Administrador',
      });
      setImportResult(result);
      setEditedTitle(result.survey.title);
    } catch (err: any) {
      console.error('Error parseando plantilla Excel:', err);
      setError(err?.message || 'Error al procesar el archivo Excel. Verifica el formato de la plantilla.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirm = (openInBuilder: boolean) => {
    if (!importResult) return;
    const finalSurvey: Survey = {
      ...importResult.survey,
      title: editedTitle.trim() || importResult.survey.title,
    };
    onConfirmImport(finalSurvey, openInBuilder);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setImportResult(null);
    setError(null);
    setIsLoading(false);
    setEditedTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isQuiz = importResult?.survey.type === 'quiz';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Red header accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 z-20" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between relative z-10">
          <h2 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900 leading-tight">
            Cargar Formulario desde Excel
          </h2>

          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar relative z-10 bg-white">
          {/* Si no hay resultado cargado */}
          {!importResult && (
            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-red-500 bg-red-50/40 scale-[1.01]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isDragging ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-800">
                    {isLoading
                      ? 'Procesando archivo...'
                      : 'Arrastra tu archivo Excel aquí o haz clic para examinar'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Archivos admitidos: .xlsx o .xls
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs animate-in fade-in duration-150">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">
                    <p className="font-bold text-red-900">No se pudo procesar el archivo:</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Template Download Banner */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                    Instrucciones
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    Descarga la plantilla con ejemplos para estructurar preguntas y respuestas
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadPulseExcelTemplate}
                  className="px-4 py-2 bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-slate-500" />
                  <span>Descargar Plantilla</span>
                </button>
              </div>

              {/* Guía Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    1. Hoja "Configuracion"
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Define Título, Tipo (quiz o survey), Categoría y Tiempo Límite.
                  </p>
                </div>
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    2. Hoja "Preguntas"
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Escribe la pregunta, su tipo, puntos y opciones A, B, C, D.
                  </p>
                </div>
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    3. Respuesta Correcta
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Indica la letra de la respuesta correcta (ej: A o A, C) para calificar automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Si ya hay resultado parseado */}
          {importResult && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl ${
                      isQuiz ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {isQuiz ? 'EVALUACIÓN (QUIZ)' : 'ENCUESTA'}
                    </span>

                    <span className="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                      {importResult.survey.category || 'General'}
                    </span>

                    <span className="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {importResult.totalQuestions} Preguntas
                    </span>

                    {isQuiz && (
                      <span className="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-500" />
                        {importResult.quizPointsTotal} Pts ({importResult.survey.passing_score_percent}% Mínimo)
                      </span>
                    )}

                    {importResult.survey.time_limit_seconds ? (
                      <span className="text-[9px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {Math.round(importResult.survey.time_limit_seconds / 60)} min
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cambiar archivo</span>
                  </button>
                </div>

                {/* Editable Title */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Título del Formulario
                  </label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 outline-none transition"
                    placeholder="Título del formulario..."
                  />
                </div>
              </div>

              {/* Warnings List */}
              {importResult.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-amber-900 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Observaciones ({importResult.warnings.length}):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-medium text-amber-800">
                    {importResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions Preview List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Preguntas Detectadas ({importResult.survey.questions.length})
                  </h3>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {importResult.survey.questions.map((q, idx) => {
                    return (
                      <div
                        key={q.id}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition space-y-2 shadow-2xs"
                      >
                        {/* Header fila pregunta */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {q.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                              {getQuestionTypeBadgeLabel(q.type)}
                            </span>
                            {isQuiz && q.points !== undefined && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                                {q.points} pts
                              </span>
                            )}
                            {q.required && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                                Obligatoria
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Opciones */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                            {q.options.map((opt, oIdx) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isCorrect = opt.is_correct;

                              return (
                                <div
                                  key={opt.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl text-[11px] border border-slate-200 transition ${
                                    isCorrect
                                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                                      : 'bg-slate-50/70 text-slate-700 font-medium'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                    <span className="w-5 h-5 rounded-md font-black text-[10px] flex items-center justify-center shrink-0 bg-slate-100 text-slate-700 border border-slate-200/60">
                                      {letter}
                                    </span>
                                    <span className="truncate">
                                      {opt.text}
                                    </span>
                                  </div>

                                  {isCorrect && (
                                    <div className="shrink-0 flex items-center justify-center" title="Respuesta Correcta">
                                      <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Retroalimentación sin emoji */}
                        {q.correct_feedback && (
                          <div className="text-[11px] text-slate-500 bg-slate-50/80 border border-slate-100 px-3 py-1.5 rounded-xl">
                            <span className="font-bold text-slate-700">Retroalimentación:</span> {q.correct_feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            Cancelar
          </button>

          {importResult && (
            <>
              <button
                type="button"
                onClick={() => handleConfirm(false)}
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-900 text-slate-700 hover:text-white border border-slate-200 hover:border-slate-800 text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
              >
                Guardar
              </button>

              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-red-600/20 cursor-pointer active:scale-95"
              >
                Editar
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
