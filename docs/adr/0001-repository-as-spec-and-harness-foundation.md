# ADR-0001: This repository is the spec & quality-harness foundation, not the app code

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Product owner (kindergarten), engineering lead
- **Module / 模块:** repository-wide

## Context / 背景
The kindergarten needs a WeChat Mini Program + PC backend. Before any application code is written, the
team needs an agreed specification, a design system, a terminology contract, and an automated quality
gate so that future code (and AI-assisted contributions) stay consistent, compliant, and on-spec.

> 中文：在写任何应用代码之前，团队需要先有统一的规格、设计系统、术语契约与自动化质量闸门，确保后续代码（含 AI 协作）始终一致、合规、贴合规格。

## Decision / 决策
This repository is the **governance foundation**: bilingual PRD, `DESIGN.md`, a machine-checked glossary,
a judge/hook/test harness, project-specific review subagents, and WeChat research. Application source
(`miniprogram/` or `src/` for uni-app/Taro, plus CloudBase/server) will be added later — either here as
new top-level folders or in a sibling repository — and will be governed by this harness.

> 中文：本仓库是“治理基座”，先交付双语 PRD、`DESIGN.md`、可校验术语表、评审/钩子/测试工具链、项目专属评审子代理与微信调研。应用代码随后加入并受本工具链约束。

## Alternatives considered / 备选方案
1. **Start coding immediately** — rejected: high rework risk; compliance (内容安全/备案/未成年人数据) is hard to retrofit; AI contributions drift without a spec.
2. **Spec in a wiki/Notion** — rejected: not version-controlled with code, not machine-enforceable, no bilingual parity checks.

## Consequences / 影响
- **Positive / 正面:** every later change is gated; terminology and design stay coherent; onboarding is a single repo.
- **Negative / 负面:** upfront effort before visible app features; contributors must learn the harness.
- **Compliance / 合规:** compliance requirements are captured as first-class spec + ADRs before they become code debt.
