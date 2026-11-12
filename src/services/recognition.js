// Clothing recognition.
//
// Recognizers (VITE_RECOGNIZER):
//   gemini    — Gemini through Firebase AI Logic (src/services/gemini.js).
//               The default once FIREBASE_CONFIG is filled in.
//   mobilenet — MobileNet (a general image classifier) running in the browser
//               with TensorFlow.js; the default while Firebase isn't set up.
//               Its labels are mapped in src/lib/clothingLabels.js.
//   stub      — returns VITE_STUB_RESULT (a category, or "error") for trying
//               out the success and failure screens without Firebase.
//   filename  — reads the type from the file name; used by the e2e tests.
//
// Every recognizer sits behind recognizeClothing() → { category }. Failures
// (errors, timeouts, malformed replies, "unknown") become null in
// identifyClothing(), and the user picks the type manually (C8–C10).

import { clothingTypeFromFileName, clothingTypeFromPredictions } from '../lib/clothingLabels.js';
import {
  base64FromDataUrl, categoryFromClothingType, parseRecognitionReply, resolveClothingType,
} from '../lib/recognitionResult.js';
import { askGemini, isGeminiConfigured, preloadGemini } from './gemini.js';

const MODE = import.meta.env.VITE_RECOGNIZER || (isGeminiConfigured() ? 'gemini' : 'mobilenet');
const DEFAULT_TIMEOUT_MS = 8000; // keeps upload → result under 10 s (NF-P3)
const FAKE_DELAY_MS = 300; // lets tests see the loading screen with the fake recognizers

let modelPromise = null;

function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, mobilenet] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/mobilenet'),
      ]);
      await tf.ready();
      return mobilenet.load({ version: 2, alpha: 0.5 });
    })();
    // Let a later attempt retry if the download failed.
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

/** Starts downloading the model early (called once the user picks a photo). */
export function preloadRecognizer() {
  if (MODE === 'mobilenet') loadModel().catch(() => {});
  if (MODE === 'gemini') preloadGemini();
}

async function classify(photo) {
  const model = await loadModel();
  const img = new Image();
  img.src = photo;
  await img.decode();
  const predictions = await model.classify(img, 5);
  return clothingTypeFromPredictions(predictions);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stubReply(result) {
  if (result === 'error') throw new Error('Stub recognizer error');
  return parseRecognitionReply(JSON.stringify({ category: result }));
}

// File names can also simulate each kind of failure, so the e2e tests can
// check Issue 4 without a real API.
function fileNameReply(fileName) {
  const name = String(fileName || '').toLowerCase();
  if (name.includes('api-error')) throw new Error('Simulated API error');
  if (name.includes('malformed')) return parseRecognitionReply('{"category":"jacket"}');
  return { category: categoryFromClothingType(clothingTypeFromFileName(name)) };
}

/**
 * The single recognition entry point (Issue 2). Swap recognizers here.
 * @param {string} imageBase64 JPEG data without the data-URL prefix
 * @param {{fileName?: string}} [options] only used by the filename recognizer
 * @returns {Promise<{category: 'tshirt'|'top'|'pants'|'skirt'|'unknown'}>}
 *   rejects on network/API errors or malformed replies
 */
export async function recognizeClothing(imageBase64, { fileName } = {}) {
  if (MODE === 'gemini') return askGemini(imageBase64);
  if (MODE === 'mobilenet') {
    const clothingType = await classify(`data:image/jpeg;base64,${imageBase64}`);
    return { category: categoryFromClothingType(clothingType) };
  }
  await wait(FAKE_DELAY_MS);
  if (MODE === 'stub') return stubReply(import.meta.env.VITE_STUB_RESULT || 'tshirt');
  return fileNameReply(fileName);
}

/**
 * Called by the Upload page after processing.
 * @param {{photo: string, fileName?: string}} input photo is a data URL from processPhoto()
 * @returns {Promise<'T-shirt'|'Top'|'Pants'|'Skirt'|null>} null on any failure; never rejects
 */
export async function identifyClothing({ photo, fileName }, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return resolveClothingType(() => {
    return recognizeClothing(base64FromDataUrl(photo), { fileName });
  }, timeoutMs);
}
