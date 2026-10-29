import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../public/smvastro.css', import.meta.url), 'utf8');

function leafRules(source) {
  const stack = [];
  const rules = [];
  let rootSegmentStart = 0;
  let i = 0;
  let quote = '';
  let comment = false;
  let escaped = false;
  const stripComments = value => value.replace(/\/\*[\s\S]*?\*\//g, '');

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (comment) {
      if (ch === '*' && next === '/') { comment = false; i += 2; continue; }
      i += 1; continue;
    }
    if (quote) {
      if (escaped) { escaped = false; i += 1; continue; }
      if (ch === '\\') { escaped = true; i += 1; continue; }
      if (ch === quote) quote = '';
      i += 1; continue;
    }
    if (ch === '/' && next === '*') { comment = true; i += 2; continue; }
    if (ch === '"' || ch === "'") { quote = ch; i += 1; continue; }

    if (ch === '{') {
      const parent = stack[stack.length - 1];
      if (parent) parent.hasChild = true;
      const segmentStart = parent ? parent.segmentStart : rootSegmentStart;
      const selector = stripComments(source.slice(segmentStart, i)).trim();
      stack.push({
        selector, open: i, bodyStart: i + 1, segmentStart: i + 1,
        hasChild: false, context: stack.map(frame => frame.selector)
      });
      i += 1; continue;
    }

    if (ch === '}') {
      const frame = stack.pop();
      if (frame) {
        const body = source.slice(frame.bodyStart, i);
        const allowedContext = frame.context.every(s => /^@(media|supports|container|layer)\b/i.test(s));
        if (!frame.hasChild && frame.selector && !frame.selector.startsWith('@') && allowedContext) {
          rules.push({ selector: frame.selector, body, context: frame.context.join('\n') });
        }
        if (stack.length) stack[stack.length - 1].segmentStart = i + 1;
        else rootSegmentStart = i + 1;
      } else {
        rootSegmentStart = i + 1;
      }
      i += 1; continue;
    }
    i += 1;
  }
  return rules;
}

test('CSS contains no repeated identical leaf rules within the same safe cascade scope', () => {
  const counts = new Map();
  for (const rule of leafRules(css)) {
    const key = JSON.stringify([rule.context, rule.selector, rule.body]);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicated = [...counts.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicated.map(([key, count]) => ({ key, count })), []);
});

test('verified shared theme, mobile layout and Admin text rules remain present', () => {
  assert.match(css, /html body\.smv-v12-theme #smv-content-hub/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /#admin :is\(#adminPendingQuestions, #adminAnswers, #adminRefunds, #adminQuestions\) \.small/);
  assert.match(css, /color:#6b4b1e!important;text-shadow:none!important/);
});
