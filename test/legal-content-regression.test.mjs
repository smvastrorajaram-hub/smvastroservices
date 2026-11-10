import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const HEADING_COLOUR = '#9d1118';

test('Public FAQ explains the current Private Chat written question workflow separately from Live Chat', () => {
  const html = read('public/index.html');
  assert.ok(html.includes('id="faq-private-chat"'));
  assert.match(html, /Private Chat is a paid written question-and-answer service/);
  assert.match(html, /not a real-time conversation/);
  assert.match(html, /complete Razorpay checkout/);
  assert.match(html, /Customer Dashboard → Private Chat Questions/);
  assert.match(html, /estimated answer time of 24–48 hours/);
  assert.match(html, /not a guaranteed delivery deadline/);
  assert.match(html, /read it before submitting a review/);
});

test('Sitemap lists Private Chat and uses a simple Sitemap heading with one heading colour', () => {
  const html = read('public/sitemap.html');
  assert.match(html, /<h1>Sitemap<\/h1>/);
  assert.doesNotMatch(html, /<h1[^>]*>[^<]*SMV ASTRO/i);
  assert.match(html, /<strong>Private Chat<\/strong>/);
  assert.match(html, /index\.html#faq-private-chat/);
  assert.match(html, new RegExp(HEADING_COLOUR.replace('#', '\\#')));
  assert.match(html, /smv-sitemap-unified-heading-color/);
});

test('Privacy Policy covers Private Chat birth details, written questions, answers and review access', () => {
  const html = read('public/privacy.html');
  assert.match(html, /<title>Privacy Policy<\/title>/);
  assert.match(html, /Updated: 10 November 2026/);
  assert.match(html, /Private Chat information/);
  assert.match(html, /birth date, birth time, birth place, gender, written question/);
  assert.match(html, /Razorpay order and payment references/);
  assert.match(html, /whether the Customer has opened the released answer/);
  assert.match(html, /separate paid written question-and-answer service/);
  assert.match(html, /may review or approve a question or answer/);
  assert.doesNotMatch(html, /<h1[^>]*>[^<]*SMV ASTRO/i);
  assert.doesNotMatch(html, /<a class="brand"[^>]*>☀ SMV ASTRO/);
  assert.match(html, /smv-privacy-unified-heading-color/);
  assert.match(html, new RegExp(HEADING_COLOUR.replace('#', '\\#')));
});

test('Terms explain Private Chat pricing, payment, expected response and answer release', () => {
  const html = read('public/terms.html');
  assert.match(html, /<title>Terms &amp; Conditions<\/title>/);
  assert.match(html, /Updated: 10 November 2026/);
  assert.match(html, /Private Chat written questions/);
  assert.match(html, /separate paid written question-and-answer service/);
  assert.match(html, /complete Razorpay checkout/);
  assert.match(html, /separate fixed request price/);
  assert.match(html, /not deducted as a Live Chat session charge from the Customer Wallet/);
  assert.match(html, /estimated answer window of 24–48 hours/);
  assert.match(html, /not a guaranteed delivery time/);
  assert.match(html, /Customer Dashboard → Private Chat Questions/);
  assert.doesNotMatch(html, /<h1[^>]*>[^<]*SMV ASTRO/i);
  assert.doesNotMatch(html, /<a class="brand"[^>]*>☀ SMV ASTRO/);
  assert.match(html, /smv-terms-unified-heading-color/);
  assert.match(html, new RegExp(HEADING_COLOUR.replace('#', '\\#')));
});

test('XML sitemap last-modified dates reflect the current public content and policy update', () => {
  const xml = read('public/sitemap.xml');
  assert.equal((xml.match(/<lastmod>2026-11-10<\/lastmod>/g) || []).length, 4);
  assert.match(xml, /https:\/\/smvastroservices\.in\/privacy\.html/);
  assert.match(xml, /https:\/\/smvastroservices\.in\/terms\.html/);
  assert.match(xml, /https:\/\/smvastroservices\.in\/sitemap\.html/);
});
