import { EXPERIENCE_LEVELS } from './constants.js';

const rank = (level) => EXPERIENCE_LEVELS.indexOf(level);

/**
 * Picks the upcycling projects that fit the user's item and saved preferences.
 *
 * R4: only projects for the confirmed clothing type.
 * R5: difficulty at or below the user's level
 *     (Beginner → Beginner; Intermediate → Beginner + Intermediate; Advanced → all).
 * R6: every required tool must be one the user has.
 *
 * Results are ordered from easiest to hardest, then by title, so the same
 * inputs always give the same list (T9).
 */
export function recommendProjects(projects, { clothingType, experienceLevel, tools }) {
  const userRank = rank(experienceLevel);
  if (!clothingType || userRank < 0) return [];
  const owned = new Set(tools || []);

  return projects
    .filter((project) => project.clothingType === clothingType)
    .filter((project) => {
      const projectRank = rank(project.difficulty);
      return projectRank >= 0 && projectRank <= userRank;
    })
    .filter((project) => (project.requiredTools || []).every((tool) => owned.has(tool)))
    .sort((a, b) => rank(a.difficulty) - rank(b.difficulty) || a.title.localeCompare(b.title));
}

/** "Beginner · Scissors, Needle and Thread" — the summary shown on Preferences and Recommendations. */
export function summarizePreferences({ experienceLevel, tools }) {
  return [experienceLevel, (tools || []).join(', ')].filter(Boolean).join(' · ');
}

/** Preferences are complete enough to search when there is a level and at least one tool (P4, P5). */
export function hasSearchablePreferences(prefs) {
  return Boolean(prefs && prefs.experienceLevel && Array.isArray(prefs.tools) && prefs.tools.length > 0);
}

/** Checks one project record has every field the pages need. Used by the data tests. */
export const REQUIRED_PROJECT_FIELDS = [
  'id', 'title', 'description', 'transformation', 'image', 'clothingType', 'projectType',
  'category', 'difficulty', 'requiredTools', 'estimatedTime', 'tutorialUrl', 'tutorialAvailable',
];
