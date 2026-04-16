import { NextResponse } from 'next/server';
import { withTransaction } from '~/lib/db';
import { getTokenCookie } from '~/app/utils/auth';

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request, { params }) {
  const decoded = getTokenCookie(request);
  const userId = decoded?.userId ? asInt(decoded.userId) : null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commentId = asInt(params?.id);
  if (!commentId) return NextResponse.json({ error: 'Missing comment id' }, { status: 400 });

  try {
    const result = await withTransaction(async (client) => {
      const exists = await client.query(
        `SELECT 1
         FROM blog_comment_likes
         WHERE comment_id = $1 AND user_id = $2
         LIMIT 1`,
        [commentId, userId]
      );

      let liked;
      if (exists.rows.length > 0) {
        await client.query(
          `DELETE FROM blog_comment_likes
           WHERE comment_id = $1 AND user_id = $2`,
          [commentId, userId]
        );
        await client.query(
          `UPDATE blog_comments
           SET like_count = GREATEST(0, like_count - 1)
           WHERE id = $1`,
          [commentId]
        );
        liked = false;
      } else {
        await client.query(
          `INSERT INTO blog_comment_likes (comment_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (comment_id, user_id) DO NOTHING`,
          [commentId, userId]
        );
        await client.query(
          `UPDATE blog_comments
           SET like_count = like_count + 1
           WHERE id = $1`,
          [commentId]
        );
        liked = true;
      }

      const { rows } = await client.query(
        `SELECT like_count
         FROM blog_comments
         WHERE id = $1
         LIMIT 1`,
        [commentId]
      );

      return { liked, like_count: Number(rows?.[0]?.like_count || 0) };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('comment like toggle:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

