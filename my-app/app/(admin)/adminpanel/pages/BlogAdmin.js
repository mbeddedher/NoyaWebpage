'use client';

import { useEffect, useState } from 'react';
import styles from './AddBlogPost.module.css';

/** @param {unknown} id */
function normalizeDisplayId(id) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function BlogAdmin() {
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('draft');
  const [articleType, setArticleType] = useState('haber');
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedCats, setSelectedCats] = useState(() => new Set());
  const [relatedQuery, setRelatedQuery] = useState('');
  const [relatedResults, setRelatedResults] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedSelected, setRelatedSelected] = useState([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [catMessage, setCatMessage] = useState({ type: '', text: '' });

  const loadCategories = async () => {
    const res = await fetch('/api/admin/blog/categories');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Kategoriler yüklenemedi');
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/blog/categories');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || 'Kategoriler yüklenemedi');
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (e) {
        if (!cancelled) {
          setCategories([]);
          setMessage({ type: 'err', text: e?.message || 'Kategoriler yüklenemedi' });
        }
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const onAddCategory = async (e) => {
    e.preventDefault();
    setCatMessage({ type: '', text: '' });
    setSavingCat(true);
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          slug: catSlug.trim() || undefined,
          description: catDesc.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Kategori kaydedilemedi');

      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setCatMessage({ type: 'ok', text: `Kategori eklendi: ${data.category?.name} (${data.category?.slug})` });
      await loadCategories();
    } catch (err) {
      setCatMessage({ type: 'err', text: err?.message || 'Hata' });
    } finally {
      setSavingCat(false);
    }
  };

  const toggleCat = (id) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRelatedProduct = (p) => {
    const id = normalizeDisplayId(p?.id);
    if (id == null) return;
    setRelatedSelected((prev) => {
      if (prev.some((x) => x.id === id)) return prev;
      const label = [p?.name, p?.brand].filter(Boolean).join(' · ') || `Vitrin #${id}`;
      return [...prev, { id, name: label }];
    });
  };

  const removeRelatedProduct = (id) => {
    setRelatedSelected((prev) => prev.filter((x) => x.id !== id));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blog/posts', {
        method: 'POST',
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

      setTitle('');
      setSlug('');
      setExcerpt('');
      setContentHtml('');
      setCoverUrl('');
      setUserId('');
      setStatus('draft');
      setArticleType('haber');
      setIsFeatured(false);
      setSelectedCats(new Set());
      setRelatedSelected([]);
      setRelatedQuery('');
      setMessage({ type: 'ok', text: `Yazı oluşturuldu (id: ${data.post?.id}).` });
    } catch (err) {
      setMessage({ type: 'err', text: err?.message || 'Hata' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <h3 className={styles.sectionTitle}>Blog kategorisi ekle</h3>
      <p className={styles.intro}>
        Tablo: <code>blog_categories</code> (<code>name</code>, benzersiz <code>slug</code>, isteğe bağlı{' '}
        <code>description</code>). Slug boşsa isimden üretilir; çakışırsa sonuna <code>-2</code>, <code>-3</code>…
        eklenir.
      </p>
      <form className={styles.form} onSubmit={onAddCategory}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bc-name">
            Kategori adı *
          </label>
          <input
            id="bc-name"
            className={styles.input}
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
            maxLength={100}
          />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bc-slug">
              Slug (boş bırakılırsa adından)
            </label>
            <input
              id="bc-slug"
              className={styles.input}
              value={catSlug}
              onChange={(e) => setCatSlug(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bc-desc">
              Açıklama
            </label>
            <input
              id="bc-desc"
              className={styles.input}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Opsiyonel"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.submit} type="submit" disabled={savingCat}>
            {savingCat ? 'Kaydediliyor…' : 'Kategoriyi kaydet'}
          </button>
          {catMessage.type === 'ok' && <span className={styles.msgOk}>{catMessage.text}</span>}
          {catMessage.type === 'err' && <span className={styles.msgErr}>{catMessage.text}</span>}
        </div>
      </form>

      <hr className={styles.divider} />

      <h3 className={styles.sectionTitle}>Blog yazısı ekle</h3>
      <p className={styles.intro}>
        Şema: <code>blog_posts</code>, isteğe bağlı <code>blog_post_categories</code>, ilgili vitrin ürünleri{' '}
        <code>blog_post_related_products</code>. Burada <strong>product_id</strong>,{' '}
        <strong>product_display.id</strong> değeridir (ürün tablosu değil).
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
              Slug (boş bırakılırsa başlıktan üretilir)
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
            <span className={styles.hint}>Veritabanı: blog_posts.article_type (enum)</span>
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
          <span className={styles.hint}>Veritabanı alanı: content_html</span>
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
            <span className={styles.hint}>
              Henüz kategori yok. Önce <code>blog_categories</code> tablosuna kayıt ekleyin.
            </span>
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
          <span className={styles.hint}>
            Aşağıdan arayıp ekleyin; kayıtta <code>product_display.id</code> kullanılır. Boş aramada son eklenen
            vitrinler listelenir.
          </span>
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
            id="blog-related-search"
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
                const id = normalizeDisplayId(row.id);
                const picked = id != null && relatedSelected.some((x) => x.id === id);
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
                      disabled={picked || id == null}
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
            {saving ? 'Kaydediliyor…' : 'Yazıyı kaydet'}
          </button>
          {message.type === 'ok' && <span className={styles.msgOk}>{message.text}</span>}
          {message.type === 'err' && <span className={styles.msgErr}>{message.text}</span>}
        </div>
      </form>
    </div>
  );
}
