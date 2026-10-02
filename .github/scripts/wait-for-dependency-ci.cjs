// This file is loaded from the trusted base commit, never from the update branch.
module.exports = async function waitForDependencyCI({ github, context, core }) {
    const repo = context.repo;
    const pr = { number: Number(process.env.PR_NUMBER) };
    const sha = process.env.PR_SHA;
    const expected = ['Backend & Web Checks', 'Visual & Accessibility Tests'];
    const deadline = Date.now() + 40 * 60 * 1000;
    while (Date.now() < deadline) {
        const { data: current } = await github.rest.pulls.get({ ...repo, pull_number: pr.number });
        if (current.state !== 'open' || current.head.sha !== sha || current.head.repo.full_name !== repo.owner + '/' + repo.repo) {
            core.info('PR closed or changed while waiting; no merge.');
            return;
        }
        const runs = await github.paginate(github.rest.actions.listWorkflowRunsForRepo, {
            ...repo, head_sha: sha, event: 'pull_request', per_page: 100,
        });
        // A rerun supersedes an earlier failed run of the same workflow.
        const latest = new Map();
        for (const run of runs) {
            if (!latest.has(run.workflow_id) || latest.get(run.workflow_id).id < run.id) latest.set(run.workflow_id, run);
        }
        const workflows = [...latest.values()];
        const checks = await github.paginate(github.rest.checks.listForRef, { ...repo, ref: sha, filter: 'latest', per_page: 100 });
        const { data: status } = await github.rest.repos.getCombinedStatusForRef({ ...repo, ref: sha });
        const ready = expected.every(name => workflows.some(run => run.name === name)) &&
            workflows.every(run => run.status === 'completed' && run.conclusion === 'success') &&
            checks.length > 0 && checks.every(check => check.status === 'completed' && check.conclusion === 'success') &&
            (status.total_count === 0 || status.state === 'success');
        if (ready) {
            core.setOutput('green', 'true');
            core.info(`All CI passed for ${sha}.`);
            return;
        }
        const failed = workflows.some(run => run.status === 'completed' && ['failure', 'cancelled', 'timed_out', 'action_required'].includes(run.conclusion));
        if (failed) {
            core.info('CI failed; leave the update open for repair or review.');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 30_000));
    }
    core.setFailed('Timed out waiting for every CI check; update was not merged.');
};
