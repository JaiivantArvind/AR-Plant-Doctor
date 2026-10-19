const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');

describe('API Integration', () => {
    let server;
    let baseUrl;

    before((_, done) => {
        // Start on ephemeral port
        server = http.createServer(app);
        server.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            done();
        });
    });

    after((_, done) => {
        server.close(done);
    });

    test('GET /api/plants returns JSON dictionary of plants', async () => {
        const res = await fetch(`${baseUrl}/api/plants`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('application/json'));

        const data = await res.json();
        assert.strictEqual(typeof data, 'object');
        assert.ok(data['1'], 'Plant #1 must exist');
    });

    test('GET / serves Frontend/dashboard/index.html (Care Dashboard)', async () => {
        const res = await fetch(`${baseUrl}/`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('AR Plant Doctor — Dashboard'));
    });

    test('GET /scanner serves Frontend/index.html (AR Scanner)', async () => {
        const res = await fetch(`${baseUrl}/scanner`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('AR Plant Doctor — Scanner'));
    });

    test('GET /dashboard serves Frontend/dashboard/index.html', async () => {
        const res = await fetch(`${baseUrl}/dashboard/`);
        assert.strictEqual(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('AR Plant Doctor — Dashboard'));
    });
});
