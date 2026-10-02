const fs = require('node:fs');
const path = require('node:path');
const {identityFromEnv} = require('../artifact/identity.cjs');
const {runRepair} = require('./orchestrate.cjs');
module.exports = async function run({github, context, core}) {
    const identity = identityFromEnv();
    if (!process.env.OPENAI_API_KEY) {core.setOutput('status', 'unavailable'); await core.summary.addRaw('Codex repair unavailable: configure OPENAI_API_KEY.').write(); return;}
    const {data: pr} = await github.rest.pulls.get({...context.repo, pull_number: identity.number});
    if (pr.state !== 'open' || pr.user.login !== 'dependabot[bot]' || pr.head.sha !== identity.headSha ||
        pr.head.ref !== identity.branch || pr.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}`) {
        core.setOutput('status', 'stale'); return;
    }
    // Opaque source data; never checkout or execute PR code on the host.
    const {data} = await github.rest.repos.downloadTarballArchive({...context.repo, ref: identity.headSha});
    const archive = Buffer.from(data);
    if (archive.length > 100 * 1024 * 1024) throw new Error('Source archive exceeds size limit');
    const sourceArchive = path.join(process.env.RUNNER_TEMP, 'repair-source.tar.gz');
    fs.writeFileSync(sourceArchive, archive);
    const result = await runRepair({identity, sourceArchive, outputDirectory: path.join(process.env.RUNNER_TEMP, 'repair-artifact'), apiKey: process.env.OPENAI_API_KEY});
    core.setOutput('status', result.status);
    await core.summary.addRaw(`Isolated Codex repair: ${result.status}. Major updates require human review.`).write();
    if (result.status === 'failed') core.setFailed('Isolated repair failed; no branch write was attempted.');
};
