'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './post.module.css';
import { useUser } from '~/app/context/UserContext';

function formatDate(isoLike) {
  try {
    return new Date(isoLike).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

function countAll(nodes = []) {
  let n = 0;
  for (const c of nodes) {
    n += 1;
    n += countAll(c.replies || []);
  }
  return n;
}

function CommentNode({
  node,
  depth = 0,
  isLoggedIn,
  viewerUserId,
  viewerRole,
  replyTo,
  setReplyTo,
  replyContent,
  setReplyContent,
  submitting,
  onSubmitReply,
  onToggleLike,
  onDeleteComment,
  onRequireLogin,
}) {
  const hasReplies = (node.replies || []).length > 0;
  const isReplying = replyTo === Number(node.id);
  const likeCount = Number(node.like_count || 0);
  const liked = Boolean(node.liked_by_me);
  const nodeUserId = node.user_id != null ? Number(node.user_id) : null;
  const isAdmin = String(viewerRole || '').toLowerCase() === 'admin' || String(viewerRole || '').toLowerCase() === 'superadmin';
  const canDelete = isAdmin || (viewerUserId != null && nodeUserId != null && Number(viewerUserId) === nodeUserId);

  return (
    <div
      className={styles.comment}
      style={depth ? { marginLeft: Math.min(18 * depth, 54) } : undefined}
    >
      <div className={styles.commentHeader}>
        <div className={styles.commentAuthor}>{node.author || 'Misafir'}</div>
        <div className={styles.commentDate}>{formatDate(node.created_at)}</div>
      </div>
      <p className={styles.commentBody}>{node.content}</p>

      <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => {
              setReplyTo(Number(node.id));
              setReplyContent('');
            }}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              borderRadius: 999,
              padding: '7px 10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Yanıtla
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequireLogin}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              borderRadius: 999,
              padding: '7px 10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Yorum için giriş yap
          </button>
        )}

        <span className={styles.likeWrap}>
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) return;
              onToggleLike(Number(node.id));
            }}
            disabled={!isLoggedIn}
            aria-pressed={liked}
            aria-label={
              !isLoggedIn ? 'Beğenmek için giriş yapmalısınız.' : liked ? 'Beğeniyi kaldır' : 'Beğen'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: isLoggedIn ? 'pointer' : 'not-allowed',
              opacity: isLoggedIn ? 1 : 0.55,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={liked ? '#16a34a' : '#111827'}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14 9V5a3 3 0 0 0-3-3l-1 7" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              <path d="M7 11h9.3a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 15.1 22H7" />
            </svg>
            <span
              style={{
                fontWeight: 900,
                fontSize: 13,
                color: liked ? '#16a34a' : 'rgba(17,24,39,0.78)',
                minWidth: 10,
                textAlign: 'left',
              }}
            >
              {likeCount}
            </span>
          </button>
          {!isLoggedIn && <span className={styles.likeTooltip}>Beğenmek için giriş yapmalısınız.</span>}
        </span>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteComment(Number(node.id))}
            aria-label="Yorumu sil"
            title="Yorumu sil"
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 10,
              border: '1px solid rgba(185, 28, 28, 0.22)',
              background: 'rgba(185, 28, 28, 0.06)',
              cursor: 'pointer',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(185, 28, 28)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        )}
      </div>

      {isReplying && isLoggedIn && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Yanıt yaz…"
            rows={3}
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              padding: 10,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyContent('');
              }}
              disabled={submitting}
              style={{
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#fff',
                borderRadius: 999,
                padding: '8px 12px',
                fontWeight: 900,
                cursor: 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => onSubmitReply(Number(node.id))}
              disabled={submitting || !replyContent.trim()}
              style={{
                border: '1px solid rgba(0,0,0,0.0)',
                background: '#111827',
                color: '#fff',
                borderRadius: 999,
                padding: '8px 12px',
                fontWeight: 900,
                cursor: 'pointer',
                opacity: submitting || !replyContent.trim() ? 0.6 : 1,
              }}
            >
              Gönder
            </button>
          </div>
        </div>
      )}

      {hasReplies && (
        <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
          {node.replies.map((r) => (
            <CommentNode
              key={r.id}
              node={r}
              depth={depth + 1}
              isLoggedIn={isLoggedIn}
              viewerUserId={viewerUserId}
              viewerRole={viewerRole}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submitting={submitting}
              onSubmitReply={onSubmitReply}
              onToggleLike={onToggleLike}
              onDeleteComment={onDeleteComment}
              onRequireLogin={onRequireLogin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogComments({ slug }) {
  const router = useRouter();
  const { isLoggedIn, userId, role } = useUser();

  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyTo, setReplyTo] = useState(null); // comment id
  const [replyContent, setReplyContent] = useState('');

  const totalCount = useMemo(() => countAll(comments), [comments]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}/comments`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Yorumlar yüklenemedi');
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (e) {
      setError(String(e?.message || 'Yorumlar yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submit = async ({ parent_comment_id }) => {
    const text = String(parent_comment_id ? replyContent : content).trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: text, parent_comment_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError('Yorum yapmak için giriş yapmalısın.');
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Yorum gönderilemedi');

      // New comment is pending moderation; reload approved list anyway (no-op) and clear inputs.
      if (parent_comment_id) {
        setReplyTo(null);
        setReplyContent('');
      } else {
        setContent('');
      }
      await load();
    } catch (e) {
      setError(String(e?.message || 'Yorum gönderilemedi'));
    } finally {
      setSubmitting(false);
    }
  };

  const onRequireLogin = () => router.push('/login');

  const deleteComment = async (commentId) => {
    if (!commentId) return;
    const ok = confirm('Yorum silinsin mi? (Yanıtlar da silinir)');
    if (!ok) return;
    setError('');
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onRequireLogin();
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Yorum silinemedi');
      await load();
    } catch (e) {
      setError(String(e?.message || 'Yorum silinemedi'));
    }
  };

  const toggleLike = async (commentId) => {
    if (!commentId) return;
    setError('');
    try {
      const res = await fetch(`/api/blog/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onRequireLogin();
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Beğeni güncellenemedi');
      await load();
    } catch (e) {
      setError(String(e?.message || 'Beğeni güncellenemedi'));
    }
  };

  return (
    <section className={styles.card} aria-label="Yorumlar">
      <h2 className={styles.sectionTitle}>Yorumlar {totalCount ? `(${totalCount})` : ''}</h2>

      {!isLoggedIn ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ color: 'rgba(17,24,39,0.78)', fontWeight: 700 }}>
            Yorum yapmak için giriş yapmalısın.
          </div>
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              justifySelf: 'start',
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#111827',
              color: '#fff',
              borderRadius: 999,
              padding: '10px 14px',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Giriş Yap
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Yorum yaz…"
            rows={4}
            style={{
              width: '100%',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.12)',
              padding: 12,
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => submit({ parent_comment_id: null })}
              disabled={submitting || !content.trim()}
              style={{
                border: '1px solid rgba(0,0,0,0.0)',
                background: '#111827',
                color: '#fff',
                borderRadius: 999,
                padding: '9px 14px',
                fontWeight: 900,
                cursor: 'pointer',
                opacity: submitting || !content.trim() ? 0.6 : 1,
              }}
            >
              Gönder
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, color: 'rgba(185, 28, 28, 0.9)', fontWeight: 800 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.notFound}>Yorumlar yükleniyor…</div>
      ) : comments.length === 0 ? (
        <div className={styles.notFound}>Henüz yorum yok.</div>
      ) : (
        <div className={styles.comments}>
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              node={c}
              isLoggedIn={isLoggedIn}
              viewerUserId={userId}
              viewerRole={role}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              submitting={submitting}
              onSubmitReply={(parentId) => submit({ parent_comment_id: parentId })}
              onToggleLike={toggleLike}
              onDeleteComment={deleteComment}
              onRequireLogin={onRequireLogin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

