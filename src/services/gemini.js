// Clothing recognition with Gemini through Firebase AI Logic (Issue 2).
// Firebase AI Logic calls Gemini from the browser without exposing an API key,
// which a static GitHub Pages site has no other safe way to do.

import { RECOGNITION_CATEGORIES, parseRecognitionReply } from '../lib/recognitionResult.js';
import { FIREBASE_CONFIG, RECAPTCHA_SITE_KEY } from './firebaseConfig.js';

// Flash-Lite answers a five-way classification in about a second, well inside
// the 8 s budget; gemini-3.8-flash did not respond in time when tested.
// Check https://firebase.google.com/docs/ai-logic/models before it is retired.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

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
  const [
    { initializeApp },
    { initializeAppCheck, ReCaptchaV3Provider },
    { getAI, getGenerativeModel, GoogleAIBackend, Schema },
  ] = await Promise.all([
    import('firebase/app'),
    import('firebase/app-check'),
    import('firebase/ai'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  // App Check must start before AI Logic so every Gemini request carries a token.
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
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
