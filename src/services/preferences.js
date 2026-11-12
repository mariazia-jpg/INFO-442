// Saved style profile for a user (the "User Preferences" table in the data model):
// styles, colors, project types, experience level, date updated.
// Tool selections live separately as User Tools rows (userId, toolId).

import { toolIdsFromNames, toolNamesFromIds } from '../data/tools.js';
import { KEYS, readJson, readJsonSafe, remove, writeJson } from './storage.js';

export const EMPTY_PREFERENCES = {
  styles: [],
  colors: [],
  projectTypes: [],
  experienceLevel: null,
  tools: [], // Display names returned to the existing preference screens.
  toolIds: [],
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
    if (saved !== null && (typeof saved !== 'object' || Array.isArray(saved))) {
      throw new Error('Unexpected preferences data');
    }
    const rows = readJson(KEYS.userTools(userId), null);
    let toolIds;
    if (rows === null) {
      // Older accounts stored tool names in preferences; keep their selections.
      toolIds = toolIdsFromNames(saved?.tools || []);
    } else {
      if (!Array.isArray(rows) || rows.some((row) => !row || row.userId !== userId)) {
        throw new Error('Unexpected user tools data');
      }
      toolIds = [...new Set(rows.map((row) => row.toolId))];
    }
    return { ...EMPTY_PREFERENCES, ...saved, toolIds, tools: toolNamesFromIds(toolIds) };
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
  const toolIds = toolIdsFromNames(next.tools);
  const { tools, toolIds: oldIds, ...storedPreferences } = next;
  const rows = toolIds.map((toolId) => ({ userId, toolId }));
  const previousRows = readJsonSafe(KEYS.userTools(userId), null);
  writeJson(KEYS.userTools(userId), rows);
  try {
    writeJson(KEYS.preferences(userId), storedPreferences);
  } catch (error) {
    // Keep the old tool selection if saving preferences fails.
    if (previousRows === null) remove(KEYS.userTools(userId));
    else writeJson(KEYS.userTools(userId), previousRows);
    throw error;
  }
  return { ...storedPreferences, toolIds, tools: toolNamesFromIds(toolIds) };
}
