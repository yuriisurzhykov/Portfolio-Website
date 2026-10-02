const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
function canConnect(host, port) {
    return new Promise(resolve => {
        const socket = net.connect({host, port}); let finished = false;
        const done = result => {if (!finished) {finished = true; socket.destroy(); resolve(result);}};
        socket.setTimeout(2000, () => done(false)); socket.on('error', () => done(false)); socket.on('connect', () => done(true));
    });
}
(async () => {
    assert.equal(process.getuid(), 1000);
    for (const key of ['OPENAI_API_KEY', 'GITHUB_TOKEN', 'UPDATE_TOKEN', 'DEPENDENCY_UPDATE_TOKEN', 'HOST_CANARY']) assert.equal(process.env[key], undefined);
    for (const name of ['/var/run/docker.sock', '/host/canary', '/root/.ssh', '/home/runner/.credentials']) assert.equal(fs.existsSync(name), false);
    assert.equal(fs.readFileSync('/output/preparation.ok', 'utf8'), 'checked');
    assert.ok(await canConnect('db', 5432));
    assert.equal(await canConnect('1.1.1.1', 443), false);
    assert.equal(await canConnect('169.254.169.254', 80), false);
    assert.equal(await canConnect(process.env.PROBE_GATEWAY, Number(process.env.PROBE_PORT)), false);
    let response;
    for (let i = 0; i < 20; i++) {
        try {response = await fetch('http://proxy:8080/v1/responses', {method: 'POST', body: '{}', signal: AbortSignal.timeout(2000)}); break;}
        catch {await new Promise(resolve => setTimeout(resolve, 250));}
    }
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'data: fixture\n\n');
    assert.equal((await fetch('http://proxy:8080/v1/secrets')).status, 403);
    fs.writeFileSync('/work/backend/src/example.ts', 'new\n');
    fs.writeFileSync('/output/summary.txt', 'Canary secret, socket, host and outbound network probes passed.\n');
})().catch(error => {console.error(error.message); process.exitCode = 1;});
