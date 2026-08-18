# 化龙镇中心幼儿园电子资源平台 · Hualong Kindergarten Electronic Resource Platform

> Two WeChat Mini Programs (微信小程序) + a PC backend for a public kindergarten. **This repository is the
> spec, design system, terminology contract, and quality harness** — the foundation that governs the
> application, which lives in four sibling repositories.
>
> 简体中文版见 [README.zh-CN.md](README.zh-CN.md)。

## What it is

The platform gives one trustworthy, mobile-first home for a kindergarten's resources, cases, teaching-research,
party-building, administrative coordination, and home-school-community co-education — with an audit/approval
workflow, structured child evaluation (the five-dimension radar chart, 五维雷达图), and a per-child growth book
(成长册) read inside the app. It serves three roles — admin (管理端), teacher (教师端), parent (家长端) —
across **two Mini Programs** (teacher and parent) plus a **PC backend** (PC后台). There is no admin Mini
Program this cycle: the admin works through the teacher client and the PC后台. The parent client deliberately
shows only co-education content.

Read the full spec in **[docs/PRD.md](docs/PRD.md)** (English) / **[docs/PRD.zh-CN.md](docs/PRD.zh-CN.md)** (简体中文).

## Why a "spec & harness" repo first

A wrong stack or a missed compliance rule is expensive to undo, and AI-assisted work drifts without a contract.
So before any feature code, this repo pins down the requirements, the design system, the vocabulary, and an
automated gate that keeps every later change consistent and compliant. See
[docs/adr/0001-repository-as-spec-and-harness-foundation.md](docs/adr/0001-repository-as-spec-and-harness-foundation.md).

## Where the code lives

This repository governs but holds no application code. The application lives in four sibling repositories at
the workspace root, all on `github.com/Chao0s`:

| Repo | Holds |
|---|---|
| `../hualong-backend` | The 62-table schema of record, the cross-application decision log, the gap register |
| `../hualong-teacher` | Teacher Mini Program (default branch `master`) |
| `../hualong-parent` | Parent Mini Program |
| `../hualong-admin-pc` | PC console |

**Infrastructure is live:** a Tencent Cloud instance running PostgreSQL 16 with the full 62-table schema
executed and verified, COS object storage for media, and a domain pending its ICP filing
([ADR-0014](docs/adr/0014-cloud-vendor-tencent.md)). **The API layer does not exist yet** and is the current
critical path.

## Repository contents

| Path | What |
|---|---|
| [docs/PRD.md](docs/PRD.md) · [docs/PRD.zh-CN.md](docs/PRD.zh-CN.md) | Product requirements (bilingual) |
| [docs/DESIGN.md](docs/DESIGN.md) | Design-system scaffold (fill from the existing design) |
| [docs/glossary.json](docs/glossary.json) · [CONTEXT.md](CONTEXT.md) | Canonical bilingual terminology (machine + human) |
| [docs/SECURITY.md](docs/SECURITY.md) | Permission matrix, server-enforced invariants, STRIDE threat table |
| [docs/DELIVERY.md](docs/DELIVERY.md) | External dependencies, critical path, per-milestone definition of done |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | Success-metric instrumentation and the personalization contract |
| [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | In-app notification catalogue |
| [docs/DATA-DICTIONARY.md](docs/DATA-DICTIONARY.md) | Pointer to the schema of record, plus roster CSV templates |
| [docs/GRILLING.md](docs/GRILLING.md) | Plan stress-test and the open questions for the kindergarten |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Session handoff — current state, blockers, next actions |
| [docs/research/wechat-miniprogram.md](docs/research/wechat-miniprogram.md) | WeChat Mini Program platform research (accounts, SDKs, compliance) |
| [docs/adr/](docs/adr/) | Architecture decision records |
| `harness/` | The quality gate: glossary checker, typewriter, design/wording judges, code-review |
| `tests/` | Reusable tests (unit, integrity, e2e runbook) |
| `.claude/agents/` | Project review subagents (design/content councils, judges, compliance sentinel) |

## Quick start

```bash
# 1. Install (also points git at the commit gate)
npm install

# 2. Run the full quality gate (glossary + house style + design/wording judges + tests)
npm run gate

# 3. Useful commands
npm run lint:fix                 # normalize doc house style
npm run new -- adr "My Title"    # scaffold a new ADR in house style
npm test                         # run the test suite
```

Requirements: **Node >= 18** and **Python 3** (the judges skip with a warning if Python is missing). Full
command reference and conventions are in [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md). To explore the
codebase visually, run `npm run graph` (or double-click `scripts/launch-knowledge-graph.bat` on Windows) to
open the knowledge-graph dashboard over `.understand-anything/knowledge-graph.json`.

## Quality gate

Every change must pass `npm run gate` before a commit is approved (enforced by `.githooks/pre-commit` and CI):

1. **Glossary check** — terminology matches [docs/glossary.json](docs/glossary.json).
2. **Typewriter lint** — bilingual house style (full-width 中文 punctuation, headings, no tabs).
3. **Design judge** — huashu 5-dimension critique of design artifacts.
4. **Wording judge** — clarity, bilingual parity, terminology, tone.
5. **Tests** — `node --test tests/`.

## Compliance (must-haves)

This is a public-kindergarten product handling children's data, so these gate launch and are not optional:
content moderation (内容安全) on all user content, 小程序备案 (ICP filing), 微信认证 (subject verification),
education 类目/资质, and minors'-data protection (guardian consent, minimization, retention). Details in
[docs/research/wechat-miniprogram.md](docs/research/wechat-miniprogram.md) and
[docs/adr/0005-mandatory-content-moderation.md](docs/adr/0005-mandatory-content-moderation.md).

## Status

PRD v0.3 (2026-08-19). The stack is settled: [ADR-0003](docs/adr/0003-client-framework.md) (native Mini
Program plus a dedicated PC web admin) is Accepted, and [ADR-0014](docs/adr/0014-cloud-vendor-tencent.md)
(Tencent Cloud) supersedes ADR-0004 on vendor and media storage. The legal subject is confirmed and the ICP
filing is in progress.

Outstanding: the API contract does not exist, no application code has been written, and 0 of 12 growth-book
layout packs have artwork. The fixed 2026-09-01 launch is not achievable; the 体验版 pilot is now the primary
deliverable for that date. Current state and next actions are in [docs/HANDOFF.md](docs/HANDOFF.md); open
questions in [docs/GRILLING.md](docs/GRILLING.md).

## License

Unlicensed / internal. Do not redistribute without the kindergarten's permission.
