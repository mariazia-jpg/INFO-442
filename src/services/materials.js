import { getCurrentUser } from './accounts.js';
import { KEYS, readJsonSafe, writeJson } from './storage.js';

// Which materials the logged-in user has ticked off for a project, kept per
// user and project so the checklist is still there when they come back.

function key(projectId) {
  const user = getCurrentUser();
  return user ? KEYS.materials(user.id, projectId) : null;
}

/** The checked material names for this project (only ones still in `materials`). */
export function loadCheckedMaterials(projectId, materials) {
  const storageKey = key(projectId);
  if (!storageKey) return [];
  const saved = readJsonSafe(storageKey, []);
  return Array.isArray(saved) ? saved.filter((name) => materials.includes(name)) : [];
}

export function saveCheckedMaterials(projectId, checked) {
  const storageKey = key(projectId);
  if (!storageKey) return;
  try {
    writeJson(storageKey, checked);
  } catch {
    // The checklist still works for this visit if storage is unavailable.
  }
}
