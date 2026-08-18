# Security — access control and threat model

- **Status:** Build-ready spec v0.2 (merged 2026-08-19 from the former `RBAC.md` and `THREAT-MODEL.md`).
- **Date:** 2026-06-18, revised 2026-08-19
- **Authority:** Roles and surfaces — [PRD.md](PRD.md) §5 and the `roleAccess` block in `harness/structure/app-structure.json`. Terminology — [glossary.json](glossary.json). Field-level data model — `../hualong-backend/db/01_schema.sql`.
- **Scope:** Who may do what to each entity, the invariants the server enforces, and the threats those invariants exist to stop.

Access control and the threat model are one argument, which is why they now live in one file: every STRIDE row
below is mitigated by an invariant in §8, and every invariant in §8 exists because of a row in §10. The server
is the authority throughout. The client UI is a convenience and never a security boundary.

> **Revised 2026-08-19.** Three things changed since v0.1 and are corrected inline: there is no admin Mini
> Program this cycle; the growth book is app-only with no export path; and audit rejection is terminal rather
> than a return-to-author. Media storage moved from Alibaba OSS to Tencent COS
> ([ADR-0014](adr/0014-cloud-vendor-tencent.md)).

---

## 1. Roles and surfaces

| Role | 角色 | Surface | PC backend access |
| --- | --- | --- | --- |
| Admin | 管理端 | Teacher 微信小程序 (content management) + PC后台 | Yes — admin-only |
| Teacher | 教师端 | 微信小程序 only | No |
| Parent | 家长端 | 微信小程序 only (own child) | No |

There are **exactly two Mini Programs** this cycle — parent and teacher — plus **one PC web console**. The
admin has no Mini Program of their own: they act through the teacher client for content management and use
the PC后台 for cross-class data work.

The **PC后台 is admin-only**. Teachers and parents have no route to it. The Parent client surfaces only
家园社共育 content plus its own notices and tasks for the guardian's own child; it never renders staff modules.

## 2. Identity model

One WeChat account (one `openid`, obtained via `wx.login` then `code2session`) binds to a roster entry and to
one or more roles. A teacher who is also a parent holds both roles on the same `openid` and switches role
in-app. The server evaluates permission against the **active role plus that role's scope**, never against the
union of all roles at once. Holding the teacher role never grants the parent's cross-child view, and holding
the parent role never grants any staff module.

## 3. Legend

- **C** create · **R** read · **U** update · **D** delete · **A** approve · **—** no permission.
- A cell lists only the actions the role may perform. Absence of a letter means denied.
- The scope note qualifies the read/write surface — own child, own class, school-wide, author-only.
- Letters describe the **maximum** a role may do. Every write to a UGC entity is still subject to the
  content-moderation gate before the content becomes visible ([ADR-0005](adr/0005-mandatory-content-moderation.md)).

## 4. Permission matrix

| Entity | Admin (管理端) | Teacher (教师端) | Parent (家长端) | Scope note |
| --- | --- | --- | --- | --- |
| Resource (资源库) | C R U D A | C R U | — | Library is school-wide for all teachers (read + create). Teacher U is author-only and re-enters audit. Admin A is the only approve path. |
| Case (案例库) | C R U D A | C R U | — | Same as Resource. Also called the curriculum library; school-wide shared knowledge. |
| Submission / AuditRecord | R U D A | C R | — | Teacher creates a Submission and reads its own status. The AuditRecord is immutable once written. Only Admin approves or rejects. |
| Notice (通知) | C R U D | R | R | Admin authors each Notice in the PC后台. Parent reads only Notices targeted to the own child or class. |
| Co-construction task (共建任务) | C R U D | R U | — | Admin publishes and selects participating teachers. Teacher reads assigned tasks and updates own progress only. |
| Garden moments (在园时光) | R D | C R U D | R | Teacher publishes for own class. Parent reads only moments for the own child. Admin holds oversight read plus takedown but does not author. |
| Parent-child task (亲子任务) | R D | C R U D | R | Teacher authors for own class. Parent reads only tasks assigned to the own child. Admin oversight read plus takedown. |
| TaskFeedback (亲子任务反馈) | R D | R | C R U D | Parent creates and edits the own child's feedback. Teacher reads feedback for own class to track completion. |
| Monthly evaluation (月度评价) | R | C R U | R | Teacher fills for own-class children only. Parent reads only the own child's published evaluation. |
| Term evaluation (学期评价) | R | C R U | R | Produces the 五维雷达图 and the assessment report. Parent reads own child only. |
| Growth book (成长册) | R | C R U D | R | Teacher compiles, previews and finalizes for own-class children. Parent reads the own child's finalized book **inside the Mini Program only** — see §5. |
| School growth-book settings | C R U D | R | — | Admin configures cover, logo, school introduction, term message, school sections and the six template slots, then publishes. Teachers consume; they cannot edit school-level content. |
| Child-profile correction (幼儿信息更正) | R A | — | C R | **New.** A guardian proposes a correction to the child's name, birth date or gender; an admin approves or rejects with a reason. Touches minors' PII — see §10 row T10. |
| Child (未成年人数据) | C R U D | R | R | Admin manages the roster in the PC后台. Teacher reads only own-class children. Parent reads only the own child. Sensitive 未成年人数据 — strict access. |
| Guardian (家长 / 监护人) | C R U D | R | R | Admin manages in the PC后台. Teacher reads only guardians of own-class children. Parent reads own profile only. |
| Class (班级) | C R U D | R | R | Admin manages classes in the PC后台. A teacher belongs to exactly one class. Parent reads only the own child's class. |
| User / RoleBinding | C R U D | — | — | Admin-only, PC后台. No self-service role change. |
| Download log (下载记录) | R | — | — | Appended on every 详案 download; append-only. Admin reads it in the PC后台. |
| Party-building material (党建管理) | C R U D | R | — | Uploaded in the PC后台. Teacher reads on mobile, school-wide, view-first. Parent has no access. |
| Administrative-coordination material (综合协调) | C R U D | R | — | Same pattern as party-building. |
| Teaching-research material (教研培训) | C R U D | C R U | — | Admin manages study materials. Teacher reads school-wide and may create 研修反馈, which is a UGC write. |

## 5. Growth book — access consequences of the app-only decision

F17 made the growth book **app-only**. There is no PDF, no image album, no download, no sharing and no
server-side rendering. Everyone reads the book inside the Mini Program, under the permissions above. The
access-control consequences are worth stating directly, because the old model leaked through file handles
rather than API calls:

- There is no artifact to leak. No signed file URL, no generated document, no `wx.shareFileMessage` path.
- `b2` (published) is permanently read-only. No role, including admin, edits a finalized book.
- A parent reads only the own child's book. A teacher reads and compiles only for their own class.
- Because the book is composed per request, every read re-evaluates permission. A stale link cannot outlive
  a permission change, which was the main residual risk in the export model.

## 6. Audit lifecycle (correctness-critical)

Mirrors [PRD.md](PRD.md) §6.5 and flowchart 05:

1. A teacher creates a Resource or Case as a 草稿, then submits it. The item enters `pending-audit` and is
   routed to the content-moderation gate.
2. Only an Admin acts on the queue. Approve (通过) publishes the item and writes an immutable AuditRecord
   recording who, when and the decision.
3. **Reject (驳回) is terminal.** It requires a reason and writes an AuditRecord. The item is not returned to
   the author for revision, and **resubmission of the same item is forbidden** — the author creates a new
   item instead. Author withdrawal is likewise terminal. Physical deletion is forbidden, so the audit trail
   survives.
4. No role other than Admin may approve. There is no auto-approve path.

> **Changed 2026-08-19.** v0.1 of this document said rejection "returns the item to the author for revision".
> That was true of the original design and is no longer the rule. The sibling repo's `review-spec.md` records
> the terminal rule, and F16 additionally forbids in-place edits of published training records — those require
> replacement rather than editing.

## 7. Edit-published policy

- The **author** may edit their own published Resource or Case. The edit returns the item to `pending-audit`
  and it re-enters the moderation gate before becoming visible again, exactly like a new submission.
- An **Admin** may edit or unpublish a published item directly, and may take down any item.
- **Exception:** published training records are immutable under F16 and require replacement rather than
  in-place edit.
- If 园方 prefers a stricter rule — for example, author edits disabled after publish — update this section and
  the server rule together.

## 8. Server-enforced invariants

These cross-reference the `roleAccess` and `invariants` blocks in `harness/structure/app-structure.json` and
are gated by the harness. Every one is enforced on the server; the client never decides access.

1. **PC后台 is admin-only.** Any teacher or parent authentication to a `pc-backend` screen is denied
   (`pc-backend.forbiddenRoles = [teacher, parent]`).
2. **Parent client module fence.** A parent may reach only `roleAccess.parent.allowedModules` (co-education,
   home). Every module in `forbiddenModules` — party-building, admin-coordination, teaching-research,
   resource-library, case-library, pc-backend — is unreachable, server-enforced.
3. **Own-child isolation.** A guardian reads only their own child's notices, tasks, garden moments,
   evaluations, growth book and profile. A request for another child's record is denied at the data layer,
   not filtered in the client (see T1).
4. **Teacher-class scope.** A teacher's reads and writes on garden moments, parent-child tasks, evaluations,
   growth-book items and children are bounded to the teacher's own class. A teacher belongs to exactly one
   class, carried by `db_teacher.class_id` plus `assignment_role`.
5. **Only admin approves.** Approve and Reject are admin-only; the resulting AuditRecord is immutable and
   retained; rejection and withdrawal are terminal states.
6. **Moderation precedes visibility.** Every UGC-write entity routes its write through the content-moderation
   gate before the content is visible to any non-author ([ADR-0005](adr/0005-mandatory-content-moderation.md);
   the `ugcWrite=true` invariant; flagged by `harness/code-review.mjs`).
7. **Download logging.** A 详案 download appends an account plus timestamp entry to the append-only download
   log. No role can edit or delete an entry.
8. **Role binding is admin-controlled.** Only an admin in the PC后台 may create or change a RoleBinding. One
   `openid` may hold multiple roles, evaluated per active role. No self-service escalation.
9. **Growth-book distribution gate.** While school-level settings are in `d1` (draft), teachers cannot fetch
   templates and no child's book may be finalized school-wide. Publishing to `d2` is what distributes.
10. **Correction approval is admin-only.** A guardian may propose a child-profile correction; only an admin
    may approve it, and approval writes the change plus an audit row in one transaction.

## 9. Open — teacher scope beyond the class boundary

> **OPEN, confirm with 园方.** The matrix assumes a teacher acts within their own class.

The 资源库 and 案例库 are **school-wide**: every teacher may read and create across the whole school, subject
to the audit lifecycle. Party-building, administrative-coordination and teaching-research materials are
school-wide read for all teachers. Everything child-specific is own-class.

If 园方 confirms a different boundary — grade-level scope, or a homeroom versus subject-teacher distinction —
update this section, the matrix scope notes and the server scope check together.

## 10. Threat table — STRIDE

STRIDE = Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.

| # | Threat | STRIDE | Mitigation | Where verified |
| --- | --- | --- | --- | --- |
| T1 | A guardian reads or edits **another child's** data by changing an id in a request (IDOR). | Information disclosure / Elevation of privilege | Server resolves the target record to the caller's `openid`, then to the guardian-to-child binding; every read and write is scoped to the own child at the data layer, never filtered only in the client. Deny by default. | §8 invariant 3; PRD §6.7 AC; structure judge `roleAccess.parent`. |
| T2 | Direct **media URL access** to a child's photo or video without auth, or a leaked link reused after the viewer should have lost access. | Information disclosure | Media lives in a **private Tencent COS bucket** with server-side encryption; there is no public-read path. Access is by **short-lived pre-signed credential** minted per authorized request. No long-lived links in the client or the repo. | [ADR-0014](adr/0014-cloud-vendor-tencent.md); PRD §12; `harness/code-review.mjs` (no hardcoded `http://`, no public media literals). |
| T3 | **`openid` spoofing or session theft** — a caller forges another user's identity or replays a stolen session token. | Spoofing | `openid` is derived server-side from `wx.login` then `code2session`; the client never asserts its own `openid`. Sessions are bound to the `openid`, short-lived, and re-validated each request; tokens travel only over HTTPS on 备案'd domains. | PRD §7.1, §10.1; glossary `openid`. |
| T4 | **Privilege escalation** — a teacher reaches admin functions (Approve, PC后台, role assignment) or another class. | Elevation of privilege | Permission is evaluated server-side per active role plus scope, never the union of roles. PC后台 is admin-only; Approve is admin-only; teacher reads and writes are bound to the own class. Role bindings are admin-controlled. | §8 invariants 1, 4, 5, 8; `pc-backend.forbiddenRoles`; structure judge. |
| T5 | **Unmoderated content reaches users** — a UGC item is published bypassing the moderation gate. | Tampering / Information disclosure | Every UGC write is held `pending` and routed through `security.msgSecCheck` (text) or `security.mediaCheckAsync` (media); content becomes visible only on a pass. The client cannot write directly to a public collection. Machine-flagged items go to an admin manual re-review queue. | PRD §7.2, §6.5 AC; [ADR-0005](adr/0005-mandatory-content-moderation.md); `harness/code-review.mjs`; structure judge `ugcWrite`. |
| T6 | **Bulk roster import is abused** — malicious rows, oversized payloads, or a re-import that silently overwrites existing children and guardians. | Tampering | Imports are admin-only in the PC后台, validated against a strict schema, size-capped, and treated as inert data with no formula evaluation on export. Re-import is upsert-with-diff and confirmation, not blind overwrite, and the action is logged. | PRD §6.8 AC; §4 (User / RoleBinding admin-only); structure judge. |
| T7 | **Secrets leakage** — `AppSecret`, API keys or object-storage credentials committed to the repo or shipped in the client bundle. | Information disclosure | Secrets live only in server-side configuration, never in client source or any repo. On the instance they sit in root-owned mode-600 environment files outside the source tree. `wx.login` to `code2session` and all `security.*` calls run server-side. `.gitignore` blocks credential file patterns, plus a secret scan in code review. | PRD §8.2, §12; `harness/code-review.mjs` (hardcoded-secret literal = P0). |
| T8 | **Audit-log tampering** — an AuditRecord or download-log entry is altered or deleted to hide who approved or downloaded what. | Repudiation / Tampering | AuditRecords and the download log are append-only and immutable. Approve and Reject decisions retain who, when and the reason. No role, including admin, edits a past entry. Physical deletion of a reviewed item is forbidden. | §8 invariants 5, 7; PRD §6.5, §6.8 AC. |
| T9 | **Media abuse** — large or repeated uploads exhaust storage and egress budget, or stage harmful media. | Denial of service | Uploads are authenticated, size- and rate-capped, and chunked with a `pending → uploaded → moderated → published` state. A lifecycle rule deletes incomplete multipart fragments after 7 days so abandoned uploads cannot accumulate silently. Moderation runs before publish. Storage and egress are monitored — egress, not storage, is the cost driver. | PRD §7.4, §12, §14; [ADR-0014](adr/0014-cloud-vendor-tencent.md). |
| T10 | **Child-profile correction abuse** — a guardian edits a child's identity fields directly, or an approval silently overwrites a record an admin changed in the meantime. | Tampering / Elevation of privilege | The guardian proposes; only an admin approves. Approval takes the family's snapshot wholesale rather than merging field by field, and the reviewer is warned when the official record has changed since the request was raised. At most one pending correction may exist per child. Approval writes the change, terminates the request and inserts an audit row in one transaction. | §8 invariant 10; `db_child_profile_correction`. |

## 11. Notes

- **Defend at the data layer, not the client.** T1 and T4 share one root cause — trusting client-supplied
  scope. The fix is identical everywhere: resolve every request to the caller's `openid`, then to the role and
  scope, then deny by default. A hidden control in the UI is never the control.
- **Moderation is the highest-value gate.** T5 protects 未成年人数据 and the 主体 at once. It is the one
  invariant the PRD marks as a hard zero, and `harness/code-review.mjs` blocks any UGC write path lacking a
  moderation call.
- **One open moderation question.** The admin growth-book publish path states 不调微信 API and treats the
  admin's own preview as the review pass, on the argument that admin-authored school content is not
  user-generated. Admin-uploaded photos nonetheless render into every child's book school-wide. Recorded here
  as **OPEN**; it needs a decision on the record against [ADR-0005](adr/0005-mandatory-content-moderation.md),
  whose UGC definition is enumerative and broad and whose bypass metric is 0（硬性）.
- **Compliance overlap.** T2, T5, T8 and T10 also serve PIPL and the minors' online-protection regulation —
  explicit guardian consent, data minimization, strict access, defined retention. Two related gaps are still
  open: the guardian-consent record and retention value are unsigned, and the developer's entrusted-processing
  agreement is identified but unsigned.
- **Verification is automated where possible.** The structure judge enforces role access and moderation on
  UGC-write screens once application source exists; the EARS acceptance criteria in PRD §6.5, §6.7 and §7
  become the first tests; `harness/code-review.mjs` flags the client-side antipatterns behind T2, T3, T5 and T7.

## 12. Cross-references

- Surfaces and role access: [APP-STRUCTURE.md](APP-STRUCTURE.md) and `harness/structure/app-structure.json`.
- Audit and moderation acceptance criteria: [PRD.md](PRD.md) §6.5, §6.7, §7.2.
- Content-moderation gate: [ADR-0005](adr/0005-mandatory-content-moderation.md).
- Cloud vendor, private bucket and pre-signed access: [ADR-0014](adr/0014-cloud-vendor-tencent.md).
- Minors' data retention: [ADR-0009](adr/0009-minors-data-retention.md).
- Field-level data model: `../hualong-backend/db/01_schema.sql`; gaps register `../hualong-backend/db/GAPS.md`.
