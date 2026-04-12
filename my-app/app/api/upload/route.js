import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

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

    // Convert file to buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file info
    const originalName = file.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowedExtensions.includes(extension)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` }), 
        { status: 400 }
      );
    }
    const uniqueFileName = `${uuidv4()}.${extension}`;
    
    // Set up directory paths - align with imageProcessor (images/, images/thumb/)
    const imagesDir = join(process.cwd(), 'public', 'images');
    const thumbDir = join(imagesDir, 'thumb');

    // Ensure directories exist
    await mkdir(imagesDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    // Process original image with sharp to get metadata
    const imageInfo = await sharp(buffer).metadata();

    // Save original image to images directory (required by generateImageVersions in product-displays)
    const originalPath = join(imagesDir, uniqueFileName);
    await writeFile(originalPath, buffer);

    // Thumbnail ratio 28:42; center-crop original to this ratio as large as possible, then resize
    const THUMB_RATIO_W = 28;
    const THUMB_RATIO_H = 42;
    const THUMB_WIDTH = 280;
    const THUMB_HEIGHT = 420;
    const thumbPath = join(thumbDir, uniqueFileName);
    const thumbFileName = uniqueFileName.replace(/\.(png|webp|gif)$/i, '.jpg');
    await sharp(buffer)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 70, mozjpeg: true })
      .toFile(join(thumbDir, thumbFileName));

    // Return URLs - url is used as original_url by AddProductDisplay; cart_url for preview
    return new Response(
      JSON.stringify({
        url: `/images/${uniqueFileName}`,
        cart_url: `/images/thumb/${thumbFileName}`,
        resolution: `${imageInfo.width}x${imageInfo.height}`,
        format: imageInfo.format,
        file_size: Math.round(buffer.length / 1024), // Convert to KB
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