const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = () => fs.readFileSync(path.join(__dirname, '../../../../workflows/dependabot-major-codex.yml'), 'utf8');
test('privileged workflow never checks out or executes PR actions', () => {
    const text = read(); assert.ok(!text.includes('ref: ${{ needs.metadata.outputs.sha }}'));
    assert.ok(!text.includes('uses: ./.github/actions/prepare-workspace'));
    assert.ok(!text.includes('uses: openai/codex-action'));
});
test('separate runner publishes only successful artifact with publication credential', () => {
    const text = read(); const repair = text.split('\n  repair:\n')[1].split('\n  publish:\n')[0];
    assert.ok(!repair.includes('DEPENDENCY_UPDATE_TOKEN')); assert.ok(!repair.includes('contents: write'));
    const publish = text.split('\n  publish:\n')[1];
    assert.ok(publish.includes("needs.repair.outputs.status == 'repaired'"));
    assert.ok(publish.includes('DEPENDENCY_UPDATE_TOKEN'));
    assert.ok(!publish.includes('npm ')); assert.ok(publish.includes('uses: ./.github/actions/dependabot-repair'));
});
test('action bundles repair and publication with separate conditional credentials', () => {
    const action = fs.readFileSync(path.join(__dirname, '../../action.yml'), 'utf8');
    assert.ok(action.includes("inputs.operation == 'repair'"));
    assert.ok(action.includes("inputs.operation == 'publish'"));
    const repair = action.split('id: repair')[1].split('id: publish')[0];
    assert.ok(!repair.includes('publication-token'));
    assert.ok(action.includes('/scripts/publication/publish.cjs'));
    assert.ok(action.includes('inputs.publication-token || github.token'));
});
