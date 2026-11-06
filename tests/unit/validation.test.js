import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isValidEmail, validateLogIn, validatePhoto, validateSignUp } from '../../src/lib/validation.js';
import { clothingTypeFromFileName, clothingTypeFromPredictions } from '../../src/lib/clothingLabels.js';
import { sha256Bytes, sha256Hex } from '../../src/lib/sha256.js';

const file = (name, type, size = 1000) => ({ name, type, size });

describe('Sign Up and Log In validation', () => {
  it('S11 / L8 empty fields come first', () => {
    assert.equal(validateSignUp('', ''), 'email-required');
    assert.equal(validateSignUp('a@b.co', ''), 'password-required');
    assert.equal(validateLogIn('  ', 'x'), 'email-required');
    assert.equal(validateLogIn('a@b.co', ''), 'password-required');
  });

  it('S10 rejects badly formatted emails', () => {
    for (const bad of ['plainaddress', 'missing-at.example.com', 'a@b', 'a b@c.com', '@example.com']) {
      assert.equal(isValidEmail(bad), false, bad);
      assert.equal(validateSignUp(bad, 'long-enough-1'), 'invalid-email', bad);
    }
    assert.equal(isValidEmail('kenneth@uw.edu'), true);
  });

  it('S9 requires 8 or more characters', () => {
    assert.equal(validateSignUp('a@b.co', '1234567'), 'weak-password');
    assert.equal(validateSignUp('a@b.co', '12345678'), null);
  });
});

describe('validatePhoto', () => {
  it('U5 accepts JPG, PNG and HEIC', () => {
    assert.equal(validatePhoto(file('shirt.jpg', 'image/jpeg')), null);
    assert.equal(validatePhoto(file('shirt.JPEG', 'image/jpeg')), null);
    assert.equal(validatePhoto(file('shirt.png', 'image/png')), null);
    assert.equal(validatePhoto(file('IMG_0001.HEIC', '')), null, 'Chrome reports HEIC with no type');
    assert.equal(validatePhoto(file('IMG_0001.heic', 'image/heic')), null);
    assert.equal(validatePhoto(file('camera-photo', 'image/jpeg')), null, 'no extension, image type');
  });

  it('U13 rejects other types, including mismatched ones', () => {
    for (const bad of [
      file('notes.txt', 'text/plain'),
      file('pattern.pdf', 'application/pdf'),
      file('anim.gif', 'image/gif'),
      file('photo.webp', 'image/webp'),
      file('fake.jpg', 'application/pdf'),
      file('noextension', ''),
    ]) {
      assert.equal(validatePhoto(bad), 'unsupported', bad.name);
    }
    assert.equal(validatePhoto(null), 'unsupported');
  });

  it('U14 rejects files over 10 MB', () => {
    assert.equal(validatePhoto(file('big.jpg', 'image/jpeg', 10 * 1024 * 1024)), null, 'exactly 10 MB is fine');
    assert.equal(validatePhoto(file('big.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1)), 'too-large');
  });
});

describe('clothing label mapping', () => {
  it('maps classifier labels to the four types', () => {
    assert.equal(clothingTypeFromPredictions([{ className: 'jersey, T-shirt, tee shirt', probability: 0.6 }]), 'T-shirt');
    assert.equal(clothingTypeFromPredictions([{ className: 'jean, blue jean, denim', probability: 0.4 }]), 'Pants');
    assert.equal(clothingTypeFromPredictions([{ className: 'miniskirt, mini', probability: 0.3 }]), 'Skirt');
    assert.equal(clothingTypeFromPredictions([{ className: 'cardigan', probability: 0.5 }]), 'Top');
  });

  it('adds up related labels and picks the strongest type', () => {
    const result = clothingTypeFromPredictions([
      { className: 'jersey, T-shirt, tee shirt', probability: 0.2 },
      { className: 'miniskirt, mini', probability: 0.12 },
      { className: 'overskirt', probability: 0.12 },
    ]);
    assert.equal(result, 'Skirt');
  });

  it('returns null for unrelated or low-confidence results (C8)', () => {
    assert.equal(clothingTypeFromPredictions([{ className: 'golden retriever', probability: 0.9 }]), null);
    assert.equal(clothingTypeFromPredictions([{ className: 'cardigan', probability: 0.05 }]), null);
    assert.equal(clothingTypeFromPredictions([]), null);
  });

  it('test build reads the type from the file name', () => {
    assert.equal(clothingTypeFromFileName('my-tshirt.jpg'), 'T-shirt');
    assert.equal(clothingTypeFromFileName('jeans.png'), 'Pants');
    assert.equal(clothingTypeFromFileName('mystery.png'), null);
  });
});

describe('sha256', () => {
  it('pure-JS fallback matches Node crypto', async () => {
    for (const text of ['', 'abc', 'salt:password123', 'x'.repeat(1000), 'émoji 👕']) {
      const expected = createHash('sha256').update(text, 'utf8').digest('hex');
      const fallback = Buffer.from(sha256Bytes(new TextEncoder().encode(text))).toString('hex');
      assert.equal(fallback, expected, JSON.stringify(text.slice(0, 10)));
      assert.equal(await sha256Hex(text), expected);
    }
  });
});
