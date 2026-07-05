# DEFINITION-OF-DONE.md — Per-milestone Definition of Done

- **Status:** Build-ready spec (derived from [PRD.md](PRD.md) §13 milestones, §6 / §7 / §8 / §11 / §12)
- **Date:** 2026-06-18
- **Scope:** A Definition of Done (DoD) checklist for each milestone M0–M4, plus a global "every PR" DoD that
  applies to all of them.

A milestone is done only when every box in its section *and* every box in the global DoD is checked. These
checklists are the merge contract; the harness gate (`npm run gate`) enforces the mechanical parts and the
remainder is verified in review.

## 0. Global DoD — every PR

Applies to every change, in every milestone.

- [ ] **EARS acceptance criteria implemented and tested.** Each PRD §6 / §7 EARS statement touched by the
      change has a corresponding automated test asserting observable behaviour (PRD §11), not implementation
      detail.
- [ ] **`npm run gate` is green** (glossary, house-style lint, wording / design / structure judges, parity,
      tests) locally and in CI.
- [ ] **Content-moderation gate on every UGC path.** Any code path that writes user content routes it through
      `security.msgSecCheck` / `security.mediaCheckAsync` before it is visible; `harness/code-review.mjs`
      passes with no un-gated UGC write ([ADR-0005](adr/0005-mandatory-content-moderation.md)).
- [ ] **Role visibility tested.** A parent cannot reach staff modules and a non-admin cannot reach the
      `PC backend`; the structure judge and an automated test confirm it ([APP-STRUCTURE.md](APP-STRUCTURE.md)).
- [ ] **Accessibility holds.** Touch targets >= 44x44, AA contrast, legible CJK sizes for older guardians,
      and state never conveyed by colour alone (PRD §12).
- [ ] **Metrics instrumented.** Any new role-relevant action emits its analytics event in the same change
      ([MEASUREMENT.md](MEASUREMENT.md)).
- [ ] **Notifications wired with inbox fallback.** Any new notification-producing action writes its in-app
      inbox entry and attempts a `订阅消息` ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] **Docs parity kept.** If English master docs changed, the 简体中文 twin is updated in the same change so
      the parity check stays green (PRD §7.7).
- [ ] **Performance budget respected.** The change does not push the main package over its budget (see M4);
      heavy screens lazy-load and media stays in `OSS`, not the bundle (PRD §12).
- [ ] **No secrets in client or repo;** HTTPS-only, 备案'd domains for any new endpoint (PRD §12).

## 1. M0 — Foundation, compliance kickoff, moderation gate

PRD §13 M0: confirm `主体`, start compliance, stand up Alibaba, auth + roster + roles, build the moderation
gate first.

- [ ] **Legal `主体` confirmed** (Path A or Path B) so the compliance track can start
      ([ADR-0010](adr/0010-legal-subject.md)) — this is the gating dependency
      ([DEPENDENCIES.md](DEPENDENCIES.md)).
- [ ] **`ICP filing` (小程序备案) started** with the confirmed subject; tracked with its 1–20 working-day lead
      time (PRD §8.1).
- [ ] **`WeChat verification` (微信认证) initiated** for the subject (PRD §8.1).
- [ ] **Education `类目` / `资质` matched**, including whether 办学许可证 is required for the chosen category, and
      resolved before submission (PRD §8.1).
- [ ] **Alibaba backend provisioned:** `RDS`, `OSS`, `VOD`/MPS, and the REST API on a 备案'd HTTPS domain
      ([ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md)).
- [ ] **Auth + roster + roles working:** `wx.login` to `code2session` yields `openid` bound to a roster entry
      and one or more roles; one account can hold multiple roles ([ADR-0003](adr/0003-client-framework.md)).
- [ ] **Content-moderation gate built first** as a reusable server-side service, with the manual re-review
      queue for machine-flagged content, before any UGC feature ships ([ADR-0005](adr/0005-mandatory-content-moderation.md)).
- [ ] **Guardian-consent flow scaffolded:** privacy-policy popup and recorded opt-in before any child media is
      captured, with the configurable retention policy in place ([ADR-0009](adr/0009-minors-data-retention.md)).
- [ ] Global DoD met.

## 2. M1 — Teacher core (libraries, audit lifecycle, evaluation)

PRD §13 M1: resource / case libraries, submit to `Audit` to publish, `Download log`, 五维评价.

- [ ] **Audit lifecycle EARS ACs implemented and tested** (PRD §6.5): submit creates `pending-audit` and
      routes to moderation; un-passed items are invisible to non-authors; `Approve` publishes and writes an
      immutable `AuditRecord`; `Reject` requires a reason and returns to the author.
- [ ] **`Download log` records account + timestamp** on every full-plan (详案) download (PRD §6.5).
- [ ] **Resource–case bidirectional linking** works (a resource detail links to related cases and back).
- [ ] **`五维雷达图` (Five-dimension radar chart)** generated from the five-domain scale with an assessment
      report (PRD §6.4).
- [ ] **Submit-to-audit turnaround instrumented** (`submission_created` / `audit_decided`) and shown on the
      admin dashboard as a tracked target, not an enforced SLA ([MEASUREMENT.md](MEASUREMENT.md)).
- [ ] **Approve / reject notifications** fire to the teacher with inbox fallback
      ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] Content-moderation gate exercised on the upload path; role visibility tested for the libraries.
- [ ] Global DoD met.

## 3. M2 — Co-education and the parent client

PRD §13 M2: garden moments, parent-child tasks, monthly / term evaluation + radar, notices via `订阅消息`,
parent client.

- [ ] **Garden-moment EARS AC** (PRD §6.6): a published `Garden moment` is visible only to that child's
      guardians, after moderation.
- [ ] **Parent-child tasks** publishable with requirements and deadline; parents submit moderated feedback;
      teachers see completion (PRD §6.6 / §6.7).
- [ ] **Monthly and term evaluation + radar** complete; `Term evaluation` produces the radar, the assessment
      report, and an exportable / publishable result (PRD §6.6).
- [ ] **Parent client visibility enforced:** the client never references staff modules and the server denies
      any staff-module request (PRD §6.7, structure judge).
- [ ] **`订阅消息` notifications with inbox fallback** for new notice, new task, feedback received, garden
      moment, and evaluation published ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] **Parent and teacher weekly-active events** instrumented; garden-moment cadence measurable per class
      ([MEASUREMENT.md](MEASUREMENT.md)).
- [ ] **Guardian consent enforced** before any child media is published ([ADR-0009](adr/0009-minors-data-retention.md)).
- [ ] Global DoD met.

## 4. M3 — Governance and remaining modules

PRD §13 M3: party-building management, administrative coordination, teaching-research study, the full
`PC backend`, and `成长册` export.

- [ ] **`党建管理` and `综合协调`** ship view-first on mobile with uploads in the `PC backend` (PRD §6.2 / §6.3).
- [ ] **`教研培训` study** holds notices, materials, and feedback, with backend feedback extraction (PRD §6.4).
- [ ] **Full `PC backend`** delivers user / content / `Audit` / co-construction-task / data management; the
      audit queue records who / when / why and routes flagged content to manual re-review (PRD §6.8).
- [ ] **`成长册` (Growth book) export** assembles selected content from a template, previews, and renders
      server-side (PRD §6.6).
- [ ] **`PC backend` admin-only** enforced: any non-admin is denied (PRD §6.8, structure judge).
- [ ] **Admin audit-pending notification** wired (in-app queue primary, `订阅消息` best-effort)
      ([NOTIFICATIONS.md](NOTIFICATIONS.md)).
- [ ] Content-moderation gate verified on every remaining UGC path; role visibility tested across all eight
      modules.
- [ ] Global DoD met.

## 5. M4 — Hardening and launch

PRD §13 M4: performance, accessibility, compliance review, `体验版` pilot, WeChat `审核`, public release.

- [ ] **Performance budget proven:** main package <= 2MB, total <= ~30MB, sub-packages split, heavy screens
      lazy-loaded, media in `OSS` (PRD §12) — measured, not assumed.
- [ ] **Accessibility audited** end-to-end: touch targets, AA contrast, CJK legibility, no colour-only state
      (PRD §12).
- [ ] **Compliance review passed** by the compliance-sentinel: `内容安全` on all UGC, `ICP filing`,
      `WeChat verification`, education `类目` / `资质`, and `未成年人数据` consent + retention all confirmed
      (PRD §8.2).
- [ ] **Zero moderation-bypass verified** by the reconciliation control reading 0 ([MEASUREMENT.md](MEASUREMENT.md)).
- [ ] **`体验版` (trial) pilot ready** as the 2026-09-01 fallback for whitelisted users, in case public
      `审核` slips ([ADR-0008](adr/0008-launch-timeline-and-pilot.md)).
- [ ] **WeChat `审核` submission packaged** with all required materials; `ICP filing` and `WeChat verification`
      complete for public go-live.
- [ ] All E2E smoke tests pass (no console errors, links resolve, accessibility passes, CJK renders) (PRD §11).
- [ ] Global DoD met.
