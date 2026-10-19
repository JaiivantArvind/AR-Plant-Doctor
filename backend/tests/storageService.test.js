const { test, describe } = require('node:test');
const assert = require('node:assert');
const storageService = require('../src/services/storageService');

describe('StorageService', () => {
    test('getPlants returns an object containing existing plant records', () => {
        const plants = storageService.getPlants();
        assert.strictEqual(typeof plants, 'object');
        assert.ok(!Array.isArray(plants));
        assert.ok(plants['1'], 'Plant #1 should exist');
        assert.strictEqual(plants['1'].name, 'Peace Lily');
    });

    test('savePlants rejects invalid payloads', () => {
        assert.throws(() => storageService.savePlants(null), /Invalid plants data payload/);
        assert.throws(() => storageService.savePlants([]), /Invalid plants data payload/);
        assert.throws(() => storageService.savePlants('string'), /Invalid plants data payload/);
    });
});
