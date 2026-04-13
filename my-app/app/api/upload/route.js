import { mkdir, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { isBlobStorageEnabled } from '~/lib/imageUrls';

const THUMB_WIDTH = 280;
const THUMB_HEIGHT = 420;

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

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

    const thumbWebpBuf = await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
      .webp({ quality: 70, effort: 4 })
      .toBuffer();

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

    const imagesDir = join(process.cwd(), 'public', 'images');
    const thumbDir = join(imagesDir, 'thumb');
    await mkdir(imagesDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const originalPath = join(imagesDir, fileName);
    const thumbPathFs = join(thumbDir, fileName);
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
