@AGENTS.md

# CLAUDE.md — Claude Code working agreement

The line above natively imports AGENTS.md into context at session start (Claude Code `@` import). **AGENTS.md is
the canonical source of truth and supersedes this file** wherever they overlap; CLAUDE.md only adds the
Claude-Code-specific layer below.

## Project in one line
The spec + design + quality harness for 化龙镇中心幼儿园电子资源平台, a WeChat Mini Program (微信小程序) +
PC backend for a public kindergarten. This repo governs the app code that comes later.

## How to work here
- **Start from the spec.** [docs/PRD.md](docs/PRD.md) is the contract; [docs/GRILLING.md](docs/GRILLING.md) holds open questions. Do not resolve an open question by guessing — ask, or record it.
- **Respect the harness.** Editor hooks lint Markdown you write and may block on terminology or house-style violations. This is expected. Fix the finding or, to discuss a forbidden term deliberately, wrap it in `inline code`.
- **The harness asks; it doesn't silently block.** Editing a governance / source-of-truth file (the glossary, `app-structure.json`, `harness.config.json`, `.githooks/`, `.github/workflows/`, `.claude/settings.json`) triggers a **confirmation prompt** (`guard.ask`). For any harness action YOU initiate that needs confirmation — deleting scratch, editing the glossary via a script, bypassing the gate, regenerating the map — use the **AskUserQuestion** tool first. Never bypass a gate/guard without asking. See AGENTS.md → "Confirmation policy".
- **Terminology is enforced.** Use canonical terms from [docs/glossary.json](docs/glossary.json). Changing a term means editing the glossary (the source of truth); that edit is an `ask` path, so you will be prompted to confirm.
- **Bilingual parity.** Update the English and 简体中文 twins together (PRD.md / PRD.zh-CN.md, README.md / README.zh-CN.md).
- **Run the gate before claiming done.** `npm run gate`. If Python is unavailable, the design/wording judges skip with a warning; install Python 3 to run them.

## Use the project subagents
Delegate review to the project reviewers in `.claude/agents/` rather than reviewing inline:
- `design-council` / `design-judge` — for any UI, `docs/DESIGN.md`, or `docs/index.html`.
- `content-council` / `wording-judge` — for any document, notice, or user-facing copy.
- `structure-judge` — for app-structure conformance vs `docs/APP-STRUCTURE.md`.
- `compliance-sentinel` — before any release decision or compliance-touching change.
- `temp-janitor` — when the gate's tempCleanup reminder fires; it lists scratch files and confirms before deleting.

The codebase map lives at `.understand-anything/knowledge-graph.json` (the one tracked file under
`.understand-anything/`). It does not exist until you run `/understand-anything:understand`; until then the
gate's `understandMap` reminder will keep nudging you. The gate prints all reminders in its closing Summary.

## Scaffold with the typewriter
Generate house-style docs instead of writing from a blank page:
`npm run new -- adr "Title"`, `npm run new -- prd-section "Title"`, `npm run new -- research "Title"`.
Then run `npm run lint:fix` to normalize, and `npm run gate`.

## Non-negotiables (will fail review or launch)
1. Content moderation (内容安全): all user content passes `security.msgSecCheck` / `security.mediaCheckAsync` before it is visible. See [docs/adr/0005-mandatory-content-moderation.md](docs/adr/0005-mandatory-content-moderation.md).
2. Minors' data: explicit guardian consent, privacy popup, data minimization, strict access, defined retention.
3. Launch gates: ICP filing (小程序备案), WeChat verification (微信认证), and education category/qualification (类目/资质).
4. The parent client shows only home-school-community co-education content.

## When adding application code (later)
- Confirm the stack first ([ADR-0003](docs/adr/0003-client-framework.md) framework, [ADR-0004](docs/adr/0004-backend-cloudbase-vs-alibaba.md) backend) — both are proposed, not signed off.
- `harness/code-review.mjs` activates automatically once `src/` or `miniprogram/` exists and flags user-content writes that lack a moderation call.
- Keep secrets out of the client and the repo; HTTPS-only; respect Mini Program package-size limits.

## Style
- No emoji in documentation prose. Plain language a tired guardian can read. Short sentences.
- Chinese-dominant lines use full-width punctuation （，。！？：；）. English sentences with embedded 中文 terms keep English punctuation.
- Conventional Commits; keep the gate green; do not use `--no-verify` without a stated reason.
