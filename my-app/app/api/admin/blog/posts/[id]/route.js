import { NextResponse } from 'next/server';
import { withTransaction } from '~/lib/db';
import { ensureUniqueBlogSlug, slugifyTitle } from '~/lib/blogAdmin';

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseIdList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  }
  const s = String(value || '').trim();
  if (!s) return [];
  return [
    ...new Set(
      s
        .split(/[\s,;]+/g)
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
}

export async function GET(_request, { params }) {
  const id = asInt(params?.id);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const result = await withTransaction(async (client) => {
      const postRes = await client.query(
        `SELECT *
         FROM blog_posts
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      const post = postRes.rows?.[0] || null;
      if (!post) return { post: null };

      const catsRes = await client.query(
        `SELECT category_id
         FROM blog_post_categories
         WHERE post_id = $1`,
        [id]
      );
      const relRes = await client.query(
        `SELECT product_id
         FROM blog_post_related_products
         WHERE post_id = $1`,
        [id]
      );

      return {
        post,
        category_ids: catsRes.rows.map((r) => Number(r.category_id)),
        related_product_display_ids: relRes.rows.map((r) => Number(r.product_id)),
      };
    });

    if (!result.post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('blog post GET by id:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load blog post' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const id = asInt(params?.id);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  try {
    const title = String(body?.title || '').trim();
    const content_html = String(body?.content_html || '').trim();
    const excerpt = body?.excerpt != null ? String(body.excerpt).trim() : '';
    const cover_image_url = body?.cover_image_url != null ? String(body.cover_image_url).trim() : '';
    const slugInput = body?.slug != null ? String(body.slug).trim() : '';
    const status = String(body?.status || '').trim();
    const is_featured = Boolean(body?.is_featured);
    const article_type = String(body?.article_type || '').trim();

    const userRaw = body?.user_id;
    const user_id =
      userRaw === '' || userRaw === null || userRaw === undefined ? null : Number(userRaw);
    const userIdFinal = Number.isFinite(user_id) && user_id > 0 ? user_id : null;

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!content_html) return NextResponse.json({ error: 'content_html is required' }, { status: 400 });
    if (!['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'status must be draft, published, or archived' }, { status: 400 });
    }
    if (!['öğretici', 'haber', 'duyuru'].includes(article_type)) {
      return NextResponse.json(
        { error: 'article_type must be öğretici, haber, or duyuru' },
        { status: 400 }
      );
    }

    const category_ids = parseIdList(body?.category_ids);
    const related_product_display_ids = parseIdList(body?.related_product_display_ids);

    const out = await withTransaction(async (client) => {
      const existingRes = await client.query('SELECT id, slug, status FROM blog_posts WHERE id = $1 LIMIT 1', [id]);
      if (existingRes.rows.length === 0) return null;
      const existing = existingRes.rows[0];

      const baseSlug = slugInput ? slugInput.slice(0, 300) : slugifyTitle(title);
      let finalSlug = existing.slug;
      if (baseSlug && baseSlug !== existing.slug) {
        finalSlug = await ensureUniqueBlogSlug(client, baseSlug);
      }

      const shouldSetPublishedAt = status === 'published' && existing.status !== 'published';
      const publishedAtExpr = shouldSetPublishedAt ? 'CURRENT_TIMESTAMP' : 'published_at';

      const upd = await client.query(
        `UPDATE blog_posts
         SET title = $1,
             slug = $2,
             excerpt = $3,
             content_html = $4,
             cover_image_url = $5,
             user_id = $6,
             status = $7,
             is_featured = $8,
             article_type = $9::blog_article_type,
             published_at = ${publishedAtExpr},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING id, slug, title, status, article_type, updated_at`,
        [
          title.slice(0, 250),
          finalSlug,
          excerpt || null,
          content_html,
          cover_image_url || null,
          userIdFinal,
          status,
          is_featured,
          article_type,
          id,
        ]
      );

      await client.query('DELETE FROM blog_post_categories WHERE post_id = $1', [id]);
      for (const catId of category_ids) {
        await client.query(
          `INSERT INTO blog_post_categories (post_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT (post_id, category_id) DO NOTHING`,
          [id, catId]
        );
      }

      await client.query('DELETE FROM blog_post_related_products WHERE post_id = $1', [id]);
      for (const displayId of related_product_display_ids) {
        await client.query(
          `INSERT INTO blog_post_related_products (post_id, product_id)
           VALUES ($1, $2)
           ON CONFLICT (post_id, product_id) DO NOTHING`,
          [id, displayId]
        );
      }

      return { post: upd.rows[0], category_ids, related_product_display_ids };
    });

    if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, ...out }, { status: 200 });
  } catch (error) {
    console.error('blog post PUT:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const id = asInt(params?.id);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const out = await withTransaction(async (client) => {
      const res = await client.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id]);
      return res.rows?.[0] || null;
    });
    if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, id: out.id }, { status: 200 });
  } catch (error) {
    console.error('blog post DELETE:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}

