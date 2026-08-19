# Delivery — dependencies, critical path and definition of done

- **Status:** Build-ready spec v0.2 (merged 2026-08-19 from the former `DEPENDENCIES.md` and `DEFINITION-OF-DONE.md`).
- **Date:** 2026-06-18, revised 2026-08-19
- **Scope:** Everything outside the build team's direct control, the sequence those things impose, and the
  definition of done that gates every merge and every milestone.

Dependencies and the definition of done are merged here because they answer one question from two ends: what
must be true before we can ship, and what must be true before a change counts as finished.

> **Revised 2026-08-19 — three of the four highest-risk rows have changed state.** The legal 主体 is
> **confirmed**, the ICP filing is **in progress**, and the backend is **provisioned and verified** on Tencent
> rather than pending on Alibaba. The prior version of this document listed all three as not-started blockers,
> which had become the most misleading claim in the repository.

---

# Part A — Dependencies and the critical path

## A1. Ownership of the delivery plan

| Items | Owner | State |
| --- | --- | --- |
| Compliance (1–7 below) | **Project managers** | Underway |
| Growth-book artwork — 12 layout packs | **UI designer** | Due Friday 2026-08-21. Currently 0 of 12 released |
| Documentation and API design (9–12) | Engineering | In progress |
| Build and launch (13–22) | Engineering | Batched, starts after the API contract exists |

## A2. External dependencies

Owners are the responsible party; status is as of 2026-08-19; risk is impact on the launch date fixed by
[ADR-0008](adr/0008-launch-timeline-and-pilot.md).

| Dependency | Owner | Status (2026-08-19) | Risk | Notes |
| --- | --- | --- | --- | --- |
| Legal 主体 confirmation | 园方 / 教育局 | **Resolved 2026-08-11** — Path A, the kindergarten as a 事业单位 | Cleared | [ADR-0010](adr/0010-legal-subject.md). Was the top blocker from 2026-06-18 to 2026-08-11; that delay is now carried by the schedule. |
| ICP filing (小程序备案 and the site filing) | 园方 + engineering | **In progress** — site filing opened 2026-08-11, at step 4 of 5 awaiting 工信部短信核验, then 管局审核 at 1–20 working days | **High** — the domain is blocked until it clears | Per-AppID, so two Mini Programs mean two 小程序备案 in addition to the site filing. |
| WeChat verification (微信认证) | 园方 (subject holder) | Not started — needs the AppIDs | High — prerequisite for category and public release | ¥300 per year, **×2** for two Mini Programs. |
| Mini Program account registration | 园方 / project managers | Not started | **High** — everything WeChat-side waits on the AppIDs | Two accounts: parent and teacher. |
| Education 类目 / 资质 | 园方 / 教育局 | **Likely resolved 2026-08-19** — confirm in console | Medium, downgraded from High | Category is 教育服务 - 学历教育（学校）. For a public school the qualification is the education authority's approval document **or the 《事业单位法人证书》**, which the kindergarten already holds per [ADR-0010](adr/0010-legal-subject.md). 《民办学校办学许可证》 is the private-school branch and does not apply. Confirm the live category tree once the AppIDs exist. |
| WeChat 审核 (public review) | WeChat platform | Not started — waits on a built app | High — external, and **×2** for two Mini Programs, each rejectable | The 体验版 pilot is the fallback. |
| WeChat `security.*` moderation | WeChat platform | Available — must be integrated | High — a hard, non-bypassable gate | [ADR-0005](adr/0005-mandatory-content-moderation.md). |
| Growth-book artwork — 12 layout packs | UI designer | **0 of 12 released**; due 2026-08-21 | **High** — the longest lead time outstanding; blocks the growth book entirely | Every `pack.json` is a skeleton with empty `assets` and `layouts`. |
| **The API contract** | Engineering | **Does not exist** | **BLOCKER (highest)** — no client work can start without it | No OpenAPI, no endpoint table anywhere. See §A3. |
| Cloud infrastructure | Engineering | **Provisioned and verified 2026-08-19** | Cleared | Tencent Lighthouse instance, PostgreSQL 16.14 with all 62 tables live and verified, COS bucket, nightly backup with a tested restore. [ADR-0014](adr/0014-cloud-vendor-tencent.md). |
| API-domain filing | 园方 + engineering | Couples to the site filing above | Medium | The API runs behind a filed HTTPS domain. |
| Roster source (teacher / child / parent) | 园方 (信息员) | Open — format and provider to confirm | Medium | Roster import and the active-rate denominators depend on it. See `docs/templates/`. |
| Media cost ceiling | 园方 | Open — budget unconfirmed | Medium | Storage is covered by a 1 TB pack for six months; **egress is the real cost driver**, not storage. |
| PC backend operators | 园方 | Open — default 园长 + 保教主任 + 信息员 | Low | Affects role assignment, not the build. |
| 未成年人数据 retention period | 园方 / legal | **Open — unsigned** (gap G11) | Medium — PIPL art. 17 needs a value, not a proposal | [ADR-0009](adr/0009-minors-data-retention.md). |
| Entrusted-processing agreement | 园方 / legal + developer | **Open — identified but unsigned** (gap G26) | Medium — the developer processes minors' data as an entrusted party | Signature, not engineering. |
| 订阅消息 quota and eligibility | WeChat / 园方 | **Not applicable in v1** | None | v1 notifications are in-app only. See [NOTIFICATIONS.md](NOTIFICATIONS.md). |
| **体验成员 enrolment ×2** | 园方 / project managers | Not started | **High** — caps the pilot at 60 per app | WeChat fixes the quota by certification and publication state; a certified, unpublished Mini Program allows **60**. Each tester is added individually by WeChat ID and must accept. See §A6. |
| **用户隐私保护指引 ×2** | Project managers | Not started | **High** — undeclared privacy APIs simply do not work | Since 2023-09-15 only declared interfaces can be called. An undeclared `wx.chooseMedia` fails silently, and that is the most-used API in both clients. Per-AppID, so two declarations. |
| **`消息推送` endpoint ×2** | Engineering | **Blocked on the site filing** | **High** — content moderation cannot complete its loop without it | `mediaCheckAsync` returns its verdict to the Mini Program's `消息推送` URL, configured per AppID with its own Token and EncodingAESKey. WeChat validates the URL at configuration time, so it must be publicly reachable — which the filing currently blocks. |
| 服务器域名 whitelist ×2 | Engineering | Not started | Medium | Per-category lists with a capped number of modifications per month. Plan the full list once, including the eventual CDN hostname, rather than spending modifications adding domains one at a time. |
| 手机号快速验证 balance | 园方 | Open | Medium — an empty balance breaks login for everyone | Billed per successful call. The 事业单位 exemption applies only to the 政务民生 category, which is not ours. See the identity-key decision in [PRD.md](PRD.md) §5. |

## A3. Critical path

**Corrected 2026-08-19: the pilot and the public release have different critical paths, and the pilot's is
much shorter.** An unfiled Mini Program still runs in 开发版 and 体验版 — 小程序备案 gates 上架/发布 only. So
the two 小程序备案 filings are **not** on the pilot's path and can run in parallel with building.

What the pilot does need is the **site filing for the API domain**, because a 体验版 on a real device enforces
the 服务器域名 whitelist and that whitelist requires filed domains. That filing is already at step 4 of 5.

```
pilot:   主体 ✅ → AppIDs registered → site filing clears → 体验成员 enrolled (≤60 each)
                                     → app built → 体验版 pilot

public:  the above → 微信认证 ×2 + 类目/资质 + 小程序备案 ×2 → WeChat 审核 ×2 → public release
```

Running beside it, and now the binding constraint:

```
API contract designed → API built → clients built → deployable
```

**The API contract is the highest-leverage item.** The database is live and verified and the infrastructure is
done, so nothing on the engineering side is waiting on provisioning any more — it is waiting on a contract
that does not exist. There is no OpenAPI document, no endpoint table, no verb, path, payload, status-code or
pagination convention anywhere across the four repos. What exists is a field-level binding contract of 832
bindings over 719 columns, which answers *which column an input writes to* and nothing about the wire.
Gap G40 states it directly: 绑定契约只覆盖字段，不覆盖动作 —— 313 个按钮零覆盖。

## A6. The pilot cannot cover the school

WeChat caps 体验成员 by certification and publication state. On the launch date both Mini Programs will be
certified but unpublished, which allows **60 体验成员 per AppID**. The kindergarten has roughly 25–45 staff and
500–700 guardians.

The 体验版 pilot is now the primary deliverable for 2026-09-01 ([ADR-0008](adr/0008-launch-timeline-and-pilot.md)),
so this is a scoping constraint on the thing being delivered, not a footnote:

- The teacher app can plausibly cover **all staff** within 60.
- The parent app covers **at most 60 families**, so the pilot must be scoped to a named subset — two classes
  is the natural unit.
- Every tester is enrolled individually by WeChat ID and must accept the invitation. Someone has to own that
  clerical work, and it is not engineering.
- The two AppIDs give **two independent 60-slot pools**, so teacher and parent whitelists do not compete.

**Needs a decision from 园方:** which classes, and who collects the WeChat IDs.

## A4. Schedule reality

[ADR-0008](adr/0008-launch-timeline-and-pilot.md) fixes the public launch at **2026-09-01**. As of 2026-08-19
that is 13 days away with **zero application code written** in any of the four repos.

The public launch on that date is **not achievable**. ADR-0008's 体验版 whitelist pilot is therefore now the
**primary deliverable** for 2026-09-01, not the fallback it was designed as. This should be stated to whoever
owns the date now rather than at the end of August.

## A5. Key assumptions (v1)

Each is a deliberate scope decision, not an oversight.

- **Single-tenant.** v1 serves one kindergarten. The data model keeps a tenant boundary so a future 多园 setup
  stays possible, but multi-tenancy is not a v1 feature.
- **One class per child.** A child belongs to exactly one class; teachers may still multi-select children when
  publishing. No interest or mixed-age groups.
- **One class per teacher.** A teacher belongs to exactly one class, carried by `db_teacher.class_id` plus
  `assignment_role`. The former teacher-to-class join table was deleted. This is a product constraint, not
  merely a schema detail.
- **One account, multiple roles.** One `openid` may hold several roles; a teacher who is also a parent switches
  role in-app ([ADR-0003](adr/0003-client-framework.md)).
- **Two Mini Programs plus one PC console.** There is no admin Mini Program this cycle; the admin works inside
  the teacher client and the PC后台.
- **Teacher scope is own-class — pending 园方** for anything beyond the class boundary. See
  [SECURITY.md](SECURITY.md) §9.
- **Onboarding flow — pending 园方.** Roster-import-first is the recommended default.
- **Departed-teacher content — pending 园方.** The recommendation is that content stays, kindergarten-owned,
  with authorship retained and login revoked.
- **Files live in object storage.** All files live in COS; the database holds metadata and keys only. Media
  moves client-to-COS directly via short-lived pre-signed credentials and **never transits the instance** —
  its uplink is 5 Mbps ([ADR-0014](adr/0014-cloud-vendor-tencent.md)).
- **内容安全 is mandatory regardless of backend.** WeChat `security.*` moderation is required no matter how the
  backend is built; a third-party layer can add to it but never replaces it.

---

# Part B — Definition of done

A milestone is done only when every box in its section **and** every box in the global list is checked. These
checklists are the merge contract; `npm run gate` enforces the mechanical parts and review covers the rest.

## B0. Global — every change

- [ ] **EARS acceptance criteria implemented and tested.** Each PRD §6 / §7 EARS statement touched by the
      change has an automated test asserting observable behaviour, not implementation detail.
- [ ] **`npm run gate` is green** — glossary, house-style lint, wording / design / structure judges, parity,
      tests — locally and in CI.
- [ ] **Content-moderation gate on every UGC path.** Any code path writing user content routes it through
      `security.msgSecCheck` or `security.mediaCheckAsync` before it is visible; `harness/code-review.mjs`
      passes with no un-gated UGC write.
- [ ] **Role visibility tested.** A parent cannot reach staff modules and a non-admin cannot reach the PC后台;
      the structure judge and an automated test confirm it.
- [ ] **Server-side scope enforcement.** Every request resolves to the caller's `openid`, then to the active
      role and its scope, and denies by default. A hidden control in the UI is never the control.
- [ ] **Accessibility holds.** Touch targets at least 44×44, AA contrast, legible CJK sizes for older
      guardians, and state never conveyed by colour alone.
- [ ] **Metrics instrumented.** Any new role-relevant action emits its analytics event in the same change
      ([ANALYTICS.md](ANALYTICS.md)).
- [ ] **Notifications wired.** Any new notification-producing action writes its in-app entry
      ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] **Docs parity kept.** If an English master document changed, the 简体中文 twin is updated in the same
      change so the parity check stays green.
- [ ] **Performance budget respected.** The change does not push the main package over budget; heavy screens
      lazy-load and media stays in COS, never in the bundle.
- [ ] **No secrets in the client or any repo;** HTTPS-only, filed domains for any new endpoint.

## B1. M0 — Foundation, compliance kickoff, moderation gate

- [x] **Legal 主体 confirmed** — Path A, 2026-08-11.
- [~] **ICP filing started** with the confirmed subject — in progress, step 4 of 5.
- [ ] **Mini Program accounts registered** and AppIDs obtained, ×2.
- [ ] **WeChat verification initiated** for the subject, ×2.
- [ ] **Education 类目 / 资质 matched**, including whether 办学许可证 is required, resolved before submission.
- [x] **Backend provisioned** — Tencent Lighthouse instance, PostgreSQL 16.14 with all 62 tables executed and
      27 verification assertions passing, COS bucket with lifecycle and CORS, nightly backup with a tested
      restore ([ADR-0014](adr/0014-cloud-vendor-tencent.md)).
- [ ] **The API contract exists** — envelope, error shape, status codes, pagination, idempotency, and an
      endpoint per write control. **Nothing below can start without this.**
- [ ] **Auth working:** `wx.login` to `code2session` yields an `openid` bound to a roster entry and one or
      more roles, evaluated per active role.
- [ ] **Content-moderation gate built first** as a reusable server-side service, with the manual re-review
      queue, before any UGC feature ships.
- [ ] **Guardian-consent flow scaffolded:** privacy popup and recorded opt-in before any child media is
      captured, with the retention policy configurable — and its **value signed off** (gap G11).
- [ ] Global list met.

## B2. M1 — Teacher core: libraries, audit lifecycle, evaluation

- [ ] **Audit lifecycle implemented and tested:** submit creates `pending-audit` and routes to moderation;
      un-passed items are invisible to non-authors; Approve publishes and writes an immutable AuditRecord;
      **Reject is terminal, requires a reason, and forbids resubmission of the same item**.
- [ ] **Download log records account and timestamp** on every 详案 download, append-only.
- [ ] **Resource–case bidirectional linking** works in both directions.
- [ ] **五维雷达图** generated from the five-domain scale, with an assessment report.
- [ ] **Submit-to-audit turnaround instrumented** and shown as a tracked target, not an enforced SLA.
- [ ] **Approve and reject notifications** fire to the teacher, in-app.
- [ ] Moderation exercised on the upload path; role visibility tested for the libraries.
- [ ] Global list met.

## B3. M2 — Co-education and the parent client

- [ ] **Garden moments:** a published 在园时光 is visible only to that child's guardians, after moderation.
- [ ] **Parent-child tasks** publishable with requirements and a deadline; parents submit moderated feedback;
      teachers see completion.
- [ ] **Monthly and term evaluation plus radar** complete, producing the radar and the assessment report.
- [ ] **Child-profile corrections:** a guardian proposes, an admin approves or rejects with a reason; at most
      one pending correction per child; approval writes the change and the audit row in one transaction.
- [ ] **Parent client visibility enforced:** the client never references staff modules and the server denies
      any staff-module request.
- [ ] **In-app notifications** for new notice, new task, feedback received, garden moment, evaluation
      published, collection reminder (`n4`) and book published (`n5`).
- [ ] **Parent and teacher weekly-active events** instrumented; garden-moment cadence measurable per class.
- [ ] **Guardian consent enforced** before any child media is published.
- [ ] Global list met.

## B4. M3 — Governance, remaining modules, growth book

- [ ] **党建管理 and 综合协调** ship view-first on mobile with uploads in the PC后台.
- [ ] **教研培训** holds notices, materials and feedback, with backend feedback extraction.
- [ ] **Full PC后台** delivers user, content, audit, co-construction-task and data management; the audit queue
      records who, when and why, and routes flagged content to manual re-review.
- [ ] **Growth book, app-only.** The book is composed and read **inside the Mini Program**. There is no PDF,
      no image album, no download, no sharing and no server-side rendering. A child's book reaches `b2`
      (published, permanently read-only) or stays at `b1`. Hard cap 200 pages, which blocks finalization
      rather than truncating.
- [ ] **School growth-book settings:** the admin configures cover, logo, introduction, term message, school
      sections and the six grade-season template slots, then publishes `d1 → d2`. Publishing is the
      distribution gate — while `d1`, teachers cannot fetch templates.
- [ ] **Term compilation:** a class compilation locks `e1 → e2` one-way, which is the precondition for any
      per-child finalization, and each finalized book binds an immutable release snapshot.
- [ ] **One composer, used everywhere.** Pre-check, teacher preview, the `b1 → b2` re-verification and parent
      viewing all call the same composer — 不得各自估页.
- [ ] **All 12 layout packs released** with artwork. Currently 0 of 12.
- [ ] **PC后台 admin-only** enforced; any non-admin denied.
- [ ] Moderation verified on every remaining UGC path; role visibility tested across all eight modules.
- [ ] Global list met.

> **Removed 2026-08-19.** M3 previously required "成长册 export ... renders server-side". F17 cancelled export,
> generation, download, sharing and server-side rendering outright. The replacement requirements are above.

## B5. M4 — Hardening and launch

- [ ] **Performance budget proven:** main package within budget, sub-packages split, heavy screens lazy-loaded,
      media in COS — measured, not assumed.
- [ ] **Accessibility audited** end to end: touch targets, AA contrast, CJK legibility, no colour-only state.
- [ ] **Compliance review passed:** 内容安全 on all UGC; ICP filing complete; WeChat verification complete ×2;
      education 类目 / 资质 confirmed; 未成年人数据 consent and retention confirmed **with a signed value**; the
      entrusted-processing agreement **signed**.
- [ ] **Zero moderation-bypass verified** by the reconciliation control reading 0.
- [ ] **体验版 pilot ready** for whitelisted users. As of 2026-08-19 this is the **primary** deliverable for
      2026-09-01, not a fallback.
- [ ] **WeChat 审核 submissions packaged** ×2, with all required materials.
- [ ] All end-to-end smoke tests pass: no console errors, links resolve, accessibility passes, CJK renders.
- [ ] Global list met.

---

## Cross-references

- Milestones and scope: [PRD.md](PRD.md) §13.
- Access control, invariants and threats: [SECURITY.md](SECURITY.md).
- Metric definitions and the events every feature must emit: [ANALYTICS.md](ANALYTICS.md).
- Notification behaviour: [NOTIFICATIONS.md](NOTIFICATIONS.md).
- Open questions: [GRILLING.md](GRILLING.md).
- Cloud vendor and infrastructure: [ADR-0014](adr/0014-cloud-vendor-tencent.md).
- Gaps register, including G11, G26 and G40: `../hualong-backend/db/GAPS.md`.
