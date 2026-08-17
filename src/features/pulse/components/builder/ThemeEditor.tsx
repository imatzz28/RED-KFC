import React from 'react';
import { Survey, ThemeConfig, ThankYouConfig, DEFAULT_SURVEY_CATEGORIES } from '@/types';
import { Palette, Sparkles, Check } from 'lucide-react';

interface ThemeEditorProps {
  theme: ThemeConfig;
  thankYou: ThankYouConfig;
  category?: string;
  onThemeUpdate: (updated: ThemeConfig) => void;
  onThankYouUpdate: (updated: ThankYouConfig) => void;
  onCategoryUpdate?: (category: string) => void;
}

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
  };

  const currentThankYou = thankYou || {
    title: '¡Muchas gracias por participar!',
    message: 'Tus respuestas han sido registradas exitosamente.',
    show_button: false,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      {/* Columna Izquierda: Personalización Visual del Formulario */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Palette className="w-5 h-5 text-[#E4002B]" />
          <h3 className="font-black text-slate-900 text-sm">Personalización Visual del Formulario</h3>
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

        {/* Color Principal de la Encuesta */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-2">
            Color Principal de la Encuesta
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
            <span className="text-xs text-slate-500 font-bold">Hex Personalizado:</span>
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

        {/* Logo URL */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Logo de la Empresa / Marca (URL de Imagen)
          </label>
          <input
            type="text"
            value={currentTheme.logo_url || ''}
            onChange={(e) => onThemeUpdate({ ...currentTheme, logo_url: e.target.value })}
            placeholder="https://ejemplo.com/logo.png"
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#E4002B]"
          />
        </div>

        {/* Background Wallpaper URL */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Imagen de Fondo Global (URL)
          </label>
          <input
            type="text"
            value={currentTheme.background_image_url || ''}
            onChange={(e) => onThemeUpdate({ ...currentTheme, background_image_url: e.target.value })}
            placeholder="https://images.unsplash.com/photo-1557683316-973673baf926"
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-[#E4002B]"
          />
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
  );
};
