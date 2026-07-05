# ADR-0009: Minors' data retention and guardian consent (configurable; period pending legal)

- **Status:** Proposed (period pending 园方 / legal confirmation)
- **Date:** 2026-06-18
- **Deciders:** Product owner, legal / 园方
- **Module / 模块:** co-education, compliance

## Context / 背景
The platform stores children's sensitive data (photos, videos, evaluations). PIPL and the minors'
online-protection regulation require explicit guardian consent, data minimization, strict access, and a
defined retention period. The exact period after a child graduates or leaves is a legal/园方 decision, not an
engineering one.

> 中文：平台存储幼儿敏感数据（照片、视频、评价）。个人信息保护法与未成年人网络保护条例要求监护人明示同意、数据最小化、严格访问与明确留存期限。幼儿离园后的具体期限属法务/园方决定，非工程决定。

## Decision / 决策
Build a **configurable retention policy** plus a **guardian consent flow**, rather than hard-coding a period.
- Consent: a privacy-policy popup + explicit guardian opt-in before any child media is captured/published; consent state is recorded.
- Retention: an admin-configurable period with auto-archive/delete after expiry; guardians can request export (成长册) or deletion at any time.
- The default period is left blank until 园方/legal confirms (candidate: through enrollment + a 1-year grace for export).

> 中文：构建可配置的留存策略与监护人同意流程，而非写死期限。同意：采集/发布前弹出隐私政策并由监护人明示勾选，记录同意状态；留存：管理员可配置期限，到期自动归档/删除，监护人可随时申请导出（成长册）或删除；默认期限待园方/法务确认（候选：在园期间 + 1 年导出宽限）。

## Alternatives considered / 备选方案
1. **Hard-code a fixed period** — rejected; the lawful period is a 园方/legal call and varies.
2. **Keep indefinitely** — rejected; violates data-minimization.

## Consequences / 影响
- **Positive / 正面:** lawful by construction; adapts to the 园方/legal decision without code changes.
- **Negative / 负面:** more configuration + an export/deletion workflow to build.
- **Compliance / 合规:** central to PIPL + 未成年人网络保护条例; pairs with the content-moderation gate ([ADR-0005](0005-mandatory-content-moderation.md)). Open period tracked in [GRILLING.md](../GRILLING.md).
