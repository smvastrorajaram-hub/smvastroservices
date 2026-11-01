import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('Staging APK Worker uses isolated Firebase, D1, R2 and origin with uploads off by default', async () => {
  const [config, productionConfig, html, adminClient, publicClient] = await Promise.all([
    read('cloudflare/android-apk-release/wrangler.staging.toml'),
    read('cloudflare/android-apk-release/wrangler.toml'),
    read('public/index.html'),
    read('public/smvastro.mjs'),
    read('public/android-app-install.js')
  ]);

  assert.match(config, /^name = "smv-astro-apk-release-api-staging"$/m);
  assert.match(config, /^FIREBASE_ALLOWED_PROJECT_IDS = "smv-astro-staging"$/m);
  assert.match(config, /^ALLOWED_ORIGINS = "https:\/\/smv-astro-phase1-browser-staging-v2\.onrender\.com"$/m);
  assert.match(config, /^ALLOW_APK_UPLOADS = "false"$/m);
  assert.match(config, /^bucket_name = "smv-astro-apk-releases-staging"$/m);
  assert.match(config, /^database_name = "smv-astro-apk-releases-staging"$/m);
  assert.match(config, /^database_id = "00000000-0000-0000-0000-000000000000"$/m);
  assert.doesNotMatch(config, /5105ebb3-435c-47b7-9983-2e171fa911cd/);
  assert.doesNotMatch(config, /smv-astro-apk-release-api"/);
  assert.doesNotMatch(config, /smv-astro-apk-releases"/);
  assert.match(productionConfig, /5105ebb3-435c-47b7-9983-2e171fa911cd/);
  assert.match(productionConfig, /smv-astro-apk-releases"/);

  assert.match(html, /SMV_APK_RELEASE_STAGING_API_URL[^;]*smv-astro-apk-release-api-staging\.astroservices\.workers\.dev/);
  assert.match(html, /SMV_APK_RELEASE_API_URL[^;]*smv-astro-apk-release-api\.astroservices\.workers\.dev/);
  assert.match(adminClient, /location\.hostname==='smv-astro-phase1-browser-staging-v2\.onrender\.com'/);
  assert.match(adminClient, /window\.SMV_APK_RELEASE_STAGING_API_URL/);
  assert.match(publicClient, /location\.hostname === 'smv-astro-phase1-browser-staging-v2\.onrender\.com'/);
  assert.match(publicClient, /window\.SMV_APK_RELEASE_STAGING_API_URL/);
  assert.match(publicClient, /location\.hostname\.includes\('phase1-browser'\)/);
  assert.doesNotMatch(publicClient, /SMV_APK_RELEASE_ADMIN_API_URL/);
});

test('Staging APK deployment workflow is manual, branch-restricted, and uses a separate token and D1 ID', async () => {
  const workflow = await read('.github/workflows/deploy-android-apk-release-staging-worker.yml');
  const readme = await read('cloudflare/android-apk-release/README.staging.md');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(readme, /workflow_dispatch[\s\S]*default branch/);
  assert.match(workflow, /confirm_staging_apk_worker_deploy/);
  assert.match(workflow, /enable_staging_admin_uploads:[\s\S]*default: "no"/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /CLOUDFLARE_APK_RELEASE_STAGING_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_APK_STAGING_D1_ID/);
  assert.match(workflow, /smv-astro-apk-releases-staging/);
  assert.match(workflow, /smv-astro-apk-release-api-staging/);
  assert.match(workflow, /health\.d1Ready === true/);
  assert.match(workflow, /health\.r2Ready === true/);
  assert.match(workflow, /5105ebb3-435c-47b7-9983-2e171fa911cd/);
  assert.doesNotMatch(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.CLOUDFLARE_APK_RELEASE_API_TOKEN/);
});

test('Staging APK resource instructions prohibit Production resource reuse and copying Production releases', async () => {
  const readme = await read('cloudflare/android-apk-release/README.staging.md');
  assert.match(readme, /smv-astro-apk-releases-staging/);
  assert.match(readme, /CLOUDFLARE_APK_RELEASE_STAGING_API_TOKEN/);
  assert.match(readme, /Do not reuse/);
  assert.match(readme, /ALLOW_APK_UPLOADS = "false"/);
  assert.match(readme, /No APK is copied automatically from Production/);
  assert.match(readme, /does not import, copy, delete, or inspect Production APK records or binaries/);
});
