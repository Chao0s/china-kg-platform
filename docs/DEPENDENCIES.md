# DEPENDENCIES.md — External dependencies and assumptions

- **Status:** Build-ready spec (consolidated from [PRD.md](PRD.md) §7 / §8 / §13, the ADRs, and [GRILLING.md](GRILLING.md))
- **Date:** 2026-06-18
- **Scope:** One consolidated list of everything outside the build team's direct control — external
  approvals, accounts, and provisioning — each with an owner, a status, and its risk, followed by the key
  assumptions the v1 design rests on.

The externals below are scattered across the PRD, the ADRs, and [GRILLING.md](GRILLING.md); this file is the
single place to track them. Owners are the responsible party; status reflects 2026-06-18; risk is the impact
on the fixed 2026-09-01 launch ([ADR-0008](adr/0008-launch-timeline-and-pilot.md)).

## 1. External dependencies

| Dependency | Owner | Status (2026-06-18) | Risk | Notes / cross-ref |
|---|---|---|---|---|
| Legal `主体` confirmation (法人 path) | 园方 / 教育局 | Open — unconfirmed | **BLOCKER (highest).** Gates `备案`, `微信认证`, and `类目`; the whole compliance track waits on it. | [ADR-0010](adr/0010-legal-subject.md); [GRILLING.md](GRILLING.md) item F. Path A: kindergarten as 事业单位法人; Path B: 教育局/镇政府 as subject. |
| `WeChat verification` (微信认证) | 园方 (subject holder) | Not started — waits on `主体` | High — prerequisite for category and public release. | PRD §8.1; ¥300/year subject verification. |
| `ICP filing` (小程序备案) | 园方 + engineering | Not started — waits on `主体` | High — mandatory before public go-live; **1–20 working days** of external lead time. | PRD §8.1 / §13 M0; includes 12381 SMS verification. |
| Education `类目` / `资质` (incl. possible 办学许可证) | 园方 / 教育局 | Open — unconfirmed | High — wrong category blocks submission; may require credentials to match. | PRD §8.1; [GRILLING.md](GRILLING.md) item F. |
| WeChat `审核` (public review) | WeChat platform (external) | Not started — waits on a built app | High — external review time is the one factor outside the team; `体验版` pilot is the fallback. | [ADR-0008](adr/0008-launch-timeline-and-pilot.md); PRD §13 M4. |
| WeChat `security.*` content-moderation availability | WeChat platform (external) | Available — must be integrated | High — moderation is a hard, non-bypassable gate; no public UGC without it. | [ADR-0005](adr/0005-mandatory-content-moderation.md); PRD §8.1. `security.msgSecCheck` / `security.mediaCheckAsync`. |
| `订阅消息` quota and long-term eligibility | WeChat platform / 园方 (category) | Open — long-term eligibility unconfirmed | Medium — one-time grants are realistic; long-term needs category eligibility. Mitigated by the in-app inbox fallback. | [NOTIFICATIONS.md](NOTIFICATIONS.md); [GRILLING.md](GRILLING.md) item F. |
| Alibaba account + `RDS` / `OSS` / `VOD` / API provisioning | Engineering | Not started — schedulable now | Medium — buildable in parallel; the API domain itself needs `备案`. | [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md); PRD §13 M0. |
| API-domain `备案` | 园方 + engineering | Not started — couples to subject + ICP | Medium — the REST API runs behind a 备案'd HTTPS domain; adds to the timeline. | [ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md). |
| Roster source (teacher / child / parent, CSV or Excel) | 园方 (信息员) | Open — format and provider to confirm | Medium — `User management` roster import and active-rate denominators depend on it. | PRD §6.8 / §7; [MEASUREMENT.md](MEASUREMENT.md) denominators. |
| Media cost ceiling (`OSS` storage + `VOD` transcoding + egress) | 园方 | Open — budget unconfirmed | Medium — video cost can dominate; needs a per-class / term budget. | PRD §14; [GRILLING.md](GRILLING.md) item G. |
| `PC backend` operators (who administers the CMS) | 园方 | Open — default 园长 + 保教主任 + 信息员 | Low — affects role assignment, not the build. | [GRILLING.md](GRILLING.md) item G. |
| `未成年人数据` retention period | 园方 / legal | Open — period pending | Medium — retention is configurable, so the build does not block, but the lawful value must be set before launch. | [ADR-0009](adr/0009-minors-data-retention.md); [GRILLING.md](GRILLING.md) item F. |

## 2. Critical path

The compliance chain is strictly sequential and starts from one unconfirmed item:

`主体` confirmed → `微信认证` + education `类目` / `资质` + `ICP filing` (1–20 working days) → app built and
submitted → WeChat `审核` → public release. Because each step waits on the one before it and the launch date
is fixed, the `主体` confirmation is the single highest-leverage action; the `体验版` pilot exists so the
kindergarten still has a usable build on 2026-09-01 if public `审核` trails the date
([ADR-0008](adr/0008-launch-timeline-and-pilot.md)).

## 3. Key assumptions (v1)

These hold for v1 unless an open item above resolves otherwise. Each is a deliberate scope decision, not an
oversight.

- **Single-tenant.** v1 serves one kindergarten. The data model keeps a tenant boundary so a future central +
  branch (多园) setup stays possible, but multi-tenancy is not a v1 feature ([GRILLING.md](GRILLING.md) item
  D; PRD §4 / §10.2).
- **One class per child.** A child belongs to exactly one class in v1; teachers may still multi-select
  children when publishing. No interest or mixed-age groups ([GRILLING.md](GRILLING.md) item E; PRD §4).
- **One account, multiple roles.** One WeChat account (one `openid`) may hold several roles; a teacher who is
  also a parent switches role in-app ([ADR-0003](adr/0003-client-framework.md); PRD §5).
- **Teacher scope is own-class — pending 园方.** The working assumption is that a teacher acts within their
  own class; the precise cross-class scope is a 园方 decision and is not yet locked
  ([GRILLING.md](GRILLING.md) item G).
- **Onboarding flow — pending 园方.** The PRD specs both roster-import-plus-invite and self-register-plus-
  approval; the recommended default is roster-import-first, pending the director's choice
  ([GRILLING.md](GRILLING.md) item F).
- **Departed-teacher content — pending 园方.** The recommendation is that content stays (kindergarten-owned)
  with authorship retained and login revoked; confirm with 园方 ([GRILLING.md](GRILLING.md) item E).
- **Files live in object storage.** All files live in `OSS`; `RDS` holds metadata and URLs only
  ([ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md)).
- **`内容安全` is mandatory regardless of backend.** WeChat `security.*` moderation is required no matter how
  the backend is built; a third-party layer can add to it but never replaces it
  ([ADR-0005](adr/0005-mandatory-content-moderation.md)).
