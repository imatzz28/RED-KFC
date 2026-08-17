import React, { useState, useEffect } from 'react';
import { Survey, ResponseRecord, Answer, QuestionOption } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { dataService } from '@/services/dataService';
import {
  ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Trophy, Sparkles,
  Star, Check, Clock, Store, ArrowUp, ArrowDown, Upload, Calendar
} from 'lucide-react';

interface SurveyPlayerProps {
  survey: Survey;
  onSubmit: (response: ResponseRecord) => void;
  onClose: () => void;
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
    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            1. Regional KFC
          </label>
          <select
            value={selectedRegion}
            onChange={e => handleRegionChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#E4002B] cursor-pointer"
          >
            <option value="">-- Todas las Regionales --</option>
            {uniqueRegions.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            2. Jefe de Área / Zona
          </label>
          <select
            value={selectedZone}
            onChange={e => handleZoneChange(e.target.value)}
            disabled={!selectedRegion && uniqueRegions.length > 0}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#E4002B] cursor-pointer disabled:opacity-50"
          >
            <option value="">-- Todos los Jefes de Área --</option>
            {filteredZones.map(zon => (
              <option key={zon} value={zon}>{zon}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
          3. Tienda / Restaurante KFC (CECO)
        </label>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white border-2 border-slate-200 focus:border-[#E4002B] rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none cursor-pointer"
        >
          <option value="">-- Selecciona tu Tienda --</option>
          {filteredStores.map(r => (
            <option key={r.id} value={r.id}>
              {r.id} - {r.name} ({r.region} &gt; {r.zone})
            </option>
          ))}
        </select>
      </div>

      {value && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-900 flex items-center justify-between">
          <span>Jerarquía Registrada:</span>
          <span className="font-black">
            {(() => {
              const r = restaurants.find(s => s.id === value || value.includes(s.id));
              return r ? `${r.region} > ${r.zone} > ${r.id} - ${r.name}` : value;
            })()}
          </span>
        </div>
      )}
    </div>
  );
};

export const SurveyPlayer: React.FC<SurveyPlayerProps> = ({
  survey,
  onSubmit,
  onClose,
}) => {
  const { restaurants: storeRestaurants } = useAppStore();
  const restaurants = React.useMemo(() => {
    return storeRestaurants?.length ? storeRestaurants : dataService.getRestaurants();
  }, [storeRestaurants]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<{ scorePercent: number; passed: boolean } | null>(null);

  // Timer state for timed quizzes
  const hasTimer = (survey.time_limit_seconds || 0) > 0;
  const [timeLeft, setTimeLeft] = useState<number>(survey.time_limit_seconds || 0);

  const questions = survey.questions || [];
  const currentQuestion = questions[currentIndex];
  const isQuiz = survey.type === 'quiz';

  useEffect(() => {
    if (!hasTimer || completed) return;
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
  }, [hasTimer, completed]);

  // Ordering question state initializer
  useEffect(() => {
    if (currentQuestion && currentQuestion.type === 'ordering' && !answers[currentQuestion.id]) {
      const defaultOrder = (currentQuestion.options || []).map(o => o.text);
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: defaultOrder }));
    }
  }, [currentQuestion]);

  const handleSelectOption = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
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
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Check for Skip Logic (Jump Rule)
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
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    let earnedPoints = 0;
    let totalPoints = 0;

    const answerItems: Answer[] = questions.map(q => {
      const userVal = answers[q.id];
      let isCorrect = false;
      let qPoints = q.points || 10;
      totalPoints += qPoints;

      if (['single_choice', 'multiple_choice'].includes(q.type)) {
        const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => o.value);
        if (q.type === 'single_choice') {
          isCorrect = correctOpts.includes(userVal);
        } else if (Array.isArray(userVal)) {
          isCorrect = userVal.length === correctOpts.length && userVal.every(v => correctOpts.includes(v));
        }
      } else if (q.type === 'ordering') {
        const expectedOrder = (q.options || []).map(o => o.text);
        if (Array.isArray(userVal)) {
          isCorrect = userVal.every((val, i) => val === expectedOrder[i]);
        }
      }

      if (isCorrect) {
        earnedPoints += qPoints;
      }

      let valueDisplay: string | undefined = undefined;
      if (q.type === 'store_hierarchy' && userVal) {
        const foundStore = restaurants.find(r => r.id === String(userVal) || String(userVal).includes(r.id));
        if (foundStore) {
          valueDisplay = `${foundStore.region} > ${foundStore.zone} > ${foundStore.id} - ${foundStore.name}`;
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
        is_correct: isQuiz ? isCorrect : undefined,
        points_earned: isQuiz ? (isCorrect ? qPoints : 0) : undefined,
        max_points: isQuiz ? qPoints : undefined,
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
    const passed = isQuiz ? scorePercent >= (survey.passing_score_percent || 70) : true;

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

  if (completed) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-2xl max-w-xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
        {isQuiz ? (
          <div className="space-y-4">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg ${
              finalScore?.passed ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-600 text-white shadow-red-600/30'
            }`}>
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                finalScore?.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {finalScore?.passed ? '¡Aprobado!' : 'No Aprobado'}
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-2">{finalScore?.scorePercent}%</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Puntaje mínimo requerido: {survey.passing_score_percent || 70}%
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">{survey.thank_you?.title || '¡Muchas Gracias!'}</h2>
            <p className="text-xs text-slate-500 font-medium">{survey.thank_you?.message || 'Tus respuestas han sido registradas exitosamente.'}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition cursor-pointer"
        >
          Finalizar y Volver
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-sm font-black text-slate-800">Esta encuesta no contiene preguntas activas</h3>
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 font-black text-xs rounded-xl">
          Cerrar
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-2xl mx-auto overflow-hidden flex flex-col min-h-[480px]">
      {/* Header Progress Bar & Timer */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
        <button onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-800">
          ✕ Salir
        </button>

        {hasTimer && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full font-black text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>{formatTimer(timeLeft)}</span>
          </div>
        )}

        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Pregunta {currentIndex + 1} de {questions.length}
        </span>
        <span className="text-xs font-black text-[#E4002B]">{progressPercent}%</span>
      </div>

      <div className="w-full bg-slate-100 h-1.5">
        <div className="bg-[#E4002B] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Main Question Container */}
      <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 leading-snug">{currentQuestion.title}</h2>
          {currentQuestion.description && (
            <p className="text-xs text-slate-500 font-medium">{currentQuestion.description}</p>
          )}

          {/* Opciones de respuesta según tipo */}
          <div className="pt-2">
            {['single_choice', 'multiple_choice'].includes(currentQuestion.type) && (
              <div className="space-y-2.5">
                {(currentQuestion.options || []).map(opt => {
                  const selected = answers[currentQuestion.id] === opt.value;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQuestion.id, opt.value)}
                      className={`w-full text-left p-3.5 rounded-2xl border font-bold text-xs transition flex items-center justify-between cursor-pointer ${
                        selected
                          ? 'bg-red-50 text-[#E4002B] border-[#E4002B] shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{opt.text}</span>
                      {selected && <Check className="w-4 h-4 text-[#E4002B]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ordering Type Question */}
            {currentQuestion.type === 'ordering' && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Organiza los elementos en el orden correcto usando las flechas
                </p>
                {((answers[currentQuestion.id] as string[]) || (currentQuestion.options || []).map(o => o.text)).map((itemText, itemIdx, list) => (
                  <div
                    key={itemIdx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between font-bold text-xs text-slate-800 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                        {itemIdx + 1}
                      </span>
                      <span>{itemText}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveOrderItem(currentQuestion.id, itemIdx, 'up')}
                        disabled={itemIdx === 0}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveOrderItem(currentQuestion.id, itemIdx, 'down')}
                        disabled={itemIdx === list.length - 1}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQuestion.type === 'store_hierarchy' && (
              <StoreHierarchySelector
                restaurants={restaurants}
                value={answers[currentQuestion.id] || ''}
                onChange={val => handleSelectOption(currentQuestion.id, val)}
              />
            )}

            {currentQuestion.type === 'yes_no' && (
              <div className="grid grid-cols-2 gap-3">
                {['Sí', 'No'].map(val => {
                  const selected = answers[currentQuestion.id] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleSelectOption(currentQuestion.id, val)}
                      className={`p-4 rounded-2xl border font-black text-sm text-center transition cursor-pointer ${
                        selected
                          ? 'bg-[#E4002B] text-white border-red-700 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'rating' && (
              <div className="space-y-2 text-center">
                <div className="flex justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map(num => {
                    const selected = answers[currentQuestion.id] === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleSelectOption(currentQuestion.id, num)}
                        className={`w-12 h-12 rounded-2xl border font-black text-sm flex items-center justify-center transition cursor-pointer ${
                          selected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-110'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Star className={`w-5 h-5 ${selected ? 'fill-white' : ''}`} />
                      </button>
                    );
                  })}
                </div>
                {(currentQuestion.rating_min_label || currentQuestion.rating_max_label) && (
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 px-4">
                    <span>{currentQuestion.rating_min_label}</span>
                    <span>{currentQuestion.rating_max_label}</span>
                  </div>
                )}
              </div>
            )}

            {currentQuestion.type === 'date' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Seleccionar Fecha</label>
                <input
                  type="date"
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleSelectOption(currentQuestion.id, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none focus:border-[#E4002B]"
                />
              </div>
            )}

            {currentQuestion.type === 'file_upload' && (
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2 bg-slate-50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Adjuntar Archivo o Documento</p>
                <input
                  type="file"
                  onChange={e => handleSelectOption(currentQuestion.id, e.target.files?.[0]?.name || '')}
                  className="text-xs font-medium text-slate-500"
                />
              </div>
            )}

            {['short_text', 'long_text'].includes(currentQuestion.type) && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={e => handleSelectOption(currentQuestion.id, e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium outline-none focus:border-[#E4002B] h-28"
              />
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-xs font-bold text-slate-500 disabled:opacity-30 hover:text-slate-800 cursor-pointer"
          >
            ← Anterior
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentIndex === questions.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
