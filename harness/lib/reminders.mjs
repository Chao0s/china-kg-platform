// reminders.mjs — Pure decision logic for the gate's guidance reminders.
//
// Extracted from gate.mjs so the "does the guidance fire in the right situation?"
// behavior is unit-testable without git mutation. Given the repo root, the list of
// files staged in the pending commit, and the harness config, it returns one entry
// per reminder describing whether it fires, at what level, and the message.
//
//   handoff       — a commit should update the tracked HANDOFF.md (run /handoff)
//   understandMap — rebuild .understand-anything via /understand-anything:understand
//
// Pure except for fs.existsSync against rootDir (so tests point rootDir at a temp dir).

import fs from 'node:fs';
import path from 'node:path';

const norm = s => String(s).replace(/\\/g, '/');

// True if `target` (a root-relative path such as "docs/HANDOFF.md") appears in
// `staged`.
//
// Callers should pass root-relative staged paths — gate.mjs and parity-check.mjs
// use `git diff --cached --name-only --relative` to guarantee that. But when this
// repo is nested inside a larger workspace and a caller omits --relative, git
// reports top-level-relative paths instead ("Hualong Platform/docs/HANDOFF.md"),
// and an exact match silently misses every time.
//
// So one extra form is accepted: the target prefixed by the root directory's own
// name. That is precise. A bare suffix match would be wrong — "other/HANDOFF.md"
// and "Hualong Platform/HANDOFF.md" are indistinguishable by suffix, and treating
// a different project's file as ours reintroduces the silent miss this exists to
// prevent, just in the other direction.
export function stagedIncludes(staged, target, rootDir) {
  const t = norm(target);
  if (staged.some(f => f === t)) return true;
  if (!rootDir) return false;
  const base = norm(rootDir).replace(/\/+$/, '').split('/').pop();
  if (!base) return false;
  return staged.includes(base + '/' + t);
}

// True if the path exists and (for a directory) contains at least one entry.
function nonEmpty(p) {
  try {
    const st = fs.statSync(p);
    if (st.isFile()) return true;
    return fs.readdirSync(p).length > 0;
  } catch { return false; }
}

export function computeReminders({ rootDir, stagedFiles = [], config = {} }) {
  const level = (name, dflt) => (config.checks && config.checks[name] && config.checks[name].level) || dflt;
  const staged = stagedFiles.map(norm);
  const committing = staged.length > 0;
  const out = [];

  // ---- handoff ----
  const hLevel = level('handoff', 'warn');
  if (hLevel !== 'off') {
    const handoffFile = norm((config.handoff && config.handoff.file) || 'HANDOFF.md');
    const exists = fs.existsSync(path.join(rootDir, handoffFile));
    const handoffStaged = stagedIncludes(staged, handoffFile, rootDir);
    if (!exists) {
      out.push({ name: 'handoff', fire: true, level: hLevel, msg: `${handoffFile} is missing. Run /handoff and capture it into ${handoffFile} (tracked, not gitignored).` });
    } else if (committing && !handoffStaged) {
      out.push({ name: 'handoff', fire: true, level: hLevel, msg: `This commit does not update ${handoffFile}. Run /handoff and refresh it so the next session can continue.` });
    } else {
      out.push({ name: 'handoff', fire: false, level: hLevel });
    }
  }

  // ---- understand-anything map ----
  const mLevel = level('understandMap', 'warn');
  if (mLevel !== 'off') {
    const mapFile = norm((config.understandMap && config.understandMap.file) || '.understand-anything/knowledge-graph.json');
    const exists = fs.existsSync(path.join(rootDir, mapFile));
    out.push(exists
      ? { name: 'understandMap', fire: false, level: mLevel }
      : { name: 'understandMap', fire: true, level: mLevel, msg: `${mapFile} is missing. Run /understand-anything:understand to (re)build the codebase map so the structure judge can compare the live code against docs/APP-STRUCTURE.md.` });
  }

  // ---- temp cleanup ----
  const tLevel = level('tempCleanup', 'warn');
  if (tLevel !== 'off') {
    const paths = (config.tempCleanup && config.tempCleanup.paths) || ['tests/.tmp', 'harness/.report'];
    const present = paths.filter(p => nonEmpty(path.join(rootDir, p)));
    out.push(present.length
      ? { name: 'tempCleanup', fire: true, level: tLevel, msg: `Temp clutter detected (${present.join(', ')}). Launch the temp-janitor subagent to review and clean (it confirms before deleting), or run \`npm run clean:temp -- --apply\`.` }
      : { name: 'tempCleanup', fire: false, level: tLevel });
  }

  return out;
}
