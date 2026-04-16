export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Normalize a stored image reference for processing (local basename/path or full blob URL).
 */
export function normalizeStoredImageRef(raw) {
  const s = (raw || '').trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  let u = s.replace(/^\/?(public\/)?(images\/)+/, '');
  u = u.replace(/^\/?(thumbnails\/)+/, '');
  u = u.replace(/thumbnails/g, '');
  return u.replace(/^\/+/, '');
}

/**
 * Value from DB or API → URL for <img> / next/image (local /images/... or absolute blob URL).
 */
export function publicImageUrl(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const s = stored.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) {
    // We store generated thumbs as .webp. Some older rows/clients still reference .jpg/.png.
    // Only rewrite for thumbs to avoid changing original images unexpectedly.
    if (/^\/images\/thumb\//i.test(s) && !/\.webp(\?|#|$)/i.test(s)) {
      return s.replace(/\.(png|jpe?g|gif)(\?|#|$)/i, '.webp$2');
    }
    return s;
  }
  const cleaned = s.replace(/^\/?(images\/)+/, '');
  const out = `/images/${cleaned}`;
  if (/^\/images\/thumb\//i.test(out) && !/\.webp(\?|#|$)/i.test(out)) {
    return out.replace(/\.(png|jpe?g|gif)(\?|#|$)/i, '.webp$2');
  }
  return out;
}
