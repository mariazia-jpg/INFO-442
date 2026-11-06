// Maps the general-purpose image classifier's labels (ImageNet classes used
// by MobileNet) onto ReWear's four clothing types. Only labels that clearly
// describe one of the four garments are listed; anything else counts as
// "could not identify", which sends the user to manual selection (C8–C10).

const LABEL_TO_TYPE = [
  [/jersey|t-shirt|tee shirt/i, 'T-shirt'],
  [/sweatshirt|cardigan|poncho|blouse|tank top|camisole/i, 'Top'],
  [/\bjean\b|blue jean|denim|trousers|pants|slacks/i, 'Pants'],
  [/miniskirt|overskirt|hoopskirt|crinoline|sarong|skirt/i, 'Skirt'],
];

/** Minimum combined confidence before we suggest a type instead of asking. */
export const MIN_CONFIDENCE = 0.15;

/**
 * @param {{className: string, probability: number}[]} predictions
 * @returns {'T-shirt'|'Top'|'Pants'|'Skirt'|null}
 */
export function clothingTypeFromPredictions(predictions) {
  const scores = new Map();
  for (const { className, probability } of predictions || []) {
    const match = LABEL_TO_TYPE.find(([pattern]) => pattern.test(className));
    if (match) scores.set(match[1], (scores.get(match[1]) || 0) + probability);
  }
  let best = null;
  let bestScore = 0;
  for (const [type, score] of scores) {
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  }
  return bestScore >= MIN_CONFIDENCE ? best : null;
}

/**
 * Used only by the end-to-end test build (VITE_RECOGNIZER=filename):
 * reads the type from words in the test photo's file name.
 */
export function clothingTypeFromFileName(name) {
  const n = String(name || '').toLowerCase();
  if (/t-?shirt|tee/.test(n)) return 'T-shirt';
  if (/skirt/.test(n)) return 'Skirt';
  if (/pants|jeans|trousers/.test(n)) return 'Pants';
  if (/top|blouse/.test(n)) return 'Top';
  return null;
}
