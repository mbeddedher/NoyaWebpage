CREATE OR REPLACE VIEW public.cart_product_view
 AS
 SELECT id AS product_id,
    name AS product_name,
    size_array,
    brand,
    (
      -- Primary card thumb: prefer in_thumb + not hidden + is_primary
      COALESCE(
        ( SELECT i.thumb_url
            FROM images i
           WHERE i.display_id = pd.id
             AND COALESCE(i.hide, FALSE) = FALSE
             AND COALESCE(i.in_thumb, TRUE) = TRUE
             AND i.is_primary = true
           ORDER BY i.order_index, i.id
           LIMIT 1
        ),
        -- Fallback: first eligible thumb by order
        ( SELECT i.thumb_url
            FROM images i
           WHERE i.display_id = pd.id
             AND COALESCE(i.hide, FALSE) = FALSE
             AND COALESCE(i.in_thumb, TRUE) = TRUE
           ORDER BY i.order_index, i.id
           LIMIT 1
        )
      )
    ) AS primary_image_url,
    ( SELECT json_agg(json_build_object('size', pv.size, 'stock_status', s.stock_status, 'unit', s.unit, 'price', p.price, 'discount', p.discount, 'currency', p.currency, 'is_multi', p.is_multi, 'multi_currency_prices',
                CASE
                    WHEN p.is_multi THEN ( SELECT json_agg(json_build_object('currency', mcp.currency, 'price', mcp.price)) AS json_agg
                       FROM multi_currency_prices mcp
                      WHERE mcp.product_id = pv.product_id)
                    ELSE NULL::json
                END)) AS json_agg
           FROM product_variants pv
             LEFT JOIN stocks s ON s.product_id = pv.product_id
             LEFT JOIN prices p ON p.product_id = pv.product_id
          WHERE pv.display_id = pd.id AND pv.status <> 'not active'::package_option_status_type) AS variants
   FROM product_display pd
  WHERE status = 'active'::display_status_type;

ALTER TABLE public.cart_product_view
    OWNER TO postgres;
