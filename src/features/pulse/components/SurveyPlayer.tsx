import React, { useState, useEffect } from 'react';
import { Survey, ResponseRecord, Answer, Question, QuestionOption } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Trophy, Sparkles,
  Star, Check, Clock, Store, ArrowUp, ArrowDown, Upload, Calendar,
  FileSpreadsheet, ShieldCheck, Award, XCircle, HeartHandshake, CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SurveyPlayerProps {
  survey: Survey;
  onSubmit: (response: ResponseRecord) => void;
  onClose: () => void;
  isPublic?: boolean;
}

const StoreHierarchySelector: React.FC<{
  restaurants: any[];
  value: string;
  onChange: (value: string) => void;
}> = ({ restaurants, value, onChange }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');

  useEffect(() => {
    if (value) {
      const found = restaurants.find(r => r.id === value || value.includes(r.id));
      if (found) {
        setSelectedRegion(found.region);
        setSelectedZone(found.zone);
      }
    }
  }, [value, restaurants]);

  const uniqueRegions = React.useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach(r => { if (r.region) set.add(r.region); });
    return Array.from(set).sort();
  }, [restaurants]);

  const filteredZones = React.useMemo(() => {
    if (!selectedRegion) return [];
    const set = new Set<string>();
    restaurants
      .filter(r => r.region === selectedRegion)
      .forEach(r => { if (r.zone) set.add(r.zone); });
    return Array.from(set).sort();
  }, [restaurants, selectedRegion]);

  const filteredStores = React.useMemo(() => {
    return restaurants.filter(r => {
      if (selectedRegion && r.region !== selectedRegion) return false;
      if (selectedZone && r.zone !== selectedZone) return false;
      return true;
    });
  }, [restaurants, selectedRegion, selectedZone]);

  const handleRegionChange = (reg: string) => {
    setSelectedRegion(reg);
    setSelectedZone('');
    onChange('');
  };

  const handleZoneChange = (zon: string) => {
    setSelectedZone(zon);
    onChange('');
  };

  return (
    <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[#E4002B]" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
            Jerarquía de Ubicación Operativa KFC
          </span>
        </div>
        {restaurants.length > 0 && (
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
            {restaurants.length} Tiendas disponibles
          </span>
        )}
      </div>

      {restaurants.length === 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-xs font-bold animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span>Cargando catálogo de tiendas y regionales KFC...</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
            1. Regional KFC
          </label>
          <select
            value={selectedRegion}
            onChange={e => handleRegionChange(e.target.value)}
            disabled={restaurants.length === 0}
            className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#E4002B] focus:ring-2 focus:ring-red-100 transition cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <option value="">-- Seleccionar Regional --</option>
            {uniqueRegions.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
            2. Zona / Jefe de Área
          </label>
          <select
            value={selectedZone}
            onChange={e => handleZoneChange(e.target.value)}
            disabled={(!selectedRegion && uniqueRegions.length > 0) || restaurants.length === 0}
            className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#E4002B] focus:ring-2 focus:ring-red-100 transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <option value="">-- Seleccionar Zona --</option>
            {filteredZones.map(zon => (
              <option key={zon} value={zon}>{zon}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
          3. Tienda / CECO KFC
        </label>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={restaurants.length === 0}
          className="w-full bg-white border-2 border-slate-200 focus:border-[#E4002B] focus:ring-2 focus:ring-red-100 rounded-2xl px-4 py-3 text-xs font-black text-slate-900 outline-none transition cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <option value="">-- Selecciona tu Tienda KFC --</option>
          {filteredStores.map(r => (
            <option key={r.id} value={r.id}>
              {r.id} - {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const isPlaceholderDesc = (desc?: string) => {
  if (!desc) return true;
  const trimmed = desc.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.includes('ingresa una breve') ||
    trimmed.includes('escribe una breve') ||
    trimmed.includes('sin descripción')
  );
};

const RATING_LABELS: Record<number, string> = {
  1: 'Muy Deficiente',
  2: 'Regular / Bajo',
  3: 'Aceptable / Promedio',
  4: 'Bueno / Destacado',
  5: '¡Excelente Rendimiento!',
};

// Validador de respuesta obligatoria antes de permitir avanzar
const isQuestionAnswered = (q: Question | undefined, currentAnswers: Record<string, any>): boolean => {
  if (!q) return true;
  const val = currentAnswers[q.id];
  if (val === undefined || val === null) return false;

  switch (q.type) {
    case 'single_choice':
    case 'yes_no':
      return typeof val === 'string' ? val.trim().length > 0 : Boolean(val);
    case 'multiple_choice':
      return Array.isArray(val) && val.length > 0;
    case 'rating':
      return Number(val) > 0;
    case 'ordering':
      return Array.isArray(val) && val.length > 0;
    case 'store_hierarchy':
    case 'date':
    case 'short_text':
    case 'long_text':
    case 'file_upload':
      return typeof val === 'string' && val.trim().length > 0;
    default:
      return Boolean(val);
  }
};

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const SurveyPlayer: React.FC<SurveyPlayerProps> = ({
  survey,
  onSubmit,
  onClose,
  isPublic = false,
}) => {
  const { restaurants: storeRestaurants } = useAppStore();
  const [localRestaurants, setLocalRestaurants] = React.useState<any[]>(dataService.getRestaurants());

  const restaurants = React.useMemo(() => {
    return (storeRestaurants && storeRestaurants.length > 0) ? storeRestaurants : localRestaurants;
  }, [storeRestaurants, localRestaurants]);

  useEffect(() => {
    let isMounted = true;
    const loadStores = async () => {
      if (storeRestaurants && storeRestaurants.length > 0) {
        if (isMounted) setLocalRestaurants(storeRestaurants);
        return;
      }
      const loaded = await dataService.fetchRestaurants();
      if (isMounted && loaded && loaded.length > 0) {
        setLocalRestaurants(loaded);
      }
    };
    void loadStores();
    return () => { isMounted = false; };
  }, [storeRestaurants]);

  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<{ scorePercent: number; passed: boolean } | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [validationAlert, setValidationAlert] = useState(false);

  const attemptStorageKey = `pulse_attempts_${survey.id}`;
  const [attemptsCount, setAttemptsCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(attemptStorageKey) || '0');
    } catch {
      return 0;
    }
  });

  const maxAttemptsReached = Boolean(
    survey.max_attempts && survey.max_attempts > 0 && attemptsCount >= survey.max_attempts
  );

  const timeLimit = Number(survey.time_limit_seconds) || 0;
  const hasTimer = timeLimit > 0;
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);

  useEffect(() => {
    if (timeLimit > 0) {
      setTimeLeft(timeLimit);
    }
  }, [timeLimit, isStarted]);

  // Initialize questions with shuffle support if enabled
  const [questions] = useState<Question[]>(() => {
    let list = (survey.questions || []).map(q => {
      if (survey.shuffle_options && ['single_choice', 'multiple_choice'].includes(q.type) && q.options?.length) {
        return { ...q, options: shuffleArray(q.options) };
      }
      return q;
    });

    if (survey.shuffle_questions && list.length > 1) {
      list = shuffleArray(list);
    }
    return list;
  });

  const currentQuestion = questions[currentIndex];
  const isQuiz = survey.type === 'quiz';
  const passingScorePercent = typeof survey.passing_score_percent === 'number'
    ? survey.passing_score_percent
    : Number(survey.passing_score_percent ?? 70);
  const isAnswered = isQuestionAnswered(currentQuestion, answers);

  useEffect(() => {
    if (!hasTimer || completed || !isStarted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasTimer, completed, isStarted]);

  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'ordering' && !answers[currentQuestion.id]) {
      const originalOpts = (currentQuestion.options || []).map(o => o.text);
      let scrambled = shuffleArray(originalOpts);
      if (scrambled.length > 1 && scrambled.every((v, i) => v === originalOpts[i])) {
        scrambled = [...scrambled].reverse();
      }
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: scrambled }));
    }
  }, [currentQuestion]);

  const handleSelectOption = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    setValidationAlert(false);
  };

  const handleToggleMultipleChoice = (qId: string, optVal: string) => {
    const currentVals: string[] = Array.isArray(answers[qId]) ? answers[qId] : [];
    if (currentVals.includes(optVal)) {
      setAnswers(prev => ({ ...prev, [qId]: currentVals.filter(v => v !== optVal) }));
    } else {
      setAnswers(prev => ({ ...prev, [qId]: [...currentVals, optVal] }));
    }
    setValidationAlert(false);
  };

  const handleMoveOrderItem = (qId: string, itemIdx: number, direction: 'up' | 'down') => {
    const currentList: string[] = answers[qId] || (currentQuestion?.options || []).map(o => o.text);
    const newList = [...currentList];
    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    const temp = newList[itemIdx];
    newList[itemIdx] = newList[targetIdx];
    newList[targetIdx] = temp;
    setAnswers(prev => ({ ...prev, [qId]: newList }));
    setValidationAlert(false);
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Validación estricta: No permite pasar si no ha contestado la presente pregunta
    if (!isAnswered) {
      setValidationAlert(true);
      return;
    }

    setValidationAlert(false);

    // Skip Logic
    if (['single_choice', 'yes_no'].includes(currentQuestion.type)) {
      const selectedVal = answers[currentQuestion.id];
      const selectedOpt = (currentQuestion.options || []).find(o => o.value === selectedVal || o.text === selectedVal);
      if (selectedOpt && selectedOpt.next_question_id) {
        const targetIdx = questions.findIndex(q => q.id === selectedOpt.next_question_id);
        if (targetIdx !== -1) {
          setCurrentIndex(targetIdx);
          return;
        }
      }
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setValidationAlert(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    let earnedPoints = 0;
    let totalPoints = 0;

    const answerItems: Answer[] = questions.map(q => {
      const userVal = answers[q.id];
      const gradable = isQuiz && ['single_choice', 'multiple_choice', 'ordering', 'yes_no'].includes(q.type);
      let isCorrect: boolean | undefined = undefined;
      let qPoints = q.points || 10;

      if (gradable) {
        totalPoints += qPoints;

        if (['single_choice', 'yes_no'].includes(q.type)) {
          const correctOpt = (q.options || []).find(o => o.is_correct);
          if (correctOpt) {
            isCorrect = String(userVal) === String(correctOpt.value || correctOpt.id || correctOpt.text);
          } else {
            isCorrect = false;
          }
        } else if (q.type === 'multiple_choice') {
          const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => String(o.value || o.id || o.text));
          const userVals = Array.isArray(userVal) ? userVal.map(v => String(v)) : [String(userVal)];
          isCorrect = correctOpts.length > 0 &&
            correctOpts.length === userVals.length &&
            correctOpts.every(v => userVals.includes(v));
        } else if (q.type === 'ordering') {
          const expectedOrder = (q.options || []).map(o => o.text);
          if (Array.isArray(userVal)) {
            isCorrect = userVal.length === expectedOrder.length && userVal.every((val, i) => val === expectedOrder[i]);
          } else {
            isCorrect = false;
          }
        }

        if (isCorrect) {
          earnedPoints += qPoints;
        }
      }

      let valueDisplay: string | undefined = undefined;
      if (q.type === 'store_hierarchy' && userVal) {
        const foundStore = restaurants.find(r => r.id === String(userVal) || String(userVal).includes(r.id));
        if (foundStore) {
          valueDisplay = `${foundStore.region} > ${foundStore.zone} > ${foundStore.id} - ${foundStore.name}`;
        }
      } else if (q.options && q.options.length > 0 && userVal !== undefined && userVal !== null) {
        if (Array.isArray(userVal)) {
          const labels = userVal.map(v => {
            const foundOpt = q.options?.find(o => String(o.value || o.id || o.text) === String(v));
            return foundOpt ? foundOpt.text : String(v);
          });
          valueDisplay = labels.join(', ');
        } else {
          const foundOpt = q.options.find(o => String(o.value || o.id || o.text) === String(userVal));
          if (foundOpt) {
            valueDisplay = foundOpt.text;
          }
        }
      }

      return {
        id: `ans_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        response_id: '',
        question_id: q.id,
        question_title: q.title,
        question_type: q.type,
        value: userVal,
        value_display: valueDisplay,
        is_correct: gradable ? isCorrect : undefined,
        points_earned: gradable ? (isCorrect ? qPoints : 0) : undefined,
        max_points: gradable ? qPoints : undefined,
      };
    });

    const segments: Record<string, string> = {};
    answerItems.forEach(ans => {
      if (ans.question_type === 'store_hierarchy' && ans.value) {
        const foundStore = restaurants.find(r => r.id === String(ans.value) || String(ans.value).includes(r.id));
        if (foundStore) {
          segments['region'] = foundStore.region || 'Sin Región';
          segments['regional'] = foundStore.region || 'Sin Región';
          segments['zona'] = foundStore.zone || 'Sin Zona';
          segments['jefe_de_area'] = foundStore.zone || 'Sin Zona';
          segments['tienda'] = `${foundStore.id} - ${foundStore.name}`;
          segments['ceco'] = foundStore.id;
        }
      }
    });

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
    const passed = isQuiz ? scorePercent >= passingScorePercent : true;

    if (survey.max_attempts && survey.max_attempts > 0) {
      try {
        const nextAttempt = attemptsCount + 1;
        localStorage.setItem(attemptStorageKey, String(nextAttempt));
        setAttemptsCount(nextAttempt);
      } catch (err) {
        console.warn('Could not update attempt count:', err);
      }
    }

    const record: ResponseRecord = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      survey_id: survey.id,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: hasTimer ? (survey.time_limit_seconds || 0) - timeLeft : 45,
      score_percent: isQuiz ? scorePercent : undefined,
      passed: isQuiz ? passed : undefined,
      earned_points: isQuiz ? earnedPoints : undefined,
      total_points: isQuiz ? totalPoints : undefined,
      segments: Object.keys(segments).length > 0 ? segments : undefined,
      answers: answerItems,
    };

    setFinalScore({ scorePercent, passed });
    setCompleted(true);
    onSubmit(record);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const themeStyle = survey.theme?.theme_style || 'base';
  const isCrimson = themeStyle === 'crimson';
  const isDark = themeStyle === 'dark';

  // ==========================================
  // 1. PORTADA / WELCOME SCREEN (KFC DESIGN)
  // ==========================================
  if (!isStarted && !completed) {
    return (
      <div className={`rounded-[36px] border shadow-2xl max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300 transition-all ${
        isCrimson
          ? 'bg-[#50000c]/95 border-red-800/70 text-white shadow-red-950/80 backdrop-blur-md'
          : isDark
          ? 'bg-[#0f172a]/95 border-slate-800 text-white shadow-black/80 backdrop-blur-md'
          : 'bg-white border-slate-100 text-slate-900 shadow-2xl'
      }`}>
        {/* KFC Signature 3-Stripe Decorative Header */}
        <div className="h-2.5 w-full flex">
          <div className="flex-1 bg-[#E4002B]" />
          <div className={`w-6 ${isCrimson ? 'bg-red-950' : isDark ? 'bg-slate-900' : 'bg-white'}`} />
          <div className="flex-1 bg-[#E4002B]" />
          <div className={`w-6 ${isCrimson ? 'bg-red-950' : isDark ? 'bg-slate-900' : 'bg-white'}`} />
          <div className="flex-1 bg-[#E4002B]" />
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          {/* Top Status & Category Badges */}
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-xl shadow-2xs ${
              isCrimson
                ? 'bg-red-950/80 text-red-200 border border-red-800/80'
                : isDark
                ? 'bg-slate-900 text-red-400 border border-slate-800'
                : isQuiz 
                ? 'bg-red-50 text-[#E4002B] border border-red-200' 
                : 'bg-slate-100 text-slate-800 border border-slate-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#E4002B] animate-pulse" />
              {isQuiz ? 'Evaluación Operativa KFC' : 'Encuesta Pulse KFC'}
            </span>

            <span className={`text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-xl border ${
              isCrimson
                ? 'bg-[#380007] text-red-300 border-red-800/60'
                : isDark
                ? 'bg-slate-900 text-slate-400 border-slate-800'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {survey.category || 'General'}
            </span>
          </div>

          {/* Hero Branding Section */}
          <div className="text-center space-y-4 py-2">
            <div className="relative inline-block">
              <div className={`w-24 h-24 rounded-3xl p-3.5 mx-auto flex items-center justify-center transition-all duration-300 hover:scale-105 group ${
                isCrimson
                  ? 'bg-[#6b0213] border-2 border-red-500/50 shadow-xl shadow-red-600/30 hover:shadow-red-600/50'
                  : isDark
                  ? 'bg-slate-900 border-2 border-red-600/40 shadow-xl shadow-red-600/25 hover:shadow-red-600/40'
                  : 'bg-white border-2 border-red-100/80 shadow-xl shadow-red-600/15 hover:shadow-2xl hover:shadow-red-600/25'
              }`}>
                <img
                  src="/Favicon.png"
                  alt="RED Logo"
                  className="w-full h-full object-contain rounded-2xl animate-pulse group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase italic ${
                isCrimson || isDark ? 'text-white' : 'text-slate-950'
              }`}>
                {survey.title}
              </h1>
              {!isPlaceholderDesc(survey.description) && (
                <p className={`text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed ${
                  isCrimson ? 'text-red-200/85' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {survey.description}
                </p>
              )}
            </div>
          </div>

          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className={`rounded-2xl p-3.5 sm:p-4 text-center space-y-1 border ${
              isCrimson
                ? 'bg-[#3b0008]/90 border-red-800/70 text-white shadow-inner'
                : isDark
                ? 'bg-slate-900/90 border-slate-800 text-white shadow-inner'
                : 'bg-slate-50 border-slate-200/80 text-slate-900 shadow-2xs'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-widest block ${isCrimson ? 'text-red-300' : 'text-slate-400'}`}>
                Total Preguntas
              </span>
              <span className="text-lg sm:text-xl font-black block">{questions.length}</span>
              <span className={`text-[9px] font-bold block ${isCrimson ? 'text-red-400' : 'text-slate-400'}`}>Ítems</span>
            </div>

            <div className={`rounded-2xl p-3.5 sm:p-4 text-center space-y-1 border ${
              isCrimson
                ? 'bg-[#3b0008]/90 border-red-800/70 text-white shadow-inner'
                : isDark
                ? 'bg-slate-900/90 border-slate-800 text-white shadow-inner'
                : 'bg-slate-50 border-slate-200/80 text-slate-900 shadow-2xs'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-widest block ${isCrimson ? 'text-red-300' : 'text-slate-400'}`}>
                Tiempo
              </span>
              <span className="text-lg sm:text-xl font-black block">
                {timeLimit > 0 ? (timeLimit >= 60 ? `${Math.round(timeLimit / 60)} min` : `${timeLimit} seg`) : 'Libre'}
              </span>
              <span className={`text-[9px] font-bold block ${isCrimson ? 'text-red-400' : 'text-slate-400'}`}>
                {timeLimit > 0 ? 'Límite' : 'Sin límite'}
              </span>
            </div>

            <div className={`rounded-2xl p-3.5 sm:p-4 text-center space-y-1 border ${
              isCrimson
                ? 'bg-[#3b0008]/90 border-red-800/70 text-white shadow-inner'
                : isDark
                ? 'bg-slate-900/90 border-slate-800 text-white shadow-inner'
                : 'bg-slate-50 border-slate-200/80 text-slate-900 shadow-2xs'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-widest block ${isCrimson ? 'text-red-300' : 'text-slate-400'}`}>
                Meta
              </span>
              <span className="text-lg sm:text-xl font-black text-[#E4002B] block">
                {isQuiz ? `${passingScorePercent}%` : '100%'}
              </span>
              <span className={`text-[9px] font-bold block ${isCrimson ? 'text-red-400' : 'text-slate-400'}`}>
                {isQuiz ? 'Mín. Aprobación' : 'Confidencial'}
              </span>
            </div>
          </div>

          {/* Action Call To Action */}
          {maxAttemptsReached ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                Límite de Intentos Alcanzado
              </h4>
              <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-md mx-auto">
                Ya has completado el número máximo de <strong>{survey.max_attempts}</strong> intento(s) permitido(s) para esta evaluación en este dispositivo.
              </p>
              {!isPublic && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase cursor-pointer shadow-md"
                >
                  Volver al Panel
                </button>
              )}
            </div>
          ) : (
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              {!isPublic && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-xs font-bold transition cursor-pointer border ${
                    isCrimson
                      ? 'border-red-800 text-red-200 hover:bg-red-950/60'
                      : isDark
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-850'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Volver
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsStarted(true)}
                className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-[#E4002B] via-red-600 to-[#99001A] hover:brightness-110 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer group"
              >
                <span>{isQuiz ? 'Iniciar Evaluación Operativa' : 'Comenzar Formulario'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. PANTALLA FINAL / CELEBRATION
  // ==========================================
  if (completed) {
    return (
      <div className={`rounded-[36px] border shadow-2xl max-w-xl mx-auto overflow-hidden animate-in zoom-in-95 duration-300 ${
        isCrimson
          ? 'bg-[#50000c]/95 border-red-800/70 text-white shadow-red-950/80'
          : isDark
          ? 'bg-[#0f172a]/95 border-slate-800 text-white shadow-black/80'
          : 'bg-white border-slate-100 text-slate-900 shadow-2xl'
      }`}>
        {/* KFC Stripes Header */}
        <div className="h-2.5 w-full flex">
          <div className="flex-1 bg-[#E4002B]" />
          <div className={`w-6 ${isCrimson ? 'bg-red-950' : isDark ? 'bg-slate-900' : 'bg-white'}`} />
          <div className="flex-1 bg-[#E4002B]" />
          <div className={`w-6 ${isCrimson ? 'bg-red-950' : isDark ? 'bg-slate-900' : 'bg-white'}`} />
          <div className="flex-1 bg-[#E4002B]" />
        </div>

        <div className="p-8 sm:p-10 text-center space-y-6">
          {isQuiz && (survey.show_results_immediately ?? true) ? (
            <div className="space-y-5">
              {/* Quiz Result Badge */}
              <div className="relative inline-block">
                <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center shadow-2xl border-4 border-white ${
                  finalScore?.passed 
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30' 
                    : 'bg-gradient-to-tr from-[#E4002B] to-[#99001A] text-white shadow-red-600/30'
                }`}>
                  {finalScore?.passed ? <Trophy className="w-12 h-12 drop-shadow" /> : <XCircle className="w-12 h-12 drop-shadow" />}
                </div>
                <span className="absolute -bottom-2 -right-1 p-2 bg-slate-900 text-white rounded-2xl shadow-md border-2 border-white">
                  <Award className="w-4 h-4 text-[#E4002B]" />
                </span>
              </div>

              <div>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                  finalScore?.passed ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-red-100 text-red-900 border border-red-200'
                }`}>
                  {finalScore?.passed ? '✓ Evaluación Aprobada' : '✕ No Aprobado'}
                </span>
                <h2 className={`text-4xl font-black mt-3 tracking-tight italic ${isCrimson || isDark ? 'text-white' : 'text-slate-950'}`}>
                  {finalScore?.scorePercent}%
                </h2>
                <p className={`text-xs font-bold mt-1 ${isCrimson ? 'text-red-300' : 'text-slate-400'}`}>
                  Puntaje mínimo de pase requerido: {passingScorePercent}%
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-xs font-medium leading-relaxed ${
                isCrimson
                  ? 'bg-[#3b0008] border-red-800/70 text-red-100'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200/80 text-slate-600'
              }`}>
                {finalScore?.passed 
                  ? '¡Excelente trabajo! Has demostrado los estándares operativos requeridos para el personal de KFC.'
                  : 'Te invitamos a repasar los conceptos operativos con tu entrenador de tienda para la próxima oportunidad.'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#E4002B] to-[#99001A] text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-red-600/25 border-4 border-white">
                <CheckCircle className="w-10 h-10 drop-shadow" />
              </div>
              <div className="space-y-1">
                <h2 className={`text-2xl font-black uppercase tracking-tight ${isCrimson || isDark ? 'text-white' : 'text-slate-950'}`}>
                  {survey.thank_you?.title || (isQuiz ? '¡Evaluación Completada!' : '¡Muchas Gracias!')}
                </h2>
                <p className={`text-xs font-medium max-w-sm mx-auto leading-relaxed ${
                  isCrimson ? 'text-red-200/90' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {survey.thank_you?.message || (isQuiz ? 'Tus respuestas han sido registradas y procesadas exitosamente en el sistema RED KFC.' : 'Tus respuestas han sido registradas y procesadas exitosamente en el sistema RED KFC.')}
                </p>
              </div>

              <div className={`p-3 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border ${
                isCrimson
                  ? 'bg-red-950/80 border-red-800/80 text-red-200'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-red-400'
                  : 'bg-red-50/80 border-red-100 text-[#E4002B]'
              }`}>
                <ShieldCheck className="w-4 h-4 text-[#E4002B]" />
                <span>Registro Operativo Confirmado</span>
              </div>
            </div>
          )}

          {!isPublic && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition cursor-pointer shadow-lg"
            >
              Finalizar y Salir
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ESTADO SIN PREGUNTAS
  // ==========================================
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-4 max-w-md mx-auto shadow-xl">
        <AlertCircle className="w-10 h-10 text-[#E4002B] mx-auto" />
        <h3 className="text-sm font-black text-slate-800">Esta encuesta no contiene preguntas activas</h3>
        <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl cursor-pointer">
          Cerrar
        </button>
      </div>
    );
  }

  // ==========================================
  // 4. APARTADO DE PREGUNTAS (RUNNER)
  // ==========================================
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className={`rounded-[36px] border shadow-2xl max-w-2xl mx-auto overflow-hidden flex flex-col min-h-[520px] animate-in fade-in duration-200 ${
      isCrimson
        ? 'bg-[#50000c]/95 border-red-800/70 text-white shadow-2xl shadow-red-950/80'
        : isDark
        ? 'bg-[#0f172a]/95 border-slate-800 text-white shadow-2xl shadow-black/80'
        : 'bg-white border-slate-100 text-slate-900 shadow-2xl'
    }`}>
      {/* Header Bar with KFC Pulse Branding & Progress */}
      <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
        isCrimson
          ? 'bg-[#380007]/90 border-red-900/60 text-red-100'
          : isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-slate-50/90 border-slate-100 text-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          {!isPublic ? (
            <button
              type="button"
              onClick={onClose}
              className={`text-xs font-bold transition p-1 rounded-lg cursor-pointer ${
                isCrimson
                  ? 'text-red-300 hover:text-white hover:bg-red-900/50'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              ✕ Salir
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E4002B]" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isCrimson || isDark ? 'text-white' : 'text-slate-800'}`}>
                RED Pulse
              </span>
            </div>
          )}
        </div>

        {hasTimer && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full font-black text-xs shadow-2xs border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-[#E4002B] animate-pulse" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCrimson ? 'text-red-300/80' : 'text-slate-400'}`}>
            {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-xs font-black text-[#E4002B]">{progressPercent}%</span>
        </div>
      </div>

      {/* Pure KFC Red Progress Bar */}
      <div className={`w-full h-1.5 relative overflow-hidden ${isCrimson ? 'bg-[#380007]' : isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        <div 
          className="h-full bg-gradient-to-r from-[#E4002B] to-[#99001A] transition-all duration-300 shadow-[0_0_8px_rgba(228,0,43,0.4)]" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      {/* Main Question Body */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200 key={currentQuestion.id}">
          {/* Question Tag / Index */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                isCrimson
                  ? 'bg-red-950/80 text-red-200 border-red-800/80'
                  : isDark
                  ? 'bg-slate-900 text-red-400 border-slate-800'
                  : 'bg-red-50 text-[#E4002B] border-red-100'
              }`}>
                Pregunta {currentIndex + 1}
              </span>
              <span className={`text-[9px] font-bold uppercase ${isCrimson ? 'text-red-400/80' : 'text-slate-400'}`}>
                * Obligatoria
              </span>
            </div>

            {validationAlert && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#E4002B] bg-red-50 px-2.5 py-0.5 rounded-md animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Responde para avanzar
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className={`text-lg sm:text-xl font-black leading-snug tracking-tight ${isCrimson || isDark ? 'text-white' : 'text-slate-950'}`}>
              {currentQuestion.title}
            </h2>
            {currentQuestion.description && (
              <p className={`text-xs font-medium leading-relaxed p-3 rounded-2xl border ${
                isCrimson
                  ? 'text-red-200 bg-[#3b0008] border-red-900/60'
                  : isDark
                  ? 'text-slate-400 bg-slate-900/80 border-slate-800'
                  : 'text-slate-500 bg-slate-50 border-slate-100'
              }`}>
                {currentQuestion.description}
              </p>
            )}
          </div>

          {/* Opciones Interactivas Según Tipo */}
          <div className="pt-2">
            {/* Opción Única (Single Choice) */}
            {currentQuestion.type === 'single_choice' && (
              <div className="space-y-2.5">
                {(currentQuestion.options || []).map((opt, idx) => {
                  const selected = answers[currentQuestion.id] === opt.value;
                  const letter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, opt.value)}
                      className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-between cursor-pointer shadow-2xs group ${
                        selected
                          ? isCrimson
                            ? 'bg-[#730214] border-red-400 text-white shadow-lg shadow-red-600/30 scale-[1.01]'
                            : isDark
                            ? 'bg-red-950/60 border-[#E4002B] text-white shadow-lg shadow-red-600/20 scale-[1.01]'
                            : 'bg-gradient-to-r from-red-50/90 to-white text-slate-950 border-[#E4002B] shadow-sm scale-[1.01]'
                          : isCrimson
                          ? 'bg-[#3b0008]/80 text-red-100 border-red-800/70 hover:border-red-500 hover:bg-[#48000a]'
                          : isDark
                          ? 'bg-slate-900/80 text-slate-200 border-slate-800 hover:border-slate-600 hover:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center transition ${
                          selected 
                            ? 'bg-[#E4002B] text-white shadow-xs' 
                            : isCrimson
                            ? 'bg-red-950 text-red-300'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}>
                          {letter}
                        </span>
                        <span className={`leading-snug ${selected ? 'font-black' : ''}`}>{opt.text}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        selected ? 'border-[#E4002B] bg-[#E4002B] text-white' : isCrimson ? 'border-red-800' : isDark ? 'border-slate-700' : 'border-slate-300'
                      }`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Opción Múltiple (Multiple Choice) */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-2.5">
                <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${isCrimson ? 'text-red-300/80' : 'text-slate-400'}`}>
                  Selecciona una o varias opciones:
                </span>
                {(currentQuestion.options || []).map((opt, idx) => {
                  const currentVals = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];
                  const selected = currentVals.includes(opt.value);
                  const letter = String.fromCharCode(65 + idx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleToggleMultipleChoice(currentQuestion.id, opt.value)}
                      className={`w-full text-left p-4 rounded-2xl border-2 font-bold text-xs transition-all flex items-center justify-between cursor-pointer shadow-2xs group ${
                        selected
                          ? isCrimson
                            ? 'bg-[#730214] border-red-400 text-white shadow-lg shadow-red-600/30'
                            : isDark
                            ? 'bg-red-950/60 border-[#E4002B] text-white shadow-lg shadow-red-600/20'
                            : 'bg-gradient-to-r from-red-50/90 to-white text-slate-950 border-[#E4002B] shadow-sm'
                          : isCrimson
                          ? 'bg-[#3b0008]/80 text-red-100 border-red-800/70 hover:border-red-500 hover:bg-[#48000a]'
                          : isDark
                          ? 'bg-slate-900/80 text-slate-200 border-slate-800 hover:border-slate-600 hover:bg-slate-850'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center transition ${
                          selected 
                            ? 'bg-[#E4002B] text-white shadow-xs' 
                            : isCrimson
                            ? 'bg-red-950 text-red-300'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}>
                          {letter}
                        </span>
                        <span className={`leading-snug ${selected ? 'font-black' : ''}`}>{opt.text}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition ${
                        selected ? 'border-[#E4002B] bg-[#E4002B] text-white' : isCrimson ? 'border-red-800' : isDark ? 'border-slate-700' : 'border-slate-300'
                      }`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sí / No */}
            {currentQuestion.type === 'yes_no' && (
              <div className="grid grid-cols-2 gap-4">
                {['No', 'Sí'].map(val => {
                  const selected = answers[currentQuestion.id] === val;
                  const isYes = val === 'Sí';

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, val)}
                      className={`py-5 px-6 rounded-2xl border-2 font-black text-lg text-center transition-all cursor-pointer shadow-sm flex items-center justify-center tracking-widest uppercase ${
                        selected
                          ? isYes 
                            ? 'bg-[#E4002B] text-white border-red-700 shadow-lg shadow-red-600/30 scale-102'
                            : 'bg-slate-900 text-white border-slate-950 shadow-lg shadow-slate-900/30 scale-102'
                          : isCrimson
                          ? 'bg-[#3b0008] text-red-100 border-red-800 hover:border-red-500'
                          : isDark
                          ? 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-600'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{val}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Escala / Rating (Estrellas Acumulativas) */}
            {currentQuestion.type === 'rating' && (
              <div className={`space-y-3 text-center p-6 rounded-3xl border ${
                isCrimson
                  ? 'bg-[#3b0008]/80 border-red-800/70'
                  : isDark
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-50/70 border-slate-100'
              }`}>
                <div className="flex justify-center gap-2 sm:gap-3 py-2" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map(num => {
                    const currentRating = Number(answers[currentQuestion.id]) || 0;
                    const activeRating = hoverRating > 0 ? hoverRating : currentRating;
                    const isFilled = num <= activeRating;

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, num)}
                        onMouseEnter={() => setHoverRating(num)}
                        className={`w-12 sm:w-14 h-12 sm:h-14 rounded-2xl border-2 font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                          isFilled
                            ? 'bg-[#E4002B] text-white border-[#B8001F] shadow-lg shadow-red-600/30 scale-110'
                            : isCrimson
                            ? 'bg-[#290005] text-red-700 border-red-900 hover:border-red-400 hover:scale-105'
                            : isDark
                            ? 'bg-slate-950 text-slate-700 border-slate-800 hover:border-slate-600 hover:scale-105'
                            : 'bg-white text-slate-300 border-slate-200 hover:border-red-300 hover:scale-105'
                        }`}
                      >
                        <Star className={`w-6 sm:w-7 h-6 sm:h-7 ${isFilled ? 'fill-white text-white drop-shadow' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Rating Descriptor */}
                <div className="h-6 flex items-center justify-center">
                  {((hoverRating || Number(answers[currentQuestion.id])) > 0) && (
                    <span className="text-xs font-black text-[#E4002B] bg-red-50 px-3.5 py-1 rounded-xl border border-red-200 animate-in fade-in duration-150 uppercase tracking-wider">
                      {RATING_LABELS[hoverRating || Number(answers[currentQuestion.id])] || ''}
                    </span>
                  )}
                </div>

                {(currentQuestion.rating_min_label || currentQuestion.rating_max_label) && (
                  <div className={`flex justify-between text-[10px] font-black uppercase tracking-wider px-2 pt-1 border-t ${
                    isCrimson ? 'border-red-800/60 text-red-400' : isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200/60 text-slate-400'
                  }`}>
                    <span>{currentQuestion.rating_min_label || '1 - Mínimo'}</span>
                    <span>{currentQuestion.rating_max_label || '5 - Máximo'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Jerarquía KFC */}
            {currentQuestion.type === 'store_hierarchy' && (
              <StoreHierarchySelector
                restaurants={restaurants}
                value={answers[currentQuestion.id] || ''}
                onChange={val => handleSelectOption(currentQuestion.id, val)}
              />
            )}

            {/* Ordenamiento Secuencial (Ordering) */}
            {currentQuestion.type === 'ordering' && (
              <div className="space-y-2.5">
                <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${isCrimson ? 'text-red-300/80' : 'text-slate-400'}`}>
                  Organiza la secuencia correcta usando las flechas:
                </span>
                {((answers[currentQuestion.id] as string[]) || (currentQuestion.options || []).map(o => o.text)).map((itemText, itemIdx, list) => (
                  <div
                    key={itemIdx}
                    className={`p-3.5 border-2 rounded-2xl flex items-center justify-between font-bold text-xs shadow-2xs transition ${
                      isCrimson
                        ? 'bg-[#3b0008] border-red-800/80 text-white hover:border-red-500'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {itemIdx + 1}
                      </span>
                      <span className="font-bold">{itemText}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveOrderItem(currentQuestion.id, itemIdx, 'up')}
                        disabled={itemIdx === 0}
                        className={`p-1.5 rounded-xl disabled:opacity-20 cursor-pointer transition ${
                          isCrimson ? 'hover:bg-red-900/50 text-red-200' : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrderItem(currentQuestion.id, itemIdx, 'down')}
                        disabled={itemIdx === list.length - 1}
                        className={`p-1.5 rounded-xl disabled:opacity-20 cursor-pointer transition ${
                          isCrimson ? 'hover:bg-red-900/50 text-red-200' : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fecha */}
            {currentQuestion.type === 'date' && (
              <div className="space-y-2">
                <label className={`text-[9px] font-black uppercase tracking-widest block ${isCrimson ? 'text-red-300' : 'text-slate-400'}`}>
                  Seleccionar Fecha
                </label>
                <input
                  type="date"
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleSelectOption(currentQuestion.id, e.target.value)}
                  className={`w-full border-2 rounded-2xl p-4 text-xs font-bold outline-none shadow-xs transition ${
                    isCrimson
                      ? 'bg-[#3b0008] border-red-800 text-white focus:border-red-400'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-[#E4002B]'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-[#E4002B]'
                  }`}
                />
              </div>
            )}

            {/* Texto Corto / Texto Largo */}
            {['short_text', 'long_text'].includes(currentQuestion.type) && (
              <div className="space-y-1.5">
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleSelectOption(currentQuestion.id, e.target.value)}
                  placeholder="Escribe tu respuesta aquí detalladamente..."
                  className={`w-full border-2 rounded-3xl p-4 text-xs font-medium outline-none h-32 resize-none shadow-xs transition ${
                    isCrimson
                      ? 'bg-[#3b0008] border-red-800 text-white focus:border-red-400 placeholder:text-red-300/40'
                      : isDark
                      ? 'bg-slate-900 border-slate-800 text-white focus:border-[#E4002B] placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-[#E4002B] focus:ring-2 focus:ring-red-100 placeholder:text-slate-400'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className={`flex items-center justify-between pt-5 border-t ${
          isCrimson ? 'border-red-900/60' : isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-25 transition cursor-pointer ${
              isCrimson ? 'text-red-300 hover:text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ← Anterior
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!isAnswered}
            title={!isAnswered ? 'Debes responder la pregunta para continuar' : ''}
            className={`px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
              isAnswered
                ? 'bg-gradient-to-r from-[#E4002B] via-red-600 to-[#99001A] hover:brightness-110 text-white shadow-red-600/25 transform active:scale-[0.99] cursor-pointer'
                : isCrimson
                ? 'bg-red-950/40 text-red-800/60 border border-red-900/40 cursor-not-allowed shadow-none'
                : isDark
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none'
                : 'bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{currentIndex === questions.length - 1 ? (isQuiz ? 'Finalizar y Calificar' : 'Enviar Respuestas') : 'Siguiente'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
