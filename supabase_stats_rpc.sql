CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_month_prefix TEXT,      -- ej: '2026-01'
  p_month_date DATE,        -- ej: '2026-01-01'
  p_store_ids TEXT[],       -- ej: ['CECO01', 'CECO02']
  p_store_names TEXT[]      -- ej: ['KFC METROPOLIS', 'KFC CONDADO']
) RETURNS JSONB
LANGUAGE sql
AS $$
  WITH emp_history AS (
    -- Extracting history events per employee that match INGRESO or RETIRO in the given month and matching stores
    SELECT 
      e.id AS emp_id,
      bool_or(
        (h->>'action' = 'INGRESO') AND 
        (h->>'date' LIKE (p_month_prefix || '%')) AND 
        ((h->>'restaurantName' = ANY(p_store_ids)) OR (h->>'restaurantName' = ANY(p_store_names)))
      ) AS has_hist_ingreso,
      bool_or(
        (h->>'action' = 'RETIRO') AND 
        (h->>'date' LIKE (p_month_prefix || '%')) AND 
        ((h->>'restaurantName' = ANY(p_store_ids)) OR (h->>'restaurantName' = ANY(p_store_names)))
      ) AS has_hist_retiro
    FROM employees e
    LEFT JOIN LATERAL jsonb_array_elements(e.history) h ON e.history IS NOT NULL
    GROUP BY e.id
  ),
  core_emps AS (
    SELECT 
      e.id as emp_id,
      -- Entries
      ( (e.join_date::TEXT LIKE (p_month_prefix || '%') AND e.restaurant_id = ANY(p_store_ids)) 
        OR COALESCE(eh.has_hist_ingreso, false) ) AS is_entry,
      
      -- Exits
      ( (e.exit_date::TEXT LIKE (p_month_prefix || '%') AND e.restaurant_id = ANY(p_store_ids)) 
        OR COALESCE(eh.has_hist_retiro, false) ) AS is_exit,
      
      -- Month summary
      summ.restaurant_id AS summ_rest_id,
      summ.is_approved,
      summ.avg_score,
      summ.avg_ak,
      summ.avg_a,
      summ.avg_b,
      summ.avg_c,
      summ.avg_d,
      summ.avg_e,
      (summ.employee_id IS NOT NULL) AS has_summ,
      
      -- Effective store
      COALESCE(summ.restaurant_id, e.restaurant_id) AS effective_store_id
    
    FROM employees e
    LEFT JOIN emp_history eh ON eh.emp_id = e.id
    LEFT JOIN LATERAL (
        SELECT * FROM employee_monthly_summary s 
        WHERE s.employee_id::TEXT = e.id::TEXT AND s.month::DATE <= p_month_date
        ORDER BY s.month DESC LIMIT 1
    ) summ ON TRUE
  ),
  filtered_emps AS (
    SELECT * 
    FROM core_emps 
    WHERE effective_store_id = ANY(p_store_ids)
  )
  
  SELECT jsonb_build_object(
    'totalEmployees', COUNT(*),
    'entries', COUNT(*) FILTER (WHERE is_entry),
    'exits', COUNT(*) FILTER (WHERE is_exit),
    'approvedCount', COUNT(*) FILTER (WHERE has_summ AND is_approved),
    'pendingCount', COUNT(*) FILTER (WHERE NOT has_summ),
    'globalProgress', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND is_approved)::numeric / NULLIF(COUNT(*), 0)) * 100), 0),
    'rotation', 
      CASE WHEN COUNT(*) > 0 
      THEN ROUND( ((COUNT(*) FILTER (WHERE is_exit))::numeric / COUNT(*)) * 100, 1) 
      ELSE 0 END,
    'retention', 
      CASE WHEN (COUNT(*) - (COUNT(*) FILTER (WHERE is_entry)) + (COUNT(*) FILTER (WHERE is_exit))) > 0 
      THEN LEAST(100, ROUND( (((COUNT(*) - (COUNT(*) FILTER (WHERE is_entry)))::numeric) / (COUNT(*) - (COUNT(*) FILTER (WHERE is_entry)) + (COUNT(*) FILTER (WHERE is_exit)))) * 100, 1)) 
      ELSE 0 END,
      
    'groupAvgs', jsonb_build_array(
       jsonb_build_object('id', 'AK', 'name', 'La Akademia', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_ak >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0)),
       jsonb_build_object('id', 'A', 'name', 'Básicos', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_a >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0)),
       jsonb_build_object('id', 'B', 'name', 'Star', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_b >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0)),
       jsonb_build_object('id', 'C', 'name', 'All-Star', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_c >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0)),
       jsonb_build_object('id', 'D', 'name', 'Plan de Capacitación y SST', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_d >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0)),
       jsonb_build_object('id', 'E', 'name', 'The Vault', 'avg', COALESCE(ROUND( (COUNT(*) FILTER (WHERE has_summ AND avg_e >= 90)::numeric / NULLIF(COUNT(*), 0)) * 100), 0))
    )
  )
  FROM filtered_emps;

$$;
