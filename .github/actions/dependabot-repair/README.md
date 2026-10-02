# Isolated Dependabot repair action

This local composite GitHub Action owns the repair runtime, proxy, publisher and
security tests. The caller checks out trusted default-branch automation before
invoking it. Use `operation: repair` and `operation: publish` on **different runners**.
See `.github/workflows/dependabot-major-codex.yml` for the caller.

Both operations require the verified `pr-number`, `pr-sha` and `pr-branch`.
Pass `api-key` only to repair and `publication-token` only to publication.
Transfer `repair-artifact` through the run/attempt-bound Actions artifact between
jobs. Publication requires repair status `repaired` and rechecks PR identity.

The module groups implementation and tests by responsibility:

```text
dependabot-repair/
  action.yml
  Dockerfile
  scripts/
    artifact/       # patch and identity validation
    publication/    # GitHub commit publication
    proxy/          # narrow Responses API proxy
    runtime/        # container orchestration and Codex entrypoint
    probe/          # Ubuntu isolation probe and fixtures
    workflow/       # action/workflow boundary tests
```

Security tests live beside the functionality they verify. Run from the repository root:

```sh
node --test .github/actions/dependabot-repair/scripts/*/*.test.cjs
node .github/actions/dependabot-repair/scripts/probe/probe.cjs
```

The probe requires Ubuntu, Docker and passwordless `sudo iptables`. It uses a fake
Responses upstream and canary credentials, with no paid inference. Real repair
has a 100-request proxy limit and a 30-minute caller job timeout; configure an API
project budget as well. The publisher prevents divergent concurrent changes using
a non-force branch update; GitHub's ref API does not offer exact-SHA compare-and-swap
against a concurrent reset to an ancestor.
