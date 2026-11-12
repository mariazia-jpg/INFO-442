// Gemini reply parsing and category mapping (Issue 2).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOGNITION_CATEGORIES, base64FromDataUrl, categoryFromClothingType, clothingTypeFromCategory,
  parseRecognitionReply,
} from '../../src/lib/recognitionResult.js';
import { CLOTHING_TYPES } from '../../src/lib/constants.js';

describe('parseRecognitionReply', () => {
  it('accepts every category in the enum', () => {
    RECOGNITION_CATEGORIES.forEach((category) => {
      assert.deepEqual(parseRecognitionReply(JSON.stringify({ category })), { category });
    });
  });

  it('rejects text that is not JSON', () => {
    assert.throws(() => {
      parseRecognitionReply('It looks like a T-shirt!');
    });
  });

  it('rejects a category outside the enum', () => {
    assert.throws(() => {
      parseRecognitionReply('{"category":"jacket"}');
    });
  });

  it('rejects a reply with no category', () => {
    assert.throws(() => {
      parseRecognitionReply('{"type":"tshirt"}');
    });
    assert.throws(() => {
      parseRecognitionReply('null');
    });
  });
});

describe('category ↔ clothing type', () => {
  it('maps the four categories onto the four clothing types (C2)', () => {
    const clothingTypes = ['tshirt', 'top', 'pants', 'skirt'].map((category) => {
      return clothingTypeFromCategory(category);
    });
    assert.deepEqual(clothingTypes, CLOTHING_TYPES);
  });

  it('maps unknown to null', () => {
    assert.equal(clothingTypeFromCategory('unknown'), null);
  });

  it('round-trips every clothing type, and a missing type becomes unknown', () => {
    CLOTHING_TYPES.forEach((clothingType) => {
      assert.equal(clothingTypeFromCategory(categoryFromClothingType(clothingType)), clothingType);
    });
    assert.equal(categoryFromClothingType(null), 'unknown');
  });
});

describe('base64FromDataUrl', () => {
  it('drops the data-URL prefix', () => {
    assert.equal(base64FromDataUrl('data:image/jpeg;base64,AAAA'), 'AAAA');
  });
});
