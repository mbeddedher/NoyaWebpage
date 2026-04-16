import { NextResponse } from 'next/server';
import { withTransaction } from '~/lib/db';
import {
  ensureUniqueBlogSlug,
  insertBlogPostWithRelations,
  slugifyTitle,
} from '~/lib/blogAdmin';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = String(searchParams.get('search') ?? '').trim();
    const statusRaw = String(searchParams.get('status') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit'));
    const offsetRaw = Number(searchParams.get('offset'));
    const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);

    const status = ['draft', 'published', 'archived'].includes(statusRaw) ? statusRaw : '';
    const safe = qRaw.replace(/[%_\\]/g, ' ').trim();

    const result = await withTransaction(async (client) => {
      const where = [];
      const params = [];
      let i = 1;

      if (status) {
        where.push(`p.status = $${i++}`);
        params.push(status);
      }
      if (safe) {
        where.push(`(p.title ILIKE $${i} OR p.slug ILIKE $${i})`);
        params.push(`%${safe}%`);
        i += 1;
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const { rows } = await client.query(
        `SELECT
           p.id, p.title, p.slug, p.status, p.article_type, p.is_featured,
           p.published_at, p.created_at, p.updated_at,
           p.comment_count, p.view_count
         FROM blog_posts p
         ${whereSql}
         ORDER BY p.created_at DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset]
      );

      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM blog_posts p
         ${whereSql}`,
        params
      );

      return { posts: rows, total: Number(countRes.rows?.[0]?.total || 0) };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('blog posts GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const title = String(body?.title || '').trim();
    const content_html = String(body?.content_html || '').trim();
    const excerpt = body?.excerpt != null ? String(body.excerpt).trim() : '';
    const cover_image_url = body?.cover_image_url != null ? String(body.cover_image_url).trim() : '';
    const slugInput = body?.slug != null ? String(body.slug).trim() : '';
    const status = String(body?.status || 'draft').trim();
    const is_featured = Boolean(body?.is_featured);
    const article_type = String(body?.article_type || 'haber').trim();

    const userRaw = body?.user_id;
    const user_id =
      userRaw === '' || userRaw === null || userRaw === undefined
        ? null
        : Number(userRaw);
    const userIdFinal = Number.isFinite(user_id) && user_id > 0 ? user_id : null;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!content_html) {
      return NextResponse.json({ error: 'content_html is required' }, { status: 400 });
    }
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

    const baseSlug = slugInput ? slugInput.slice(0, 300) : slugifyTitle(title);

    const post = await withTransaction(async (client) => {
      const slug = await ensureUniqueBlogSlug(client, baseSlug);
      return insertBlogPostWithRelations(client, {
        title: title.slice(0, 250),
        slug,
        excerpt: excerpt || null,
        content_html,
        cover_image_url: cover_image_url || null,
        user_id: userIdFinal,
        status,
        is_featured,
        article_type,
        category_ids,
        related_product_display_ids,
      });
    });

    return NextResponse.json({ ok: true, post }, { status: 201 });
  } catch (error) {
    console.error('blog posts POST:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
