# Data dictionary and relational schema / 数据字典与关系库结构

- **Status:** Draft v0.1 (derived from [PRD.md](PRD.md) §10.2 and [APP-STRUCTURE.md](APP-STRUCTURE.md))
- **Date:** 2026-06-18
- **Owners:** Engineering lead; kindergarten product owner (the 园方 director)
- **Authority:** Terminology — [glossary.json](glossary.json). Decisions — [docs/adr/](adr/). Data model — [PRD.md](PRD.md) §10.

## Purpose / 用途

This document is **one artifact with two jobs**. First, it is the field-level data dictionary that defines every entity, field, type, and rule. Second, those same definitions are the **relational schema** for the Alibaba Cloud RDS (MySQL / PostgreSQL) source of truth: each entity below is a table, each field is a column, and the keys and indexes are the ones the migration creates. The director decided that the roster arrives as CSV / Excel; the importable subset of this dictionary is mirrored by the templates in [templates/](templates/), so the same column names flow from a spreadsheet into the database without translation.

> 中文：本文件一物两用。其一，它是逐字段的数据字典，定义每个实体、字段、类型与规则。其二，这些定义即阿里云 RDS（MySQL / PostgreSQL）唯一真相库的关系结构：下文每个实体为一张表，每个字段为一列，键与索引即迁移脚本所建。园方决定名册以 CSV / Excel 形式提供，本字典的可导入子集与 [templates/](templates/) 模板一一对应，使同名列从表格直入数据库，无需转换。

## Conventions / 约定

### Key and foreign-key conventions / 主键与外键约定

- **Primary key.** Every table has a surrogate `id` — a 64-bit auto-increment integer (or a database-generated UUID where rows are created on the client). It is the only stable internal handle; never overload a business value as the primary key.
- **Foreign key.** A reference to table `X` is named `xId` and constrained `FK -> X.id`. The text below names the parent table for every foreign key.
- **External id.** Import-facing tables carry an `externalId` — the kindergarten's own roster number from the spreadsheet — with a unique index per tenant. This is the join key on re-import, so an update matches an existing row instead of creating a duplicate.
- **Tenant scoping.** Every business table carries `tenantId` (FK -> Tenant.id). v1 serves a single 园 site, but the column and its index are present so multi-tenant isolation never requires a schema change.
- **Timestamps.** Every table has `createdAt` and `updatedAt` (UTC). Append-only tables (see below) omit `updatedAt`.
- **Soft state, not hard delete.** Person and content rows use a `status` enum rather than row deletion, so history and governance trails survive. Hard purge is reserved for an explicit deletion request (see retention classes).
- **Type notation.** `string(n)` = variable text up to n characters; `enum(a|b|c)` = a constrained set; `date` = calendar date; `datetime` = timestamp; `bool` = boolean; `int` / `bigint` = integers; `decimal(p,s)` = fixed-point; `json` = a typed JSON column; `url` = a validated URL string.

### PII and retention classes / 个人信息与留存分级

The **PII?** column marks personal information. **Minors' data (`未成年人数据`)** — a child's name, photo, video, and evaluation — is sensitive personal information and is always tied to a `ConsentRecord` and a `RetentionPolicy`. The canonical term is `未成年人数据`; the glossary flags any other variant (see [glossary.json](glossary.json)).

> 中文：PII? 列标注个人信息。`未成年人数据`（幼儿姓名、照片、视频、评价）属敏感个人信息，恒与同意记录及留存策略绑定。规范术语为 `未成年人数据`，其变体由术语表判为违规。

Each field has a **retention class** that says what happens to it when a child leaves, transfers, or a deletion is requested:

| Retention class | Meaning / 含义 |
|---|---|
| `operational` | Routine business data; retained while the owning record is active, purged on owner purge. |
| `sensitive-minor` | Minors' data; retained under the active `RetentionPolicy`, access revoked on `withdrawn` / `transferred`, purged only on an explicit deletion request. |
| `consent` | Consent and policy evidence; retained for the legal proof window even after the child record is purged. |
| `audit-immutable` | Append-only governance evidence; never updated, never deleted within the legal window. |
| `log` | Access and activity logs; retained for the configured log window, then rotated. |
| `derived` | Computed or rendered output (radar, report, book); regenerable, purged with its source. |

The retention decision the director set: **child data is kindergarten-owned.** On a child leaving or transferring, the data is **retained with access revoked** — a transfer is a reassignment of `classId`, and a withdrawal sets `status = withdrawn`. On an **explicit deletion request**, the `未成年人数据` is **purged**. Every `Child`, `Guardian`, and content row therefore carries a `status` and a retention class so this lifecycle is enforced field by field. See [ADR-0009](adr/0009-minors-data-retention.md).

> 中文：园方设定的留存决策为——园所拥有幼儿的相关数据。幼儿离园或转园时，数据保留但撤销访问。转园即重新指定 `classId`，离园即将 `status` 置为 `withdrawn`。收到明示删除请求时，`未成年人数据`予以清除。因此每条 `Child`、`Guardian` 与内容记录均带 `status` 与留存分级，使该生命周期逐字段可执行。详见 [ADR-0009](adr/0009-minors-data-retention.md)。

### Status lifecycles / 状态机

- **Child / Guardian / Staff:** `active` -> `transferred` (person moved class or site, `classId` reassigned) -> `withdrawn` (left; access revoked, data retained). A `purge` is an out-of-band operation triggered by a deletion request, not a `status` value.
- **Submission / Resource / Case content:** `draft` -> `pending-audit` -> (`approved` -> `published`) or (`rejected` -> back to author). The wording follows the glossary `审核` / `通过` / `驳回` set.
- **MediaAsset moderation:** `pending` -> `approved` or `rejected`. Content is invisible to non-authors until `approved` ([ADR-0005](adr/0005-mandatory-content-moderation.md)).

## Entities / 实体

Importable tables (their fields map 1:1 to a row in [templates/](templates/)) are flagged **Importable** in their heading.

### Tenant / 租户

The future multi-园 boundary; v1 holds exactly one row.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| name | string(120) | — | Yes | No | operational | Legal subject name; see [ADR-0010](adr/0010-legal-subject.md). |
| status | enum(active\|suspended) | index | Yes | No | operational | Tenant lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Kindergarten / 幼儿园

The 园 itself; child of Tenant.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| name | string(120) | — | Yes | No | operational | Display name (化龙镇中心幼儿园). |
| introText | string(2000) | — | No | No | operational | Kindergarten introduction reused in the Growth book. |
| status | enum(active\|closed) | index | Yes | No | operational | Site lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Class / 班级 — Importable

A teaching class; child of Kindergarten. A `Child` belongs to exactly one class.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| kindergartenId | bigint | FK -> Kindergarten.id, index | Yes | No | operational | Owning 园. |
| externalId | string(64) | unique(tenantId, externalId) | Yes | No | operational | Roster class number; the re-import join key. |
| name | string(80) | index | Yes | No | operational | Class name, e.g. 大一班. |
| grade | enum(nursery\|junior\|middle\|senior) | index | Yes | No | operational | Grade band; maps to 托/小/中/大. |
| headTeacherStaffId | bigint | FK -> Staff.id, index | No | No | operational | Head teacher; resolved from staff externalId on import. |
| introText | string(1000) | — | No | No | operational | Class introduction reused in the Growth book. |
| status | enum(active\|archived) | index | Yes | No | operational | Class lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Child / 幼儿 — Importable

A child; belongs to **exactly one** class via `classId`. The carrier of `未成年人数据`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| classId | bigint | FK -> Class.id, index | Yes | No | sensitive-minor | Exactly one class; a transfer reassigns this. |
| externalId | string(64) | unique(tenantId, externalId) | Yes | No | operational | Roster child number; the re-import join key. |
| name | string(80) | index | Yes | **Yes (minor)** | sensitive-minor | Child name; sensitive personal information. |
| gender | enum(male\|female\|unspecified) | — | No | **Yes (minor)** | sensitive-minor | Self-reported on roster. |
| birthDate | date | — | No | **Yes (minor)** | sensitive-minor | Date of birth. |
| enrollDate | date | — | No | No | operational | Enrollment date. |
| status | enum(active\|transferred\|withdrawn) | index | Yes | No | sensitive-minor | `transferred` reassigns classId; `withdrawn` revokes access, retains data. |
| consentRecordId | bigint | FK -> ConsentRecord.id, index | Yes | No | consent | Active guardian consent; blocks media capture if absent. |
| retentionPolicyId | bigint | FK -> RetentionPolicy.id, index | Yes | No | consent | Governs purge timing for this child's data. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Guardian / 监护人 — Importable

A child's guardian; the `家长端` user. A guardian may relate to more than one child.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| externalId | string(64) | unique(tenantId, externalId) | Yes | No | operational | Roster guardian number; the re-import join key. |
| name | string(80) | index | Yes | **Yes** | operational | Guardian name. |
| phone | string(20) | index | Yes | **Yes** | operational | Contact and login phone; encrypted at rest. |
| relation | enum(mother\|father\|grandparent\|other) | — | Yes | No | operational | Relation to the child. |
| status | enum(active\|inactive) | index | Yes | No | operational | Account lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### GuardianChild / 监护关系 — Importable (join)

The many-to-many tie between a `Guardian` and a `Child`. The guardian template row carries one `childExternalId`; the importer materializes a row here.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| guardianId | bigint | FK -> Guardian.id, unique(guardianId, childId) | Yes | No | operational | The guardian. |
| childId | bigint | FK -> Child.id, index | Yes | No | sensitive-minor | The child; sets parent-client visibility scope. |
| isPrimary | bool | — | No | No | operational | Primary contact flag. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### Staff / 教师与职工 — Importable

A teacher (`教师端`) or other staff member. Admins are staff with an admin `RoleBinding`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| externalId | string(64) | unique(tenantId, externalId) | Yes | No | operational | Roster staff number; the re-import join key. |
| name | string(80) | index | Yes | **Yes** | operational | Staff name. |
| phone | string(20) | index | Yes | **Yes** | operational | Contact and login phone; encrypted at rest. |
| role | enum(admin\|teacher) | index | Yes | No | operational | Seed role; the canonical grant lives in `RoleBinding`. |
| classId | bigint | FK -> Class.id, index | No | No | operational | Optional assigned class for a teacher; resolved from class externalId on import. |
| status | enum(active\|inactive) | index | Yes | No | operational | Employment lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Admin / 管理员

A view over `Staff` holding an admin `RoleBinding`; not a separate person table. The `管理端` and `PC后台` reach is granted only through that binding, never by a column on Staff.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| staffId | bigint | FK -> Staff.id, PK | Yes | No | operational | The staff member acting as admin. |
| grantedByStaffId | bigint | FK -> Staff.id | No | No | audit-immutable | Who granted admin; recorded for governance. |
| grantedAt | datetime | — | Yes | No | audit-immutable | When admin was granted. |

### RoleBinding / 角色绑定

Identity decision: one `openid` may hold **multiple roles**. A binding ties an `openid` to one role within a scope (whole 园, a class, or a child).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| openid | string(64) | unique(openid, role, scopeType, scopeId), index | Yes | **Yes** | operational | The WeChat `openid`; obtained via `wx.login` then `code2session`. |
| role | enum(admin\|teacher\|parent) | index | Yes | No | operational | One of the three roles; a person may have several bindings. |
| scopeType | enum(kindergarten\|class\|child) | — | Yes | No | operational | What the role applies to. |
| scopeId | bigint | index | Yes | No | operational | Polymorphic id within scopeType. |
| linkedStaffId | bigint | FK -> Staff.id | No | No | operational | Set for admin / teacher bindings. |
| linkedGuardianId | bigint | FK -> Guardian.id | No | No | operational | Set for parent bindings. |
| status | enum(active\|revoked) | index | Yes | No | operational | Access toggle without deleting the binding. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### ResourceCategory / 资源分类

The fixed `衣 / 食 / 住 / 行 / 艺` taxonomy for the `资源库`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| code | enum(clothing\|food\|housing\|travel\|arts) | unique | Yes | No | operational | Maps to 衣 / 食 / 住 / 行 / 艺. |
| name | string(40) | — | Yes | No | operational | Display label. |
| sortOrder | int | — | No | No | operational | Display order. |

### Resource / 资源

A library resource; classified by one `ResourceCategory`. Visible only after its content passes the Audit and moderation gate.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| categoryId | bigint | FK -> ResourceCategory.id, index | Yes | No | operational | One of the five categories. |
| title | string(160) | index | Yes | No | operational | Resource title. |
| introText | string(2000) | — | No | No | operational | 资源简介. |
| interpretationText | string(4000) | — | No | No | operational | 资源解读. |
| accessText | string(2000) | — | No | No | operational | 资源获取. |
| conversionText | string(2000) | — | No | No | operational | 资源转化建议. |
| status | enum(draft\|pending-audit\|approved\|published\|rejected) | index | Yes | No | operational | Content lifecycle; follows the Audit flow. |
| authorStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Uploading teacher. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### Case / 案例

A curriculum case (also called the curriculum library). Filtered by grade, Five domains, activity form, and resource tag. Carries the full plan (详案).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| title | string(160) | index | Yes | No | operational | Case title. |
| introText | string(2000) | — | No | No | operational | 案例简介. |
| fullPlanMediaId | bigint | FK -> MediaAsset.id | No | No | operational | The downloadable 详案 file. |
| grade | enum(nursery\|junior\|middle\|senior) | index | No | No | operational | Target grade. |
| selfEvalText | string(2000) | — | No | No | operational | 教师自评. |
| peerEvalText | string(2000) | — | No | No | operational | 他评. |
| reflectionText | string(2000) | — | No | No | operational | 活动反思. |
| status | enum(draft\|pending-audit\|approved\|published\|rejected) | index | Yes | No | operational | Content lifecycle; follows the Audit flow. |
| authorStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Uploading teacher. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |
| updatedAt | datetime | — | Yes | No | operational | Last change. |

### CaseResourceLink / 案例资源关联

The bidirectional navigation between a `Case` and a `Resource` (案例详情 to 关联资源 and back).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| caseId | bigint | FK -> Case.id, unique(caseId, resourceId) | Yes | No | operational | The case. |
| resourceId | bigint | FK -> Resource.id, index | Yes | No | operational | The linked resource. |

### CaseFilterTag / 案例筛选标签

Filter tags applied to a `Case` (Five domains, activity form, resource tag).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| caseId | bigint | FK -> Case.id, index | Yes | No | operational | The tagged case. |
| tagType | enum(domain\|activity-form\|resource-tag) | index | Yes | No | operational | Filter axis. |
| tagValue | string(60) | index | Yes | No | operational | E.g. health / language / society / science / arts for a domain tag. |

### Submission / 提交

A teacher's submit-for-Audit event over a `Resource` or `Case`. One submission per Audit decision; the trail of decisions is held in `AuditRecord`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| targetType | enum(resource\|case) | index | Yes | No | operational | What was submitted. |
| targetId | bigint | index | Yes | No | operational | Resource.id or Case.id. |
| submittedByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Submitting teacher. |
| state | enum(pending-audit\|approved\|rejected) | index | Yes | No | operational | Current decision state. |
| submittedAt | datetime | — | Yes | No | operational | When submitted for Audit. |

### AuditRecord / 审核记录 (immutable / 不可变)

An **append-only** record of one Audit decision: who, when, the decision, and the reason. Never updated, never deleted within the legal window.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | audit-immutable | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | audit-immutable | Owning tenant. |
| submissionId | bigint | FK -> Submission.id, index | Yes | No | audit-immutable | The submission decided. |
| decision | enum(approve\|reject\|override) | index | Yes | No | audit-immutable | The Audit outcome; `通过` / `驳回` / manual override. |
| reason | string(1000) | — | Conditional | No | audit-immutable | Required when decision is reject or override. |
| decidedByStaffId | bigint | FK -> Staff.id, index | Yes | **Yes** | audit-immutable | The deciding admin. |
| decidedAt | datetime | index | Yes | No | audit-immutable | Decision time. |

### MediaAsset / 媒体资源 (OSS url + moderation status)

Every photo, video, audio, and document. The **file lives in OSS**; the database stores only its URL and moderation status. Files are never stored in the database ([ADR-0004](adr/0004-backend-cloudbase-vs-alibaba.md), [ADR-0005](adr/0005-mandatory-content-moderation.md)).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| ossUrl | url | — | Yes | No | operational | OSS object URL; the file itself is not in the database. |
| mediaType | enum(image\|video\|audio\|document) | index | Yes | No | operational | Asset kind. |
| moderationStatus | enum(pending\|approved\|rejected) | index | Yes | No | operational | Gate state; invisible to non-authors until `approved`. |
| moderationReason | string(500) | — | No | No | audit-immutable | Reason on `rejected` or manual override. |
| containsMinorData | bool | index | Yes | No | sensitive-minor | True when the asset shows a child; binds it to consent and retention. |
| childId | bigint | FK -> Child.id, index | No | **Yes (minor)** | sensitive-minor | Set when the asset depicts a specific child. |
| uploadedByOpenid | string(64) | index | Yes | **Yes** | operational | Uploader; the author who may see it while `pending`. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### Notice / 通知

A resource-center or per-role Notice; delivered via Subscribe message.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| title | string(160) | index | Yes | No | operational | Notice title. |
| bodyText | string(4000) | — | Yes | No | operational | Notice body. |
| audienceRole | enum(all\|admin\|teacher\|parent) | index | Yes | No | operational | Who sees it. |
| classId | bigint | FK -> Class.id, index | No | No | operational | Optional class scope. |
| publishedByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Publishing staff. |
| publishedAt | datetime | index | No | No | operational | Publish time. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### CoConstructionTask / 共建任务

An admin-published staff task; teachers participate and report progress.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| title | string(160) | — | Yes | No | operational | Task title. |
| description | string(2000) | — | No | No | operational | 任务说明. |
| dueAt | datetime | index | No | No | operational | Deadline. |
| createdByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Publishing admin. |
| status | enum(open\|closed) | index | Yes | No | operational | Task lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### TaskParticipant / 任务参与人

A teacher assigned to a `CoConstructionTask`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| taskId | bigint | FK -> CoConstructionTask.id, unique(taskId, staffId) | Yes | No | operational | The task. |
| staffId | bigint | FK -> Staff.id, index | Yes | No | operational | Participating teacher. |

### TaskProgress / 任务进度

A participant's progress entry feeding the task-progress board.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| taskId | bigint | FK -> CoConstructionTask.id, index | Yes | No | operational | The task. |
| staffId | bigint | FK -> Staff.id, index | Yes | No | operational | Reporting teacher. |
| progressState | enum(not-started\|in-progress\|submitted) | index | Yes | No | operational | Completion state. |
| materialMediaId | bigint | FK -> MediaAsset.id | No | No | operational | Submitted material. |
| updatedAt | datetime | — | Yes | No | operational | Last update. |

### GardenMoment / 在园时光

A teacher's published moment for a class or specific children; visible only to the matching guardians after moderation.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| classId | bigint | FK -> Class.id, index | Yes | No | sensitive-minor | The class scope. |
| bodyText | string(2000) | — | No | **Yes (minor)** | sensitive-minor | Caption text that may name a child. |
| publishedByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Publishing teacher. |
| moderationStatus | enum(pending\|approved\|rejected) | index | Yes | No | operational | Gate state before guardian visibility. |
| publishedAt | datetime | index | No | No | operational | Publish time. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### GardenMomentChild / 在园时光幼儿关联

Ties a `GardenMoment` to the specific children it features (single or multiple select).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| gardenMomentId | bigint | FK -> GardenMoment.id, unique(gardenMomentId, childId) | Yes | No | sensitive-minor | The moment. |
| childId | bigint | FK -> Child.id, index | Yes | **Yes (minor)** | sensitive-minor | Featured child; sets guardian visibility. |

### MediaAttachment / 媒体附件

The polymorphic link between any content row and its `MediaAsset` rows (moments, tasks, feedback, library items, materials).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| ownerType | enum(garden-moment\|task-feedback\|resource\|case\|notice\|module-material\|growth-book) | index | Yes | No | operational | Owning content kind. |
| ownerId | bigint | index(ownerType, ownerId) | Yes | No | operational | Owning row id. |
| mediaAssetId | bigint | FK -> MediaAsset.id, index | Yes | No | operational | The attached asset. |
| sortOrder | int | — | No | No | operational | Display order. |

### ParentChildTask / 亲子任务

A teacher-published Parent-child task; type ordinary or Community education.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| classId | bigint | FK -> Class.id, index | Yes | No | operational | Target class. |
| taskType | enum(ordinary\|community-education) | index | Yes | No | operational | 普通亲子 or 社区教育. |
| title | string(160) | — | Yes | No | operational | Task title. |
| requirementText | string(2000) | — | No | No | operational | 任务要求 / 上传要求. |
| dueAt | datetime | index | No | No | operational | Deadline. |
| publishedByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Publishing teacher. |
| status | enum(open\|closed) | index | Yes | No | operational | Task lifecycle. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### TaskFeedback / 任务反馈

A guardian's submitted feedback on a `ParentChildTask`; routed through moderation.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| taskId | bigint | FK -> ParentChildTask.id, index | Yes | No | operational | The task. |
| childId | bigint | FK -> Child.id, index | Yes | **Yes (minor)** | sensitive-minor | The child the feedback is for. |
| submittedByOpenid | string(64) | index | Yes | **Yes** | operational | Submitting guardian. |
| bodyText | string(2000) | — | No | **Yes (minor)** | sensitive-minor | Free-text feedback. |
| moderationStatus | enum(pending\|approved\|rejected) | index | Yes | No | operational | Gate state. |
| submittedAt | datetime | index | Yes | No | operational | Submit time. |

### MonthlyEvaluation / 月度评价

A monthly evaluation for one child, published to the guardian.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| childId | bigint | FK -> Child.id, unique(childId, periodMonth) | Yes | **Yes (minor)** | sensitive-minor | The evaluated child. |
| periodMonth | string(7) | index | Yes | No | sensitive-minor | Period as `YYYY-MM`. |
| bodyText | string(2000) | — | No | **Yes (minor)** | sensitive-minor | Evaluation narrative. |
| authorStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Authoring teacher. |
| publishedAt | datetime | — | No | No | operational | Publish-to-guardian time. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### TermEvaluation / 学期评价 (five-domain scale + radar)

A Term evaluation: the five-domain scale scores plus the generated radar and report. The scores are the basis of the Five-dimension radar chart.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| childId | bigint | FK -> Child.id, unique(childId, term) | Yes | **Yes (minor)** | sensitive-minor | The evaluated child. |
| term | string(16) | index | Yes | No | sensitive-minor | Term label, e.g. `2026-autumn`. |
| scoreHealth | decimal(3,1) | — | Yes | **Yes (minor)** | sensitive-minor | Five domains: health. |
| scoreLanguage | decimal(3,1) | — | Yes | **Yes (minor)** | sensitive-minor | Five domains: language. |
| scoreSociety | decimal(3,1) | — | Yes | **Yes (minor)** | sensitive-minor | Five domains: society. |
| scoreScience | decimal(3,1) | — | Yes | **Yes (minor)** | sensitive-minor | Five domains: science. |
| scoreArts | decimal(3,1) | — | Yes | **Yes (minor)** | sensitive-minor | Five domains: arts. |
| radarMediaId | bigint | FK -> MediaAsset.id | No | No | derived | Rendered radar image; regenerable. |
| reportText | string(4000) | — | No | **Yes (minor)** | sensitive-minor | Assessment report narrative. |
| authorStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Authoring teacher. |
| publishedAt | datetime | — | No | No | operational | Publish-to-guardian time. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### GrowthBook / 成长册

A compiled Growth book for one child; rendered server-side and exportable.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| childId | bigint | FK -> Child.id, index | Yes | **Yes (minor)** | sensitive-minor | The subject child. |
| templateCode | string(40) | — | Yes | No | operational | Selected template. |
| title | string(160) | — | Yes | No | operational | Book title. |
| status | enum(draft\|preview\|published) | index | Yes | No | operational | Compilation lifecycle. |
| exportMediaId | bigint | FK -> MediaAsset.id | No | No | derived | Rendered export file; regenerable. |
| authorStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Compiling teacher. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

### GrowthBookItem / 成长册条目

One included item in a `GrowthBook` (a moment, task, evaluation, or introduction).

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| growthBookId | bigint | FK -> GrowthBook.id, index | Yes | No | sensitive-minor | Owning book. |
| itemType | enum(garden-moment\|parent-child-task\|monthly-eval\|term-eval\|intro) | index | Yes | No | operational | Included content kind. |
| itemId | bigint | index | Conditional | No | sensitive-minor | Source row id; null for free-text intros. |
| introText | string(1000) | — | No | No | operational | Inline 园所介绍 / 班级介绍 / 教师寄语. |
| sortOrder | int | — | No | No | operational | Page order. |

### DownloadLog / 下载记录 (append-only / 仅追加)

An append-only record of each full-plan (详案) download: account and time.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | log | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | log | Owning tenant. |
| caseId | bigint | FK -> Case.id, index | Yes | No | log | The downloaded case. |
| mediaAssetId | bigint | FK -> MediaAsset.id | No | No | log | The downloaded file. |
| openid | string(64) | index | Yes | **Yes** | log | Downloading account. |
| downloadedAt | datetime | index | Yes | No | log | Download time. |

### BrowseLog / 浏览记录 (optional / 可选)

An optional append-only browse record; off unless enabled by the 园方.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | log | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | log | Owning tenant. |
| targetType | enum(resource\|case\|garden-moment) | index | Yes | No | log | What was viewed. |
| targetId | bigint | index | Yes | No | log | Viewed row id. |
| openid | string(64) | index | Yes | **Yes** | log | Viewing account. |
| viewedAt | datetime | index | Yes | No | log | View time. |

### ConsentRecord / 同意记录

A guardian's recorded consent for a child's `未成年人数据`. Evidence is retained beyond the child record.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | consent | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | consent | Owning tenant. |
| childId | bigint | FK -> Child.id, index | Yes | **Yes (minor)** | consent | The child the consent covers. |
| guardianId | bigint | FK -> Guardian.id, index | Yes | No | consent | The consenting guardian. |
| scope | enum(media\|evaluation\|growth-book\|all) | — | Yes | No | consent | What was consented to. |
| consentState | enum(granted\|withdrawn) | index | Yes | No | consent | Current consent state. |
| policyVersion | string(20) | — | Yes | No | consent | Privacy-policy version shown at consent. |
| signedFlag | bool | — | Yes | No | consent | Maps to the template `consent_signed` value. |
| recordedAt | datetime | index | Yes | No | consent | When consent was captured. |

### RetentionPolicy / 留存策略

The admin-configurable retention rule applied to a child's data; default period blank until 园方 / legal confirm.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | consent | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | consent | Owning tenant. |
| name | string(80) | — | Yes | No | consent | Policy label. |
| retainAfterLeaveDays | int | — | No | No | consent | Days to retain after `withdrawn`; blank until confirmed. |
| onLeaveAction | enum(retain-revoke-access\|purge) | — | Yes | No | consent | Default `retain-revoke-access`; purge only on deletion request. |
| exportGraceDays | int | — | No | No | consent | Export grace window for guardians. |
| isDefault | bool | index | No | No | consent | The fallback policy for new children. |

### ModuleMaterial / 模块资料

The view-first records for `党建管理`, `综合协调`, and `教研培训` (study materials, activity files, HR and logistics documents, research materials). Uploaded via the `PC后台`.

| Field | Type | Key/Index | Required | PII? | Retention class | Notes |
|---|---|---|---|---|---|---|
| id | bigint | PK | Yes | No | operational | Surrogate key. |
| tenantId | bigint | FK -> Tenant.id, index | Yes | No | operational | Owning tenant. |
| module | enum(party-building\|admin-coordination\|teaching-research) | index | Yes | No | operational | Owning module. |
| subCategory | string(60) | index | Yes | No | operational | E.g. 党建学习 / 行政统筹 / 研修. |
| title | string(160) | — | Yes | No | operational | Material title. |
| bodyText | string(4000) | — | No | No | operational | Description or detail body. |
| uploadedByStaffId | bigint | FK -> Staff.id, index | Yes | No | operational | Uploading admin. |
| publishedAt | datetime | index | No | No | operational | Publish time. |
| createdAt | datetime | — | Yes | No | operational | Creation time. |

## Relationship summary / 关系概览

The diagram below is the ER-style overview of the core entities and their cardinalities. It is fenced so it renders on the docs site.

```mermaid
erDiagram
    Tenant ||--o{ Kindergarten : has
    Kindergarten ||--o{ Class : has
    Class ||--o{ Child : "has (exactly one class per child)"
    Child }o--o{ Guardian : "GuardianChild (many-to-many)"
    Tenant ||--o{ Staff : employs
    Staff ||--o| Admin : "acts as (via RoleBinding)"
    RoleBinding }o--|| Staff : "binds (admin/teacher)"
    RoleBinding }o--|| Guardian : "binds (parent)"
    ResourceCategory ||--o{ Resource : classifies
    Resource }o--o{ Case : "CaseResourceLink (bidirectional)"
    Case ||--o{ CaseFilterTag : "filtered by"
    Submission ||--o{ AuditRecord : "decided by (immutable)"
    Resource ||--o| Submission : "submitted via"
    Case ||--o| Submission : "submitted via"
    MediaAsset ||--o{ MediaAttachment : "attached to content"
    Child ||--o{ GardenMomentChild : "featured in"
    GardenMoment ||--o{ GardenMomentChild : features
    Class ||--o{ ParentChildTask : targets
    ParentChildTask ||--o{ TaskFeedback : "feedback from guardians"
    Child ||--o{ MonthlyEvaluation : has
    Child ||--o{ TermEvaluation : "has (five-domain scale + radar)"
    Child ||--o{ GrowthBook : has
    GrowthBook ||--o{ GrowthBookItem : includes
    Case ||--o{ DownloadLog : "downloads logged"
    Child ||--|| ConsentRecord : "consent for minors' data"
    Child }o--|| RetentionPolicy : "retained under"
    CoConstructionTask ||--o{ TaskParticipant : has
    CoConstructionTask ||--o{ TaskProgress : tracked
```

Key cardinalities in words. A `Child` belongs to exactly one `Class`. A `Guardian` may link to several children, and a child to several guardians. One `openid` may hold several `RoleBinding` rows across roles and scopes. A `Submission` accumulates an immutable trail of `AuditRecord` rows. Every `MediaAsset` holds an OSS URL and a moderation status, never the file bytes. Each `Child` is tied to a `ConsentRecord` and a `RetentionPolicy` that govern its `未成年人数据`.
