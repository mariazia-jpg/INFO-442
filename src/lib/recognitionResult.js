// Pure helpers for clothing recognition (Issues 2 and 4). Kept free of browser
// APIs so the failure rules can be unit tested in Node.

// The only answers Gemini is allowed to give (structured output enum).
// "unknown" means the photo isn't one of the four supported garments.
export const RECOGNITION_CATEGORIES = ['tshirt', 'top', 'pants', 'skirt', 'unknown'];

const CATEGORY_TO_CLOTHING_TYPE = {
  tshirt: 'T-shirt',
  top: 'Top',
  pants: 'Pants',
  skirt: 'Skirt',
};

/**
 * Turns Gemini's JSON reply into { category }. Throws when the reply isn't the
 * shape we asked for, so a malformed reply is handled like any other failure (Issue 4).
 */
export function parseRecognitionReply(replyText) {
  let reply;
  try {
    reply = JSON.parse(replyText);
  } catch {
    throw new Error('Recognition reply is not JSON');
  }
  if (!reply || !RECOGNITION_CATEGORIES.includes(reply.category)) {
    throw new Error('Recognition reply has no valid category');
  }
  return { category: reply.category };
}

/** 'tshirt' → 'T-shirt'. Returns null for 'unknown' or anything unexpected. */
export function clothingTypeFromCategory(category) {
  return CATEGORY_TO_CLOTHING_TYPE[category] || null;
}

/** 'T-shirt' → 'tshirt'. Returns 'unknown' when there is no type. */
export function categoryFromClothingType(clothingType) {
  const match = Object.keys(CATEGORY_TO_CLOTHING_TYPE).find((category) => {
    return CATEGORY_TO_CLOTHING_TYPE[category] === clothingType;
  });
  return match || 'unknown';
}

/** Gemini wants raw base64, but the app stores the photo as a data URL. */
export function base64FromDataUrl(dataUrl) {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/**
 * Runs a recognizer and decides what the Recognition page shows.
 * Every failure (error, timeout, malformed result, 'unknown') resolves to null
 * so the page falls back to manual selection (C8–C10). Never rejects.
 *
 * @param {() => Promise<{category: string}>} recognize
 * @param {number} timeoutMs keeps Continue → Recognition page under 10 s (NF-P3)
 * @returns {Promise<'T-shirt'|'Top'|'Pants'|'Skirt'|null>}
 */
export async function resolveClothingType(recognize, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Recognition timed out'));
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([recognize(), timeout]);
    if (!result || !RECOGNITION_CATEGORIES.includes(result.category)) return null;
    return clothingTypeFromCategory(result.category);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
