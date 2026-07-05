# ADR-0010: Legal subject (主体) for the Mini Program account — to confirm

- **Status:** Open (blocker — confirm before the compliance track starts)
- **Date:** 2026-06-18
- **Deciders:** 园方 / 教育局
- **Module / 模块:** compliance / account

## Context / 背景
The Mini Program account subject (主体) gates 小程序备案, 微信认证, and the education 类目/资质. A public
kindergarten (公办幼儿园) is typically a 事业单位法人 and can be the subject itself; if it lacks independent
法人 status, the 教育局/镇政府 must be the subject and delegate use. This is unconfirmed and is the first thing
the launch timeline depends on ([ADR-0008](0008-launch-timeline-and-pilot.md)).

> 中文：小程序主体决定备案、微信认证与教育类目/资质。公办幼儿园通常为事业单位法人，可自任主体；若不具备独立法人资格，则须由教育局/镇政府作为主体并授权使用。此项未定，且是上线时间链条的第一环。

## Decision / 决策
Undecided — record both paths and confirm with 园方/教育局 immediately, because nothing in the compliance
track can start until the subject exists.
- **Path A (preferred if eligible):** the kindergarten registers as a 事业单位法人 subject and owns the account, 认证, and data.
- **Path B:** the 教育局/镇政府 is the subject and delegates operation to the kindergarten.

> 中文：暂未决——记录两条路径并立即与园方/教育局确认，因为主体未定则合规链条无法启动。路径 A（若符合条件优先）：幼儿园以事业单位法人身份注册并拥有账号、认证与数据；路径 B：由教育局/镇政府作为主体并授权幼儿园运营。

## Consequences / 影响
- **Positive / 正面:** confirming early unblocks 备案/认证/类目 and protects the 2026-09-01 date.
- **Negative / 负面:** delay here cascades directly into the launch risk.
- **Compliance / 合规:** prerequisite for every other compliance step. Tracked as the top open item in [GRILLING.md](../GRILLING.md).
