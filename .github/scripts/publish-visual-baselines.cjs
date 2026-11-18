const { createHash } = require("node:crypto");
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

function validateOriginalTree(tree) {
    const previous = new Map();
    const directories = ["frontend", "frontend/tests", prefix];
    for (const entry of tree) {
        if (directories.includes(entry.path)) {
            if (entry.type !== "tree") throw new Error("Expected a snapshot directory: " + entry.path);
            continue;
        }
        if (!entry.path.startsWith(prefix + "/")) continue;
        if (!entry.path.split("/").every(part => safeComponent.test(part) && !part.endsWith("."))) {
            throw new Error("Unexpected entry in the original snapshot tree.");
        }
        if (entry.type === "tree") continue;
        if (entry.type !== "blob" || entry.mode !== "100644" || !entry.path.endsWith(".png")) {
            throw new Error("Unexpected entry in the original snapshot tree.");
        }
        previous.set(entry.path, entry.sha);
    }
    return previous;
}

async function publishBaselines({ github, repo, number, head, branch, artifact }) {
    if (!/^[0-9a-f]{40}$/.test(head)) throw new Error("Expected an immutable PR head SHA.");
    const repositoryNameWithOwner = repo.owner + "/" + repo.repo;
    const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: number });
    if (pr.state !== "open" || pr.head.repo?.full_name !== repositoryNameWithOwner ||
        pr.head.sha !== head || pr.head.ref !== branch || branch === pr.base.repo.default_branch) {
        return "stale";
    }

    const snapshots = readSnapshots(artifact);
    const { data: commit } = await github.rest.git.getCommit({ ...repo, commit_sha: head });
    const { data: tree } = await github.rest.git.getTree({ ...repo, tree_sha: commit.tree.sha, recursive: "1" });
    if (tree.truncated) throw new Error("Cannot publish from a truncated Git tree.");
    const previous = validateOriginalTree(tree.tree);
    const deletions = [...previous.keys()].filter(path => !snapshots.has(path)).map(path => ({ path }));
    const additions = [];
    for (const [path, contents] of snapshots) {
        // Compute the Git blob identifier to skip unchanged images.
        const oid = createHash("sha1").update("blob " + contents.length + "\0").update(contents).digest("hex");
        if (previous.get(path) !== oid) additions.push({ path, contents: contents.toString("base64") });
    }
    if (!additions.length && !deletions.length) return "no_changes";
    await github.graphql(
        "mutation($input: CreateCommitOnBranchInput!) { createCommitOnBranch(input: $input) { commit { oid } } }",
        {
            input: {
                branch: { repositoryNameWithOwner, branchName: branch },
                expectedHeadOid: head,
                message: { headline: "chore: accept visual regression baselines (via /update-snapshots)" },
                fileChanges: { additions, deletions },
            },
        },
    );
    return "published";
}

module.exports = { publishBaselines };
