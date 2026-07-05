// lib-resolve-core.mjs — Shared helpers for the launcher and the dashboard smoke test.
//
// The dashboard imports `@understand-anything/core` subpaths (e.g. `.../core/schema`).
// If the core package is not built, those dist files are missing and Vite fails at
// transform time with "Failed to resolve import". These helpers (a) pick the LATEST
// cached plugin version and (b) statically verify every core subpath the dashboard
// imports actually resolves to a built dist file — catching the failure deterministically,
// without a browser. Pure Node, no dependencies.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

function walk(dir, exts) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const cmpSemver = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0); }
  return 0;
};

/** Ordered list of candidate plugin roots that contain packages/dashboard. Latest cache version first. */
export function pluginCandidates(home = os.homedir(), env = process.env) {
  const list = [];
  if (env.UA_PLUGIN_ROOT) list.push(env.UA_PLUGIN_ROOT);
  if (env.CLAUDE_PLUGIN_ROOT) list.push(env.CLAUDE_PLUGIN_ROOT);
  list.push(path.join(home, '.understand-anything-plugin'));
  const cache = path.join(home, '.claude', 'plugins', 'cache', 'understand-anything', 'understand-anything');
  try {
    const versions = fs.readdirSync(cache).filter(v => /^\d+\.\d+\.\d+/.test(v)).sort(cmpSemver).reverse();
    for (const v of versions) list.push(path.join(cache, v));
  } catch { /* none */ }
  for (const base of ['.codex', '.opencode', '.pi', '']) {
    list.push(path.join(home, base, 'understand-anything', 'understand-anything-plugin'));
  }
  return list.filter(Boolean);
}

/** First candidate whose packages/dashboard exists, preferring one whose core is built. */
export function findPlugin(home = os.homedir(), env = process.env) {
  const withDash = pluginCandidates(home, env).filter(r => fs.existsSync(path.join(r, 'packages', 'dashboard', 'package.json')));
  if (!withDash.length) return null;
  const built = withDash.find(r => coreImportStatus(r).missing.length === 0);
  return built || withDash[0];
}

/** Check every `@understand-anything/core[/sub]` import in the dashboard resolves to a built dist file. */
export function coreImportStatus(pluginRoot) {
  const coreDir = path.join(pluginRoot, 'packages', 'core');
  const dashSrc = path.join(pluginRoot, 'packages', 'dashboard', 'src');
  const pkg = (() => { try { return JSON.parse(read(path.join(coreDir, 'package.json'))); } catch { return {}; } })();
  const exportsMap = pkg.exports || { '.': { default: pkg.main || './dist/index.js' } };
  const specifiers = new Set();
  const re = /from\s+['"]@understand-anything\/core(\/[\w./-]+)?['"]/g;
  for (const f of walk(dashSrc, ['.ts', '.tsx', '.js', '.jsx'])) {
    const txt = read(f); let m;
    while ((m = re.exec(txt)) !== null) specifiers.add(m[1] ? '.' + m[1] : '.');
  }
  const missing = [];
  for (const spec of specifiers) {
    const ent = exportsMap[spec];
    const rel = typeof ent === 'string' ? ent : (ent && (ent.default || ent.import));
    if (!rel) { missing.push({ specifier: spec, expectedFile: '(no export map entry)' }); continue; }
    const file = path.join(coreDir, rel);
    if (!fs.existsSync(file)) missing.push({ specifier: spec, expectedFile: path.relative(pluginRoot, file).replace(/\\/g, '/') });
  }
  return { coreDir, specifiers: [...specifiers], missing };
}
