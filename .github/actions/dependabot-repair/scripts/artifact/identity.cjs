const {validateIdentity} = require('./artifact.cjs');
function identityFromEnv(env = process.env) {
    return validateIdentity({number: Number(env.PR_NUMBER), headSha: env.PR_SHA, branch: env.PR_BRANCH,
        updateType: 'version-update:semver-major', runId: Number(env.GITHUB_RUN_ID), runAttempt: Number(env.GITHUB_RUN_ATTEMPT)});
}
module.exports = {identityFromEnv};
