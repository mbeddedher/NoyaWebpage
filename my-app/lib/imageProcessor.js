import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

/* Thumb ratio 28:42 (width:height); crop to this ratio as large as possible, then resize */
const THUMB_RATIO_W = 28;
const THUMB_RATIO_H = 42;
const THUMB_WIDTH = 280;
const THUMB_HEIGHT = 420; // THUMB_WIDTH * (THUMB_RATIO_H / THUMB_RATIO_W)

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

/**
 * Generate thumb, medium, and large WebP versions from an original on disk.
 * @param {string} originalFilename – bare filename in DB (e.g. "id.webp" or legacy "id.jpg")
 * @returns {{ thumb_url, medium_url, large_url, original_url }}
 */
export async function generateImageVersions(originalFilename) {
  const cleanName = originalFilename
    .replace(/^\/?(public\/)?(images\/)+/, '')
    .replace(/^\/+/, '');

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
 * Delete all generated versions for an image.
 * @param {string} originalFilename
 */
export async function deleteImageVersions(originalFilename) {
  const cleanName = originalFilename
    .replace(/^\/?(public\/)?(images\/)+/, '')
    .replace(/^\/+/, '');

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
}
