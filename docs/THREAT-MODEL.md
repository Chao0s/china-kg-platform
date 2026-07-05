# Threat model — STRIDE (lightweight)

- **Status:** Build-ready spec v0.1 (paired with [RBAC.md](RBAC.md); derived from [PRD.md](PRD.md) §6/§7/§8 and `harness/structure/app-structure.json`).
- **Date:** 2026-06-18
- **Scope:** The real attack surface of the 电子资源平台 (Electronic Resource Platform) — a 微信小程序 plus the
  PC backend (PC后台) — handling 未成年人数据 (Minors' data). This is a tight working table, not a heavyweight
  document.

STRIDE = Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.
Each row names the threat, its category, the mitigation, and where the mitigation is verified.

## 1. Threat table

| # | Threat | STRIDE | Mitigation | Where verified |
|---|---|---|---|---|
| T1 | A guardian reads or edits **another child's** data (Garden moments, evaluations, Growth book, TaskFeedback) by changing an id in a request (IDOR). | Information disclosure / Elevation of privilege | Server resolves the target record to the caller's `openid` then to the guardian-to-child binding; every read/write is scoped to the own child at the data layer, never filtered only in the client. Deny by default. | [RBAC.md](RBAC.md) §8 invariant 3; PRD §6.7 AC; structure judge `roleAccess.parent`. |
| T2 | Direct **media URL access** to a child's photo/video without auth, or a leaked link reused after the viewer should have lost access. | Information disclosure | Media is served from OSS via **short-lived signed URLs** scoped to an authorized request; no public-read buckets for 未成年人数据; URLs expire and are re-minted per authorized view. No long-lived public links in client or repo. | PRD §10.1, §12 (least-privilege, HTTPS-only); `harness/code-review.mjs` (no hardcoded `http://`, no public media literals). |
| T3 | **`openid` spoofing or session theft** — a caller forges another user's identity or replays a stolen session token. | Spoofing | `openid` is derived server-side from `wx.login` then `code2session`; the client never asserts its own `openid`. Sessions are bound to the `openid`, short-lived, and re-validated each request; tokens travel only over HTTPS on 备案'd domains. | PRD §7.1, §10.1; glossary `openid`; `harness/code-review.mjs` (https-only). |
| T4 | **Privilege escalation** — a teacher reaches admin functions (Approve, PC后台, Role assignment) or a teacher reaches **another class**. | Elevation of privilege | Permission is evaluated server-side per active role plus that role's scope (never the union of multiple roles). PC后台 is admin-only; Approve is admin-only; teacher reads and writes are bound to own class(es). Role bindings are admin-controlled, no self-service. | [RBAC.md](RBAC.md) §8 invariants 1, 4, 5, 8; `app-structure.json` `pc-backend.forbiddenRoles`; structure judge. |
| T5 | **Unmoderated content reaches users** — a UGC item is published bypassing the content-moderation gate, exposing harmful content involving 未成年人数据. | Tampering / Information disclosure | Every UGC write is held `pending` and routed through `security.msgSecCheck` (text) / `security.mediaCheckAsync` (media); content becomes visible only on a pass. The client cannot write directly to a public collection. Machine-flagged items go to an admin manual re-review queue. | PRD §7.2, §6.5 AC; [ADR-0005](adr/0005-mandatory-content-moderation.md); `harness/code-review.mjs` (UGC write without moderation = P1); structure judge `ugcWrite` invariant. |
| T6 | **Bulk Roster import** is abused — malicious rows (formula/script injection in cells, oversized payloads) or a re-import that silently **overwrites** existing children/guardians. | Tampering | Imports are admin-only in the PC后台, validated against a strict schema, size-capped, and treated as inert data (no formula evaluation on export). Re-import is upsert-with-diff and confirmation, not blind overwrite; the action is logged. | PRD §6.8 AC; [RBAC.md](RBAC.md) (User / RoleBinding admin-only); structure judge `pc-backend` admin-only. |
| T7 | **Secrets leakage** — `AppSecret`, API keys, or OSS credentials committed to the repo or shipped in the client bundle. | Information disclosure | Secrets live only in server / cloud-function config, never in client source or the repo. `wx.login` to `code2session` and all `security.*` calls run server-side. `.gitignore` plus a secret scan in code review. | PRD §8.2 (secrets row), §12; `harness/code-review.mjs` (hardcoded-secret literal = P0). |
| T8 | **Audit-log / record tampering** — an AuditRecord or Download log entry is altered or deleted to hide who approved or downloaded what. | Repudiation / Tampering | AuditRecords and the Download log are **append-only and immutable**; Approve / Reject decisions retain who / when / reason. No role, including admin, edits a past entry. | [RBAC.md](RBAC.md) §8 invariants 5, 7; PRD §6.5, §6.8 AC. |
| T9 | **Video / media abuse** — large or repeated uploads exhaust OSS storage and transcoding budget, or are used to stage harmful media (denial of service / cost attack). | Denial of service | Uploads are authenticated, size- and rate-capped, and chunked/resumable with a `pending → uploaded → moderated → published` state. Transcoding is server-managed (VOD/MPS). Moderation runs before publish, so abusive media never goes live. Storage and egress budget are monitored. | PRD §7.4, §12, §14 (media-cost risk); [ADR-0005](adr/0005-mandatory-content-moderation.md). |

## 2. Notes

- **Defense at the data layer, not the client.** T1 and T4 share one root cause — trusting client-supplied
  scope. The fix is the same everywhere: resolve every request to the caller's `openid`, then to the role
  and scope, and deny by default. The 微信小程序 UI hiding a control is never the control itself.
- **Moderation is the highest-value gate.** T5 protects 未成年人数据 and the 主体 (legal subject) at once;
  it is the one invariant the PRD marks as a hard zero (no published item may bypass moderation), and
  `harness/code-review.mjs` blocks any UGC write path that lacks a moderation call.
- **Compliance overlap.** T2, T5, and T8 also serve PIPL and the minors' online-protection regulation
  (explicit guardian consent, data minimization, strict access, retention) tracked in PRD §8 and ADR-0009.
- **Verification is automated where possible.** The structure judge (`harness/judges/structure_judge.py`)
  enforces role access and moderation on UGC-write screens once application source exists; the EARS
  acceptance criteria in PRD §6.5 / §6.7 / §7 become the first tests; `harness/code-review.mjs` flags the
  client-side antipatterns (T2, T3, T5, T7).

## 3. Cross-references

- Permission matrix and server-enforced invariants: [RBAC.md](RBAC.md).
- Content-moderation gate: [ADR-0005](adr/0005-mandatory-content-moderation.md).
- Compliance and 未成年人数据 (Minors' data): PRD §8; ADR-0009 (retention).
- Structural contract checked by the judges: `harness/structure/app-structure.json`.
