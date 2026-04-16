'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AddBlogPost.module.css';

/** @param {unknown} id */
function normalizeDisplayId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function EditBlogPost({ postId }) {
  const id = Number(postId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCats, setSelectedCats] = useState(() => new Set());

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('draft');
  const [articleType, setArticleType] = useState('haber');
  const [isFeatured, setIsFeatured] = useState(false);

  const [relatedQuery, setRelatedQuery] = useState('');
  const [relatedResults, setRelatedResults] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedSelected, setRelatedSelected] = useState([]);

  const loadCategories = async () => {
    const res = await fetch('/api/admin/blog/categories');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Kategoriler yüklenemedi');
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  };

  const loadPost = async () => {
    const res = await fetch(`/api/admin/blog/posts/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Yazı yüklenemedi');
    const p = data.post || {};

    setTitle(p.title || '');
    setSlug(p.slug || '');
    setExcerpt(p.excerpt || '');
    setContentHtml(p.content_html || '');
    setCoverUrl(p.cover_image_url || '');
    setUserId(p.user_id ? String(p.user_id) : '');
    setStatus(p.status || 'draft');
    setArticleType(p.article_type || 'haber');
    setIsFeatured(Boolean(p.is_featured));

    setSelectedCats(new Set((data.category_ids || []).map((x) => Number(x)).filter(Boolean)));
    setRelatedSelected(
      (data.related_product_display_ids || [])
        .map((x) => normalizeDisplayId(x))
        .filter((x) => x != null)
        .map((x) => ({ id: x, name: `Vitrin #${x}` }))
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage({ type: '', text: '' });
      try {
        await Promise.all([loadCategories(), loadPost()]);
      } catch (e) {
        if (!cancelled) setMessage({ type: 'err', text: e?.message || 'Hata' });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingCats(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRelatedLoading(true);
      try {
        const q = new URLSearchParams({ limit: '30' });
        const t = relatedQuery.trim();
        if (t) q.set('search', t);
        const res = await fetch(`/api/admin/blog/product-displays?${q}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || 'Ürünler yüklenemedi');
        setRelatedResults(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setRelatedResults([]);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [relatedQuery]);

  const toggleCat = (catId) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const addRelatedProduct = (p) => {
    const rid = normalizeDisplayId(p?.id);
    if (rid == null) return;
    setRelatedSelected((prev) => {
      if (prev.some((x) => x.id === rid)) return prev;
      const label = [p?.name, p?.brand].filter(Boolean).join(' · ') || `Vitrin #${rid}`;
      return [...prev, { id: rid, name: label }];
    });
  };

  const removeRelatedProduct = (rid) => {
    setRelatedSelected((prev) => prev.filter((x) => x.id !== rid));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          content_html: contentHtml,
          cover_image_url: coverUrl.trim() || undefined,
          user_id: userId.trim() === '' ? undefined : userId.trim(),
          status,
          article_type: articleType,
          is_featured: isFeatured,
          category_ids: [...selectedCats],
          related_product_display_ids: relatedSelected.map((x) => x.id),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Kayıt başarısız');
      setMessage({ type: 'ok', text: 'Yazı güncellendi.' });
      // keep form as-is
    } catch (err) {
      setMessage({ type: 'err', text: err?.message || 'Hata' });
    } finally {
      setSaving(false);
    }
  };

  const pickedIds = useMemo(() => new Set(relatedSelected.map((x) => x.id)), [relatedSelected]);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <h3 className={styles.sectionTitle}>Blog yazısı düzenle</h3>
        <p className={styles.intro}>Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h3 className={styles.sectionTitle}>Blog yazısı düzenle</h3>
      <p className={styles.intro}>
        Post id: <code>{id}</code>
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="blog-title">
            Başlık *
          </label>
          <input
            id="blog-title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={250}
          />
        </div>

        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="blog-slug">
              Slug
            </label>
            <input
              id="blog-slug"
              className={styles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="blog-status">
              Durum *
            </label>
            <select
              id="blog-status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="blog-article-type">
              Makale türü *
            </label>
            <select
              id="blog-article-type"
              className={styles.select}
              value={articleType}
              onChange={(e) => setArticleType(e.target.value)}
              required
            >
              <option value="duyuru">duyuru</option>
              <option value="haber">haber</option>
              <option value="öğretici">öğretici</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="blog-excerpt">
            Özet (excerpt)
          </label>
          <textarea
            id="blog-excerpt"
            className={styles.textarea}
            style={{ minHeight: 72 }}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="blog-html">
            İçerik (HTML) *
          </label>
          <textarea
            id="blog-html"
            className={styles.textarea}
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
            required
            placeholder="<p>...</p>"
          />
        </div>

        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="blog-cover">
              Kapak görseli URL
            </label>
            <input
              id="blog-cover"
              className={styles.input}
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="blog-user">
              Yazar user_id (opsiyonel)
            </label>
            <input
              id="blog-user"
              className={styles.input}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              inputMode="numeric"
              placeholder="users.id"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Öne çıkan (is_featured)
          </label>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Blog kategorileri</span>
          {loadingCats ? (
            <span className={styles.hint}>Yükleniyor…</span>
          ) : categories.length === 0 ? (
            <span className={styles.hint}>Kategori yok.</span>
          ) : (
            <div className={styles.catList}>
              {categories.map((c) => (
                <label key={c.id} className={styles.catItem}>
                  <input
                    type="checkbox"
                    checked={selectedCats.has(Number(c.id))}
                    onChange={() => toggleCat(Number(c.id))}
                  />
                  <span>
                    {c.name} <span className={styles.hint}>({c.slug})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>İlgili vitrin ürünleri</span>
          {relatedSelected.length > 0 && (
            <div className={styles.relatedChips}>
              {relatedSelected.map((item) => (
                <span key={item.id} className={styles.relatedChip}>
                  <span className={styles.relatedChipId}>#{item.id}</span>
                  <span className={styles.relatedChipName}>{item.name}</span>
                  <button
                    type="button"
                    className={styles.relatedChipRemove}
                    onClick={() => removeRelatedProduct(item.id)}
                    aria-label="Kaldır"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            className={styles.input}
            value={relatedQuery}
            onChange={(e) => setRelatedQuery(e.target.value)}
            placeholder="İsim, marka veya vitrin id ile ara…"
            autoComplete="off"
          />
          <div className={styles.relatedList}>
            {relatedLoading ? (
              <span className={`${styles.hint} ${styles.relatedListHint}`}>Yükleniyor…</span>
            ) : relatedResults.length === 0 ? (
              <span className={`${styles.hint} ${styles.relatedListHint}`}>Sonuç yok.</span>
            ) : (
              relatedResults.map((row) => {
                const rid = normalizeDisplayId(row.id);
                const picked = rid != null && pickedIds.has(rid);
                return (
                  <div key={String(row.id)} className={styles.relatedRow}>
                    <div className={styles.relatedRowMain}>
                      <span className={styles.relatedRowId}>#{row.id}</span>
                      <span className={styles.relatedRowTitle}>{row.name || '—'}</span>
                      {row.brand ? <span className={styles.relatedRowMeta}>{row.brand}</span> : null}
                      {row.category_name ? (
                        <span className={styles.relatedRowMeta}>{row.category_name}</span>
                      ) : null}
                      {row.status ? <span className={styles.relatedRowStatus}>{row.status}</span> : null}
                    </div>
                    <button
                      type="button"
                      className={styles.relatedAddBtn}
                      disabled={picked || rid == null}
                      onClick={() => addRelatedProduct(row)}
                    >
                      {picked ? 'Eklendi' : 'Ekle'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.submit} type="submit" disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Güncelle'}
          </button>
          {message.type === 'ok' && <span className={styles.msgOk}>{message.text}</span>}
          {message.type === 'err' && <span className={styles.msgErr}>{message.text}</span>}
        </div>
      </form>
    </div>
  );
}

