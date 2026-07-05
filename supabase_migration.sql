-- ============================================================
-- RED KFC — Migración: monthly_group_stats + RPCs
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. TABLA DE ESTADÍSTICAS PRECALCULADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_group_stats (
  id              SERIAL PRIMARY KEY,
  restaurant_id   TEXT NOT NULL,
  month           DATE NOT NULL,
  group_id        TEXT NOT NULL,
  employee_count  INT  NOT NULL DEFAULT 0,
  avg_score       NUMERIC(5,2) NOT NULL DEFAULT 0,
  approved_count  INT  NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, month, group_id)
);

CREATE INDEX IF NOT EXISTS idx_mgs_month       ON monthly_group_stats(month);
CREATE INDEX IF NOT EXISTS idx_mgs_restaurant  ON monthly_group_stats(restaurant_id);


-- 2. FUNCIÓN: settle_monthly_group_stats(p_month TEXT)
-- Calcula y guarda stats por tienda+mes+grupo.
-- Es IDEMPOTENTE: borra y recalcula si ya existe el mes.
-- ============================================================
CREATE OR REPLACE FUNCTION settle_monthly_group_stats(p_month TEXT)
RETURNS INT AS $$
DECLARE
  p_month_date DATE := (p_month || '-01')::DATE;
  rows_inserted INT;
BEGIN
  -- Limpiar solo el mes específico (normalizando el mes)
  DELETE FROM monthly_group_stats WHERE month = p_month_date;

  INSERT INTO monthly_group_stats (restaurant_id, month, group_id, employee_count, avg_score, approved_count)
  WITH
  -- Categorías por grupo
  group_cats AS (
    SELECT * FROM (VALUES
      ('AK', 1), ('A', 3), ('B', 6), ('C', 1), ('D', 1), ('E', 5), ('F', 1)
    ) AS t(group_id, cat_count)
  ),
  -- Empleados que estaban contratados en el mes objetivo (Lógica Histórica)
  active_emps AS (
    SELECT
      e.id AS employee_id,
      TRIM(UPPER(e.restaurant_id)) AS restaurant_id,
      (
        (EXTRACT(YEAR  FROM p_month_date)::INT - EXTRACT(YEAR  FROM e.join_date::DATE)::INT) * 12 +
        (EXTRACT(MONTH FROM p_month_date)::INT - EXTRACT(MONTH FROM e.join_date::DATE)::INT)
      ) AS seniority_months
    FROM employees e
    WHERE 
      -- Si no tiene fecha de ingreso, asumimos que es antiguo y cuenta
      (e.join_date IS NULL OR e.join_date::DATE <= (p_month_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE)
      -- No se había ido antes de que empezara el mes
      AND (e.exit_date IS NULL OR e.exit_date::DATE >= p_month_date)
      AND e.restaurant_id IS NOT NULL
      AND e.restaurant_id NOT IN ('', 'SIN_CECO')
  ),
  -- Filtro All-Star (>3 meses)
  emp_groups AS (
    SELECT
      ae.employee_id,
      ae.restaurant_id,
      gc.group_id,
      gc.cat_count
    FROM active_emps ae
    CROSS JOIN group_cats gc
    WHERE NOT (gc.group_id = 'C' AND ae.seniority_months <= 3)
  ),
  -- Notas heredables (Normalizando CECO)
  inherited AS (
    SELECT DISTINCT ON (g.employee_id, TRIM(UPPER(g.restaurant_id)), g.group, g.category)
      g.employee_id,
      TRIM(UPPER(g.restaurant_id)) AS restaurant_id,
      g.group  AS group_id,
      g.score
    FROM grades g
    WHERE g.month <= p_month_date
      AND g.group NOT IN ('D', 'F')
    ORDER BY g.employee_id, TRIM(UPPER(g.restaurant_id)), g.group, g.category, g.month DESC
  ),
  -- Notas NO heredables (Normalizando CECO)
  exact_month AS (
    SELECT
      g.employee_id,
      TRIM(UPPER(g.restaurant_id)) AS restaurant_id,
      g.group AS group_id,
      g.score
    FROM grades g
    WHERE g.month = p_month_date
      AND g.group IN ('D', 'F')
  ),
  effective AS (
    SELECT * FROM inherited
    UNION ALL
    SELECT * FROM exact_month
  ),
  -- Suma por empleado (unido por ID de tienda normalizado)
  emp_group_sum AS (
    SELECT employee_id, restaurant_id, group_id, SUM(score) AS total_score
    FROM effective
    GROUP BY employee_id, restaurant_id, group_id
  ),
  -- Promedio por grupo de cada empleado
  emp_group_avgs AS (
    SELECT
      eg.employee_id,
      eg.restaurant_id,
      eg.group_id,
      COALESCE(egs.total_score::NUMERIC / eg.cat_count, 0) AS group_avg
    FROM emp_groups eg
    LEFT JOIN emp_group_sum egs
      ON  egs.employee_id   = eg.employee_id
      AND egs.restaurant_id = eg.restaurant_id
      AND egs.group_id      = eg.group_id
  )
  -- Agregación final
  SELECT
    ega.restaurant_id,
    p_month_date        AS month,
    ega.group_id,
    COUNT(*)::INT       AS employee_count,
    ROUND(AVG(ega.group_avg)::NUMERIC, 2) AS avg_score,
    COUNT(CASE WHEN ega.group_avg >= 90 THEN 1 END)::INT AS approved_count
  FROM emp_group_avgs ega
  GROUP BY ega.restaurant_id, ega.group_id;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FUNCIÓN: backfill_monthly_group_stats()
-- Rellena monthly_group_stats para TODOS los meses que tienen datos en grades.
-- Ejecutar UNA sola vez después de crear la tabla.
-- ============================================================
CREATE OR REPLACE FUNCTION backfill_monthly_group_stats()
RETURNS TEXT AS $$
DECLARE
  p_month_date DATE;
BEGIN
  -- Identificar TODOS los meses que tienen notas en la base de datos
  FOR p_month_date IN 
    SELECT DISTINCT date_trunc('month', month)::DATE 
    FROM grades
  LOOP
    RAISE NOTICE 'Procesando mes: %', p_month_date;
    PERFORM settle_monthly_group_stats(to_char(p_month_date, 'YYYY-MM'));
  END LOOP;

  RETURN 'Proceso de backfill completado para todos los meses con datos.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FUNCIÓN RPC: get_dashboard_stats
-- Devuelve estadísticas agregadas (promedio ponderado por nro de empleados).
-- Se llama desde el Dashboard cuando el filtro es zona / región / nacional.
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_month    TEXT,
  p_store_id TEXT DEFAULT NULL,
  p_zone     TEXT DEFAULT NULL,
  p_region   TEXT DEFAULT NULL
)
RETURNS TABLE (
  group_id       TEXT,
  avg_score      NUMERIC,
  employee_count BIGINT,
  approved_count BIGINT,
  approval_rate  NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mgs.group_id,
    -- PROMEDIO GLOBAL (Suma de puntos de todos los empleados / nro total de empleados)
    ROUND(
      CASE WHEN SUM(mgs.employee_count) > 0
        THEN SUM(mgs.avg_score * mgs.employee_count) / SUM(mgs.employee_count)
        ELSE 0
      END, 1
    ) AS avg_score,
    SUM(mgs.employee_count) AS employee_count,
    SUM(mgs.approved_count) AS approved_count,
    -- TASA GLOBAL (Ej: 88 certificados de 100 totales = 88%)
    ROUND(
      CASE WHEN SUM(mgs.employee_count) > 0
        THEN SUM(mgs.approved_count)::NUMERIC / SUM(mgs.employee_count) * 100
        ELSE 0
      END, 1
    ) AS approval_rate
  FROM monthly_group_stats mgs
  LEFT JOIN (
    SELECT TRIM(UPPER(id)) as norm_id, zone, region FROM restaurants
  ) r ON r.norm_id = TRIM(UPPER(mgs.restaurant_id))
  WHERE mgs.month = (p_month || '-01')::DATE
    AND (p_store_id IS NULL OR TRIM(UPPER(mgs.restaurant_id)) = TRIM(UPPER(p_store_id)))
    AND (p_zone    IS NULL OR r.zone   = p_zone)
    AND (p_region  IS NULL OR r.region = p_region)
  GROUP BY mgs.group_id
  ORDER BY mgs.group_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================
-- SAFE HANDS: Gestión de Manipulación de Alimentos (INDEPENDIENTE)
-- ============================================================

-- 1. TABLA DE PERSONAL ESPECÍFICA (Basada en CM.xlsx)
CREATE TABLE IF NOT EXISTS safe_hands_personnel (
  id                TEXT PRIMARY KEY, -- Cedula
  name              TEXT NOT NULL,    -- Nombre
  restaurant_id     TEXT,             -- Opcional para filtros
  last_issue_date   DATE,             -- Fecha
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE CERTIFICACIONES (Referenciando personal independiente)
CREATE TABLE IF NOT EXISTS safe_hands_certs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       TEXT UNIQUE NOT NULL, -- Solo un certificado por persona
  restaurant_id     TEXT NOT NULL,
  issue_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  certificate_code  TEXT UNIQUE NOT NULL,
  signature_url     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_sh_person FOREIGN KEY (employee_id) REFERENCES safe_hands_personnel(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sh_employee    ON safe_hands_certs(employee_id);
CREATE INDEX IF NOT EXISTS idx_sh_expiry      ON safe_hands_certs(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sh_code        ON safe_hands_certs(certificate_code);

-- 3. TABLA DE CONFIGURACIÓN (Firma Digital)
CREATE TABLE IF NOT EXISTS safe_hands_settings (
  id            SERIAL PRIMARY KEY,
  signature_base64 TEXT,
  responsible_name TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar settings por defecto si no existen
INSERT INTO safe_hands_settings (id, responsible_name) 
VALUES (1, 'RESPONSABLE CALIDAD')
ON CONFLICT (id) DO NOTHING;

-- 4. POLÍTICAS DE ACCESO (RLS)
ALTER TABLE safe_hands_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_hands_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_hands_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública para validación y visualización
DROP POLICY IF EXISTS "Public validation access" ON safe_hands_certs;
CREATE POLICY "Public validation access" ON safe_hands_certs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public person access" ON safe_hands_personnel;
CREATE POLICY "Public person access" ON safe_hands_personnel FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public settings access" ON safe_hands_settings;
CREATE POLICY "Public settings access" ON safe_hands_settings FOR SELECT USING (true);

-- Escritura restringida únicamente a administradores
DROP POLICY IF EXISTS "Allow all for safe_hands_certs" ON safe_hands_certs;
DROP POLICY IF EXISTS "Allow write for admin only" ON safe_hands_certs;
CREATE POLICY "Allow write for admin only" ON safe_hands_certs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow all for safe_hands_personnel" ON safe_hands_personnel;
DROP POLICY IF EXISTS "Allow write for admin only" ON safe_hands_personnel;
CREATE POLICY "Allow write for admin only" ON safe_hands_personnel 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Allow all for safe_hands_settings" ON safe_hands_settings;
DROP POLICY IF EXISTS "Allow write for admin only" ON safe_hands_settings;
CREATE POLICY "Allow write for admin only" ON safe_hands_settings 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE (users.id = auth.uid()::text OR LOWER(users.username) = LOWER(SPLIT_PART(auth.jwt() ->> 'email', '@', 1)))
      AND UPPER(users.role) = 'ADMIN'
  )
);

-- ============================================================
-- ELIMINAR CREDENCIALES POR DEFECTO (admin / 123)
-- Por seguridad, se eliminan el usuario por defecto 'admin@kfc.co' de la tabla auth.users
-- y su respectivo perfil 'admin-master' de la tabla pública 'users'.
-- ============================================================
DELETE FROM public.users WHERE username = 'admin' OR id = 'admin-master';
DELETE FROM auth.users WHERE email = 'admin@kfc.co';
