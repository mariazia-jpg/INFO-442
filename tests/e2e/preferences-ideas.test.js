// Preferences (P1–P9), Recommendations (R1–R18), Tutorial Details (T1–T12).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectsWithTools } from '../../src/lib/projectData.js';
import { expectPath, expectUrl, heading, reachPreferences, setup, textOf } from './helpers.js';

const ctx = setup();
const PROJECTS = projectsWithTools(JSON.parse(readFileSync(new URL('../../public/data/projects.json', import.meta.url))));
const RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const continueButton = (page) => page.getByRole('button', { name: 'Continue' });
const cards = (page) => page.locator('.project-card');
const cardTitles = async (page) => {
  await page.locator('.project-card, .empty-state').first().waitFor();
  return page.locator('.project-card h2').allInnerTexts();
};

async function toIdeas(page, options) {
  await reachPreferences(page, options);
  await continueButton(page).click();
  await expectPath(page, '/ideas');
}

function expectedTitles(type, level, tools) {
  return PROJECTS.filter(
    (p) => p.clothingType === type && RANK[p.difficulty] <= RANK[level] && p.requiredTools.every((t) => tools.includes(t)),
  ).map((p) => p.title);
}

async function setStoredPreferences(page, value) {
  await page.evaluate((raw) => {
    const { userId } = JSON.parse(localStorage.getItem('rewear:session'));
    localStorage.setItem(`rewear:preferences:${userId}`, raw);
  }, value);
}

describe('Preferences page', () => {
  it('P1–P4 / P7 shows the saved level and tools with Edit; Continue shows Recommendations', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page, { answers: { 4: ['Intermediate'], 5: ['Scissors', 'Sewing Machine'] } });
    assert.equal(await textOf(page.locator('.prefs-summary')), 'Intermediate · Scissors, Sewing Machine');
    assert.match(await textOf(page.locator('.prefs-card')), /Experience\s*Intermediate/);
    assert.match(await textOf(page.locator('.prefs-card')), /Tools\s*Scissors, Sewing Machine/);
    assert.ok(await page.getByRole('button', { name: 'Edit' }).isVisible());
    assert.equal(await continueButton(page).isEnabled(), true);
    await continueButton(page).click();
    await expectPath(page, '/ideas');
  });

  it('P5 missing level or tools: asks the user to add them and disables Continue', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page, { answers: { 4: null, 5: null } });
    assert.match(await textOf(page.locator('.prefs-card')), /Add your experience level and the tools/);
    assert.equal(await continueButton(page).isDisabled(), true);
  });

  it('P8 / P9 preferences that cannot be loaded show an error and disable Continue', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page);
    await setStoredPreferences(page, '{not valid json');
    await page.reload();
    assert.match(await textOf(page.getByRole('alert')), /couldn.t load your saved preferences/i);
    assert.equal(await page.locator('.prefs-card').count(), 0);
    assert.equal(await continueButton(page).isDisabled(), true);
    // Edit is the way out (P6).
    await page.getByRole('button', { name: 'Edit' }).click();
    await expectUrl(page, /\/questions\/4\?edit=1$/);
  });

  it('keeps its selections after a refresh', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page, { answers: { 4: ['Advanced'], 5: ['Needle and Thread'] } });
    await page.reload();
    assert.equal(await textOf(page.locator('.prefs-summary')), 'Advanced · Needle and Thread');
  });
});

describe('Recommendations page', () => {
  it('R1–R3 heading names the type; preferences bar has an Edit link to Preferences', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'pants', answers: { 4: ['Advanced'], 5: ['Scissors', 'Sewing Machine'] } });
    assert.equal(await textOf(heading(page)), 'Ideas for your pants');
    assert.match(await textOf(page.locator('.prefs-bar')), /Advanced · Scissors, Sewing Machine/);
    await page.locator('.prefs-bar').getByRole('link', { name: /Edit/ }).click();
    await expectPath(page, '/preferences');
  });

  for (const [type, level, tools] of [
    ['T-shirt', 'Beginner', ['Scissors']],
    ['T-shirt', 'Advanced', ['Scissors', 'Needle and Thread', 'Sewing Machine']],
    ['Pants', 'Intermediate', ['Scissors', 'Sewing Machine']],
    ['Top', 'Intermediate', ['Scissors', 'Needle and Thread']],
    ['Skirt', 'Advanced', ['Scissors', 'Sewing Machine']],
  ]) {
    it(`R4–R6 ${type}, ${level}, ${tools.join(' + ')}: shows exactly the matching projects`, async () => {
      const page = await ctx.newPage();
      const name = { 'T-shirt': 'tshirt', Top: 'top', Pants: 'pants', Skirt: 'skirt' }[type];
      await toIdeas(page, { name, answers: { 4: [level], 5: tools } });
      const titles = await cardTitles(page);
      assert.deepEqual([...titles].sort(), expectedTitles(type, level, tools).sort());
      assert.ok(titles.length > 0, 'combination chosen to have results');
      const levels = await page.locator('.project-card .tags li:first-child').allInnerTexts();
      const ranks = levels.map((l) => RANK[l]);
      assert.deepEqual(ranks, [...ranks].sort(), 'easiest first');
    });
  }

  it('R7–R13 each card shows image, title, description, difficulty, time, tools and View Project', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'tshirt', answers: { 4: ['Advanced'], 5: ['Scissors', 'Needle and Thread', 'Sewing Machine'] } });
    await cards(page).first().waitFor();
    const count = await cards(page).count();
    assert.ok(count >= 3);
    for (let i = 0; i < count; i++) {
      const card = cards(page).nth(i);
      const img = card.locator('img');
      assert.ok((await img.getAttribute('alt')).length > 0);
      await img.scrollIntoViewIfNeeded(); // images below the fold load lazily
      await img.evaluate((el) => (el.complete ? null : new Promise((done) => el.addEventListener('load', done, { once: true }))));
      assert.ok(await img.evaluate((el) => el.naturalWidth > 0), `image ${i} loaded`);
      assert.ok((await card.locator('h2').innerText()).length > 0);
      assert.ok((await card.locator('p').first().innerText()).length > 0);
      const tags = await card.locator('.tags li').allInnerTexts();
      assert.ok(['Beginner', 'Intermediate', 'Advanced'].includes(tags[0]));
      assert.match(tags[1], /\d+(\.\d+)? (min|hr)/);
      assert.match(await card.locator('.tools').innerText(), /Tools: /);
      assert.ok(await card.getByRole('link', { name: /View Project/ }).isVisible());
    }
  });

  it('R14 View Project shows that project’s Tutorial Details', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'tshirt' });
    const title = await cards(page).first().locator('h2').innerText();
    await cards(page).first().getByRole('link', { name: /View Project/ }).click();
    await expectUrl(page, /\/ideas\/.+/);
    assert.equal(await textOf(heading(page)), title);
  });

  it('R15–R17 no matches: message and Change Preferences, which shows Preferences', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'skirt', answers: { 4: ['Advanced'], 5: ['Sewing Machine'] } });
    await page.locator('.empty-state').waitFor();
    assert.equal(await cards(page).count(), 0);
    assert.match(await textOf(page.locator('.empty-state')), /No projects match your preferences/);
    await page.getByRole('button', { name: 'Change Preferences' }).click();
    await expectPath(page, '/preferences');
  });

  it('R18 project data that fails to load shows an error', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page);
    await page.route('**/data/projects.json', (route) => route.abort());
    await continueButton(page).click();
    await expectPath(page, '/ideas');
    assert.match(await textOf(page.getByRole('alert')), /couldn.t load project ideas/i);
    await page.unroute('**/data/projects.json');
    await page.getByRole('button', { name: 'Try again' }).click();
    await cards(page).first().waitFor();
  });

  it('shows the same projects after a refresh and after browser Back from a tutorial', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'pants', answers: { 4: ['Advanced'], 5: ['Scissors', 'Sewing Machine'] } });
    const before = await cardTitles(page);
    await page.reload();
    assert.deepEqual(await cardTitles(page), before);
    await cards(page).first().getByRole('link').click();
    await expectUrl(page, /\/ideas\/.+/);
    await page.goBack();
    await expectPath(page, '/ideas');
    assert.deepEqual(await cardTitles(page), before);
  });

  it('R22-style: changed preferences change the results', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'tshirt', answers: { 4: ['Beginner'], 5: ['Scissors'] } });
    const before = await cardTitles(page);
    await page.locator('.prefs-bar').getByRole('link', { name: /Edit/ }).click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Advanced', { exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Sewing Machine', { exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
    await expectPath(page, '/preferences');
    await continueButton(page).click();
    const after = await cardTitles(page);
    assert.ok(after.length > before.length);
    assert.deepEqual([...after].sort(), expectedTitles('T-shirt', 'Advanced', ['Scissors', 'Sewing Machine']).sort());
  });
});

describe('Tutorial Details page', () => {
  it('T1–T7 / #19 shows project information and materials; Open Tutorial opens a new tab', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'tshirt' });
    await cards(page).first().getByRole('link', { name: /View Project/ }).click();
    await expectUrl(page, /\/ideas\/(.+)$/);
    const id = new URL(page.url()).pathname.split('/').pop();
    const project = PROJECTS.find((p) => p.id === id);
    assert.ok(await page.locator('.hero-image').evaluate((el) => el.complete && el.naturalWidth > 0));
    assert.equal((await page.locator('main .eyebrow').innerText()).toLowerCase(), project.projectType.toLowerCase());
    assert.equal(await textOf(heading(page)), project.title);
    assert.deepEqual(await page.locator('main .tags li').allInnerTexts(), [project.difficulty, project.estimatedTime]);
    assert.deepEqual(await page.getByRole('region', { name: 'Materials' }).getByRole('listitem').allInnerTexts(), project.materials);
    assert.match(await textOf(page.locator('main .lead')), new RegExp(project.transformation.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const link = page.getByRole('link', { name: /Open Tutorial/ });
    assert.equal(await link.getAttribute('href'), project.tutorialUrl);
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match(await link.getAttribute('rel'), /noopener/);
    // Verify the new-tab interaction without depending on the external site's uptime.
    await page.context().route(project.tutorialUrl, (route) => route.fulfill({
      contentType: 'text/html', body: '<h1>External tutorial</h1>',
    }));
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), project.tutorialUrl);
    await popup.close();
  });

  it('T8 / T9 Back to Ideas shows the same projects as before', async () => {
    const page = await ctx.newPage();
    await toIdeas(page, { name: 'tshirt', answers: { 4: ['Advanced'], 5: ['Scissors', 'Needle and Thread', 'Sewing Machine'] } });
    const before = await cardTitles(page);
    await cards(page).nth(1).getByRole('link').click();
    await expectUrl(page, /\/ideas\/.+/);
    await page.getByRole('button', { name: 'Back to Ideas' }).click();
    await expectPath(page, '/ideas');
    assert.deepEqual(await cardTitles(page), before);
  });

  it('T10 / T11 an unavailable tutorial shows a banner and disables Open Tutorial', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page);
    await page.route('**/data/projects.json', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.projects = data.projects.map((p) => (p.id === 'no-sew-tee-tote' ? { ...p, tutorialAvailable: false } : p));
      await route.fulfill({ response, json: data });
    });
    await page.go('/ideas/no-sew-tee-tote');
    await page.getByRole('heading', { name: 'No-Sew T-Shirt Tote' }).waitFor();
    assert.match(await textOf(page.getByRole('status')), /Tutorial unavailable/);
    assert.equal(await page.getByRole('button', { name: /Open Tutorial/ }).isDisabled(), true);
    assert.equal(await page.getByRole('link', { name: /Open Tutorial/ }).count(), 0);
    assert.deepEqual(await page.getByRole('region', { name: 'Materials' }).getByRole('listitem').allInnerTexts(), PROJECTS.find((p) => p.id === 'no-sew-tee-tote').materials);
    assert.ok(await page.getByRole('button', { name: 'Back to Ideas' }).isVisible());
  });

  it('T12 a project that does not exist shows a not-found message', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page);
    await page.go('/ideas/no-such-project');
    assert.equal(await textOf(heading(page)), 'Project not found');
    assert.ok(await page.getByRole('link', { name: /Home page/ }).isVisible());
  });
});
