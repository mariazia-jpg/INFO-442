// Clothing Image Processing (Issue 1): what happens to the photo between
// "Continue" and the Recognition page. Loading/error screens are also covered
// in upload-recognition.test.js; these tests check the processed photo itself,
// the Try Again retry (U21) and timing (NF-P3).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brokenPhoto, makePng } from './fixtures.js';
import { choosePhoto, expectPath, setup, signUpAndOnboard } from './helpers.js';

const ctx = setup();

const MAX_SIDE = 1024;
const GPS_MARKER = 'GPS 47.6062N 122.3321W';
const NF_P3_LIMIT_MS = 10000;
const NF_P3_TRIALS = 10;

function uint16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value);
  return buffer;
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
}

/** Adds an EXIF (APP1) segment carrying fake GPS text right after the JPEG's start marker. */
function withExif(jpeg) {
  const tiff = Buffer.concat([Buffer.from('MM\0*', 'latin1'), uint32(8), uint16(0), uint32(0), Buffer.from(GPS_MARKER)]);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  return Buffer.concat([jpeg.subarray(0, 2), uint16(0xffe1), uint16(body.length + 2), body, jpeg.subarray(2)]);
}

/** A plain JPEG drawn by the browser, since Node has no JPEG encoder. */
async function makeJpeg(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const context = canvas.getContext('2d');
    context.fillStyle = '#5a78aa';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

/** Uploads a file and continues to the Recognition page. */
async function uploadFile(page, file) {
  await page.go('/upload');
  await choosePhoto(page, file);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectPath(page, '/identify');
}

/** The processed photo the app saved for the rest of the flow. */
async function storedPhoto(page) {
  return page.evaluate(async () => {
    const upload = JSON.parse(window.sessionStorage.getItem('rewear:upload'));
    const image = new Image();
    image.src = upload.photo;
    await image.decode();
    return { dataUrl: upload.photo, width: image.naturalWidth, height: image.naturalHeight };
  });
}

function bytesOf(dataUrl) {
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => {
    return a - b;
  });
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

describe('Clothing image processing', () => {
  it('re-encodes the photo as a base64 JPEG with EXIF/GPS metadata removed', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    const original = withExif(await makeJpeg(page));
    assert.ok(original.includes('Exif') && original.includes(GPS_MARKER), 'test photo should start with EXIF data');

    await uploadFile(page, { name: 'tshirt-exif.jpg', mimeType: 'image/jpeg', buffer: original });
    const { dataUrl } = await storedPhoto(page);
    assert.match(dataUrl, /^data:image\/jpeg;base64,/);
    const processed = bytesOf(dataUrl);
    assert.equal(processed.includes('Exif'), false, 'EXIF segment should be gone');
    assert.equal(processed.includes(GPS_MARKER), false, 'GPS data should be gone');
  });

  it('resizes a large photo to 1024 px on its longest side, keeping its shape', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadFile(page, { name: 'tshirt-large.png', mimeType: 'image/png', buffer: makePng(3000, 2000) });
    const { width, height } = await storedPhoto(page);
    assert.equal(width, MAX_SIDE);
    assert.equal(height, Math.round(2000 * (MAX_SIDE / 3000)));
  });

  it('leaves a photo that is already small at its original size', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadFile(page, { name: 'tshirt-small.png', mimeType: 'image/png', buffer: makePng(240, 300) });
    const { width, height } = await storedPhoto(page);
    assert.deepEqual({ width, height }, { width: 240, height: 300 });
  });

  it('U21 Try Again shows the loading screen again while it retries the same photo', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await page.go('/upload');
    await choosePhoto(page, brokenPhoto());
    await page.getByRole('button', { name: 'Continue' }).click();
    const errorHeading = page.getByRole('heading', { name: /couldn.t process your image/i });
    await errorHeading.waitFor();

    // A broken photo fails fast, so watch for the loading screen instead of
    // hoping to catch it on screen.
    await page.evaluate(() => {
      window.sawLoadingScreen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('main h1')?.textContent === 'Identifying your item…') {
          window.sawLoadingScreen = true;
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    });
    await page.getByRole('button', { name: 'Try Again' }).click();
    await page.waitForFunction(() => {
      return window.sawLoadingScreen;
    }, null, { timeout: 5000 });
    await errorHeading.waitFor();
  });

  it(`NF-P3 the Recognition page appears within 10 s of Continue (median of ${NF_P3_TRIALS} trials)`, async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    // A 12-megapixel photo, the size a phone camera takes.
    const file = { name: 'tshirt-phone.png', mimeType: 'image/png', buffer: makePng(3024, 4032) };
    const durations = [];
    for (let trial = 0; trial < NF_P3_TRIALS; trial++) {
      await page.go('/upload');
      await choosePhoto(page, file);
      const started = Date.now();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expectPath(page, '/identify');
      durations.push(Date.now() - started);
    }
    const medianMs = median(durations);
    assert.ok(medianMs < NF_P3_LIMIT_MS, `median was ${medianMs} ms (trials: ${durations.join(', ')})`);
  });
});
