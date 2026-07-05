# RBAC — action-level permission matrix

- **Status:** Build-ready spec v0.1 (derived from [PRD.md](PRD.md) §5/§6/§7, [APP-STRUCTURE.md](APP-STRUCTURE.md), and `harness/structure/app-structure.json`).
- **Date:** 2026-06-18
- **Authority:** Roles and surfaces — PRD §5 and the `roleAccess` block in `harness/structure/app-structure.json`. Terminology — [glossary.json](glossary.json).
- **Scope:** Defines who may do what to each entity, per role, at action granularity. The server is the authority; the client UI is a convenience, never a security boundary.

This document is the access-control contract for the 电子资源平台 (Electronic Resource Platform). It encodes the
three roles — Admin client (管理端), Teacher client (教师端), Parent client (家长端) — against every domain
entity, and lists the server-enforced invariants that the harness gates.

## 1. Roles and surfaces

| Role | 角色 | Surface | CMS access |
|---|---|---|---|
| Admin | 管理端 | 微信小程序 + PC backend (PC后台) | Yes (admin-only) |
| Teacher | 教师端 | 微信小程序 only | No |
| Parent | 家长端 | 微信小程序 only (own child) | No |

Key surface rule (PRD §5, `app-structure.json` surfaces): the **PC backend (PC后台) / CMS is admin-only**.
Teachers and parents have no CMS route in the current scope. The Parent client surfaces only
家园社共育 (Home-school-community co-education) content plus its own notices and tasks for the guardian's own
child; it never renders staff modules.

## 2. Identity model

One WeChat account (one `openid`, obtained via `wx.login` then `code2session`) binds to a roster entry and to
one or more roles through a RoleBinding. A teacher who is also a parent holds both roles on the same `openid`
and switches role in-app; the server evaluates permission against the **active role plus that role's scope**,
never against the union of all roles at once. Holding the teacher role never grants the parent's cross-child
view, and holding the parent role never grants any staff module.

## 3. Legend

- **C** = Create · **R** = Read · **U** = Update · **D** = Delete · **A** = Approve.
- **—** = no permission for that action.
- A cell lists only the actions the role may perform on that entity. Absence of a letter means the action is denied.
- The **Scope note** column qualifies the read/write surface (own child, own class, school-wide, author-only).
- Letters describe the **maximum** a role may do; every write to a UGC entity is still subject to the
  content-moderation gate (内容安全) before the content becomes visible (ADR-0005).

## 4. Permission matrix

| Entity | Admin (管理端) | Teacher (教师端) | Parent (家长端) | Scope note |
|---|---|---|---|---|
| Resource (资源库) | C R U D A | C R U | — | Library is **school-wide** for all teachers (read + create). Teacher U is author-only and re-enters audit (see §6). Admin A is the only approve path. |
| Case (案例库) | C R U D A | C R U | — | Same as Resource. 案例库 is also called the curriculum library; school-wide shared knowledge. |
| Submission / AuditRecord | R U D A | C R | — | Teacher creates a Submission (the act of submitting for audit) and reads its own status; the AuditRecord is **immutable** once written — see §6. Only Admin approves/rejects. |
| Notice (通知) | C R U D | R | R | Admin authors each Notice in the PC后台. Teacher and parent read only. Parent reads only the Notice items targeted to the own child / own class. |
| Co-construction task (共建任务) | C R U D | R U | — | Admin publishes the task and selects participating teachers. Teacher reads assigned tasks and updates own progress / submitted material only. |
| Garden moments (在园时光) | R D | C R U D | R | Teacher publishes for own class/child (author + class scope). Parent reads only moments for the own child. Admin holds an oversight read + takedown (D) but does not author. |
| Parent-child task (亲子任务) | R D | C R U D | R | Teacher authors for own class. Parent reads only tasks assigned to the own child. Admin oversight read + takedown. |
| TaskFeedback (亲子任务反馈) | R D | R | C R U D | Parent creates/edits the own child's feedback (author scope). Teacher reads feedback for own class to track completion. Admin oversight read + takedown. |
| Monthly evaluation (月度评价) | R | C R U | R | Teacher fills for own-class children only. Parent reads only the own child's published evaluation. |
| Term evaluation (学期评价) | R | C R U | R | Same scope as monthly; produces the 五维雷达图 (Five-dimension radar chart) and assessment report. Parent reads own child only. |
| Growth book (成长册) | R | C R U D | R | Teacher compiles, previews, and publishes for own-class children. Parent reads only the own child's published book. |
| Child (未成年人数据) | C R U D | R | R | Admin manages the roster in the PC后台. Teacher reads only own-class children. Parent reads only the own child. Sensitive 未成年人数据 — strict access (PRD §8.1.5, ADR-0009). |
| Guardian (家长 / 监护人) | C R U D | R | R | Admin manages in the PC后台. Teacher reads only guardians of own-class children. Parent reads own profile only. |
| Class (班级) | C R U D | R | R | Admin manages classes and teacher-class bindings in the PC后台. Teacher reads only own class(es). Parent reads only the own child's class. |
| User / RoleBinding (用户管理 / 权限分配) | C R U D | — | — | Admin-only, PC后台. Role assignment maps an `openid` to admin/teacher/parent (may hold more than one). No self-service role change. |
| Download log (下载记录) | R | — | — | System appends an entry on every full-plan (详案) download; entries are **append-only**. Admin reads the Download log in the PC后台. Teacher and parent have no read access to it. |
| Party-building material (党建管理) | C R U D | R | — | Uploaded in the PC后台 (admin). Teacher reads on mobile (school-wide, view-first). Parent has no access. |
| Administrative-coordination material (综合协调) | C R U D | R | — | Same pattern as party-building: PC后台 upload, teacher mobile read-only, parent no access. |
| Teaching-research material (教研培训) | C R U D | C R U | — | Admin manages study materials in the PC后台. Teacher reads school-wide and may create teaching-research feedback (研修反馈, a UGC write). Parent has no access. |

## 5. Audit lifecycle (correctness-critical)

The Resource / Case audit (审核) lifecycle, mirroring PRD §6.5 and flowchart 05:

1. A teacher creates a Resource or Case as a Draft (草稿), then submits it. The item enters `pending-audit`
   and is routed to the content-moderation gate (ADR-0005).
2. Only an Admin acts on the queue. Approve (通过) publishes the item to the Resource library / Case library
   and writes an immutable AuditRecord (who / when / decision).
3. Reject (驳回) requires a reason, returns the item to the author for revision, and also writes an
   AuditRecord. The item is not visible to non-authors while it remains unapproved.
4. No role other than Admin may approve. There is no auto-approve path.

## 6. Edit-published policy (default)

Default policy for editing an already-published Resource or Case:

- The **author** (the teacher who created it) may edit their own published item. The edit puts the item back
  into `pending-audit`. It re-enters the audit lifecycle and the moderation gate before it is visible again,
  exactly like a new submission.
- An **Admin** may edit or unpublish a published item directly (no re-queue required), and may take down
  any item.
- This is recorded here as a **default**; if 园方 prefers a stricter rule (for example, author edits disabled
  after publish), update this section and the server rule together.

## 7. Teacher scope — OPEN (confirm 园方)

> **OPEN decision — confirm with 园方.** The rows below marked *own class* assume the default teacher scope.

Default teacher scope (to be confirmed by 园方):

- A teacher sees and acts on **Garden moments, Parent-child task items, evaluations, Growth book items, and
  children** only for their own class(es), resolved through the teacher-to-class binding.
- The **Resource library and Case library** (资源库 / 案例库 — shared knowledge) are **school-wide**: every
  teacher may read and create across the whole school, subject to the audit lifecycle.
- Party-building, administrative-coordination, and teaching-research materials are school-wide read for all
  teachers.

If 园方 confirms a different boundary (for example, grade-level scope rather than single-class, or a homeroom
versus subject-teacher distinction), update this section, the matrix scope notes, and the server scope check
together.

## 8. Server-enforced invariants

These cross-reference the `roleAccess` and `invariants` blocks in `harness/structure/app-structure.json` and
are gated by the harness. Every one is enforced on the server; the client never decides access.

1. **PC后台 is admin-only.** Any teacher or parent authentication to a `pc-backend` screen is denied
   (PRD §6.8; `app-structure.json` surfaces `pc-backend.forbiddenRoles = [teacher, parent]`).
2. **Parent client module fence.** A parent may reach only the modules in
   `roleAccess.parent.allowedModules` (co-education, home). Every module in
   `roleAccess.parent.forbiddenModules` (party-building, admin-coordination, teaching-research,
   resource-library, case-library, pc-backend) is unreachable, server-enforced (PRD §6.7).
3. **Own-child isolation.** A guardian reads only their own child's notices, tasks, garden moments,
   evaluations, and growth book. A request for another child's record is denied at the data layer, not
   filtered in the client (see [THREAT-MODEL.md](THREAT-MODEL.md), IDOR row).
4. **Teacher-class scope.** A teacher's reads and writes on Garden moments, Parent-child task items,
   evaluations, Growth book items, and children are bounded to the teacher's own class(es) — OPEN,
   pending 园方 (§7).
5. **Only admin approves.** Approve and Reject on a Submission are admin-only; the resulting AuditRecord is
   immutable and retained (PRD §6.5).
6. **Moderation precedes visibility.** Every UGC-write entity (Resource, Case, garden moments,
   parent-child task, TaskFeedback, evaluations, growth book, teaching-research feedback) routes its write
   through the content-moderation gate before the content is visible to any non-author (ADR-0005;
   `app-structure.json` invariant on `ugcWrite=true` screens; flagged by `harness/code-review.mjs`).
7. **Download logging.** A full-plan (详案) download appends an account + timestamp entry to the append-only
   download log; the entry cannot be edited or deleted by any role (PRD §6.5).
8. **Role binding is admin-controlled.** Only an admin in the PC后台 may create or change a RoleBinding;
   there is no self-service role escalation. One `openid` may hold multiple roles, evaluated per active role.

## 9. Cross-references

- Surfaces and role access: [APP-STRUCTURE.md](APP-STRUCTURE.md) and `harness/structure/app-structure.json` (`roleAccess`, `invariants`).
- Audit and moderation acceptance criteria: PRD §6.5, §6.7, §7.2.
- Content-moderation gate: [ADR-0005](adr/0005-mandatory-content-moderation.md).
- Threat coverage for the invariants above: [THREAT-MODEL.md](THREAT-MODEL.md).
