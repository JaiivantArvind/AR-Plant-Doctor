const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const markerService = require('../src/services/markerService');
const config = require('../src/config');

describe('MarkerService', () => {
    test('generateMarkerFiles creates valid 512x512 PNG and 195-line .patt files', () => {
        const testId = 999;
        const result = markerService.generateMarkerFiles(testId);

        assert.strictEqual(result.success, true);
        assert.ok(result.imagePath.includes('marker-999.png'));
        assert.ok(result.pattPath.includes('marker-999.patt'));

        const pngDiskPath = path.join(config.ICONS_DIR, `marker-${testId}.png`);
        const pattDiskPath = path.join(config.MARKERS_DIR, `marker-${testId}.patt`);

        assert.ok(fs.existsSync(pngDiskPath), 'PNG file must exist on disk');
        assert.ok(fs.existsSync(pattDiskPath), 'PATT file must exist on disk');

        const pattContent = fs.readFileSync(pattDiskPath, 'utf8');
        const lines = pattContent.trim().split('\n');
        assert.strictEqual(lines.length, 195, 'ARToolKit pattern must have exactly 195 lines');

        // Clean up test files
        markerService.removeMarkerFiles(testId);
        assert.ok(!fs.existsSync(pngDiskPath), 'PNG should be removed');
        assert.ok(!fs.existsSync(pattDiskPath), 'PATT should be removed');
    });
});
