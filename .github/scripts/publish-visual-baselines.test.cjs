const { execFileSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { stageSnapshots } = require("./publish-visual-baselines.cjs");

const prefix = "frontend/tests/visual-snapshots";
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415408d763f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082", "hex");

function fixture(t) {
    const root = mkdtempSync(join(tmpdir(), "visual-baselines-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const repo = join(root, "repository");
    const artifact = join(root, "artifact");
    mkdirSync(join(repo, prefix), { recursive: true });
    mkdirSync(artifact);
    const git = (...args) => execFileSync("git", args, { cwd: repo }).toString().trim();
    git("init", "--quiet");
    writeFileSync(join(repo, "package.json"), "{}");
    writeFileSync(join(repo, prefix, "existing.png"), png);
    git("add", ".");
    const tree = git("write-tree");
    return { artifact, git, repo, tree };
}

test("stages only baseline additions and removals against the supplied tree", (t) => {
    const { artifact, git, repo, tree } = fixture(t);
    writeFileSync(join(artifact, "updated.png"), png);
    writeFileSync(join(repo, "package.json"), "{\"untrackedChange\":true}");
    assert.equal(stageSnapshots({ artifact, repo, tree }), true);
    assert.equal(git("show", ":package.json"), "{}");
    assert.equal(git("ls-files", "--", prefix), prefix + "/updated.png");
});

test("preserves the original tree when snapshots are identical", (t) => {
    const { artifact, git, repo, tree } = fixture(t);
    writeFileSync(join(artifact, "existing.png"), png);
    assert.equal(stageSnapshots({ artifact, repo, tree }), false);
    assert.equal(git("write-tree"), tree);
});

test("rejects unexpected files, invalid PNGs, and an empty artifact", (t) => {
    const { artifact, git, repo, tree } = fixture(t);
    assert.throws(() => stageSnapshots({ artifact, repo, tree }), /empty/i);
    const badFile = join(artifact, "script.js");
    writeFileSync(badFile, png);
    assert.throws(() => stageSnapshots({ artifact, repo, tree }), /unexpected/i);
    rmSync(badFile);
    writeFileSync(join(artifact, "bad.png"), Buffer.alloc(64));
    assert.throws(() => stageSnapshots({ artifact, repo, tree }), /invalid png/i);
    assert.equal(git("write-tree"), tree);
});

test("rejects symlink entries", (t) => {
    const { artifact, repo, tree } = fixture(t);
    symlinkSync(join(repo, prefix), join(artifact, "linked"), "junction");
    assert.throws(() => stageSnapshots({ artifact, repo, tree }), /unexpected/i);
});

test("refuses to replace files outside the snapshot directory", (t) => {
    const { artifact, git, repo } = fixture(t);
    git("rm", "-r", "--cached", "--", "frontend");
    rmSync(join(repo, "frontend"), { recursive: true });
    writeFileSync(join(repo, "frontend"), "regular file");
    git("add", "frontend");
    const tree = git("write-tree");
    writeFileSync(join(artifact, "updated.png"), png);
    assert.throws(() => stageSnapshots({ artifact, repo, tree }), /expected a snapshot directory/i);
    assert.equal(git("write-tree"), tree);
});
