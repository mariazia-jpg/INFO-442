// Style Questions (Q1–Q21) and Profile Complete (PC1–PC5).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestions, expectPath, heading, reachPreferences, setup, signUp, textOf } from './helpers.js';

const ctx = setup();

const next = (page) => page.getByRole('button', { name: 'Next' });
const back = (page) => page.getByRole('button', { name: 'Back' });
const skip = (page) => page.getByRole('link', { name: 'Skip', exact: true });
const optionLabels = (page) => page.locator('fieldset .option-label').allInnerTexts();
const checked = (page, label) => page.getByLabel(label, { exact: true }).isChecked();

describe('Style questions', () => {
  it('Q1–Q4 progress, Back, Skip, and Next disabled until something is chosen', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    for (let step = 1; step <= 5; step++) {
      await expectPath(page, `/questions/${step}`);
      assert.equal(await textOf(page.locator('.question-count')), `Question ${step} of 5`);
      assert.ok(await back(page).isVisible());
      assert.ok(await skip(page).isVisible());
      assert.equal(await next(page).isDisabled(), true, `Next disabled on Q${step}`);
      await page.locator('fieldset input').first().check();
      assert.equal(await next(page).isEnabled(), true, `Next enabled on Q${step}`);
      await next(page).click();
    }
    await expectPath(page, '/profile-complete');
  });

  it('Q6–Q11 each question shows exactly the listed options', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    const expected = {
      1: ['Streetwear', 'Vintage', 'Y2K', 'Minimalist', 'Cottagecore', 'Sporty'],
      2: ['Black', 'White', 'Gray', 'Earth', 'Pastel', 'Bold'],
      3: ['Tops', 'Bags', 'Accessories', 'Shorts/Skirts'],
      4: ['Beginner', 'Intermediate', 'Advanced'],
      5: ['Scissors', 'Needle and Thread', 'Sewing Machine'],
    };
    for (let step = 1; step <= 5; step++) {
      await page.go(`/questions/${step}`);
      assert.deepEqual(await optionLabels(page), expected[step], `Q${step}`);
    }
    // Q7: every style shows an image with a text alternative.
    await page.go('/questions/1');
    const images = page.locator('fieldset img');
    assert.equal(await images.count(), 6);
    for (const alt of await images.evaluateAll((els) => els.map((el) => el.alt))) assert.ok(alt.length > 0);
    // Q11: tools are checkboxes.
    await page.go('/questions/5');
    assert.equal(await page.locator('fieldset input[type="checkbox"]').count(), 3);
  });

  it('Q12 / Q13 multi-select questions select several and toggle off', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    for (const [step, a, b] of [[1, 'Vintage', 'Y2K'], [2, 'Black', 'Pastel'], [3, 'Bags', 'Tops'], [5, 'Scissors', 'Sewing Machine']]) {
      await page.go(`/questions/${step}`);
      await page.getByLabel(a, { exact: true }).check();
      await page.getByLabel(b, { exact: true }).check();
      assert.ok((await checked(page, a)) && (await checked(page, b)), `Q${step} both selected`);
      await page.getByLabel(a, { exact: true }).uncheck();
      assert.equal(await checked(page, a), false, `Q${step} toggled off`);
      assert.equal(await checked(page, b), true);
    }
  });

  it('Q14 Question 4 keeps only one experience level', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await page.go('/questions/4');
    await page.getByLabel('Beginner', { exact: true }).check();
    await page.getByLabel('Advanced', { exact: true }).check();
    assert.equal(await checked(page, 'Beginner'), false);
    assert.equal(await checked(page, 'Advanced'), true);
  });

  it('Q15 / Q16 Next moves forward and Back keeps earlier answers', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await page.getByLabel('Cottagecore', { exact: true }).check();
    await page.getByLabel('Sporty', { exact: true }).check();
    await next(page).click();
    await expectPath(page, '/questions/2');
    await page.getByLabel('Earth', { exact: true }).check();
    await next(page).click();
    await expectPath(page, '/questions/3');
    await back(page).click();
    await expectPath(page, '/questions/2');
    assert.equal(await checked(page, 'Earth'), true);
    await back(page).click();
    await expectPath(page, '/questions/1');
    assert.equal(await checked(page, 'Cottagecore'), true);
    assert.equal(await checked(page, 'Sporty'), true);
  });

  it('Q17 Back on Question 1 returns to the page before it', async () => {
    const page = await ctx.newPage();
    await signUp(page); // Sign Up → Question 1
    await back(page).click();
    await expectPath(page, '/signup');
  });

  it('Q18 / Q20 Skip moves on without answering; Skip on Question 5 shows Profile Complete', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    for (let step = 1; step <= 4; step++) {
      await skip(page).click();
      await expectPath(page, `/questions/${step + 1}`);
    }
    await skip(page).click();
    await expectPath(page, '/profile-complete');
  });

  it('Q19 Next on Question 5 with a tool shows Profile Complete', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await answerQuestions(page);
    await expectPath(page, '/profile-complete');
  });

  it('Q21 / P6 Edit from Preferences opens Question 4 and returns to Preferences with the update', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page); // Beginner · Scissors
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForURL(/\/questions\/4\?edit=1$/);
    assert.equal(await checked(page, 'Beginner'), true, 'saved level is selected (P6)');
    await page.getByLabel('Advanced', { exact: true }).check();
    await next(page).click();
    await page.waitForURL(/\/questions\/5\?edit=1$/);
    await page.getByLabel('Sewing Machine', { exact: true }).check();
    await next(page).click();
    await expectPath(page, '/preferences');
    assert.match(await textOf(page.locator('.prefs-summary')), /Advanced · Scissors, Sewing Machine/);

    // Skip on Question 5 in edit mode also returns to Preferences.
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForURL(/\/questions\/4\?edit=1$/);
    await skip(page).click();
    await skip(page).click();
    await expectPath(page, '/preferences');
  });
});

describe('Profile Complete page', () => {
  it('PC1–PC3 shows the chosen styles, experience level and tools', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await answerQuestions(page, { 1: ['Vintage', 'Minimalist'], 4: ['Intermediate'], 5: ['Scissors', 'Needle and Thread'] });
    await expectPath(page, '/profile-complete');
    assert.equal(await textOf(heading(page)), 'You’re all set!');
    const summary = await textOf(page.locator('.summary'));
    assert.match(summary, /Style\s*Vintage, Minimalist/);
    assert.match(summary, /Experience\s*Intermediate/);
    assert.match(summary, /Tools\s*Scissors, Needle and Thread/);
  });

  it('PC4 skipped answers show "Not set"', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await answerQuestions(page, { 1: null, 4: null, 5: null });
    const summary = await textOf(page.locator('.summary'));
    assert.match(summary, /Style\s*Not set/);
    assert.match(summary, /Experience\s*Not set/);
    assert.match(summary, /Tools\s*Not set/);
  });

  it('PC5 Start Upcycling shows Clothing Upload', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await answerQuestions(page);
    await page.getByRole('button', { name: 'Start Upcycling' }).click();
    await expectPath(page, '/upload');
  });
});
