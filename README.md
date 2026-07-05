# 化龙镇中心幼儿园电子资源平台 · Hualong Kindergarten Electronic Resource Platform

> A WeChat Mini Program (微信小程序) + PC backend for a public kindergarten. **This repository is the spec,
> design system, terminology contract, and quality harness** — the foundation that governs the application
> code added later.
>
> 简体中文版见 [README.zh-CN.md](README.zh-CN.md)。

## What it is

The platform gives one trustworthy, mobile-first home for a kindergarten's resources, cases, teaching-research,
party-building, administrative coordination, and home-school-community co-education — with an audit/approval
workflow, structured child evaluation (the five-dimension radar chart, 五维雷达图), and exportable growth books
(成长册). It serves three in-app roles — admin (管理端), teacher (教师端), parent (家长端) — plus a PC backend
(PC后台). The parent client deliberately shows only co-education content.

Read the full spec in **[docs/PRD.md](docs/PRD.md)** (English) / **[docs/PRD.zh-CN.md](docs/PRD.zh-CN.md)** (简体中文).

## Why a "spec & harness" repo first

A wrong stack or a missed compliance rule is expensive to undo, and AI-assisted work drifts without a contract.
So before any feature code, this repo pins down the requirements, the design system, the vocabulary, and an
automated gate that keeps every later change consistent and compliant. See
[docs/adr/0001-repository-as-spec-and-harness-foundation.md](docs/adr/0001-repository-as-spec-and-harness-foundation.md).

## Repository contents

| Path | What |
|---|---|
| [docs/PRD.md](docs/PRD.md) · [docs/PRD.zh-CN.md](docs/PRD.zh-CN.md) | Product requirements (bilingual) |
| [docs/DESIGN.md](docs/DESIGN.md) | Design-system scaffold (fill from the existing design) |
| [docs/glossary.json](docs/glossary.json) · [CONTEXT.md](CONTEXT.md) | Canonical bilingual terminology (machine + human) |
| [docs/GRILLING.md](docs/GRILLING.md) | Plan stress-test and the open questions for the kindergarten |
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

Draft v0.1. The client framework and backend are **proposed, not signed off** — see
[ADR-0003](docs/adr/0003-client-framework.md) and [ADR-0004](docs/adr/0004-backend-cloudbase-vs-alibaba.md).
Open questions for the kindergarten are listed in [docs/GRILLING.md](docs/GRILLING.md).

## License

Unlicensed / internal. Do not redistribute without the kindergarten's permission.
