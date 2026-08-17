import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Survey, ResponseRecord, User, Question } from '@/types';
import { dataService } from '@/services/dataService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Award,
  ShieldCheck,
  Target,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Users2,
  Trash2,
  RotateCcw,
  XCircle,
  Eye,
  X,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DatePickerPopoverProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

function DatePickerPopover({ label, value, onChange }: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const formattedDisplay = useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  }, [value]);

  return (
    <div ref={containerRef} className="relative space-y-1">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
        {label}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer transition select-none"
      >
        <span className={formattedDisplay ? 'text-slate-900 font-black' : 'text-slate-400 font-semibold'}>
          {formattedDisplay || 'dd/mm/aaaa'}
        </span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((d, i) => (
              <span key={i} className="text-[10px] font-black text-slate-400 uppercase">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedMonth = String(viewMonth + 1).padStart(2, '0');
              const formattedDay = String(dayNum).padStart(2, '0');
              const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
              const isSelected = value === dateStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-full rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#E4002B] text-white font-black shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SurveyReportsProps {
  survey: Survey;
  currentUser?: User;
  onBack: () => void;
}

export function SurveyReports({ survey, currentUser, onBack }: SurveyReportsProps) {
  const canManage = true;

  const [selectedSegmentKey, setSelectedSegmentKey] = useState<string>('all');
  const [selectedSegmentValue, setSelectedSegmentValue] = useState<string>('all');
  const [fetchedResponses, setFetchedResponses] = useState<ResponseRecord[]>(() => dataService.getResponses(survey.id));
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Date Range & Choice Question Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('all');
  const [selectedQuestionValue, setSelectedQuestionValue] = useState<string>('all');

  const [tabulationStatusFilter, setTabulationStatusFilter] = useState<'all' | 'passed' | 'failed' | 'partial'>('all');
  const [tabulationSearch, setTabulationSearch] = useState('');
  const [selectedResponseForDetail, setSelectedResponseForDetail] = useState<ResponseRecord | null>(null);
  const [deletingResponseRecord, setDeletingResponseRecord] = useState<ResponseRecord | null>(null);

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const passingScore = survey.passing_score_percent ?? 70;

  useEffect(() => {
    let isMounted = true;
    dataService.fetchSurveysAndResponses().then(() => {
      if (isMounted) {
        setFetchedResponses(dataService.getResponses(survey.id));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [survey.id]);

  const handleResetResponses = async () => {
    const records = dataService.getResponses(survey.id);
    for (const r of records) {
      await dataService.deleteResponse(r.id);
    }
    setFetchedResponses([]);
    setShowConfirmReset(false);
  };

  const handleDeleteSingleResponse = async (responseId: string) => {
    await dataService.deleteResponse(responseId);
    setFetchedResponses(prev => prev.filter(r => r.id !== responseId));
    setDeletingResponseRecord(null);
    if (selectedResponseForDetail?.id === responseId) {
      setSelectedResponseForDetail(null);
    }
  };

  // Re-evaluate scores dynamically for Quizzes
  const allResponses = useMemo(() => {
    return fetchedResponses.map(r => {
      if (survey.type !== 'quiz') return r;
      let totalPts = 0;
      let earnedPts = 0;

      const updatedAnswers = (r.answers || []).map(ans => {
        const q = survey.questions?.find(x => x.id === ans.question_id);
        if (!q) return ans;

        let qPts = q.points ?? (survey.scoring_type === 'weighted' ? 10 : 1);
        totalPts += qPts;

        let isCorrect = false;
        if (q.type === 'single_choice' || q.type === 'yes_no') {
          const correctOpt = q.options?.find(o => o.is_correct);
          if (correctOpt) {
            isCorrect = String(ans.value) === String(correctOpt.value || correctOpt.id || correctOpt.text);
          }
        } else if (q.type === 'multiple_choice') {
          const correctOpts = q.options?.filter(o => o.is_correct).map(o => String(o.value || o.id || o.text)) || [];
          const userVals = Array.isArray(ans.value) ? ans.value.map(v => String(v)) : [String(ans.value)];
          isCorrect = correctOpts.length > 0 &&
            correctOpts.length === userVals.length &&
            correctOpts.every(v => userVals.includes(v));
        }

        if (isCorrect) earnedPts += qPts;
        return { ...ans, is_correct: isCorrect };
      });

      const pct = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;
      const passed = pct >= (survey.passing_score_percent ?? 70);

      return {
        ...r,
        answers: updatedAnswers,
        score_percent: pct,
        earned_points: earnedPts,
        total_points: totalPts,
        passed,
      };
    });
  }, [survey, fetchedResponses]);

  // Quiz Analytics Summary
  const quizAnalytics = useMemo(() => {
    if (survey.type !== 'quiz' || allResponses.length === 0) return null;
    const completed = allResponses.filter(r => r.status === 'completed');
    const total = completed.length;
    if (total === 0) return null;

    const avgScore = Math.round(completed.reduce((acc, r) => acc + (r.score_percent || 0), 0) / total);
    const passed = completed.filter(r => r.passed).length;
    const passRate = Math.round((passed / total) * 100);

    return {
      total_attempts: allResponses.length,
      completed_attempts: total,
      avg_score_percent: avgScore,
      pass_rate_percent: passRate,
    };
  }, [survey, allResponses]);

  const choiceQuestions = useMemo(() => {
    return (survey.questions || []).filter(q =>
      ['multiple_choice', 'single_choice', 'store_hierarchy', 'yes_no', 'rating'].includes(q.type) ||
      (q.options && q.options.length > 0)
    );
  }, [survey]);

  const questionValuesForSelected = useMemo(() => {
    if (!selectedQuestionId || selectedQuestionId === 'all') return [];
    const targetQ = survey.questions?.find(q => q.id === selectedQuestionId);
    const valuesSet = new Set<string>();

    if (targetQ?.options) {
      targetQ.options.forEach((opt: any) => {
        const valStr = typeof opt === 'string' ? opt : opt.text || opt.value || opt.label;
        if (valStr) valuesSet.add(String(valStr));
      });
    }

    allResponses.forEach(r => {
      const ans = r.answers?.find(a => a.question_id === selectedQuestionId);
      if (ans && ans.value !== undefined && ans.value !== null) {
        if (Array.isArray(ans.value)) {
          ans.value.forEach(v => {
            if (v !== null && v !== undefined) valuesSet.add(String(v));
          });
        } else {
          const valDisplay = String(ans.value_display || ans.value);
          if (valDisplay) valuesSet.add(valDisplay);
        }
      }
    });

    return Array.from(valuesSet);
  }, [survey, allResponses, selectedQuestionId]);

  const segmentKeys = useMemo(() => {
    const keys = new Set<string>();
    survey.hidden_fields?.forEach(f => keys.add(f.key));
    allResponses.forEach(r => {
      if (r.segments) {
        Object.keys(r.segments).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [survey, allResponses]);

  const segmentValuesForSelectedKey = useMemo(() => {
    if (selectedSegmentKey === 'all') return [];
    const values = new Set<string>();
    allResponses.forEach(r => {
      if (r.segments?.[selectedSegmentKey]) {
        values.add(r.segments[selectedSegmentKey]);
      }
    });
    return Array.from(values);
  }, [allResponses, selectedSegmentKey]);

  const hasActiveFilters =
    selectedSegmentKey !== 'all' ||
    selectedSegmentValue !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    selectedQuestionId !== 'all' ||
    selectedQuestionValue !== 'all';

  const handleClearFilters = () => {
    setSelectedSegmentKey('all');
    setSelectedSegmentValue('all');
    setStartDate('');
    setEndDate('');
    setSelectedQuestionId('all');
    setSelectedQuestionValue('all');
  };

function parseResponseTimestamp(dateVal?: string | number | null): number | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'number') return dateVal;

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d.getTime();

  if (typeof dateVal === 'string') {
    const parts = dateVal.split(/[\s,]+/);
    if (parts.length >= 1) {
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        let year = parseInt(dateParts[2], 10);
        if (year < 100) year += 2000;

        let hours = 0;
        let minutes = 0;
        if (parts[1] && parts[1].includes(':')) {
          const timeParts = parts[1].split(':');
          hours = parseInt(timeParts[0], 10) || 0;
          minutes = parseInt(timeParts[1], 10) || 0;
        }

        const parsed = new Date(year, month, day, hours, minutes);
        if (!isNaN(parsed.getTime())) return parsed.getTime();
      }
    }
  }

  return null;
}

  const filteredResponses = useMemo(() => {
    return allResponses.filter(r => {
      if (selectedSegmentKey !== 'all' && selectedSegmentValue !== 'all') {
        if (r.segments?.[selectedSegmentKey] !== selectedSegmentValue) return false;
      }

      if (startDate || endDate) {
        const rawDate = r.completed_at || r.started_at || (r as any).created_at;
        const respTime = parseResponseTimestamp(rawDate);

        if (respTime !== null) {
          if (startDate) {
            const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
            const startTime = new Date(sYear, sMonth - 1, sDay, 0, 0, 0).getTime();
            if (respTime < startTime) return false;
          }
          if (endDate) {
            const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
            const endTime = new Date(eYear, eMonth - 1, eDay, 23, 59, 59).getTime();
            if (respTime > endTime) return false;
          }
        }
      }

      if (selectedQuestionId !== 'all' && selectedQuestionValue !== 'all') {
        const ans = r.answers?.find(a => a.question_id === selectedQuestionId);
        if (!ans) return false;

        if (Array.isArray(ans.value)) {
          const matches = ans.value.some((v: any) => String(v) === selectedQuestionValue);
          if (!matches) return false;
        } else {
          const strVal = String(ans.value_display || ans.value);
          if (strVal !== selectedQuestionValue && String(ans.value) !== selectedQuestionValue) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    allResponses,
    selectedSegmentKey,
    selectedSegmentValue,
    startDate,
    endDate,
    selectedQuestionId,
    selectedQuestionValue,
  ]);

  const countPassed = useMemo(() => {
    return filteredResponses.filter(r => r.status === 'completed' && (r.score_percent ?? 0) >= passingScore).length;
  }, [filteredResponses, passingScore]);

  const countFailed = useMemo(() => {
    return filteredResponses.filter(r => r.status === 'completed' && (r.score_percent ?? 0) < passingScore).length;
  }, [filteredResponses, passingScore]);

  const countPartial = useMemo(() => {
    return filteredResponses.filter(r => r.status === 'partial').length;
  }, [filteredResponses]);

  const getFormattedAnswerValue = (ans: any) => {
    if (ans.value_display) return String(ans.value_display);

    const rawVal = ans.value;
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      return 'Sin respuesta';
    }

    const q = (survey.questions || []).find(question => question.id === ans.question_id);

    if (q && q.options && q.options.length > 0) {
      if (Array.isArray(rawVal)) {
        const labels = rawVal.map(v => {
          const opt = q.options?.find(o => String(o.id || o.value || o.text) === String(v));
          return opt ? opt.text : String(v);
        });
        return labels.join(', ');
      } else {
        const opt = q.options?.find(o => String(o.id || o.value || o.text) === String(rawVal));
        if (opt) return opt.text;
      }
    }

    if (Array.isArray(rawVal)) {
      return rawVal.join(', ');
    }

    const strVal = String(rawVal);
    if (strVal.includes('sto-') || strVal.includes('zon-') || strVal.includes('reg-')) {
      const allStores = dataService.getRestaurants();
      const foundStore = allStores.find(s => s.id === strVal || strVal.includes(s.id));
      if (foundStore) {
        return `${foundStore.region || ''} > ${foundStore.zone || ''} > ${foundStore.id} - ${foundStore.name}`.replace(/^(\s*>\s*)+/, '');
      }
    }

    if (strVal.includes('_')) {
      return strVal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    return strVal;
  };

  const getResponseParticipantInfo = (response: ResponseRecord) => {
    let name = response.respondent_email || response.segments?.nombre || response.segments?.name || '';
    let documentId = response.segments?.cedula || response.segments?.document_id || '';
    let storeName = response.segments?.tienda || response.segments?.store || response.segments?.region || '';

    if (response.answers && response.answers.length > 0) {
      response.answers.forEach(ans => {
        const qTitle = (ans.question_title || '').toLowerCase();
        const valStr = getFormattedAnswerValue(ans);
        if (!name && (qTitle.includes('nombre') || qTitle.includes('participante') || qTitle.includes('evaluado'))) {
          name = valStr;
        }
        if (!documentId && (qTitle.includes('cedula') || qTitle.includes('cédula') || qTitle.includes('documento') || qTitle.includes('id'))) {
          documentId = valStr;
        }
        if (!storeName && (qTitle.includes('restaurante') || qTitle.includes('tienda') || qTitle.includes('jerarquía') || qTitle.includes('ubicación'))) {
          storeName = valStr;
        }
      });
    }

    if (!name) {
      name = `Evaluado #${response.id.substring(0, 8)}`;
    }

    return { name, documentId, storeName };
  };

  const tabulatedResponses = useMemo(() => {
    return filteredResponses.filter(r => {
      const isPassed = (r.score_percent ?? 0) >= passingScore;

      if (tabulationStatusFilter === 'passed' && (r.status !== 'completed' || !isPassed)) return false;
      if (tabulationStatusFilter === 'failed' && (r.status !== 'completed' || isPassed)) return false;
      if (tabulationStatusFilter === 'partial' && r.status !== 'partial') return false;

      if (tabulationSearch.trim()) {
        const query = tabulationSearch.toLowerCase();
        const info = getResponseParticipantInfo(r);
        const matchName = info.name.toLowerCase().includes(query);
        const matchDoc = info.documentId.toLowerCase().includes(query);
        const matchStore = info.storeName.toLowerCase().includes(query);
        const matchId = r.id.toLowerCase().includes(query);

        const matchAnswers = r.answers?.some(ans =>
          String(ans.value_display || ans.value || '').toLowerCase().includes(query)
        );

        if (!matchName && !matchDoc && !matchStore && !matchId && !matchAnswers) {
          return false;
        }
      }

      return true;
    });
  }, [filteredResponses, passingScore, tabulationStatusFilter, tabulationSearch]);

  const totalPages = Math.ceil(tabulatedResponses.length / pageSize) || 1;

  const paginatedResponses = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return tabulatedResponses.slice(startIdx, startIdx + pageSize);
  }, [tabulatedResponses, currentPage, pageSize]);

  const totalResponses = filteredResponses.length;
  const completedCount = filteredResponses.filter(r => r.status === 'completed').length;
  const partialCount = totalResponses - completedCount;
  const completionRate = totalResponses > 0 ? Math.round((completedCount / totalResponses) * 100) : 0;

  const avgDurationSeconds =
    completedCount > 0
      ? Math.round(
          filteredResponses
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + (r.duration_seconds || 0), 0) / completedCount
        )
      : 0;

  const handleExportExcel = () => {
    if (filteredResponses.length === 0) return;

    const dataRows = filteredResponses.map((r, i) => {
      const info = getResponseParticipantInfo(r);
      const row: Record<string, any> = {
        '#': i + 1,
        'ID Respuesta': r.id,
        'Participante': info.name,
        'Cédula/Doc': info.documentId || '-',
        'Tienda/CECO': info.storeName || '-',
        'Estado': r.status === 'completed' ? 'Completado' : 'Parcial',
        'Fecha Inicio': r.started_at ? new Date(r.started_at).toLocaleString() : '',
        'Fecha Fin': r.completed_at ? new Date(r.completed_at).toLocaleString() : '',
        'Duración (seg)': r.duration_seconds || 0,
      };

      if (survey.type === 'quiz') {
        row['Puntaje (%)'] = r.score_percent || 0;
        row['Resultado'] = r.passed ? 'APROBADO' : 'REPROBADO';
        row['Puntos Obtenidos'] = r.earned_points || 0;
        row['Puntos Máximos'] = r.total_points || 0;
      }

      (r.answers || []).forEach(ans => {
        row[`Pregunta: ${ans.question_title}`] = getFormattedAnswerValue(ans);
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
    XLSX.writeFile(workbook, `Reporte_${survey.title.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E4002B] via-[#ff3b57] to-[#E4002B]" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer flex items-center justify-center"
              title="Volver a encuestas"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                {survey.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 border bg-white border-slate-200 text-slate-500 shadow-3xs">
                  {survey.type === 'quiz' ? 'EVALUACIÓN / QUIZ' : 'ENCUESTA ESTÁNDAR'}
                </span>

                <span className="text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 border bg-indigo-50 text-indigo-700 border-indigo-200">
                  🏷️ {survey.category || 'General'}
                </span>

                <span className={`text-[10px] font-black uppercase rounded-full px-2.5 py-0.5 border ${
                  survey.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}>
                  {survey.status === 'published' ? 'PUBLICADA' : survey.status === 'draft' ? 'BORRADOR' : 'ARCHIVADA'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {allResponses.length > 0 && (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs shadow-xs transition flex items-center gap-2 uppercase cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Reiniciar Respuestas</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={filteredResponses.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 uppercase cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* 2. FILTROS DE ANÁLISIS CARD */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-[#E4002B]" />
              <span>Filtros de Análisis</span>
            </div>

            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar Filtros</span>
                </button>
              )}

              <span className="text-xs font-bold text-slate-500">
                Mostrando <strong className="text-[#E4002B] font-black">{totalResponses}</strong> de {allResponses.length} respuestas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <DatePickerPopover
              label="Fecha Inicio"
              value={startDate}
              onChange={setStartDate}
            />

            <DatePickerPopover
              label="Fecha Fin"
              value={endDate}
              onChange={setEndDate}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Filtrar por Pregunta
              </label>
              <select
                value={selectedQuestionId}
                onChange={(e) => {
                  setSelectedQuestionId(e.target.value);
                  setSelectedQuestionValue('all');
                }}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#E4002B] cursor-pointer truncate"
              >
                <option value="all">Todas las preguntas</option>
                {choiceQuestions.map((q, idx) => (
                  <option key={q.id} value={q.id}>
                    P{idx + 1}: {q.title.length > 35 ? q.title.substring(0, 35) + '...' : q.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. ROW 1: KEY METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">TOTAL RESPUESTAS</span>
              <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#E4002B]">
                <Users className="w-4 h-4 text-[#E4002B]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-3xl font-black text-[#E4002B] tracking-tight">{totalResponses}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{completedCount} completadas exitosamente</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">TASA DE FINALIZACIÓN</span>
              <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#E4002B]">
                <CheckCircle2 className="w-4 h-4 text-[#E4002B]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-3xl font-black text-[#E4002B] tracking-tight">{completionRate}%</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{partialCount} abandonos parciales</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">TIEMPO PROMEDIO</span>
              <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#E4002B]">
                <Clock className="w-4 h-4 text-[#E4002B]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-3xl font-black text-[#E4002B] tracking-tight">
                {Math.floor(avgDurationSeconds / 60)}m {avgDurationSeconds % 60}s
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Por encuestado en diligenciamiento</p>
          </div>
        </div>

        {/* 4. ROW 2: MÉTRICAS DE EVALUACIÓN & DESEMPEÑO (Only for Quizzes) */}
        {survey.type === 'quiz' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#E4002B]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  MÉTRICAS DE EVALUACIÓN & DESEMPEÑO
                </h3>
              </div>
              <span className="border border-red-200 text-[#E4002B] bg-red-50/60 px-3 py-1 rounded-full text-xs font-extrabold">
                Umbral Aprobación: {survey.passing_score_percent ?? 70}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative overflow-hidden">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">PROMEDIO GENERAL</span>
                <div className="my-1">
                  <span className="text-3xl font-black text-[#E4002B]">
                    {quizAnalytics ? `${quizAnalytics.avg_score_percent}%` : '0%'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Puntuación media global</p>
                <div className="absolute right-3 bottom-2 opacity-10 text-[#E4002B] pointer-events-none">
                  <BarChart3 className="w-16 h-16" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative overflow-hidden">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">TASA DE APROBACIÓN</span>
                <div className="my-1">
                  <span className="text-3xl font-black text-[#E4002B]">
                    {quizAnalytics ? `${quizAnalytics.pass_rate_percent}%` : '0%'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Personal apto calificado</p>
                <div className="absolute right-3 bottom-2 opacity-10 text-[#E4002B] pointer-events-none">
                  <ShieldCheck className="w-16 h-16" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs border-b-4 border-b-[#E4002B] relative overflow-hidden">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">INTENTOS TOTALES</span>
                <div className="my-1">
                  <span className="text-3xl font-black text-[#E4002B]">
                    {quizAnalytics ? quizAnalytics.total_attempts : 0}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Límite por persona: {survey.max_attempts ? survey.max_attempts : 'ilimitado'}
                </p>
                <div className="absolute right-3 bottom-2 opacity-10 text-[#E4002B] pointer-events-none">
                  <Users2 className="w-16 h-16" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TABULACIÓN DE PARTICIPANTES & RESULTADOS (Exact Screenshot 2) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users2 className="w-4 h-4 text-[#E4002B]" />
                Tabulación de Participantes & Resultados ({tabulatedResponses.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Listado individual de respuestas registradas con estado de aprobación, puntaje y respuestas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => {
                  setTabulationStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  tabulationStatusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({filteredResponses.length})
              </button>

              {survey.type === 'quiz' && (
                <>
                  <button
                    onClick={() => {
                      setTabulationStatusFilter('passed');
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      tabulationStatusFilter === 'passed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprobados ({countPassed})</span>
                  </button>

                  <button
                    onClick={() => {
                      setTabulationStatusFilter('failed');
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                      tabulationStatusFilter === 'failed'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reprobados ({countFailed})</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setTabulationStatusFilter('partial');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  tabulationStatusFilter === 'partial'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Incompletos ({countPartial})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={tabulationSearch}
                onChange={(e) => {
                  setTabulationSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar participante, cédula..."
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E4002B] transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">#</th>
                  <th className="px-3.5 py-3">Fecha y Hora</th>
                  <th className="px-3.5 py-3">Participante / Evaluado</th>
                  <th className="px-3.5 py-3">Tienda / Ubicación</th>
                  {survey.type === 'quiz' && <th className="px-3.5 py-3 text-center">Nota / Puntaje</th>}
                  <th className="px-3.5 py-3 text-center">Estado</th>
                  <th className="px-3.5 py-3 text-center">Duración</th>
                  <th className="px-3.5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedResponses.length === 0 ? (
                  <tr>
                    <td colSpan={survey.type === 'quiz' ? 8 : 7} className="text-center py-8 text-slate-400 font-medium italic">
                      No se encontraron respuestas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedResponses.map((r, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                    const info = getResponseParticipantInfo(r);
                    const isCompleted = r.status === 'completed';
                    const isPassed = isCompleted && (r.score_percent ?? 0) >= passingScore;
                    const dateStr = r.completed_at
                      ? new Date(r.completed_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                      : r.started_at
                      ? new Date(r.started_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                      : '-';
                    const durationStr = r.duration_seconds
                      ? `${Math.floor(r.duration_seconds / 60)}m ${r.duration_seconds % 60}s`
                      : '-';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-3 font-bold text-slate-400">{globalIdx}</td>
                        <td className="px-3.5 py-3 font-semibold text-slate-600 whitespace-nowrap">{dateStr}</td>
                        <td className="px-3.5 py-3">
                          <div className="font-extrabold text-slate-900">{info.name}</div>
                          {info.documentId && (
                            <span className="text-[11px] text-slate-400 font-medium">Doc: {info.documentId}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-700">
                          {info.storeName || '-'}
                        </td>
                        {survey.type === 'quiz' && (
                          <td className="px-3.5 py-3 text-center">
                            <span className="font-black text-slate-900 text-sm">
                              {r.score_percent ?? 0}%
                            </span>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {r.earned_points ?? 0} / {r.total_points ?? 0} pts
                            </div>
                          </td>
                        )}
                        <td className="px-3.5 py-3 text-center">
                          {!isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> PARCIAL
                            </span>
                          ) : survey.type === 'quiz' ? (
                            isPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APROBADO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" /> REPROBADO
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETADO
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center font-semibold text-slate-600">{durationStr}</td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedResponseForDetail(r)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                              title="Ver detalle de respuestas"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Ver Detalle</span>
                            </button>

                            {canManage && (
                              <button
                                onClick={() => setDeletingResponseRecord(r)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[11px] transition cursor-pointer inline-flex items-center border border-rose-200/60"
                                title="Eliminar esta respuesta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {tabulatedResponses.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium">
                <span>Mostrar:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={30}>30 por página</option>
                  <option value={50}>50 por página</option>
                </select>
                <span className="ml-1">
                  Mostrando <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                  <strong>{Math.min(currentPage * pageSize, tabulatedResponses.length)}</strong> de{' '}
                  <strong>{tabulatedResponses.length}</strong> registros
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1 text-xs font-bold shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <span className="px-3 py-1 font-black text-slate-800 bg-slate-100 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1 text-xs font-bold shadow-2xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. QUESTION BY QUESTION HORIZONTAL BAR BREAKDOWN (Exact Screenshot 3) */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <BarChart3 className="w-5 h-5 text-[#E4002B]" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Desglose de Respuestas Pregunta por Pregunta
            </h3>
          </div>

          {(survey.questions || []).map((q, qIdx) => {
            const questionAnswers = filteredResponses.flatMap(r => (r.answers || []).filter(a => a.question_id === q.id));
            const totalAns = questionAnswers.length;
            const isTextType = ['short_text', 'long_text', 'date', 'file_upload'].includes(q.type);

            if (isTextType) {
              const textAnswers = questionAnswers
                .map(a => String(a.value_display || a.value || '').trim())
                .filter(Boolean);

              return (
                <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-[#E4002B]">Pregunta Abierta #{qIdx + 1}</span>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">{q.title}</h4>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      {totalAns} respuestas
                    </span>
                  </div>

                  {/* Internal Scrollable Panel with Search */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar en respuestas abiertas..."
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          const el = document.getElementById(`text_list_${q.id}`);
                          if (el) {
                            const items = el.querySelectorAll('[data-textitem]');
                            items.forEach((item: any) => {
                              const text = (item.dataset.textitem || '').toLowerCase();
                              item.style.display = text.includes(val) ? 'block' : 'none';
                            });
                          }
                        }}
                        className="w-full text-xs font-semibold pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#E4002B]"
                      />
                    </div>

                    <div id={`text_list_${q.id}`} className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {textAnswers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-3">No hay respuestas registradas aún.</p>
                      ) : (
                        textAnswers.map((text, idx) => (
                          <div
                            key={idx}
                            data-textitem={text}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-medium"
                          >
                            &quot;{text}&quot;
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const countsMap = new Map<string, number>();
            questionAnswers.forEach(ans => {
              const valDisplay = String(ans.value_display || ans.value || '');
              if (valDisplay) {
                countsMap.set(valDisplay, (countsMap.get(valDisplay) || 0) + 1);
              }
            });

            const optionsData = Array.from(countsMap.entries()).map(([label, count]) => ({
              label,
              count,
              percent: totalAns > 0 ? Math.round((count / totalAns) * 100) : 0,
            }));

            return (
              <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#E4002B]">Pregunta #{qIdx + 1}</span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">{q.title}</h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {totalAns} respuestas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Left Side: Horizontal Bar Chart */}
                  <div className="h-44 w-full">
                    {optionsData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs italic font-medium">
                        Sin datos registrados para esta pregunta.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={optionsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} hide />
                          <YAxis dataKey="label" type="category" stroke="#64748b" fontSize={10} width={90} tickLine={false} />
                          <Tooltip formatter={(val: any) => [`${val} respuestas`, 'Cantidad']} />
                          <Bar dataKey="count" fill="#E4002B" radius={[0, 8, 8, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Right Side: Scrollable Option Count & Percent Badges */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {optionsData.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-800">
                        <span className="truncate flex-1 pr-2">{opt.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-extrabold">{opt.count} v.</span>
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-[11px] font-black">
                            {opt.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL: VER DETALLE COMPLETO DE RESPUESTA */}
      {selectedResponseForDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedResponseForDetail(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#E4002B]" />
                  Detalle de Respuesta Individual
                </h3>
                <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">ID: {selectedResponseForDetail.id}</p>
              </div>
              <button onClick={() => setSelectedResponseForDetail(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {survey.type === 'quiz' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Resultado Final</span>
                    <span className={`text-lg font-black ${selectedResponseForDetail.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedResponseForDetail.passed ? 'APROBADO' : 'REPROBADO'} ({selectedResponseForDetail.score_percent || 0}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-600 block">
                      Puntos: {selectedResponseForDetail.earned_points || 0} / {selectedResponseForDetail.total_points || 0} pts
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(selectedResponseForDetail.answers || []).map((ans, idx) => (
                  <div key={ans.id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-xs font-black text-slate-800 block">
                      {idx + 1}. {ans.question_title}
                    </span>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                      <span className="bg-white px-3 py-1 rounded-xl border border-slate-200">
                        {getFormattedAnswerValue(ans)}
                      </span>
                      {survey.type === 'quiz' && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          ans.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ans.is_correct ? 'Correcta' : 'Incorrecta'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REINICIAR RESPUESTAS CONFIRMATION */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setShowConfirmReset(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">¿Reiniciar todas las respuestas?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Esta acción eliminará permanentemente los {allResponses.length} registros de respuestas acumulados. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowConfirmReset(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleResetResponses} className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md">
                Sí, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
