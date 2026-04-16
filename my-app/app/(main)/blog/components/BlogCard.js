import Link from 'next/link';
import styles from './BlogCard.module.css';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function BlogCard({ article }) {
  const href = article?.slug ? `/blog/${article.slug}` : '/blog';
  return (
    <article className={styles.card}>
      <Link href={href} className={styles.link} aria-label={article?.title || 'Blog yazısı'}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local public images */}
        <img className={styles.image} src={article.imageUrl} alt="" loading="lazy" />

        <div className={styles.body}>
          <div className={styles.topRow}>
            <span className={styles.category}>{article.category}</span>
            <span className={styles.dot} aria-hidden>
              •
            </span>
            <span className={styles.date}>{formatDate(article.createdAt)}</span>
          </div>

          <h2 className={styles.title}>{article.title}</h2>
          <p className={styles.foreword}>{article.foreword}</p>

          <div className={styles.bottomRow}>
            <span className={styles.author}>{article.author}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

