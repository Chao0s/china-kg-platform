# ADR-0010: Legal subject (主体) for the Mini Program account

- **Status:** Accepted — **Path A confirmed 2026-08-11**. The subject is the kindergarten itself, 广州市番禺区化龙镇中心幼儿园, as a 事业单位. The ICP filing was opened against that subject on 2026-08-11 and is in progress. This item is no longer a blocker.
- **Date:** 2026-06-18 (resolved 2026-08-11)
- **Deciders:** 园方 / 教育局
- **Module / 模块:** compliance / account

## Context / 背景
The Mini Program account subject (主体) gates 小程序备案, 微信认证, and the education 类目/资质. A public
kindergarten (公办幼儿园) is typically a 事业单位法人 and can be the subject itself; if it lacks independent
法人 status, the 教育局/镇政府 must be the subject and delegate use. This was the first thing the launch
timeline depended on ([ADR-0008](0008-launch-timeline-and-pilot.md)), and it blocked the compliance track
until it was settled.

> 中文：小程序主体决定备案、微信认证与教育类目/资质。公办幼儿园通常为事业单位法人，可自任主体；若不具备独立法人资格，则须由教育局/镇政府作为主体并授权使用。此项曾是上线时间链条的第一环，未定之前合规链条无法启动。

## Decision / 决策
**Path A, confirmed 2026-08-11.** The kindergarten is the subject in its own right: 广州市番禺区化龙镇中心幼儿园,
a 事业单位. The ICP filing was opened against that subject on the same date and names the Tencent Cloud server
resource that hosts the platform. Path B was not needed.

> 中文：路径 A，2026-08-11 确认。主体为广州市番禺区化龙镇中心幼儿园（事业单位），并已于同日以该主体提交 ICP 备案，登记的服务器资源即平台所在的腾讯云实例。路径 B 未启用。

The two paths as originally recorded, kept for history:
- **Path A (preferred if eligible):** the kindergarten registers as a 事业单位法人 subject and owns the account, 认证, and data.
- **Path B:** the 教育局/镇政府 is the subject and delegates operation to the kindergarten.

> 中文（历史记录）：路径 A：幼儿园以事业单位法人身份注册并拥有账号、认证与数据；路径 B：由教育局/镇政府作为主体并授权幼儿园运营。

## Consequences / 影响
- **Positive / 正面:** with the subject settled, 备案 / 认证 / 类目 are unblocked and the ICP filing is in progress. The kindergarten owns the account, the 认证 and the data outright — no delegation agreement is needed.
- **Negative / 负面:** the item stayed open from 2026-06-18 to 2026-08-11, and the whole compliance chain waited behind it. That delay is now carried by the launch date, which [ADR-0008](0008-launch-timeline-and-pilot.md) fixes at 2026-09-01.
- **Compliance / 合规:** prerequisite for every other compliance step, now met. 小程序备案 is per-AppID, so two Mini Programs mean two filings, two 微信认证 and two review submissions. As the subject is a 事业单位 rather than the developer, the developer processes minors' data as an entrusted party under PIPL — that agreement is still unsigned (gap G26).
