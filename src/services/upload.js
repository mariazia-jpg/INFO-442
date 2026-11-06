// The current clothing upload (the "Clothing Upload" table in the data model).
// It lives in sessionStorage: it survives a page refresh but is forgotten when
// the browser tab closes (A3: "uploaded a photo in the current session"), and
// the photo never leaves the user's device.

import { KEYS, readJsonSafe, remove, writeJson } from './storage.js';

/** @returns {{uploadId, photo, fileName, detectedType, confirmedType, dateUploaded} | null} */
export function getUpload() {
  const upload = readJsonSafe(KEYS.upload, null, 'session');
  return upload && upload.photo ? upload : null;
}

export function saveUpload({ photo, fileName, detectedType }) {
  const upload = {
    uploadId: `up-${Date.now().toString(36)}`,
    photo,
    fileName,
    detectedType: detectedType || null,
    confirmedType: null,
    dateUploaded: new Date().toISOString(),
  };
  writeJson(KEYS.upload, upload, 'session');
  return upload;
}

export function confirmClothingType(type) {
  const upload = getUpload();
  if (!upload) return null;
  const next = { ...upload, confirmedType: type };
  writeJson(KEYS.upload, next, 'session');
  return next;
}

export function clearUpload() {
  remove(KEYS.upload, 'session');
}
