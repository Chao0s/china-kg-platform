# HANDOFF.md — Session handoff / 交接文档

> Living handoff for the next session or agent. Run the `/handoff` skill, capture its output here, and commit.
> The gate reminds you when a commit does not update this file. **Never put secrets, credentials or personal
> data here.**
>
> 交接文档（纳入版本管理）。运行 `/handoff` 后将结果写入此处并提交；闸门会在提交未更新本文件时提醒。
> 请勿写入密钥、凭证或个人信息。

**Last updated:** 2026-08-19

---

## In one line / 一句话现状

The specification, the database and the infrastructure are done and verified. **There is no application code
and no API contract.** Designing that contract is the only thing standing between a working database and a
working platform.

> 中文：规格、数据库与基础设施均已完成并通过验证；但**没有任何应用代码，也没有 API 契约**。设计该契约是数据库与可运行平台之间唯一剩下的环节。

---

## 1. Repository layout / 仓库结构

This umbrella repo is the **spec, governance and quality-harness foundation**. It is not the application.

The application lives in **four sibling repos** at the workspace root, all on `github.com/Chao0s`, all
fast-forwarded on 2026-08-19:

| Repo | Head | What it actually contains | Real code? |
| --- | --- | --- | --- |
| `../hualong-backend` | `614cc8f` | 62-table PostgreSQL 16 schema, a 333 KB decision log, 8 Node harness scripts | No service code |
| `../hualong-parent` | `ac6e63f` | Parent Mini Program — 17 static HTML prototype screens | Not Mini Program code |
| `../hualong-teacher` | `c0b48f7` | Teacher Mini Program — 57 static HTML screens. **Default branch is `master`, not `main`** | Not Mini Program code |
| `../hualong-admin-pc` | `335167b` | PC web console — one 131 KB single-file HTML mock plus 9 specs | Not an application |

A second developer, **Lin / linem7**, commits to all four in large batches. **Always pull before working.**

**There is no API layer anywhere.** No OpenAPI, no Swagger, no endpoint table. Only three endpoints appear
across all four repos, and each is a prose example inside a document about a different subject. What exists is
a *field-level* binding contract — 832 bindings over 719 columns, generated from `ui=` annotations. Gap **G40**
records the hole: 绑定契约只覆盖字段，不覆盖动作 —— 313 个按钮零覆盖。

---

## 2. Infrastructure — built and verified 2026-08-18/19 / 基础设施

Recorded in [ADR-0014](adr/0014-cloud-vendor-tencent.md), which supersedes ADR-0004 on vendor and media storage.

### Instance
`106.55.2.218` — Tencent Lighthouse, 广州四区, Ubuntu 24.04, 4 core / 8 GB / 60 GB SSD, 500 GB per month at
5 Mbps, paid to 2027-08-16. SSH is key-only; password and root login are disabled via
`/etc/ssh/sshd_config.d/10-hardening.conf`. A `devtunnel` account with no shell may forward only to
`127.0.0.1:3001`, enforced by `90-devtunnel.conf`. All three properties were tested: the permitted port works,
other ports are refused, and an interactive shell is refused.

> ⚠️ **Do not confuse this with `43.136.113.129`.** That is the *Teacher Resources* platform's server.
> `hualong-backend/CONTEXT.md:54` wrongly names that host as the Hualong target VPS — a correction someone
> must make in the sibling repo.

### Database
**PostgreSQL 16.14** on the instance, listening on loopback only, database `hualong`. `01_schema.sql`,
`02_seed.sql` and `03_verify.sql` all executed cleanly on the first attempt:

- 62 tables · 719 columns · 601 column comments · 116 indexes · 56 triggers · 926 constraints
- 27 verification assertions across groups A–D, zero violations
- Independently checked: no table carrying `updated_at` is missing its trigger, and no table lacks a primary key

Nightly `pg_dump` at **05:00 Asia/Shanghai** via `/etc/cron.d/hualong-backup`, gzipped to COS under
`backups/db/YYYY-MM/`, 7 days retained locally. **The restore has been tested end to end** into a scratch
database and matches the source.

### Object storage
COS bucket `hualong-media-1464472146`, ap-guangzhou, private read/write, SSE-COS, single-AZ. A lifecycle rule
deletes incomplete multipart fragments after 7 days. CORS allows the two site origins. Measured
instance-to-COS throughput over the same-region private network: roughly 15–20 MB/s up and 85–94 MB/s down,
and that traffic does not draw on the instance's monthly quota.

**Media must never transit the instance.** Its uplink is 5 Mbps — about 0.6 MB/s. Clients upload to and
download from COS directly using short-lived pre-signed credentials; the instance issues credentials and
stores metadata only.

### Access
A CAM sub-user `hualong-api`, programmatic access only, holds one policy scoped to that single bucket.
Credentials live on the instance in `/etc/hualong/cos.env` and `/etc/hualong/db.env`, both root-owned, mode
600. Neither file is in any repo.

### Domain
`hlzzxy.cn` on DNSPod; apex and `www` both resolve to the instance. nginx serves a placeholder plus a
`/healthz` probe. **Reachable by IP; the domain itself is blocked by Tencent pending the ICP filing.**

---

## 3. Compliance / 合规

The ICP filing was opened 2026-08-11 against the subject settled in [ADR-0010](adr/0010-legal-subject.md) —
广州市番禺区化龙镇中心幼儿园 as a 事业单位 (Path A). It sits at **step 4 of 5**, waiting on 工信部短信核验 by two
named individuals, after which 管局审核 takes 1–20 working days.

Because 小程序备案 is per-AppID, **two Mini Programs double everything WeChat-side**: two filings, two 微信认证
at ¥300 per year each, and two review submissions, each of which can be rejected.

> Personal names, phone numbers and identity numbers are deliberately not recorded here. They are in the
> Tencent console under the filing order.

---

## 4. The plan, with ownership / 计划与分工

### Items 1–7 · Compliance · owned by the **project managers** · underway
The two SMS verifications; register two Mini Program accounts and obtain AppIDs; 微信认证 twice; confirm the
education 类目 and any 资质 requirement; 小程序备案 twice; sign the entrusted-processing agreement (gap G26);
sign off the minors' data retention period (gap G11).

### Item 8 · Artwork · owned by the **UI designer** · due Friday 2026-08-21
The 12 growth-book layout packs. Currently **0 of 12 released** — every `pack.json` is a skeleton with empty
`assets` and `layouts`. This has the longest lead time of anything outstanding and it blocks the growth book
entirely.

### Items 9–12 · Documentation and design · **in progress now**
9. Write ADR-0014 recording Tencent as the cloud vendor. **Done** — see [ADR-0014](adr/0014-cloud-vendor-tencent.md).
10. Fix the documented contradictions (section 5 below). Umbrella-side done; sibling-repo fixes outstanding.
11. Decide where the API server code lives — likely `hualong-backend`, alongside its schema.
12. **Design the API contract.** The critical path. Envelope, error shape, status codes, pagination,
    idempotency; `wx.login → code2session` with multi-role resolution; server-side scope enforcement per
    request; the 313 button endpoints with their state-machine guards; and the STS pre-signed upload flow.

### Items 13–22 · Build · batched, starts after 9–12
Build the API; the content-moderation gate; the two Mini Programs; the PC console; the growth-book composer.
Then deploy, run the 体验版 pilot, submit for WeChat review twice, and launch.

### Schedule reality / 进度实况
[ADR-0008](adr/0008-launch-timeline-and-pilot.md) fixes the launch at **2026-09-01** — 13 days away, with zero
application code written. **The public launch is not achievable.** ADR-0008's 体验版 whitelist pilot is now the
primary deliverable for that date, not the fallback. Say this to whoever owns the date now, not at the end of
August.

---

## 5. Known contradictions someone must fix / 已知矛盾

**Resolved in this repo:**
- ~~ADR-0004 chose Alibaba Cloud while the platform runs on Tencent~~ — superseded by ADR-0014.
- ~~ADR-0010 read "Open (blocker)" though the subject was confirmed~~ — now Accepted.

**Outstanding, in the sibling repos:**
- `../hualong-admin-pc`: `db_admin_school` was deleted by commit `0fa5ea9` but **only in `dashboard-spec.md`**.
  Eight other specs still instruct the backend to filter on it, including the `[CONTEXT_RULE]` that defines the
  admin authorization boundary. This is an implementable-wrong-thing today.
- `../hualong-admin-pc`: `growth-book-setting-spec.md:382` still returns 409 for withdrawal inside
  `[JUMP_VALIDATION]` — the section that maps directly to HTTP behaviour — contradicting the withdrawal feature
  shipped in `e55e9f7`.
- `../hualong-admin-pc`: `db_school_book_release` and `db_school_book_template_assignment` are referenced by
  rules but registered in no canonical object list — the exact failure mode commit `5f9eb81` was written to
  prevent, recurring nine days later.
- `../hualong-backend`: `db/01_schema.sql` opens with a header declaring the file is not yet in effect and
  should be run from a filename that no longer exists. `03_verify.sql` has the same defect.
- `../hualong-backend`: `DATABASE_SPEC.md` §3 declares 62 tables in its heading but its breakdown sums to 45,
  and the list beneath still enumerates the pre-migration schema. The harness cannot catch this — it only
  regexes the digits out of the heading.
- `../hualong-teacher`: 51 prototype screens load `https://mcp.figma.com/mcp/html-to-design/capture.js` on
  every open. It arrived as a one-line drive-by in commit `29059a6` and is the only external network call in
  either app repo.
- `../hualong-parent`: the prototype still tells parents a teacher can upload on their behalf (代传). F19
  forbids it — the teacher may only send a reminder.

---

## 6. Open BLOCKER gaps / 阻塞缺口

Seven, tracked in `../hualong-backend/db/GAPS.md`:

| Gap | What |
| --- | --- |
| G1 | No login-identity landing point |
| G2 | No content-safety status bits |
| G4 | Group-photo portrait consent |
| G11 | Guardian-consent record and retention value **unsigned** (PIPL art. 17) |
| G20 | `phone` nullable and non-unique |
| G25 | Minors' consent and special processing rules |
| G26 | The developer's entrusted-processing agreement identified but **unsigned** |

Plus **G36**, the single AMBIGUOUS gap: whether the assessment report export survives F17. Two readings are
both defensible; it needs a human decision, not an engineering one.

---

## 7. Traps — hard-won, do not repeat / 已踩过的坑

- **Lighthouse COS is a different product from standard COS.** A bucket created at
  `console.cloud.tencent.com/lighthouse/cos` does not appear in the standard COS bucket list and supports
  neither lifecycle rules nor CORS — and the console reports those missing features as a **permission** error
  (`cos:GetBucketLifecycle`), which misdirects diagnosis onto CAM policies that were never the problem. Create
  buckets only from `console.cloud.tencent.com/cos/bucket`. The first bucket was created the wrong way and had
  to be migrated.
- **Tencent CAM action names need a `name/` prefix** — `name/cos:GetObject`, not `cos:GetObject`. A single
  unknown action rejects the whole policy document.
- **`cos:PostObject` is required in addition to `PutObject`**, because `wx.uploadFile` sends POST multipart.
  Without it uploads succeed from the server and fail from every phone.
- **The Tencent console's visual policy editor silently drops actions it does not render.** Always verify the
  action count after saving.
- **Bucket-level actions need the `/*` resource suffix**, the same as object-level actions. A bare trailing
  slash silently matches nothing.
- **This workspace lives on Google Drive.** Tracked files have gone missing from the working tree without
  anyone touching git — `.understand-anything/knowledge-graph.json`, its `config.json` and the source `.docx`
  flowchart were all found deleted and restored on 2026-08-19. Check `git status` before trusting the tree.

---

## 8. Where things are / 索引

| Subject | Location |
| --- | --- |
| Specification | `docs/PRD.md` · `docs/PRD.zh-CN.md` |
| Structure | `docs/APP-STRUCTURE.md` |
| Decisions (this repo) | `docs/adr/` — 0001–0011, 0014 |
| Decisions (cross-app) | `../hualong-backend/DECISIONS.md` · `../hualong-backend/docs/ADR-0012`, `ADR-0013` |
| Open questions | `docs/GRILLING.md` |
| Glossary | `docs/glossary.json` (machine) · `CONTEXT.md` (human mirror) |
| Schema — the authority | `../hualong-backend/db/01_schema.sql` |
| Gaps register | `../hualong-backend/db/GAPS.md` |
| Dev-access tools | `tools/` — SSH tunnel wizard and key manager |

---

## 9. Documentation state / 文档现况

The documentation set was rewritten and consolidated on 2026-08-19. `docs/` went from 13 markdown files to
11, and every stale claim listed in section 5 above was corrected in this repository.

| Change | Detail |
| --- | --- |
| Merged | `RBAC.md` + `THREAT-MODEL.md` → [SECURITY.md](SECURITY.md) |
| Merged | `MEASUREMENT.md` + `PERSONALIZATION.md` → [ANALYTICS.md](ANALYTICS.md) |
| Merged | `DEPENDENCIES.md` + `DEFINITION-OF-DONE.md` → [DELIVERY.md](DELIVERY.md) |
| Reduced | [DATA-DICTIONARY.md](DATA-DICTIONARY.md), 606 lines → 85, now a pointer at the schema of record |
| Rewritten | [PRD.md](PRD.md) and [PRD.zh-CN.md](PRD.zh-CN.md) to v0.3, parity held at 32 headings |
| Rewritten | [NOTIFICATIONS.md](NOTIFICATIONS.md) — in-app only, subscribe-messages removed from v1 |
| New | [ADR-0014](adr/0014-cloud-vendor-tencent.md); ADR-0004 marked superseded; ADR-0010 marked Accepted |
| Moved | the handoff, from the repository root to `docs/`, with `harness.config.json` repointed |

The full gate passes: glossary, typewriter, structure judge, parity, design judge, wording judge and all 65
tests. The one test that had been failing — the dashboard core-import check — was an unbuilt plugin cache, not
a repository fault; it was fixed by building `@understand-anything/core` in the plugin cache.

**Still to do in the sibling repos.** Every contradiction in section 5 marked outstanding is untouched,
because Lin commits to those repos actively and uncommitted edits there would collide. Start with
`db_admin_school`.

## 10. Suggested next actions / 下一步

1. **Design the API contract** (item 12). Nothing in items 13–22 can start without it, and it is the only
   remaining item where the decision-maker is the bottleneck rather than the work.
2. **Fix the sibling-repo contradictions** in section 5, starting with `db_admin_school` — it is the one a
   developer could implement wrongly tomorrow.
3. **Chase item 8**, the artwork. Longest external lead time; blocks the product's centrepiece.
4. Correct `../hualong-backend/CONTEXT.md`, which names the wrong server as the target host.

## 11. Suggested skills / 建议技能
- `/handoff` — refresh this file at the end of each working session.
- `/understand-anything:understand` — rebuild the codebase map once application code exists.
- `/grill-with-docs` — continue resolving `docs/GRILLING.md`.
