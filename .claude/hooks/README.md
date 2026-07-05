# Claude Code editor hooks

These hooks run **inside Claude Code** around every `Edit`, `Write`, and `MultiEdit`
tool call. They are wired in [`.claude/settings.json`](../settings.json) and are
distinct from the **git** hooks under [`.githooks/`](../../.githooks/) (which run at
`git commit` time).

| When | Hook | Purpose |
| --- | --- | --- |
| `PreToolUse` | `pre-edit-guard.mjs` | Classify the edit: **deny** locked paths, **ask** the user to confirm governance/source-of-truth edits, **warn** on sensitive infra. |
| `PostToolUse` | `post-edit-check.mjs` | Lint the just-written Markdown against the house-style + glossary harness. |

Both are pure-Node ESM with no dependencies. Each reads a JSON object on **STDIN**
of the shape `{ "tool_name": "Edit|Write|MultiEdit", "tool_input": { "file_path": "<abs path>" } }`.

Both hooks are **defensive**: empty or unparseable STDIN, a missing `file_path`, or any
internal error results in `exit 0`. A hook bug must never break the editing session. The
repo root is resolved from `import.meta.url` (`.claude/hooks` → two levels up), not `cwd`.

## `pre-edit-guard.mjs` — the harness asks, it doesn't silently block

It classifies `file_path` against [`harness/harness.config.json` → `guard`](../../harness/harness.config.json)
and emits a native Claude Code permission decision (JSON on stdout, **exit 0**):

| Class | Behavior | Default paths |
| --- | --- | --- |
| `deny` | `permissionDecision: "deny"` — the edit is refused | `.git/`, `LICENSE`, `*.lock`, `package-lock.json`, `pnpm-lock.yaml` |
| `ask` | `permissionDecision: "ask"` — **the user is prompted to confirm** | `docs/glossary.json`, `harness/structure/app-structure.json`, `harness/harness.config.json`, `.githooks/`, `.github/workflows/`, `.claude/settings.json` |
| `warn` | allowed, note on `stderr` | `harness/`, `package.json`, `.claude/hooks/`, `.gitignore`, `.gitattributes` |
| (other) | allowed silently | everything else |

Tune the three lists in `harness.config.json`. The decision JSON is:

```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": "…" } }
```

When emitting a decision, **stdout carries JSON only** (Claude Code requires valid JSON);
warn notes use `stderr`. There is no env-var override — editing a source-of-truth file
asks the user every time (see AGENTS.md → "Confirmation policy"). Deliberate automation
(e.g. a one-off script) uses the Bash tool, on which editor hooks do not fire.

## `post-edit-check.mjs`

After an edit lands on a Markdown file (`.md` / `.markdown`) inside the repo it runs the
harness against just that file:

```sh
node harness/typewriter.mjs lint <file> --json
node harness/glossary-check.mjs <file> --json
```

If either reports `pass: false`, it prints a concise `file:line → fix` summary to `stderr`
and exits `2` so Claude can fix it. Exit `0` is silent/clean.

## Testing manually

```sh
# ASK (decision=ask) on a source-of-truth file:
echo '{"tool_name":"Edit","tool_input":{"file_path":"docs/glossary.json"}}' | node .claude/hooks/pre-edit-guard.mjs ; echo rc=$?
# DENY on a locked path:
echo '{"tool_name":"Edit","tool_input":{"file_path":".git/config"}}' | node .claude/hooks/pre-edit-guard.mjs ; echo rc=$?
# A normal doc passes silently (rc=0, no JSON):
echo '{"tool_name":"Write","tool_input":{"file_path":"docs/adr/ADR-0001.md"}}' | node .claude/hooks/pre-edit-guard.mjs ; echo rc=$?
# Post-edit lint of a file:
echo '{"tool_name":"Write","tool_input":{"file_path":"docs/research/wechat-miniprogram.md"}}' | node .claude/hooks/post-edit-check.mjs ; echo rc=$?
```
