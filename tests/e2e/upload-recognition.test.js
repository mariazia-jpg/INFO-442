// Progress tracker (PT1–PT5), Clothing Upload (U1–U22), Clothing Recognition (C1–C11).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brokenPhoto, oversizedPhoto, pdfFile, photo, textFile } from './fixtures.js';
import {
  choosePhoto, expectPath, expectUrl, heading, reachPreferences, setup, signUp, signUpAndOnboard, textOf, uploadAndIdentify,
} from './helpers.js';

const ctx = setup();

const continueButton = (page) => page.getByRole('button', { name: 'Continue' });
const alert = (page) => page.getByRole('alert');
const preview = (page) => page.getByRole('img', { name: 'Preview of your clothing photo' });
const currentStep = (page) => page.locator('.progress li[aria-current="step"]');
const previewSrc = (page) => preview(page).getAttribute('src');

describe('Progress tracker', () => {
  it('PT1–PT5 lists the four steps and marks the current one', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    assert.deepEqual(await page.locator('.progress li').allInnerTexts(), ['Upload', 'Identify', 'Preferences', 'Ideas']);
    assert.equal(await textOf(currentStep(page)), 'Upload');
    await uploadAndIdentify(page, 'tshirt');
    assert.equal(await textOf(currentStep(page)), 'Identify');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expectPath(page, '/preferences');
    assert.equal(await textOf(currentStep(page)), 'Preferences');
    await continueButton(page).click();
    await expectPath(page, '/ideas');
    assert.equal(await textOf(currentStep(page)), 'Ideas');
    await page.locator('.project-card a').first().click();
    await expectUrl(page, /\/ideas\/.+/);
    assert.equal(await textOf(currentStep(page)), 'Ideas');
  });

  it('is not shown outside the upcycling flow', async () => {
    const page = await ctx.newPage();
    await page.go('/');
    assert.equal(await page.locator('.progress').count(), 0);
  });
});

describe('Clothing Upload page', () => {
  it('U1 / U2 shows an upload area listing JPG, PNG, HEIC with Continue disabled', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    assert.match(await textOf(page.locator('.dropzone')), /JPG, PNG, HEIC/);
    assert.equal(await continueButton(page).isDisabled(), true);
  });

  it('U3 / U4 the upload area opens the device picker for photos (camera or library on phones)', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    const input = page.locator('#photo-input');
    assert.equal(await input.getAttribute('type'), 'file');
    assert.equal(await input.getAttribute('capture'), null, 'no capture attribute, so phones offer camera and library');
    assert.match(await input.getAttribute('accept'), /image\/jpeg.*image\/png.*image\/heic/);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.dropzone').click()]);
    assert.equal(chooser.isMultiple(), false);
  });

  it('U5–U8 a supported photo shows a preview with Replace, Remove and Continue enabled', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    for (const file of [photo('tshirt', { ext: 'jpg' }), photo('top', { ext: 'png' })]) {
      await choosePhoto(page, file);
      await preview(page).waitFor();
      assert.equal(await textOf(heading(page)), 'Looking good?');
      assert.ok(await page.getByRole('button', { name: 'Replace' }).isVisible());
      assert.ok(await page.getByRole('button', { name: 'Remove' }).isVisible());
      assert.equal(await continueButton(page).isEnabled(), true);
    }
  });

  it('U5 HEIC files are accepted', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, photo('skirt', { ext: 'heic', mimeType: '' }));
    assert.equal(await textOf(heading(page)), 'Looking good?');
    assert.equal(await alert(page).count(), 0);
    assert.equal(await continueButton(page).isEnabled(), true);
  });

  it('U9 / U10 Replace opens the picker and shows the new photo', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, photo('tshirt'));
    const before = await previewSrc(page);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Replace' }).click()]);
    await chooser.setFiles(photo('pants'));
    await page.waitForFunction((old) => document.querySelector('.preview img')?.src !== old, before);
    assert.notEqual(await previewSrc(page), before);
  });

  it('U11 / U12 Remove clears the preview and disables Continue', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, photo('tshirt'));
    await page.getByRole('button', { name: 'Remove' }).click();
    assert.equal(await preview(page).count(), 0);
    assert.ok(await page.locator('.dropzone').isVisible());
    assert.equal(await continueButton(page).isDisabled(), true);
  });

  it('U13 / U15 an unsupported file shows an error and keeps Continue disabled', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    for (const file of [textFile(), pdfFile(), { ...photo('pants'), name: 'pants.gif', mimeType: 'image/gif' }]) {
      await choosePhoto(page, file);
      assert.match(await textOf(alert(page)), /isn.t supported/i, file.name);
      assert.equal(await continueButton(page).isDisabled(), true);
    }
    // Choosing a good photo clears the error.
    await choosePhoto(page, photo('pants'));
    assert.equal(await alert(page).count(), 0);
  });

  it('U14 / U15 a photo over 10 MB shows a too-large error', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, oversizedPhoto());
    assert.match(await textOf(alert(page)), /larger than 10 MB/i);
    assert.equal(await continueButton(page).isDisabled(), true);
  });

  it('U16 closing the picker without a file leaves the page unchanged', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, photo('tshirt'));
    const before = await previewSrc(page);
    await choosePhoto(page, []);
    assert.equal(await previewSrc(page), before);
    assert.equal(await continueButton(page).isEnabled(), true);
  });

  it('U17 / U18 Continue shows a loading screen with a thumbnail and an identifying message', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, photo('tshirt'));
    await continueButton(page).click();
    await page.getByRole('heading', { name: 'Identifying your item…' }).waitFor({ timeout: 2000 });
    assert.ok(await page.getByRole('img', { name: 'Your clothing photo' }).isVisible());
    await expectPath(page, '/identify');
  });

  it('U19–U21 a photo that cannot be processed shows the error page; Try Again retries the same photo', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, brokenPhoto());
    await continueButton(page).click();
    await page.getByRole('heading', { name: /couldn.t process your image/i }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Try Again' }).isVisible());
    assert.ok(await page.getByRole('button', { name: 'Choose Another' }).isVisible());
    await page.getByRole('button', { name: 'Try Again' }).click();
    await page.getByRole('heading', { name: /couldn.t process your image/i }).waitFor();
    await expectPath(page, '/upload');
  });

  it('U22 Choose Another returns to Upload with no photo selected', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await choosePhoto(page, brokenPhoto());
    await continueButton(page).click();
    await page.getByRole('button', { name: 'Choose Another' }).click();
    assert.equal(await textOf(heading(page)), 'Add your clothing item');
    assert.equal(await continueButton(page).isDisabled(), true);
  });
});

describe('Clothing Recognition page', () => {
  it('C1–C4 shows the photo, four options, and the identified type named and selected', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'pants');
    assert.ok(await page.getByRole('img', { name: 'Your uploaded clothing photo' }).isVisible());
    assert.deepEqual(await page.locator('fieldset .option-label').allInnerTexts(), ['T-shirt', 'Top', 'Pants', 'Skirt']);
    assert.match(await textOf(heading(page)), /pants/i);
    assert.equal(await page.getByLabel('Pants', { exact: true }).isChecked(), true);
  });

  it('C5 choosing another type selects only that one', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'tshirt');
    await page.getByLabel('Skirt', { exact: true }).check();
    assert.equal(await page.getByLabel('Skirt', { exact: true }).isChecked(), true);
    assert.equal(await page.getByLabel('T-shirt', { exact: true }).isChecked(), false);
  });

  it('C6 / C7 "None of these" explains the supported types and offers Choose Another', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'skirt');
    await page.getByRole('button', { name: 'None of these' }).click();
    assert.match(await textOf(page.getByRole('status')), /only T-shirts, tops, pants, and skirts/i);
    await page.getByRole('button', { name: 'Choose Another' }).click();
    await expectPath(page, '/upload');
  });

  it('C8–C10 when nothing is identified: failure message, nothing selected, Confirm disabled until a choice', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'mystery');
    assert.equal(await textOf(heading(page)), 'Choose your item type');
    assert.match(await textOf(alert(page)), /couldn.t identify this item/i);
    assert.equal(await page.locator('fieldset input:checked').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Confirm' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'None of these' }).count(), 0);
    await page.getByLabel('Top', { exact: true }).check();
    assert.equal(await page.getByRole('button', { name: 'Confirm' }).isEnabled(), true);
  });

  it('C11 Confirm saves the type and shows Preferences; a corrected type is the one used', async () => {
    const page = await ctx.newPage();
    await signUpAndOnboard(page);
    await uploadAndIdentify(page, 'tshirt');
    await page.getByLabel('Skirt', { exact: true }).check();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expectPath(page, '/preferences');
    await continueButton(page).click();
    await expectPath(page, '/ideas');
    assert.equal(await textOf(heading(page)), 'Ideas for your skirt');
  });

  it('a new upload replaces the previous result', async () => {
    const page = await ctx.newPage();
    await reachPreferences(page, { name: 'tshirt' });
    await uploadAndIdentify(page, 'skirt');
    assert.equal(await page.getByLabel('Skirt', { exact: true }).isChecked(), true);
  });

  it('the result survives a page refresh', async () => {
    const page = await ctx.newPage();
    await signUp(page);
    await uploadAndIdentify(page, 'top');
    await page.reload();
    await expectPath(page, '/identify');
    assert.equal(await page.getByLabel('Top', { exact: true }).isChecked(), true);
  });
});
