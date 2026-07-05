#!/usr/bin/env node
// code-review.mjs — Lightweight static code review for the FUTURE app source.
//
// A reusable, run-per-change pre-commit check inspired by the code-reviewer skill
// (C:\Users\Herman\.claude\skills\code-reviewer). It is a NO-OP today: there is no
// application source yet, so it prints a skip-pass and exits 0. The moment app
// code lands under src/ | miniprogram/ | app/, it activates and scans for a
// curated antipattern checklist tuned for this WeChat Mini Program project.
//
// Usage:  node harness/code-review.mjs [path...] [--json]
// Exit:   0 clean (no P0/P1) · 1 any P0/P1 finding · (P2/P3 never block)
//
// Pure Node, no dependencies. Cross-platform (Windows-safe).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ----------------------------------------------------------------- args
const argv = process.argv.slice(2);
const json = argv.includes('--json');
const explicitTargets = argv.filter(a => !a.startsWith('--'));

// Candidate application-source roots (first existing ones win when no explicit target).
const SOURCE_DIRS = ['src', 'miniprogram', 'app'];
const SOURCE_EXTS = ['.js', '.ts', '.wxs', '.vue', '.wxml'];
const IGNORE = ['node_modules', '.git', 'dist', 'build', 'unpackage', 'miniprogram_npm', '.understand-anything', '.planning'];

function walk(target, out = []) {
  let stat;
  try { stat = fs.statSync(target); } catch { return out; }
  if (stat.isFile()) {
    if (SOURCE_EXTS.includes(path.extname(target).toLowerCase())) out.push(target);
    return out;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (IGNORE.includes(entry.name)) continue;
    const p = path.join(target, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (SOURCE_EXTS.includes(path.extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

// Resolve the set of files to review.
let targets;
if (explicitTargets.length) {
  targets = explicitTargets.map(t => path.resolve(ROOT, t));
} else {
  targets = SOURCE_DIRS.map(d => path.join(ROOT, d)).filter(d => fs.existsSync(d));
}

const files = [];
for (const t of targets) walk(t, files);
const uniqueFiles = [...new Set(files)];

// ------------------------------------------------ no-op until source lands
if (uniqueFiles.length === 0) {
  if (json) {
    process.stdout.write(JSON.stringify({
      tool: 'code-review',
      skipped: true,
      reason: 'no application source yet',
      filesScanned: 0,
      findings: [],
      pass: true,
    }, null, 2) + '\n');
  } else {
    console.log('no application source yet — code review skipped (pass)');
  }
  process.exit(0);
}

// ------------------------------------------------------------- the checklist
const findings = [];
const add = (severity, file, line, title, fix) =>
  findings.push({ severity, file: path.relative(ROOT, file), line, title, fix });

// Per-line scan. Strips line comments only enough to reduce obvious noise; this is
// a heuristic reviewer, not a parser.
function stripStrings(s) {
  // Blank out string literals so URL/secret/operator checks ignore prose inside
  // unrelated strings where helpful, but keep the rest. We DELIBERATELY keep
  // strings for the http:// and secret checks (they target string literals), so
  // this helper is only used for the == / != operator check.
  return s.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
}

for (const file of uniqueFiles) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);

  // file-level moderation heuristic state
  let writesUserContent = false;
  let hasModeration = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const n = i + 1;
    const codeForOps = stripStrings(raw);

    // P2: console.log left in
    if (/\bconsole\.(log|debug|info)\s*\(/.test(raw)) {
      add('P2', file, n, 'console.* left in source', 'Remove debug logging or route through a logger gated by env.');
    }

    // P2: TODO/FIXME without an issue reference (#123 / ISSUE-123 / a URL)
    const todo = raw.match(/\b(TODO|FIXME|HACK|XXX)\b/);
    if (todo && !/#\d+|[A-Z]+-\d+|https?:\/\//.test(raw)) {
      add('P2', file, n, `${todo[1]} without an issue reference`, `Add a tracking ref (e.g. ${todo[1]}(#123)) or resolve it.`);
    }

    // P2: loose equality (== / !=) — prefer === / !==
    if (/[^=!<>]==[^=]/.test(codeForOps) || /[^!]!=[^=]/.test(codeForOps)) {
      add('P2', file, n, 'loose equality (== or !=)', 'Use strict equality === / !== to avoid coercion bugs.');
    }

    // P1: hardcoded http:// URL — WeChat requires https
    if (/["'`]http:\/\//.test(raw)) {
      add('P1', file, n, 'hardcoded http:// URL', 'WeChat Mini Program requires https:// for all network requests.');
    }

    // P0: eval(
    if (/\beval\s*\(/.test(raw)) {
      add('P0', file, n, 'use of eval()', 'Remove eval(); it is unsafe and banned in Mini Program review.');
    }

    // P0: secret-looking literal (AppSecret / api key assigned a string)
    if (/\b(AppSecret|app[_-]?secret|api[_-]?key|secret[_-]?key|access[_-]?token)\b\s*[:=]\s*["'`][^"'`]{8,}["'`]/i.test(raw)) {
      add('P0', file, n, 'hardcoded secret literal', 'Never commit secrets; load from a server/cloud function or env, not client source.');
    }

    // user-content write path (db add / file upload)
    if (/\.(add|insert|create)\s*\(|uploadFile|wx\.uploadFile|cloud\.uploadFile|\.upload\s*\(/.test(raw)) {
      writesUserContent = true;
    }
    // content-moderation call present anywhere in the file
    if (/msgSecCheck|mediaCheckAsync|security\.(msg|media)/i.test(raw)) {
      hasModeration = true;
    }
  }

  // P1: a file that writes user content but never references content moderation.
  // CRITICAL for this project — WeChat mandates UGC moderation (内容安全).
  if (writesUserContent && !hasModeration) {
    add('P1', file, 1, 'user-content write without content moderation',
      'This file adds/uploads user content but never calls msgSecCheck/mediaCheckAsync. WeChat mandates UGC moderation (内容安全).');
  }
}

// ------------------------------------------------------------------- output
const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.file.localeCompare(b.file) || a.line - b.line);
const blocking = findings.filter(f => f.severity === 'P0' || f.severity === 'P1').length;
const pass = blocking === 0;

if (json) {
  process.stdout.write(JSON.stringify({
    tool: 'code-review',
    skipped: false,
    filesScanned: uniqueFiles.length,
    findings,
    pass,
  }, null, 2) + '\n');
  process.exit(pass ? 0 : 1);
}

console.log('=== Code Review ===');
console.log(`scanned ${uniqueFiles.length} application source file(s)`);
if (!findings.length) {
  console.log('✓ No code-review findings.');
  process.exit(0);
}
for (const f of findings) {
  console.log(`[${f.severity}] ${f.title}`);
  console.log(`    ${f.file}:${f.line}`);
  console.log(`    fix: ${f.fix}`);
}
console.log('');
console.log(blocking ? `✗ ${blocking} blocking (P0/P1) finding(s).` : `${findings.length} non-blocking finding(s).`);
process.exit(pass ? 0 : 1);
