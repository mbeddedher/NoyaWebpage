import BlogPageClient from './BlogPageClient';
import styles from './blog.module.css';
import { query } from '~/lib/db';
import { publicImageUrl } from '~/lib/imageUrls';

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

export default async function BlogPage() {
  let posts = [];
  try {
    const { rows } = await query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.cover_image_url, p.article_type,
              p.published_at, p.created_at,
              u.first_name, u.last_name
       FROM blog_posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
       LIMIT 200`
    );

    posts = (rows || []).map((r) => ({
      id: String(r.id),
      slug: String(r.slug || ''),
      category: typeToCategoryLabel(r.article_type),
      title: r.title,
      foreword: r.excerpt || '',
      imageUrl: publicImageUrl(r.cover_image_url) || '/blog-main-2.jpg',
      author: formatAuthor(r),
      createdAt: (() => {
        const d = r.published_at || r.created_at;
        if (!d) return new Date().toISOString();
        try {
          return new Date(d).toISOString();
        } catch {
          return String(d);
        }
      })(),
    }));
  } catch (e) {
    console.error('blog page: failed to load posts from db:', e?.message || e);
    posts = [];
  }

  return (
    <section className={styles.section} aria-label="Blog">
      <div className={styles.container}>
        <BlogPageClient posts={posts} />
      </div>
    </section>
  );
}

