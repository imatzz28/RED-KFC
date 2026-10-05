import * as XLSX from 'xlsx';
import { Survey, Question, QuestionOption, QuestionType, ThemeConfig, ThankYouConfig } from '@/types';

export interface PulseExcelImportResult {
  survey: Survey;
  warnings: string[];
  totalQuestions: number;
  validQuestions: number;
  quizPointsTotal: number;
}

/**
 * Genera y descarga la plantilla oficial de Excel para RED Pulse (.xlsx).
 * Contiene 3 hojas:
 * 1. Configuracion: Metadatos y parámetros del examen o encuesta.
 * 2. Preguntas: Banco de preguntas con opciones, respuestas correctas y retroalimentación.
 * 3. Instrucciones: Guía detallada y tipos admitidos.
 */
export const downloadPulseExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // ── HOJA 1: CONFIGURACIÓN ──────────────────────────────────────────────────
  const configData = [
    {
      'Parametro': 'Titulo',
      'Valor': 'Evaluación Operativa KFC - Estándares y Procedimientos',
      'Descripcion_Ayuda': 'Nombre oficial de la evaluación o encuesta (Requerido)'
    },
    {
      'Parametro': 'Tipo',
      'Valor': 'quiz',
      'Descripcion_Ayuda': 'quiz = Evaluación con puntaje y calificación | survey = Encuesta de opinión sin puntaje'
    },
    {
      'Parametro': 'Categoria',
      'Valor': 'Operaciones',
      'Descripcion_Ayuda': 'Operaciones, Capacitación, Servicio al Cliente, Seguridad y Salud, Auditoría / Calidad, Recursos Humanos, General'
    },
    {
      'Parametro': 'Descripcion',
      'Valor': 'Evaluación técnica de estándares operativos, tiempos de retención e inocuidad alimentaria KFC.',
      'Descripcion_Ayuda': 'Instrucciones u objetivos que verá el colaborador antes de iniciar'
    },
    {
      'Parametro': 'Puntaje_Aprobatorio',
      'Valor': 70,
      'Descripcion_Ayuda': 'Porcentaje mínimo requerido para aprobar (solo aplica a evaluaciones tipo quiz, ej: 70)'
    },
    {
      'Parametro': 'Tiempo_Limite_Minutos',
      'Valor': 15,
      'Descripcion_Ayuda': 'Tiempo máximo en minutos para completar la prueba (0 = sin límite de tiempo)'
    },
    {
      'Parametro': 'Intentos_Maximos',
      'Valor': 2,
      'Descripcion_Ayuda': 'Número de intentos permitidos por participante (0 = intentos ilimitados)'
    },
    {
      'Parametro': 'Mezclar_Preguntas',
      'Valor': 'NO',
      'Descripcion_Ayuda': 'SI o NO. Si es SI, el orden de las preguntas será aleatorio para cada persona'
    },
    {
      'Parametro': 'Mezclar_Opciones',
      'Valor': 'SI',
      'Descripcion_Ayuda': 'SI o NO. Si es SI, el orden de las opciones de respuesta se desordenará'
    },
    {
      'Parametro': 'Mensaje_Agradecimiento',
      'Valor': '¡Felicitaciones! Has completado la evaluación operativa KFC exitosamente.',
      'Descripcion_Ayuda': 'Mensaje final que verá el colaborador al enviar sus respuestas'
    }
  ];

  const wsConfig = XLSX.utils.json_to_sheet(configData);
  wsConfig['!cols'] = [{ wch: 26 }, { wch: 55 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configuracion');

  // ── HOJA 2: PREGUNTAS ──────────────────────────────────────────────────────
  const sampleQuestions = [
    {
      'Nro': 1,
      'Pregunta': '¿Cuál es el tiempo mínimo establecido para el lavado de manos según el estándar de inocuidad KFC?',
      'Tipo': 'OPCION UNICA',
      'Puntos': 10,
      'Obligatoria': 'SI',
      'Opcion_A': '20 segundos frotando palmas, dorso, entre dedos y antebrazos con jabón antibacterial',
      'Opcion_B': '5 segundos solo con agua tibia',
      'Opcion_C': '1 minuto utilizando únicamente alcohol en gel',
      'Opcion_D': 'Solo es necesario al ingresar al turno por la mañana',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': 'A',
      'Retroalimentacion': 'El estándar Yum! exige mínimo 20 segundos de fricción con jabón antibacterial para eliminar bacterias.'
    },
    {
      'Nro': 2,
      'Pregunta': '¿Cuáles de los siguientes elementos forman parte del uniforme obligatorio para ingresar a cocina?',
      'Tipo': 'OPCION MULTIPLE',
      'Puntos': 15,
      'Obligatoria': 'SI',
      'Opcion_A': 'Malla o cofia para el cabello que cubra la totalidad del pelo',
      'Opcion_B': 'Zapatos antideslizantes cerrados de seguridad',
      'Opcion_C': 'Anillos, pulseras y reloj de pulsera',
      'Opcion_D': 'Delantal limpio y carné de manipulación de alimentos vigente',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': 'A, B, D',
      'Retroalimentacion': 'La cofia, el calzado antideslizante y el delantal son obligatorios. Las joyas y accesorios están prohibidos en cocina.'
    },
    {
      'Nro': 3,
      'Pregunta': '¿Está permitido descongelar pollo crudo a temperatura ambiente sobre una mesa de trabajo?',
      'Tipo': 'SI/NO',
      'Puntos': 10,
      'Obligatoria': 'SI',
      'Opcion_A': 'Sí',
      'Opcion_B': 'No',
      'Opcion_C': '',
      'Opcion_D': '',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': 'No',
      'Retroalimentacion': 'El pollo debe descongelarse siempre bajo cadena de frío controlada (refrigeración) para prevenir proliferación microbiana.'
    },
    {
      'Nro': 4,
      'Pregunta': 'Ordene cronológicamente los pasos para el empanizado de receta original KFC',
      'Tipo': 'ORDENAR SECUENCIA',
      'Puntos': 15,
      'Obligatoria': 'SI',
      'Opcion_A': '1. Verificar temperatura interna del pollo crudo (menor a 4°C)',
      'Opcion_B': '2. Sumergir el pollo en salmuera por el tiempo reglamentario',
      'Opcion_C': '3. Aplicar la técnica 7-10-7 en harina de receta original',
      'Opcion_D': '4. Colocar las piezas en la canastilla de freidora sin superponerlas',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': 'A, B, C, D',
      'Retroalimentacion': 'La técnica 7-10-7 y la verificación térmica previa garantizan la textura crocante y cocción segura del producto.'
    },
    {
      'Nro': 5,
      'Pregunta': 'Selecciona tu tienda / CECO KFC de trabajo habitual',
      'Tipo': 'TIENDA KFC',
      'Puntos': 0,
      'Obligatoria': 'SI',
      'Opcion_A': '',
      'Opcion_B': '',
      'Opcion_C': '',
      'Opcion_D': '',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': '',
      'Retroalimentacion': 'Campo informativo para segmentación y reportes de desempeño por restaurante.'
    },
    {
      'Nro': 6,
      'Pregunta': '¿Cómo califica el estado de calibración y limpieza de las freidoras en su restaurante?',
      'Tipo': 'CALIFICACION',
      'Puntos': 0,
      'Obligatoria': 'SI',
      'Opcion_A': '1 - Deficiente',
      'Opcion_B': '5 - Excelente',
      'Opcion_C': '',
      'Opcion_D': '',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': '',
      'Retroalimentacion': 'Escala de 1 a 5 estrellas.'
    },
    {
      'Nro': 7,
      'Pregunta': 'Indique su número de documento de identidad (Cédula / Carné)',
      'Tipo': 'TEXTO CORTO',
      'Puntos': 0,
      'Obligatoria': 'NO',
      'Opcion_A': '',
      'Opcion_B': '',
      'Opcion_C': '',
      'Opcion_D': '',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': '',
      'Retroalimentacion': ''
    },
    {
      'Nro': 8,
      'Pregunta': '¿Qué oportunidades de mejora o sugerencias tiene para optimizar los tiempos de despacho?',
      'Tipo': 'TEXTO LARGO',
      'Puntos': 0,
      'Obligatoria': 'NO',
      'Opcion_A': '',
      'Opcion_B': '',
      'Opcion_C': '',
      'Opcion_D': '',
      'Opcion_E': '',
      'Opcion_F': '',
      'Respuesta_Correcta': '',
      'Retroalimentacion': ''
    }
  ];

  const wsQuestions = XLSX.utils.json_to_sheet(sampleQuestions);
  wsQuestions['!cols'] = [
    { wch: 6 },  // Nro
    { wch: 50 }, // Pregunta
    { wch: 20 }, // Tipo
    { wch: 8 },  // Puntos
    { wch: 12 }, // Obligatoria
    { wch: 38 }, // Opcion_A
    { wch: 38 }, // Opcion_B
    { wch: 38 }, // Opcion_C
    { wch: 38 }, // Opcion_D
    { wch: 28 }, // Opcion_E
    { wch: 28 }, // Opcion_F
    { wch: 20 }, // Respuesta_Correcta
    { wch: 45 }, // Retroalimentacion
  ];
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Preguntas');

  // ── HOJA 3: INSTRUCCIONES ──────────────────────────────────────────────────
  const instructionsData = [
    {
      'Guía': '1. Estructura del Archivo',
      'Detalle': 'El archivo contiene dos hojas principales: "Configuracion" (metadatos del examen/encuesta) y "Preguntas" (banco de preguntas y respuestas).'
    },
    {
      'Guía': '2. Tipos de Pregunta Soportados',
      'Detalle': 'OPCION UNICA (selección simple), OPCION MULTIPLE (varias respuestas correctas), SI/NO (verdadero/falso), ORDENAR SECUENCIA (pasos a ordenar), TIENDA KFC (selector de restaurante), CALIFICACION (escala 1 a 5 estrellas), TEXTO CORTO, TEXTO LARGO, FECHA.'
    },
    {
      'Guía': '3. Respuestas Correctas',
      'Detalle': 'Para OPCION UNICA escribe la letra correcta (ej: A). Para OPCION MULTIPLE escribe las letras separadas por coma (ej: A, C o A, B, D). Para SI/NO escribe "Sí" o "No" (o A / B). Para ORDENAR SECUENCIA escribe la secuencia esperada (ej: A, B, C, D).'
    },
    {
      'Guía': '4. Puntuación (Evaluaciones / Quizzes)',
      'Detalle': 'En evaluaciones tipo quiz, cada respuesta acertada otorgará los puntos configurados en la columna "Puntos". Las preguntas de tipo texto, tienda o calificación pueden tener 0 puntos.'
    },
    {
      'Guía': '5. Guardado e Importación',
      'Detalle': 'Guarda este archivo en formato .xlsx y cárgalo en el módulo RED Pulse. Podrás previsualizarlo y decidir si abrirlo en el editor para revisarlo o guardarlo directamente.'
    }
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 28 }, { wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  XLSX.writeFile(wb, 'Plantilla_Evaluacion_RED_Pulse.xlsx');
};

/**
 * Normaliza nombres de parámetros y columnas eliminando acentos, caracteres especiales y espacios.
 */
const cleanKey = (str: string): string => {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Mapea una cadena de tipo a un QuestionType válido de RED Pulse.
 */
const normalizeQuestionType = (rawType: string): QuestionType => {
  const t = cleanKey(rawType);
  if (t.includes('multiple')) return 'multiple_choice';
  if (t.includes('unica') || t.includes('single') || t.includes('seleccionunica') || t.includes('opcionunica')) return 'single_choice';
  if (t.includes('sino') || t.includes('yesno') || t.includes('verdadero') || t.includes('falso') || t.includes('dicotomica')) return 'yes_no';
  if (t.includes('orden') || t.includes('secuencia') || t.includes('ordering')) return 'ordering';
  if (t.includes('calific') || t.includes('rating') || t.includes('estrella') || t.includes('escala')) return 'rating';
  if (t.includes('tienda') || t.includes('ceco') || t.includes('sucursal') || t.includes('jerarquia') || t.includes('store')) return 'store_hierarchy';
  if (t.includes('largo') || t.includes('parrafo') || t.includes('comentario') || t.includes('long')) return 'long_text';
  if (t.includes('corto') || t.includes('texto') || t.includes('short')) return 'short_text';
  if (t.includes('fecha') || t.includes('date')) return 'date';
  return 'single_choice';
};

/**
 * Lee y procesa un archivo Excel (.xlsx/.xls) para construir una evaluación o encuesta de RED Pulse.
 */
export const parsePulseExcel = async (
  file: File,
  defaultOwner?: { id: string; username: string }
): Promise<PulseExcelImportResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene ninguna hoja válida.');
  }

  // 1. Identificar hojas de Configuración y Preguntas
  let configSheetName = workbook.SheetNames.find(name => {
    const n = cleanKey(name);
    return n.includes('config') || n.includes('ajuste') || n.includes('general') || n.includes('param');
  });

  let questionsSheetName = workbook.SheetNames.find(name => {
    const n = cleanKey(name);
    return n.includes('pregunta') || n.includes('question') || n.includes('evalua') || n.includes('encuesta') || n.includes('survey');
  });

  // Si no se encontraron por nombre:
  if (!questionsSheetName) {
    if (workbook.SheetNames.length === 1) {
      questionsSheetName = workbook.SheetNames[0];
    } else {
      // Buscar la primera hoja que contenga columnas de preguntas
      for (const name of workbook.SheetNames) {
        if (name === configSheetName) continue;
        const sheet = workbook.Sheets[name];
        const headers = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] || [];
        const hasQuestionHeader = headers.some(h => {
          const ch = cleanKey(String(h));
          return ch.includes('pregunta') || ch.includes('question') || ch.includes('enunciado');
        });
        if (hasQuestionHeader) {
          questionsSheetName = name;
          break;
        }
      }
    }
  }

  // Si aún no hay questionsSheetName, tomar la primera hoja que no sea configSheet
  if (!questionsSheetName) {
    questionsSheetName = workbook.SheetNames.find(n => n !== configSheetName) || workbook.SheetNames[0];
  }

  // 2. Extraer Metadatos (Configuración)
  const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
  let title = baseTitle || 'Nueva Evaluación KFC';
  let type: 'quiz' | 'survey' = 'quiz';
  let category = 'Operaciones';
  let description = '';
  let passing_score_percent = 70;
  let time_limit_seconds = 0;
  let max_attempts = 0;
  let shuffle_questions = false;
  let shuffle_options = false;
  let thank_you_message = 'Tus respuestas han sido registradas exitosamente.';

  if (configSheetName && workbook.Sheets[configSheetName]) {
    const rawConfigRows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[configSheetName], { header: 1 });
    
    rawConfigRows.forEach(row => {
      if (!Array.isArray(row) || row.length < 2) return;
      const param = cleanKey(String(row[0] || ''));
      const val = row[1];
      if (val === undefined || val === null || val === '') return;

      if (param.includes('titulo') || param.includes('nombre') || param.includes('title')) {
        title = String(val).trim();
      } else if (param.includes('tipo') || param.includes('type')) {
        const valStr = cleanKey(String(val));
        type = valStr.includes('survey') || valStr.includes('encuesta') ? 'survey' : 'quiz';
      } else if (param.includes('categoria') || param.includes('category')) {
        category = String(val).trim();
      } else if (param.includes('descripcion') || param.includes('description')) {
        description = String(val).trim();
      } else if (param.includes('puntaje') || param.includes('passing') || param.includes('notaminima')) {
        const num = parseInt(String(val), 10);
        if (!isNaN(num) && num >= 0 && num <= 100) passing_score_percent = num;
      } else if (param.includes('tiempo') || param.includes('duracion') || param.includes('timelimit')) {
        const num = parseInt(String(val), 10);
        if (!isNaN(num) && num >= 0) time_limit_seconds = num * 60; // minutos a segundos
      } else if (param.includes('intentos') || param.includes('maxattempts') || param.includes('attempts')) {
        const num = parseInt(String(val), 10);
        if (!isNaN(num) && num >= 0) max_attempts = num;
      } else if (param.includes('mezclarpreguntas') || param.includes('shufflequestions')) {
        shuffle_questions = /^(si|sí|yes|1|true)$/i.test(String(val).trim());
      } else if (param.includes('mezclaropciones') || param.includes('shuffleoptions')) {
        shuffle_options = /^(si|sí|yes|1|true)$/i.test(String(val).trim());
      } else if (param.includes('agradecimiento') || param.includes('thankyou') || param.includes('mensajefinal')) {
        thank_you_message = String(val).trim();
      }
    });
  }

  // 3. Extraer Preguntas
  const questionsSheet = workbook.Sheets[questionsSheetName];
  if (!questionsSheet) {
    throw new Error(`No se pudo leer la hoja de preguntas: "${questionsSheetName}".`);
  }

  const rawQuestions = XLSX.utils.sheet_to_json<Record<string, any>>(questionsSheet, { defval: '' });
  if (rawQuestions.length === 0) {
    throw new Error('La hoja de preguntas no contiene filas con datos.');
  }

  const warnings: string[] = [];
  const questions: Question[] = [];
  let totalQuizPoints = 0;

  const surveyId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  rawQuestions.forEach((row, rowIndex) => {
    // Normalizar mapa de claves para esta fila
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedRow[cleanKey(k)] = row[k];
    });

    // Encontrar texto de la pregunta
    const titleKey = Object.keys(normalizedRow).find(k =>
      k.includes('pregunta') || k.includes('enunciado') || k.includes('question') || k.includes('texto')
    );
    const questionTitle = titleKey ? String(normalizedRow[titleKey]).trim() : '';

    if (!questionTitle) {
      // Fila vacía o sin texto de pregunta, ignorar
      return;
    }

    // Tipo de pregunta
    const typeKey = Object.keys(normalizedRow).find(k => k.includes('tipo') || k.includes('type'));
    const rawType = typeKey ? String(normalizedRow[typeKey]).trim() : '';
    const questionType = normalizeQuestionType(rawType);

    // Puntos
    const pointsKey = Object.keys(normalizedRow).find(k =>
      k.includes('punto') || k.includes('puntaje') || k.includes('point') || k.includes('score') || k.includes('valor')
    );
    let points: number | undefined = undefined;
    if (type === 'quiz') {
      const parsedPoints = pointsKey ? parseInt(String(normalizedRow[pointsKey]), 10) : NaN;
      points = !isNaN(parsedPoints) ? parsedPoints : 10;
      totalQuizPoints += points;
    }

    // Obligatoria
    const requiredKey = Object.keys(normalizedRow).find(k =>
      k.includes('obligatoria') || k.includes('requerida') || k.includes('required') || k.includes('obligatorio')
    );
    let required = true;
    if (requiredKey) {
      const reqVal = String(normalizedRow[requiredKey]).trim();
      if (/^(no|false|0)$/i.test(reqVal)) required = false;
    }

    // Retroalimentación / Feedback
    const feedbackKey = Object.keys(normalizedRow).find(k =>
      k.includes('retroalimentacion') || k.includes('feedback') || k.includes('explicacion') || k.includes('ayuda')
    );
    const feedback = feedbackKey ? String(normalizedRow[feedbackKey]).trim() : undefined;

    // Respuesta Correcta
    const correctKey = Object.keys(normalizedRow).find(k =>
      k.includes('respuestacorrecta') || k.includes('correcta') || k.includes('correct') || k.includes('solucion') || k.includes('answer')
    );
    const rawCorrect = correctKey ? String(normalizedRow[correctKey]).trim() : '';

    // Extraer opciones
    const questionId = `q_${Date.now()}_${rowIndex + 1}_${Math.random().toString(36).substring(2, 6)}`;
    let options: QuestionOption[] | undefined = undefined;

    const needsOptions = ['single_choice', 'multiple_choice', 'ordering', 'yes_no'].includes(questionType);

    if (needsOptions) {
      if (questionType === 'yes_no') {
        // Sí / No estándar
        const isYesCorrect = /^(si|sí|yes|verdadero|v|true|1|a)$/i.test(rawCorrect);
        const isNoCorrect = /^(no|falso|f|false|0|b)$/i.test(rawCorrect);

        options = [
          {
            id: `opt_${Date.now()}_yes_${rowIndex}`,
            question_id: questionId,
            text: 'Sí',
            value: 'Sí',
            is_correct: type === 'quiz' ? isYesCorrect : undefined
          },
          {
            id: `opt_${Date.now()}_no_${rowIndex}`,
            question_id: questionId,
            text: 'No',
            value: 'No',
            is_correct: type === 'quiz' ? isNoCorrect : undefined
          }
        ];

        if (type === 'quiz' && !isYesCorrect && !isNoCorrect) {
          warnings.push(`Pregunta #${rowIndex + 1} ("${questionTitle.substring(0, 35)}..."): No tiene respuesta correcta definida (Sí / No).`);
        }
      } else {
        // Opción Única, Opción Múltiple o Secuencia
        // 1. Buscar columnas individuales: Opcion A, B, C, D, E, F...
        const rawOptionEntries: { letter: string; text: string }[] = [];

        // Buscar por letras A a H
        const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        letters.forEach((letra, idx) => {
          const matchKey = Object.keys(normalizedRow).find(k =>
            k === `opcion${letra}` || k === `opcion_${letra}` || k === letra || k === `opcion${idx + 1}`
          );
          if (matchKey && String(normalizedRow[matchKey]).trim()) {
            rawOptionEntries.push({
              letter: letra.toUpperCase(),
              text: String(normalizedRow[matchKey]).trim()
            });
          }
        });

        // Si no encontró por columnas dedicadas, revisar si hay una columna "Opciones" delimitada por comas, punto y coma o saltos de línea
        if (rawOptionEntries.length === 0) {
          const generalOptionsKey = Object.keys(normalizedRow).find(k => k.includes('opciones') || k.includes('options'));
          if (generalOptionsKey && String(normalizedRow[generalOptionsKey]).trim()) {
            const splitted = String(normalizedRow[generalOptionsKey])
              .split(/[;\n\r|]/)
              .map(s => s.trim())
              .filter(Boolean);

            splitted.forEach((optText, sIdx) => {
              rawOptionEntries.push({
                letter: String.fromCharCode(65 + sIdx),
                text: optText
              });
            });
          }
        }

        // Si se encontraron opciones
        if (rawOptionEntries.length > 0) {
          // Tokenizar respuesta correcta
          const correctTokens = rawCorrect
            .split(/[,;\/|]|\s+y\s+|\s+and\s+/i)
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);

          const rawCorrectLower = rawCorrect.toLowerCase();

          options = rawOptionEntries.map((optEntry, oIdx) => {
            const optLetter = optEntry.letter;
            const optNumber = String(oIdx + 1);
            const optTextLower = optEntry.text.toLowerCase();

            let isCorrect = false;
            if (type === 'quiz') {
              if (correctTokens.includes(optLetter)) {
                isCorrect = true;
              } else if (correctTokens.includes(optNumber)) {
                isCorrect = true;
              } else if (rawCorrectLower === optTextLower) {
                isCorrect = true;
              } else if (correctTokens.some(tok => tok.length > 3 && optTextLower.includes(tok.toLowerCase()))) {
                isCorrect = true;
              }
            }

            return {
              id: `opt_${Date.now()}_${rowIndex}_${oIdx}_${Math.random().toString(36).substr(2, 4)}`,
              question_id: questionId,
              text: optEntry.text,
              value: `opt_${oIdx + 1}_${Date.now()}`,
              is_correct: type === 'quiz' ? isCorrect : undefined
            };
          });

          // Para single_choice, garantizar que solo una opción esté marcada como correcta
          if (questionType === 'single_choice' && type === 'quiz') {
            const correctCount = options.filter(o => o.is_correct).length;
            if (correctCount > 1) {
              let keptFirst = false;
              options.forEach(o => {
                if (o.is_correct) {
                  if (!keptFirst) keptFirst = true;
                  else o.is_correct = false;
                }
              });
            } else if (correctCount === 0) {
              warnings.push(`Pregunta #${rowIndex + 1} ("${questionTitle.substring(0, 35)}..."): Es de opción única pero no tiene respuesta correcta marcada.`);
            }
          }

          if (questionType === 'multiple_choice' && type === 'quiz') {
            const correctCount = options.filter(o => o.is_correct).length;
            if (correctCount === 0) {
              warnings.push(`Pregunta #${rowIndex + 1} ("${questionTitle.substring(0, 35)}..."): Es de opción múltiple pero no tiene respuestas correctas marcadas.`);
            }
          }
        } else {
          warnings.push(`Pregunta #${rowIndex + 1} ("${questionTitle.substring(0, 35)}..."): No tiene opciones de respuesta especificadas.`);
        }
      }
    }

    const questionObj: Question = {
      id: questionId,
      survey_id: surveyId,
      type: questionType,
      title: questionTitle,
      order: questions.length + 1,
      required,
      points,
      options,
      correct_feedback: feedback,
      rating_min: questionType === 'rating' ? 1 : undefined,
      rating_max: questionType === 'rating' ? 5 : undefined,
      rating_min_label: questionType === 'rating' ? 'Deficiente (1)' : undefined,
      rating_max_label: questionType === 'rating' ? 'Excelente (5)' : undefined,
    };

    questions.push(questionObj);
  });

  if (questions.length === 0) {
    throw new Error('No se detectaron preguntas válidas en el archivo Excel.');
  }

  // Construir objeto Survey completo
  const theme: ThemeConfig = {
    theme_style: 'base',
    primary_color: '#E4002B',
    background_color: '#F8FAFC',
    card_style: 'standard',
    font_family: 'jakarta',
  };

  const thank_you: ThankYouConfig = {
    title: '¡Muchas gracias por participar!',
    message: thank_you_message,
    show_button: false,
    show_score: type === 'quiz',
  };

  const survey: Survey = {
    id: surveyId,
    owner_id: defaultOwner?.id || 'admin',
    owner_name: defaultOwner?.username || 'Administrador',
    type,
    category,
    title,
    description,
    status: 'draft',
    access_mode: 'open',
    passing_score_percent,
    scoring_type: 'simple',
    time_limit_seconds,
    max_attempts,
    shuffle_questions,
    shuffle_options,
    theme,
    thank_you,
    questions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    survey,
    warnings,
    totalQuestions: questions.length,
    validQuestions: questions.length,
    quizPointsTotal: totalQuizPoints,
  };
};
