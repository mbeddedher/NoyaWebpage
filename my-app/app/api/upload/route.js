import { mkdir, stat } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const THUMB_WIDTH = 280;
const THUMB_HEIGHT = 420;

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { status: 400 }
      );
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

    const uniqueFileName = `${uuidv4()}.webp`;

    const imagesDir = join(process.cwd(), 'public', 'images');
    const thumbDir = join(imagesDir, 'thumb');

    await mkdir(imagesDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const imageInfo = await sharp(buffer).metadata();

    const originalPath = join(imagesDir, uniqueFileName);
    await sharp(buffer)
      .webp({ quality: 90, effort: 4 })
      .toFile(originalPath);

    const thumbPath = join(thumbDir, uniqueFileName);
    await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
      .webp({ quality: 70, effort: 4 })
      .toFile(thumbPath);

    const { size: storedBytes } = await stat(originalPath);

    return new Response(
      JSON.stringify({
        url: `/images/${uniqueFileName}`,
        cart_url: `/images/thumb/${uniqueFileName}`,
        resolution: `${imageInfo.width}x${imageInfo.height}`,
        format: 'WEBP',
        file_size: Math.max(1, Math.round(storedBytes / 1024)),
        cart_dimensions: { width: THUMB_WIDTH, height: THUMB_HEIGHT }
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing upload:', error);
    const message = error.message?.includes('Unsupported')
      ? 'Invalid or unsupported image file'
      : 'Failed to process upload';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500 }
    );
  }
}
