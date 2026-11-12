import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { TOOL_CATALOG } from '../../src/data/tools.js';
import { projectsWithTools } from '../../src/lib/projectData.js';
import { loadPreferences, savePreferences } from '../../src/services/preferences.js';
import { KEYS } from '../../src/services/storage.js';
import { recommendProjects } from '../../src/lib/recommend.js';

const data = JSON.parse(readFileSync(new URL('../../public/data/projects.json', import.meta.url)));
const fixture = {
  projects: [{ id: 'bag', title: 'Bag', clothingType: 'T-shirt', difficulty: 'Beginner' }],
  projectTools: [{ projectId: 'bag', toolId: 'scissors' }, { projectId: 'bag', toolId: 'needle-thread' }],
};

describe('project data and tool relationships (#5, #6, #9)', () => {
  it('has one catalogue entry per ID and name, with valid project/tool links', () => {
    assert.equal(new Set(TOOL_CATALOG.map((t) => t.id)).size, TOOL_CATALOG.length);
    assert.equal(new Set(TOOL_CATALOG.map((t) => t.name)).size, TOOL_CATALOG.length);
    assert.ok(data.projectTools.length > 0);
    assert.doesNotThrow(() => projectsWithTools(data));
    assert.ok(data.projects.every((p) => !Object.hasOwn(p, 'requiredTools')));
    assert.ok(projectsWithTools(data).every((p) => p.requiredToolIds.length > 0));
  });

  it('joins every required tool and excludes a project when just one is missing', () => {
    const projects = projectsWithTools(fixture);
    assert.deepEqual(projects[0].requiredTools, ['Scissors', 'Needle and Thread']);
    const preferences = { clothingType: 'T-shirt', experienceLevel: 'Beginner', toolIds: ['scissors'] };
    assert.deepEqual(recommendProjects(projects, preferences), []);
    assert.deepEqual(recommendProjects(projects, { ...preferences, toolIds: ['needle-thread', 'scissors'] }).map((p) => p.id), ['bag']);
  });

  it('provides a nonempty materials list for every tutorial (#19)', () => {
    for (const project of projectsWithTools(data)) {
      assert.ok(Array.isArray(project.materials) && project.materials.length > 0, project.id);
      assert.ok(project.materials.every((item) => typeof item === 'string' && item.trim()), project.id);
      assert.equal(new Set(project.materials).size, project.materials.length, project.id);
    }
  });

  it('rejects invalid references and duplicate relationships', () => {
    for (const row of [
      { projectId: 'missing', toolId: 'scissors' },
      { projectId: 'bag', toolId: 'unknown' },
      fixture.projectTools[0],
    ]) {
      assert.throws(() => projectsWithTools({ ...fixture, projectTools: [...fixture.projectTools, row] }));
    }
    assert.throws(() => projectsWithTools({ projects: fixture.projects }));
  });

  it('keeps display text, valid tutorial URLs, and local images for every project', () => {
    const publicRoot = new URL('../../public/', import.meta.url);
    for (const project of data.projects) {
      for (const field of ['id', 'title', 'description', 'transformation', 'image', 'estimatedTime', 'tutorialSource']) {
        assert.equal(typeof project[field], 'string');
        assert.ok(project[field].trim(), `${project.id}: ${field}`);
      }
      const image = new URL(project.image, publicRoot);
      assert.ok(image.href.startsWith(publicRoot.href));
      assert.ok(statSync(image).isFile() && statSync(image).size > 0);
      assert.equal(new URL(project.tutorialUrl).protocol, 'https:');
    }
  });
});

describe('User Tools persistence', () => {
  let previousWindow;
  let values;
  beforeEach(() => {
    previousWindow = globalThis.window;
    values = new Map();
    globalThis.window = { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    } };
  });
  afterEach(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });

  it('stores tool IDs as separate user/tool rows and returns the existing UI labels', async () => {
    await savePreferences('abel', { experienceLevel: 'Beginner', tools: ['Scissors', 'Scissors'] });
    const stored = JSON.parse(values.get(KEYS.preferences('abel')));
    assert.equal(Object.hasOwn(stored, 'tools'), false);
    assert.equal(Object.hasOwn(stored, 'toolIds'), false);
    assert.deepEqual(JSON.parse(values.get(KEYS.userTools('abel'))), [{ userId: 'abel', toolId: 'scissors' }]);
    const prefs = await loadPreferences('abel');
    assert.deepEqual(prefs.tools, ['Scissors']);
    assert.deepEqual(prefs.toolIds, ['scissors']);
    assert.equal(prefs.experienceLevel, 'Beginner');
  });

  it('keeps old saved selections and migrates them when preferences are next saved', async () => {
    values.set(KEYS.preferences('abel'), JSON.stringify({ styles: ['Vintage'], tools: ['Scissors', 'Sewing Machine'] }));
    assert.deepEqual((await loadPreferences('abel')).toolIds, ['scissors', 'sewing-machine']);
    await savePreferences('abel', { experienceLevel: 'Advanced' });
    assert.deepEqual((await loadPreferences('abel')).tools, ['Scissors', 'Sewing Machine']);
    assert.deepEqual((await loadPreferences('abel')).styles, ['Vintage']);
    assert.equal(Object.hasOwn(JSON.parse(values.get(KEYS.preferences('abel'))), 'tools'), false);
  });

  it('replaces selections and isolates one user from another', async () => {
    await savePreferences('abel', { tools: ['Scissors'] });
    await savePreferences('other', { tools: ['Sewing Machine'] });
    await savePreferences('abel', { tools: [] });
    assert.deepEqual((await loadPreferences('abel')).toolIds, []);
    assert.deepEqual((await loadPreferences('other')).toolIds, ['sewing-machine']);
  });

  it('rejects unknown tools and mismatched user rows', async () => {
    await assert.rejects(savePreferences('abel', { tools: ['Made-up tool'] }));
    assert.equal(values.size, 0);
    values.set(KEYS.userTools('abel'), JSON.stringify([{ userId: 'other', toolId: 'scissors' }]));
    await assert.rejects(loadPreferences('abel'));
  });

  it('allows a new selection to repair corrupt tool data', async () => {
    values.set(KEYS.userTools('abel'), '{broken json');
    await assert.rejects(loadPreferences('abel'));
    await savePreferences('abel', { tools: ['Scissors'], experienceLevel: 'Beginner' });
    assert.deepEqual((await loadPreferences('abel')).toolIds, ['scissors']);
  });

  it('restores the previous tools if the preference write fails', async () => {
    await savePreferences('abel', { tools: ['Scissors'], experienceLevel: 'Beginner' });
    window.localStorage.setItem = (key, value) => {
      if (key === KEYS.preferences('abel')) throw new Error('Storage full');
      values.set(key, value);
    };
    await assert.rejects(savePreferences('abel', { tools: ['Sewing Machine'], experienceLevel: 'Advanced' }));
    const prefs = await loadPreferences('abel');
    assert.deepEqual(prefs.tools, ['Scissors']);
    assert.equal(prefs.experienceLevel, 'Beginner');
  });
});
