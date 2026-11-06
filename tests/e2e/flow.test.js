// The core workflow from the home page to a tutorial (issues #12 and #24).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNoPageErrors, expectPath, heading, setup, signUpAndOnboard, textOf, uploadAndIdentify,
} from './helpers.js';

const ctx = setup();

describe('core workflow', () => {
  it('goes from Home to a tutorial for a T-shirt', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expectPath(page, '/signup');

    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'tshirt');
    assert.match(await textOf(heading(page)), /T-shirt/);
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expectPath(page, '/preferences');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expectPath(page, '/ideas');
    assert.equal(await textOf(heading(page)), 'Ideas for your T-shirt');
    const cards = page.locator('.project-card');
    await cards.first().waitFor();
    assert.ok((await cards.count()) > 0, 'expected at least one project card');

    await cards.first().getByRole('link', { name: /View Project/ }).click();
    await page.waitForURL(/\/ideas\/[\w-]+$/);
    const tutorial = page.getByRole('link', { name: /Open Tutorial/ });
    assert.equal(await tutorial.getAttribute('target'), '_blank');
    assert.match(await tutorial.getAttribute('href'), /^https:\/\//);
    assertNoPageErrors(page);
  });
});
