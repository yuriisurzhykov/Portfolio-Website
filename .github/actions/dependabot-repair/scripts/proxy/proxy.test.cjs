const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {once} = require('node:events');
async function fixture(t) {
    const calls = [];
    const upstream = http.createServer((req, res) => {
        let body = ''; req.on('data', chunk => body += chunk);
        req.on('end', () => {calls.push({headers: req.headers, body}); res.writeHead(200, {'content-type': 'text/event-stream', 'x-secret': 'canary'}); res.write('data: hello\n\n'); res.end('data: done\n\n');});
    });
    upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
    t.after(() => {upstream.closeAllConnections(); upstream.close();});
    const proxy = require('./proxy.cjs').createProxy({apiKey: 'canary', upstreamRequest: (options, callback) => http.request({...options, hostname: '127.0.0.1', port: upstream.address().port}, callback)});
    proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
    t.after(() => {proxy.closeAllConnections(); proxy.close();});
    return {url: `http://127.0.0.1:${proxy.address().port}`, calls, proxy};
}
test('stream Responses using injected authorization; strip caller headers and upstream secrets', async t => {
    const f = await fixture(t);
    const res = await fetch(f.url + '/v1/responses', {method: 'POST', headers: {'authorization': 'Bearer attacker', 'x-forwarded-host': 'evil', 'content-type': 'application/json'}, body: '{"model":"test"}'});
    assert.equal(res.status, 200); assert.equal(await res.text(), 'data: hello\n\ndata: done\n\n');
    assert.equal(res.headers.get('x-secret'), null);
    assert.equal(f.calls[0].headers.authorization, 'Bearer canary');
    assert.equal(f.calls[0].headers['x-forwarded-host'], undefined);
    assert.equal(f.calls[0].body, '{"model":"test"}');
});
for (const [method, route] of [['GET', '/v1/responses'], ['POST', '/v1/models'], ['POST', '/v1/responses?host=evil'], ['POST', '/v1/../secrets'], ['CONNECT', 'evil:443']]) {
    test(`deny proxy route ${method} ${route}`, async t => {
        const f = await fixture(t);
        const status = await new Promise((resolve, reject) => {const req = http.request(f.url, {method, path: route}, res => {res.resume(); resolve(res.statusCode);}); req.on('connect', res => resolve(res.statusCode)); req.on('error', reject); req.end();});
        assert.ok([400, 403, 405].includes(status)); assert.equal(f.calls.length, 0);
    });
}
test('upstream failure returns generic error without key', async t => {
    const server = require('./proxy.cjs').createProxy({apiKey: 'canary', upstreamRequest: () => {throw new Error('canary');}});
    server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => {server.closeAllConnections(); server.close();});
    const res = await fetch(`http://127.0.0.1:${server.address().port}/v1/responses`, {method: 'POST', body: '{}'});
    assert.equal(res.status, 502); assert.ok(!(await res.text()).includes('canary'));
});
