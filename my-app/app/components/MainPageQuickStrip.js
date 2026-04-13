'use client';

import Link from 'next/link';
import { HOME_QUICK_LINKS } from '../data/homeQuickLinks';
import styles from './MainPageQuickStrip.module.css';

/**
 * Custom homepage strip: 200×75 tiles, 10px gap.
 * As many tiles per row as fit (CSS grid auto-fill).
 * Customize entries in `app/data/homeQuickLinks.js`.
 *
 * @param {{ items?: Array<{ id: string, label: string, href: string, imageSrc?: string }> }} props
 */
export default function MainPageQuickStrip({ items = HOME_QUICK_LINKS }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Quick links">
      <div className={styles.grid}>
        {items.map((item) => {
          const hasImage = Boolean(item.imageSrc?.trim());
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`${styles.tile} ${hasImage ? styles.tileHasImage : ''}`}
            >
              {hasImage && (
                <>
                  <span
                    className={styles.bgImage}
                    style={{ backgroundImage: `url(${item.imageSrc})` }}
                    role="img"
                    aria-hidden
                  />
                  <span className={styles.bgScrim} aria-hidden />
                </>
              )}
              <span className={`${styles.label} ${hasImage ? '' : styles.labelPlain}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
