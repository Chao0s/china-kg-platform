# PERSONALIZATION.md — Habit analytics, interest profiling, and personalized recommendation

- **Status:** Build-ready spec for the v1 foundation; v1.x feature deferred (see [ADR-0011](adr/0011-personalization-and-habit-analytics.md))
- **Date:** 2026-06-21
- **Scope:** How the platform collects adult (teacher / parent) habit signals, derives an `兴趣画像`
  (Interest profile), and drives `个性化推荐` (Personalized recommendation) — and the hard line that keeps
  all of it clear of `未成年人数据` (Minors' data) and of an avoidable second compliance filing.

This document is the engineering contract for personalization. It complements [MEASUREMENT.md](MEASUREMENT.md)
(which instruments the §3.2 *success metrics*); the signals here are a **separate, consented stream** for
*personalization*, never reusing the metric events. Decisions and their rationale live in
[ADR-0011](adr/0011-personalization-and-habit-analytics.md); open items are tracked in [GRILLING.md](GRILLING.md) §I.

## 1. The v1 / v1.x split (why personalization does not ship at launch)

Per-user algorithmic recommendation plausibly triggers `算法备案` (Algorithm filing) under the
互联网信息服务算法推荐管理规定 — a *second* regulatory filing on top of `小程序备案` / `微信认证` / 类目 — all
of which already sit on the critical path for the hard 2026-09-01 launch ([ADR-0008](adr/0008-launch-timeline-and-pilot.md))
and cannot start until the 主体 is confirmed ([ADR-0010](adr/0010-legal-subject.md)). Therefore:

- **v1 (ships at launch) — foundation only.** Collect the consented, `child_id`-free signal catalogue (§3) and
  ship **explicit** features (`收藏` / follow-a-category) that need no profiling. **No LLM, no per-user push,
  no `算法备案`.** Logging from day 1 means v1.x has history to learn from.
- **v1.x (post-launch) — the feature.** The LLM/RAG `兴趣画像` + `个性化推荐`, behind its own compliance gate
  (`算法备案` if confirmed applicable, a domestic-LLM data-processing agreement, and the consent flow in §6).

## 2. Who is profiled

- **Teachers — v1.x.** Profiling + personalized resource/case discovery. A teacher's profile is about *their
  work*, so there is no minor-proxy risk.
- **Parents — v2, decided separately.** Parents are **not** algorithmically profiled in v1 or v1.x. A parent's
  interests are a proxy for the child (the back-door inference in §5), and the `家长端` is deliberately minimal.
  A future v2 decision gets its own grilling round and ADR. Parents still get **explicit** `收藏` / follow in
  v1 — self-controlled, not profiling.

## 3. Signal catalogue (adults only)

Every signal is keyed to **`openid` + active role only** and carries **no `child_id`** (§4). Every field —
including device model/OS — is declared in the WeChat `用户隐私保护指引` and gated by consent (§6).

| Class | Signals |
|---|---|
| Explicit | `收藏`, like, follow-a-category, download, share, search query + filters |
| Implicit | screen views, dwell time, scroll depth, video completion %, per-file click rate, notice open/click |
| Work-product (teacher) | teaching-material revisions / versions, publish cadence, audit actions |
| Context | session frequency / recency, active hours, device model + OS (declared personal info) |

## 4. The no-`child_id` invariant (two separate streams)

Personalization signals and the MEASUREMENT.md metric events are **different streams with different rules**:

- **Metric stream (MEASUREMENT.md).** May carry `child_id` for cadence / active-rate aggregates; admin-only;
  inherits the `未成年人数据` access + retention controls ([ADR-0009](adr/0009-minors-data-retention.md)).
- **Personalization stream (this doc).** Records **content attributes only** — category (衣/食/住/行/艺),
  five-domain tag, media form, resource/case id — and **never `child_id`**. A view of a child-linked item
  contributes the *item's content attributes*, not the child link.

This invariant is the load-bearing engineering control. It is enforced structurally, not by policy alone: the
personalization event schema has no `child_id` field, and `harness/code-review.mjs` should flag any write to a
personalization event table that joins or carries a child identifier.

## 5. Output cap — preference-level, never inference about a child

`兴趣画像` outputs are **content-preference tags only** — e.g. "engages with video 亲子游戏 content, active
evenings". They must **never** read as a need or diagnosis, and never as an inference about a child. The
forbidden shape is *"this child likely has separation anxiety"*: that re-derives `未成年人数据` from
adult-only inputs and lands back behind the compliance wall. A parent profile must also never be surfaced to a
teacher in a way that becomes a de-facto child dossier (moot while parents are unprofiled, but the rule stands
for v2).

## 6. Consent, control, and rights (teacher v1.x)

- **Default ON + notice + off switch.** Personalized discovery is on by default for teachers (an
  employer-provided work tool), with a clear first-use notice and an always-available OFF toggle in settings.
  This satisfies the `自动化决策` (PIPL Art 24) opt-out and right-to-explanation.
- **Data-subject rights.** A teacher can view their `兴趣画像`, delete it, and withdraw consent. Withdrawal or
  account exit purges the profile immediately and stops collection.
- **Declared collection.** Every collected field appears in the `用户隐私保护指引`; device identifiers are
  personal information and are listed there explicitly.

## 7. The LLM / RAG mechanics (v1.x)

- **Domestic model only.** The `兴趣画像` summarization and any RAG retrieval run on a **domestic** model
  (通义千问 on Alibaba, consistent with [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md)) under a
  data-processing agreement. Sending personal information to an overseas API is a non-starter.
- **Per-teacher input is forced by the feature.** Building a teacher's tags requires reading that teacher's
  history → per-user input, contractually bounded by the DPA, output capped per §5.
- **Aggregate insight is a separate, low-risk output.** A de-identified "top materials / topics this term"
  view on the admin dashboard reuses the MEASUREMENT.md plumbing and does **not** trigger `算法备案`.

## 8. Output surfaces

- **Teacher (per-user, v1.x):** a `为你推荐` shelf on `首页` and a re-ranked `资源库` / `案例库`.
- **Admin (aggregate, de-identified):** an engagement-insight tile on the MEASUREMENT admin dashboard.

## 9. Retention

- **Raw personalization events:** rolling **24 months**, then purged; the profile is recomputed from the
  window. (24 months covers cross-term / year-over-year teaching patterns; it carries a heavier PIPL
  data-minimization justification burden than a shorter window — the purpose justification must be documented
  before v1.x build. See [GRILLING.md](GRILLING.md) §I.)
- **On withdrawal / account exit:** the profile is purged immediately and collection stops, regardless of the
  rolling window.

## 10. Open questions (legal / 园方)

Tracked in [GRILLING.md](GRILLING.md) §I — does teacher-only per-user recommendation in an internal staff tool
trigger `算法备案`?; parent profiling (v2); the 24-month retention purpose justification; and the
domestic-LLM DPA terms. None are guessed here.
