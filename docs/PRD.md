# PRD — 化龙镇中心幼儿园电子资源平台 (Hualong Kindergarten Electronic Resource Platform)

- **Status:** Draft v0.2 (decisions from the 2026-06-18 grilling encoded; open items in [GRILLING.md](GRILLING.md))
- **Date:** 2026-06-18
- **Owners:** Kindergarten product owner (director / 园方); engineering lead
- **Language:** English master. The Simplified-Chinese twin is [PRD.zh-CN.md](PRD.zh-CN.md); both stay in sync (parity-gated).
- **Authority:** Terminology — [CONTEXT.md](../CONTEXT.md) / [glossary.json](glossary.json). Decisions — [docs/adr/](adr/). Structure — [APP-STRUCTURE.md](APP-STRUCTURE.md). Source flows — `Platform Flow.txt`.

> This document is the contract for what the platform does and why, enforced by the repository harness
> (glossary, design/wording/structure judges, parity, tests). Nothing undecided is guessed — open items are
> listed and routed to the director / 园方 / legal.

## 0. Product narrative (PR/FAQ-style)

For a busy teacher at 化龙镇中心幼儿园, lesson resources, cases, and parent updates live in scattered chat
groups and folders. The Electronic Resource Platform gives the kindergarten one trustworthy place — on the
WeChat the staff and families already use — to find and reuse curriculum resources and cases, run a clean
submit → audit → publish review, evaluate each child with the five-dimension radar (五维雷达图), and share a
per-child growth book (成长册) with guardians. A desktop web admin (PC后台) handles the file-heavy and
governance work. Everything a parent or teacher uploads passes a mandatory content-moderation gate before it
is visible, and children's data is handled to PIPL standards.

## 1. Problem statement

The kindergarten runs teaching resources, cases, party-building materials, administrative documents,
teaching-research, and home-school communication through scattered channels (chat groups, paper, local
files). Resources are hard to find and reuse; evaluation is manual; parents receive fragmented updates; and
there is no auditable record of what was shared or downloaded. Staff want one trustworthy place that works on
their phones (WeChat) and a desktop backend for heavy document work.

## 2. Solution overview

A **Native WeChat Mini Program** with three role clients — 管理端 (Admin), 教师端 (Teacher), 家长端 (Parent) —
plus a **dedicated PC web admin** (PC后台) for file-heavy upload and governance. It centralizes eight modules,
enforces an audit/approval lifecycle, generates the term evaluation as a 五维雷达图, and compiles a per-child
成长册. The backend is Alibaba Cloud (relational data, object storage, managed video transcoding, REST API).
All user content passes the mandatory content-moderation gate before becoming visible. See implementation
decisions in §9 and architecture in §10.

## 3. Goals and success metrics

### 3.1 Goals
1. One mobile-first home for resources, cases, teaching-research, party-building, administrative coordination, and home-school-community co-education.
2. A reliable submit → audit → publish lifecycle, with reasons on rejection and a retained history.
3. Lightweight, frequent home-school communication for guardians, without exposing internal staff modules.
4. Structured child evaluation (monthly and term) with the five-domain scale and radar visualization.
5. Exportable growth books for guardians.
6. Full compliance for a public-kindergarten subject on the WeChat platform (moderation, filing, minors' data).
7. An auditable record of downloads and key actions.

### 3.2 Success metrics (targets to confirm with 园方; see [GRILLING.md](GRILLING.md))
| Metric | Baseline | v1 target (first term) |
|---|---|---|
| Teacher weekly active rate | 0 | ≥ 80% of staff |
| Parent weekly active rate | 0 | ≥ 60% of guardians |
| Median submit → audit turnaround | manual/unknown | ≤ 24 hours |
| Resources/cases published | 0 | ≥ 100 resources + ≥ 50 cases |
| Children with a completed term evaluation | manual | 100% of enrolled |
| Garden-moment cadence | ad-hoc | ~2 per class per week |
| Published items that bypassed moderation | n/a | **0 (hard)** |

## 4. Non-goals (v1)
- Observation records (观察记录) inside the Mini Program — collected via WeCom (企业微信) per flowchart 04.
- Advanced comment/sentiment analytics on teaching-research feedback — later version.
- Online payment, e-commerce, or public (non-enrolled) access.
- A native (non-WeChat) standalone app.
- Multi-kindergarten (多园) tenancy as a feature — the data model keeps a tenant boundary, but v1 serves one 园.
- Interest/mixed-age groups — a child belongs to exactly one class in v1.
- Per-user `个性化推荐` (personalized recommendation) and the LLM `兴趣画像` (interest profile) — deferred to v1.x; v1 logs only consented, `child_id`-free signals. Teachers-only when it ships; parents are a separate v2 decision. See [PERSONALIZATION.md](PERSONALIZATION.md) / [ADR-0011](adr/0011-personalization-and-habit-analytics.md).

## 5. Roles, personas, and access

| Role | 角色 | Primary jobs | Surface |
|---|---|---|---|
| Admin | 管理端 | Audit; publish co-construction tasks; manage content & users; read logs | Mini Program + **PC后台/CMS** |
| Teacher | 教师端 | Upload resources/cases; complete tasks; publish garden moments; fill evaluations | Mini Program only |
| Parent | 家长端 | Read notices; do parent-child tasks; view garden moments, evaluations, growth book | Mini Program only (own child) |

**Access invariants (server-enforced):**
- The PC后台 / CMS is **admin-only**; teachers and parents have no CMS access.
- The parent client surfaces **only** home-school-community co-education content plus its own notices/tasks; never staff modules.
- Identity: one WeChat account (one `openid`) may hold multiple roles (a teacher who is also a parent switches role in-app). See [ADR-0003](adr/0003-client-framework.md).

## 6. Scope — module specifications (v1: all eight modules)

All eight modules ship in v1 at full depth. "AC" = acceptance criterion (observable, testable). For the
**correctness-critical seams** (audit lifecycle, role visibility, moderation, download logging) the AC are
written in **EARS** (`When/If/While … the system shall …`) so they map directly to tests.

### 6.1 Home (首页)
Role-aware aggregation of to-do items, resource-center notices, quick entries, and recommended course cases.

Stories: as any role I want a role-tailored home; as admin/teacher/parent I want my to-do items to show only what I can act on; as any role I want quick entries to frequent actions.

AC:
- [ ] **When** a user opens 首页, **the system shall** render only the to-do items and entries permitted for their role.
- [ ] **If** a parent requests any staff to-do item or staff module, **then the system shall** deny access (server-enforced).
- [ ] Tapping a recommended course case opens the case detail; tapping a notice opens the notice list then detail.

### 6.2 Party-building management (党建管理)
Party-building study, activities, and brand-building. View-first on mobile; uploads via the PC后台.

AC:
- [ ] Each category (study / activities / brand-building) has a list then a detail with images, photos, and attachments.
- [ ] **While** a user is on a mobile client, **the system shall** present this module as read-only (uploads occur in the PC后台).

### 6.3 Administrative coordination (综合协调)
Administrative planning, logistics support, and HR documents. Mobile view-first; PC upload-first.

AC:
- [ ] Three sub-areas (行政统筹 / 后勤保障 / 人事管理), each a list then a detail; documents preview on mobile.
- [ ] Uploads occur in the PC后台.

### 6.4 Teaching-research and training (教研培训)
Curriculum development, the curriculum+resource libraries, and teaching-research study. v1 priority: course
resources, teaching-research materials, and the 五维雷达图 evaluation.

AC:
- [ ] **When** a teacher completes the five-domain scale (五大领域), **the system shall** generate the 五维雷达图 and an assessment report.
- [ ] A study detail can hold notices, materials (PPT/PDF/video links), and feedback; the backend can extract feedback for later summary.

### 6.5 Resource library and Case library (资源库 + 案例库)
Two linked libraries with bidirectional navigation. Resources are classified by 衣/食/住/行/艺; cases are
filtered by grade / 五大领域 / activity form / resource tag. "课程库" is a synonym of "案例库". This module
carries the **audit lifecycle** — a correctness-critical seam.

Stories: browse resources by category; open a resource detail (intro, interpretation, access, conversion suggestions, linked cases); open a case detail (intro, full plan view/download, teacher self-evaluation, peer evaluation, activity reflection, linked resources); upload a resource/case as a draft and be told if it is approved or rejected with a reason.

AC (EARS):
- [ ] **When** a teacher submits a resource or case, **the system shall** create it in `pending-audit`, route it to the moderation gate (§7), and notify admins.
- [ ] **While** an item has not passed content moderation, **the system shall not** make it visible to any non-author user.
- [ ] **When** an admin approves an item, **the system shall** publish it to the library and record an immutable audit entry (who/when/decision).
- [ ] **If** an admin rejects an item, **then the system shall** require a reason, return it to the author for revision, and retain the audit entry.
- [ ] **When** a full plan (详案) is downloaded, **the system shall** record the account and timestamp (download log).
- [ ] A resource detail links to related case details and a case detail links back to related resources.

### 6.6 Home-school-community co-education (家园社共育)
Garden moments, parent-child tasks (incl. community education), growth records, and growth books. Canonical
name per [ADR-0002](adr/0002-co-education-naming.md).

Stories: teacher selects a class/child and publishes garden moments (photos/videos/text); teacher publishes a parent-child task with requirements and a deadline; parent uploads feedback (image/text/video); teacher fills monthly and term evaluations; teacher compiles a growth book from selected content and a template, previews, then publishes/exports it.

AC:
- [ ] **When** a teacher publishes a garden moment for a class/child, **the system shall** make it visible only to that child's guardians (after moderation).
- [ ] **When** a term evaluation is completed, **the system shall** produce the 五维雷达图, an assessment report, and an exportable/publishable result.
- [ ] A 成长册 can include garden moments, parent-child tasks, evaluations, and kindergarten/class introductions, with a preview before publish; export is rendered server-side.

### 6.7 Parent client (家长端)
Deliberately simple. Notices, parent-child tasks, garden moments, growth records, growth book — for the
guardian's own child only.

AC:
- [ ] **If** the parent client attempts to render any staff module, **then the system shall** prevent it (the client never references staff modules; visibility is server-enforced).
- [ ] **When** a parent submits task feedback, **the system shall** route it through moderation and let the teacher see completion.

### 6.8 PC backend (PC后台)
User management, content management, audit management, co-construction task management, and data records.

AC:
- [ ] **If** a non-admin authenticates to the PC后台, **then the system shall** deny access.
- [ ] Role assignment maps a user to admin/teacher/parent (a user may hold more than one role).
- [ ] The audit queue records who/when/why for each decision; flagged content (§7) lands in a manual re-review queue.
- [ ] Roster import, manual entry, search (kindergarten/teacher/class/parent), notices, module materials, co-construction tasks with progress, and data records (download log, optional browse log, feedback extraction).

## 7. Cross-cutting requirements

1. **Authentication & identity.** `wx.login → code2session` (implemented on our API) yields `openid`, bound to a roster entry and one or more roles. Phone-number authorization for parents where needed. Onboarding flow: the PRD specs both (roster-import + invite code; and self-register + approval) — director decides ([GRILLING.md](GRILLING.md)).
2. **Content moderation (内容安全).** Mandatory gate on every user content item before publication — §8, [ADR-0005](adr/0005-mandatory-content-moderation.md).
   - **While** a UGC item has not passed `security.msgSecCheck` (text) / `security.mediaCheckAsync` (media), **the system shall** keep it `pending` and invisible to non-authors.
   - **If** the machine check fails, **then the system shall** place the item in an admin manual re-review queue (approve/override with reason).
3. **Notifications.** 订阅消息 drive notice/task reminders; long-term subscription eligibility to confirm.
4. **Media pipeline.** Images: native `wx.compressImage` (light, device-safe). Video: minimal client compression, server-side managed transcoding (VOD → H.264/HLS). Files in OSS (object storage), metadata + URLs in RDS. Uploads are resumable/chunked with retries, progress, and an optional Wi-Fi-only mode; a `pending → uploaded → moderated → published` status protects against dropped connections. See [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md).
5. **Search.** PC后台 search across kindergarten / teacher / class / parent; library filters per module.
6. **Audit & logging.** Download log (account + time) required; browse log optional; audit decisions retained immutably.
7. **Internationalization.** Simplified Chinese is the product language; repository docs are bilingual.

## 8. Compliance and legal (launch gates)

These are hard, non-optional, and sequenced first. Compliance cannot start until the 主体 is confirmed
([ADR-0010](adr/0010-legal-subject.md)).

### 8.1 Requirements
1. **Content moderation** — `security.msgSecCheck` / `security.mediaCheckAsync` on all UGC (text/image/video/audio/nickname/avatar/comment); pending-until-pass; manual re-review for false positives.
2. **小程序备案 (ICP filing)** — mandatory before public go-live (since 2023-09-01); 1–20 working days.
3. **微信认证 (WeChat verification)** — subject verification (¥300/year).
4. **Education 类目 / 资质** — category may require 办学许可证; match to credentials before submission.
5. **Minors' data (未成年人数据)** — explicit guardian consent, privacy popup, data minimization, strict access, defined retention ([ADR-0009](adr/0009-minors-data-retention.md)). PIPL + minors' online-protection regulation.

### 8.2 Compliance traceability
| Requirement | Control | Verified by |
|---|---|---|
| No published item bypasses moderation | Server-side gate; client cannot publish UGC directly | `harness/code-review.mjs` + structure judge (ugcWrite invariant) + AC tests in §6.5/§7 |
| Parent cannot reach staff modules | Server-enforced role visibility | `app-structure.json` roleAccess + structure judge + AC §6.7 |
| PC后台 admin-only | Server-enforced surface guard | `app-structure.json` surfaces + AC §6.8 |
| Children's data consent + retention | Consent flow + configurable retention | [ADR-0009](adr/0009-minors-data-retention.md); compliance-sentinel agent |
| 备案 / 认证 / 类目 done before launch | Compliance checklist (M0) | [ADR-0008](adr/0008-launch-timeline-and-pilot.md); compliance-sentinel |
| Secrets never in client/repo | `.gitignore` + code-review secret scan | `harness/code-review.mjs` |

See [docs/research/wechat-miniprogram.md](research/wechat-miniprogram.md) for sources.

## 9. Implementation decisions (see ADRs)

- **Client = Native Mini Program + dedicated PC web admin** (Element Plus / Ant Design Pro). [ADR-0003](adr/0003-client-framework.md).
- **Backend = Alibaba Cloud** — RDS + OSS + VOD/MPS + REST API (FC/ECS, 备案'd HTTPS) + CDN. [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md).
- **Content moderation = WeChat `security.*`** (mandatory) + optional 阿里云内容安全. [ADR-0005](adr/0005-mandatory-content-moderation.md).
- **Render = Skyline-where-it-helps / WebView default; animation minimal**; web DOM animation libraries (GSAP, Framer Motion) are MP-incompatible and restricted to the web admin. [ADR-0007](adr/0007-render-engine-and-animation.md).
- **Harness = Node hooks + Python judges.** [ADR-0006](adr/0006-harness-language.md).
- **五维雷达图** = ec-canvas / ECharts. **成长册 export** = server-side render.

## 10. Architecture and data model

### 10.1 Architecture
- **Clients:** Native Mini Program (3 roles) · PC web admin (Element Plus / Ant Design Pro).
- **Alibaba Cloud:** RDS (MySQL/PostgreSQL) relational source of truth · OSS object storage (all files) · VOD/MPS managed video transcoding + image processing · REST API on FC/ECS (HTTPS, 备案'd) implementing `code2session` · CDN.
- **WeChat platform services:** `security.*` moderation, 订阅消息, `wx.openDocument`.

### 10.2 Data model (high-level)
Tenant (boundary kept for future 多园); Kindergarten; Class; Child (**exactly one class**); Guardian; Teacher;
Admin; RoleBinding (account ↔ roles); Resource + ResourceCategory (衣/食/住/行/艺); Case + CaseFilterTag;
Submission + AuditRecord (immutable); MediaAsset (OSS url + moderation status); Notice; CoConstructionTask +
TaskParticipant + TaskProgress; GardenMoment; ParentChildTask + TaskFeedback; MonthlyEvaluation;
TermEvaluation (five-domain scale + radar); GrowthBook + GrowthBookItem; DownloadLog; (optional) BrowseLog;
ConsentRecord + RetentionPolicy; module material records for party-building / administrative coordination /
teaching-research.

## 11. Testing decisions

- **What makes a good test:** assert observable behavior (a parent cannot see staff modules; a rejected submission returns with a reason; unmoderated content never becomes visible), not implementation details.
- **EARS AC → tests:** the §6.5/§6.7/§7 EARS statements become the first automated tests.
- **Tested first:** the audit/approval lifecycle, role visibility, and the moderation gate.
- **Harness gate:** every change runs `node harness/gate.mjs` (glossary, house style, design/wording/structure judges, parity, tests) before a commit is approved; CI repeats it. `harness/code-review.mjs` flags any UGC write path lacking a moderation call.
- **E2E:** the docs site, the future H5/web admin, and the knowledge-graph dashboard are smoke-tested with chrome-devtools (`tests/e2e/`) — no console errors, links resolve, accessibility passes, CJK renders.

## 12. Non-functional requirements
- **Performance & size:** main package ≤ 2MB, total ≤ ~30MB; sub-packages; media in OSS; lazy-load heavy screens.
- **Weak-network resilience:** resumable uploads, retries, offline-tolerant drafts (China rural networks, low-end devices).
- **Accessibility:** legible CJK sizes for older guardians; touch targets ≥ 44×44; AA contrast; never convey state by color alone.
- **Privacy/security:** least-privilege access to minors' data; secrets never in the client or repo; HTTPS-only; 备案'd domains.

## 13. Milestones and build sequence (target: 2026-09-01)

Hard date per [ADR-0008](adr/0008-launch-timeline-and-pilot.md). Build in dependency + compliance order;
a 体验版 (trial) pilot is the Sep 1 fallback if public 审核 slips.

1. **M0 — Day 1, in parallel:** confirm 主体 → start 微信认证 + 类目/资质 + 小程序备案; stand up Alibaba (RDS/OSS/VOD/API); auth + roster + roles; the content-moderation gate (cross-cutting, build first).
2. **M1 — Teacher core:** resource/case libraries, submit → audit → publish, download logging, 五维评价.
3. **M2 — Co-education:** garden moments, parent-child tasks, monthly/term evaluation + radar, notices via 订阅消息, parent client.
4. **M3 — Governance & remaining modules:** 党建管理, 综合协调, 教研培训 study, full PC后台 (user/content/audit/task/data), 成长册 export.
5. **M4 — Hardening & launch:** performance, accessibility, compliance review (compliance-sentinel), 体验版 pilot, WeChat 审核, public release.

## 14. Risks and open questions
- **🔴 Timeline + 主体 blocker:** the fixed 2026-09-01 date with all-eight-full-depth and a small AI-assisted team is high-risk, and **the 主体 (法人) is unconfirmed — it blocks the entire compliance track**. Confirm it first. Mitigation: pilot fallback + day-1 compliance ([ADR-0008](adr/0008-launch-timeline-and-pilot.md), [ADR-0010](adr/0010-legal-subject.md)).
- **Minors'-data liability:** mishandling children's media is a legal risk — consent, minimization, retention designed in ([ADR-0009](adr/0009-minors-data-retention.md)).
- **Media cost:** video storage/egress/transcoding can dominate cost; needs a budget.
- **All open questions** are tracked in [GRILLING.md](GRILLING.md).

## 15. Glossary
All terms follow [CONTEXT.md](../CONTEXT.md) / [glossary.json](glossary.json), enforced by the harness.

## 16. Detailed specification appendix
The PRD is the contract; build-ready detail lives in dedicated, version-controlled spec docs so the PRD stays readable and does not go stale (per the lean-PRD principle). These are authoritative for implementation:
- [RBAC.md](RBAC.md) — action-level permission matrix (create/read/update/delete/approve per role per entity) + server-enforced invariants.
- [DATA-DICTIONARY.md](DATA-DICTIONARY.md) — field-level schema (types, keys, PII, retention class) doubling as the relational DB schema, with import-ready CSV templates under [templates/](templates/).
- [MEASUREMENT.md](MEASUREMENT.md) — how each success metric is computed (metric → event → data source); "active" = a meaningful action per 7-day window; the 24h audit turnaround is a tracked target.
- [NOTIFICATIONS.md](NOTIFICATIONS.md) — the 订阅消息 event catalog with an in-app inbox fallback.
- [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md) — per-milestone Definition of Done checklists.
- [THREAT-MODEL.md](THREAT-MODEL.md) — a STRIDE threat table mapped to controls and tests.
- [DEPENDENCIES.md](DEPENDENCIES.md) — external dependencies, owners, and assumptions.
- [PERSONALIZATION.md](PERSONALIZATION.md) — habit analytics, `兴趣画像`, and `个性化推荐`: the adults-only signal foundation (v1) and the deferred LLM/RAG feature (v1.x), with the no-`child_id` invariant. See [ADR-0011](adr/0011-personalization-and-habit-analytics.md).

Resolved this round: child exit/consent (retain, revoke access, purge on request), roster via CSV/Excel templates, metric definitions, and the audit-edit default. Still open: teacher cross-class visibility (defaulting to own-class child-data + school-wide libraries, pending 园方). See [GRILLING.md](GRILLING.md).
