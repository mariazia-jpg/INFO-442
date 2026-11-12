// Clothing recognition with Gemini through Firebase AI Logic (Issue 2).
// Firebase AI Logic calls Gemini from the browser without exposing an API key,
// which a static GitHub Pages site has no other safe way to do.

import { RECOGNITION_CATEGORIES, parseRecognitionReply } from '../lib/recognitionResult.js';
import { FIREBASE_CONFIG } from './firebaseConfig.js';

// Stable Flash model that runs on the no-cost plan. Check
// https://firebase.google.com/docs/ai-logic/models before it is retired.
const GEMINI_MODEL = 'gemini-3.8-flash';

const PROMPT = [
  'This photo shows a single clothing item, usually laid flat.',
  'Classify it as exactly one category:',
  'tshirt (short-sleeved casual knit T-shirt), top (any other upper-body garment such as a blouse, tank top or sweater),',
  'pants (trousers, jeans, shorts or leggings), skirt.',
  'Answer unknown if it is not clothing, shows several items, or is none of these.',
].join(' ');

let modelPromise = null;

export function isGeminiConfigured() {
  return FIREBASE_CONFIG !== null;
}

// The Firebase SDK is downloaded only once a photo is chosen, so it doesn't
// slow down the first page load.
function loadModel() {
  if (!modelPromise) {
    modelPromise = createModel();
    // Let a later attempt retry if the download failed.
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

async function createModel() {
  const [{ initializeApp }, { getAI, getGenerativeModel, GoogleAIBackend, Schema }] = await Promise.all([
    import('firebase/app'),
    import('firebase/ai'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: Schema.object({
        properties: {
          category: Schema.enumString({ enum: RECOGNITION_CATEGORIES }),
        },
      }),
    },
  });
}

export function preloadGemini() {
  loadModel().catch(() => {
    // A failed preload is retried when the photo is actually sent.
  });
}

/**
 * @param {string} imageBase64 JPEG data without the data-URL prefix
 * @returns {Promise<{category: string}>} rejects on network/API errors or a malformed reply
 */
export async function askGemini(imageBase64) {
  const model = await loadModel();
  const result = await model.generateContent([
    PROMPT,
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ]);
  return parseRecognitionReply(result.response.text());
}
