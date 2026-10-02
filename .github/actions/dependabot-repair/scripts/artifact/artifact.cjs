const fs = require('node:fs');
const path = require('node:path');
const MAX_PATCH = 2 * 1024 * 1024;
const ID_KEYS = ['number', 'headSha', 'branch', 'updateType', 'runId', 'runAttempt'];

function validateIdentity(identity) {
    if (!identity || Object.keys(identity).sort().join() !== [...ID_KEYS].sort().join() ||
        ![identity.number, identity.runId, identity.runAttempt].every(n => Number.isSafeInteger(n) && n > 0) ||
        !/^[a-f0-9]{40}$/.test(identity.headSha) || identity.updateType !== 'version-update:semver-major' ||
        typeof identity.branch !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(identity.branch) ||
        identity.branch.includes('..') || identity.branch.endsWith('/') || identity.branch.endsWith('.lock')) {
        throw new Error('Invalid repair identity');
    }
    return identity;
}
function allowedPath(name) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.split('/').some(p => !p || p.startsWith('.')) ||
        /(?:^|\/)(?:__tests__|__snapshots__|tests?|snapshots?)(?:\/|$)|\.(?:test|spec)\./i.test(name)) return false;
    if (['package.json', 'package-lock.json', 'frontend/package.json', 'backend/package.json', 'packages/design-tokens/package.json'].includes(name)) return true;
    return /^(?:frontend\/src|backend\/src|packages\/design-tokens\/src)\/.+\.(?:tsx?|jsx?|css|mjs|cjs)$/.test(name);
}
function parsePatch(patch) {
    if (typeof patch !== 'string' || Buffer.byteLength(patch) > MAX_PATCH || patch.includes('\0') || patch.includes('\r')) throw new Error('Invalid patch size or encoding');
    if (!patch) return [];
    const lines = patch.split('\n');
    if (lines.pop() !== '') throw new Error('Patch must end with newline');
    const files = []; let i = 0;
    while (i < lines.length) {
        const header = /^diff --git a\/(\S+) b\/(\S+)$/.exec(lines[i++]);
        if (!header || header[1] !== header[2] || !allowedPath(header[1]) || files.some(f => f.path === header[1])) throw new Error('Forbidden or duplicate patch path');
        const file = {path: header[1], operation: 'modify', hunks: []};
        if (lines[i] === 'new file mode 100644') {file.operation = 'add'; i++;}
        else if (lines[i] === 'deleted file mode 100644') {file.operation = 'delete'; i++;}
        if (!/^index [a-f0-9]+\.\.[a-f0-9]+(?: 100644)?$/.test(lines[i++] || '')) throw new Error('Only regular text files are accepted');
        const old = file.operation === 'add' ? '/dev/null' : `a/${file.path}`;
        const next = file.operation === 'delete' ? '/dev/null' : `b/${file.path}`;
        if (lines[i++] !== `--- ${old}` || lines[i++] !== `+++ ${next}`) throw new Error('Invalid file headers');
        while (i < lines.length && !lines[i].startsWith('diff --git ')) {
            const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*$/.exec(lines[i++]);
            if (!match) throw new Error('Invalid text hunk');
            const hunk = {oldStart: Number(match[1]), oldCount: Number(match[2] ?? 1), newStart: Number(match[3]), newCount: Number(match[4] ?? 1), lines: []};
            while (i < lines.length && /^[ +\-]/.test(lines[i])) {
                const raw = lines[i++]; const entry = {kind: raw[0], text: raw.slice(1) + '\n'};
                if (lines[i] === '\\ No newline at end of file') {entry.text = entry.text.slice(0, -1); i++;}
                hunk.lines.push(entry);
            }
            if (hunk.lines.filter(l => l.kind !== '+').length !== hunk.oldCount || hunk.lines.filter(l => l.kind !== '-').length !== hunk.newCount) throw new Error('Invalid hunk counts');
            file.hunks.push(hunk);
        }
        if (!file.hunks.length || files.push(file) > 100) throw new Error('Invalid patch file count');
    }
    return files;
}
function applyFilePatch(file, original) {
    if ((file.operation === 'add') !== (original === null)) throw new Error('Original file existence mismatch');
    const lines = (original || '').match(/[^\n]*\n|[^\n]+$/g) || [];
    const output = []; let offset = 0;
    for (const hunk of file.hunks) {
        const start = hunk.oldCount === 0 ? hunk.oldStart : hunk.oldStart - 1;
        if (start < offset || start > lines.length) throw new Error('Invalid hunk context position');
        output.push(...lines.slice(offset, start)); offset = start;
        const newStart = hunk.newCount === 0 ? hunk.newStart : hunk.newStart - 1;
        if (newStart !== output.length) throw new Error('Invalid new hunk position');
        for (const line of hunk.lines) {
            if (line.kind !== '+' && lines[offset++] !== line.text) throw new Error('Patch context does not match original');
            if (line.kind !== '-') output.push(line.text);
        }
    }
    output.push(...lines.slice(offset));
    if (file.operation === 'delete') {
        if (output.length) throw new Error('Deletion left original content');
        return null;
    }
    return output.join('');
}
function readRegular(directory, name, max, optional = false) {
    const location = path.join(directory, name);
    if (optional && !fs.existsSync(location)) return '';
    const stat = fs.lstatSync(location);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max) throw new Error('Invalid artifact file type or size');
    return new TextDecoder('utf-8', {fatal: true}).decode(fs.readFileSync(location));
}
function validateArtifact(directory, expectedIdentity) {
    validateIdentity(expectedIdentity);
    const metadata = validateIdentity(JSON.parse(readRegular(directory, 'metadata.json', 4096)));
    if (ID_KEYS.some(key => metadata[key] !== expectedIdentity[key])) throw new Error('Artifact identity mismatch');
    const patch = readRegular(directory, 'repair.patch', MAX_PATCH);
    parsePatch(patch);
    return {metadata, patch, summary: readRegular(directory, 'summary.txt', 32768, true)};
}
module.exports = {validateIdentity, allowedPath, parsePatch, applyFilePatch, validateArtifact};
