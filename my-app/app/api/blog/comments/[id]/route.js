import { NextResponse } from 'next/server';
import { withTransaction } from '~/lib/db';
import { getTokenCookie } from '~/app/utils/auth';

function asInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

export async function DELETE(request, { params }) {
  const decoded = getTokenCookie(request);
  const userId = decoded?.userId ? asInt(decoded.userId) : null;
  const role = decoded?.role || null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const commentId = asInt(params?.id);
  if (!commentId) return NextResponse.json({ error: 'Missing comment id' }, { status: 400 });

  try {
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, user_id
         FROM blog_comments
         WHERE id = $1
         LIMIT 1`,
        [commentId]
      );
      const row = rows?.[0];
      if (!row) return { status: 'not_found' };

      const ownerId = row.user_id != null ? Number(row.user_id) : null;
      const canDelete = isAdminRole(role) || (ownerId != null && ownerId === Number(userId));
      if (!canDelete) return { status: 'forbidden' };

      // blog_comments.parent_comment_id has ON DELETE CASCADE, so this deletes the whole subtree.
      await client.query('DELETE FROM blog_comments WHERE id = $1', [commentId]);
      return { status: 'ok' };
    });

    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.status === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('comment DELETE:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

