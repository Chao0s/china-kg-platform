# AGENTS.md — Contributor & agent guide

This file is the tool-agnostic contract for anyone (human or AI) working in this repository. It is the
**canonical source of truth**: CLAUDE.md imports it via the native `@AGENTS.md` directive and **defers to this
file** wherever they overlap. Other LLM tools should read this file first.

## What this repository is
The spec, design system, terminology contract, and quality harness for 化龙镇中心幼儿园电子资源平台
(Hualong Kindergarten Electronic Resource Platform) — **two** WeChat Mini Programs (教师端 and 家长端) plus a
PC backend. This repository governs; it holds no application code. See [docs/PRD.md](docs/PRD.md) and
[docs/adr/0001-repository-as-spec-and-harness-foundation.md](docs/adr/0001-repository-as-spec-and-harness-foundation.md).

**The application lives in four sibling repositories**, beside this one at the workspace root. See
"Working across the sibling repos" below. As of 2026-08-19 none of them contains application code either:
the backend repo is a schema and decision log, and the three client repos are static HTML prototypes.

**The infrastructure is live.** A Tencent Cloud instance runs PostgreSQL 16 with the full 62-table schema
executed and verified, plus COS object storage for media; the domain is filed and pending
([ADR-0014](docs/adr/0014-cloud-vendor-tencent.md)). **There is still no API layer** — no OpenAPI document and
no endpoint contract anywhere. Designing it is the current critical path.

## Golden rules
1. **The glossary is law.** Use canonical terms from [docs/glossary.json](docs/glossary.json) / [CONTEXT.md](CONTEXT.md). Forbidden variants are a blocking error. To discuss a forbidden term, wrap it in `inline code`.
2. **Docs are bilingual.** English and 简体中文 must stay in sync. The English PRD/README and the Chinese twin are one unit; update both.
3. **No guessing.** If a fact is unknown, record it as an open question in [docs/GRILLING.md](docs/GRILLING.md); never invent platform behavior, costs, or compliance details.
4. **Compliance is non-negotiable.** Content moderation (内容安全), 小程序备案, 微信认证, and minors'-data rules gate launch. See [docs/adr/0005-mandatory-content-moderation.md](docs/adr/0005-mandatory-content-moderation.md).
5. **The gate must pass before a commit is approved.** Run `npm run gate` locally; CI repeats it.
6. **Decisions become ADRs.** Hard-to-reverse, surprising trade-offs go in [docs/adr/](docs/adr/).
7. **Follow the agreed app structure.** [docs/APP-STRUCTURE.md](docs/APP-STRUCTURE.md) (1:1 with the source flowcharts) + [harness/structure/app-structure.json](harness/structure/app-structure.json) are the structural truth. The structure judge blocks code that drifts. Admin reaches the PC backend / CMS; teachers and parents do not.
8. **EN ↔ 简中 move together.** A commit that changes one half of a bilingual pair (PRD, README) without the other is blocked by the parity check.
9. **Hand off every session.** Run `/handoff` and capture it into the tracked [docs/HANDOFF.md](docs/HANDOFF.md); the gate reminds you when a commit does not update it.
10. **Refresh the codebase map.** Run `/understand-anything:understand` to rebuild `.understand-anything/knowledge-graph.json`; the structure judge and reviewers compare the live code against the agreed structure through it.

## The harness
| Command | What it does |
|---|---|
| `npm run gate` | Full quality gate: glossary + house style + structure + parity + design/wording judges + tests, plus handoff & map reminders. Blocks bad commits. |
| `npm run gate:fast` | Style + glossary + structure + parity only (quick local loop). |
| `npm run glossary` | Terminology check against the glossary. |
| `npm run lint` / `npm run lint:fix` | House-style (typewriter) lint / auto-fix. |
| `npm run new -- <type> "<title>"` | Scaffold a doc (types: `adr`, `prd-section`, `design-section`, `research`, `readme-section`). |
| `npm run judge:design` / `npm run judge:wording` | Scored design / wording critique of `docs/`. |
| `npm run judge:structure` | App-structure conformance vs `docs/APP-STRUCTURE.md` (no-op pass until app code exists). |
| `npm run parity` | EN ↔ 简中 doc-pair parity (PRD **and** README) (+ staged co-update during commits). |
| `npm run clean:temp` | List scratch/temp clutter (dry run); add `-- --apply` to delete. |
| `npm run graph` | Open the interactive knowledge-graph dashboard (also `scripts/launch-knowledge-graph.bat` / `.sh`). |
| `npm test` | `node --test tests/` — harness unit + integration (the full "harness line" test) + e2e proxy. |
| `npm run hooks:install` | Point git at `.githooks` (pre-commit gate + commit-msg). |

Check levels (off / warn / block) are configured in [harness/harness.config.json](harness/harness.config.json). By
default structure and parity **block**; handoff and understand-map are **warn** (reminders) — harden them to
`block` there if you want them enforced.

Requirements: Node >= 18 and Python 3 (judges degrade gracefully with a warning if Python is absent).

## Hooks (two layers)
- **Editor hooks** (`.claude/hooks/`, wired in `.claude/settings.json`): a pre-edit guard classifies each edit against `harness.config.json → guard` and a post-edit check lints Markdown you write and surfaces fixes immediately.
- **Git hooks** (`.githooks/`): `pre-commit` runs the gate; `commit-msg` enforces Conventional Commits (`feat|fix|docs|design|harness|test|chore|refactor|ci|build|perf`). Install with `npm run hooks:install`.

## Confirmation policy (the harness ASKS, it doesn't silently block)
Any harness action that needs user confirmation is surfaced as a question, never a silent override:
- **Editor guard** (`harness.config.json → guard`): `ask` paths (the glossary, `app-structure.json`, `harness.config.json`, `.githooks/`, `.github/workflows/`, `.claude/settings.json`) trigger a **native Claude Code confirmation prompt** (`permissionDecision: "ask"`); `deny` paths (`.git/`, `LICENSE`, lockfiles) are refused; `warn` paths are allowed with a note. Tune the lists in `harness.config.json`.
- **Agent-initiated harness actions** must use the **AskUserQuestion** tool to confirm before proceeding — deleting scratch (the `temp-janitor` subagent does this), editing the glossary/source-of-truth via a script, bypassing the gate (`--no-verify`), or regenerating the codebase map. Do not bypass a gate or guard without asking.

## Review subagents (Claude Code)
Project-specific reviewers live in `.claude/agents/`:
- `design-council` / `content-council` — multi-perspective critique of design / content, backed by the judges.
- `design-judge` / `wording-judge` — fast single scored verdicts.
- `structure-judge` — app-structure conformance vs [docs/APP-STRUCTURE.md](docs/APP-STRUCTURE.md).
- `compliance-sentinel` — P0-P3 compliance audit.
- `temp-janitor` — reviews and cleans scratch/temp clutter; lists first and asks you to confirm before deleting.

## Gate reminders & the codebase map / 闸门提醒与代码地图
Every `npm run gate` ends with a **Summary**; non-blocking reminders appear there with a `!` and the word
`reminder`. Three guidance reminders exist (configurable in `harness.config.json`):
- **handoff** — fires when a commit does not update [docs/HANDOFF.md](docs/HANDOFF.md). Run `/handoff`, capture it there.
- **understandMap** — fires when **`.understand-anything/knowledge-graph.json` is missing**. That file is the
  codebase map; it does not exist until you run `/understand-anything:understand`. Once generated it is the
  one map file we **track** (everything else under `.understand-anything/` is ignored), and the structure
  judge uses it to compare the live code against the agreed structure.
- **tempCleanup** — fires when scratch/temp paths are non-empty; prompts you to launch the `temp-janitor`
  subagent (it confirms before deleting) or run `npm run clean:temp -- --apply`.

## External references / 外部参考
Pull live, version-current docs through **context7** (`mcp__…Context7__query-docs`) rather than scraping. Verified library IDs that mirror the official WeChat docs:
- `/websites/developers_weixin_qq_miniprogram_dev_framework` — framework (the dev/framework site).
- `/websites/developers_weixin_qq_miniprogram_dev_component` — components.
- `/websites/developers_weixin_qq_miniprogram_dev_api` — APIs.
- `/wechat-miniprogram/api-typings` — TypeScript typings.
Development plan and the study answer: [docs/research/wechat-dev-plan.md](docs/research/wechat-dev-plan.md).

## Working across the sibling repos / 跨仓库协作

The application lives in four repositories beside this one, all on `github.com/Chao0s`. A second developer,
**Lin / linem7**, commits to all four in large batches — **pull before you work**.

| Repo | Holds | Note |
| --- | --- | --- |
| `../hualong-backend` | The 62-table schema of record, the cross-application decision log `DECISIONS.md`, the gap register `db/GAPS.md`, and its own gate harness | No service code |
| `../hualong-teacher` | Teacher Mini Program and its backend specs | Default branch is **`master`**, not `main` |
| `../hualong-parent` | Parent Mini Program and its backend specs | |
| `../hualong-admin-pc` | PC console and its nine backend specs | |

Three rules that are easy to get wrong:

1. **`hualong-backend/db/01_schema.sql` is the sole field-level authority.** This repo deliberately does not
   duplicate it; [docs/DATA-DICTIONARY.md](docs/DATA-DICTIONARY.md) is only a pointer.
2. **The `ui=` to `data-ui` binding contract is the cross-repo naming authority.** A spec declares
   `ui=<token>`; the matching write control carries `data-ui="<token>"`. Never invent a token on the markup
   side — add the annotation to the spec first.
3. **Bindings genuinely cross repos in both directions.** A token declared in the teacher specs may be used
   by parent markup and vice versa, so a validator run against one repo alone reports false results in both
   directions. Check the pair before believing an "unbound token" finding.

## Commit conventions
Conventional Commits, present-tense subject. Examples: `docs: add resource-library acceptance criteria`,
`design: define color tokens in DESIGN.md`, `harness: tighten CJK punctuation rule`. Keep the gate green; do
not bypass with `--no-verify` unless you have a specific, stated reason.

## Repository map
```
docs/            PRD (EN + 简中), SECURITY.md, DELIVERY.md, ANALYTICS.md, NOTIFICATIONS.md, DATA-DICTIONARY.md,
                 DESIGN.md, APP-STRUCTURE.md, GRILLING.md, HANDOFF.md, glossary.json, templates/, research/, adr/, index.html (Pages)
harness/         gate.mjs, glossary-check.mjs, typewriter.mjs, parity-check.mjs, code-review.mjs,
                 harness.config.json, judges/ (design, wording, structure), structure/ (app-structure.json, route-map.json), lib/
tests/           unit/ (harness, judges, glossary data), e2e/ (chrome-devtools spec + static proxy)
.claude/         agents/ (review subagents), hooks/ (editor hooks), settings.json
.githooks/       pre-commit (gate), commit-msg (conventional commits)
.github/         workflows/ci.yml (gate), workflows/pages.yml (Pages deploy), PR template
CONTEXT.md       domain glossary (human mirror of glossary.json)
docs/HANDOFF.md  tracked session handoff (refreshed via /handoff)
CLAUDE.md        Claude Code layer; imports this file via @AGENTS.md
```
