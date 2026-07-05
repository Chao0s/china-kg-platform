// tests/e2e/docs-site.e2e.mjs
//
// A CI-runnable STATIC proxy for the browser e2e described in chrome-devtools.spec.md.
// No browser, no network — pure node:fs + string/regex checks over docs/index.html.
// It catches the cheap-to-detect regressions (missing lang/title/viewport, broken
// render-critical asset references, dangling in-page anchors) before the heavier
// chrome-devtools-mcp smoke test runs. If docs/index.html does not exist yet
// (docs site not built), the whole suite skips cleanly. node:test only.
//
// Render-critical assets (CSS / JS / images / fonts / JSON) are HARD-asserted: a
// broken <link>/<script>/<img> breaks the page, so a missing target fails the test.
// Links to sibling *prose* docs (Markdown) that are not yet authored are reported
// as a non-fatal warning instead of failing the gate — the docs site is an evolving
// artifact and a not-yet-written linked doc is a content gap, not a render failure.
// The browser runbook (chrome-devtools.spec.md) is where every nav link is verified
// to actually resolve at release time.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const INDEX = path.join(DOCS, 'index.html');

const HAS_INDEX = fs.existsSync(INDEX);
const SKIP = HAS_INDEX ? false : 'docs/index.html does not exist yet — static docs-site e2e skipped';
const html = HAS_INDEX ? fs.readFileSync(INDEX, 'utf8') : '';

// The project name (in either language) should appear somewhere on the page.
const PROJECT_TOKENS = ['化龙', 'Hualong', 'Electronic Resource Platform', '电子资源平台'];

// Render-critical asset extensions — a missing target here actually breaks the page.
const ASSET_EXTS = new Set(['.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.gif',
  '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm']);

test('docs/index.html declares a language on <html>', { skip: SKIP }, () => {
  assert.match(html, /<html[^>]*\blang\s*=\s*["'][^"']+["']/i, 'expected <html lang="...">');
});

test('docs/index.html has a non-empty <title>', { skip: SKIP }, () => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  assert.ok(m, 'expected a <title> element');
  assert.ok(m[1].trim().length > 0, '<title> must not be empty');
});

test('docs/index.html has a responsive viewport meta', { skip: SKIP }, () => {
  assert.match(html, /<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i, 'expected <meta name="viewport">');
});

test('docs/index.html references the project name', { skip: SKIP }, () => {
  assert.ok(
    PROJECT_TOKENS.some(tok => html.includes(tok)),
    `expected one of ${PROJECT_TOKENS.join(' / ')} to appear in the page`,
  );
});

test('every render-critical local asset exists on disk', { skip: SKIP }, () => {
  const missingAssets = [];
  const missingDocs = [];
  for (const ref of extractLocalRefs(html)) {
    const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    if (!clean) continue;
    const target = path.resolve(DOCS, clean);
    if (fs.existsSync(target)) continue;
    const ext = path.extname(clean).toLowerCase();
    if (ASSET_EXTS.has(ext)) missingAssets.push(ref);
    else missingDocs.push(ref); // .md and extensionless links → prose docs
  }
  if (missingDocs.length) {
    // Non-fatal: forward-referenced docs that have not been authored yet.
    console.warn(`[docs-site.e2e] note: links to not-yet-authored docs: ${missingDocs.join(', ')}`);
  }
  assert.equal(
    missingAssets.length, 0,
    `render-critical assets referenced but missing on disk: ${missingAssets.join(', ')}`,
  );
});

test('every in-page #anchor resolves to an element id/name', { skip: SKIP }, () => {
  const ids = new Set();
  for (const m of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  for (const m of html.matchAll(/\bname\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);

  const dangling = [];
  for (const ref of extractAllRefs(html)) {
    if (!ref.startsWith('#')) continue; // only same-page anchors (no path before #)
    const frag = ref.slice(1);
    if (!frag || frag === 'top') continue; // "#" / "#top" are conventional no-ops
    if (!ids.has(frag)) dangling.push(ref);
  }
  assert.equal(dangling.length, 0, `in-page anchors pointing at missing ids: ${dangling.join(', ')}`);
});

// ---------------------------------------------------------------- helpers

/** All href/src values (any scheme). */
function extractAllRefs(s) {
  const out = [];
  for (const m of s.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
  return out;
}

/** Local (non-external, non-data) href/src values, excluding pure #anchors. */
function extractLocalRefs(s) {
  return extractAllRefs(s).filter(ref => {
    if (/^(?:https?:)?\/\//i.test(ref)) return false; // absolute / protocol-relative
    if (/^(?:data|mailto|tel|javascript):/i.test(ref)) return false;
    if (ref.startsWith('#')) return false; // pure in-page anchor
    return true;
  });
}
