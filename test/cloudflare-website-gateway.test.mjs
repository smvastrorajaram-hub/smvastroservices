import test from "node:test";
import assert from "node:assert/strict";
import { handleWebsiteRequest } from "../cloudflare/website-gateway/src/index.mjs";

const origin = "https://smv-astro-phase1-browser-staging-v2.onrender.com";
const env = { RENDER_WEBSITE_ORIGIN: origin };
function response(body, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html" } });
}

test("healthy Render website is proxied and source is observable", async () => {
  let seen;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/dashboard?from=test"),
    env,
    async request => { seen = request; return response("<h1>Render</h1>"); }
  );
  assert.equal(seen.url, origin + "/dashboard?from=test");
  assert.equal(result.headers.get("X-SMV-Website-Source"), "render");
  assert.equal(await result.text(), "<h1>Render</h1>");
});

test("Render 503 serves the last Cloudflare static snapshot", async () => {
  let assetCalls = 0;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/index.html"),
    { ...env, ASSETS: { fetch: async request => {
      assetCalls += 1;
      assert.equal(new URL(request.url).pathname, "/index.html");
      return response("<h1>Cloudflare snapshot</h1>");
    } } },
    async () => response("Render deploy unavailable", 503)
  );
  assert.equal(assetCalls, 1);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("X-SMV-Website-Source"), "cloudflare-static-fallback");
  assert.equal(result.headers.get("X-SMV-Website-Origin-Status"), "503");
  assert.equal(await result.text(), "<h1>Cloudflare snapshot</h1>");
});

test("Render network failure serves static assets", async () => {
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/"),
    { ...env, ASSETS: { fetch: async () => response("<h1>Cached home</h1>") } },
    async () => { throw new Error("Render origin offline"); }
  );
  assert.equal(result.headers.get("X-SMV-Website-Source"), "cloudflare-static-fallback");
  assert.equal(result.headers.get("X-SMV-Website-Origin-Status"), "network-error");
});

test("non-retryable Render 404 passes through instead of masking it with stale assets", async () => {
  let assetCalls = 0;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/missing.css"),
    { ...env, ASSETS: { fetch: async () => { assetCalls += 1; return response("stale"); } } },
    async () => response("Not found", 404)
  );
  assert.equal(result.status, 404);
  assert.equal(result.headers.get("X-SMV-Website-Source"), "render");
  assert.equal(assetCalls, 0);
});

test("POST is never replayed to static assets after a Render failure", async () => {
  let assetCalls = 0;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/some-api", {
      method: "POST", body: JSON.stringify({ important: true }),
      headers: { "Content-Type": "application/json" }
    }),
    { ...env, ASSETS: { fetch: async () => { assetCalls += 1; return response("must not run"); } } },
    async () => { throw new Error("Render API unavailable"); }
  );
  assert.equal(result.status, 502);
  assert.equal(result.headers.get("X-SMV-Website-Source"), "gateway-error");
  assert.equal(assetCalls, 0);
});

test("origin validation prevents proxying outside the isolated Staging Render host", async () => {
  let fetchCalls = 0;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/"),
    { ...env, RENDER_WEBSITE_ORIGIN: "https://smvastroservices.in", ASSETS: { fetch: async () => response("staged snapshot") } },
    async () => { fetchCalls += 1; return response("must not run"); }
  );
  assert.equal(result.headers.get("X-SMV-Website-Source"), "cloudflare-static-fallback");
  assert.equal(fetchCalls, 0);
});

test("gateway health is available without contacting Render", async () => {
  let fetchCalls = 0;
  const result = await handleWebsiteRequest(
    new Request("https://smvastro-website-staging.astroservices.workers.dev/__smv_gateway_health"),
    env,
    async () => { fetchCalls += 1; return response("must not run"); }
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json()).productionTrafficEnabled, false);
  assert.equal(result.headers.get("X-SMV-Website-Source"), "cloudflare-gateway");
  assert.equal(fetchCalls, 0);
});
