# Data dictionary — pointer to the schema of record / 数据字典——指向权威结构

- **Status:** Reduced to a pointer, 2026-08-19. This file previously held a 606-line entity model that no longer matches the database.
- **Date:** 2026-06-18, superseded 2026-08-19
- **Authority:** `../hualong-backend/db/01_schema.sql`

## The schema of record / 唯一权威

The field-level data model is **not** maintained in this repository. It lives in the sibling backend repo:

```
../hualong-backend/db/01_schema.sql
```

That file is the sole authority: **62 tables, 719 columns**, every column carrying a Chinese
`COMMENT ON COLUMN`. It is not a proposal. As of 2026-08-19 it has been executed against **PostgreSQL 16.14**
on the platform instance, together with its seed and verification scripts — 601 column comments, 116 indexes,
56 triggers, 926 constraints, and 27 verification assertions passing with zero violations.

> 中文：字段级数据模型不在本仓库维护，唯一权威为 `../hualong-backend/db/01_schema.sql`：62 张表、719 列，每列均带中文列注释。该文件已于 2026-08-19 在平台实例的 PostgreSQL 16.14 上实际执行，连同种子与校验脚本一并通过，校验断言 27 项全数无违规。

**The umbrella repository deliberately does not duplicate it.** A second copy of a field list is a second copy
that goes stale, which is exactly what happened to the previous version of this document. Anything that needs
a column name should read the DDL.

Related authorities in the same repo:

| Subject | File |
| --- | --- |
| Field-level schema | `../hualong-backend/db/01_schema.sql` |
| Design rationale per table | `../hualong-backend/db/DATABASE_SPEC.md` |
| Known gaps, including the seven blockers | `../hualong-backend/db/GAPS.md` |
| Cross-application decisions | `../hualong-backend/DECISIONS.md` |

## What changed — correct your mental model / 已删除与替换的实体

If you remember the old entity list, these are the differences that will bite you. Each was a deliberate
decision recorded in `../hualong-backend/DECISIONS.md`.

| Old entity | Status | Replacement |
| --- | --- | --- |
| `db_parent_child` / GuardianChild | **Deleted** | `db_child.caretakers`, a `JSONB` column with a GIN index. Guardianship is no longer a join table, so there is no foreign key protecting it. |
| `db_teacher_class` | **Deleted** | `db_teacher.class_id` plus `assignment_role`. **A teacher belongs to exactly one class** — a product constraint, not merely a schema simplification. |
| `db_admin_school` | **Deleted** | Merged into `db_admin`. Under a single-kindergarten system the relation was effectively one-to-one. |
| `db_upload` | **Deleted** | Superseded by the file-reference model. |
| `db_resource_case` | **Deleted** | Superseded. |
| `db_party_feature` | **Deleted** | Superseded. |
| `db_month_eval_moment` | **Deleted** | Superseded. |
| `db_community_submission` | **Deprecated** | Community co-education is a feed view over parent tasks and their submissions, not its own table. |
| `MediaAsset` with an OSS url | **Replaced** | Files live in Tencent COS, referenced by key, reached through short-lived pre-signed credentials. See [ADR-0014](adr/0014-cloud-vendor-tencent.md). |
| `GrowthBook` + `GrowthBookItem` | **Replaced** | Roughly ten tables now, covering school-level release snapshots, per-term class compilation, sections, widgets, materials and per-child books. The two-entity model does not survive contact with F17 to F20. |

New since the old dictionary, and worth knowing exists: `db_child_profile_correction` (guardian-proposed
corrections to a child's name, birth date or gender, subject to admin approval) and `db_school_term` (the
system-wide term calendar, now a hard dependency for three admin operations).

## What this repository still owns / 本仓库仍负责的部分

Only one thing: the **roster import templates** in [`templates/`](templates/), because they are an interface
with the kindergarten rather than an internal schema detail.

| Template | Target | One row is |
| --- | --- | --- |
| `templates/classes.csv` | Class / 班级 | One class |
| `templates/children.csv` | Child / 幼儿 | One child, in exactly one class |
| `templates/guardians.csv` | Guardian / 监护人 | One guardian linked to one child |
| `templates/staff.csv` | Staff / 教师与职工 | One teacher or admin |

Each template column maps to a column in the DDL, so a spreadsheet flows into the relational structure without
renaming. Rows match existing records on their `*_external_id`, so a re-import updates rather than duplicates.
See [`templates/README.md`](templates/README.md) for the validation rules and the required import order.

> **Note for whoever next touches the templates.** `guardians.csv` still models guardianship as one row per
> guardian-child pair, which matched the deleted join table. The database now carries caretakers as a `JSONB`
> array on the child. The template shape is still a reasonable *import* format — flat rows are easier for a
> 信息员 to fill in a spreadsheet — but the importer must fold those rows into the array rather than writing a
> join table that no longer exists. This is an unresolved implementation detail, recorded here so it is not
> discovered during the first real import.

## Cross-references

- Access control over these entities: [SECURITY.md](SECURITY.md).
- What the roster feeds: [ANALYTICS.md](ANALYTICS.md) active-rate denominators.
- Cloud vendor and object storage: [ADR-0014](adr/0014-cloud-vendor-tencent.md).
- Minors' data retention, still unsigned: [ADR-0009](adr/0009-minors-data-retention.md).
