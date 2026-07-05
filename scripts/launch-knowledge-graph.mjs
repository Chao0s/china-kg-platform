#!/usr/bin/env node
// launch-knowledge-graph.mjs — One-command launcher for the Understand-Anything dashboard.
//
// Resolves dependencies and opens the interactive knowledge graph for THIS repo's
// committed map (.understand-anything/knowledge-graph.json), so anyone who clones the
// repo can view it. Thin wrappers: scripts/launch-knowledge-graph.bat (Windows),
// scripts/launch-knowledge-graph.sh (macOS/Linux/git-bash).
//
// What it does:
//   1. Verify the map exists (else tell you to run /understand-anything:understand).
//   2. Locate the understand-anything plugin's dashboard (env override or known paths).
//   3. Ensure pnpm (corepack, else npm i -g pnpm).
//   4. Install dashboard deps + build the core package (+ rebuild esbuild for vite).
//   5. Start Vite pointed at this repo's map and print the tokenized dashboard URL.
//
// Env overrides: UA_PLUGIN_ROOT (path to the plugin root that contains packages/dashboard).

import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlugin, coreImportStatus } from './lib-resolve-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const HOME = os.homedir();
const isWin = process.platform === 'win32';
const log = (...a) => console.log('[kg]', ...a);
const die = (m) => { console.error('[kg] ' + m); process.exit(1); };

// 1. Map present?
const MAP = path.join(REPO, '.understand-anything', 'knowledge-graph.json');
if (!fs.existsSync(MAP)) {
  die('No knowledge graph found at .understand-anything/knowledge-graph.json.\n' +
      '      Generate it first with Claude Code:  /understand-anything:understand');
}
log('map:', path.relative(REPO, MAP));

// 2. Find the dashboard — LATEST cached version, preferring one whose core is already built.
const PLUGIN = findPlugin(HOME, process.env);
if (!PLUGIN) {
  die('Could not find the understand-anything plugin (packages/dashboard).\n' +
      '      Install the understand-anything plugin in Claude Code, or set UA_PLUGIN_ROOT to its root.');
}
const DASH = path.join(PLUGIN, 'packages', 'dashboard');
log('plugin:', PLUGIN);
log('dashboard:', DASH);

// 3. Ensure pnpm.
function has(cmd) { const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: isWin }); return r.status === 0; }
function run(cmd, args, opts = {}) {
  log('$', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: isWin, ...opts });
  return r.status === 0;
}
if (!has('pnpm')) {
  log('pnpm not found — trying corepack…');
  if (!run('corepack', ['prepare', 'pnpm@latest', '--activate'])) {
    log('corepack failed — installing pnpm via npm…');
    if (!run('npm', ['i', '-g', 'pnpm'])) die('Could not install pnpm. Install it manually: npm i -g pnpm');
  }
}
log('pnpm:', (spawnSync('pnpm', ['--version'], { encoding: 'utf8', shell: isWin }).stdout || '').trim());

// 4. Deps + build.
run('pnpm', ['install', '--frozen-lockfile'], { cwd: PLUGIN }) || run('pnpm', ['install'], { cwd: PLUGIN });
run('pnpm', ['rebuild', 'esbuild'], { cwd: PLUGIN }); // ensure vite's native dep (best-effort)
run('pnpm', ['--filter', '@understand-anything/core', 'build'], { cwd: PLUGIN });

// 4b. Verify the dashboard's core imports actually resolve to built files BEFORE launching,
//     so we never hand the user a Vite "Failed to resolve import" page.
let st = coreImportStatus(PLUGIN);
if (st.missing.length) { run('pnpm', ['--filter', '@understand-anything/core', 'build'], { cwd: PLUGIN }); st = coreImportStatus(PLUGIN); }
if (st.missing.length) {
  die('Dashboard core imports do not resolve — the core package is not built:\n' +
      st.missing.map(m => '        ' + m.specifier + '  ->  ' + m.expectedFile + ' (missing)').join('\n') +
      '\n      Fix: cd "' + PLUGIN + '" && pnpm install && pnpm --filter @understand-anything/core build');
}
log('core imports OK (' + st.specifiers.length + ' core specifier(s) resolve).');

// 5. Launch Vite pointed at this repo's map.
log('starting dashboard… (Ctrl+C to stop). Watch for the "Dashboard URL: …?token=…" line.');
const child = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', '--host', '127.0.0.1'], {
  cwd: DASH, stdio: 'inherit', shell: isWin, env: { ...process.env, GRAPH_DIR: REPO },
});
child.on('exit', (code) => process.exit(code || 0));
