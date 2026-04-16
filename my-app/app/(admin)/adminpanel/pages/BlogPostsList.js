'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminTabs } from '~/app/context/AdminTabsContext';

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

export default function BlogPostsList() {
  const { openTab } = useAdminTabs();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      if (status) params.set('status', status);
      params.set('limit', '120');
      const res = await fetch(`/api/admin/blog/posts?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Yazılar yüklenemedi');
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setPosts([]);
      setError(String(e?.message || 'Yazılar yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => posts.map((p) => ({
    id: Number(p.id),
    title: p.title || '',
    slug: p.slug || '',
    status: p.status || '',
    article_type: p.article_type || '',
    is_featured: Boolean(p.is_featured),
    created_at: p.created_at,
    updated_at: p.updated_at,
  })), [posts]);

  const onEdit = (row) => {
    openTab({
      id: `edit-blog-post-${row.id}-${Date.now()}`,
      label: `Edit blog: #${row.id}`,
      component: 'EditBlogPost',
      props: { postId: row.id },
    });
  };

  const onDelete = async (row) => {
    const ok = confirm(`Delete blog post #${row.id}?\n\n${row.title}`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/blog/posts/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      await load();
    } catch (e) {
      alert(String(e?.message || 'Delete failed'));
    }
  };

  return (
    <div style={{ padding: 18 }}>
      <h3 style={{ margin: '0 0 10px', fontWeight: 900 }}>Blog yazıları</h3>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ara: başlık veya slug…"
          style={{
            minWidth: 260,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </div>

      {error && (
        <div style={{ marginBottom: 10, color: 'rgba(185, 28, 28, 0.92)', fontWeight: 800 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ opacity: 0.75, fontWeight: 700 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ opacity: 0.75, fontWeight: 700 }}>No posts.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                <th style={{ padding: '10px 8px' }}>ID</th>
                <th style={{ padding: '10px 8px', minWidth: 260 }}>Title</th>
                <th style={{ padding: '10px 8px', minWidth: 220 }}>Slug</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
                <th style={{ padding: '10px 8px' }}>Type</th>
                <th style={{ padding: '10px 8px' }}>Featured</th>
                <th style={{ padding: '10px 8px' }}>Updated</th>
                <th style={{ padding: '10px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 900 }}>#{r.id}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 800 }}>{r.title}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    {r.slug}
                  </td>
                  <td style={{ padding: '10px 8px' }}>{r.status}</td>
                  <td style={{ padding: '10px 8px' }}>{r.article_type}</td>
                  <td style={{ padding: '10px 8px' }}>{r.is_featured ? '✓' : ''}</td>
                  <td style={{ padding: '10px 8px' }}>{formatDate(r.updated_at || r.created_at)}</td>
                  <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => onEdit(r)}
                      style={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: '#fff',
                        borderRadius: 10,
                        padding: '7px 10px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        marginRight: 8,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      style={{
                        border: '1px solid rgba(185, 28, 28, 0.25)',
                        background: 'rgba(185, 28, 28, 0.08)',
                        color: 'rgb(185, 28, 28)',
                        borderRadius: 10,
                        padding: '7px 10px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

