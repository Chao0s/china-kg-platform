# ADR-0011: Adults-only, deferred personalization and habit analytics

- **Status:** Proposed (v1 foundation accepted; v1.x feature; parts pending 园方 / legal)
- **Date:** 2026-06-21
- **Deciders:** Product owner, legal / 园方
- **Module / 模块:** teaching-research, compliance

## Context / 背景
The kindergarten wants to track usage habits and later summarize each user's interests (via LLM / RAG) to
surface what they favor. The data subjects are **adults** — teachers and parents; children never log in. But
behavior usually maps to an identifiable child, and the moment a habit signal is keyed to a child it becomes
`未成年人数据` (Minors' data), where profiling minors and pushing personalized content at them is restricted.
Separately, per-user algorithmic recommendation plausibly triggers `算法备案` (Algorithm filing), a second
regulatory filing on top of the launch-critical `小程序备案` / `微信认证` / 类目. We need a shape that delivers
the value without endangering the 2026-09-01 launch or the minors'-data boundary.

> 中文：园方希望记录使用习惯，并在后续用 LLM / RAG 归纳每位用户的兴趣偏好。数据主体是成人（教师与家长），
> 幼儿不登录。但行为常可对应到具体幼儿；一旦习惯信号绑定到幼儿，即构成未成年人数据，而对未成年人画像与个性化
> 投放受到严格限制。另外，按用户的算法推荐可能触发算法备案，叠加在上线关键路径上的小程序备案／微信认证／类目
> 之上。需要一种既取得价值、又不危及 2026-09-01 上线与未成年人数据边界的方案。

## Decision / 决策
Build personalization as an **adults-only**, **deferred** capability with a hard data boundary.

1. **Split v1 / v1.x.** v1 ships only the consented, `child_id`-free signal foundation plus **explicit**
   features (`收藏` / follow-a-category) — no LLM, no per-user push, **no `算法备案` at launch**. The LLM/RAG
   `兴趣画像` + `个性化推荐` ship in **v1.x** behind their own compliance gate.
2. **Teachers first; parents are a separate v2 decision.** Only teachers are profiled in v1.x. Parents are
   never algorithmically profiled in v1/v1.x (their interests proxy the child); a v2 decision gets its own
   grilling + ADR. Parents still get explicit `收藏` / follow.
3. **No `child_id` on personalization signals.** Personalization events carry content attributes only and
   never a child identifier — a stream separate from the MEASUREMENT.md metric events (which may carry
   `child_id` for admin-only aggregates).
4. **Outputs capped at preference-level.** `兴趣画像` outputs are content-preference tags, never a need /
   diagnosis or any inference about a child.
5. **Consent default ON + notice + off switch (teachers).** Satisfies the `自动化决策` (PIPL Art 24) opt-out
   and right-to-explanation; teachers can view / delete the profile and withdraw (which purges it).
6. **Domestic LLM under a DPA.** The summarization / RAG runs on a domestic model (通义千问 on Alibaba,
   [ADR-0004](0004-backend-cloudbase-vs-alibaba.md)); no personal information goes to an overseas API.
   Raw signals are retained on a rolling 24-month window; the profile is recomputed and purged on withdrawal.

> 中文：将个性化建设为「仅面向成人、延后交付」且带硬性数据边界的能力。（1）拆分 v1／v1.x：v1 仅交付知情同意、
> 去除 child_id 的信号底座与显式功能（收藏／关注分类），不含 LLM、不做按人投放、上线不做算法备案；LLM/RAG 的
> 兴趣画像与个性化推荐在 v1.x 交付并通过其自身合规闸门。（2）教师优先，家长为单独的 v2 决策：v1/v1.x 仅对教师
> 画像，家长不做算法画像（其兴趣是幼儿的代理变量），家长画像另行 grilling 并立 ADR；家长仍可使用显式收藏／
> 关注。（3）个性化信号不含 child_id：仅记录内容属性，与 MEASUREMENT.md 的指标事件分流（后者可含 child_id 用于
> 仅管理端的聚合）。（4）输出仅限偏好层级：兴趣画像只产出内容偏好标签，绝不含对幼儿的需求判断或推断。（5）教师
> 默认开启＋告知＋关闭开关：满足自动化决策（个人信息保护法第 24 条）的退出权与解释权；教师可查看／删除画像并
> 撤回（撤回即清除）。（6）国内模型＋数据处理协议：归纳／检索在国内模型（阿里云通义千问，ADR-0004）上运行，
> 个人信息不出境；原始信号按 24 个月滚动留存，画像可重算，撤回即清除。

## Alternatives considered / 备选方案
1. **Full personalization inside v1** — rejected; stacks `算法备案` + a domestic-LLM DPA onto an already-tight
   launch critical path that cannot start until the 主体 is confirmed.
2. **Profile parents too (or instead)** — deferred to v2; a parent interest profile is a back-door inference
   about a minor, and the `家长端` is deliberately minimal.
3. **Drop personalization entirely** — rejected; the teacher resource-discovery value is real and is
   achievable at low risk once the foundation and gates are in place.
4. **Keep `child_id` on signals for richer modeling** — rejected; it converts the whole stream into
   `未成年人数据` and forfeits the boundary that makes the rest defensible.

> 中文：（1）v1 内做全量个性化——否决，将算法备案与国内模型数据处理协议压到本已紧张、且须先确认主体方能启动的
> 上线关键路径上。（2）同时／改为对家长画像——延后至 v2；家长兴趣画像是对未成年人的间接推断，且家长端刻意保持
> 精简。（3）完全不做个性化——否决；教师资源发现的价值真实存在，在底座与闸门就位后可低风险实现。（4）信号保留
> child_id 以增强建模——否决；这会把整条数据流变为未成年人数据，丧失使其余设计得以成立的边界。

## Consequences / 影响
- **Positive / 正面:** the hard launch date is protected (no second filing at launch); the minors'-data
  boundary is structural (no `child_id` field on the stream), not merely a policy; teacher value lands in v1.x
  with a clear, auditable consent + rights story.
- **Negative / 负面:** the interest-summary value is delayed to post-launch; the 24-month retention carries a
  heavier data-minimization justification burden; parent personalization is left unresolved (v2).
- **Compliance / 合规:** governed by PIPL (`自动化决策`, Art 24) + the minors' online-protection regulation;
  pairs with [ADR-0009](0009-minors-data-retention.md) (minors' retention) and depends on
  [ADR-0010](0010-legal-subject.md) (主体). Open items — `算法备案` applicability for an internal staff tool,
  the DPA terms, the 24-month justification, and parent profiling — are tracked in [GRILLING.md](../GRILLING.md) §I.
  Build detail in [PERSONALIZATION.md](../PERSONALIZATION.md).
