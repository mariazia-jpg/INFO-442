// Turns the chosen file into a photo the rest of the app can use: decoded,
// downscaled to at most 1024 px on the long side and re-encoded as JPEG. The
// smaller copy keeps sessionStorage within quota and speeds up recognition.

import { isHeic } from '../lib/validation.js';

const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.85;

export class ProcessingError extends Error {}

/**
 * Converts a HEIC photo to JPEG. Safari can show HEIC natively; Chrome and Edge
 * cannot, so the converter is downloaded only when it's needed.
 */
export async function convertHeic(file) {
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY });
  return Array.isArray(result) ? result[0] : result;
}

async function decode(blob) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }
  // Older Safari: fall back to an <img> element.
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeAny(file) {
  try {
    return await decode(file);
  } catch (error) {
    if (!isHeic(file)) throw error;
    return decode(await convertHeic(file));
  }
}

/**
 * @param {File} file a photo that already passed validatePhoto()
 * @returns {Promise<{photo: string, width: number, height: number}>} photo is a JPEG data URL
 * @throws {ProcessingError} when the image can't be decoded (U19)
 */
export async function processPhoto(file) {
  let image;
  try {
    image = await decodeAny(file);
  } catch (error) {
    throw new ProcessingError(`Could not read the image: ${error?.message || error}`);
  }

  const sourceWidth = image.width || image.naturalWidth;
  const sourceHeight = image.height || image.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new ProcessingError('The image is empty');

  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ProcessingError('Canvas is unavailable');
  context.fillStyle = '#ffffff'; // PNGs with transparency get a white background
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  image.close?.();

  const photo = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (!photo.startsWith('data:image/jpeg')) throw new ProcessingError('Could not encode the image');
  return { photo, width, height };
}
