// Clothing recognition result handling (Issue 2: Gemini categories; Issue 4: failures).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOGNITION_CATEGORIES, base64FromDataUrl, categoryFromClothingType, clothingTypeFromCategory,
  parseRecognitionReply, resolveClothingType,
} from '../../src/lib/recognitionResult.js';
import { CLOTHING_TYPES } from '../../src/lib/constants.js';

function replyWith(result) {
  return () => {
    return Promise.resolve(result);
  };
}

function failWith(message) {
  return () => {
    return Promise.reject(new Error(message));
  };
}

function never() {
  return new Promise(() => {});
}

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

describe('resolveClothingType', () => {
  it('C3 / C4 returns the identified clothing type', async () => {
    assert.equal(await resolveClothingType(replyWith({ category: 'pants' }), 1000), 'Pants');
  });

  it('C8 "unknown" counts as not identified', async () => {
    assert.equal(await resolveClothingType(replyWith({ category: 'unknown' }), 1000), null);
  });

  it('C8 an API or network error counts as not identified', async () => {
    assert.equal(await resolveClothingType(failWith('Failed to fetch'), 1000), null);
  });

  it('C8 a recognizer that throws synchronously counts as not identified', async () => {
    const recognize = () => {
      throw new Error('boom');
    };
    assert.equal(await resolveClothingType(recognize, 1000), null);
  });

  it('C8 a malformed result counts as not identified', async () => {
    assert.equal(await resolveClothingType(replyWith({ category: 'jacket' }), 1000), null);
    assert.equal(await resolveClothingType(replyWith(null), 1000), null);
  });

  it('C8 / NF-P3 a recognizer that takes too long times out', async () => {
    const started = Date.now();
    assert.equal(await resolveClothingType(never, 50), null);
    assert.ok(Date.now() - started < 1000, 'should give up at the timeout');
  });
});
