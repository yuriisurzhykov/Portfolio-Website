const { execFileSync } = require("node:child_process");
const { lstatSync, readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const prefix = "frontend/tests/visual-snapshots";
const pngHeader = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const maxFileBytes = 10 * 1024 * 1024;
const maxTotalBytes = 250 * 1024 * 1024;
const safeComponent = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function readSnapshots(artifact) {
    if (!lstatSync(artifact).isDirectory()) throw new Error("Expected a snapshot artifact directory.");
    const snapshots = new Map();
    let totalBytes = 0;

    function visit(directory, relativePath = "") {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = relativePath + entry.name;
            const absolutePath = join(directory, entry.name);
            if (!safeComponent.test(entry.name) || entry.name.endsWith(".")) {
                throw new Error("Unexpected snapshot path: " + path);
            }
            if (entry.isDirectory()) {
                visit(absolutePath, path + "/");
                continue;
            }
            if (!entry.isFile() || !entry.name.endsWith(".png")) {
                throw new Error("Unexpected snapshot entry: " + path);
            }
            const size = lstatSync(absolutePath).size;
            totalBytes += size;
            if (size < 45 || size > maxFileBytes || totalBytes > maxTotalBytes) {
                throw new Error("Invalid PNG size or artifact size: " + path);
            }
            const contents = readFileSync(absolutePath);
            if (!contents.subarray(0, pngHeader.length).equals(pngHeader)) {
                throw new Error("Invalid PNG header: " + path);
            }
            snapshots.set(prefix + "/" + path, contents);
        }
    }

    visit(artifact);
    if (snapshots.size === 0) throw new Error("Snapshot artifact is empty.");
    return snapshots;
}

function stageSnapshots({ artifact, repo, tree }) {
    if (!/^[0-9a-f]{40}$/.test(tree)) throw new Error("Expected an immutable Git tree SHA.");
    const git = (args, input) => execFileSync("git", args, { cwd: repo, input }).toString();
    const snapshots = readSnapshots(artifact);
    // A snapshot entry must never replace a file or symlink in an ancestor path.
    for (const parent of ["frontend", "frontend/tests", prefix]) {
        const entry = git(["ls-tree", tree, "--", parent]);
        if (entry && !entry.startsWith("040000 tree ")) {
            throw new Error("Expected a snapshot directory in the original tree: " + parent);
        }
    }
    const original = git(["ls-tree", "-r", "-z", tree, "--", prefix]).split("\0").filter(Boolean);
    const changes = [];
    const previous = new Map();

    for (const entry of original) {
        const [metadata, path] = entry.split("\t");
        const [mode, type, sha] = metadata.split(" ");
        if (mode !== "100644" || type !== "blob" || !path?.startsWith(prefix + "/") ||
            !path.endsWith(".png") || !path.split("/").every(part => safeComponent.test(part))) {
            throw new Error("Unexpected entry in the original snapshot tree.");
        }
        previous.set(path, sha);
        if (!snapshots.has(path)) changes.push("0 " + "0".repeat(40) + "\t" + path);
    }

    for (const [path, contents] of snapshots) {
        const sha = git(["hash-object", "-w", "--stdin", "--no-filters"], contents).trim();
        if (previous.get(path) !== sha) changes.push("100644 " + sha + "\t" + path);
    }

    git(["read-tree", tree]);
    if (changes.length === 0) return false;
    git(["update-index", "-z", "--index-info"], changes.join("\0") + "\0");
    return true;
}

if (require.main === module) {
    const { SNAPSHOT_ARTIFACT, PR_TREE } = process.env;
    const changed = stageSnapshots({ artifact: SNAPSHOT_ARTIFACT, repo: process.cwd(), tree: PR_TREE });
    process.stdout.write(String(changed));
}

module.exports = { stageSnapshots };
