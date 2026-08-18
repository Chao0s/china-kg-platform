# Analytics — success metrics, habit signals and personalization

- **Status:** Build-ready spec v0.2 (merged 2026-08-19 from the former `MEASUREMENT.md` and `PERSONALIZATION.md`).
- **Date:** 2026-06-18 / 2026-06-21, revised 2026-08-19
- **Scope:** Two related but deliberately separate data streams — the **metric stream** that makes the
  [PRD.md](PRD.md) §3.2 success targets countable, and the **personalization stream** that will drive
  `个性化推荐` in v1.x. They are merged here because the single most important rule about them is how they
  differ, and that rule is easier to enforce when both are described in one place.

> **Revised 2026-08-19.** The source of record is now **PostgreSQL 16 on the Tencent instance**, not Alibaba
> `RDS` — see [ADR-0014](adr/0014-cloud-vendor-tencent.md), which supersedes ADR-0004 on vendor. The
> authoritative table names are in `../hualong-backend/db/01_schema.sql`.

---

# Part A — Success metrics

This part turns each target in PRD §3.2 into something the platform can actually count. The targets
themselves remain pending 园方 confirmation; the **definitions and instrumentation** below are the engineering
contract and do not wait on that confirmation.

## A1. Key measurement decisions

1. **"Weekly active" means a meaningful, role-relevant action — not an app-open.** A user is weekly active if
   they perform at least one role-relevant action in a rolling 7-day window. A teacher counts when they
   publish, audit, evaluate or upload; a parent counts when they view a garden moment, submit task feedback,
   or view an evaluation. Opening the Mini Program, scrolling 首页 or reading a 通知 alone does **not** count.
   This keeps the adoption number honest.
2. **The submit-to-audit turnaround is a tracked target, not an enforced SLA.** The median time from submit to
   an audit decision is computed and displayed against the 24h goal. The system does **not** block, escalate
   or auto-reject when the goal is missed in v1; it surfaces the number so the kindergarten can manage it.
3. **Zero moderation-bypass is a hard invariant, measured as a control rather than a trend.** The count of
   published items that never passed the content-moderation gate must always be 0. It is verified
   structurally (§A3), and a non-zero reading is a P0 incident, not a chart to optimise.
4. **Instrument before you build the feature.** Every metric below names the events it needs, and those events
   are part of each feature's definition of done ([DELIVERY.md](DELIVERY.md)). Emit the event in the same
   change that ships the action, never as a later retrofit, or the first term has no data.

## A2. Metric catalogue

Event names use `snake_case`. Source of record is the relational database unless a lightweight app event is
the only sensible origin.

| Metric | Precise definition | Event(s) to instrument | Source | Surfaces as |
| --- | --- | --- | --- | --- |
| Teacher weekly active rate | Distinct teachers with at least one role-relevant action in a rolling 7-day window, over total teacher accounts. Role-relevant = publish / audit / evaluate / upload. | `teacher_action` `{openid, role, action_type, class_id, ts}` | Derived from the action tables keyed by actor and week; the app event mirrors them for the rollup | Weekly-active gauge against the target, with an 8-week trend |
| Parent weekly active rate | Distinct parents with at least one role-relevant action in a rolling 7-day window, over total parent accounts. Role-relevant = view garden moment / submit task feedback / view evaluation. | `parent_action` `{openid, role, action_type, child_id, class_id, ts}` | Submissions from the database; view actions from the app event, since views are not otherwise persisted | Weekly-active gauge against the target, with an 8-week trend |
| Median submit-to-audit turnaround | Median of (decision time − submission time) over decided submissions in the period. Tracked, not enforced. | `submission_created` `{submission_id, author_openid, type, ts}`; `audit_decided` `{submission_id, admin_openid, decision, ts}` | Submission and audit rows in the database; events mirror them | Median tile against the 24h goal; amber when over, never blocking |
| Resources and cases published | Count of items reaching the published state in the period, split by resource versus case. | `item_published` `{submission_id, type, category, class_id, ts}` | Published rows in the database | Two counters against the first-term targets |
| Children with a completed term evaluation | Distinct children with a completed, radar-generated 学期评价 in the current term, over enrolled children. | `term_eval_completed` `{child_id, class_id, teacher_openid, term, ts}` | Term-evaluation rows where the five-domain scale is complete and the radar is generated | Completion percentage against the target, drillable by class |
| Garden-moment cadence | Average 在园时光 published per class per week (reference: roughly two). | `item_published` filtered to garden moments, grouped by class and week | Published garden-moment rows | Per-class cadence against the reference; classes below cadence highlighted |
| Growth-book finalization rate | Proportion of enrolled children whose book has reached `b2` (published and opened) in the current term. | `book_finalized` `{child_id, class_id, term_id, ts}` | `db_growth_book` rows at `book_status = b2` | Finalization percentage, drillable by class |
| Published items that bypassed moderation | Count of published items whose linked media or text never reached a passed moderation verdict. Hard invariant: must be 0. | No trend event — a reconciliation query plus the structural controls in §A3 | Moderation status joined to published items | Compliance tile reading 0; any non-zero is a P0 alert |

> **Metric renamed 2026-08-19.** What earlier drafts called the growth-book *generation* rate is now the
> **finalization rate** (成长册定稿率／已定稿开放比例). F17 removed generation entirely — there is no file to
> generate. The thing worth counting is whether a child's book reached `b2`.

## A3. The zero-bypass control

The zero moderation-bypass number is not a trend you watch drift; it is an invariant enforced in three places,
consistent with [ADR-0005](adr/0005-mandatory-content-moderation.md):

- **At build time:** `harness/code-review.mjs` flags any UGC write path lacking a `security.*` moderation
  call, so an un-gated publish path cannot merge.
- **At write time:** the server holds every UGC item pending until the `security.msgSecCheck` or
  `security.mediaCheckAsync` verdict returns, so nothing reaches a public collection unchecked.
- **At report time:** a daily reconciliation query joins published items to their moderation verdict. The
  expected result is empty; a non-empty result is a P0 compliance incident.

## A4. Instrumentation notes

- **Rolling windows, not calendar weeks.** Weekly-active is a trailing 7-day window recomputed daily, so a
  Friday launch is not penalised by a short first calendar week.
- **Denominators come from the roster**, so a metric moves only against real enrolment, not against accounts
  that were never provisioned.
- **One account, multiple roles.** Because one `openid` may hold several roles, an action is attributed by the
  role active when it happens, carried on the event, so a teacher who is also a parent is counted correctly in
  each rate.
- **Minimise what is logged about children.** View events carrying a `child_id` exist for cadence and
  active-rate aggregates only. They inherit the access controls and retention policy for 未成年人数据
  ([ADR-0009](adr/0009-minors-data-retention.md)) and are never exposed outside the admin surface.
- **Targets are confirmable in one place.** When 园方 confirms the §3.2 numbers, only the dashboard thresholds
  change; the definitions and events above stay fixed.

---

# Part B — Habit analytics and personalization

The engineering contract for personalization. The signals here are a **separate, consented stream** from the
metric events in Part A and never reuse them. Decisions and rationale live in
[ADR-0011](adr/0011-personalization-and-habit-analytics.md); open items in [GRILLING.md](GRILLING.md).

## B1. The v1 / v1.x split — why personalization does not ship at launch

Per-user algorithmic recommendation plausibly triggers `算法备案` under the 互联网信息服务算法推荐管理规定 — a
*second* regulatory filing on top of 小程序备案, 微信认证 and 类目, all of which already sit on the critical
path. Therefore:

- **v1, ships at launch — foundation only.** Collect the consented, `child_id`-free signal catalogue (§B3) and
  ship **explicit** features (收藏, follow-a-category) that need no profiling. **No LLM, no per-user push, no
  `算法备案`.** Logging from day one means v1.x has history to learn from.
- **v1.x, post-launch — the feature.** The LLM/RAG `兴趣画像` and `个性化推荐`, behind its own compliance gate.

## B2. Who is profiled

- **Teachers — v1.x.** Profiling plus personalized resource and case discovery. A teacher's profile concerns
  *their work*, so there is no minor-proxy risk.
- **Parents — v2, decided separately.** Parents are **not** algorithmically profiled in v1 or v1.x. A parent's
  interests are a proxy for the child (see §B5), and the 家长端 is deliberately minimal. Parents still get
  explicit 收藏 and follow in v1 — self-controlled, not profiling.

## B3. Signal catalogue (adults only)

Every signal is keyed to **`openid` plus active role only** and carries **no `child_id`** (§B4). Every field,
including device model and OS, is declared in the WeChat 用户隐私保护指引 and gated by consent (§B6).

| Class | Signals |
| --- | --- |
| Explicit | 收藏, like, follow-a-category, download, share, search query and filters |
| Implicit | screen views, dwell time, scroll depth, video completion percentage, per-file click rate, notice open and click |
| Work-product (teacher) | teaching-material revisions and versions, publish cadence, audit actions |
| Context | session frequency and recency, active hours, device model and OS (declared personal information) |

## B4. The no-`child_id` invariant — two streams, two rules

- **Metric stream (Part A).** May carry `child_id` for cadence and active-rate aggregates; admin-only;
  inherits the 未成年人数据 access and retention controls.
- **Personalization stream (Part B).** Records **content attributes only** — category (衣/食/住/行/艺),
  five-domain tag, media form, item id — and **never `child_id`**. A view of a child-linked item contributes
  the *item's* content attributes, not the child link.

This is the load-bearing engineering control, and it is enforced structurally rather than by policy alone: the
personalization event schema has no `child_id` field, and `harness/code-review.mjs` should flag any write to a
personalization event table that joins or carries a child identifier.

## B5. Output cap — preference-level, never inference about a child

`兴趣画像` outputs are **content-preference tags only**, for example "engages with video 亲子游戏 content,
active evenings". They must **never** read as a need or a diagnosis, and never as an inference about a child.
The forbidden shape is *"this child likely has separation anxiety"*: that re-derives 未成年人数据 from
adult-only inputs and lands back behind the compliance wall. A parent profile must also never be surfaced to a
teacher in a way that becomes a de-facto child dossier — moot while parents are unprofiled, but the rule
stands for v2.

## B6. Consent, control and rights (teacher, v1.x)

- **Default on, with notice and an off switch.** Personalized discovery is on by default for teachers, an
  employer-provided work tool, with a clear first-use notice and an always-available off toggle in settings.
  This satisfies the `自动化决策` opt-out and right-to-explanation under PIPL art. 24.
- **Data-subject rights.** A teacher can view their 兴趣画像, delete it and withdraw consent. Withdrawal or
  account exit purges the profile immediately and stops collection.
- **Declared collection.** Every collected field appears in the 用户隐私保护指引; device identifiers are
  personal information and are listed explicitly.

## B7. LLM and RAG mechanics (v1.x)

- **Domestic model only, under a data-processing agreement.** Sending personal information to an overseas API
  is a non-starter. **OPEN:** earlier drafts named 通义千问 on Alibaba, on the strength of ADR-0004. ADR-0004
  is now superseded by [ADR-0014](adr/0014-cloud-vendor-tencent.md) and the platform runs on Tencent, so the
  specific model is an open choice again. It must be domestic and covered by a DPA; nothing further is decided.
- **Per-teacher input is forced by the feature.** Building a teacher's tags requires reading that teacher's
  history, so the input is per-user, contractually bounded by the DPA, with output capped per §B5.
- **Aggregate insight is a separate, low-risk output.** A de-identified "top materials and topics this term"
  view on the admin dashboard reuses the Part A plumbing and does **not** trigger `算法备案`.

## B8. Output surfaces

- **Teacher, per-user, v1.x:** a 为你推荐 shelf on 首页 and a re-ranked 资源库 / 案例库.
- **Admin, aggregate and de-identified:** an engagement-insight tile on the dashboard.

## B9. Retention

- **Raw personalization events:** a rolling **24 months**, then purged; the profile is recomputed from the
  window. Twenty-four months covers cross-term and year-over-year teaching patterns, but it carries a heavier
  PIPL data-minimization justification burden than a shorter window — the purpose justification must be
  documented before v1.x build.
- **On withdrawal or account exit:** the profile is purged immediately and collection stops, regardless of the
  rolling window.

## B10. Open questions (legal / 园方)

- Does teacher-only per-user recommendation in an internal staff tool trigger `算法备案`?
- Parent profiling in v2.
- The 24-month retention purpose justification.
- The domestic-LLM DPA terms, and which domestic model now that the vendor has changed (§B7).

None are guessed here. Tracked in [GRILLING.md](GRILLING.md).

---

## Cross-references

- Success targets and acceptance criteria: [PRD.md](PRD.md) §3.2, §7.
- Access control and the threat model: [SECURITY.md](SECURITY.md).
- Definition of done, which requires the events to ship with the feature: [DELIVERY.md](DELIVERY.md).
- Personalization decision record: [ADR-0011](adr/0011-personalization-and-habit-analytics.md).
- Cloud vendor and the source of record: [ADR-0014](adr/0014-cloud-vendor-tencent.md).
- Minors' data retention: [ADR-0009](adr/0009-minors-data-retention.md).
- Field-level data model: `../hualong-backend/db/01_schema.sql`.
