const fs = require('node:fs');

module.exports = async function readDependencyUpdate({ github, context, core }) {
    const run = context.payload.workflow_run;
    if (run.conclusion !== 'success' || run.event !== 'pull_request_target' || run.actor?.login !== 'dependabot[bot]') return;
    const update = JSON.parse(fs.readFileSync('dependency-metadata/dependency-update.json', 'utf8'));
    if (!Number.isSafeInteger(update.number) || !/^[a-f0-9]{40}$/.test(update.sha) ||
        !['version-update:semver-patch', 'version-update:semver-minor', 'version-update:semver-major'].includes(update.type)) {
        throw new Error('Invalid dependency update metadata.');
    }
    const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number: update.number });
    if (pr.state !== 'open' || pr.user.login !== 'dependabot[bot]' || pr.head.sha !== update.sha ||
        pr.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}`) {
        core.info('Update is stale, closed, or not a same-repository Dependabot PR.');
        return;
    }
    core.setOutput('number', String(pr.number));
    core.setOutput('sha', pr.head.sha);
    core.setOutput('branch', pr.head.ref);
    core.setOutput('type', update.type);
};
