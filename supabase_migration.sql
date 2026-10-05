-- ==============================================================================
-- R.E.D (Ruta de Entrenamiento y Desarrollo) - KFC Colombia
-- MIGRATION SQL / SCHEMA COMPLETO DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Incluye: Tablas, Extensiones, Índices, Vistas, Funciones RPC, RLS y Políticas
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLAS MAESTRAS DEL SISTEMA
-- ==============================================================================

-- 2.1 RESTAURANTES (TIENDAS / CECOS)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,                       -- CECO (e.g. 'K034', 'K038')
    name TEXT NOT NULL,                        -- Nombre de tienda (e.g. 'PALMETO')
    zone TEXT NOT NULL,                        -- Zona (e.g. 'CALI 1')
    region TEXT NOT NULL,                      -- Región (e.g. 'VALLE')
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 USUARIOS Y PERFILES (Vinculado a Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,                       -- UUID o ID de usuario
    username TEXT UNIQUE NOT NULL,             -- Usuario (e.g. 'admin', 'coordinador_valle')
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'COORDINATOR', 'SPECIALIST', 'LIDER', 'GUEST')),
    "assignedZones" TEXT[] DEFAULT '{}'::TEXT[],
    "assignedRestaurants" TEXT[] DEFAULT '{}'::TEXT[],
    "assignedRegions" TEXT[] DEFAULT '{}'::TEXT[],
    "allowedModules" TEXT[] DEFAULT '{}'::TEXT[],
    "guestCanEdit" BOOLEAN DEFAULT false,
    cedula TEXT,
    "pendingDays" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 COLABORADORES / CENSO DE EMPLEADOS
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,                       -- Cédula / Documento único
    name TEXT NOT NULL,                        -- Nombre completo
    join_date TEXT NOT NULL,                   -- Fecha ingreso (YYYY-MM-DD)
    exit_date TEXT,                            -- Fecha retiro si aplica (YYYY-MM-DD)
    title TEXT NOT NULL,                       -- Cargo (Gerente, Subgerente, etc.)
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    zone TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    suspended_since TEXT,                      -- YYYY-MM-DD de suspensión si aplica
    history JSONB DEFAULT '[]'::JSONB,         -- Historial de traslados/ingresos/retiros
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 CALIFICACIONES / NOTAS POR CATEGORÍA Y CURVAS
CREATE TABLE IF NOT EXISTS public.grades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    month DATE NOT NULL,                       -- Fecha primer día de mes (e.g. '2026-09-01')
    "group" TEXT NOT NULL,                     -- Grupo ('AK', 'A', 'B', 'C', 'D', 'E', 'F')
    category TEXT NOT NULL,                    -- Nombre del tema evaluado
    score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_grades_emp_month_cat UNIQUE (employee_id, month, "group", category)
);

-- 2.5 JERARQUÍA Y MESES ASENTADOS (Singleton id=1)
CREATE TABLE IF NOT EXISTS public.hierarchy (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data JSONB NOT NULL DEFAULT '{"lockedMonths": [], "regions": []}'::JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 BANCA DE LIDERAZGO (Singleton id=1)
CREATE TABLE IF NOT EXISTS public.banca (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data JSONB NOT NULL DEFAULT '{"assignments": []}'::JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 PERSONAL EXTERNO DE BANCA (Operaciones)
CREATE TABLE IF NOT EXISTS public.banca_external_personnel (
    id TEXT PRIMARY KEY,                       -- Documento / Identificador
    first_name TEXT,
    last_name TEXT,
    name TEXT NOT NULL,                        -- Nombre completo generado
    document_id TEXT,
    role_tag TEXT DEFAULT 'Operaciones',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. MÓDULO SAFE HANDS (MANIPULACIÓN DE ALIMENTOS)
-- ==============================================================================

-- 3.1 PERSONAL SAFE HANDS
CREATE TABLE IF NOT EXISTS public.safe_hands_personnel (
    id TEXT PRIMARY KEY,                       -- Cédula
    name TEXT NOT NULL,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    last_issue_date TEXT,
    category TEXT,                             -- Categoría para personal huérfano
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.2 CERTIFICACIONES SAFE HANDS
CREATE TABLE IF NOT EXISTS public.safe_hands_certs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL UNIQUE REFERENCES public.safe_hands_personnel(id) ON DELETE CASCADE,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    issue_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    certificate_code TEXT NOT NULL UNIQUE,     -- Código para validación pública /verify
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.3 CONFIGURACIÓN DE FIRMA Y RESPONSABLE SAFE HANDS (Singleton id=1)
CREATE TABLE IF NOT EXISTS public.safe_hands_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    signature_base64 TEXT,
    responsible_name TEXT DEFAULT 'RESPONSABLE CALIDAD',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.4 CATEGORÍAS DE PERSONAL HUÉRFANO SAFE HANDS
CREATE TABLE IF NOT EXISTS public.safe_hands_orphan_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'emerald',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. MÓDULO DE HORARIOS Y SOLICITUDES DE ESPECIALISTAS
-- ==============================================================================

-- 4.1 MALLA DE TURNOS DIARIOS
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    shift_type TEXT NOT NULL,                 -- 'Laboral', 'Capacitación', 'Descanso', 'Incapacidad'
    check_in TEXT,                            -- 'HH:MM'
    check_out TEXT,                           -- 'HH:MM'
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    activity TEXT,
    custom_message TEXT,
    no_restaurant BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_schedules_emp_date UNIQUE (employee_id, date)
);

-- 4.2 SOLICITUDES DE TURNOS / DESCANSO
CREATE TABLE IF NOT EXISTS public.schedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    request_type TEXT NOT NULL,               -- 'Descanso', 'Horario Específico', 'Permiso Especial'
    requested_shift_id INTEGER,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'PROCESADO')),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_schedule_requests_emp_date UNIQUE (employee_id, date)
);

-- ==============================================================================
-- 5. MÓDULO RED PULSE (ENCUESTAS, EVALUACIONES Y QUIZZES)
-- ==============================================================================

-- 5.1 CATEGORÍAS DE PULSE
CREATE TABLE IF NOT EXISTS public.pulse_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.2 ENCUESTAS Y QUIZZES
CREATE TABLE IF NOT EXISTS public.surveys (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    owner_name TEXT,
    type TEXT NOT NULL DEFAULT 'survey' CHECK (type IN ('survey', 'quiz')),
    category TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    theme JSONB DEFAULT '{}'::JSONB,
    thank_you JSONB DEFAULT '{}'::JSONB,
    access_mode TEXT NOT NULL DEFAULT 'open' CHECK (access_mode IN ('open', 'password', 'invitation')),
    access_password TEXT,
    hidden_fields JSONB DEFAULT '[]'::JSONB,
    scoring_type TEXT DEFAULT 'simple',
    passing_score_percent NUMERIC DEFAULT 70,
    show_results_immediately BOOLEAN DEFAULT false,
    show_results_in_reports BOOLEAN DEFAULT false,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    max_attempts INTEGER DEFAULT 0,
    time_limit_seconds INTEGER DEFAULT 0,
    questions JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5.3 RESPUESTAS Y RESULTADOS DE ENCUESTAS
CREATE TABLE IF NOT EXISTS public.responses (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    token TEXT,
    respondent_id TEXT,
    respondent_email TEXT,
    respondent_ref TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('partial', 'completed')),
    last_question_id TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    duration_seconds INTEGER,
    score_percent NUMERIC,
    passed BOOLEAN,
    total_points NUMERIC,
    earned_points NUMERIC,
    segments JSONB DEFAULT '{}'::JSONB,
    answers JSONB DEFAULT '[]'::JSONB
);

-- ==============================================================================
-- 6. ACCESOS DIRECTOS (QUICK SHORTCUTS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quick_shortcuts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'Globe',
    description TEXT,
    target TEXT DEFAULT '_blank',
    roles TEXT[],
    "order" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 7. TABLA DE RESÚMENES AGREGADOS PARA EL DASHBOARD
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.monthly_group_stats (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    month TEXT NOT NULL,                       -- Formato 'YYYY-MM'
    group_id TEXT NOT NULL,                    -- 'AK', 'A', 'B', 'C', 'D', 'E', 'F'
    employee_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    avg_score NUMERIC(5,2) DEFAULT 0,
    approval_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_monthly_group_stats UNIQUE (store_id, month, group_id)
);

-- ==============================================================================
-- 8. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE CONSULTAS)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_restaurant ON public.employees(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_suspended ON public.employees(suspended_since);

CREATE INDEX IF NOT EXISTS idx_grades_month ON public.grades(month);
CREATE INDEX IF NOT EXISTS idx_grades_rest_month ON public.grades(restaurant_id, month);
CREATE INDEX IF NOT EXISTS idx_grades_emp_month ON public.grades(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_grades_group ON public.grades("group");

CREATE INDEX IF NOT EXISTS idx_safe_hands_personnel_rest ON public.safe_hands_personnel(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_safe_hands_certs_code ON public.safe_hands_certs(certificate_code);
CREATE INDEX IF NOT EXISTS idx_safe_hands_certs_expiry ON public.safe_hands_certs(expiry_date);

CREATE INDEX IF NOT EXISTS idx_schedules_emp_date ON public.schedules(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON public.schedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_mgs_month_store ON public.monthly_group_stats(month, store_id);

-- ==============================================================================
-- 9. VISTAS SQL
-- ==============================================================================

-- Vista de resumen mensual por empleado (usada para cálculo de efectivas e históricos)
CREATE OR REPLACE VIEW public.employee_monthly_summary AS
SELECT 
    g.employee_id,
    g.restaurant_id,
    g.month,
    to_char(g.month, 'YYYY-MM') as month_str,
    COUNT(DISTINCT g.category) as evaluated_categories,
    ROUND(AVG(g.score), 2) as avg_score,
    BOOL_AND(g.score >= 80) as all_passed
FROM public.grades g
GROUP BY g.employee_id, g.restaurant_id, g.month;

-- ==============================================================================
-- 10. FUNCIONES RPC (PROCEDIMIENTOS ALMACENADOS)
-- ==============================================================================

-- 10.1 get_dashboard_stats: Retorna estadísticas agregadas por grupo
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_month TEXT,
    p_store_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    group_id TEXT,
    employee_count NUMERIC,
    approved_count NUMERIC,
    avg_score NUMERIC,
    approval_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mgs.group_id,
        COALESCE(SUM(mgs.employee_count), 0)::NUMERIC as employee_count,
        COALESCE(SUM(mgs.approved_count), 0)::NUMERIC as approved_count,
        COALESCE(ROUND(AVG(mgs.avg_score), 0), 0)::NUMERIC as avg_score,
        CASE 
            WHEN SUM(mgs.employee_count) > 0 
            THEN ROUND((SUM(mgs.approved_count)::NUMERIC / SUM(mgs.employee_count)::NUMERIC) * 100, 0)
            ELSE 0
        END::NUMERIC as approval_rate
    FROM public.monthly_group_stats mgs
    WHERE mgs.month = p_month
      AND (p_store_ids IS NULL OR mgs.store_id = ANY(p_store_ids))
    GROUP BY mgs.group_id;
END;
$$;

-- 10.2 settle_monthly_group_stats: Calcula y asienta notas mensuales
CREATE OR REPLACE FUNCTION public.settle_monthly_group_stats(p_month TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    month_start DATE := (p_month || '-01')::DATE;
BEGIN
    INSERT INTO public.monthly_group_stats (
        store_id, 
        month, 
        group_id, 
        employee_count, 
        approved_count, 
        avg_score, 
        approval_rate
    )
    SELECT 
        g.restaurant_id as store_id,
        p_month as month,
        g."group" as group_id,
        COUNT(DISTINCT g.employee_id) as employee_count,
        COUNT(DISTINCT CASE WHEN g.score >= 80 THEN g.employee_id END) as approved_count,
        ROUND(AVG(g.score), 2) as avg_score,
        CASE 
            WHEN COUNT(DISTINCT g.employee_id) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN g.score >= 80 THEN g.employee_id END)::NUMERIC / COUNT(DISTINCT g.employee_id)::NUMERIC) * 100, 2)
            ELSE 0 
        END as approval_rate
    FROM public.grades g
    WHERE g.month = month_start
    GROUP BY g.restaurant_id, g."group"
    ON CONFLICT (store_id, month, group_id) 
    DO UPDATE SET 
        employee_count = EXCLUDED.employee_count,
        approved_count = EXCLUDED.approved_count,
        avg_score = EXCLUDED.avg_score,
        approval_rate = EXCLUDED.approval_rate,
        created_at = now();
END;
$$;

-- 10.3 backfill_monthly_group_stats: Recalcula todo el histórico
CREATE OR REPLACE FUNCTION public.backfill_monthly_group_stats()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    m_record RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR m_record IN 
        SELECT DISTINCT to_char(month, 'YYYY-MM') as month_str 
        FROM public.grades 
        ORDER BY month_str
    LOOP
        PERFORM public.settle_monthly_group_stats(m_record.month_str);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN 'Backfill completado exitosamente para ' || v_count || ' periodos.';
END;
$$;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) Y POLÍTICAS DE ACCESO
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banca_external_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_hands_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_hands_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_hands_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_hands_orphan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_group_stats ENABLE ROW LEVEL SECURITY;

-- 11.1 Políticas para Usuarios Autenticados (Acceso completo para la aplicación)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Allow authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- 11.2 Políticas Públicas / Anónimas (Lectura de validación de carnets y runner de encuestas)
-- Permitir lectura anónima para verificar certificados de manipulación de alimentos (/verify)
DROP POLICY IF EXISTS "Allow anon read for safe_hands_certs" ON public.safe_hands_certs;
CREATE POLICY "Allow anon read for safe_hands_certs" ON public.safe_hands_certs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read for safe_hands_personnel" ON public.safe_hands_personnel;
CREATE POLICY "Allow anon read for safe_hands_personnel" ON public.safe_hands_personnel FOR SELECT TO anon USING (true);

-- Permitir lectura y respuesta anónima para encuestas públicas (RED Pulse)
DROP POLICY IF EXISTS "Allow anon read for published surveys" ON public.surveys;
CREATE POLICY "Allow anon read for published surveys" ON public.surveys FOR SELECT TO anon USING (status = 'published');

DROP POLICY IF EXISTS "Allow anon insert for survey responses" ON public.responses;
CREATE POLICY "Allow anon insert for survey responses" ON public.responses FOR INSERT TO anon WITH CHECK (true);

-- Permitir lectura de accesos directos
DROP POLICY IF EXISTS "Allow anon read for quick_shortcuts" ON public.quick_shortcuts;
CREATE POLICY "Allow anon read for quick_shortcuts" ON public.quick_shortcuts FOR SELECT TO anon USING ("isActive" = true);

-- Permitir login inicial (leer perfil para autenticación)
DROP POLICY IF EXISTS "Allow anon read for users login" ON public.users;
CREATE POLICY "Allow anon read for users login" ON public.users FOR SELECT TO anon USING (true);

-- ==============================================================================
-- 12. DATOS INICIALES SEMILLA (SEED DATA)
-- ==============================================================================

-- Configuración de jerarquía inicial (singleton id=1)
INSERT INTO public.hierarchy (id, data)
VALUES (1, '{"lockedMonths": [], "regions": []}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- Configuración de banca inicial (singleton id=1)
INSERT INTO public.banca (id, data)
VALUES (1, '{"assignments": []}'::JSONB)
ON CONFLICT (id) DO NOTHING;

-- Configuración de Safe Hands (singleton id=1)
INSERT INTO public.safe_hands_settings (id, responsible_name)
VALUES (1, 'RESPONSABLE CALIDAD')
ON CONFLICT (id) DO NOTHING;

-- Categorías por defecto de Safe Hands
INSERT INTO public.safe_hands_orphan_categories (id, name, color)
VALUES
    ('sena', 'Aprendiz SENA', 'emerald'),
    ('proveedor', 'Proveedor / Tercero', 'blue'),
    ('mantenimiento', 'Mantenimiento / Técnico', 'amber'),
    ('admin', 'Personal Administrativo', 'indigo'),
    ('temporal', 'Temporal / Relevo', 'violet'),
    ('ingreso', 'En Proceso de Ingreso', 'teal')
ON CONFLICT (id) DO NOTHING;

-- Categorías por defecto de RED Pulse
INSERT INTO public.pulse_categories (id, name)
VALUES
    ('entrenamientos', 'Entrenamientos'),
    ('seguridad-y-salud', 'Seguridad y Salud'),
    ('operaciones', 'Operaciones'),
    ('clima-laboral', 'Clima Laboral'),
    ('auditorias', 'Auditorías'),
    ('servicio-al-cliente', 'Servicio al Cliente')
ON CONFLICT (id) DO NOTHING;

-- Accesos directos por defecto
INSERT INTO public.quick_shortcuts (id, title, url, icon, description, target, "order", "isActive")
VALUES
    ('sc-kfc-portal', 'Portal Corporativo', 'https://kfc.co', 'Globe', 'Sitio oficial KFC Colombia', '_blank', 1, true),
    ('sc-learning', 'Campus Virtual', 'https://learningzone.yum.com', 'BookOpen', 'Plataforma de capacitación y cursos', '_blank', 2, true)
ON CONFLICT (id) DO NOTHING;
