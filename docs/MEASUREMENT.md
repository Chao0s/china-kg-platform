# MEASUREMENT.md — Making the §3.2 success metrics measurable

- **Status:** Build-ready spec (derived from [PRD.md](PRD.md) §3.2 / §7, [GRILLING.md](GRILLING.md) item G)
- **Date:** 2026-06-18
- **Scope:** Every PRD §3.2 success metric mapped to a precise definition, the analytics event(s) that
  instrument it, the data source of record, and where it surfaces in the `PC backend` admin dashboard.

This document turns each target in PRD §3.2 into something the platform can actually count. Targets
themselves remain pending 园方 confirmation ([GRILLING.md](GRILLING.md) item G); the *definitions and
instrumentation* below are the engineering contract and do not wait on that confirmation.

## 1. Key measurement decisions

These decisions resolve the ambiguity in the §3.2 table. Build to them.

1. **"Weekly active" means a meaningful, role-relevant action — not an app-open.** A user is weekly active
   if they perform at least one role-relevant action in a rolling 7-day window. A teacher counts when they
   publish, audit, evaluate, or upload; a parent counts when they view a garden moment, submit task
   feedback, or view an evaluation. Opening the Mini Program, scrolling `Home`, or reading a `Notice` alone
   does **not** count. This keeps the adoption number honest (real usage, not passive launches).
2. **The submit-to-audit turnaround is a tracked target, not an enforced SLA.** The median time from a
   teacher pressing submit to an admin `Audit` decision is computed and displayed on the admin dashboard
   against the 24h goal. The system does **not** block, escalate, or auto-reject when the goal is missed in
   v1; it surfaces the number so the kindergarten can manage it. (An SLA with escalation is a later option.)
3. **Zero moderation-bypass is a hard invariant, measured as a control, not a trend.** The count of
   published items that never passed the content-moderation gate must always be 0. This is verified
   structurally (see §3) rather than observed after the fact, and a non-zero reading is a P0 incident.
4. **Instrument before you build the feature.** Every metric below names the events it needs. Those events
   are part of each feature's Definition of Done ([DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md)) — emit the
   event in the same change that ships the action, never as a later retrofit, or the first term has no data.

## 2. Metric catalogue

Event names use `snake_case`; properties are the minimum needed to compute the metric and to slice it by
class or role on the dashboard. Source of record is Alibaba `RDS` (the relational truth, [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md))
unless a lightweight app event is the only sensible origin.

| Metric | Precise definition | Event(s) to instrument (name + key properties) | Source (RDS table / app event) | Surfaces on admin dashboard as |
|---|---|---|---|---|
| Teacher weekly active rate | Distinct teachers with >= 1 role-relevant action in a rolling 7-day window, over total teacher accounts. Role-relevant = publish / audit / evaluate / upload. | `teacher_action` `{openid, role, action_type in [publish_moment, submit_resource, submit_case, audit_decision, eval_submit, upload], class_id, ts}` | Derived from action tables (`Submission`, `AuditRecord`, `GardenMoment`, `TermEvaluation`, `MonthlyEvaluation`) keyed by actor + week; `teacher_action` app event mirrors them for the rollup | Weekly-active gauge vs >= 80% target, with 8-week trend |
| Parent weekly active rate | Distinct parents with >= 1 role-relevant action in a rolling 7-day window, over total parent accounts. Role-relevant = view garden moment / submit task feedback / view evaluation. | `parent_action` `{openid, role, action_type in [view_moment, submit_feedback, view_evaluation], child_id, class_id, ts}` | `TaskFeedback` for submissions (RDS); view actions from the `parent_action` app event (views are not otherwise persisted) | Weekly-active gauge vs >= 60% target, with 8-week trend |
| Median submit-to-audit turnaround | Median of (audit decision time minus submission time) over decided submissions in the period. Tracked target, not enforced. | `submission_created` `{submission_id, author_openid, type in [resource, case], ts}`; `audit_decided` `{submission_id, admin_openid, decision in [approve, reject], ts}` | `Submission.created_at` and `AuditRecord.decided_at` in RDS (events mirror them) | Median turnaround tile vs <= 24h goal; flagged amber when over, never blocking |
| Resources / cases published | Count of items reaching the published state in the period, split by resource vs case. | `item_published` `{submission_id, type in [resource, case], category, class_id, ts}` | `Submission` rows with status = published, or `Resource` / `Case` published rows (RDS) | Two counters vs >= 100 resources and >= 50 cases first-term targets |
| Children with a completed term evaluation | Distinct children with a completed (radar-generated, published) `Term evaluation` in the current term, over enrolled children. | `term_eval_completed` `{child_id, class_id, teacher_openid, term, ts}` | `TermEvaluation` rows where the five-domain scale is complete and the radar is generated (RDS) | Completion percentage vs 100%-of-enrolled target, drillable by class |
| Garden-moment cadence | Average garden moments published per class per week (target roughly 2). | `item_published` filtered to `type = garden_moment`, grouped by `class_id` and week | `GardenMoment` published rows (RDS) | Per-class cadence vs ~2/class/week reference; classes below cadence highlighted |
| Published items that bypassed moderation | Count of published items whose linked `MediaAsset` / text never reached a passed moderation verdict. Hard invariant: must be 0. | No trend event — a reconciliation query plus the structure / code-review controls (see §3) | `MediaAsset.moderation_status` joined to published items in RDS; `harness/code-review.mjs` invariant at build time | Compliance tile reading 0; any non-zero is a P0 alert, not a chart |

## 3. The zero-bypass control (how the hard metric is guaranteed)

The "zero moderation-bypass" number is not a dashboard trend you watch drift; it is an invariant enforced
in three places, consistent with [ADR-0005](adr/0005-mandatory-content-moderation.md) and PRD §8.2:

- **At build time:** `harness/code-review.mjs` flags any UGC write path that lacks a `security.*` moderation
  call, so an un-gated publish path cannot merge.
- **At write time:** the server holds every UGC item in a pending state until the `security.msgSecCheck` /
  `security.mediaCheckAsync` verdict returns, so nothing reaches a public collection un-checked.
- **At report time:** a daily reconciliation query joins published items to their moderation verdict; the
  expected result is empty. A non-empty result is a P0 compliance incident, surfaced on the dashboard as a
  red 0-or-broken tile rather than as a metric to optimise.

## 4. Instrumentation notes

- **Rolling windows, not calendar weeks.** Weekly-active is a trailing 7-day window recomputed daily, so a
  Friday launch is not penalised by a short first calendar week.
- **Denominators come from the roster.** Active-rate denominators (total teachers, total parents, enrolled
  children) are read from `User management` / roster data in RDS, so a metric moves only against real
  enrolment, not against accounts that were never provisioned.
- **One account, multiple roles.** Because one `openid` may hold several roles
  ([ADR-0003](adr/0003-client-framework.md)), an action is attributed by the role active when it happens
  (carried on the event), so a teacher-who-is-also-a-parent is counted correctly in each rate.
- **Minimise what is logged about children.** View events that mention a `child_id` are aggregates for
  cadence and active-rate only; they inherit the access controls and retention policy for `未成年人数据`
  ([ADR-0009](adr/0009-minors-data-retention.md)) and are never exposed outside the admin surface.
- **Targets are confirmable in one place.** When 园方 confirms the §3.2 numbers, only the dashboard target
  thresholds change; the definitions and events above stay fixed.
