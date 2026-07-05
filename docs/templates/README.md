# Roster import templates / 名册导入模板

- **Status:** Draft v0.1
- **Date:** 2026-06-18
- **Authority:** Field definitions — [../DATA-DICTIONARY.md](../DATA-DICTIONARY.md). Terminology — [../glossary.json](../glossary.json).

## What these files are / 文件用途

These four CSV files are the import-ready roster templates for the `PC后台`. The director decided the roster arrives as CSV / Excel, so each template column maps **1:1** to a field in [../DATA-DICTIONARY.md](../DATA-DICTIONARY.md). The same column names flow from a spreadsheet straight into the relational schema with no renaming. Each template carries one clearly-marked example row; replace it with real data before import.

> 中文：这四个 CSV 文件是 `PC后台` 的导入名册模板。园方决定名册以 CSV / Excel 形式提供，故每个模板列与 [../DATA-DICTIONARY.md](../DATA-DICTIONARY.md) 中的字段一一对应。同名列从表格直入关系结构，无需改名。每个模板含一行明示的示例数据，导入前请替换为真实数据。

| Template / 模板 | Target entity / 目标实体 | One row is / 一行表示 |
|---|---|---|
| `classes.csv` | Class / 班级 | One class. |
| `children.csv` | Child / 幼儿 | One child in exactly one class. |
| `guardians.csv` | Guardian / 监护人 | One guardian linked to one child. |
| `staff.csv` | Staff / 教师与职工 | One teacher or admin. |

## Workflow / 工作流程

1. **Export a template from the `PC后台`.** The user-management screen exports a blank template, or the current roster pre-filled for editing.
2. **Fill it in Excel or any CSV editor.** Keep the header row exactly as shipped; do not rename, reorder, or remove columns.
3. **Re-import in the `PC后台`.** The importer validates every row (see below) and reports errors by line and column before anything is written.
4. **Track changes by re-import.** A row matches an existing record on its `*_external_id`, so editing a cell and re-importing **updates** that record rather than creating a duplicate.

> 中文：流程为——从 `PC后台` 导出模板（空白模板，或预填当前名册供编辑）；在 Excel 或任意 CSV 编辑器中填写，表头须与原样一致，不得改名、调序或删列；在 `PC后台` 重新导入，导入器逐行校验（见下文），写入前按行列报告错误；以 `*_external_id` 匹配既有记录，故修改单元格后重新导入为更新该记录，而非新建重复行。

## Import order / 导入顺序

Import in dependency order so foreign-key references resolve: **`classes.csv` first, then `staff.csv`, then `children.csv`, then `guardians.csv`.** A child references its class by `class_name`; a guardian references its child by `child_external_id`; a teacher may reference an assigned class by `class_name`. Importing out of order leaves those references unresolved.

> 中文：按依赖顺序导入，使外键引用可解析。顺序为先 `classes.csv`，再 `staff.csv`，然后 `children.csv`，最后 `guardians.csv`。幼儿以 `class_name` 引用班级。监护人以 `child_external_id` 引用幼儿。教师可以 `class_name` 引用所带班级。顺序颠倒会使这些引用无法解析。

## Column reference / 列说明

Each column below names the dictionary field it maps to. The example value comes from the shipped sample row.

### classes.csv — 班级

| Column / 列 | Maps to / 对应字段 | Required | Rule / 规则 |
|---|---|---|---|
| `class_external_id` | Class.externalId | Yes | Unique within the kindergarten; the re-import key. |
| `class_name` | Class.name | Yes | Display class name, for example a senior class shown as 大一班 on the roster. |
| `grade` | Class.grade | Yes | One of `nursery` / `junior` / `middle` / `senior`. |
| `head_teacher_staff_id` | Class.headTeacherStaffId | No | A `staff_external_id` from `staff.csv`; resolved on import. |

### children.csv — 幼儿

| Column / 列 | Maps to / 对应字段 | Required | Rule / 规则 |
|---|---|---|---|
| `child_external_id` | Child.externalId | Yes | Unique within the kindergarten; the re-import key. |
| `name` | Child.name | Yes | `未成年人数据`; needs consent before any media is captured. |
| `gender` | Child.gender | No | One of `male` / `female` / `unspecified`. |
| `birth_date` | Child.birthDate | No | ISO date `YYYY-MM-DD`. |
| `class_name` | Child.classId | Yes | Must match a `class_name` in `classes.csv`; sets the one class. |
| `guardian_phone` | Guardian.phone | No | Primary guardian phone; used to pre-link a guardian. |
| `enroll_date` | Child.enrollDate | No | ISO date `YYYY-MM-DD`. |
| `status` | Child.status | Yes | One of `active` / `transferred` / `withdrawn`. |
| `consent_signed` | ConsentRecord.signedFlag | Yes | `Y` or `N`; `N` blocks media capture until consent is recorded. |

### guardians.csv — 监护人

| Column / 列 | Maps to / 对应字段 | Required | Rule / 规则 |
|---|---|---|---|
| `guardian_external_id` | Guardian.externalId | Yes | Unique within the 园; the re-import key. |
| `name` | Guardian.name | Yes | Guardian name. |
| `phone` | Guardian.phone | Yes | Login and contact phone; 11 digits. |
| `relation` | Guardian.relation | Yes | One of `mother` / `father` / `grandparent` / `other`. |
| `child_external_id` | GuardianChild.childId | Yes | Must match a `child_external_id` in `children.csv`. |

### staff.csv — 教师与职工

| Column / 列 | Maps to / 对应字段 | Required | Rule / 规则 |
|---|---|---|---|
| `staff_external_id` | Staff.externalId | Yes | Unique within the 园; the re-import key. |
| `name` | Staff.name | Yes | Staff name. |
| `phone` | Staff.phone | Yes | Login and contact phone; 11 digits. |
| `role` | Staff.role | Yes | `admin` or `teacher`; the canonical grant is a `RoleBinding`. |
| `class_name` | Staff.classId | No | Optional assigned class for a teacher; match a `class_name` in `classes.csv`. |

## Validation rules / 校验规则

The `PC后台` importer declines a file when any rule fails and reports the offending line and column:

- **Header match.** The header row must equal the shipped template exactly (names, order, count).
- **Required cells.** Every Required column must be non-empty.
- **Enumerations.** `grade`, `gender`, `status`, `relation`, and `role` must use a listed value.
- **Dates.** `birth_date` and `enroll_date` must be ISO `YYYY-MM-DD`.
- **Phone.** `phone` and `guardian_phone` must be 11 digits.
- **Uniqueness.** Each `*_external_id` must be unique within its file.
- **References resolve.** `class_name` and `child_external_id` must point to an existing row (hence the import order above).
- **Consent flag.** `consent_signed` must be `Y` or `N`; the importer creates or updates a `ConsentRecord` accordingly.

A row that fails any rule is not written; valid rows in the same file are reported separately so a partial fix is easy.

> 中文：任一规则不通过即整文件不予导入，并按行列报告问题——表头须与模板完全一致（名称、顺序、数量）；Required 列不得为空；`grade`、`gender`、`status`、`relation`、`role` 须取所列枚举值；`birth_date`、`enroll_date` 须为 ISO `YYYY-MM-DD`；`phone`、`guardian_phone` 须为 11 位数字；各 `*_external_id` 在文件内唯一；`class_name`、`child_external_id` 须指向既有行（故有上述导入顺序）；`consent_signed` 须为 `Y` 或 `N`，导入器据此创建或更新同意记录。失败行不写入，同文件中的有效行单独报告，便于局部修正。

## Encoding and format / 编码与格式

- **Encoding is UTF-8.** Save every file as UTF-8 (no BOM). Chinese names need it; non-UTF-8 files are not imported.
- **Delimiter is a comma.** Quote any value that itself contains a comma.
- **One header row, then data rows.** Keep the example row only as a guide; delete it before importing real data.
- **No reordering.** The importer reads by column name, but a changed header fails the header-match rule.

> 中文：编码为 UTF-8——所有文件以 UTF-8 保存（不带 BOM），中文姓名依赖此编码，非 UTF-8 文件不予导入；分隔符为逗号，含逗号的值需加引号；保留一行表头与若干数据行，示例行仅作参照，导入真实数据前删除；列名不可改动，导入器按列名读取，表头变动即触发表头匹配失败。

## Privacy note / 隐私说明

The example rows contain **no real people**. `children.csv` and `guardians.csv` hold personal information, including `未成年人数据`; handle the filled files under the same access controls as the database and delete local copies once imported. See [../DATA-DICTIONARY.md](../DATA-DICTIONARY.md) and [../adr/0009-minors-data-retention.md](../adr/0009-minors-data-retention.md).

> 中文：示例行不含真实个人。`children.csv` 与 `guardians.csv` 含个人信息（含 `未成年人数据`），填好的文件须按与数据库同等的访问控制处理，导入后删除本地副本。详见 [../DATA-DICTIONARY.md](../DATA-DICTIONARY.md) 与 [../adr/0009-minors-data-retention.md](../adr/0009-minors-data-retention.md)。
