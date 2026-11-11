// Clothing recognition.
//
// Default: MobileNet (a general image classifier) running in the browser with
// TensorFlow.js. The photo is never uploaded anywhere, which matters for an
// audience that includes 13–17 year olds. Its labels are mapped to T-shirt,
// Top, Pants or Skirt in src/lib/clothingLabels.js; when no label fits, or the
// model can't load in time, we return null and the user picks the type
// manually (C8–C10).
//
// To try a different recognizer (a custom Teachable Machine model, a cloud
// vision API, ...), change identifyClothing() and keep its contract:
// resolve to one of CLOTHING_TYPES or null, and never reject.

import { clothingTypeFromFileName, clothingTypeFromPredictions } from '../lib/clothingLabels.js';

const MODE = import.meta.env.VITE_RECOGNIZER || 'mobilenet';
const DEFAULT_TIMEOUT_MS = 8000; // keeps upload → result under 10 s (NF-P3)

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
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Recognition timed out')), ms)),
  ]);
}

async function classify(photo) {
  const model = await loadModel();
  const img = new Image();
  img.src = photo;
  await img.decode();
  const predictions = await model.classify(img, 5);
  return clothingTypeFromPredictions(predictions);
}

/**
 * @param {{photo: string, fileName?: string}} input photo is a data URL from processPhoto()
 * @returns {Promise<'T-shirt'|'Top'|'Pants'|'Skirt'|null>}
 */
export async function identifyClothing({ photo, fileName }, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (MODE === 'filename') {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return clothingTypeFromFileName(fileName);
  }
  try {
    return await withTimeout(classify(photo), timeoutMs);
  } catch (error) {
    console.warn('Clothing recognition unavailable:', error);
    return null;
  }
}
