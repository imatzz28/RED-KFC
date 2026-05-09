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
-- PASO FINAL: Ejecutar el backfill histórico
-- (Ejecutar solo después de que las 3 funciones anteriores existan)
-- ============================================================
SELECT backfill_monthly_group_stats();
