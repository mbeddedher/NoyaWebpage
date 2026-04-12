-- Neon pg_cron setup: rollup + popularity recalculation
-- 1) Enable pg_cron extension (requires Neon support + permissions)
-- 2) Create helper functions that pg_cron can call
--
-- Notes:
-- - rollup_product_events() creates/updates product_event_daily from product_events (last 31 days)
-- - recalculate_popularity_score() updates product_display.popularity_score from product_events (last 30 days + 7d boost)

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION rollup_product_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_rowcount INTEGER := 0;
BEGIN
  CREATE TABLE IF NOT EXISTS product_event_daily (
    day DATE NOT NULL,
    display_id INT NOT NULL,
    source TEXT NOT NULL DEFAULT '(none)',

    impressions INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    add_to_cart INT NOT NULL DEFAULT 0,
    purchases INT NOT NULL DEFAULT 0,
    gallery_interact INT NOT NULL DEFAULT 0,
    size_select INT NOT NULL DEFAULT 0,

    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    PRIMARY KEY (day, display_id, source)
  );

  CREATE INDEX IF NOT EXISTS idx_product_event_daily_display_day
    ON product_event_daily (display_id, day);
  CREATE INDEX IF NOT EXISTS idx_product_event_daily_day
    ON product_event_daily (day);

  INSERT INTO product_event_daily (
    day,
    display_id,
    source,
    impressions,
    clicks,
    views,
    add_to_cart,
    purchases,
    gallery_interact,
    size_select,
    updated_at
  )
  SELECT
    DATE(pe.created_at) AS day,
    pe.display_id,
    COALESCE(NULLIF(TRIM(pe.source), ''), '(none)') AS source,
    COUNT(*) FILTER (WHERE pe.event_type = 'impression')::int AS impressions,
    COUNT(*) FILTER (WHERE pe.event_type = 'click')::int AS clicks,
    COUNT(*) FILTER (WHERE pe.event_type = 'view')::int AS views,
    COUNT(*) FILTER (WHERE pe.event_type = 'add_to_cart')::int AS add_to_cart,
    COUNT(*) FILTER (WHERE pe.event_type = 'purchase')::int AS purchases,
    COUNT(*) FILTER (WHERE pe.event_type = 'gallery_interact')::int AS gallery_interact,
    COUNT(*) FILTER (WHERE pe.event_type = 'size_select')::int AS size_select,
    NOW() AS updated_at
  FROM product_events pe
  WHERE pe.created_at >= NOW() - INTERVAL '31 days'
  GROUP BY 1, 2, 3
  ON CONFLICT (day, display_id, source)
  DO UPDATE SET
    impressions = EXCLUDED.impressions,
    clicks = EXCLUDED.clicks,
    views = EXCLUDED.views,
    add_to_cart = EXCLUDED.add_to_cart,
    purchases = EXCLUDED.purchases,
    gallery_interact = EXCLUDED.gallery_interact,
    size_select = EXCLUDED.size_select,
    updated_at = NOW();

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount;
END;
$$;

CREATE OR REPLACE FUNCTION recalculate_popularity_score()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_rowcount INTEGER := 0;
BEGIN
  -- Weights
  -- Event weights
  -- impression=1, click=3, view=5, add_to_cart=12, purchase=30, gallery_interact=2, size_select=2
  -- Recency: score = score30 + 2*score7
  -- Source: home impressions=0, home clicks discounted 0.75

  WITH base AS (
    SELECT
      pe.display_id,
      pe.event_type,
      COALESCE(NULLIF(TRIM(pe.source), ''), '(none)') AS source,
      pe.created_at
    FROM product_events pe
    WHERE pe.created_at >= NOW() - INTERVAL '30 days'
  ),
  weighted AS (
    SELECT
      display_id,
      CASE event_type
        WHEN 'impression' THEN 1.0
        WHEN 'click' THEN 3.0
        WHEN 'view' THEN 5.0
        WHEN 'add_to_cart' THEN 12.0
        WHEN 'purchase' THEN 30.0
        WHEN 'gallery_interact' THEN 2.0
        WHEN 'size_select' THEN 2.0
        ELSE 0
      END
      *
      CASE
        WHEN source = 'home' AND event_type = 'impression' THEN 0.0
        WHEN source = 'home' AND event_type = 'click' THEN 0.75
        ELSE 1
      END AS w,
      (created_at >= NOW() - INTERVAL '7 days') AS in_7d
    FROM base
  ),
  agg AS (
    SELECT
      display_id,
      COALESCE(SUM(w), 0) AS score_30,
      COALESCE(SUM(CASE WHEN in_7d THEN w ELSE 0 END), 0) AS score_7
    FROM weighted
    GROUP BY display_id
  )
  UPDATE product_display pd
  SET popularity_score = COALESCE(agg.score_30, 0) + (2.0 * COALESCE(agg.score_7, 0)),
      updated_at = CURRENT_TIMESTAMP
  FROM agg
  WHERE pd.id = agg.display_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount;
END;
$$;

-- Example schedules (uncomment after verifying functions work):
-- SELECT cron.schedule('rollup_product_events_hourly', '15 * * * *', $$SELECT rollup_product_events();$$);
-- SELECT cron.schedule('recalc_popularity_30m', '*/30 * * * *', $$SELECT recalculate_popularity_score();$$);

