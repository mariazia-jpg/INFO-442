// Checks for the non-functional requirements that can be automated.
// NF-P1–P5, NF-A1, NF-A3, NF-A7, NF-A8 and NF-A9 still need the named tools
// (PageSpeed Insights, Lighthouse, WebAIM, VoiceOver/NVDA, real browsers, W3C validator).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { photo } from './fixtures.js';
import { choosePhoto, expectPath, expectUrl, reachPreferences, setup, signUp, signUpAndOnboard } from './helpers.js';

const ctx = setup();

/** Visits every page type and calls `check(page, label)` on each. */
async function visitAllPages(page, check) {
  await page.go('/');
  await check(page, 'home');
  await page.go('/login');
  await check(page, 'login');
  await page.go('/missing-page');
  await check(page, '404');
  await signUp(page);
  await check(page, 'signup → question 1');
  await page.go('/questions/4');
  await check(page, 'question 4');
  await page.go('/profile-complete');
  await check(page, 'profile complete');
  await page.go('/upload');
  await check(page, 'upload');
  await choosePhoto(page, photo('tshirt'));
  await check(page, 'upload preview');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectPath(page, '/identify');
  await check(page, 'recognition');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expectPath(page, '/preferences');
  await check(page, 'preferences');
  await page.go('/questions/4?edit=1');
  await page.getByLabel('Advanced', { exact: true }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Scissors', { exact: true }).check();
  await page.getByLabel('Sewing Machine', { exact: true }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await expectPath(page, '/preferences');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('.project-card').first().waitFor();
  await check(page, 'recommendations');
  await page.locator('.project-card a').first().click();
  await expectUrl(page, /\/ideas\/.+/);
  await page.locator('.hero-image').waitFor();
  await check(page, 'tutorial details');
}

describe('Responsive layout (NF-A6)', () => {
  for (const width of [360, 768, 1440]) {
    it(`no horizontal scrolling at ${width}px`, async () => {
      const page = await ctx.newPage({ viewport: { width, height: 900 } });
      await visitAllPages(page, async (p, label) => {
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `${label} overflows by ${overflow}px at ${width}px`);
      });
    });
  }
});

describe('Text alternatives (NF-A4)', () => {
  it('every image has alt text', async () => {
    const page = await ctx.newPage();
    await visitAllPages(page, async (p, label) => {
      const missing = await p.$$eval('img', (imgs) => imgs.filter((img) => !img.hasAttribute('alt') || !img.alt.trim()).map((img) => img.src));
      assert.deepEqual(missing, [], `images without alt on ${label}`);
    });
  });
});

describe('Target size (NF-A10)', () => {
  it('every visible control is at least 24 × 24 px', async () => {
    const page = await ctx.newPage();
    await visitAllPages(page, async (p, label) => {
      const small = await p.$$eval('a, button, input:not([type="file"]), label.option, [role="button"]', (els) =>
        els
          .filter((el) => {
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            if (el.classList.contains('skip-link') || el.closest('.visually-hidden')) return false;
            if (el.matches('.option input')) return false; // the whole option card is the target
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24);
          })
          .map((el) => `${el.tagName} "${el.textContent.trim().slice(0, 30)}"`),
      );
      assert.deepEqual(small, [], `small targets on ${label}`);
    });
  });
});

describe('Keyboard access (NF-A2)', () => {
  it('the upload → recommendations flow works with only the keyboard', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    // Focus lands on the hidden file input inside the upload area.
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.id);
    for (let i = 0; i < 10 && focused !== 'photo-input'; i++) {
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.id);
    }
    assert.equal(focused, 'photo-input', 'upload control reachable by Tab');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Space')]);
    await chooser.setFiles(photo('tshirt'));

    const pressOn = async (name) => {
      const button = page.getByRole('button', { name });
      await button.waitFor();
      await button.focus();
      await page.keyboard.press('Enter');
    };
    await pressOn('Continue');
    await expectPath(page, '/identify');
    // Radio group: arrow keys change the choice.
    await page.getByLabel('T-shirt', { exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByLabel('Top', { exact: true }).isChecked(), true);
    await pressOn('Confirm');
    await expectPath(page, '/preferences');
    await pressOn('Continue');
    await expectPath(page, '/ideas');
  });

  it('focus moves to the new page heading after navigation', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page);
    // Focus moves in an effect that runs just after the new page is drawn.
    await page.waitForFunction(() => document.activeElement?.tagName === 'H1', null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Confirm your preferences');
  });
});

describe('Robustness', () => {
  it('no uncaught errors across every page', async () => {
    const page = await ctx.newPage();
    await visitAllPages(page, async () => {});
    assert.deepEqual(page.errors.map(String), []);
  });
});
