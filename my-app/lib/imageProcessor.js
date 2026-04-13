import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { put, del } from '@vercel/blob';
import { normalizeStoredImageRef, isBlobStorageEnabled } from './imageUrls.js';

/**
 * Like generateImageVersions, but if the source file/blob is missing (404, etc.),
 * keep the row usable using URLs already on the payload (thumb_url / cart_url / medium / large).
 */
export async function generateImageVersionsWithFallback(imageLike) {
  const refRaw = String(imageLike?.original_url || imageLike?.url || '').trim();
  if (!refRaw) {
    throw new Error('Missing image reference');
  }
  try {
    return await generateImageVersions(refRaw);
  } catch (err) {
    const msg = String(err?.message || '');
    const isMissing =
      msg.includes('404') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Not Found');
    if (!isMissing) throw err;
    console.warn(
      'generateImageVersions: source unavailable, using client URLs',
      refRaw,
      msg
    );
    const original_url = /^https?:\/\//i.test(refRaw)
      ? refRaw
      : normalizeStoredImageRef(refRaw) || refRaw;
    const thumb = imageLike.thumb_url || imageLike.cart_url || null;
    return {
      original_url,
      thumb_url: thumb || (/^https?:\/\//i.test(original_url) ? original_url : null),
      medium_url: imageLike.medium_url || null,
      large_url: imageLike.large_url || null,
    };
  }
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

const THUMB_WIDTH = 280;
const THUMB_HEIGHT = 420;

const SIZE_CONFIGS = {
  thumb:  { width: THUMB_WIDTH, height: THUMB_HEIGHT, quality: 70, fit: 'cover' },
  medium: { width: 600,  quality: 80 },
  large:  { width: 1200, quality: 85 },
};

/** Derivative files are always stored as .webp (basename matches original stem). */
export function derivativeWebpFilename(originalFilename) {
  const clean = originalFilename
    .replace(/^\/?(public\/)?(images\/)+/, '')
    .replace(/^\/+/, '');
  return `${path.parse(clean).name}.webp`;
}

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function stemFromRemoteUrl(sourceUrl) {
  const pathname = new URL(sourceUrl).pathname;
  const baseName = path.basename(pathname) || `image-${Date.now()}.webp`;
  return path.parse(baseName).name;
}

/**
 * Build resized WebP buffer from source buffer.
 */
async function resizeToWebpBuffer(buf, config) {
  let pipeline = sharp(buf);
  let resizeOptions;
  if (config.fit === 'cover' && config.width && config.height) {
    resizeOptions = { width: config.width, height: config.height, fit: 'cover', position: 'center' };
  } else if (config.fit === 'inside' && config.height) {
    resizeOptions = { width: config.width, height: config.height, fit: 'inside', withoutEnlargement: true };
  } else {
    resizeOptions = { width: config.width, withoutEnlargement: true };
  }
  return pipeline.resize(resizeOptions).webp({ quality: config.quality, effort: 4 }).toBuffer();
}

/**
 * From a public blob URL (original), create thumb/medium/large on Vercel Blob.
 */
async function generateFromRemoteBlob(sourceUrl) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is missing. Add it in Vercel project env to store and process images.'
    );
  }

  const buf = await fetchImageBuffer(sourceUrl);
  const stem = stemFromRemoteUrl(sourceUrl);
  const outBase = `${stem}.webp`;
  const results = { original_url: sourceUrl };

  for (const [sizeName, config] of Object.entries(SIZE_CONFIGS)) {
    const pathname = `images/${sizeName}/${outBase}`;
    try {
      const outBuf = await resizeToWebpBuffer(buf, config);
      const blob = await put(pathname, outBuf, {
        access: 'public',
        token,
        addRandomSuffix: false,
      });
      results[`${sizeName}_url`] = blob.url;
    } catch (err) {
      console.error(`Failed to generate blob ${sizeName} for ${stem}:`, err.message);
      throw err;
    }
  }

  return results;
}

/**
 * Generate thumb, medium, and large WebP versions from a local file or remote blob URL.
 * @returns {{ thumb_url, medium_url, large_url, original_url }} — DB stores relative paths locally, full URLs on Blob.
 */
export async function generateImageVersions(originalRef) {
  const ref = normalizeStoredImageRef(originalRef);
  if (!ref) {
    throw new Error('Missing image reference');
  }

  if (/^https?:\/\//i.test(ref)) {
    return generateFromRemoteBlob(ref);
  }

  const cleanName = ref;
  const sourcePath = path.join(IMAGES_DIR, cleanName);
  const outBase = derivativeWebpFilename(cleanName);

  try {
    await fs.access(sourcePath);
  } catch {
    console.warn(`Source image not found at ${sourcePath}, storing URL-only references`);
    return {
      original_url: cleanName,
      thumb_url:  `thumb/${outBase}`,
      medium_url: `medium/${outBase}`,
      large_url:  `large/${outBase}`,
    };
  }

  const results = { original_url: cleanName };

  for (const [sizeName, config] of Object.entries(SIZE_CONFIGS)) {
    const outputDir = path.join(IMAGES_DIR, sizeName);
    await ensureDir(outputDir);

    const outputPath = path.join(outputDir, outBase);

    try {
      let resizeOptions;
      if (config.fit === 'cover' && config.width && config.height) {
        resizeOptions = { width: config.width, height: config.height, fit: 'cover', position: 'center' };
      } else if (config.fit === 'inside' && config.height) {
        resizeOptions = { width: config.width, height: config.height, fit: 'inside', withoutEnlargement: true };
      } else {
        resizeOptions = { width: config.width, withoutEnlargement: true };
      }
      await sharp(sourcePath)
        .resize(resizeOptions)
        .webp({ quality: config.quality, effort: 4 })
        .toFile(outputPath);

      results[`${sizeName}_url`] = `${sizeName}/${outBase}`;
    } catch (err) {
      console.error(`Failed to generate ${sizeName} for ${cleanName}:`, err.message);
      results[`${sizeName}_url`] = `${sizeName}/${outBase}`;
    }
  }

  return results;
}

/**
 * Remove stored image assets (Vercel Blob and/or local derivatives).
 * @param {string|{ original_url?, thumb_url?, medium_url?, large_url? }} rowOrOriginal
 */
export async function deleteImageVersions(rowOrOriginal) {
  const row =
    typeof rowOrOriginal === 'string'
      ? { original_url: rowOrOriginal }
      : rowOrOriginal || {};

  const candidates = [row.original_url, row.thumb_url, row.medium_url, row.large_url].filter(Boolean);
  const blobUrls = [...new Set(candidates.filter((u) => /^https?:\/\//i.test(String(u).trim())))];

  if (blobUrls.length > 0 && isBlobStorageEnabled()) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    for (const u of blobUrls) {
      try {
        await del(u, { token });
      } catch (e) {
        console.warn('Blob delete failed:', u, e.message);
      }
    }
  }

  const orig = String(row.original_url || '').trim();
  if (/^https?:\/\//i.test(orig)) {
    return;
  }

  const cleanName = orig
    .replace(/^\/?(public\/)?(images\/)+/, '')
    .replace(/^\/+/, '');
  if (!cleanName) return;

  const webpName = derivativeWebpFilename(cleanName);
  const names = webpName === cleanName ? [cleanName] : [cleanName, webpName];

  for (const sizeName of Object.keys(SIZE_CONFIGS)) {
    for (const name of names) {
      try {
        await fs.unlink(path.join(IMAGES_DIR, sizeName, name));
      } catch {
        // file may not exist
      }
    }
  }

  try {
    await fs.unlink(path.join(IMAGES_DIR, cleanName));
  } catch {
    // original may not exist or path differs
  }
}
