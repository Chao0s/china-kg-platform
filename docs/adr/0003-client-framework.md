# ADR-0003: Client = Native Mini Program + a dedicated PC web admin

- **Status:** Accepted (supersedes the earlier uni-app proposal)
- **Date:** 2026-06-18
- **Deciders:** Product owner, engineering lead
- **Module / 模块:** client (Mini Program + PC backend)

## Context / 背景
The product needs a WeChat Mini Program (admin / teacher / parent roles) and a PC backend that is a
desktop-ergonomic CMS (data tables, bulk upload, user and audit management). The candidates were native
Mini Program, uni-app (Vue), and Taro (React); the PC backend could be an H5 build of the same codebase or a
dedicated web app. See [`docs/research/wechat-miniprogram.md`](../research/wechat-miniprogram.md).

> 中文：产品需小程序（管理端/教师端/家长端）与一个桌面化的 PC 后台 CMS（表格、批量上传、用户与审核管理）。候选有原生小程序、uni-app(Vue)、Taro(React)；PC 后台可为同一代码的 H5 版或独立网页应用。

## Decision / 决策
- **Mini Program = Native** (WXML/WXSS/JS) — maximum performance, first-class access to the newest WeChat APIs (notably the mandatory `security.*` content-moderation and 订阅消息), smallest package, and the easiest profile to staff in China.
- **PC backend = a dedicated web admin** built with Element Plus / Ant Design Pro — purpose-built desktop ergonomics for bulk/table/admin work, decoupled from the Mini Program.
- Two codebases is an accepted cost for fitness-to-purpose on both surfaces.

> 中文：小程序采用原生（WXML/WXSS/JS）——性能最佳、最先获得最新微信能力（尤其强制的 security.* 内容安全与订阅消息）、包体最小、在国内最易招人；PC 后台采用基于 Element Plus / Ant Design Pro 的独立网页应用——为批量/表格/管理场景定制，独立于小程序。接受“两套代码”的代价以换取两端各自最优。

## Alternatives considered / 备选方案
| Option | Why not chosen |
|---|---|
| **uni-app (Vue 3)** | One codebase, but abstraction over native WeChat APIs and a constrained desktop-admin UX from an H5 build. |
| **Taro (React)** | Same cross-platform caveats; React for Mini Programs is less common in small CN orgs. |
| **Shared H5 admin** | Reuses code but gives a weaker desktop CMS UX for bulk/table operations. |

## Consequences / 影响
- **Positive / 正面:** best Mini Program quality + newest APIs; a proper desktop CMS; clear, hireable skill sets.
- **Negative / 负面:** two codebases to build and maintain — significant for a small team on a fixed date ([ADR-0008](0008-launch-timeline-and-pilot.md)); shared logic (validation, API client, types) must be deliberately factored.
- **Compliance / 合规:** native gives the most reliable path to `security.*` moderation ([ADR-0005](0005-mandatory-content-moderation.md)); animation constraints in [ADR-0007](0007-render-engine-and-animation.md).
