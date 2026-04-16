import { NextResponse } from 'next/server';
import { query } from '~/lib/db';
import { getTokenCookie } from '~/app/utils/auth';

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildTree(flat) {
  const byId = new Map();
  const roots = [];

  for (const c of flat) {
    byId.set(Number(c.id), { ...c, replies: [] });
  }

  for (const c of flat) {
    const id = Number(c.id);
    const node = byId.get(id);
    const parentId = c.parent_comment_id != null ? Number(c.parent_comment_id) : null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function GET(_request, { params }) {
  const slug = String(params?.slug || '').trim();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  try {
    // Optional personalization: if logged in, include liked_by_me.
    const decoded = getTokenCookie(_request);
    const viewerUserId = decoded?.userId ? asInt(decoded.userId) : null;

    const postRes = await query(
      `SELECT id
       FROM blog_posts
       WHERE slug = $1 AND status = 'published'
       LIMIT 1`,
      [slug]
    );
    const postId = postRes.rows?.[0]?.id;
    if (!postId) return NextResponse.json({ comments: [] }, { status: 200 });

    const { rows } = await query(
      `SELECT
         c.id,
         c.parent_comment_id,
         c.user_id,
         c.content,
         c.created_at,
         COALESCE(c.like_count, 0) AS like_count,
         CASE WHEN $2::bigint IS NULL THEN FALSE ELSE (l.user_id IS NOT NULL) END AS liked_by_me,
         COALESCE(NULLIF(c.guest_name, ''), NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Misafir') AS author
       FROM blog_comments c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN blog_comment_likes l
         ON l.comment_id = c.id AND l.user_id = $2::bigint
       WHERE c.post_id = $1
         AND c.status = 'approved'
       ORDER BY c.created_at ASC, c.id ASC`,
      [postId, viewerUserId]
    );

    const tree = buildTree(rows || []);
    return NextResponse.json({ comments: tree }, { status: 200 });
  } catch (error) {
    console.error('blog comments GET:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const slug = String(params?.slug || '').trim();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const decoded = getTokenCookie(request);
  const userId = decoded?.userId ? asInt(decoded.userId) : null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const content = String(body?.content || '').trim();
  const parentIdRaw = body?.parent_comment_id;
  const parent_comment_id = parentIdRaw == null || parentIdRaw === '' ? null : asInt(parentIdRaw);

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: 'content is too long' }, { status: 400 });
  }

  try {
    const postRes = await query(
      `SELECT id
       FROM blog_posts
       WHERE slug = $1 AND status = 'published'
       LIMIT 1`,
      [slug]
    );
    const postId = postRes.rows?.[0]?.id;
    if (!postId) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    if (parent_comment_id) {
      const parentRes = await query(
        `SELECT 1
         FROM blog_comments
         WHERE id = $1 AND post_id = $2
         LIMIT 1`,
        [parent_comment_id, postId]
      );
      if (parentRes.rows.length === 0) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 });
      }
    }

    // Classic moderation: new comments start pending.
    const { rows } = await query(
      `INSERT INTO blog_comments (post_id, parent_comment_id, user_id, content, status)
       VALUES ($1, $2, $3, $4, 'approved')
       RETURNING id, created_at`,
      [postId, parent_comment_id, userId, content]
    );

    return NextResponse.json(
      { ok: true, status: 'approved', comment: rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error('blog comments POST:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create comment' },
      { status: 500 }
    );
  }
}

