import { notFound } from 'next/navigation';
import { query } from '~/lib/db';
import { publicImageUrl } from '~/lib/imageUrls';
import styles from './post.module.css';
import { ProductCard } from '~/app/components/ProductCard';
import BlogComments from './BlogComments';

function typeToCategoryLabel(type) {
  const t = String(type || '').toLocaleLowerCase('tr-TR');
  if (t === 'duyuru') return 'Duyuru';
  if (t === 'haber') return 'Haber';
  if (t === 'öğretici' || t === 'ogretici') return 'Öğretici';
  return 'Haber';
}

function formatAuthor(row) {
  const first = String(row?.first_name || '').trim();
  const last = String(row?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || 'Noya';
}

function formatDate(isoLike) {
  try {
    return new Date(isoLike).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

export default async function BlogPostPage({ params }) {
  const slug = String(params?.slug || '').trim();
  if (!slug) notFound();

  let post;
  try {
    const { rows } = await query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.content_html, p.cover_image_url, p.article_type,
              p.published_at, p.created_at,
              u.first_name, u.last_name
       FROM blog_posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.slug = $1
         AND p.status = 'published'
       LIMIT 1`,
      [slug]
    );
    post = rows?.[0] || null;
  } catch (e) {
    console.error('blog post page: failed to load post:', e?.message || e);
    post = null;
  }

  if (!post) notFound();

  const coverUrl = publicImageUrl(post.cover_image_url) || '/blog-main-2.jpg';
  const category = typeToCategoryLabel(post.article_type);
  const author = formatAuthor(post);
  const dateLabel = formatDate(post.published_at || post.created_at);

  let relatedProducts = [];
  try {
    const { rows } = await query(
      `SELECT
        pd.id AS product_id,
        pd.name AS product_name,
        pd.brand,
        pd.min_price,
        pd.max_price,
        pd.price_array,
        pd.size_array,
        pd.default_size,
        img.thumb_url,
        img.original_url
      FROM blog_post_related_products r
      JOIN product_display pd ON pd.id = r.product_id
      LEFT JOIN LATERAL (
        SELECT thumb_url, original_url
        FROM images
        WHERE display_id = pd.id
          AND COALESCE(hide, FALSE) = FALSE
          AND COALESCE(in_thumb, TRUE) = TRUE
        ORDER BY is_primary DESC, order_index, id
        LIMIT 1
      ) img ON TRUE
      WHERE r.post_id = $1
      ORDER BY pd.created_at DESC
      LIMIT 24`,
      [post.id]
    );

    relatedProducts = (rows || []).map((r) => ({
      product_id: Number(r.product_id),
      product_name: r.product_name,
      brand: r.brand,
      min_price: r.min_price,
      max_price: r.max_price,
      price_array: r.price_array,
      size_array: r.size_array,
      default_size: r.default_size,
      primary_image_url: publicImageUrl(r.thumb_url) || publicImageUrl(r.original_url) || null,
    }));
  } catch (e) {
    console.error('blog post page: failed to load related products:', e?.message || e);
    relatedProducts = [];
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local public images + external blob urls */}
          <img className={styles.heroImg} src={coverUrl} alt="" />
          <div className={styles.heroOverlay} aria-hidden />
          <div className={styles.heroText}>
            <h1 className={styles.title}>{post.title}</h1>
            <div className={styles.meta}>
              <span className={styles.pill}>{category}</span>
              <span className={styles.pill}>{author}</span>
              {dateLabel && <span className={styles.pill}>{dateLabel}</span>}
            </div>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <section className={styles.card} aria-label="Özet">
            <h2 className={styles.sectionTitle}>Özet</h2>
            <p className={styles.excerpt}>{post.excerpt || '—'}</p>
          </section>

          {relatedProducts.length > 0 && (
            <section className={styles.card} aria-label="İlgili ürünler">
              <h2 className={styles.sectionTitle}>İlgili Ürünler</h2>
              <div className={styles.relatedTrack}>
                {relatedProducts.map((p) => (
                  <ProductCard key={p.product_id} product={p} source="blog" enableHoverGallery={false} />
                ))}
              </div>
            </section>
          )}

          <section className={styles.card} aria-label="Yazı">
            <h2 className={styles.sectionTitle}>Yazı</h2>
            <div
              className={styles.html}
              // content_html is authored in admin; assume trusted HTML (sanitize upstream if needed).
              dangerouslySetInnerHTML={{ __html: post.content_html || '' }}
            />
          </section>

          <BlogComments slug={slug} />
        </div>
      </div>
    </div>
  );
}

