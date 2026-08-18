# GRILLING.md — Decision log & open questions / 决策记录与开放问题

> Produced with the `grill-with-docs` discipline and a research-backed PRD interview (2026-06-18). This is the
> **audit trail** of the major decisions. RESOLVED items feed the PRD and ADRs; OPEN items need a human
> (the kindergarten director / 园方 / legal) and are never guessed.
>
> 本文件记录重大决策的来龙去脉。已决项进入 PRD 与 ADR；开放项需园方/法务确认，不臆测。

## Legend / 图例
- **[DECIDED]** — settled in the grilling; see linked ADR / PRD section.
- **[OPEN]** — needs the kindergarten director / 园方 / legal.
- **[RESOLVED]** — was open, now closed; the resolution and its date are recorded inline.
- **[RISK]** — a known risk carried forward.

> **Revised 2026-08-19.** Several long-standing OPEN items closed between 2026-08-11 and 2026-08-19, and one
> DECIDED item was superseded. Each is marked inline rather than deleted, so the audit trail survives.

---

## A. Product framing / 产品定位
- **[DECIDED] v1 north-star** — the teacher core: 资源库 + 案例库 with the submit → audit → publish lifecycle, plus the 五维雷达图 evaluation. Matches the source's stated "1.0 重点".
- **[DECIDED] v1 scope** — all 8 modules in v1 at full depth (director's mandate, not tiered). Build is sequenced by dependency + compliance; see the timeline risk.
- **[DECIDED] Primary users** — teachers first, then parents, then admin; the parent client stays minimal.

## B. Platform & stack / 平台与技术栈
- **[DECIDED] Client = Native Mini Program** (WXML/WXSS/JS), not a cross-platform framework. → [ADR-0003](adr/0003-client-framework.md).
- **[DECIDED] PC backend = dedicated web admin** (Element Plus / Ant Design Pro), a desktop-ergonomic CMS, decoupled from the Mini Program. → [ADR-0003](adr/0003-client-framework.md).
- **[DECIDED] Render engine = Skyline where it helps, WebView as the default** (compatibility-first; opt into Skyline + worklet for smooth screens). → [ADR-0007](adr/0007-render-engine-and-animation.md).
- **[DECIDED] Animation = tasteful, minimal** — WXSS + `this.animate` + Skyline worklet where needed; no Lottie in v1. Web DOM animation libraries (GSAP, Framer Motion, etc.) are **incompatible with the Mini Program runtime** (no DOM) and are restricted to the PC web admin. → [ADR-0007](adr/0007-render-engine-and-animation.md).
- **[RESOLVED 2026-08-19] Backend = Tencent Cloud**, superseding the Alibaba choice. The *shape* of ADR-0004 stands — relational source of truth, object storage for all files, managed media processing, a REST API behind a filed HTTPS domain — but the products are Tencent's: a Lighthouse instance, self-hosted PostgreSQL 16, COS, CI/VOD, DNSPod. The database is live and verified. → [ADR-0014](adr/0014-cloud-vendor-tencent.md) supersedes [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md) on vendor and media storage.
- **[DECIDED] Files live in object storage, never in the database** — the DB holds metadata + URLs only.
- **[DECIDED] Content moderation = WeChat `security.*` (mandatory)**, optionally plus a second commercial layer. → [ADR-0005](adr/0005-mandatory-content-moderation.md).
- **[OPEN] Admin publish path and moderation** — the growth-book school-settings publish states 不调微信 API and treats the admin's own preview as the review pass, while admin-uploaded photos render into every child's book school-wide. The ADR-0005 UGC definition is enumerative and broad, and its bypass metric is 0（硬性）。Needs a decision on the record.

## C. Media pipeline / 媒体管线
- **[DECIDED] Images** — light on-device compression via the native `wx.compressImage` (cheap, safe on low-end phones); not lossless.
- **[DECIDED] Video** — minimal/optional client compression; the heavy work is server-side managed transcoding (VOD → H.264/HLS). The UI caps selection (duration/resolution).
- **[DECIDED] Uploads designed for weak China networks** — resumable and chunked (COS multipart), retries, progress UI, optional Wi-Fi-only, and a pending → uploaded → moderated → published status so a dropped connection never loses work. A lifecycle rule deletes incomplete fragments after 7 days so abandoned uploads do not accumulate silently.
- **[DECIDED 2026-08-19] Media never transits the instance** — clients upload to and download from COS directly using short-lived pre-signed credentials. The instance uplink is 5 Mbps, about 0.6 MB/s, which routing media through it would saturate immediately. → [ADR-0014](adr/0014-cloud-vendor-tencent.md).

## D. Scale, timeline, team / 规模·时间·团队
- **[DECIDED] Scale** — single kindergarten, large (20+ classes); single-tenant model, but keep a tenant boundary so a future central + branch (多园) setup stays possible. Plan pagination/perf + bulk ops.
- **[DECIDED] Launch = 2026-09-01 (hard, fixed)** — not the team's call. We plan to hit it. → [ADR-0008](adr/0008-launch-timeline-and-pilot.md).
- **[RISK, now materialised] Compliance lead time is external and not fully controllable** — 备案 (1–20 working days) plus WeChat 审核, and it could not start until the 主体 was confirmed. The 主体 stayed open until 2026-08-11, so the chain started late. As of 2026-08-19, with 13 days to the fixed date and zero application code written, the public launch is **not achievable**; the **体验版 pilot has become the primary deliverable** for 2026-09-01 rather than the fallback it was designed as. → [ADR-0008](adr/0008-launch-timeline-and-pilot.md).
- **[OPEN, highest engineering priority] The API contract does not exist.** No OpenAPI, no endpoint table, no verb, path, payload or status-code convention anywhere across the four repos. What exists is a field-level binding contract of 832 bindings over 719 columns, which says which column an input writes to and nothing about the wire. Gap G40: 绑定契约只覆盖字段，不覆盖动作 —— 313 个按钮零覆盖。Nothing client-side can start until this is designed.
- **[DECIDED] Team** — the product owner + this assistant + 1–2 developers using Claude Code / Codex, governed by this repo's harness; parallel workstreams.

## E. Identity & data model / 身份与数据模型
- **[DECIDED] One WeChat account, role-switch** — a person who is both a teacher and a parent uses one `openid` holding both roles.
- **[DECIDED] Child ↔ class = exactly one class** per child in v1 (teachers may still multi-select children when publishing); no interest/mixed-age groups in v1.
- **[OPEN] Departed-teacher content ownership** — recommend content stays (kindergarten-owned), authorship retained, login revoked; confirm with 园方.

## F. Compliance & onboarding / 合规与开通
- **[RESOLVED 2026-08-11] Legal subject (主体)** — Path A. The kindergarten is the subject in its own right, 广州市番禺区化龙镇中心幼儿园 as a 事业单位. The ICP filing was opened against that subject the same day. → [ADR-0010](adr/0010-legal-subject.md), now Accepted.
- **[IN PROGRESS] ICP filing** — opened 2026-08-11, at step 4 of 5 awaiting 工信部短信核验, then 管局审核 at 1–20 working days. The domain resolves to the instance but is blocked by Tencent until the filing clears. Note that 小程序备案 is **per-AppID**, so two Mini Programs mean two filings, two 微信认证 and two review submissions.
- **[DECIDED] Moderation recourse = manual re-review queue** — machine-flagged content goes to an admin queue (approve/override with reason), so false positives on children's photos are recoverable.
- **[OPEN] Account onboarding flow** — the PRD specs BOTH (1: roster import + invite code + bind on WeChat login + phone authorize; 2: self-register + admin approval); the director decides. Recommended: roster-import-first.
- **[OPEN] Minors' data retention period** — the PRD specs a configurable retention policy + a guardian consent flow; the exact period is a 园方/legal decision. → [ADR-0009](adr/0009-minors-data-retention.md).
- **[OPEN] Education 类目 / 资质** — does the chosen category require 办学许可证? Confirm + match to credentials before submission.
- **[RESOLVED 2026-08-19] 长期订阅消息 eligibility** — moot for v1. Notifications are **in-app only**; there are no WeChat subscribe-messages anywhere in v1. → [NOTIFICATIONS.md](NOTIFICATIONS.md).

## G. Still to confirm (reasonable defaults applied) / 待确认（已用合理默认）
- **[OPEN] PC backend operators** — default: 园长 + 保教主任 + 信息员; confirm who administers the CMS.
- **[OPEN] Success-metric targets** — the PRD proposes quantified targets (adoption %, audit turnaround, cadence); confirm with 园方.
- **[OPEN] Media cost ceiling** — per-class/term storage + transcoding budget; confirm.

## H. Deferred — revisit later (not now) / 暂缓，日后再议
Grilling is decision-complete for the spec. Resume at these triggers, not before:
- **Director / legal confirmation sheet** — turn the open items below into a one-page yes/no sheet for the 园方/教育局/legal to close in one meeting. (Offered; deferred by request.)
- **DESIGN grilling round** — when filling `DESIGN.md` from the existing design (navigation, component system, visual language).
- **Per-feature grilling at plan-time** — for the gnarly seams right before building each. Note the list has changed: 成长册 export and subscribe-message flows were both cancelled, by F17 and by the in-app-only decision respectively. The live seams are now audit edge cases, growth-book term compilation and finalization, and the pre-signed upload flow.
- **五大领域 evaluation 量表 content** — the rubric items and scoring behind the 五维雷达图; content from the 教研 team, not a structural decision.
- **[OPEN, blocking the growth book] Layout-pack artwork** — 0 of 12 packs released; every pack file is a skeleton with empty assets and layouts. Owned by the UI designer, due 2026-08-21. Longest external lead time outstanding.

## I. Personalization & habit analytics / 个性化与习惯分析
> Captured 2026-06-21 via grill-with-docs. Adults-only (teachers / parents) habit signals → `兴趣画像` → `个性化推荐`. Spec: [ANALYTICS.md](ANALYTICS.md) Part B. Decision record: [ADR-0011](adr/0011-personalization-and-habit-analytics.md).
- **[DECIDED] v1 / v1.x split** — v1 ships the consented, `child_id`-free signal foundation + explicit `收藏` / follow only (no LLM, no per-user 投放, no `算法备案` at launch); the LLM/RAG `兴趣画像` + `个性化推荐` ship in v1.x. → [ADR-0011](adr/0011-personalization-and-habit-analytics.md).
- **[DECIDED] Teachers first; parents v2** — only teachers are algorithmically profiled (in v1.x); parent profiling is a separate v2 decision with its own grilling + ADR. Parents keep explicit `收藏` / follow.
- **[DECIDED] Consent default (teacher)** — personalized discovery default-ON + first-use notice + always-available OFF toggle; satisfies `自动化决策` (PIPL Art 24) opt-out + right-to-explanation; view / delete / withdraw supported.
- **[DECIDED] Output surfaces** — teacher `为你推荐` shelf plus re-ranked `资源库` / `案例库`; plus a de-identified aggregate insight tile on the admin dashboard ([ANALYTICS.md](ANALYTICS.md) Part A).
- **[REOPENED 2026-08-19] LLM hosting** — the constraint stands: a **domestic** model under a data-processing agreement, with no personal information sent to an overseas API. The specific choice does not. It was 通义千问 on Alibaba on the strength of ADR-0004, which [ADR-0014](adr/0014-cloud-vendor-tencent.md) has now superseded. Decide the model when v1.x is scheduled.
- **[DECIDED] Retention** — raw signals on a rolling 24-month window; profile recomputed; immediate purge on withdrawal / account exit.
- **[INVARIANT] No `child_id` on personalization signals** — personalization events carry content attributes only, a stream separate from the metric events in [ANALYTICS.md](ANALYTICS.md) Part A; outputs are preference-level and never infer about a child. This is the load-bearing control.
- **[OPEN] `算法备案` applicability** — does teacher-only per-user `个性化推荐` in an internal staff tool trigger the filing? Confirm with legal.
- **[OPEN] Domestic-LLM DPA terms** — confirm the data-processing agreement with the model provider before v1.x build.
- **[OPEN] Parent profiling (v2)** — whether and how to profile parents, decided separately.
- **[RISK] 24-month retention** — weaker data-minimization posture than a shorter window; document the purpose justification before v1.x build.

---

## Open questions to bring to the kindergarten / 待向园方确认

Closed since the last revision: the legal 主体 (resolved 2026-08-11) and 长期订阅消息 eligibility (moot, since
v1 is in-app only).

1. **Minors' data retention period and consent wording** — PIPL art. 17 needs a value, not a proposal. Gap G11, still unsigned.
2. **The entrusted-processing agreement** — the developer processes minors' data as an entrusted party. Identified, unsigned. Gap G26.
3. Account onboarding flow — roster-invite versus self-register-approve.
4. Departed-teacher content ownership.
5. Education 类目, and whether 办学许可证 is required.
6. PC backend operators — who administers the CMS.
7. Success-metric targets.
8. Media cost ceiling — note that **egress**, not storage, is the cost driver; a 1 TB storage pack covers the first six months.
9. `算法备案` — does teacher-only per-user `个性化推荐` in an internal staff tool require the filing?
10. Domestic-LLM data-processing agreement terms, and which domestic model now that the vendor has changed.
11. Parent profiling — whether and how, a v2 decision.
12. 24-month personalization-data retention — is the purpose justification acceptable?
13. **The admin growth-book publish path and moderation** — does admin-authored school content that renders into every child's book fall under ADR-0005? Two readings are defensible; it needs deciding on the record.
14. **G36** — does the assessment report export survive F17? The surface and the prose exist; the async export mechanism it relied on was cancelled.
