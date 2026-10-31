import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile, appendFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DATABASE_NAME = "smvastro-wallet-production";
const LOCATION_HINT = "apac";
const WRANGLER_VERSION = "4.156.0";
const MIGRATION_FILES = [
  "0002_shared_domain_repository.sql",
  "0003_notification_inbox.sql",
  "0004_wallet_offer_redemptions.sql",
  "0005_legacy_wallet_backfill.sql",
  "0006_d1_live_wallet_settlement.sql",
  "0007_identity_profile_domain.sql",
  "0008_identity_profile_backfill_audit.sql",
  "0009_wallet_razorpay_payout_encryption.sql"
];
const EXPECTED_SCHEMA_META = {
  "shared-domain": "0002_shared_domain_repository",
  "wallet-recharges": "0005_legacy_wallet_backfill",
  "live-sessions": "0006_d1_live_wallet_settlement",
  "identity-profiles": "0008_identity_profile_backfill_audit",
  "wallet-security": "0009_wallet_razorpay_payout_encryption"
};

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const sourceMigrationsDir = path.join(root, "cloudflare", "backend-api", "migrations");
const workDir = path.join(os.tmpdir(), "smvastro-production-d1-schema");
const generatedMigrationsDir = path.join(workDir, "migrations");
const configPath = path.join(workDir, "wrangler.production.jsonc");

function execWrangler(args, env = process.env) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, [
    "--yes",
    "wrangler@" + WRANGLER_VERSION,
    ...args
  ], {
    cwd: workDir,
    env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error("Wrangler exited with status " + result.status + ".");
  }
}

async function prepareMigrations(databaseId) {
  await rm(workDir, { recursive: true, force: true });
  await mkdir(generatedMigrationsDir, { recursive: true });

  for (const filename of MIGRATION_FILES) {
    const original = await readFile(path.join(sourceMigrationsDir, filename), "utf8");
    let content = original;

    if (filename === "0009_wallet_razorpay_payout_encryption.sql") {
      const commissionSeed = /-- The legacy Firebase Live service applies a 20\/80 commission fallback only[\s\S]*?VALUES\s*\(\s*'commission'[\s\S]*?;\s*/;
      const matches = content.match(commissionSeed);
      assert.equal(matches?.length, 1, "Expected exactly one legacy commission seed to remove from 0009.");
      content = content.replace(commissionSeed, "");
      assert.doesNotMatch(
        content,
        /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+smv_domain_settings/i,
        "Production schema must not seed business settings."
      );
    }

    await writeFile(path.join(generatedMigrationsDir, filename), content, "utf8");
  }

  const config = {
    name: "smvastro-production-d1-schema-only",
    compatibility_date: "2026-10-31",
    d1_databases: [{
      binding: "DB",
      database_name: DATABASE_NAME,
      database_id: databaseId,
      migrations_dir: "migrations"
    }]
  };
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  const ddl = (await Promise.all(MIGRATION_FILES.map(name =>
    readFile(path.join(generatedMigrationsDir, name), "utf8")
  ))).join("\n");
  assert.doesNotMatch(ddl, /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+smv_domain_settings/i);
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS smv_domain_schema_meta/i);
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS smv_domain_wallets/i);
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS smv_domain_live_sessions/i);
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS smv_domain_identity_users/i);

  const objects = {
    tables: [...ddl.matchAll(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(m => m[1]),
    indexes: [...ddl.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(m => m[1]),
    triggers: [...ddl.matchAll(/CREATE TRIGGER IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(m => m[1])
  };
  for (const [kind, names] of Object.entries(objects)) {
    assert.ok(names.length > 0, "No " + kind + " discovered in the production migration set.");
    assert.equal(new Set(names).size, names.length, "Duplicate " + kind + " names in production migration set.");
  }
  return { objects, configPath };
}

function cloudflareHeaders(token) {
  return {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

async function cloudflareRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...cloudflareHeaders(token), ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    const codes = Array.isArray(body?.errors)
      ? body.errors.map(item => String(item?.code || "")).filter(Boolean).join(",")
      : "";
    throw new Error(
      "Cloudflare API request failed (HTTP " + response.status +
      (codes ? ", API codes " + codes : "") + ")."
    );
  }
  return body;
}

async function listDatabases(base, token) {
  const all = [];
  for (let page = 1; page <= 100; page += 1) {
    const body = await cloudflareRequest(base + "?page=" + page + "&per_page=10000", token);
    const rows = Array.isArray(body.result) ? body.result : [];
    all.push(...rows);
    const totalPages = Number(body.result_info?.total_pages || 0);
    if (totalPages > 0 ? page >= totalPages : rows.length < 10000) break;
    if (page === 100) throw new Error("D1 inventory exceeded the 100-page safety bound.");
  }
  return all;
}

async function d1Query(base, databaseId, token, sql) {
  const body = await cloudflareRequest(
    base + "/" + encodeURIComponent(databaseId) + "/query",
    token,
    { method: "POST", body: JSON.stringify({ sql }) }
  );
  const results = Array.isArray(body.result) ? body.result : [];
  return results.flatMap(item => Array.isArray(item?.results) ? item.results : []);
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function assertExactSet(label, actual, expected) {
  assert.deepEqual(sorted(actual), sorted(expected), label + " do not match the reviewed migration set.");
}

async function verifyExistingDatabaseIsSafe(base, databaseId, token, expectedObjects) {
  const rows = await d1Query(
    base,
    databaseId,
    token,
    "SELECT name, type FROM sqlite_master " +
      "WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' " +
      "ORDER BY type, name"
  );
  const allNames = rows.map(row => String(row.name || ""));
  const allowed = new Set([
    "d1_migrations",
    ...expectedObjects.tables,
    ...expectedObjects.indexes,
    ...expectedObjects.triggers
  ]);
  const unknown = allNames.filter(name => !allowed.has(name));
  assert.deepEqual(unknown, [], "Existing production-named D1 contains unreviewed schema objects; refusing to use it.");

  const existingTables = rows.filter(row => row.type === "table").map(row => String(row.name));
  for (const table of existingTables) {
    if (table === "d1_migrations" || table === "smv_domain_schema_meta") continue;
    const countRows = await d1Query(base, databaseId, token, "SELECT COUNT(*) AS row_count FROM " + table);
    assert.equal(Number(countRows[0]?.row_count), 0, "Existing production-named D1 contains application rows; refusing to continue.");
  }

  if (existingTables.includes("smv_domain_schema_meta")) {
    const meta = await d1Query(base, databaseId, token, "SELECT schema_key, schema_version FROM smv_domain_schema_meta");
    for (const row of meta) {
      const key = String(row.schema_key || "");
      assert.ok(Object.hasOwn(EXPECTED_SCHEMA_META, key), "Unrecognized schema metadata key in existing D1.");
      assert.equal(
        String(row.schema_version || ""),
        EXPECTED_SCHEMA_META[key],
        "Existing D1 schema metadata is not a known completed migration version."
      );
    }
  }
}

async function verifyRemoteSchema(base, databaseId, token, objects) {
  const rows = await d1Query(
    base,
    databaseId,
    token,
    "SELECT name, type FROM sqlite_master " +
      "WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' " +
      "ORDER BY type, name"
  );
  const actualTables = rows.filter(row => row.type === "table").map(row => String(row.name));
  const actualIndexes = rows.filter(row => row.type === "index").map(row => String(row.name));
  const actualTriggers = rows.filter(row => row.type === "trigger").map(row => String(row.name));

  assertExactSet("Production D1 tables", actualTables.filter(name => name !== "d1_migrations"), objects.tables);
  assertExactSet("Production D1 named indexes", actualIndexes, objects.indexes);
  assertExactSet("Production D1 triggers", actualTriggers, objects.triggers);
  assert.ok(actualTables.includes("d1_migrations"), "Wrangler migration ledger is missing.");

  const countUnion = objects.tables.map(table =>
    "SELECT '" + table + "' AS table_name, COUNT(*) AS row_count FROM " + table
  ).join(" UNION ALL ");
  const counts = await d1Query(base, databaseId, token, countUnion);
  const nonEmpty = counts
    .filter(row => String(row.table_name) !== "smv_domain_schema_meta" && Number(row.row_count) !== 0)
    .map(row => String(row.table_name));
  assert.deepEqual(nonEmpty, [], "Schema-only verification found application data rows.");

  const schemaMeta = await d1Query(
    base,
    databaseId,
    token,
    "SELECT schema_key, schema_version FROM smv_domain_schema_meta ORDER BY schema_key"
  );
  const actualMeta = Object.fromEntries(schemaMeta.map(row => [
    String(row.schema_key),
    String(row.schema_version)
  ]));
  assert.deepEqual(actualMeta, EXPECTED_SCHEMA_META, "Schema version metadata is incomplete.");

  const settingsRows = await d1Query(base, databaseId, token, "SELECT COUNT(*) AS row_count FROM smv_domain_settings");
  assert.equal(Number(settingsRows[0]?.row_count), 0, "Business settings were unexpectedly seeded.");

  const historyRows = await d1Query(base, databaseId, token, "SELECT COUNT(*) AS row_count FROM d1_migrations");
  assert.equal(Number(historyRows[0]?.row_count), MIGRATION_FILES.length, "Not all reviewed migration files were applied.");

  return {
    tableCount: actualTables.filter(name => name !== "d1_migrations").length,
    indexCount: actualIndexes.length,
    triggerCount: actualTriggers.length,
    migrationCount: MIGRATION_FILES.length,
    schemaMetadataRows: schemaMeta.length,
    businessRows: 0,
    commissionSettingRows: Number(settingsRows[0]?.row_count)
  };
}

async function localCheck() {
  const { configPath, objects } = await prepareMigrations("00000000-0000-4000-8000-000000000000");
  execWrangler([
    "d1", "migrations", "apply", DATABASE_NAME,
    "--local",
    "--config", configPath
  ]);
  console.log("PASS: all eight production D1 migrations applied to a fresh local database.");
  console.log("PASS: production migration set contains " + objects.tables.length + " tables, " +
    objects.indexes.length + " named indexes and " + objects.triggers.length + " triggers.");
  console.log("PASS: legacy commission business-setting seed is excluded.");
}

async function provisionRemote() {
  const token = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  assert.ok(token, "CLOUDFLARE_API_TOKEN is not configured.");
  assert.ok(/^[a-f0-9]{32}$/i.test(accountId), "CLOUDFLARE_ACCOUNT_ID is missing or malformed.");

  const { configPath, objects } = await prepareMigrations("00000000-0000-4000-8000-000000000000");
  const apiBase = "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) + "/d1/database";

  const inventory = await listDatabases(apiBase, token);
  let database = inventory.find(item => String(item?.name || "") === DATABASE_NAME);
  let createdThisRun = false;

  if (!database) {
    const created = await cloudflareRequest(apiBase, token, {
      method: "POST",
      body: JSON.stringify({
        name: DATABASE_NAME,
        primary_location_hint: LOCATION_HINT
      })
    });
    database = created.result;
    createdThisRun = true;
  }

  const databaseId = String(database?.uuid || "").trim();
  assert.ok(/^[a-f0-9-]{36}$/i.test(databaseId), "Cloudflare did not return a valid D1 database UUID.");
  assert.equal(String(database?.name || ""), DATABASE_NAME, "Cloudflare returned a different D1 database name.");

  await verifyExistingDatabaseIsSafe(apiBase, databaseId, token, objects);

  const remoteConfig = {
    name: "smvastro-production-d1-schema-only",
    compatibility_date: "2026-10-31",
    d1_databases: [{
      binding: "DB",
      database_name: DATABASE_NAME,
      database_id: databaseId,
      migrations_dir: "migrations"
    }]
  };
  await writeFile(configPath, JSON.stringify(remoteConfig, null, 2) + "\n", "utf8");

  execWrangler([
    "d1", "migrations", "apply", DATABASE_NAME,
    "--remote",
    "--config", configPath
  ]);

  const verified = await verifyRemoteSchema(apiBase, databaseId, token, objects);
  const summary = {
    databaseName: DATABASE_NAME,
    databaseId,
    requestedPrimaryLocationHint: LOCATION_HINT.toUpperCase(),
    databaseCreatedThisRun: createdThisRun,
    schemaOnly: true,
    ...verified,
    stagingDatabaseChanged: false,
    apkReleaseDatabaseChanged: false,
    firebaseRowsImported: 0,
    productionWorkerDeployed: false,
    productionTrafficChanged: false
  };

  console.log("CLOUDFLARE_PRODUCTION_D1_SCHEMA_ONLY_RESULT");
  console.log(JSON.stringify(summary));
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, "database_name=" + DATABASE_NAME + "\n");
    await appendFile(output, "database_id=" + databaseId + "\n");
    await appendFile(output, "table_count=" + verified.tableCount + "\n");
    await appendFile(output, "migration_count=" + verified.migrationCount + "\n");
  }
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    await appendFile(stepSummary,
      "## Cloudflare Production D1 — schema-only provisioning\n\n" +
      "| Item | Verified result |\n|---|---|\n" +
      "| Database | " + DATABASE_NAME + " |\n" +
      "| Database ID | " + databaseId + " |\n" +
      "| Requested primary location hint | APAC (Cloudflare best-effort hint) |\n" +
      "| Tables / named indexes / triggers | " + verified.tableCount + " / " + verified.indexCount + " / " + verified.triggerCount + " |\n" +
      "| Migrations applied | " + verified.migrationCount + " of " + MIGRATION_FILES.length + " |\n" +
      "| Schema metadata rows | " + verified.schemaMetadataRows + " |\n" +
      "| Application data rows | " + verified.businessRows + " |\n" +
      "| Business settings seeded | " + verified.commissionSettingRows + " |\n" +
      "| Firebase import / Worker deploy / traffic switch | none / none / none |\n\n" +
      "Cloudflare location hints are best-effort and do not guarantee a specific physical region. The production D1 is not yet bound to a Worker.\n"
    );
  }
}

const mode = process.argv[2];
if (mode === "--local-check") await localCheck();
else if (mode === "--provision-remote") await provisionRemote();
else throw new Error("Use --local-check or --provision-remote.");
