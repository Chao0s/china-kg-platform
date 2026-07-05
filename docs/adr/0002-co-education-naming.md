# ADR-0002: Canonical module name is 家园社共育 (Home-school-community co-education)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Product owner, content lead
- **Module / 模块:** co-education

## Context / 背景
The source flowcharts are internally inconsistent. Flowchart **06** is titled **`家园共育总交互逻辑`**
(home-school co-education) but its root node is labelled **`家园社共育`** (home-school-**community**
co-education), and it explicitly contains a 社区教育 (community education) task type. Flowchart 07 also
references parent-facing co-education content. Using both names interchangeably would fracture the
glossary, navigation labels, and analytics.

> 中文：来源流程图自相矛盾——流程图 06 标题写 `家园共育`，但根节点与内容实为“家园社共育”（含社区教育）。两名混用会割裂术语、导航与统计口径。

## Decision / 决策
The canonical module name is **`家园社共育` (Home-school-community co-education)**, including 社
(community), because the module genuinely contains community-education flows. `家园共育` is recorded as a
**legacy/forbidden variant** in `docs/glossary.json` and flagged by the glossary checker.

> 中文：模块规范名定为“家园社共育”（含“社”），因为模块确实包含社区教育流程。“家园共育”记为旧称/禁用变体，由术语校验器拦截。

## Alternatives considered / 备选方案
1. **Use `家园共育`** (drop 社) — rejected: would misrepresent the included 社区教育 scope.
2. **Allow both** — rejected: terminology drift; breaks the machine glossary contract.

## Consequences / 影响
- **Positive / 正面:** one name across UI, docs, analytics; checker enforces it automatically.
- **Negative / 负面:** the original flowchart title must be read as legacy; a one-line note is needed when referencing flowchart 06.
- **Compliance / 合规:** none directly; community-education content still passes the same UGC moderation gate.
