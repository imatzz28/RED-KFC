import React from 'react';
import { Survey, ThemeConfig, ThankYouConfig, DEFAULT_SURVEY_CATEGORIES } from '@/types';
import { Palette, Sparkles, Check, LayoutTemplate, Award } from 'lucide-react';

interface ThemeEditorProps {
  survey?: Survey;
  theme: ThemeConfig;
  thankYou: ThankYouConfig;
  category?: string;
  onThemeUpdate: (updated: ThemeConfig) => void;
  onThankYouUpdate: (updated: ThankYouConfig) => void;
  onCategoryUpdate?: (category: string) => void;
}

interface ThemeTemplateOption {
  id: 'base' | 'dark';
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  accent: string;
  bgPreview: string;
  cardPreview: string;
  textPreview: string;
}

const TEMPLATES: ThemeTemplateOption[] = [
  {
    id: 'base',
    title: 'Diseño Base (KFC Clásico)',
    subtitle: 'Template 1 - Clásico',
    description: 'Diseño limpio, corporativo y directo. Fondo blanco perla con contrastes sutiles y acentos oficiales KFC.',
    badge: 'KFC Light',
    accent: '#E4002B',
    bgPreview: 'from-slate-100 to-slate-200',
    cardPreview: 'bg-white border-slate-200 text-slate-900',
    textPreview: 'text-slate-900',
  },
  {
    id: 'dark',
    title: 'Noche Coronel (KFC Dark Obsidian)',
    subtitle: 'Template 2 - Enfoque Dark',
    description: 'Diseño oscuro, elegante y moderno. Fondo carbón profundo con métricas destacadas y botones de alto impacto.',
    badge: 'KFC Dark Night',
    accent: '#E4002B',
    bgPreview: 'from-slate-950 via-[#0b101d] to-black',
    cardPreview: 'bg-[#0f172a] border-slate-800 text-white',
    textPreview: 'text-white',
  },
];

const PRESET_COLORS = [
  { name: 'KFC Rojo Corporativo', hex: '#E4002B' },
  { name: 'KFC Negro Profundo', hex: '#0F172A' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Violeta', hex: '#8B5CF6' },
  { name: 'Rosa Vívido', hex: '#F43F5E' },
  { name: 'Ámbar', hex: '#F59E0B' },
  { name: 'Cian', hex: '#06B6D4' },
];

const FONTS = [
  { id: 'jakarta', name: 'Plus Jakarta Sans (Moderna)' },
  { id: 'inter', name: 'Inter (Limpia & Minimal)' },
  { id: 'poppins', name: 'Poppins (Geométrica)' },
  { id: 'playfair', name: 'Playfair Display (Elegante)' },
];

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  survey,
  theme,
  thankYou,
  category,
  onThemeUpdate,
  onThankYouUpdate,
  onCategoryUpdate,
}) => {
  const currentTheme = theme || {
    primary_color: '#E4002B',
    background_color: '#F8FAFC',
    card_style: 'standard',
    font_family: 'jakarta',
    theme_style: 'base',
  };

  const selectedStyle = currentTheme.theme_style === 'dark' ? 'dark' : 'base';

  const currentThankYou = thankYou || {
    title: '¡Muchas gracias por participar!',
    message: 'Tus respuestas han sido registradas exitosamente.',
    show_button: false,
  };

  const isQuiz = survey?.type === 'quiz';
  const surveyTitle = survey?.title || (isQuiz ? 'Evaluación de Conocimientos Operativos' : 'Encuesta de Satisfacción');
  const questionCount = survey?.questions?.length || 10;
  const timeLimitSecs = survey?.time_limit_seconds || 0;
  const passingScore = survey?.passing_score_percent ?? 70;

  return (
    <div className="space-y-8">
      {/* 1. AJUSTES DE COLOR DE ACENTO, TIPOGRAFÍA Y PANTALLA DE AGRADECIMIENTO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
        {/* Columna Izquierda: Tipografía y Color de Acento */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Palette className="w-5 h-5 text-[#E4002B]" />
            <h3 className="font-black text-slate-900 text-sm">Color de Acento y Tipografía</h3>
          </div>

          {/* Categoría / Segmentación de la Encuesta */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Categoría / Segmentación de la Encuesta
            </label>
            <select
              value={category || 'General'}
              onChange={(e) => onCategoryUpdate && onCategoryUpdate(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-[#E4002B] outline-none cursor-pointer"
            >
              {DEFAULT_SURVEY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Color de Acento */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Color de Acento (Botones y Marcadores)
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onThemeUpdate({ ...currentTheme, primary_color: c.hex })}
                  className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                    currentTheme.primary_color === c.hex
                      ? 'border-slate-900 scale-110 shadow-sm'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {currentTheme.primary_color === c.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Hex:</span>
              <input
                type="color"
                value={currentTheme.primary_color || '#E4002B'}
                onChange={(e) => onThemeUpdate({ ...currentTheme, primary_color: e.target.value })}
                className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={currentTheme.primary_color || '#E4002B'}
                onChange={(e) => onThemeUpdate({ ...currentTheme, primary_color: e.target.value })}
                className="text-xs font-mono font-black bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 w-28 uppercase outline-none focus:border-[#E4002B]"
              />
            </div>
          </div>

          {/* Tipografía Principal */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tipografía Principal
            </label>
            <select
              value={currentTheme.font_family || 'jakarta'}
              onChange={(e) => onThemeUpdate({ ...currentTheme, font_family: e.target.value as any })}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#E4002B] cursor-pointer"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Columna Derecha: Pantalla de Agradecimiento Final */}
        <div className="space-y-5 md:border-l md:border-slate-100 md:pl-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-[#E4002B]" />
            <h3 className="font-black text-slate-900 text-sm">Pantalla de Agradecimiento Final</h3>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Título de Agradecimiento
            </label>
            <input
              type="text"
              value={currentThankYou.title}
              onChange={(e) => onThankYouUpdate({ ...currentThankYou, title: e.target.value })}
              placeholder="¡Muchas gracias por participar!"
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-[#E4002B]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mensaje Descriptivo
            </label>
            <textarea
              rows={3}
              value={currentThankYou.message}
              onChange={(e) => onThankYouUpdate({ ...currentThankYou, message: e.target.value })}
              placeholder="Tus respuestas han sido registradas exitosamente."
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-[#E4002B] h-24"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentThankYou.show_button || false}
                onChange={(e) => onThankYouUpdate({ ...currentThankYou, show_button: e.target.checked })}
                className="rounded text-[#E4002B] focus:ring-red-500 cursor-pointer"
              />
              <span>Mostrar botón de redirección al finalizar</span>
            </label>

            {currentThankYou.show_button && (
              <div className="mt-3 space-y-2 pl-6 animate-in fade-in duration-200">
                <input
                  type="text"
                  value={currentThankYou.button_text || ''}
                  onChange={(e) => onThankYouUpdate({ ...currentThankYou, button_text: e.target.value })}
                  placeholder="Texto del botón (ej. Volver al Inicio)"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#E4002B]"
                />
                <input
                  type="text"
                  value={currentThankYou.button_url || ''}
                  onChange={(e) => onThankYouUpdate({ ...currentThankYou, button_url: e.target.value })}
                  placeholder="URL de destino (https://...)"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#E4002B]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SELECCIÓN DE DISEÑOS VISUALES (PLANTILLAS BASE Y DARK) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#E4002B] flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Estilo y Plantilla Visual de la Encuesta
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Selecciona entre el Diseño Base oficial o el Tema Oscuro (Dark Obsidian).
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 uppercase tracking-widest shrink-0">
            2 Diseños Disponibles
          </span>
        </div>

        {/* Grid de las 2 tarjetas de selección */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TEMPLATES.map((tmpl) => {
            const isSelected = selectedStyle === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onThemeUpdate({ ...currentTheme, theme_style: tmpl.id })}
                className={`relative flex flex-col justify-between p-5 rounded-3xl border-2 text-left transition-all duration-200 cursor-pointer group ${
                  isSelected
                    ? 'border-[#E4002B] bg-red-50/20 ring-4 ring-red-500/10 shadow-lg scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-4 w-full">
                  {/* Header de la tarjeta */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                      tmpl.id === 'dark'
                        ? 'bg-slate-900 text-white border border-slate-800'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}>
                      {tmpl.badge}
                    </span>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      isSelected ? 'bg-[#E4002B] text-white shadow-xs' : 'bg-slate-100 text-transparent border border-slate-200'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  {/* Miniature Mockup de la pantalla de bienvenida */}
                  <div className={`w-full rounded-2xl p-3.5 bg-gradient-to-b ${tmpl.bgPreview} border border-black/10 overflow-hidden shadow-inner space-y-2.5`}>
                    {/* Franjas decorativas superiores */}
                    <div className="h-1.5 w-full flex rounded-full overflow-hidden">
                      <div className="flex-1 bg-[#E4002B]" />
                      <div className={`w-2 ${tmpl.id === 'dark' ? 'bg-slate-900' : 'bg-white'}`} />
                      <div className="flex-1 bg-[#E4002B]" />
                    </div>

                    <div className={`${tmpl.cardPreview} rounded-2xl p-3.5 border shadow-xs space-y-2.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-wider opacity-80">RED Pulse</span>
                        <span className="text-[8px] font-bold opacity-60">KFC</span>
                      </div>

                      {/* Icono central */}
                      <div className="w-8 h-8 rounded-xl bg-[#E4002B] text-white mx-auto flex items-center justify-center shadow-md shadow-red-600/30">
                        <Award className="w-4 h-4" />
                      </div>

                      <div className="space-y-0.5 text-center">
                        <div className="text-[9px] font-black tracking-tight leading-tight line-clamp-1">
                          {surveyTitle}
                        </div>
                        <div className="text-[7px] opacity-70">
                          {isQuiz ? 'Evaluación Operativa' : 'Formulario Oficial'}
                        </div>
                      </div>

                      {/* 3 Métricas en miniatura */}
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="p-1 rounded bg-black/5 dark:bg-white/5 border border-white/10">
                          <span className="text-[6px] opacity-60 block">Ítems</span>
                          <span className="text-[8px] font-black block">{questionCount}</span>
                        </div>
                        <div className="p-1 rounded bg-black/5 dark:bg-white/5 border border-white/10">
                          <span className="text-[6px] opacity-60 block">Tiempo</span>
                          <span className="text-[8px] font-black block">{timeLimitSecs > 0 ? `${Math.round(timeLimitSecs / 60)}m` : 'Libre'}</span>
                        </div>
                        <div className="p-1 rounded bg-black/5 dark:bg-white/5 border border-white/10">
                          <span className="text-[6px] opacity-60 block">Meta</span>
                          <span className="text-[8px] font-black text-[#E4002B] block">{isQuiz ? `${passingScore}%` : '100%'}</span>
                        </div>
                      </div>

                      {/* Botón miniatura */}
                      <div className="w-full py-1.5 rounded-lg bg-[#E4002B] text-white text-[8px] font-black text-center shadow-xs">
                        Iniciar Evaluación →
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                      {tmpl.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-slate-400">
                    {tmpl.subtitle}
                  </span>
                  <span className={`text-[11px] font-black ${isSelected ? 'text-[#E4002B]' : 'text-slate-500 group-hover:text-slate-900'}`}>
                    {isSelected ? '✓ Seleccionado' : 'Elegir Tema'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
