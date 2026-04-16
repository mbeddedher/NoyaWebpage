import { access, mkdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { isBlobStorageEnabled } from '~/lib/imageUrls';

const THUMB_WIDTH = 280;
const THUMB_HEIGHT = 420;

async function resolvePublicImagesDir() {
  // In a monorepo, process.cwd() may be the repo root or the Next app root.
  // We want the Next app's "public/images" directory.
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'public', 'images'),
    path.join(cwd, 'my-app', 'public', 'images'),
  ];

  for (const p of candidates) {
    try {
      await access(p);
      return p;
    } catch {
      // keep trying
    }
  }
  // Default to first candidate; mkdir will create it.
  return candidates[0];
}

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');
    const cropRaw = data.get('crop');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowedExtensions.includes(extension)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` }),
        { status: 400 }
      );
    }

    const id = uuidv4();
    const fileName = `${id}.webp`;

    const imageInfo = await sharp(buffer).metadata();

    const originalWebpBuf = await sharp(buffer)
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    let crop = null;
    if (typeof cropRaw === 'string' && cropRaw.trim()) {
      try {
        crop = JSON.parse(cropRaw);
      } catch {
        crop = null;
      }
    }

    const imgW = Number(imageInfo.width);
    const imgH = Number(imageInfo.height);

    const hasCrop =
      crop &&
      Number.isFinite(Number(crop.x)) &&
      Number.isFinite(Number(crop.y)) &&
      Number.isFinite(Number(crop.width)) &&
      Number.isFinite(Number(crop.height)) &&
      Number(crop.width) > 1 &&
      Number(crop.height) > 1 &&
      Number.isFinite(imgW) &&
      Number.isFinite(imgH) &&
      imgW > 1 &&
      imgH > 1;

    const safeCrop = hasCrop
      ? {
          left: Math.max(0, Math.min(imgW - 1, Math.round(Number(crop.x)))),
          top: Math.max(0, Math.min(imgH - 1, Math.round(Number(crop.y)))),
          width: Math.max(1, Math.min(imgW, Math.round(Number(crop.width)))),
          height: Math.max(1, Math.min(imgH, Math.round(Number(crop.height)))),
        }
      : null;

    // Clamp crop so it always stays inside the image
    if (safeCrop) {
      if (safeCrop.left + safeCrop.width > imgW) safeCrop.width = Math.max(1, imgW - safeCrop.left);
      if (safeCrop.top + safeCrop.height > imgH) safeCrop.height = Math.max(1, imgH - safeCrop.top);
    }

    const thumbBase = safeCrop
      ? sharp(buffer)
          .extract(safeCrop)
          .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
      : sharp(buffer).resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' });

    const thumbWebpBuf = await thumbBase.webp({ quality: 70, effort: 4 }).toBuffer();

    if (isBlobStorageEnabled()) {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const origPath = `images/${fileName}`;
      const thumbPath = `images/thumb/${fileName}`;
      const putOpts = { access: 'public', token, addRandomSuffix: false };
      const origBlob = await put(origPath, originalWebpBuf, putOpts);
      const thumbBlob = await put(thumbPath, thumbWebpBuf, putOpts);

      return new Response(
        JSON.stringify({
          url: origBlob.url,
          cart_url: thumbBlob.url,
          resolution: `${imageInfo.width}x${imageInfo.height}`,
          format: 'WEBP',
          file_size: Math.max(1, Math.round(originalWebpBuf.length / 1024)),
          cart_dimensions: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
        }),
        { status: 200 }
      );
    }

    const imagesDir = await resolvePublicImagesDir();
    const thumbDir = path.join(imagesDir, 'thumb');
    await mkdir(imagesDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const originalPath = path.join(imagesDir, fileName);
    const thumbPathFs = path.join(thumbDir, fileName);
    await writeFile(originalPath, originalWebpBuf);
    await writeFile(thumbPathFs, thumbWebpBuf);

    const { size: storedBytes } = await stat(originalPath);

    return new Response(
      JSON.stringify({
        url: `/images/${fileName}`,
        cart_url: `/images/thumb/${fileName}`,
        resolution: `${imageInfo.width}x${imageInfo.height}`,
        format: 'WEBP',
        file_size: Math.max(1, Math.round(storedBytes / 1024)),
        cart_dimensions: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing upload:', error);
    const message = error.message?.includes('Unsupported')
      ? 'Invalid or unsupported image file'
      : 'Failed to process upload';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
