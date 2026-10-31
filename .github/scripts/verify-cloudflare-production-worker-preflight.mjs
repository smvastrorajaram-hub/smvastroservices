import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ACCOUNT_ID = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const API_TOKEN = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const DATABASE_NAME = "smvastro-wallet-production";
const DATABASE_ID = "b1d5684c-3fcd-48fe-9571-ea41fc605c7d";
const WORKER_NAME = "smvastroservices";
const EXPECTED_SUBDOMAIN = "astroservices";
const MIGRATIONS = [
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

assert.ok(API_TOKEN, "CLOUDFLARE_API_TOKEN is not configured.");
assert.ok(/^[a-f0-9]{32}$/i.test(ACCOUNT_ID), "CLOUDFLARE_ACCOUNT_ID is missing or malformed.");

const apiBase = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(ACCOUNT_ID);

async function cloudflareRequest(pathname, options = {}) {
  const response = await fetch(apiBase + pathname, {
    ...options,
    headers: {
      Authorization: "Bearer " + API_TOKEN,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    const errors = Array.isArray(body?.errors) ? body.errors : [];
    const codes = errors.map(item => String(item?.code || "")).filter(Boolean).join(",");
    const messages = errors.map(item => String(item?.message || "")).filter(Boolean).join("; ").slice(0, 240);
    throw new Error("Cloudflare API request failed (HTTP " + response.status +
      (codes ? ", codes " + codes : "") +
      (messages ? ", message: " + messages : "") + ").");
  }
  return body;
}

async function listDatabases() {
  const all = [];
  for (let page = 1; page <= 100; page += 1) {
    const body = await cloudflareRequest("/d1/database?page=" + page + "&per_page=10000");
    const rows = Array.isArray(body.result) ? body.result : [];
    all.push(...rows);
    const totalPages = Number(body.result_info?.total_pages || 0);
    if (totalPages > 0 ? page >= totalPages : rows.length < 10000) return all;
  }
  throw new Error("D1 inventory exceeded the 100-page safety bound.");
}

async function d1Query(sql) {
  const body = await cloudflareRequest("/d1/database/" + encodeURIComponent(DATABASE_ID) + "/query", {
    method: "POST",
    body: JSON.stringify({ sql })
  });
  return (Array.isArray(body.result) ? body.result : [])
    .flatMap(item => Array.isArray(item?.results) ? item.results : []);
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

async function expectedObjects() {
  const migrationDir = path.join(process.cwd(), "cloudflare", "backend-api", "migrations");
  const contents = await Promise.all(MIGRATIONS.map(name =>
    readFile(path.join(migrationDir, name), "utf8")
  ));
  const ddl = contents.join("\n");
  const objects = {
    tables: [...ddl.matchAll(/CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(match => match[1]),
    indexes: [...ddl.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(match => match[1]),
    triggers: [...ddl.matchAll(/CREATE TRIGGER IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(match => match[1])
  };
  for (const [kind, names] of Object.entries(objects)) {
    assert.ok(names.length > 0, "No reviewed " + kind + " were found.");
    assert.equal(new Set(names).size, names.length, "Duplicate reviewed " + kind + " names were found.");
  }
  return objects;
}


async function verifyDeployedBinding() {
  const workerInventory = await cloudflareRequest("/workers/scripts?per_page=1000");
  const scripts = Array.isArray(workerInventory.result) ? workerInventory.result : [];
  const deployed = scripts.find(item => String(item?.id || item?.name || "") === WORKER_NAME);
  assert.ok(deployed, "The production Worker script was not found after deployment.");
  const settings = await cloudflareRequest("/workers/scripts/" + encodeURIComponent(WORKER_NAME) + "/settings");
  const bindings = Array.isArray(settings.result?.bindings) ? settings.result.bindings : [];
  const matches = bindings.filter(binding =>
    String(binding?.type || "").toLowerCase() === "d1" &&
    String(binding?.name || "") === "DB"
  );
  assert.equal(matches.length, 1, "The production Worker must have exactly one DB D1 binding.");
  const databaseId = String(matches[0]?.id || matches[0]?.database_id || "");
  assert.equal(databaseId, DATABASE_ID, "The deployed Worker DB binding does not point to the reviewed Production D1.");
  console.log("PRODUCTION_WORKER_D1_BINDING_VERIFIED");
  console.log(JSON.stringify({
    workerName: WORKER_NAME,
    workersDevHostname: WORKER_NAME + "." + EXPECTED_SUBDOMAIN + ".workers.dev",
    bindingName: "DB",
    databaseName: DATABASE_NAME,
    databaseId: DATABASE_ID
  }));
}

async function main() {
  const subdomain = await cloudflareRequest("/workers/subdomain");
  assert.equal(
    String(subdomain.result?.subdomain || ""),
    EXPECTED_SUBDOMAIN,
    "The account workers.dev subdomain does not match the requested production URL."
  );

  const workerInventory = await cloudflareRequest("/workers/scripts?per_page=1000");
  const scripts = Array.isArray(workerInventory.result) ? workerInventory.result : [];
  const existingWorker = scripts.find(item =>
    String(item?.id || item?.name || "") === WORKER_NAME
  );

  let existingBindings = [];
  if (existingWorker) {
    const settings = await cloudflareRequest("/workers/scripts/" + encodeURIComponent(WORKER_NAME) + "/settings");
    existingBindings = Array.isArray(settings.result?.bindings) ? settings.result.bindings : [];
    const configuredVars = new Set([
      "SMV_ENVIRONMENT",
      "SMV_BACKEND_CLOUDFLARE_ACTIVE",
      "SMV_WALLET_BACKFILL_TOOLS_ENABLED",
      "SMV_WALLET_DOMAIN_QUIESCED",
      "SMV_WALLET_DOMAIN_CUTOVER_COMPLETE",
      "SMV_WALLET_PAYOUT_KEY_VERSION",
      "SMV_IDENTITY_PROFILE_BACKFILL_ENABLED",
      "SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE",
      "SMV_IDENTITY_PROFILE_BACKFILL_PREVIEW_ONLY",
      "SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED",
      "SMV_LIVE_SESSION_ROUTES_ENABLED",
      "FIREBASE_AUTH_PROJECT_IDS",
      "ALLOWED_ORIGINS"
    ]);
    const secretConflicts = existingBindings
      .filter(binding => configuredVars.has(String(binding?.name || "")) &&
        String(binding?.type || "").toLowerCase().startsWith("secret"));
    assert.deepEqual(
      secretConflicts.map(binding => String(binding.name)),
      [],
      "An existing production Worker secret conflicts with a production config variable; refusing to overwrite it."
    );
    const existingD1Bindings = existingBindings.filter(binding =>
      String(binding?.type || "").toLowerCase() === "d1"
    );
    for (const binding of existingD1Bindings) {
      const priorDatabaseId = String(binding?.id || binding?.database_id || "");
      if (String(binding?.name || "") !== "DB" || priorDatabaseId !== DATABASE_ID) {
        throw new Error("The existing production Worker has a different D1 binding; refusing to overwrite it.");
      }
    }
    const namedDbBinding = existingBindings.find(binding => String(binding?.name || "") === "DB");
    if (namedDbBinding && String(namedDbBinding?.type || "").toLowerCase() !== "d1") {
      throw new Error("The existing production Worker already uses the DB binding name for another resource; refusing to overwrite it.");
    }
  }

  const inventory = await listDatabases();
  const database = inventory.find(item => String(item?.name || "") === DATABASE_NAME);
  assert.ok(database, "The reviewed Production D1 database was not found.");
  assert.equal(String(database.uuid || ""), DATABASE_ID, "Production D1 UUID does not match the reviewed database.");

  const objects = await expectedObjects();
  const schemaRows = await d1Query(
    "SELECT name, type FROM sqlite_master " +
    "WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
  );

  const actualTables = schemaRows.filter(row => row.type === "table").map(row => String(row.name));
  const actualIndexes = schemaRows.filter(row => row.type === "index").map(row => String(row.name));
  const actualTriggers = schemaRows.filter(row => row.type === "trigger").map(row => String(row.name));

  assert.deepEqual(
    sorted(actualTables.filter(name => name !== "d1_migrations" && name !== "_cf_KV")),
    sorted(objects.tables),
    "Production D1 application tables differ from the reviewed migration set."
  );
  assert.deepEqual(sorted(actualIndexes), sorted(objects.indexes), "Production D1 indexes differ from the reviewed migration set.");
  assert.deepEqual(sorted(actualTriggers), sorted(objects.triggers), "Production D1 triggers differ from the reviewed migration set.");

  const schemaMeta = await d1Query(
    "SELECT schema_key, schema_version FROM smv_domain_schema_meta ORDER BY schema_key"
  );
  const actualMeta = Object.fromEntries(schemaMeta.map(row => [
    String(row.schema_key), String(row.schema_version)
  ]));
  assert.deepEqual(actualMeta, EXPECTED_SCHEMA_META, "Production D1 schema metadata is incomplete or unexpected.");

  const migrationRows = await d1Query("SELECT COUNT(*) AS row_count FROM d1_migrations");
  assert.equal(Number(migrationRows[0]?.row_count), MIGRATIONS.length, "Production D1 migration ledger is not exactly eight migrations.");

  const nonEmptyTables = [];
  for (const table of objects.tables) {
    if (table === "smv_domain_schema_meta") continue;
    const rows = await d1Query("SELECT COUNT(*) AS row_count FROM " + table);
    if (Number(rows[0]?.row_count) !== 0) nonEmptyTables.push(table);
  }
  assert.deepEqual(nonEmptyTables, [], "Production D1 contains application rows; deployment is blocked.");

  const summary = {
    workerName: WORKER_NAME,
    workerAlreadyExists: Boolean(existingWorker),
    existingBindingNames: existingBindings.map(binding => String(binding?.name || "")).filter(Boolean),
    workersDevHostname: WORKER_NAME + "." + EXPECTED_SUBDOMAIN + ".workers.dev",
    databaseName: DATABASE_NAME,
    databaseId: DATABASE_ID,
    tableCount: objects.tables.length,
    indexCount: objects.indexes.length,
    triggerCount: objects.triggers.length,
    migrationCount: MIGRATIONS.length,
    schemaMetadataRows: schemaMeta.length,
    applicationDataRows: 0,
    productionSettingsRows: 0,
    remoteWritesPerformed: 0,
    migrationApplied: false
  };
  console.log("PRODUCTION_WORKER_BINDING_PREFLIGHT_PASS");
  console.log(JSON.stringify(summary));
}

if (process.argv[2] === "--verify-binding") await verifyDeployedBinding();
else await main();
