# CONTEXT.md — Domain Glossary / 领域术语表

> This file is a **glossary and nothing else** (per the `grill-with-docs` discipline). It carries no
> implementation details, no specs, no decisions. Decisions live in [`docs/adr/`](docs/adr/); the
> specification lives in [`docs/PRD.md`](docs/PRD.md).
>
> The **machine-readable source of truth** is [`docs/glossary.json`](docs/glossary.json). The harness
> (`harness/glossary-check.mjs`, `harness/judges/wording_judge.py`) enforces this vocabulary on every
> document. When a term changes, edit `glossary.json` — this file is the human mirror.
>
> 本文件仅为术语表，不含实现细节。决策见 `docs/adr/`，规格见 `docs/PRD.md`。机器可读的唯一来源为
> `docs/glossary.json`，校验工具据此对所有文档强制统一术语。

## How to read an entry / 词条读法

**Canonical 简中 (Canonical English)** — definition. *Avoid:* forbidden variants.

---

## Platform / 平台

- **电子资源平台 (Electronic Resource Platform)** — the product itself: two WeChat Mini Programs (教师端, 家长端) plus a PC后台, serving 化龙镇中心幼儿园.

## Roles / 角色

- **管理端 (Admin client)** — the interface for kindergarten managers: audits, publishing co-construction tasks, content and user management. *Avoid:* 管理版、管理员端、后台端.
- **教师端 (Teacher client)** — the interface for teachers: uploading resources/cases, completing tasks, publishing garden moments and evaluations. *Avoid:* 老师端、教师版.
- **家长端 (Parent client)** — the interface for parents; surfaces **only** home-school-community co-education content. It never shows party-building, administrative-coordination, or teaching-research modules. *Avoid:* 家长版、家长app.
- **PC后台 (PC backend)** — the desktop management backend; handles file-heavy uploads and bulk management, while the mobile clients handle high-frequency lightweight actions. *Avoid:* 网页后台、web后台.

## Modules / 模块

- **首页 (Home)** — the per-role landing page aggregating to-do items, resource-center notices, quick entries, and recommended course cases; content varies by role. *Avoid:* 主页、首屏.
- **党建管理 (Party-building management)** — presentation of party-building study, activities, and brand-building; view-first, uploads via the PC backend. *Avoid:* 党务管理.
- **综合协调 (Administrative coordination)** — administrative planning, logistics support, and HR documents; mobile is view-first, PC is upload-first. *Avoid:* 行政协调、综合管理.
- **教研培训 (Teaching-research and training)** — curriculum development, the curriculum+resource libraries, and teaching-research study. *Avoid:* 教研部、培训管理.
- **家园社共育 (Home-school-community co-education)** — garden moments, parent-child tasks (incl. community education), growth records, and growth books. ⚠️ The canonical name **includes 社 (community)**; the flowchart title `家园共育` is the **legacy name** — see [ADR-0002](docs/adr/0002-co-education-naming.md). *Avoid:* 家园共育.

## Features / 功能

- **待办事项 (To-do items)** — role-specific pending items on Home. *Avoid:* 待办、代办事项.
- **资源库 (Resource library)** — resources classified by 衣/食/住/行/艺; a resource detail holds intro, interpretation, access, conversion suggestions, and linked course cases. *Avoid:* 素材库.
- **案例库 (Case library)** — a.k.a. 课程库; filtered by grade / five domains / activity form / resource tag; a case detail holds intro, full plan, teacher self-evaluation, peer evaluation, activity reflection, and linked resources. *Avoid:* 课例库.
- **在园时光 (Garden moments)** — teachers select a class/child then publish photos/videos/text for matching parents; ~twice-weekly cadence. *Avoid:* 园所时光、在校时光.
- **亲子任务 (Parent-child task)** — teachers publish a task (ordinary parent-child or community education); parents upload feedback; teachers track completion. *Avoid:* 亲子活动.
- **社区教育 (Community education)** — a type of parent-child task for community-education scenarios.
- **成长档案 (Growth record)** — holds monthly and term evaluations; the term evaluation produces the five-dimension radar chart and an assessment report. *Avoid:* 成长记录、档案袋.
- **成长册 (Growth book)** — a per-child, per-term book compiled by the teacher from selected content on a school-assigned template, finalized and then read by guardians **inside the Mini Program**. There is no export, download or sharing. *Avoid:* 成长手册、成长记录册.
- **月度评价 (Monthly evaluation)** — select a month/child, fill in, publish to parents. *Avoid:* 月评.
- **学期评价 (Term evaluation)** — fill the five-domain scale → radar chart → assessment report → export/publish. *Avoid:* 期末评价、学期末评价.
- **五维雷达图 (Five-dimension radar chart)** — generated from the five-domain scale. *Avoid:* 五维图、雷达图 (alone).
- **五大领域 (Five domains)** — health, language, society, science, arts (national early-learning guidelines). *Avoid:* 五个领域、五领域.
- **观察记录 (Observation record)** — ⚠️ **out of Mini Program scope (v1)**; collected via WeCom (企业微信).
- **共建任务 (Co-construction task)** — admin-published; select teachers, set deadline, watch the progress board. *Avoid:* 共建项目.
- **通知 (Notice)** — resource-center notices and per-role notice lists; reminders via subscribe messages. *Avoid:* 公告.
- **用户管理 (User management)** — PC backend: roster import, manual entry, search, role assignment. *Avoid:* 账号管理.
- **名单导入 (Roster import)** / **权限分配 (Role assignment)** / **下载记录 (Download log)**.
- **个性化推荐 (Personalized recommendation)** — v1.x: per-teacher ranking + a 为你推荐 surface over 资源库/案例库, driven by the teacher's 兴趣画像; default-on with an off switch. Distinct from the editorial "推荐课程案例" on Home (human-curated, not algorithmic). *Avoid:* 智能推荐.
- **兴趣画像 (Interest profile)** — content-preference tags from a teacher's consented, `child_id`-free signals; preference-level only, never need/diagnosis or any inference about a child; adults (teachers) only. Bare 画像 stays reserved for personas. *Avoid:* 用户画像.

## Actions / 动作

- **审核 (Audit)** — admin review of submissions: approve → enters library; reject → reason + return. *Avoid:* 审批.
- **通过 (Approve)** / **驳回 (Reject)** / **草稿 (Draft)**. *Avoid:* 批准、拒绝、暂存.

## Compliance & Tech / 合规与技术

- **内容安全 (Content moderation)** — **mandatory**: all UGC must pass `security.msgSecCheck` / `security.mediaCheckAsync`. *Avoid:* 内容审核、鉴黄.
- **小程序备案 (ICP filing)** — mandatory before go-live (since 2023-09-01). *Avoid:* ICP备案、网站备案.
- **微信认证 (WeChat verification)** — subject verification, ¥300/year; public kindergarten = government/public-institution subject. *Avoid:* 实名认证.
- **未成年人数据 (Minors' data)** — children's photos are sensitive: explicit guardian consent, privacy popup, data minimization, strict access (PIPL + minors' online-protection regulation). *Avoid:* 儿童数据、幼儿数据.
- **自动化决策 (Automated decision-making)** — PIPL Art 24: profiling/recommendation by automated means needs an opt-out plus transparency and a right to explanation; 个性化推荐 honors this via its off switch and notice.
- **算法备案 (Algorithm filing)** — filing under the 互联网信息服务算法推荐管理规定 for qualifying recommendation services; whether per-user 个性化推荐 triggers it is a legal question to confirm; aggregate de-identified insight does not.
- **订阅消息 (Subscribe message)** — replaces template messages; notice/task reminders. *Avoid:* 模板消息、推送.
- **云开发 (Cloud development / CloudBase)** — WeChat integrated serverless backend (云数据库/云函数/云存储).
- **openid** — the user's unique id within this Mini Program (wx.login → code2session).
