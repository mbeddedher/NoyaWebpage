/**
 * Admin blog helpers — matches `sqlfiles/blog.sql`.
 * `blog_post_related_products.product_id` stores **product_display.id** (not shop product id).
 */

/** @param {string} title */
export function slugifyTitle(title) {
  const base = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  return base || 'post';
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} baseSlug
 */
/**
 * Unique slug for `blog_categories.slug` (max 120).
 * @param {import('pg').PoolClient} client
 * @param {string} baseSlug
 */
export async function ensureUniqueCategorySlug(client, baseSlug) {
  let slug = String(baseSlug || 'kategori')
    .trim()
    .slice(0, 120);
  let n = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await client.query('SELECT 1 FROM blog_categories WHERE slug = $1 LIMIT 1', [slug]);
    if (rows.length === 0) return slug;
    n += 1;
    const suffix = `-${n}`;
    slug = `${String(baseSlug || 'kategori').trim().slice(0, 120 - suffix.length)}${suffix}`;
  }
}

export async function ensureUniqueBlogSlug(client, baseSlug) {
  let slug = baseSlug.slice(0, 300);
  let n = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await client.query('SELECT 1 FROM blog_posts WHERE slug = $1 LIMIT 1', [slug]);
    if (rows.length === 0) return slug;
    n += 1;
    const suffix = `-${n}`;
    slug = `${baseSlug.slice(0, 300 - suffix.length)}${suffix}`;
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {number[]} ids
 * @returns {Promise<number[]>}
 */
export async function filterExistingProductDisplayIds(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query('SELECT id FROM product_display WHERE id = ANY($1::bigint[])', [ids]);
  return rows.map((r) => Number(r.id));
}

/**
 * @param {import('pg').PoolClient} client
 * @param {number[]} ids
 * @returns {Promise<number[]>}
 */
export async function filterExistingBlogCategoryIds(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query('SELECT id FROM blog_categories WHERE id = ANY($1::bigint[])', [ids]);
  return rows.map((r) => Number(r.id));
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{
 *   title: string,
 *   slug: string,
 *   excerpt: string | null,
 *   content_html: string,
 *   cover_image_url: string | null,
 *   user_id: number | null,
 *   status: 'draft'|'published'|'archived',
 *   is_featured: boolean,
 *   article_type: 'öğretici'|'haber'|'duyuru',
 *   category_ids: number[],
 *   related_product_display_ids: number[],
 * }} input
 */
export async function insertBlogPostWithRelations(client, input) {
  let userId = input.user_id;
  if (userId) {
    const u = await client.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (u.rows.length === 0) userId = null;
  }

  const publishedAt = input.status === 'published' ? new Date() : null;

  const insertPost = await client.query(
    `INSERT INTO blog_posts (
      title, slug, excerpt, content_html, cover_image_url, user_id,
      status, is_featured, published_at, article_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::blog_article_type)
    RETURNING id, slug, title, status, article_type, created_at`,
    [
      input.title,
      input.slug,
      input.excerpt || null,
      input.content_html,
      input.cover_image_url || null,
      userId,
      input.status,
      input.is_featured,
      publishedAt,
      input.article_type,
    ]
  );
  const postId = insertPost.rows[0].id;

  const validCategoryIds = await filterExistingBlogCategoryIds(client, input.category_ids);
  for (const catId of validCategoryIds) {
    await client.query(
      `INSERT INTO blog_post_categories (post_id, category_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, category_id) DO NOTHING`,
      [postId, catId]
    );
  }

  const validDisplayIds = await filterExistingProductDisplayIds(client, input.related_product_display_ids);
  for (const displayId of validDisplayIds) {
    await client.query(
      `INSERT INTO blog_post_related_products (post_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, product_id) DO NOTHING`,
      [postId, displayId]
    );
  }

  return { ...insertPost.rows[0], related_product_display_ids: validDisplayIds };
}
