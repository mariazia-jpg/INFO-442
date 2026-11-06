// Upcycling project data (the "Upcycling Project" table in the data model).
// Projects live in public/data/projects.json so the list can be edited without
// touching code, and so a failed load can be shown to the user (R18).

let cached = null;

/** Prefixes a path inside /public with the site's base URL (needed on GitHub Pages). */
export function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\//, '')}`;
}

export async function loadProjects() {
  if (cached) return cached;
  const response = await fetch(assetUrl('data/projects.json'));
  if (!response.ok) throw new Error(`Projects request failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data?.projects)) throw new Error('Project data is malformed');
  cached = data.projects;
  return cached;
}

export async function findProject(projectId) {
  const projects = await loadProjects();
  return projects.find((project) => project.id === projectId) || null;
}
