import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REQUIRED_PROJECT_FIELDS, hasSearchablePreferences, recommendProjects, summarizePreferences,
} from '../../src/lib/recommend.js';
import { projectsWithTools } from '../../src/lib/projectData.js';
import { toolIdsFromNames } from '../../src/data/tools.js';
import { CLOTHING_TYPES, EXPERIENCE_LEVELS, PROJECT_TYPES, TOOLS } from '../../src/lib/constants.js';

const data = JSON.parse(readFileSync(new URL('../../public/data/projects.json', import.meta.url)));

const p = (id, clothingType, difficulty, requiredTools) => ({ id, title: id, clothingType, difficulty, requiredToolIds: toolIdsFromNames(requiredTools) });
const SAMPLE = [
  p('tee-beg-scissors', 'T-shirt', 'Beginner', ['Scissors']),
  p('tee-int-needle', 'T-shirt', 'Intermediate', ['Scissors', 'Needle and Thread']),
  p('tee-adv-machine', 'T-shirt', 'Advanced', ['Scissors', 'Sewing Machine']),
  p('tee-beg-nothing', 'T-shirt', 'Beginner', []),
  p('pants-beg', 'Pants', 'Beginner', ['Scissors']),
];
const ids = (list) => list.map((x) => x.id);
const ALL_TOOLS = toolIdsFromNames(TOOLS);

describe('recommendProjects', () => {
  it('R4 only returns the confirmed clothing type', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'Pants', experienceLevel: 'Advanced', toolIds: ALL_TOOLS });
    assert.deepEqual(ids(result), ['pants-beg']);
  });

  it('R5 Beginner sees Beginner only', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Beginner', toolIds: ALL_TOOLS });
    assert.deepEqual(ids(result).sort(), ['tee-beg-nothing', 'tee-beg-scissors']);
  });

  it('R5 Intermediate sees Beginner and Intermediate', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Intermediate', toolIds: ALL_TOOLS });
    assert.deepEqual(ids(result).sort(), ['tee-beg-nothing', 'tee-beg-scissors', 'tee-int-needle']);
  });

  it('R5 Advanced sees everything', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Advanced', toolIds: ALL_TOOLS });
    assert.equal(result.length, 4);
  });

  it('R6 excludes projects needing a tool the user lacks', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Advanced', toolIds: ['scissors'] });
    assert.deepEqual(ids(result).sort(), ['tee-beg-nothing', 'tee-beg-scissors']);
  });

  it('R15 returns an empty list when nothing matches', () => {
    assert.deepEqual(recommendProjects(SAMPLE, { clothingType: 'Skirt', experienceLevel: 'Advanced', toolIds: ALL_TOOLS }), []);
  });

  it('orders easiest first, then by title, so results are stable', () => {
    const result = recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Advanced', toolIds: ALL_TOOLS });
    assert.deepEqual(ids(result), ['tee-beg-nothing', 'tee-beg-scissors', 'tee-int-needle', 'tee-adv-machine']);
  });

  it('returns nothing without a clothing type or valid level', () => {
    assert.deepEqual(recommendProjects(SAMPLE, { clothingType: null, experienceLevel: 'Advanced', toolIds: ALL_TOOLS }), []);
    assert.deepEqual(recommendProjects(SAMPLE, { clothingType: 'T-shirt', experienceLevel: 'Expert', toolIds: ALL_TOOLS }), []);
  });
});

describe('preference helpers', () => {
  it('summarizes as "Level · Tools"', () => {
    assert.equal(summarizePreferences({ experienceLevel: 'Beginner', tools: ['Scissors'] }), 'Beginner · Scissors');
    assert.equal(
      summarizePreferences({ experienceLevel: 'Advanced', tools: ['Scissors', 'Sewing Machine'] }),
      'Advanced · Scissors, Sewing Machine',
    );
  });

  it('P4 / P5 needs a level and at least one tool to search', () => {
    assert.equal(hasSearchablePreferences({ experienceLevel: 'Beginner', tools: ['Scissors'] }), true);
    assert.equal(hasSearchablePreferences({ experienceLevel: null, tools: ['Scissors'] }), false);
    assert.equal(hasSearchablePreferences({ experienceLevel: 'Beginner', tools: [] }), false);
    assert.equal(hasSearchablePreferences(null), false);
  });
});

describe('public/data/projects.json', () => {
  const projects = projectsWithTools(data);

  it('has unique ids and every required field', () => {
    assert.equal(new Set(projects.map((x) => x.id)).size, projects.length);
    for (const project of projects) {
      for (const field of REQUIRED_PROJECT_FIELDS) {
        assert.ok(project[field] !== undefined && project[field] !== '', `${project.id} is missing ${field}`);
      }
    }
  });

  it('uses only the known option values', () => {
    for (const project of projects) {
      assert.ok(CLOTHING_TYPES.includes(project.clothingType), project.id);
      assert.ok(EXPERIENCE_LEVELS.includes(project.difficulty), project.id);
      assert.ok(PROJECT_TYPES.includes(project.category), project.id);
      for (const tool of project.requiredTools) assert.ok(TOOLS.includes(tool), `${project.id}: ${tool}`);
      assert.match(project.tutorialUrl, /^https:\/\//, project.id);
      assert.equal(typeof project.tutorialAvailable, 'boolean', project.id);
    }
  });

  it('has projects for every clothing type, including a Beginner + Scissors option', () => {
    for (const type of CLOTHING_TYPES) {
      const beginner = recommendProjects(projects, { clothingType: type, experienceLevel: 'Beginner', toolIds: ['scissors', 'needle-thread'] });
      assert.ok(beginner.length > 0, `${type} has nothing for a beginner with scissors and a needle`);
    }
  });
});
