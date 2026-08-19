# PRD — 化龙镇中心幼儿园电子资源平台 (Hualong Kindergarten Electronic Resource Platform)

- **Status:** Draft v0.3 (revised 2026-08-19; open items in [GRILLING.md](GRILLING.md))
- **Date:** 2026-06-18, revised 2026-08-19
- **Owners:** Kindergarten product owner (director / 园方); engineering lead
- **Language:** English master. The Simplified-Chinese twin is [PRD.zh-CN.md](PRD.zh-CN.md); both stay in sync (parity-gated).
- **Authority:** Terminology — [CONTEXT.md](../CONTEXT.md) / [glossary.json](glossary.json). Decisions — [docs/adr/](adr/). Structure — [APP-STRUCTURE.md](APP-STRUCTURE.md). Source flows — `Platform Flow.txt`.

> This document is the contract for what the platform does and why, enforced by the repository harness
> (glossary, design/wording/structure judges, parity, tests). Nothing undecided is guessed — open items are
> listed and routed to the director / 园方 / legal.
>
> **Revised 2026-08-19.** Five things changed since v0.2 and are corrected throughout: there is no admin Mini
> Program this cycle; the growth book is app-only with no export; the cloud vendor is Tencent, not Alibaba;
> the legal subject is confirmed and the filing is in progress; and audit rejection is terminal. This repo
> governs — the field-level specifications live in four sibling repos, listed in §16.

## 0. Product narrative (PR/FAQ-style)

For a busy teacher at 化龙镇中心幼儿园, lesson resources, cases, and parent updates live in scattered chat
groups and folders. The Electronic Resource Platform gives the kindergarten one trustworthy place — on the
WeChat the staff and families already use — to find and reuse curriculum resources and cases, run a clean
submit → audit → publish review, evaluate each child with the five-dimension radar (五维雷达图), and share a
per-child growth book (成长册) with guardians, read inside the app. A desktop web admin (PC后台) handles the
file-heavy and governance work. Everything a parent or teacher uploads passes a mandatory content-moderation
gate before it is visible, and children's data is handled to PIPL standards.

## 1. Problem statement

The kindergarten runs teaching resources, cases, party-building materials, administrative documents,
teaching-research, and home-school communication through scattered channels (chat groups, paper, local
files). Resources are hard to find and reuse; evaluation is manual; parents receive fragmented updates; and
there is no auditable record of what was shared or downloaded. Staff want one trustworthy place that works on
their phones (WeChat) and a desktop backend for heavy document work.

## 2. Solution overview

**Two Native WeChat Mini Programs** — 教师端 (Teacher) and 家长端 (Parent) — plus a **dedicated PC web admin**
(PC后台) for file-heavy upload and governance. There is **no admin Mini Program this cycle**: the 管理端 role
acts through the teacher client for content management and uses the PC后台 for cross-class work. Together
they centralize eight modules, enforce an audit and approval lifecycle, generate the term evaluation as a
五维雷达图, and compile a per-child 成长册 that is read inside the app.

The backend is **Tencent Cloud** — a relational source of truth, object storage, managed media processing and
a REST API ([ADR-0014](adr/0014-cloud-vendor-tencent.md)). All user content passes the mandatory
content-moderation gate before becoming visible. See implementation decisions in §9 and architecture in §10.

## 3. Goals and success metrics

### 3.1 Goals
1. One mobile-first home for resources, cases, teaching-research, party-building, administrative coordination, and home-school-community co-education.
2. A reliable submit → audit → publish lifecycle, with reasons on rejection and a retained history.
3. Lightweight, frequent home-school communication for guardians, without exposing internal staff modules.
4. Structured child evaluation (monthly and term) with the five-domain scale and radar visualization.
5. A per-child growth book for guardians, composed and read inside the app.
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
| Growth-book finalization rate (成长册定稿率) | manual | 100% of enrolled, per term |
| Published items that bypassed moderation | n/a | **0 (hard)** |

## 4. Non-goals (v1)
- Observation records (观察记录) inside the Mini Program — collected via WeCom (企业微信) per flowchart 04.
- Advanced comment/sentiment analytics on teaching-research feedback — later version.
- Online payment, e-commerce, or public (non-enrolled) access.
- A native (non-WeChat) standalone app.
- Multi-kindergarten (多园) tenancy as a feature — the data model keeps a tenant boundary, but v1 serves one 园.
- Interest/mixed-age groups — a child belongs to exactly one class in v1.
- Per-user `个性化推荐` (personalized recommendation) and the LLM `兴趣画像` (interest profile) — deferred to v1.x; v1 logs only consented, `child_id`-free signals. Teachers-only when it ships; parents are a separate v2 decision. See [ANALYTICS.md](ANALYTICS.md) Part B / [ADR-0011](adr/0011-personalization-and-habit-analytics.md).
- An **admin Mini Program** — not this cycle. The 管理端 role works through the teacher client and the PC后台.
- Growth-book **export** in any form — no PDF, no image album, no download, no sharing, no server-side rendering. Cancelled outright; see §6.6.
- **WeChat 订阅消息.** v1 notifications are in-app only. See [NOTIFICATIONS.md](NOTIFICATIONS.md).

## 5. Roles, personas, and access

| Role | 角色 | Primary jobs | Surface |
|---|---|---|---|
| Admin | 管理端 | Audit; publish co-construction tasks; manage content & users; configure the growth book; read logs | Teacher Mini Program (content management) + **PC后台/CMS** |
| Teacher | 教师端 | Upload resources/cases; complete tasks; publish garden moments; fill evaluations | Mini Program only |
| Parent | 家长端 | Read notices; do parent-child tasks; view garden moments, evaluations, growth book | Mini Program only (own child) |

There are **exactly two Mini Programs** — teacher and parent — and **one PC web console**.

**Access invariants (server-enforced):**
- The PC后台 / CMS is **admin-only**; teachers and parents have no CMS access.
- A teacher belongs to **exactly one class**, carried by a scalar class reference plus an assignment role. The former teacher-to-class join table was deleted; this is a product constraint, not only a schema simplification.
- The parent client surfaces **only** home-school-community co-education content plus its own notices/tasks; never staff modules.
- **Identity — corrected 2026-08-19.** There is **no in-app role switching**, because `openid` is unique only
  *within a single* Mini Program. Two Mini Programs give the same person **two different, uncorrelatable
  `openid` values**. The role is decided by which app the person opens. A teacher who is also a parent has an
  account in each app, linked by the identity key below, and the two are never merged into one session.
  Backend decision A2 settled this on 2026-07-29 against WeChat's own documentation; the schema has no
  role-binding table, and `db_teacher` / `db_parent` are keyed by phone number.
- **The cross-app identity key is OPEN.** A2 chose the WeChat real-time-verified phone number
  (`getRealtimePhoneNumber`), never self-entered. That component is **billed per successful call** and draws
  down a prepaid balance, so an exhausted balance breaks login for everyone. The exemption for 事业单位
  subjects applies only when the category is 政务民生, which is not ours (§8.1). The alternative is `unionid`,
  free and stable, which requires binding both AppIDs to one 微信开放平台 account under the same subject.
  This needs a decision and a superseding ADR; it moves gaps G1 and G20, both BLOCKER.

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
- [ ] **If** an admin rejects an item, **then the system shall** require a reason and retain the audit entry. **Rejection is terminal:** the item is not returned to the author for revision, resubmission of the same item is forbidden, and physical deletion is forbidden so the trail survives. The author creates a new item instead. Author withdrawal is likewise terminal.
- [ ] **If** a published training record is edited in place, **then the system shall** refuse; published records require replacement rather than in-place edit.
- [ ] **When** a full plan (详案) is downloaded, **the system shall** record the account and timestamp (download log).
- [ ] A resource detail links to related case details and a case detail links back to related resources.

### 6.6 Home-school-community co-education (家园社共育)
Garden moments, parent-child tasks (incl. community education), growth records, and growth books. Canonical
name per [ADR-0002](adr/0002-co-education-naming.md).

Stories: teacher selects a class/child and publishes garden moments (photos/videos/text); teacher publishes a parent-child task with requirements and a deadline; parent uploads feedback (image/text/video); teacher fills monthly and term evaluations; the admin configures the school-level growth-book package and publishes it to teachers; the teacher compiles the class term book and finalizes each child's copy; the guardian reads the finalized book in the app.

**The growth book is app-only.** There is no PDF, no image album, no download, no sharing and no server-side
rendering. This replaces the export model described in earlier drafts.

AC:
- [ ] **When** a teacher publishes a garden moment for a class/child, **the system shall** make it visible only to that child's guardians (after moderation).
- [ ] **When** a term evaluation is completed, **the system shall** produce the 五维雷达图 and an assessment report.
- [ ] **When** an admin publishes the school growth-book settings, **the system shall** freeze cover, logo, school introduction, school sections and the six grade-season template slots together as one immutable release, and only then allow teachers to fetch templates.
- [ ] **While** the school settings remain unpublished, **the system shall not** allow any child's book to be finalized.
- [ ] **When** a teacher locks the class term compilation, **the system shall** treat the lock as one-way and as the precondition for finalizing any child's book in that class.
- [ ] **When** a child's book is finalized, **the system shall** bind it to the release it was composed against, mark it permanently read-only, and notify every valid guardian in-app.
- [ ] **If** a book would exceed 200 pages, **then the system shall** block finalization rather than truncating.
- [ ] Pre-check, teacher preview, finalization re-verification and parent viewing **shall** all call the same composer, so no surface estimates pagination independently.
- [ ] **If** a family has not submitted a requested item, **then the system shall** offer the teacher a reminder only. A teacher may not upload, take over or correct on the family's behalf.

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
- [ ] **School growth-book settings.** The admin configures the cover, logo, school introduction, the term message and school-added sections, and assigns one of two released layout packs to each of six standing grade-season slots (three grades × spring and autumn). Publishing distributes to teachers; withdrawal is permitted only while no class in the current term has locked its compilation.
- [ ] **Child-profile corrections.** A guardian proposes a correction to a child's name, birth date or gender; the admin reviews it side by side with the current record, is warned if the official record changed since the request, and approves or rejects with a reason. At most one correction may be pending per child.
- [ ] **When** no school term is in progress, **the system shall** refuse growth-book publish and withdrawal rather than guessing the term.

## 7. Cross-cutting requirements

1. **Authentication & identity.** `wx.login → code2session` on our API yields an `openid` **scoped to that one Mini Program**, bound to a roster entry for exactly one role. There is no multi-role session and no role switch; see §5. Three things resemble role switching and are not: a teacher versus a partner-school account is one mutually exclusive subject resolved at login; a parent with several children switches *content context* on the device, which is not a session change; and an admin's several permissions are a bit set that all apply at once. Onboarding flow: the PRD specs both (roster-import + invite code; and self-register + approval) — director decides ([GRILLING.md](GRILLING.md)).
   **Parent and admin sign-in are not implementable yet** — gap G1. `db_parent` and `db_admin` carry no credential column, and the PC console is not a Mini Program so `code2session` does not apply to it. Only teacher and partner-account login exist in the schema today.
2. **Content moderation (内容安全).** Mandatory gate on every user content item before publication — §8, [ADR-0005](adr/0005-mandatory-content-moderation.md).
   - **While** a UGC item has not passed `security.msgSecCheck` (text) / `security.mediaCheckAsync` (media), **the system shall** keep it `pending` and invisible to non-authors.
   - **If** the machine check fails, **then the system shall** place the item in an admin manual re-review queue (approve/override with reason).
3. **Notifications.** v1 notifications are **in-app only**; there are no WeChat 订阅消息 sends anywhere in v1. The in-app entry is the notification, not a fallback for one, and it drives the to-do badges. See [NOTIFICATIONS.md](NOTIFICATIONS.md).
4. **Media pipeline.** Images: native `wx.compressImage` (light, device-safe). Files live in **COS object storage**; the relational database holds metadata and keys only. **Media never transits the API instance** — clients read and write COS directly using short-lived pre-signed credentials, because the instance uplink is 5 Mbps. See [ADR-0014](adr/0014-cloud-vendor-tencent.md).
   **Corrected 2026-08-19.** Earlier drafts promised uploads that are "resumable and chunked". The default
   path cannot be: `wx.uploadFile` sends a single `multipart/form-data` POST with a **10 MB platform ceiling**,
   and it can neither resume nor chunk. That 10 MB is WeChat's limit, not a product choice, so it cannot be
   raised. Retries are therefore whole-file retries. A Wi-Fi-only mode and a
   `pending → uploaded → moderated → published` status still apply, and a lifecycle rule discards incomplete
   fragments after seven days.
   **Video has no viable transport and is therefore OPEN.** A phone video of 20–60 MB cannot pass through
   `wx.uploadFile` at all. A resumable path exists — read slices with `FileSystemManager.readFile`, send each
   to a pre-signed COS `UploadPart` URL, then complete the multipart upload — but it is a second endpoint
   family that does not exist yet. Until it is built or video is dropped from 在园时光, a teacher recording a
   birthday video will simply fail. Tracked as a BLOCKER in the backend gap register.
   **Drafts holding media do not survive the app being killed.** `wx.chooseMedia` returns temporary paths.
   A draft that must outlive a session has to copy the file into `wx.env.USER_DATA_PATH`, which is bounded
   local storage and needs its own cleanup.
5. **Search.** PC后台 search across kindergarten / teacher / class / parent; library filters per module.
6. **Audit & logging.** Download log (account + time) required; browse log optional; audit decisions retained immutably.
7. **Internationalization.** Simplified Chinese is the product language; repository docs are bilingual.

## 8. Compliance and legal (launch gates)

These are hard, non-optional, and sequenced first.

**Status 2026-08-19.** The 主体 is **confirmed** — the kindergarten itself, as a 事业单位
([ADR-0010](adr/0010-legal-subject.md), now Accepted) — and the site filing was opened against it on
2026-08-11 and is in progress. Because 小程序备案 is per-AppID, **two Mini Programs double everything
WeChat-side**: two filings, two 微信认证, two review submissions, each rejectable.

### 8.1 Requirements
1. **Content moderation** — `security.msgSecCheck` / `security.mediaCheckAsync` on all UGC (text/image/video/audio/nickname/avatar/comment); pending-until-pass; manual re-review for false positives.
2. **小程序备案 (ICP filing)** — mandatory before public go-live (since 2023-09-01); 1–20 working days for 管局审核. Per-AppID, so **×2**. The separate site filing for the API domain is in progress.
3. **微信认证 (WeChat verification)** — subject verification, ¥300 per year, **×2**.
4. **Education 类目 / 资质** — **likely resolved 2026-08-19, pending console confirmation.** For a
   kindergarten the category is 教育服务 - 学历教育（学校）. For a **public** school the qualification is the
   education authority's approval document **or the 《事业单位法人证书》** — 《民办学校办学许可证》 is the
   private-school branch and does not apply. [ADR-0010](adr/0010-legal-subject.md) already establishes the
   subject as a 事业单位, so the kindergarten holds the exact document required. Two things still to confirm
   once the AppIDs exist: that 学前教育 sits under that node in the live category tree rather than an adjacent
   one, and that the certificate is accepted for it. The same category and document cover both AppIDs.
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
- **Backend = Tencent Cloud** — a Lighthouse instance, self-hosted PostgreSQL 16, COS object storage, CI/VOD for media processing, DNSPod, and a REST API behind a filed HTTPS domain. [ADR-0014](adr/0014-cloud-vendor-tencent.md) supersedes [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md) on vendor and media storage; ADR-0004's relational-over-document reasoning still stands.
- **Content moderation = WeChat `security.*`** (mandatory), optionally plus a second commercial layer. [ADR-0005](adr/0005-mandatory-content-moderation.md).
- **Render = Skyline-where-it-helps / WebView default; animation minimal**; web DOM animation libraries (GSAP, Framer Motion) are MP-incompatible and restricted to the web admin. [ADR-0007](adr/0007-render-engine-and-animation.md).
- **Harness = Node hooks + Python judges.** [ADR-0006](adr/0006-harness-language.md).
- **五维雷达图 — corrected 2026-08-19: drawn directly, not with a charting library.** Earlier drafts specified
  ec-canvas / ECharts. The backend had already decided the opposite (W12: 零文件、零 base64、零字段, computed
  live and drawn by the same code on both surfaces), and the backend is right for a reason worth recording: a
  five-axis polygon is on the order of a hundred lines of Canvas 2D, while even a trimmed ECharts build is a
  large fraction of a **2 MB** main package. The radar also appears inside the growth book, so a library would
  mean maintaining two renderers for one chart and breaking the one-composer rule in §6.6.
- **成长册** = composed and read in-app; there is no export and no server-side render. Rendering happens at
  **device screen resolution**, not print resolution — see the rendering-budget ADR [ADR-0015](adr/0015-growth-book-rendering-budget.md).
- **The API contract now exists in draft.** `hualong-backend/docs/API-CONTRACT.md` (v0.1, 2026-08-19) settles
  the conventions — envelope, error shape, status codes, cursor pagination, idempotency, concurrency — plus
  authentication, the authorization primitive, the media flow, and one worked vertical slice. It is a
  foundation, not full coverage: `hualong-backend/api/action-coverage.tsv` tracks 41 status columns of which
  3 are covered and 32 pending. Enumerating the remaining modules is mechanical and is the next work.

## 10. Architecture and data model

### 10.1 Architecture
- **Clients:** two Native Mini Programs (teacher, parent) · one PC web admin (Element Plus / Ant Design Pro).
- **Tencent Cloud:** a Lighthouse instance in Guangzhou running the REST API and **PostgreSQL 16 on loopback** as the relational source of truth · **COS** object storage for all files, private with server-side encryption · CI/VOD for media processing when needed · DNSPod · a filed HTTPS domain implementing `code2session`.
- **Traffic shape:** the instance uplink is 5 Mbps, so it serves JSON and pre-signed credentials only. Media moves client-to-COS directly. Instance-to-COS runs over the same-region private network and does not consume the instance quota.
- **WeChat platform services:** `security.*` moderation and `wx.openDocument`. No 订阅消息 in v1.

### 10.2 Data model (high-level)
**The field-level model is not maintained in this document.** It is live: **62 tables, 719 columns**, defined
in `../hualong-backend/db/01_schema.sql` and executed against PostgreSQL 16.14 with its seed and verification
scripts passing. That file is the sole authority; duplicating a field list here is how the previous version
went stale. See [DATA-DICTIONARY.md](DATA-DICTIONARY.md) for the pointer and the correction list.

Shape, for orientation only: a single-tenant kindergarten with classes and children (**a child belongs to
exactly one class**, and **a teacher to exactly one class**); guardians carried on the child record rather
than a join table; role bindings mapping one account to one or more roles; the resource and case libraries
with their submission and immutable audit records; file references into object storage carrying moderation
status; notices, co-construction tasks, garden moments, parent-child tasks and feedback; monthly and term
evaluations feeding the radar; roughly ten tables for the growth book, covering school release snapshots,
per-term class compilation, sections, widgets, materials and per-child books; the append-only download log;
consent and retention records; and the school term calendar, which three admin operations now depend on
hard.

## 11. Testing decisions

- **What makes a good test:** assert observable behavior (a parent cannot see staff modules; a rejected submission returns with a reason; unmoderated content never becomes visible), not implementation details.
- **EARS AC → tests:** the §6.5/§6.7/§7 EARS statements become the first automated tests.
- **Tested first:** the audit/approval lifecycle, role visibility, and the moderation gate.
- **Harness gate:** every change runs `node harness/gate.mjs` (glossary, house style, design/wording/structure judges, parity, tests) before a commit is approved; CI repeats it. `harness/code-review.mjs` flags any UGC write path lacking a moderation call.
- **E2E:** the docs site, the future H5/web admin, and the knowledge-graph dashboard are smoke-tested with chrome-devtools (`tests/e2e/`) — no console errors, links resolve, accessibility passes, CJK renders.

## 12. Non-functional requirements
- **Performance & size (verified platform limits).** Main package **≤ 2 MB**; **each** subpackage ≤ 2 MB;
  total **≤ 30 MB** — but **≤ 20 MB if the AppID is built or operated by a 第三方服务商**, so confirm who holds
  the account. Total size is not the binding constraint for 74 screens; **the 2 MB main package is**, and the
  growth-book editor plus any charting library is what breaches it. tabBar pages must live in the main
  package. `preloadRule` defaults to `wifi`, which means a preload silently never happens for guardians on
  rural 4G — set `network: "all"` on paths that must be warm. The 12 growth-book layout packs ship inside the
  package rather than the database, so they are a growing main-or-subpackage size line item that must be
  budgeted. Media stays in COS, never in the bundle; heavy screens lazy-load.
- **Memory budget (new).** Canvas 2D fails above **4096 px on either axis**, and an A4 page rendered at print
  resolution on a 3× device exceeds that. Render at screen resolution, cap the device pixel ratio, reuse a
  small pool of canvas nodes rather than mounting one per page, and serve each image widget a derivative
  sized to its actual pixel box rather than the stored 2000 px original. Details and arithmetic in [ADR-0015](adr/0015-growth-book-rendering-budget.md).
- **Weak-network resilience:** resumable uploads, retries, offline-tolerant drafts (China rural networks, low-end devices).
- **Accessibility:** legible CJK sizes for older guardians; touch targets ≥ 44×44; AA contrast; never convey state by color alone.
- **Privacy/security:** least-privilege access to minors' data; secrets never in the client or repo; HTTPS-only; 备案'd domains.

## 13. Milestones and build sequence (target: 2026-09-01)

Hard date per [ADR-0008](adr/0008-launch-timeline-and-pilot.md). Build in dependency + compliance order;
a 体验版 (trial) pilot is the Sep 1 fallback if public 审核 slips.

1. **M0 — Foundation.** 主体 **confirmed** and the site filing **in progress**; infrastructure **provisioned and verified** (instance, PostgreSQL 16.14 with all 62 tables live, COS, nightly backup with a tested restore). Still outstanding: register two Mini Program accounts and obtain AppIDs, 微信认证 ×2, 类目 / 资质, 小程序备案 ×2 — and **design the API contract**, without which nothing below can start. Then auth, roster and roles, and the content-moderation gate, which is built first.
2. **M1 — Teacher core:** resource and case libraries, submit → audit → publish, download logging, 五维评价.
3. **M2 — Co-education:** garden moments, parent-child tasks, monthly and term evaluation with the radar, child-profile corrections, in-app notifications, the parent client.
4. **M3 — Governance and remaining modules:** 党建管理, 综合协调, 教研培训 study, the full PC后台, the school growth-book settings, term compilation and app-only finalization. Requires all 12 layout packs to have artwork; 0 of 12 are released as of 2026-08-19.
5. **M4 — Hardening and launch:** performance, accessibility, compliance review, the 体验版 pilot, WeChat 审核 ×2, public release.

> **Schedule reality, 2026-08-19.** Thirteen days remain and no application code has been written in any
> repo. The public launch on 2026-09-01 is **not achievable**. The 体验版 whitelist pilot from
> [ADR-0008](adr/0008-launch-timeline-and-pilot.md) is therefore now the **primary deliverable** for that
> date, not the fallback it was designed as.

## 14. Risks and open questions
- **The API contract is drafted but not complete.** `hualong-backend/docs/API-CONTRACT.md` v0.1 settles the
  conventions, authentication, the authorization primitive and the media flow, and proves them against one
  vertical slice. Coverage is 3 of 41 status columns; the remaining six modules are enumerated mechanically
  from the existing button tables. The risk has moved from "nothing exists" to "finish the enumeration
  without inventing a second convention".
- **The 体验版 pilot is capped at 60 testers per Mini Program.** WeChat fixes 体验成员 quotas by
  certification and publication state; a certified, unpublished Mini Program allows 60. The kindergarten has
  roughly 25–45 staff and 500–700 guardians, so the pilot that is now the primary deliverable for the launch
  date **cannot cover the school**. It must be scoped to a named subset, and someone must collect and enrol
  each tester's WeChat ID individually. The two AppIDs do at least give two independent 60-slot pools.
- **Timeline.** The 主体 blocker is cleared, but it stayed open from 2026-06-18 to 2026-08-11 and the compliance chain could not start behind it. With zero application code and 13 days remaining, the public launch will not happen on the fixed date; the pilot carries it.
- **No artwork.** 0 of 12 growth-book layout packs are released. Longest external lead time outstanding, and it blocks the product's centrepiece.
- **Minors'-data liability:** mishandling children's media is a legal risk — consent, minimization and retention are designed in ([ADR-0009](adr/0009-minors-data-retention.md)). Two related items are **unsigned**: the guardian-consent and retention value, and the developer's entrusted-processing agreement.
- **Media cost:** **egress, not storage, dominates.** A 1 TB standard-storage allowance covers the first six months; every parent view of a photo is billed outbound traffic. A CDN in front of the bucket is the lever, and it waits on the filing.
- **Term calendar has no owner.** Three admin operations refuse when no term is in progress, and no admin surface exists to manage the calendar.
- **Seven open BLOCKER gaps** in the backend gap register: no login-identity landing point; no content-safety status bits; group-photo portrait consent; the unsigned consent and retention value; a nullable non-unique phone; minors' consent rules; and the unsigned entrusted-processing agreement.
- **One moderation question, deliberately left open.** The admin growth-book publish path performs no WeChat check and treats the admin's own preview as the review pass, while admin-uploaded photos render into every child's book. §8.1 defines UGC enumeratively and broadly and §3.2 sets bypass at a hard zero. This needs deciding on the record; it is not decided here.
- **All open questions** are tracked in [GRILLING.md](GRILLING.md).

## 15. Glossary
All terms follow [CONTEXT.md](../CONTEXT.md) / [glossary.json](glossary.json), enforced by the harness.

## 16. Detailed specification appendix
The PRD is the contract; build-ready detail lives in dedicated, version-controlled spec docs so the PRD stays readable and does not go stale (per the lean-PRD principle). These are authoritative for implementation:
- [SECURITY.md](SECURITY.md) — the action-level permission matrix, the server-enforced invariants, and the STRIDE threat table those invariants exist to stop.
- [DELIVERY.md](DELIVERY.md) — external dependencies with owners and status, the critical path, and the per-milestone definition of done.
- [ANALYTICS.md](ANALYTICS.md) — Part A, how each success metric is computed; Part B, habit analytics, `兴趣画像` and `个性化推荐`, with the no-`child_id` invariant.
- [NOTIFICATIONS.md](NOTIFICATIONS.md) — the in-app notification catalogue.
- [DATA-DICTIONARY.md](DATA-DICTIONARY.md) — a pointer to the schema of record, plus the roster CSV templates under [templates/](templates/).
- [APP-STRUCTURE.md](APP-STRUCTURE.md) — the structural contract, mirrored by the structure judge.
- [GRILLING.md](GRILLING.md) — the decision log and every open question.

**Where the detailed specifications live.** This repository governs; it does not hold the build-level specs.
Those live in four sibling repositories, all on `github.com/Chao0s`:

| Repo | Holds |
| --- | --- |
| `../hualong-backend` | The 62-table schema of record, the cross-application decision log, the gap register, and the gate harness |
| `../hualong-teacher` | The teacher Mini Program and its backend specifications |
| `../hualong-parent` | The parent Mini Program and its backend specifications |
| `../hualong-admin-pc` | The PC console and its nine backend specifications |

Resolved this round: the legal subject, the cloud vendor, the database engine, and the growth-book delivery
model. Still open: teacher cross-class visibility, and the items listed in §14.
