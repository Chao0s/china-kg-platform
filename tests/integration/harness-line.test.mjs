// tests/integration/harness-line.test.mjs
//
// END-TO-END "does the whole harness line fire correctly?" test.
//
// For every mechanism in the harness it asserts BOTH directions:
//   - it FIRES (blocks / warns / flags) in the bad situation, and
//   - it stays SILENT in the good situation.
//
// Coverage: glossary checker, typewriter (lint + heading skip + --fix + generator),
// design judge, wording judge, structure judge, parity check (incl. staged co-update),
// the guidance reminders (handoff + understand-map, all situations), the Claude editor
// hooks (pre-edit-guard, post-edit-check), the git hooks (commit-msg, pre-commit), the
// gate aggregation, and settings.json wiring.
//
// IMPORTANT: the gate is only ever invoked with --fast here. The full gate runs
// `node --test tests/`, so calling it un-fast would recurse into this very file.
//
// Pure node:test + node:assert. Python/sh/git tests skip gracefully when the runtime
// is absent. Temp fixtures live under the OS temp dir and are cleaned up.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const NODE = process.execPath;
const FIX = path.join(ROOT, 'tests', 'fixtures');

const H = {
  glossary: path.join('harness', 'glossary-check.mjs'),
  typewriter: path.join('harness', 'typewriter.mjs'),
  parity: path.join('harness', 'parity-check.mjs'),
  gate: path.join('harness', 'gate.mjs'),
  designJudge: path.join('harness', 'judges', 'design_judge.py'),
  wordingJudge: path.join('harness', 'judges', 'wording_judge.py'),
  structureJudge: path.join('harness', 'judges', 'structure_judge.py'),
  preEdit: path.join('.claude', 'hooks', 'pre-edit-guard.mjs'),
  postEdit: path.join('.claude', 'hooks', 'post-edit-check.mjs'),
  commitMsg: path.join('.githooks', 'commit-msg'),
  preCommit: path.join('.githooks', 'pre-commit'),
};

// Scrub git-hook env vars (GIT_DIR / GIT_INDEX_FILE / GIT_WORK_TREE / GIT_PREFIX / ...).
// When the full gate runs inside the pre-commit hook, git exports these into the hook's
// environment; any child `git` process that inherits them operates on the REAL commit index
// instead of the test's isolated temp repo — which both injected fixture files (a.md) into
// the actual commit and made parity-check read the wrong index. Tests create their own repos.
const cleanEnv = (() => {
  const e = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
})();

function runNode(args, opts = {}) {
  const r = spawnSync(NODE, args, { cwd: ROOT, encoding: 'utf8', env: cleanEnv, ...opts });
  if (r.error) throw r.error;
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}
function runStdin(scriptRelPath, payload, env = {}) {
  const r = spawnSync(NODE, [path.join(ROOT, scriptRelPath)], {
    cwd: ROOT, encoding: 'utf8', input: JSON.stringify(payload), env: { ...cleanEnv, ...env },
  });
  if (r.error) throw r.error;
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function detect(cmd, args) {
  try { const r = spawnSync(cmd, args, { encoding: 'utf8' }); return r.status === 0 || /version|\d/.test((r.stdout || '') + (r.stderr || '')); }
  catch { return false; }
}
const PY = ['python', 'python3', 'py'].find(c => detect(c, ['--version'])) || null;
const SH = detect('sh', ['-c', 'exit 0']) ? 'sh' : (detect('bash', ['-c', 'exit 0']) ? 'bash' : null);
const GIT = detect('git', ['--version']);
function runPy(scriptRelPath, args) {
  const r = spawnSync(PY, [path.join(ROOT, scriptRelPath), ...args], { cwd: ROOT, encoding: 'utf8', env: cleanEnv });
  if (r.error) throw r.error;
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const tmpDirs = [];
function mkTmp() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kg-line-')); tmpDirs.push(d); return d; }
after(() => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

// =============================================================== GLOSSARY CHECKER
test('LINE glossary: BLOCKS a forbidden variant (家园共育), exit 1 + P1', () => {
  const r = runNode([H.glossary, path.join('tests', 'fixtures', 'glossary-bad.md'), '--json']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.pass, false);
  assert.ok(out.findings.some(f => f.severity === 'P1'), 'expected a P1 finding');
});
test('LINE glossary: SILENT on canonical-only + masking (订阅消息), exit 0', () => {
  const r = runNode([H.glossary, path.join('tests', 'fixtures', 'glossary-canonical-mask.md'), '--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).pass, true);
});

// ===================================================================== TYPEWRITER
test('LINE typewriter: BLOCKS half-width punctuation on a CJK-dominant line', () => {
  const d = mkTmp();
  const f = path.join(d, 'cjk.md');
  fs.writeFileSync(f, '# 标题\n\n这是一句中文,使用了半角逗号和句号.\n', 'utf8');
  const r = runNode([H.typewriter, 'lint', f, '--json']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(out.findings.some(x => /half-width/.test(x.title)), 'expected a half-width punctuation finding');
});
test('LINE typewriter: BLOCKS a heading-level skip (h1 -> h3)', () => {
  const d = mkTmp();
  const f = path.join(d, 'skip.md');
  fs.writeFileSync(f, '# A\n\n### C\n', 'utf8');
  const r = runNode([H.typewriter, 'lint', f, '--json']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.ok(JSON.parse(r.stdout).findings.some(x => /heading jumps/.test(x.title)));
});
test('LINE typewriter: --fix repairs a dirty file, re-lint is clean', () => {
  const d = mkTmp();
  const f = path.join(d, 'fixme.md');
  fs.writeFileSync(f, '# 标题\n\n中文一句,带半角标点.\n', 'utf8');
  runNode([H.typewriter, 'lint', f, '--fix']);
  const r = runNode([H.typewriter, 'lint', f, '--json']);
  assert.equal(r.code, 0, 're-lint after --fix should be clean\n' + r.stdout);
  assert.equal(JSON.parse(r.stdout).pass, true);
});
test('LINE typewriter: generator emits a bilingual ADR scaffold', () => {
  const r = runNode([H.typewriter, 'new', 'adr', 'My Decision'], { env: { ...cleanEnv, TYPEWRITER_DATE: '2026-06-18' } });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /ADR-NNNN: My Decision/);
  assert.match(r.stdout, /决策/);
});

// =================================================================== DESIGN JUDGE
test('LINE design judge: --self-test OK', { skip: PY ? false : 'python not found' }, () => {
  assert.equal(runPy(H.designJudge, ['--self-test']).code, 0);
});
test('LINE design judge: scores AI-slop HTML below clean HTML + emits findings', { skip: PY ? false : 'python not found' }, () => {
  const d = mkTmp();
  const bad = path.join(d, 'bad.html');
  const good = path.join(d, 'good.html');
  fs.writeFileSync(bad,
    '<!doctype html><html><head><style>' +
    'body{font-family:Inter;font-size:10px;line-height:1.2;background:linear-gradient(135deg,#a020f0,#ff69b4,#1e90ff)}' +
    '.card{border-radius:13px;padding:27px}</style></head>' +
    '<body><h1 style="font-size:18px">🚀 标题 ✨</h1><p>正文很小。</p><button style="width:20px;height:20px">⚡</button></body></html>', 'utf8');
  fs.writeFileSync(good,
    '<!doctype html><html><head><style>:root{--color-primary:#E8924A;--space-2:16px}' +
    'body{font-family:system-ui,"Noto Sans SC";font-size:16px;line-height:1.75;color:#2B2A28;background:#FCFAF6}' +
    'h1{font-size:44px;line-height:1.2}.btn{min-width:44px;min-height:44px;border-radius:9999px;padding:var(--space-2);background:var(--color-primary)}</style></head>' +
    '<body><h1>欢迎</h1><p>这是正文内容，排版清晰。</p><a class="btn">进入</a></body></html>', 'utf8');
  const b = JSON.parse(runPy(H.designJudge, [bad, '--json']).stdout);
  const g = JSON.parse(runPy(H.designJudge, [good, '--json']).stdout);
  assert.ok(b.overall >= 0 && b.overall <= 10 && Array.isArray(b.dimensions), 'valid schema');
  assert.ok(b.findings.length >= 1, 'bad HTML should produce findings');
  assert.ok(b.overall < g.overall, `bad (${b.overall}) should score below good (${g.overall})`);
});

// ================================================================== WORDING JUDGE
test('LINE wording judge: --self-test OK', { skip: PY ? false : 'python not found' }, () => {
  assert.equal(runPy(H.wordingJudge, ['--self-test']).code, 0);
});
test('LINE wording judge: flags a forbidden term + AI-slop fluff', { skip: PY ? false : 'python not found' }, () => {
  const d = mkTmp();
  const f = path.join(d, 'doc.md');
  fs.writeFileSync(f, '# Title\n\nOur revolutionary, seamless, cutting-edge 家园共育 platform.\n', 'utf8');
  const r = runPy(H.wordingJudge, [f, '--json', '--glossary', path.join(ROOT, 'docs', 'glossary.json')]);
  const out = JSON.parse(r.stdout);
  assert.ok(out.findings.length >= 1, 'expected findings (terminology and/or tone)');
});

// ================================================================ STRUCTURE JUDGE
test('LINE structure judge: --self-test OK (mapped-missing fires, fully-mapped passes)', { skip: PY ? false : 'python not found' }, () => {
  assert.equal(runPy(H.structureJudge, ['--self-test']).code, 0);
});
test('LINE structure judge: PASSES with skip note on the live repo (no app code yet)', { skip: PY ? false : 'python not found' }, () => {
  const r = runPy(H.structureJudge, ['--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.pass, true);
});

// ==================================================================== PARITY CHECK
function writePair(dir, enHeadings, zhHeadings) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'harness.config.json'), JSON.stringify({ bilingualPairs: [{ en: 'a.md', zh: 'b.md' }] }), 'utf8');
  fs.writeFileSync(path.join(dir, 'a.md'), Array.from({ length: enHeadings }, (_, i) => `# H${i}\n\nbody\n`).join('\n'), 'utf8');
  fs.writeFileSync(path.join(dir, 'b.md'), Array.from({ length: zhHeadings }, (_, i) => `# H${i}\n\n正文\n`).join('\n'), 'utf8');
}
test('LINE parity: BLOCKS on heading-count mismatch between a pair', () => {
  const d = mkTmp(); writePair(d, 3, 2);
  const r = runNode([H.parity, '--root', d, '--json']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.ok(JSON.parse(r.stdout).findings.some(f => /Heading mismatch/.test(f.title)));
});
test('LINE parity: SILENT on a matched pair', () => {
  const d = mkTmp(); writePair(d, 3, 3);
  const r = runNode([H.parity, '--root', d, '--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(r.stdout).pass, true);
});
test('LINE parity: BLOCKS staged co-update (one twin staged, other not)', { skip: GIT ? false : 'git not found' }, () => {
  const d = mkTmp(); writePair(d, 2, 2); // matched headings so ONLY the co-update fires
  const g = (args) => spawnSync('git', args, { cwd: d, encoding: 'utf8', env: cleanEnv });
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't']);
  g(['add', 'a.md']); // stage only the EN twin
  const r = runNode([H.parity, '--root', d, '--json']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.ok(JSON.parse(r.stdout).findings.some(f => f.severity === 'P0' && /staged/.test(f.title)));
});

// ======================================================== GUIDANCE REMINDERS (pure)
const reminders = await import(pathToFileURL(path.join(ROOT, 'harness', 'lib', 'reminders.mjs')).href);
function remRoot({ handoff = true, map = false }) {
  const d = mkTmp();
  if (handoff) fs.writeFileSync(path.join(d, 'HANDOFF.md'), '# h\n', 'utf8');
  if (map) { fs.mkdirSync(path.join(d, '.understand-anything'), { recursive: true }); fs.writeFileSync(path.join(d, '.understand-anything', 'knowledge-graph.json'), '{}', 'utf8'); }
  return d;
}
const remOf = (list, name) => list.find(x => x.name === name);

test('LINE reminder/handoff: FIRES when committing without HANDOFF.md staged', () => {
  const d = remRoot({ handoff: true });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: ['docs/PRD.md'], config: {} });
  assert.equal(remOf(out, 'handoff').fire, true);
});
test('LINE reminder/handoff: SILENT when HANDOFF.md is staged', () => {
  const d = remRoot({ handoff: true });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: ['HANDOFF.md', 'docs/PRD.md'], config: {} });
  assert.equal(remOf(out, 'handoff').fire, false);
});
test('LINE reminder/handoff: SILENT when not committing (nothing staged)', () => {
  const d = remRoot({ handoff: true });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: {} });
  assert.equal(remOf(out, 'handoff').fire, false);
});
test('LINE reminder/handoff: FIRES when HANDOFF.md is missing', () => {
  const d = remRoot({ handoff: false });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: {} });
  assert.equal(remOf(out, 'handoff').fire, true);
});

// Nested checkout: this repo living inside a larger workspace. `git diff --cached
// --name-only` reports paths relative to the GIT TOP-LEVEL, not to the harness
// root, so staged paths arrive prefixed ("Hualong Platform/docs/HANDOFF.md")
// while the config says "docs/HANDOFF.md". gate.mjs and parity-check.mjs now
// pass --relative so this should not happen, but stagedIncludes tolerates it
// anyway — the reminder silently never firing is worse than a false positive.
test('LINE reminder/handoff: SILENT when the staged path carries this root as its prefix', () => {
  const d = remRoot({ handoff: true });
  const base = path.basename(d);
  const out = reminders.computeReminders({
    rootDir: d,
    stagedFiles: [`${base}/HANDOFF.md`, `${base}/docs/PRD.md`],
    config: {},
  });
  assert.equal(remOf(out, 'handoff').fire, false, 'a path prefixed by this root must still count as staged');
});
test('LINE reminder/handoff: a same-named file under a DIFFERENT tree does not count', () => {
  const d = remRoot({ handoff: true });
  const out = reminders.computeReminders({
    rootDir: d,
    stagedFiles: ['other-project/HANDOFF.md'],
    config: {},
  });
  assert.equal(remOf(out, 'handoff').fire, true, 'another project\'s file must not satisfy our handoff');
});
test('LINE stagedIncludes: exact match, root-prefixed match, and nothing looser', () => {
  const f = reminders.stagedIncludes;
  assert.equal(f(['docs/HANDOFF.md'], 'docs/HANDOFF.md'), true, 'exact');
  assert.equal(f(['work/docs/HANDOFF.md'], 'docs/HANDOFF.md', '/tmp/work'), true, 'prefixed by the root basename');
  assert.equal(f(['other/docs/HANDOFF.md'], 'docs/HANDOFF.md', '/tmp/work'), false, 'a different prefix must not match');
  assert.equal(f(['nested/docs/HANDOFF.md'], 'docs/HANDOFF.md'), false, 'no rootDir means exact only');
  assert.equal(f(['xdocs/HANDOFF.md'], 'docs/HANDOFF.md', '/tmp/work'), false, 'partial segment');
  assert.equal(f([], 'docs/HANDOFF.md', '/tmp/work'), false, 'nothing staged');
});
test('LINE reminder/map: FIRES when knowledge-graph.json is missing', () => {
  const d = remRoot({ map: false });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: {} });
  assert.equal(remOf(out, 'understandMap').fire, true);
});
test('LINE reminder/map: SILENT when the map exists', () => {
  const d = remRoot({ map: true });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: {} });
  assert.equal(remOf(out, 'understandMap').fire, false);
});
test('LINE reminder: level "off" suppresses the reminder entirely', () => {
  const d = remRoot({ handoff: false });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: { checks: { handoff: { level: 'off' } } } });
  assert.equal(remOf(out, 'handoff'), undefined);
});
test('LINE reminder: level "block" is reported as blocking', () => {
  const d = remRoot({ handoff: false });
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: { checks: { handoff: { level: 'block' } } } });
  assert.equal(remOf(out, 'handoff').level, 'block');
});

// ============================================================ PRE-EDIT-GUARD HOOK
const abs = (...p) => path.join(ROOT, ...p);
const guardDecision = (r) => { try { return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision; } catch { return null; } };
const preEdit = (...seg) => guardDecision(runStdin(H.preEdit, { tool_name: 'Edit', tool_input: { file_path: abs(...seg) } }));
test('LINE pre-edit-guard: ASKS the user to confirm editing docs/glossary.json (exit 0, decision=ask)', () => {
  const r = runStdin(H.preEdit, { tool_name: 'Edit', tool_input: { file_path: abs('docs', 'glossary.json') } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(guardDecision(r), 'ask');
});
test('LINE pre-edit-guard: ASKS the user to confirm editing a CI workflow', () => {
  assert.equal(preEdit('.github', 'workflows', 'ci.yml'), 'ask');
});
test('LINE pre-edit-guard: DENIES a .git path (decision=deny)', () => {
  assert.equal(preEdit('.git', 'config'), 'deny');
});
test('LINE pre-edit-guard: DENIES a lockfile (decision=deny)', () => {
  assert.equal(preEdit('package-lock.json'), 'deny');
});
test('LINE pre-edit-guard: WARNS but ALLOWS a harness file (no decision, exit 0)', () => {
  const r = runStdin(H.preEdit, { tool_name: 'Edit', tool_input: { file_path: abs('harness', 'gate.mjs') } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(guardDecision(r), null, 'warn should not emit a permission decision');
});
test('LINE pre-edit-guard: ALLOWS a normal doc silently (exit 0, no decision)', () => {
  const r = runStdin(H.preEdit, { tool_name: 'Edit', tool_input: { file_path: abs('docs', 'PRD.md') } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.equal(guardDecision(r), null);
});

// ============================================================ POST-EDIT-CHECK HOOK
test('LINE post-edit-check: BLOCKS a dirty markdown (forbidden variant) exit 2', () => {
  const r = runStdin(H.postEdit, { tool_name: 'Write', tool_input: { file_path: path.join(FIX, 'glossary-bad.md') } });
  assert.equal(r.code, 2, r.stdout + r.stderr);
});
test('LINE post-edit-check: SILENT on a clean markdown (exit 0)', () => {
  const r = runStdin(H.postEdit, { tool_name: 'Write', tool_input: { file_path: path.join(FIX, 'clean.md') } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
});
test('LINE post-edit-check: SILENT on a non-markdown file (exit 0)', () => {
  const r = runStdin(H.postEdit, { tool_name: 'Write', tool_input: { file_path: abs('package.json') } });
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

// ================================================================== COMMIT-MSG HOOK
test('LINE commit-msg: REJECTS a non-conventional message (exit 1)', { skip: SH ? false : 'sh not found' }, () => {
  const d = mkTmp(); const f = path.join(d, 'm');
  fs.writeFileSync(f, 'updated some stuff\n', 'utf8');
  const r = spawnSync(SH, [abs(H.commitMsg), f], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 1, (r.stdout || '') + (r.stderr || ''));
});
test('LINE commit-msg: ACCEPTS a conventional message (exit 0)', { skip: SH ? false : 'sh not found' }, () => {
  const d = mkTmp(); const f = path.join(d, 'm');
  fs.writeFileSync(f, 'docs: add a section to the PRD\n', 'utf8');
  const r = spawnSync(SH, [abs(H.commitMsg), f], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

// ============================================================ PRE-COMMIT + GATE + WIRING
test('LINE pre-commit hook invokes the gate and is valid shell', () => {
  const src = fs.readFileSync(abs(H.preCommit), 'utf8');
  assert.match(src, /gate\.mjs/, 'pre-commit must run the gate');
  if (SH) assert.equal(spawnSync(SH, ['-n', abs(H.preCommit)], { encoding: 'utf8' }).status, 0, 'pre-commit must be valid sh');
});
test('LINE gate: --fast PASSES on the clean repo (exit 0)', () => {
  // --fast skips the Python judges AND tests, so this does NOT recurse into node --test.
  const r = runNode([H.gate, '--fast']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Glossary check/);
  assert.match(r.stdout, /Parity check/);
});
test('LINE settings.json wires PreToolUse + PostToolUse for Edit/Write', () => {
  const s = JSON.parse(fs.readFileSync(abs('.claude', 'settings.json'), 'utf8'));
  assert.ok(s.hooks && Array.isArray(s.hooks.PreToolUse) && s.hooks.PreToolUse.length, 'PreToolUse wired');
  assert.ok(s.hooks && Array.isArray(s.hooks.PostToolUse) && s.hooks.PostToolUse.length, 'PostToolUse wired');
  const all = JSON.stringify(s.hooks);
  assert.match(all, /pre-edit-guard/);
  assert.match(all, /post-edit-check/);
});

// ================================================================= TEMP CLEANUP
const CLEAN = path.join('harness', 'clean-temp.mjs');
function tmpWithClutter() {
  const d = mkTmp();
  const tdir = path.join(d, 'tests', '.tmp');
  fs.mkdirSync(tdir, { recursive: true });
  fs.writeFileSync(path.join(tdir, 'junk.txt'), 'scratch', 'utf8');
  return { d, tdir };
}
test('LINE clean-temp: LISTS temp clutter as a dry run and does NOT delete', () => {
  const { d, tdir } = tmpWithClutter();
  const r = runNode([CLEAN, '--root', d, '--json']);
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.applied, false);
  assert.ok(out.targets.some(t => t.path === 'tests/.tmp'), 'should list tests/.tmp');
  assert.ok(fs.existsSync(tdir), 'dry run must not delete');
});
test('LINE clean-temp: --apply removes the clutter', () => {
  const { d, tdir } = tmpWithClutter();
  const r = runNode([CLEAN, '--root', d, '--apply', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.applied, true);
  assert.ok(out.removed.includes('tests/.tmp'));
  assert.ok(!fs.existsSync(tdir), 'apply must delete the clutter');
});
test('LINE reminder/tempCleanup: FIRES (prompt to launch temp-janitor) when temp is non-empty', () => {
  const { d } = tmpWithClutter();
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: { tempCleanup: { paths: ['tests/.tmp'] } } });
  const t = remOf(out, 'tempCleanup');
  assert.equal(t.fire, true);
  assert.match(t.msg, /temp-janitor/);
});
test('LINE reminder/tempCleanup: SILENT when there is no temp clutter', () => {
  const d = mkTmp();
  const out = reminders.computeReminders({ rootDir: d, stagedFiles: [], config: { tempCleanup: { paths: ['tests/.tmp'] } } });
  assert.equal(remOf(out, 'tempCleanup').fire, false);
});
test('LINE parity: README pair is configured and enforced (same as PRD)', () => {
  const cfg = JSON.parse(fs.readFileSync(abs('harness', 'harness.config.json'), 'utf8'));
  const pairs = cfg.bilingualPairs.map(p => `${p.en}|${p.zh}`);
  assert.ok(pairs.includes('README.md|README.zh-CN.md'), 'README pair must be in bilingualPairs');
  assert.ok(pairs.includes('docs/PRD.md|docs/PRD.zh-CN.md'), 'PRD pair must be in bilingualPairs');
});
