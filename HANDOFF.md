# HANDOFF.md — Session handoff (tracked, not gitignored)

> Living handoff for the next session/agent. Run the `/handoff` skill, then capture its output here and
> commit it. The gate reminds you when a commit does not update this file. Do not put secrets here.
>
> 交接文档（纳入版本管理）。运行 `/handoff` 后将结果写入此处并提交；闸门会在提交未更新本文件时提醒。请勿写入密钥。

## Latest / 最新
- Personalization & habit-analytics captured (grill-with-docs, 2026-06-21): adults-only (teachers / parents) habit signals → `兴趣画像` → `个性化推荐`. Decisions: v1 = consented, `child_id`-free signal foundation + explicit 收藏/follow (no LLM, no per-user 投放, no 算法备案 at launch); LLM/RAG profiling = v1.x; teachers first, parents = separate v2; consent default-ON + notice + OFF (PIPL 自动化决策 opt-out); teacher 为你推荐 shelf + re-ranked 资源库/案例库 + de-identified admin aggregate; domestic LLM (通义千问/Alibaba) under DPA; 24mo rolling retention (RISK: weaker minimization). Hard invariant: personalization events carry no `child_id`, outputs never infer about a child. Captured in [docs/PERSONALIZATION.md](docs/PERSONALIZATION.md), [ADR-0011](docs/adr/0011-personalization-and-habit-analytics.md), [GRILLING.md](docs/GRILLING.md) §I, PRD §4/§16 (EN+简中), glossary (个性化推荐/兴趣画像/自动化决策/算法备案). OPEN (legal/园方): 算法备案 applicability for an internal staff tool; DPA terms; 24mo justification; parent profiling (v2). Gate green (7/7).
- Repo pushed to GitHub (private): `github.com/herman925/china-kg-platform`.
- understand-anything knowledge-graph demo published on here.now (permanent, **password-protected** — password held by the owner, not stored here): `https://vivid-ripple-et63.here.now/`. Now **code-enabled**: `scripts/build-kg-demo.mjs` patches the dashboard so demo mode reads a bundled per-file source snapshot (no localhost) — all 76 files browsable + readable, 简体中文 graph/tour. The demo **chrome** is fully localized to 简体中文 via the same restore-after-build patch table in `scripts/build-kg-demo.mjs` (10 components; display-only — graph data is untouched, so the English-keyed color/filter logic still works). Covered: overview layer bubbles (层/中等/文件/点击浏览/差异 关), drill-in node-card type+complexity badges, portal `连接`, the Path Finder modal (title, 起始/目标节点, 选择节点…, 查找路径, 关闭, and the per-option node-type tags 文件/函数/文档/…), the Learn panel headings, and the filter / node-type-filter / file-explorer hover tooltips. Each patch carries an exactly-one-match (or `{ all: true }`) guard so substring collisions abort the build instead of silently patching the wrong site. Render-verified end-to-end in a real browser by clicking through overview → drill-in → Path Finder. Only third-party React Flow built-ins remain English (Zoom/Fit/Toggle/Mini Map/attribution + cluster-container aria-labels). here.now API key is in `~/.herenow/credentials` (NOT in the repo). **Re-publish (run yourself — the agent is blocked from exfiltrating the full private source):** `node scripts/build-kg-demo.mjs` then `! bash <here-now skill>/scripts/publish.sh <dist> --slug vivid-ripple-et63 --client claude-code`.
- One-pass flow-vs-structure audit: mirror byte-for-byte faithful; 3 contract P1s fixed (GardenProgress added, Radar→admin/teacher, AuditManage/TaskManage sourceNodeId).
- PRD build-readiness: added 7 referenced appendix specs under docs/ (RBAC.md, DATA-DICTIONARY.md + templates/, MEASUREMENT.md, NOTIFICATIONS.md, DEFINITION-OF-DONE.md, THREAT-MODEL.md, DEPENDENCIES.md) + PRD §16 pointer (EN+简中). Round-5 decisions: child-exit=retain+revoke+purge-on-request; roster=CSV/Excel templates (= relational schema); teacher cross-class scope OPEN (default own-class child-data + school-wide libraries); metrics: active=action/7d, 24h audit=tracked target.
- PRD rewritten to v0.2 (EN + 简中, parity 31/31 headings) encoding all grilling decisions + best-practice upgrades: EARS AC on critical seams, quantified success-metric targets, a compliance-traceability table, and the M0–M4 build sequence for the 2026-09-01 push.
- Harness confirmation policy: the editor guard now **asks** (native `permissionDecision: "ask"`) on governance/source-of-truth edits instead of env-gated hard blocks; `harness.config.json → guard` (deny/ask/warn) is the source. Agents use AskUserQuestion for self-initiated harness confirmations. See AGENTS.md → "Confirmation policy".

## Current state / 当前状态
- This repository is the spec + design + quality-harness foundation for 化龙镇中心幼儿园电子资源平台 (WeChat Mini Program + PC backend). No application code yet.
- Delivered: bilingual PRD, DESIGN scaffold, CONTEXT glossary, ADRs 0001–0006, WeChat research, the harness (glossary, typewriter, design/wording/structure judges, parity, gate, code-review), editor + git hooks, review subagents, reusable tests, GitHub-Pages site + CI, and `docs/APP-STRUCTURE.md` (1:1 flow mirror + structural contract).
- Structural conformance: `docs/APP-STRUCTURE.md` + `harness/structure/app-structure.json` are the truth; `harness/judges/structure_judge.py` enforces them (no-op pass until app code exists).
- End-to-end harness test: `tests/integration/harness-line.test.mjs` (41 cases) verifies every judge, blocker, hook, and reminder fires (and stays silent) in the right situation.
- Temp cleanup: `harness/clean-temp.mjs` + `temp-janitor` subagent (confirms before deleting) + a gate `tempCleanup` reminder (scoped to tests/.tmp + harness/.report).
- Knowledge graph GENERATED: `.understand-anything/knowledge-graph.json` (108 nodes, 125 edges, 6 layers, 13-step tour) is committed/tracked. View it with `npm run graph` (or `scripts/launch-knowledge-graph.bat` / `.sh`), which resolves deps + opens the Vite dashboard. Regenerate via `/understand-anything:understand` (needs pnpm + the plugin; pnpm is now installed).
- Dashboard launcher hardened: picks the LATEST cached plugin version (was alphabetically picking unbuilt 2.7.5 -> "Failed to resolve import @understand-anything/core/schema"); statically verifies core imports resolve and builds core before launch. Shared resolver `scripts/lib-resolve-core.mjs`. Automated guard `tests/e2e/dashboard-smoke.mjs` (in the gate) + the chrome-devtools runbook §0b cover dashboard rendering. Verified live in a real browser: renders heading/layers/tour, no import error.

## Decisions locked (grilling 2026-06-18) / 已定决策
- Client = **Native Mini Program** + dedicated PC web admin (Element Plus/Ant Design Pro). ADR-0003.
- Backend = **Alibaba Cloud** (RDS + OSS + VOD + API; files in OSS, not the DB). ADR-0004.
- Render = Skyline-where-it-helps / WebView default; animation minimal (no Lottie v1; GSAP/Framer Motion are MP-incompatible → web admin only). ADR-0007.
- Launch = **2026-09-01 hard date**; 体验版 pilot fallback; compliance starts day 1. ADR-0008.
- Scale = single large 园 (single-tenant, tenant boundary kept). Identity = one account, role-switch. Child↔class = one class. Moderation = pending + manual re-review queue.
- Full decision log: `docs/GRILLING.md`.

## Open (humans: 园方 / legal) / 待人确认
- Legal 主体 (法人) — ADR-0010 (compliance blocker). Minors' data retention period — ADR-0009. Onboarding flow (spec both). 类目/资质. 长期订阅消息. PC operators. Metric targets. Media budget.

## Next actions / 下一步
1. Sign off the framework + backend (ADR-0003 / ADR-0004).
2. Resolve the `docs/GRILLING.md` open questions with the kindergarten.
3. Scaffold the app; populate `harness/structure/route-map.json` as pages are created.
4. Start compliance gates early: 小程序备案, 微信认证, 类目/资质 (see `docs/research/`).

## Suggested skills / 建议技能
- `/understand-anything:understand` — rebuild the codebase map once app code exists (the structure judge consumes it).
- `/handoff` — refresh this file at the end of each working session.
- `/grill-with-docs` — continue resolving the open questions.

## Pointers / 索引
- Spec: `docs/PRD.md` / `docs/PRD.zh-CN.md` · Structure: `docs/APP-STRUCTURE.md` · Decisions: `docs/adr/` · Glossary: `docs/glossary.json` · Research: `docs/research/`.
