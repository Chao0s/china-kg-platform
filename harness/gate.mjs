#!/usr/bin/env node
// gate.mjs — The commit gate for the China KG Platform.
//
// Runs the full quality harness and BLOCKS the commit if any "block"-level check fails.
// Check levels (off | warn | block) come from harness/harness.config.json.
//
//   1. Glossary check        (Node)   — terminology vs docs/glossary.json
//   2. Typewriter lint       (Node)   — bilingual house style on Markdown
//   3. Structure judge       (Python) — codebase conformance to docs/APP-STRUCTURE.md
//   4. Parity check          (Node)   — EN/简中 doc pairs stay in sync (+ staged co-update)
//   5. Design judge          (Python) — huashu 5-dimension design critique
//   6. Wording judge         (Python) — documentation copy + bilingual consistency
//   7. Tests                 (Node)   — node --test tests/
//   + Handoff reminder       — a commit should update the tracked HANDOFF.md
//   + Understand-map reminder— rebuild .understand-anything via /understand-anything:understand
//
// Usage:  node harness/gate.mjs [--fast] [--no-judges]
//   --fast       quick local loop: glossary + typewriter + structure + parity only
//                (skips the Python design/wording judges AND the test run)
//   --no-judges  skip design/wording judges (keep everything else)
// Exit: 0 all "block" checks pass · 1 a blocking failure · 2 environment error
//
// Wired into .githooks/pre-commit and .github/workflows/ci.yml. Pure Node; shells out to python.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, read, parseArgs, c } from './lib/util.mjs';
import { computeReminders } from './lib/reminders.mjs';

const args = parseArgs(process.argv.slice(2));
const fast = !!args.flags.fast;
const noJudges = !!args.flags['no-judges'];

let cfg;
try { cfg = JSON.parse(read(path.join(ROOT, 'harness', 'harness.config.json'))); } catch { cfg = {}; }
const checksCfg = cfg.checks || {};
const level = (name, dflt = 'block') => (checksCfg[name] && checksCfg[name].level) || dflt;
const threshold = name => String((checksCfg[name] && checksCfg[name].threshold) || 6.0);

const PY = detectPython();
const NODE = process.execPath;
const H = p => path.join(ROOT, 'harness', p);

function detectPython() {
  for (const cand of ['python', 'python3', 'py']) {
    const r = spawnSync(cand, ['--version'], { encoding: 'utf8' });
    if (r.status === 0 || (r.stdout + r.stderr).toLowerCase().includes('python')) return cand;
  }
  return null;
}

// --relative makes git report paths relative to cwd (= ROOT) instead of the git
// top-level. Without it, a nested checkout (this repo living inside a larger
// workspace) yields "Hualong Platform/docs/HANDOFF.md" while the config says
// "docs/HANDOFF.md", so every staged-file comparison silently misses.
// It also correctly excludes files staged outside ROOT, which are not ours.
function stagedFiles() {
  const r = spawnSync('git', ['diff', '--cached', '--name-only', '--relative'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout) return [];
  return r.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(s => s.replace(/\\/g, '/'));
}

// Build the check list (name, level, command). Skipped if level==off.
const checks = [];
const add = (name, cmd, argv) => { const lv = level(name); if (lv !== 'off' && cmd) checks.push({ name, level: lv, cmd, argv }); };

add('glossary', NODE, [H('glossary-check.mjs')]);
add('typewriter', NODE, [H('typewriter.mjs'), 'lint']);
if (PY) add('structureJudge', PY, [H('judges/structure_judge.py')]);
else if (level('structureJudge') !== 'off') console.log(c.yellow('⚠ Python not found — structure judge skipped.'));
add('parity', NODE, [H('parity-check.mjs')]);

if (!noJudges && !fast) {
  if (!PY) {
    if (level('designJudge') !== 'off' || level('wordingJudge') !== 'off')
      console.log(c.yellow('⚠ Python not found — design/wording judges skipped. Install Python 3 to enable them.'));
  } else {
    add('designJudge', PY, [H('judges/design_judge.py'), path.join(ROOT, 'docs'), '--threshold', threshold('designJudge')]);
    add('wordingJudge', PY, [H('judges/wording_judge.py'), path.join(ROOT, 'docs'), '--threshold', threshold('wordingJudge')]);
  }
}
if (!fast && fs.existsSync(path.join(ROOT, 'tests'))) add('tests', NODE, ['--test', 'tests/']);

const label = {
  glossary: 'Glossary check', typewriter: 'Typewriter lint', structureJudge: 'Structure judge',
  parity: 'Parity check', designJudge: 'Design judge', wordingJudge: 'Wording judge', tests: 'Tests',
};

console.log(c.bold('╔══════════════════════════════════════════╗'));
console.log(c.bold('║   China KG Platform — Commit Gate         ║'));
console.log(c.bold('╚══════════════════════════════════════════╝'));
console.log(c.dim(`mode: ${fast ? 'fast' : 'full'}${noJudges ? ' (no judges)' : ''} · python: ${PY || 'none'}\n`));

const results = [];
for (const check of checks) {
  process.stdout.write(`▸ ${label[check.name] || check.name} … `);
  const r = spawnSync(check.cmd, check.argv, { cwd: ROOT, encoding: 'utf8' });
  const ok = r.status === 0;
  const blocking = check.level === 'block';
  results.push({ name: check.name, ok, blocking });
  console.log(ok ? c.green('PASS') : (blocking ? c.red('FAIL') : c.yellow('WARN')));
  if (!ok) console.log(((r.stdout || '') + (r.stderr || '')).split('\n').map(l => '   ' + l).join('\n'));
}

// ---- Reminders (handoff, understand-map) — logic lives in lib/reminders.mjs ----
const staged = stagedFiles();
for (const rem of computeReminders({ rootDir: ROOT, stagedFiles: staged, config: cfg })) {
  if (!rem.fire) continue;
  const blocking = rem.level === 'block';
  results.push({ name: rem.name, ok: false, blocking, reminder: true });
  console.log(`▸ ${rem.name} … ${blocking ? c.red('FAIL') : c.yellow('WARN')}`);
  console.log('   ' + rem.msg);
}

console.log('\n' + c.bold('── Summary ──'));
for (const r of results) {
  const tag = r.ok ? c.green('✓') : (r.blocking ? c.red('✗') : c.yellow('!'));
  console.log(`  ${tag} ${label[r.name] || r.name}${r.reminder ? c.dim(' (reminder)') : ''}${!r.ok && !r.blocking ? c.dim(' — warning, non-blocking') : ''}`);
}

const failed = results.filter(r => !r.ok && r.blocking);
const warned = results.filter(r => !r.ok && !r.blocking);
if (failed.length) {
  console.log('\n' + c.red(`✗ Commit blocked: ${failed.length} blocking check(s) failed.`) + (warned.length ? c.yellow(` (${warned.length} warning(s))`) : ''));
  console.log(c.dim('  Fix the findings above, or run `node harness/gate.mjs --fast` for a quick local pass.'));
  process.exit(1);
}
if (warned.length) console.log('\n' + c.green('✓ All blocking checks passed.') + c.yellow(` ${warned.length} non-blocking reminder(s) above.`));
else console.log('\n' + c.green('✓ All checks passed — commit approved.'));
process.exit(0);
