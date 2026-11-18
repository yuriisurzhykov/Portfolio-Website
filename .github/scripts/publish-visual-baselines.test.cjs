const { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { publishBaselines } = require("./publish-visual-baselines.cjs");

const prefix = "frontend/tests/visual-snapshots";
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415408d763f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082", "hex");
const head = "a".repeat(40);
const originalPath = prefix + "/existing.png";
const pr = {
    state: "open",
    base: { repo: { default_branch: "master" } },
    head: { sha: head, ref: "updates", repo: { full_name: "owner/repo" } },
};

function fixture(t, { current = pr, truncated = false, original = [
    { path: "frontend", type: "tree", mode: "040000" },
    { path: "frontend/tests", type: "tree", mode: "040000" },
    { path: prefix, type: "tree", mode: "040000" },
    { path: originalPath, type: "blob", mode: "100644", sha: "0e8ff15236bcfec8df0eb90c65e6639d3154b147" },
    { path: "package.json", type: "blob", mode: "100644" },
] } = {}) {
    const artifact = mkdtempSync(join(tmpdir(), "visual-baselines-"));
    t.after(() => rmSync(artifact, { recursive: true, force: true }));
    const writes = [];
    const reads = [];
    const github = {
        rest: {
            pulls: { get: async () => ({ data: current }) },
            git: {
                getCommit: async ({ commit_sha }) => {
                    reads.push(commit_sha);
                    return { data: { tree: { sha: "tree" } } };
                },
                getTree: async () => ({ data: { tree: original, truncated } }),
            },
        },
        graphql: async (query, variables) => {
            assert.match(query, /createCommitOnBranch/);
            writes.push(variables.input);
        },
    };
    const options = {
        github, repo: { owner: "owner", repo: "repo" }, number: 42, head, branch: "updates", artifact,
    };
    return { artifact, options, reads, writes };
}

test("publishes only snapshot changes with the approved commit as the expected head", async (t) => {
    const { artifact, options, reads, writes } = fixture(t);
    mkdirSync(join(artifact, "components"));
    writeFileSync(join(artifact, "components", "updated.png"), png);
    assert.equal(await publishBaselines(options), "published");
    assert.deepEqual(reads, [head]);
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].branch, { repositoryNameWithOwner: "owner/repo", branchName: "updates" });
    assert.equal(writes[0].expectedHeadOid, head);
    assert.deepEqual(writes[0].fileChanges, {
        additions: [{ path: prefix + "/components/updated.png", contents: png.toString("base64") }],
        deletions: [{ path: originalPath }],
    });
});

test("makes no commit when snapshots are identical", async (t) => {
    const { artifact, options, writes } = fixture(t);
    writeFileSync(join(artifact, "existing.png"), png);
    assert.equal(await publishBaselines(options), "no_changes");
    assert.deepEqual(writes, []);
});

test("stops when the PR has moved or points outside the approved branch", async (t) => {
    for (const current of [
        { ...pr, head: { ...pr.head, sha: "b".repeat(40) } },
        { ...pr, head: { ...pr.head, repo: { full_name: "someone/fork" } } },
        { ...pr, base: { repo: { default_branch: "updates" } } },
        { ...pr, state: "closed" },
    ]) {
        const { options, reads, writes } = fixture(t, { current });
        assert.equal(await publishBaselines(options), "stale");
        assert.deepEqual(reads, []);
        assert.deepEqual(writes, []);
    }
});

test("rejects unexpected files, invalid PNGs, and empty artifacts", async (t) => {
    const { artifact, options, writes } = fixture(t);
    await assert.rejects(publishBaselines(options), /empty/i);
    const badFile = join(artifact, "script.js");
    writeFileSync(badFile, png);
    await assert.rejects(publishBaselines(options), /unexpected/i);
    rmSync(badFile);
    writeFileSync(join(artifact, "bad.png"), Buffer.alloc(64));
    await assert.rejects(publishBaselines(options), /invalid png/i);
    assert.deepEqual(writes, []);
});

test("rejects symlinks in an artifact", async (t) => {
    const { artifact, options, writes } = fixture(t);
    symlinkSync(tmpdir(), join(artifact, "linked"), "junction");
    await assert.rejects(publishBaselines(options), /unexpected/i);
    assert.deepEqual(writes, []);
});

test("refuses to overwrite an ancestor file or publish from a truncated tree", async (t) => {
    for (const tree of [{ original: [{ path: "frontend", type: "blob", mode: "100644" }] }, { truncated: true }]) {
        const { artifact, options, writes } = fixture(t, tree);
        writeFileSync(join(artifact, "updated.png"), png);
        await assert.rejects(publishBaselines(options), /snapshot directory|truncated/i);
        assert.deepEqual(writes, []);
    }
});
