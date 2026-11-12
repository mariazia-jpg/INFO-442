// Shared Tools table: IDs stay the same even if a display name changes.
export const TOOL_CATALOG = [
  { id: 'scissors', name: 'Scissors' },
  { id: 'needle-thread', name: 'Needle and Thread' },
  { id: 'sewing-machine', name: 'Sewing Machine' },
];

export function toolIdsFromNames(names) {
  if (!Array.isArray(names)) throw new Error('Tools must be a list');
  return [...new Set(names.map((name) => {
    const tool = TOOL_CATALOG.find((entry) => entry.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.id;
  }))];
}

export function toolNamesFromIds(ids) {
  if (!Array.isArray(ids)) throw new Error('Tool IDs must be a list');
  return ids.map((id) => {
    const tool = TOOL_CATALOG.find((entry) => entry.id === id);
    if (!tool) throw new Error(`Unknown tool ID: ${id}`);
    return tool.name;
  });
}
