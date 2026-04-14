import { connectToDatabase } from '~/lib/db';

/**
 * Parse /api/product-cards query string into filter fields.
 * @param {Request} request
 */
export function parseProductCardSearchParams(request) {
  const { searchParams } = new URL(request.url);
  return {
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    minPrice: searchParams.get('minPrice'),
    maxPrice: searchParams.get('maxPrice'),
    brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    sizes: searchParams.get('sizes')?.split(',').filter(Boolean) || [],
  };
}

/**
 * Load product card rows (same data as GET /api/product-cards).
 * Use this from Server Components instead of fetch() to avoid wrong base URL / HTML responses.
 * @param {object} filters
 */
export async function queryProductCards(filters) {
  const {
    categories = [],
    minPrice = null,
    maxPrice = null,
    brands = [],
    sizes = [],
  } = filters;

  const client = await connectToDatabase();

  try {
    let query = `
      SELECT 
        v.product_id,
        v.product_name,
        v.brand,
        v.size_array,
        v.variants,
        COALESCE(v.primary_image_url, '/no-image.svg') as primary_image_url,
        pd.min_price,
        pd.ranking,
        pd.max_price,
        pd.price_array,
        pd.has_variants,
        pd.default_size,
        pd.category_id
      FROM cart_product_view v
      JOIN product_display pd ON v.product_id = pd.id
      WHERE 1=1`;

    const queryParams = [];
    let paramCounter = 1;

    if (categories.length > 0) {
      query += ` AND (pd.category_id = ANY($${paramCounter}) OR pd.category_id IN (
        SELECT id FROM web_categories WHERE parent_id = ANY($${paramCounter})
      ))`;
      queryParams.push(categories);
      paramCounter++;
    }

    if (minPrice != null && minPrice !== '' && maxPrice != null && maxPrice !== '') {
      query += ` AND pd.max_price >= $${paramCounter} AND pd.min_price <= $${paramCounter + 1}`;
      queryParams.push(parseFloat(minPrice), parseFloat(maxPrice));
      paramCounter += 2;
    } else if (minPrice != null && minPrice !== '') {
      query += ` AND pd.max_price >= $${paramCounter}`;
      queryParams.push(parseFloat(minPrice));
      paramCounter++;
    } else if (maxPrice != null && maxPrice !== '') {
      query += ` AND pd.min_price <= $${paramCounter}`;
      queryParams.push(parseFloat(maxPrice));
      paramCounter++;
    }

    if (brands.length > 0) {
      query += ` AND pd.brand = ANY($${paramCounter})`;
      queryParams.push(brands);
      paramCounter++;
    }

    if (sizes.length > 0) {
      query += ` AND pd.size_array && $${paramCounter}`;
      queryParams.push(sizes);
      paramCounter++;
    }

    query += ` ORDER BY pd.popularity_score DESC, pd.created_at DESC`;

    const result = await client.query(query, queryParams);

    const ratesResult = await client.query(
      `SELECT from_currency || '_' || to_currency as rate_key, rate
       FROM currency_rates
       WHERE to_currency = 'TRY' AND from_currency IN ('USD', 'EUR')
       AND date = (SELECT MAX(date) FROM currency_rates)`
    );
    const rates = {};
    ratesResult.rows.forEach((r) => {
      rates[r.rate_key] = parseFloat(r.rate);
    });

    const toTL = (price, currency) => {
      if (price == null || isNaN(price)) return null;
      const curr = (currency || '').toUpperCase();
      if (curr === 'TRY' || curr === 'TL') return price;
      const rateKey = `${curr}_TRY`;
      const rate = rates[rateKey];
      return rate ? Math.round(price * rate * 100) / 100 : price;
    };

    return result.rows.map((row) => {
      const rawVariants = row.variants;
      const variants = Array.isArray(rawVariants) ? rawVariants : rawVariants ? [rawVariants] : [];
      const hasVariantsData = variants.length > 0;

      let min_price = row.min_price;
      let max_price = row.max_price;
      let price_array = row.price_array;
      let size_array = row.size_array;
      let default_size = row.default_size;
      let has_variants = row.has_variants;

      if (hasVariantsData) {
        const prices = variants
          .filter((v) => v && (v.price != null || (v.multi_currency_prices && v.multi_currency_prices.length)))
          .map((v) => {
            let price = null;
            let currency = v.currency;
            if (v.price != null) {
              price = parseFloat(v.price);
            } else if (v.multi_currency_prices?.length) {
              const tryPrice = v.multi_currency_prices.find(
                (m) => (m.currency || '').toUpperCase() === 'TRY'
              );
              if (tryPrice?.price != null) {
                price = parseFloat(tryPrice.price);
                currency = 'TRY';
              } else {
                const first = v.multi_currency_prices[0];
                price = first?.price != null ? parseFloat(first.price) : null;
                currency = first?.currency;
              }
            }
            return price != null ? toTL(price, currency) : null;
          })
          .filter((p) => p != null && !isNaN(p));
        const sizesFromV = variants.map((v) => v?.size).filter(Boolean);

        if (sizesFromV.length && !size_array?.length) size_array = sizesFromV;
        if (prices.length) {
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          if (min_price == null) min_price = minP;
          if (max_price == null) max_price = maxP;
          if (!price_array?.length || price_array.every((p) => p == null)) {
            price_array = sizesFromV.map((_, i) => prices[i] ?? minP);
          }
        }
        if (!default_size && size_array?.length) default_size = size_array[0];
        // DB flag can be wrong; drive UI from actual size list
        const nSizes = size_array?.length ?? 0;
        if (nSizes > 1) has_variants = true;
        else if (nSizes === 1) has_variants = false;
      }

      const { variants: _, ...rest } = row;
      const outSizes = size_array || [];
      let outHasVariants = has_variants ?? false;
      if (outSizes.length > 1) outHasVariants = true;
      else if (outSizes.length === 1) outHasVariants = false;

      return {
        ...rest,
        min_price,
        max_price,
        price_array: price_array || (min_price != null ? [min_price] : null),
        size_array: outSizes,
        default_size,
        has_variants: outHasVariants,
        primary_image_url: row.primary_image_url,
      };
    });
  } finally {
    client.release();
  }
}
