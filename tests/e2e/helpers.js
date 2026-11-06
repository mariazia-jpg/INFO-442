// Shared setup for the end-to-end tests: one server and one browser per test
// file, and a fresh browser context (empty storage) per test.
import { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.js';
import { photo } from './fixtures.js';

export const PASSWORD = 'upcycle-123';

export function setup() {
  const ctx = { server: null, browser: null };
  before(async () => {
    ctx.server = await startServer();
    ctx.browser = await chromium.launch();
  });
  after(async () => {
    await ctx.browser?.close();
    await ctx.server?.close();
  });

  /** A new page with empty storage, sized like a phone unless told otherwise. */
  ctx.newPage = async (options = {}) => {
    const context = await ctx.browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('pageerror', (error) => page.errors.push(error));
    page.go = (path) => page.goto(ctx.server.url + path);
    return page;
  };
  return ctx;
}

let counter = 0;
export function uniqueEmail() {
  counter += 1;
  return `tester${Date.now()}${counter}@example.com`;
}

export const heading = (page) => page.locator('main h1');

export async function expectPath(page, path) {
  await page.waitForURL((url) => url.pathname === path, { timeout: 5000 });
}

export async function textOf(locator) {
  return (await locator.innerText()).replace(/\s+/g, ' ').trim();
}

export async function signUp(page, email = uniqueEmail(), password = PASSWORD) {
  await page.go('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expectPath(page, '/questions/1');
  return { email, password };
}

/**
 * Answers the five style questions. `answers` maps question number to labels;
 * a question set to null is skipped.
 */
export async function answerQuestions(page, answers = {}) {
  const defaults = {
    1: ['Streetwear'],
    2: ['Black'],
    3: ['Tops'],
    4: ['Beginner'],
    5: ['Scissors'],
  };
  for (let step = 1; step <= 5; step++) {
    await expectPath(page, `/questions/${step}`);
    const choice = step in answers ? answers[step] : defaults[step];
    if (choice === null) {
      await page.getByRole('link', { name: 'Skip', exact: true }).click();
      continue;
    }
    for (const label of choice) await page.getByLabel(label, { exact: true }).check();
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

/** Signs up, answers the questions, and lands on the Upload page. */
export async function signUpAndOnboard(page, answers) {
  const account = await signUp(page);
  await answerQuestions(page, answers);
  await expectPath(page, '/profile-complete');
  await page.getByRole('button', { name: 'Start Upcycling' }).click();
  await expectPath(page, '/upload');
  return account;
}

export async function choosePhoto(page, file) {
  await page.locator('#photo-input').setInputFiles(file);
}

/** Uploads a photo named after the clothing type and continues to Clothing Recognition. */
export async function uploadAndIdentify(page, name = 'tshirt') {
  if (new URL(page.url()).pathname !== '/upload') await page.go('/upload');
  await choosePhoto(page, photo(name));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectPath(page, '/identify');
}

/** From a fresh page: account → questions → upload → confirm type → Preferences. */
export async function reachPreferences(page, { name = 'tshirt', answers } = {}) {
  await signUpAndOnboard(page, answers);
  await uploadAndIdentify(page, name);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expectPath(page, '/preferences');
}

export function assertNoPageErrors(page) {
  assert.deepEqual(page.errors.map(String), [], 'page threw uncaught errors');
}
