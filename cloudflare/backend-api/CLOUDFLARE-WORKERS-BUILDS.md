# Cloudflare Workers Builds — SMV ASTRO Production Worker

This repository uses Cloudflare Workers Builds for the normal GitHub PR-preview and
main-branch deployment lifecycle of the Production Worker.

## Cloudflare Dashboard settings

Worker: `smvastroservices`  
Git repository: `smvastrorajaram-hub/smvastroservices`  
Production branch: `main`  
Root directory: `cloudflare/backend-api`

Build command:

```sh
npm install --ignore-scripts --no-audit --no-fund
```

Build variable:

```text
SKIP_DEPENDENCY_INSTALL=1
```

Production Deploy command:

```sh
npx wrangler deploy --config wrangler.production.jsonc
```

Preview command:

```sh
npx wrangler preview
```

Enable Preview Builds in Settings → Build → Branch control. The default
`wrangler.jsonc` is intentionally a Preview config: it uses the connected
Production Worker name so Workers Builds can identify the Worker, but its
runtime environment and D1 binding remain Staging-only. This ensures PR
previews do not target the Production D1 database.

## Configuration separation

| File | Purpose | Worker name | Firebase | D1 |
|---|---|---|---|---|
| `wrangler.jsonc` | Workers Builds default PR Preview | `smvastroservices` | `smv-astro-staging` | Staging |
| `wrangler.staging.jsonc` | Dedicated Staging operations and local D1 QA | `smvastro-backend-api-staging` | `smv-astro-staging` | Staging |
| `wrangler.production.jsonc` | Explicit Production deployment and secret/D1 operations | `smvastroservices` | `smv-astro` | Production |

Do not change the Preview config's Staging Firebase/D1 values to Production.
Do not copy the Production D1 binding into a PR Preview config.

## Deployment ownership

- A push to a PR branch runs GitHub contract tests and, when Preview Builds are
  enabled, Cloudflare Workers Builds creates the PR Preview and reports it on
  the PR.
- A merge/push to `main` triggers the Cloudflare Workers Builds Production
  Deploy command.
- The GitHub workflow
  `.github/workflows/cloudflare-backend-api-production-deploy.yml` remains
  available through `workflow_dispatch` for explicitly authorized operations
  that validate/synchronize Production secrets, inspect/apply additive
  Production D1 migrations, deploy, and run live health/readiness checks. It
  is intentionally not triggered automatically on every push, avoiding two
  concurrent systems deploying the same Production Worker.

Before any release that changes Production D1 migrations or requires secret
rotation, run the manual Production workflow as a separately reviewed
operation and verify its result. A regular code-only release is handled by
Workers Builds after the PR has passed its Preview and CI checks.
