# Cloudflare Workers Builds — SMV ASTRO

This document is the source-of-truth for the two separate Cloudflare Workers
Builds configurations. **Production and Preview use different Root directories,
install commands, and Wrangler configuration files. Do not copy one tab's
settings into the other.**

## Dashboard: Production Build

Worker: `smvastroservices`  
Git repository: `smvastrorajaram-hub/smvastroservices`  
Production branch: `main`

| Field | Required value |
|---|---|
| Root directory | `cloudflare/backend-api` |
| Build command | `npm install --ignore-scripts --no-audit --no-fund` |
| Build variable | `SKIP_DEPENDENCY_INSTALL=1` |
| Deploy command | `npx wrangler deploy --config wrangler.production.jsonc` |

The Production Root directory is already the Worker package directory. Therefore
the Production deploy command is relative to that directory and must name
`wrangler.production.jsonc` directly. This is the only Workers Builds tab that
uses the Production deploy configuration.

## Dashboard: Preview Base

Preview Builds use the repository checkout root, not the nested Worker directory.

| Field | Required value |
|---|---|
| Root directory | `/` (repository root) |
| Build command | `npm install --no-audit --no-fund` |
| Preview command | `npx --yes wrangler@4.158.0 preview --config wrangler.jsonc` |

The Preview build command must run at the repository root. Do not add
`--prefix cloudflare/backend-api` and do not add `--ignore-scripts`.
The exact Preview command must use the root config path `wrangler.jsonc`;
do not prefix it with `cloudflare/backend-api/`.

If `SKIP_DEPENDENCY_INSTALL=1` is present in the build environment, it disables
Cloudflare's automatic dependency-install step. It does **not** suppress the
explicit user Build command above: that command still runs `npm install` at
the repository root and runs the root `postinstall` script.

## Why the two configurations are different

The repository-root `package.json` runs
`scripts/fix-cloudflare-iconv-lite.mjs` through `postinstall`. This narrowly
removes incompatible browser aliases from installed `iconv-lite` manifests so
Wrangler can bundle the Node stream helpers used by the Worker. The Preview
install must therefore run from the root and must not use `--ignore-scripts`.
The patch changes installed package metadata only; it does not change package
versions or application source.

The Preview command is pinned to Wrangler `4.158.0`, matching the version in
`cloudflare/backend-api/package.json`. Worker Preview support requires Wrangler
`4.135.0` or later. Pinning the command makes the CLI version deterministic
rather than relying on whichever version an unpinned `npx wrangler` may fetch.

## Configuration separation and Preview safety

| File | Purpose | Worker name | Firebase | D1 |
|---|---|---|---|---|
| Repository-root `wrangler.jsonc` | Workers Builds PR Preview | `smvastroservices` | `smv-astro-staging` | `smvastro-wallet-staging` |
| `cloudflare/backend-api/wrangler.jsonc` | Worker-directory Staging/Preview config | `smvastroservices` | `smv-astro-staging` | `smvastro-wallet-staging` |
| `cloudflare/backend-api/wrangler.staging.jsonc` | Dedicated Staging operations and local D1 QA | `smvastro-backend-api-staging` | `smv-astro-staging` | `smvastro-wallet-staging` |
| `cloudflare/backend-api/wrangler.production.jsonc` | Explicit Production deploy, secrets and D1 operations | `smvastroservices` | `smv-astro` | `smvastro-wallet-production` |

The repository-root Preview shim points its `main` to
`./cloudflare/backend-api/src/index.mjs`. Its runtime variables, Firebase
project, D1 binding and `previews` bindings are Staging-only. The root Preview
config must never contain the Production D1 ID
`b1d5684c-3fcd-48fe-9571-ea41fc605c7d` or Production Firebase project
`smv-astro`.

Do not change Preview Firebase/D1 settings to Production. Do not point a PR
Preview at `wrangler.production.jsonc`. The Production build remains rooted at
`cloudflare/backend-api` and uses only `wrangler.production.jsonc`.

## CI coverage for root Preview inputs

The Cloudflare backend contract workflow must run when any of these root-level
Preview inputs change:

- `wrangler.jsonc`
- `package.json`
- `package-lock.json`
- `scripts/fix-cloudflare-iconv-lite.mjs`

Keep these paths in both the workflow's `pull_request.paths` and `push.paths`
filters. The config regression test also checks the Dashboard commands,
different Root directories, and the root install/postinstall requirement.
This prevents a root Preview config change from silently bypassing its tests.

## Deployment ownership

- A push to a PR branch runs GitHub contract tests and, when Preview Builds are
  enabled, Cloudflare Workers Builds creates the PR Preview and reports it on
  that PR.
- A merge/push to `main` triggers the Cloudflare Workers Builds Production
  deploy using the Production settings above.
- The GitHub workflow
  `.github/workflows/cloudflare-backend-api-production-deploy.yml` remains
  available through `workflow_dispatch` for explicitly authorized operations
  that validate/synchronize Production secrets, inspect/apply additive
  Production D1 migrations, deploy, and run live health/readiness checks. It is
  intentionally not triggered automatically on every push, avoiding two
  concurrent systems deploying the same Production Worker.

Before any release that changes Production D1 migrations or requires secret
rotation, run the manual Production workflow as a separately reviewed
operation and verify its result. A regular code-only release is handled by
Workers Builds after the PR has passed its Preview and CI checks.
