import { MAX_UPLOAD_BYTES, MIN_PASSWORD_LENGTH } from './constants.js';

// Deliberately simple: something@something.tld with no spaces (S10).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(String(email).trim());
}

/**
 * Validates the Sign Up form. Returns an error code or null.
 * Order matters: empty fields first (S11), then format (S10), then length (S9).
 * "Email already in use" (S8) is checked by the account service.
 */
export function validateSignUp(email, password) {
  if (!String(email).trim()) return 'email-required';
  if (!password) return 'password-required';
  if (!isValidEmail(email)) return 'invalid-email';
  if (password.length < MIN_PASSWORD_LENGTH) return 'weak-password';
  return null;
}

/** Validates the Log In form (L8). Returns an error code or null. */
export function validateLogIn(email, password) {
  if (!String(email).trim()) return 'email-required';
  if (!password) return 'password-required';
  return null;
}

const JPG_PNG_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png'];
const HEIC_TYPES = ['image/heic', 'image/heif'];
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic'];

function extensionOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '');
  return match ? match[1].toLowerCase() : '';
}

/** True when the file is a HEIC photo (browsers often leave its MIME type blank). */
export function isHeic(file) {
  return extensionOf(file.name) === 'heic' || HEIC_TYPES.includes((file.type || '').toLowerCase());
}

/**
 * Checks a chosen photo against U5, U13 and U14.
 * Returns null when the file is accepted, or 'unsupported' / 'too-large'.
 *
 * JPG, PNG and HEIC are supported. The file extension decides; the MIME type the
 * browser reports is only used to reject an obvious mismatch (for example a
 * PDF renamed to .jpg) and for files with no extension.
 */
export function validatePhoto(file) {
  if (!file) return 'unsupported';
  const ext = extensionOf(file.name);
  const type = (file.type || '').toLowerCase();

  let supported;
  if (EXTENSIONS.includes(ext)) {
    const expected = ext === 'heic' ? HEIC_TYPES : JPG_PNG_TYPES;
    supported = !type || expected.includes(type);
  } else {
    supported = !ext && (JPG_PNG_TYPES.includes(type) || HEIC_TYPES.includes(type));
  }

  if (!supported) return 'unsupported';
  if (file.size > MAX_UPLOAD_BYTES) return 'too-large';
  return null;
}
