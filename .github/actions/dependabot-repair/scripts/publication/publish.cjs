const {validateIdentity, parsePatch, applyFilePatch} = require('../artifact/artifact.cjs');

async function publishRepair({github, context, identity, artifact}) {
    validateIdentity(identity);
    if (Object.keys(identity).some(key => artifact.metadata[key] !== identity[key])) throw new Error('Artifact identity mismatch');
    const repo = context.repo;
    const current = async () => {
        const {data: pr} = await github.rest.pulls.get({...repo, pull_number: identity.number});
        return pr.state === 'open' && pr.user.login === 'dependabot[bot]' && pr.head.sha === identity.headSha &&
            pr.head.ref === identity.branch && pr.head.repo?.full_name === `${repo.owner}/${repo.repo}`;
    };
    if (!await current()) return {status: 'stale'};
    const files = parsePatch(artifact.patch);
    if (!files.length) return {status: 'no_changes'};
    const {data: commit} = await github.rest.git.getCommit({...repo, commit_sha: identity.headSha});
    const {data: base} = await github.rest.git.getTree({...repo, tree_sha: commit.tree.sha, recursive: '1'});
    if (base.truncated) throw new Error('Cannot validate a truncated source tree');
    const changes = [];
    // Validate every file before making any write request.
    for (const file of files) {
        const entry = base.tree.find(e => e.path === file.path);
        if (entry && (entry.type !== 'blob' || entry.mode !== '100644')) throw new Error('Original must be a regular file');
        let original = null;
        if (entry) {
            const {data: blob} = await github.rest.git.getBlob({...repo, file_sha: entry.sha});
            if (blob.encoding !== 'base64') throw new Error('Unexpected blob encoding');
            const bytes = Buffer.from(blob.content, 'base64');
            if (bytes.length > 4 * 1024 * 1024 || bytes.includes(0)) throw new Error('Original text exceeds limit');
            original = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
        }
        changes.push({path: file.path, content: applyFilePatch(file, original)});
    }
    const tree = [];
    for (const change of changes) {
        const sha = change.content === null ? null : (await github.rest.git.createBlob({...repo, encoding: 'base64', content: Buffer.from(change.content).toString('base64')})).data.sha;
        tree.push({path: change.path, mode: '100644', type: 'blob', sha});
    }
    const {data: newTree} = await github.rest.git.createTree({...repo, base_tree: commit.tree.sha, tree});
    const {data: next} = await github.rest.git.createCommit({...repo, message: 'fix: adapt major dependency update (isolated Codex repair)', tree: newTree.sha, parents: [identity.headSha]});
    if (!await current()) return {status: 'stale'};
    try {
        await github.rest.git.updateRef({...repo, ref: `heads/${identity.branch}`, sha: next.sha, force: false});
    } catch (error) {
        if (error.status === 422) return {status: 'stale'};
        throw error;
    }
    return {status: 'published', sha: next.sha};
}
module.exports = {publishRepair};
