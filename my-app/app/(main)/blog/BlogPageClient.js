'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import styles from './blog.module.css';
import BlogCard from './components/BlogCard';

function normalize(s) {
  return String(s || '').toLocaleLowerCase('tr-TR');
}

export default function BlogPageClient({ posts = [] }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState('Hepsi');

  const filtered = useMemo(() => {
    const query = normalize(q).trim();
    return posts.filter((p) => {
      if (selected !== 'Hepsi') {
        const cat = String(p?.category || '').trim();
        if (cat !== selected) return false;
      }
      const hay = `${p?.title || ''}\n${p?.foreword || ''}`;
      if (!query) return true;
      return normalize(hay).includes(query);
    });
  }, [posts, q, selected]);

  return (
    <>
      <div className={styles.hero}>
        <Image
          src="/blog-main-2.jpg"
          alt=""
          fill
          priority
          className={styles.heroImage}
          sizes="100vw"
          quality={95}
        />
        <div className={styles.heroOverlay} aria-hidden />

        <div className={styles.heroContent}>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>Duyurular, yazılar ve linkler.</p>

          <div className={styles.searchOnHero}>
            <input
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Yazılarda ara…"
              aria-label="Blog arama"
            />

            <div className={styles.filters} role="radiogroup" aria-label="Blog kategorileri">
              {['Hepsi', 'Duyuru', 'Haber', 'Öğretici'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`${styles.filterChip} ${selected === label ? styles.filterChipActive : ''}`}
                  onClick={() => setSelected(label)}
                  aria-checked={selected === label}
                  role="radio"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Sonuç bulunamadı.</div>
        ) : (
          filtered.map((p) => (
            <BlogCard key={p.id} article={p} />
          ))
        )}
      </div>
    </>
  );
}

