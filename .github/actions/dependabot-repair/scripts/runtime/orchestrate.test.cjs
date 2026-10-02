const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const identity = {number: 83, headSha: 'a'.repeat(40), branch: 'dependabot/npm/test', updateType: 'version-update:semver-major', runId: 1, runAttempt: 1};
async function fixture(t, failAt) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-run-')); t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const sourceArchive = path.join(dir, 'source.tar.gz');
    fs.writeFileSync(sourceArchive, 'archive fixture');
    const calls = [];
    const execute = (command, args, options) => {
        calls.push({command, args, options});
        if (failAt && args.join(' ').includes(failAt)) throw new Error('simulated failure');
        return Buffer.from('');
    };
    return {calls, execute, outputDirectory: dir, sourceArchive, apiKey: 'host-canary-key', identity};
}
const run = f => require('./orchestrate.cjs').runRepair(f);
test('streams source archive into writable volume without docker cp on read-only rootfs', async t => {
    const f = await fixture(t);
    assert.equal((await run(f)).status, 'repaired');
    assert.ok(!f.calls.some(c => c.args[0] === 'cp'));
    const extraction = f.calls.find(c => c.args[0] === 'exec' && c.args.includes('tar'));
    assert.ok(extraction.args.includes('-i'));
    assert.equal(extraction.args[extraction.args.indexOf('-xzf') + 1], '-');
    assert.deepEqual(extraction.options.input, fs.readFileSync(f.sourceArchive));
});
test('only proxy receives key; workloads use volumes and hardened container options', async t => {
    const f = await fixture(t); assert.equal((await run(f)).status, 'repaired');
    const runs = f.calls.filter(c => c.args[0] === 'run');
    const proxy = runs.find(c => c.args.includes('OPENAI_API_KEY'));
    assert.equal(proxy.options.env.OPENAI_API_KEY, f.apiKey);
    for (const c of runs.filter(c => !c.args.includes('OPENAI_API_KEY'))) {
        assert.ok(!c.args.some(a => a.includes('host-canary-key')));
        assert.ok(!c.options.env.OPENAI_API_KEY);
        assert.ok(!c.args.join(' ').includes('docker.sock'));
        assert.ok(!c.args.join(' ').includes('type=bind'));
    }
    const repair = runs.find(c => c.args.includes('/opt/repair/scripts/runtime/repair.sh'));
    for (const flag of ['--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--user=1000:1000']) assert.ok(repair.args.includes(flag));
    assert.ok(f.calls.some(c => c.command === 'sudo' && c.args.includes('INPUT')));
    const prep = f.calls.findIndex(c => c.args.includes('npm ci --include=optional && cd backend && npx --no-install prisma migrate deploy'));
    assert.ok(prep >= 0 && f.calls.indexOf(proxy) > prep);
    assert.ok(f.calls.some(c => c.args[0] === 'network' && c.args.includes('--internal')));
    assert.ok(f.calls.some(c => c.args[0] === 'network' && c.args[1] === 'rm'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.outputDirectory, 'metadata.json'))).headSha, identity.headSha);
});
test('preparation failure still reaches isolated repair; failed inference cannot publish', async t => {
    const f = await fixture(t, '/opt/repair/scripts/runtime/repair.sh');
    assert.equal((await run(f)).status, 'failed');
    assert.ok(!fs.existsSync(path.join(f.outputDirectory, 'repair.patch')));
    assert.ok(f.calls.some(c => c.args[0] === 'volume' && c.args[1] === 'rm'));
});
test('missing key does not launch any workload', async t => {
    const f = await fixture(t); f.apiKey = ''; assert.equal((await run(f)).status, 'unavailable'); assert.equal(f.calls.length, 0);
});
test('failed dependency preparation still attempts repair without exposing credentials', async t => {
    const f = await fixture(t, 'npm ci');
    assert.equal((await run(f)).status, 'repaired');
    assert.ok(fs.existsSync(path.join(f.outputDirectory, 'preparation.txt')));
    assert.ok(f.calls.some(c => c.args.includes('/opt/repair/scripts/runtime/repair.sh')));
});
