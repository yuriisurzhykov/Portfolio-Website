const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const identity = { number: 83, headSha: 'a'.repeat(40), branch: 'dependabot/npm/test', updateType: 'version-update:semver-major', runId: 1, runAttempt: 1 };
const patch = (name = 'frontend/src/example.ts') => `diff --git a/${name} b/${name}\nindex 1111111..2222222 100644\n--- a/${name}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+new\n`;
const api = () => require('./artifact.cjs');

test('regular source patch applies only to matching original content', () => {
    const files = api().parsePatch(patch());
    assert.equal(files.length, 1);
    assert.equal(api().applyFilePatch(files[0], 'old\n'), 'new\n');
    assert.throws(() => api().applyFilePatch(files[0], 'unexpected\n'), /context/);
});
for (const name of ['../evil', '/tmp/evil', '.github/workflows/test.yml', 'frontend/src/foo.test.ts', 'backend/src/__tests__/foo.ts', 'frontend/src/__snapshots__/example.ts', 'frontend/src/.codex/config.toml', 'frontend/src/config.json', 'frontend/src/a\\b.ts', 'frontend/src/a\tb.ts']) {
    test(`reject forbidden path ${JSON.stringify(name)}`, () => assert.throws(() => api().parsePatch(patch(name))));
}
for (const [label, change] of [
    ['symlink', p => p.replace('100644', '120000')],
    ['executable', p => p.replace('100644', '100755')],
    ['binary', p => p + 'GIT binary patch\nliteral 1\nA\n'],
    ['mode', p => p.replace('index ', 'old mode 100644\nnew mode 100755\nindex ')],
    ['oversize', () => 'x'.repeat(2 * 1024 * 1024 + 1)],
    ['too many files', () => Array.from({length: 101}, (_, i) => patch(`backend/src/f${i}.ts`)).join('')],
]) test(`reject ${label}`, () => assert.throws(() => api().parsePatch(change(patch()))));
test('support added/deleted text and missing final newline', () => {
    const added = 'diff --git a/backend/src/new.ts b/backend/src/new.ts\nnew file mode 100644\nindex 0000000..1111111\n--- /dev/null\n+++ b/backend/src/new.ts\n@@ -0,0 +1 @@\n+hello\n\\ No newline at end of file\n';
    assert.equal(api().applyFilePatch(api().parsePatch(added)[0], null), 'hello');
    const removed = 'diff --git a/backend/src/old.ts b/backend/src/old.ts\ndeleted file mode 100644\nindex 1111111..0000000\n--- a/backend/src/old.ts\n+++ /dev/null\n@@ -1 +0,0 @@\n-hello\n';
    assert.equal(api().applyFilePatch(api().parsePatch(removed)[0], 'hello\n'), null);
});
test('artifact validates exact run identity, size and regular files', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-test-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(identity));
    fs.writeFileSync(path.join(dir, 'repair.patch'), patch());
    assert.equal(api().validateArtifact(dir, identity).metadata.headSha, identity.headSha);
    assert.throws(() => api().validateArtifact(dir, {...identity, runAttempt: 2}), /identity/);
    fs.writeFileSync(path.join(dir, 'summary.txt'), 'x'.repeat(32769));
    assert.throws(() => api().validateArtifact(dir, identity), /size/);
});
module.exports = { identity, patch };
