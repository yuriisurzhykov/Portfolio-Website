const { test } = require('node:test');
const assert = require('node:assert/strict');
const identity = { number: 83, headSha: 'a'.repeat(40), branch: 'dependabot/npm/test', updateType: 'version-update:semver-major', runId: 1, runAttempt: 1 };
const patch = 'diff --git a/frontend/src/example.ts b/frontend/src/example.ts\nindex 1111111..2222222 100644\n--- a/frontend/src/example.ts\n+++ b/frontend/src/example.ts\n@@ -1 +1 @@\n-old\n+new\n';
function fixture(changes = {}) {
    const calls = [];
    const pr = {state: 'open', user: {login: 'dependabot[bot]'}, head: {sha: identity.headSha, ref: identity.branch, repo: {full_name: 'owner/repo'}}, ...changes};
    const git = {
        getCommit: async () => ({data: {tree: {sha: 'tree'}}}),
        getTree: async () => ({data: {tree: [{path: 'frontend/src/example.ts', type: 'blob', mode: '100644', sha: 'blob'}], truncated: false}}),
        getBlob: async () => ({data: {content: Buffer.from('old\n').toString('base64'), encoding: 'base64'}}),
        createBlob: async args => { calls.push(args); return {data: {sha: 'newblob'}}; },
        createTree: async args => { calls.push(args); return {data: {sha: 'newtree'}}; },
        createCommit: async args => { calls.push(args); return {data: {sha: 'newcommit'}}; },
        updateRef: async args => { calls.push(args); return {}; },
    };
    return { github: {rest: {pulls: {get: async () => ({data: pr})}, git}}, context: {repo: {owner: 'owner', repo: 'repo'}}, identity, artifact: {metadata: identity, patch, summary: ''}, calls, pr };
}
const run = f => require('./publish.cjs').publishRepair(f);
test('publishes regular source via Git data API with captured parent and no force', async () => {
    const f = fixture();
    assert.equal((await run(f)).status, 'published');
    assert.equal(f.calls[0].content, Buffer.from('new\n').toString('base64'));
    assert.deepEqual(f.calls[2].parents, [identity.headSha]);
    assert.equal(f.calls[3].force, false);
});
for (const changes of [{state: 'closed'}, {user: {login: 'someone'}}, {head: {sha: 'b'.repeat(40), ref: identity.branch, repo: {full_name: 'owner/repo'}}}, {head: {sha: identity.headSha, ref: identity.branch, repo: {full_name: 'other/repo'}}}]) {
    test(`stale or untrusted PR never writes ${JSON.stringify(changes)}`, async () => {
        const f = fixture(changes); assert.equal((await run(f)).status, 'stale'); assert.equal(f.calls.length, 0);
    });
}
test('empty patch makes no Git writes', async () => {
    const f = fixture(); f.artifact.patch = ''; assert.equal((await run(f)).status, 'no_changes'); assert.equal(f.calls.length, 0);
});
test('concurrent change detected before ref update', async () => {
    const f = fixture(); f.github.rest.git.createCommit = async () => {f.pr.head.sha = 'b'.repeat(40); return {data: {sha: 'newcommit'}};};
    assert.equal((await run(f)).status, 'stale'); assert.ok(!f.calls.some(c => c.ref));
});
test('non-fast-forward race is rejected without retry or force', async () => {
    const f = fixture(); f.github.rest.git.updateRef = async args => {assert.equal(args.force, false); throw Object.assign(new Error('race'), {status: 422});};
    assert.equal((await run(f)).status, 'stale');
});
test('reject original symlink even when patch claims regular mode', async () => {
    const f = fixture(); f.github.rest.git.getTree = async () => ({data: {tree: [{path: 'frontend/src/example.ts', type: 'blob', mode: '120000', sha: 'blob'}]}});
    await assert.rejects(run(f), /regular/); assert.equal(f.calls.length, 0);
});
