import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("Staging browser loads the current Live Video Call JavaScript bundle", () => {
  assert.match(
    html,
    /smvastro\.mjs\?v=20261103-staging-live-video-call-v1/,
    "the static HTML must bust the pre-video JavaScript asset URL"
  );
});

test("Render Browser v2 Staging canonical and Open Graph URLs stay on staging", () => {
  const script = html.match(/<script id="smv-staging-origin-canonical">([\s\S]*?)<\/script>/)?.[1] || "";
  assert.match(script, /smv-astro-phase1-browser-staging-v2\.onrender\.com/);
  assert.match(script, /canonical\.href=location\.origin\+'\/'/);
  assert.match(script, /og\.content=location\.origin\+'\/'/);
});

test("Staging browser chrome uses the cream theme without altering Production defaults", () => {
  assert.match(html, /<meta content="#8b1717" name="theme-color">/);
  const script = html.match(/<script id="smv-staging-theme-color">([\s\S]*?)<\/script>/)?.[1] || "";
  assert.match(script, /smv-astro-phase1-browser-staging-v2\.onrender\.com/);
  assert.match(script, /setAttribute\('content','#fff8e7'\)/);
});
