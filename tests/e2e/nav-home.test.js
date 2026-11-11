// Navigation bar (N1–N10), Home page (H1–H5), General errors (E1–E2).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertNoPageErrors, expectPath, heading, setup, signUp, textOf } from './helpers.js';

const ctx = setup();

const menuButton = (page) => page.getByRole('button', { name: /menu/i });
const menu = (page) => page.getByRole('navigation', { name: 'Site' });

describe('Navigation bar', () => {
  it('N1 shows the ReWear name and a menu icon on every page', async () => {
    const page = await ctx.newPage();
    for (const path of ['/', '/signup', '/login', '/does-not-exist']) {
      await page.go(path);
      assert.equal(await textOf(page.locator('header .brand')), 'ReWear', path);
      assert.ok(await menuButton(page).isVisible(), `menu icon on ${path}`);
    }
    await signUp(page);
    for (const path of ['/questions/1', '/upload']) {
      await page.go(path);
      assert.ok(await page.locator('header .brand').isVisible(), path);
      assert.ok(await menuButton(page).isVisible(), path);
    }
  });

  it('N2 selecting the ReWear name shows the Home page', async () => {
    const page = await ctx.newPage();
    await page.go('/login');
    await page.locator('header .brand').click();
    await expectPath(page, '/');
    assert.match(await textOf(heading(page)), /Turn clothes/);
  });

  it('N3 / N4 the menu icon shows and hides the navigation options', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    assert.equal(await menu(page).count(), 0);
    await menuButton(page).click();
    assert.ok(await menu(page).isVisible());
    assert.equal(await menuButton(page).getAttribute('aria-expanded'), 'true');
    await menuButton(page).click();
    assert.equal(await menu(page).count(), 0);
    assert.equal(await menuButton(page).getAttribute('aria-expanded'), 'false');
  });

  it('N6 logged out: the options are Home and Log In', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    await menuButton(page).click();
    const options = await menu(page).locator('a, button').allInnerTexts();
    assert.deepEqual(options.map((t) => t.trim()), ['Home', 'Log In']);
  });

  it('N5 logged in: the options are Home, Start Upcycling and Log Out', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await menuButton(page).click();
    const options = await menu(page).locator('a, button').allInnerTexts();
    assert.deepEqual(options.map((t) => t.trim()), ['Home', 'Start Upcycling', 'Log Out']);
  });

  it('N7 Home option shows the Home page', async () => {
    const page = await ctx.newPage();
    await page.go('/login');
    await menuButton(page).click();
    await menu(page).getByRole('link', { name: 'Home' }).click();
    await expectPath(page, '/');
    assert.equal(await menu(page).count(), 0, 'menu closes after choosing');
  });

  it('N8 Start Upcycling shows the Clothing Upload page', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await menuButton(page).click();
    await menu(page).getByRole('link', { name: 'Start Upcycling' }).click();
    await expectPath(page, '/upload');
    assert.equal(await textOf(heading(page)), 'Add your clothing item');
  });

  it('N9 Log Out logs the user out and shows the Home page', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await menuButton(page).click();
    await menu(page).getByRole('button', { name: 'Log Out' }).click();
    await expectPath(page, '/');
    await menuButton(page).click();
    assert.ok(await menu(page).getByRole('link', { name: 'Log In' }).isVisible(), 'now logged out');
  });

  it('N10 Log In option shows the Log In page', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    await menuButton(page).click();
    await menu(page).getByRole('link', { name: 'Log In' }).click();
    await expectPath(page, '/login');
    assertNoPageErrors(page);
  });
});

describe('Home page', () => {
  it('H1–H3 shows a headline, description, How it works steps and Get Started', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    assert.match(await textOf(heading(page)), /Turn clothes you don.t wear into something you love/);
    assert.ok(await page.locator('main .lead').first().isVisible());
    const how = page.getByRole('region', { name: 'How it works' });
    const steps = await how.locator('h3').allInnerTexts();
    assert.deepEqual(steps, ['Upload a photo', 'Tell us your level', 'Pick an idea']);
    assert.ok(await page.getByRole('button', { name: 'Get Started' }).isVisible());
  });

  it('H4 logged out: Get Started shows Sign Up', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expectPath(page, '/signup');
  });

  it('H5 logged in: Get Started shows Clothing Upload', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await page.go('/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expectPath(page, '/upload');
  });
});

describe('General errors', () => {
  it('E1 / E2 an unknown URL shows page-not-found with a Home link', async () => {
    const page = await ctx.newPage();
    await page.go('/this/page/does/not/exist');
    assert.equal(await textOf(heading(page)), 'Page not found');
    await page.getByRole('link', { name: /Home page/ }).click();
    await expectPath(page, '/');
  });
});
