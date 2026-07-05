<!--
  Pull request checklist · 拉取请求检查清单
  化龙镇中心幼儿园电子资源平台 / Hualong Kindergarten Electronic Resource Platform
  Please complete the bilingual checklist below before requesting review.
  请在请求评审前完成以下双语检查清单。
-->

## 摘要 · Summary

<!-- 简述这次改动做了什么、为什么。 / Briefly describe what changed and why. -->



## 检查清单 · Checklist

- [ ] **门禁本地通过 · Gate passes locally** — 运行 `npm run gate` 全部通过。 Ran `npm run gate` and all checks pass.
- [ ] **术语一致 · Glossary terms respected** — 遵循 `docs/glossary.json` 的规范术语，未使用禁用变体。 Follows the canonical terms in `docs/glossary.json`; no forbidden variants.
- [ ] **双语文档已更新 · Bilingual docs updated** — 中英文档同步更新（如 PRD / DESIGN）。 Chinese and English docs updated together where applicable (e.g. PRD / DESIGN).
- [ ] **设计评审通过 · Design-judge pass** — 设计判官（`npm run judge:design`）通过，遵循 8pt 网格与设计令牌。 Design judge passes; follows the 8pt grid and design tokens.
- [ ] **合规已考虑 · Compliance considered** — 已评估内容安全（content moderation）、备案（ICP filing）、未成年人数据（minors&rsquo; data）的影响。 Assessed impact on content moderation, ICP filing, and minors&rsquo; data.
- [ ] **测试已新增/更新 · Tests added or updated** — 为改动新增或更新了测试（`node --test tests/`）。 Added or updated tests for the change.

## 备注 · Notes

<!-- 评审者需要了解的其它信息（截图、权衡、后续项）。 / Anything else reviewers should know (screenshots, trade-offs, follow-ups). -->
