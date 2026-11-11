// Saved style profile for a user (the "User Preferences" table in the data model):
// styles, colors, project types, experience level, tools, date updated.

import { KEYS, readJson, writeJson } from './storage.js';

export const EMPTY_PREFERENCES = {
  styles: [],
  colors: [],
  projectTypes: [],
  experienceLevel: null,
  tools: [],
  dateUpdated: null,
};

export class PreferencesLoadError extends Error {}

/**
 * Loads saved preferences. Returns EMPTY_PREFERENCES for a user who has none yet.
 * Throws PreferencesLoadError when stored data can't be read (P8).
 */
export async function loadPreferences(userId) {
  try {
    const saved = readJson(KEYS.preferences(userId), null);
    if (saved === null) return { ...EMPTY_PREFERENCES };
    if (typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Unexpected data');
    return { ...EMPTY_PREFERENCES, ...saved };
  } catch (error) {
    throw new PreferencesLoadError(error.message);
  }
}

/** Same as loadPreferences, but returns empty preferences instead of throwing. */
export async function loadPreferencesOrEmpty(userId) {
  try {
    return await loadPreferences(userId);
  } catch {
    return { ...EMPTY_PREFERENCES };
  }
}

/** Saves some fields (for example just `tools`) and stamps Date Updated. */
export async function savePreferences(userId, changes) {
  const current = await loadPreferencesOrEmpty(userId);
  const next = { ...current, ...changes, dateUpdated: new Date().toISOString() };
  writeJson(KEYS.preferences(userId), next);
  return next;
}
