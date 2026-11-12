import { toolNamesFromIds } from '../data/tools.js';

// Join Project Tools to projects for display and recommendation filtering.
export function projectsWithTools(data) {
  if (!Array.isArray(data?.projects) || !Array.isArray(data?.projectTools)) {
    throw new Error('Project data is malformed');
  }
  const toolsByProject = new Map();
  for (const project of data.projects) {
    if (!project.id || toolsByProject.has(project.id)) throw new Error('Invalid or duplicate project ID');
    toolsByProject.set(project.id, []);
  }
  for (const row of data.projectTools) {
    const ids = toolsByProject.get(row.projectId);
    if (!ids) throw new Error(`Unknown project: ${row.projectId}`);
    toolNamesFromIds([row.toolId]); // Reject unknown IDs instead of ignoring a required tool.
    if (ids.includes(row.toolId)) throw new Error('Duplicate project/tool relationship');
    ids.push(row.toolId);
  }
  return data.projects.map((project) => {
    const requiredToolIds = toolsByProject.get(project.id);
    return { ...project, requiredToolIds, requiredTools: toolNamesFromIds(requiredToolIds) };
  });
}
