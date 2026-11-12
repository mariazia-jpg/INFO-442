// Recognition Failure Handling (Issue 4: C8–C10) for each kind of failure.
// The e2e build's filename recognizer simulates the failure named in the file.
// Timeouts are covered by tests/unit/recognition.test.js.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertNoPageErrors, heading, setup, signUpAndOnboard, textOf, uploadAndIdentify } from './helpers.js';

const ctx = setup();

const FAILURES = [
  { name: 'api-error', label: 'an API or network error' },
  { name: 'malformed', label: 'a malformed reply' },
  { name: 'mystery', label: 'an "unknown" category' },
];

describe('Recognition failure handling', () => {
  FAILURES.forEach((failure) => {
    it(`C8–C10 ${failure.label} shows the failure message and manual selection`, async () => {
      const page = await ctx.newPage();
      await signUpAndOnboard(page);
      await uploadAndIdentify(page, failure.name);

      assert.equal(await textOf(heading(page)), 'Choose your item type');
      assert.match(await textOf(page.getByRole('alert')), /couldn.t identify this item/i);
      assert.equal(await page.locator('fieldset input:checked').count(), 0);
      const confirm = page.getByRole('button', { name: 'Confirm' });
      assert.equal(await confirm.isDisabled(), true);

      await page.getByLabel('Pants', { exact: true }).check();
      assert.equal(await confirm.isEnabled(), true);
      assertNoPageErrors(page);
    });
  });
});
