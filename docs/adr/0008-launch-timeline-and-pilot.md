# ADR-0008: Fixed launch date (2026-09-01) and a 体验版 pilot fallback

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Product owner (mandated externally)
- **Module / 模块:** program / release

## Context / 背景
The public launch date is **2026-09-01**, fixed externally and not the team's to move. That is roughly
10–11 weeks out, while the full scope is all eight modules at full depth, the build team is small
(AI-assisted), and the compliance track (备案 + WeChat 审核) has not started because the legal 主体 is
unconfirmed ([ADR-0010](0010-legal-subject.md)).

> 中文：上线日期硬性定为 2026-09-01，非团队可改；距今约 10–11 周。范围为八大模块全量，团队小（AI 辅助），且因主体未定，合规（备案 + 微信审核）尚未启动。

## Decision / 决策
Plan to hit 2026-09-01. To absorb the one factor outside our control — external review time — keep a
**体验版 (trial) pilot** as the Sep 1 fallback: a whitelisted-tester build that runs before public 备案/审核
complete, so there is always something live for the kindergarten on the date even if the public release
slips. Start the compliance track on day one, build in dependency + compliance order, and parallelize across
the AI-assisted team under this repo's harness.

> 中文：以 2026-09-01 为目标。为吸收唯一不可控因素——外部审核时长——保留体验版作为兜底：面向白名单测试者、可在公开备案/审核完成前运行，确保到期当日园方始终有可用版本。合规第一天启动，按依赖与合规顺序开发，团队在本仓库工具链下并行推进。

## Alternatives considered / 备选方案
1. **Tiered MVP (MoSCoW) public by Sep 1** — rejected by the director; full depth is mandated.
2. **Let the date slip for full scope** — not permitted; the date is fixed.
3. **Add a large agency to force both** — out of the team's control; compliance lead time remains a hard gate regardless.

## Consequences / 影响
- **Positive / 正面:** a concrete, demoable deliverable on the date via the pilot; compliance risk is isolated and started early.
- **Negative / 负面:** schedule pressure is high; quality risk on full-depth scope; the public release may trail the pilot.
- **Compliance / 合规:** 备案 (1–20 working days) + WeChat 审核 are external gates; the pilot path does not bypass them for public release — it only de-risks the date. See [ADR-0005](0005-mandatory-content-moderation.md) and [ADR-0010](0010-legal-subject.md).
