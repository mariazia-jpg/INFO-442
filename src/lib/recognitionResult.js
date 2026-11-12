// Pure helpers for clothing recognition (Issue 2). Kept free of browser APIs
// so they can be unit tested in Node.

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
 * shape we asked for, so a malformed reply is treated as a failed recognition.
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
