import React, { useState, useEffect, useMemo } from 'react';
import { Survey, SurveyStatus } from '@/types';
import {
  FileSpreadsheet, Plus, Search, Edit3, Trash2, Copy, Play, BarChart2,
  CheckCircle2, Clock, Archive, Sparkles, Filter, ChevronRight, Share2, QrCode, Check, Eye, RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';

import { dataService } from '@/services/dataService';

interface SurveyListProps {
  surveys: Survey[];
  responsesCountMap: Record<string, number>;
  onCreateNew: (type: 'survey' | 'quiz') => void;
  onEdit: (survey: Survey) => void;
  onPlay: (survey: Survey) => void;
  onReports: (survey: Survey) => void;
  onDuplicate: (survey: Survey) => void;
  onDelete: (surveyId: string) => void;
  onToggleStatus: (survey: Survey, status: SurveyStatus) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  surveys,
  responsesCountMap,
  onCreateNew,
  onEdit,
  onPlay,
  onReports,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onRefresh,
  isRefreshing,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'survey' | 'quiz'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [shareModalSurvey, setShareModalSurvey] = useState<Survey | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const categories = useMemo(() => dataService.getSurveyCategories(), []);

  useEffect(() => {
    if (shareModalSurvey) {
      const url = `${window.location.origin}/pulse/play/${shareModalSurvey.id}`;
      QRCode.toDataURL(url, { width: 180, margin: 1 })
        .then(dataUrl => setQrDataUrl(dataUrl))
        .catch(err => console.error('Error generando QR:', err));
    } else {
      setQrDataUrl('');
    }
  }, [shareModalSurvey]);

  const getSurveyTimestamp = (s: Survey): number => {
    if (s.created_at) {
      const t = new Date(s.created_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (s.updated_at) {
      const t = new Date(s.updated_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (s.id) {
      const match = s.id.match(/\d{10,13}/);
      if (match) {
        const num = parseInt(match[0], 10);
        return num < 10000000000 ? num * 1000 : num;
      }
    }
    return 0;
  };

  const filteredSurveys = useMemo(() => {
    return surveys
      .filter(s => {
        const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
                              (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
                              (s.category || '').toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || s.type === filterType;
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
        const matchesCategory = filterCategory === 'all' || (s.category || 'General') === filterCategory;
        return matchesSearch && matchesType && matchesStatus && matchesCategory;
      })
      .sort((a, b) => getSurveyTimestamp(b) - getSurveyTimestamp(a));
  }, [surveys, search, filterType, filterStatus, filterCategory]);

  const getShareUrl = (surveyId: string) => {
    return `${window.location.origin}/pulse/play/${surveyId}`;
  };

  const handleCopyLink = (surveyId: string) => {
    const url = getShareUrl(surveyId);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-red-600" />
            Pulse
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Crea, administra y califica formularios operativos para equipos de KFC.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-2xl border transition flex items-center justify-center cursor-pointer ${
                isRefreshing
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Refrescar respuestas y encuestas"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
            </button>
          )}

          <button
            onClick={() => onCreateNew('survey')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            <span>Nueva Encuesta</span>
          </button>

          <button
            onClick={() => onCreateNew('quiz')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs shadow-md shadow-red-600/20 transition group cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nueva Evaluación (Quiz)</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs items-center">
        <div className="sm:col-span-2 md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, categoría o palabra clave..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 transition"
          />
        </div>

        <div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">Todas las Categorías ({surveys.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({surveys.filter(s => (s.category || 'General') === cat).length})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">Todos los Tipos</option>
            <option value="survey">Encuestas de Opinión</option>
            <option value="quiz">Evaluaciones (Quizzes)</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
            <option value="archived">Archivadas</option>
          </select>
        </div>
      </div>

      {/* Survey List View */}
      {filteredSurveys.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800">No hay formularios creados</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Crea tu primera encuesta de satisfacción o examen de conocimientos para el personal de tiendas.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-5">Tipo</th>
                  <th className="py-4 px-5">Formulario</th>
                  <th className="py-4 px-4 text-center">Preguntas</th>
                  <th className="py-4 px-4 text-center">Respuestas</th>
                  <th className="py-4 px-4 text-center">Estado</th>
                  <th className="py-4 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSurveys.map(survey => {
                  const respCount = responsesCountMap[survey.id] || 0;
                  const isQuiz = survey.type === 'quiz';
                  const hasCustomDesc = survey.description && 
                    survey.description.trim() !== '' && 
                    survey.description !== 'Ingresa una breve descripción de los objetivos de este formulario.' &&
                    survey.description !== 'Sin descripción asignada.';

                  return (
                    <tr
                      key={survey.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Tipo */}
                      <td className="py-4 px-5 align-middle">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-xl whitespace-nowrap ${
                          isQuiz 
                            ? 'bg-red-50 text-[#E4002B] border border-red-200' 
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isQuiz ? 'bg-[#E4002B]' : 'bg-slate-500'}`} />
                          {isQuiz ? 'Evaluación (Quiz)' : 'Encuesta'}
                        </span>
                      </td>

                      {/* Título y Categoría */}
                      <td className="py-4 px-5 align-middle max-w-xs md:max-w-md">
                        <div className="space-y-1">
                          <h4 
                            onClick={() => onEdit(survey)}
                            className="text-xs font-black text-slate-900 group-hover:text-red-600 transition cursor-pointer leading-snug line-clamp-1"
                          >
                            {survey.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                              {survey.category || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Conteo de Preguntas */}
                      <td className="py-4 px-4 align-middle text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                          {survey.questions?.length || 0}
                        </span>
                      </td>

                      {/* Conteo de Respuestas */}
                      <td className="py-4 px-4 align-middle text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-800 bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-xl">
                          <BarChart2 className="w-3.5 h-3.5 text-red-600" />
                          {respCount}
                        </span>
                      </td>

                      {/* Selector de Estado */}
                      <td className="py-4 px-4 align-middle text-center">
                        <select
                          value={survey.status}
                          onChange={e => onToggleStatus(survey, e.target.value as SurveyStatus)}
                          className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border outline-none cursor-pointer shadow-2xs ${
                            survey.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : survey.status === 'draft'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="draft">Borrador</option>
                          <option value="published">Publicada</option>
                          <option value="archived">Archivada</option>
                        </select>
                      </td>

                      {/* Botones de Acción */}
                      <td className="py-4 px-5 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPlay(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition cursor-pointer shadow-2xs"
                            title="Responder / Vista Previa"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            onClick={() => onEdit(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition cursor-pointer shadow-2xs"
                            title="Editar Preguntas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onReports(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-500 hover:text-purple-700 border border-slate-200 hover:border-purple-200 transition cursor-pointer shadow-2xs"
                            title="Ver Analítica y Reportes"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setShareModalSurvey(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-200 hover:border-red-200 transition cursor-pointer shadow-2xs"
                            title="Compartir QR / Enlace"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDuplicate(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 transition cursor-pointer shadow-2xs"
                            title="Duplicar Formulario"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSurveyToDelete(survey)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-2xs"
                            title="Eliminar Formulario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Compartir / QR */}
      {shareModalSurvey && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShareModalSurvey(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Share2 className="w-4 h-4 text-red-600" />
                Compartir Encuesta
              </h3>
              <button onClick={() => setShareModalSurvey(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                ✕
              </button>
            </div>

            <div className="text-center space-y-3">
              <h4 className="text-base font-black text-slate-800">{shareModalSurvey.title}</h4>
              <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200 shadow-xs">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Código QR" className="w-44 h-44 mx-auto rounded-xl" />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs font-bold text-slate-400">
                    Generando QR...
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escanea con la cámara del celular para responder</p>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Enlace directo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(shareModalSurvey.id)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 outline-none"
                />
                <button
                  onClick={() => handleCopyLink(shareModalSurvey.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación Personalizado del Sistema */}
      {surveyToDelete && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
          onClick={() => setSurveyToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">¿Eliminar encuesta de Pulse?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Está a punto de eliminar permanentemente la encuesta{' '}
                <strong className="text-slate-800">"{surveyToDelete.title}"</strong> y todos sus registros de respuestas acumulados. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(surveyToDelete.id);
                  setSurveyToDelete(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-md shadow-rose-600/20"
              >
                Sí, Eliminar Encuesta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
