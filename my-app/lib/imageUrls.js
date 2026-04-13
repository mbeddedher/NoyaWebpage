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
  if (s.startsWith('/')) return s;
  const cleaned = s.replace(/^\/?(images\/)+/, '');
  return `/images/${cleaned}`;
}
