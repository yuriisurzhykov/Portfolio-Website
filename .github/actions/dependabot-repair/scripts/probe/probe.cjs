const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {once} = require('node:events');
const {execFileSync} = require('node:child_process');
const {runRepair} = require('../runtime/orchestrate.cjs');
const {validateArtifact, parsePatch, applyFilePatch} = require('../artifact/artifact.cjs');

async function probe() {
    if (process.platform !== 'linux') throw new Error('Isolation probe requires Linux and Docker');
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-repair-probe-'));
    const source = path.join(temp, 'fixture'), output = path.join(temp, 'artifact');
    const server = http.createServer((_req, res) => res.end('host-canary'));
    server.listen(0, '0.0.0.0'); await once(server, 'listening');
    const identity = {number: 1, headSha: 'a'.repeat(40), branch: 'dependabot/npm/probe', updateType: 'version-update:semver-major', runId: 1, runAttempt: 1};
    try {
        fs.mkdirSync(path.join(source, 'backend/src'), {recursive: true});
        const postinstall = 'node hostile-install.cjs';
        fs.writeFileSync(path.join(source, 'hostile-install.cjs'), `const a=require('node:assert/strict'),f=require('node:fs');
for(const k of ['OPENAI_API_KEY','GITHUB_TOKEN','UPDATE_TOKEN','HOST_CANARY']) a.equal(process.env[k],undefined);
a.equal(f.existsSync('/var/run/docker.sock'),false);
f.mkdirSync('node_modules/.bin',{recursive:true});
f.writeFileSync('node_modules/.bin/prisma','#!/bin/sh\\nexit 0\\n',{mode:0o755});
f.writeFileSync('/output/preparation.ok','checked');
`);
        fs.writeFileSync(path.join(source, '.gitignore'), 'node_modules/\n');
        fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify({name: 'probe', version: '1.0.0', scripts: {postinstall}}));
        fs.writeFileSync(path.join(source, 'package-lock.json'), JSON.stringify({name: 'probe', version: '1.0.0', lockfileVersion: 3, packages: {'': {name: 'probe', version: '1.0.0', hasInstallScript: true}}}));
        fs.writeFileSync(path.join(source, 'backend/src/example.ts'), 'old\n');
        const archive = path.join(temp, 'source.tar.gz');
        execFileSync('tar', ['-czf', archive, '-C', temp, 'fixture']);
        const execute = (command, args, options) => {
            args = [...args];
            if (command === 'docker' && args.includes('/opt/repair/scripts/proxy/proxy.cjs')) args[args.indexOf('/opt/repair/scripts/proxy/proxy.cjs')] = '/opt/repair/scripts/probe/proxy.cjs';
            if (command === 'docker' && args.includes('/opt/repair/scripts/runtime/repair.sh')) {
                const network = args[args.indexOf('--network') + 1];
                const gateway = execFileSync('docker', ['network', 'inspect', network, '--format', '{{(index .IPAM.Config 0).Gateway}}'], {encoding: 'utf8'}).trim();
                const imageIndex = args.indexOf('sh');
                args.splice(imageIndex - 1, 0, '-e', `PROBE_GATEWAY=${gateway}`, '-e', `PROBE_PORT=${server.address().port}`);
                args[args.indexOf('sh')] = 'node'; args[args.indexOf('/opt/repair/scripts/runtime/repair.sh')] = '/opt/repair/scripts/probe/workload.cjs';
            }
            return execFileSync(command, args, {...options, timeout: 5 * 60 * 1000, maxBuffer: 8 * 1024 * 1024});
        };
        const result = await runRepair({identity, sourceArchive: archive, outputDirectory: output, apiKey: 'host-canary-key', execute});
        assert.equal(result.status, 'repaired', 'Container probe failed; no safety claim is established');
        const artifact = validateArtifact(output, identity);
        assert.equal(applyFilePatch(parsePatch(artifact.patch)[0], 'old\n'), 'new\n');
        console.log('Ubuntu isolated repair probe passed; no real inference was used.');
    } finally {
        server.closeAllConnections(); server.close(); fs.rmSync(temp, {recursive: true, force: true});
    }
}
probe().catch(error => {console.error(error.message); process.exitCode = 1;});
