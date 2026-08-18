# NOTIFICATIONS.md — In-app notification catalogue / 站内通知目录

- **Status:** Build-ready spec v0.2, revised 2026-08-19
- **Date:** 2026-06-18, revised 2026-08-19
- **Scope:** Every user-facing notification event, its recipient role, what triggers it, and where it lands.

> **Revised 2026-08-19 — the mechanism changed.** v1 notifications are **in-app only**. There are no WeChat
> `订阅消息` (Subscribe message) sends anywhere in v1. The previous version of this document treated
> `订阅消息` as the primary channel with an in-app fallback; that is inverted now, and the outbound channel is
> simply not built. The reasoning is preserved in §4 because it explains why the in-app inbox was designed to
> stand alone in the first place — that design is exactly what makes dropping the outbound channel cheap.

## 1. Mechanism

**Every notification is an in-app entry. That entry is the notification, not a fallback for one.**

The in-app inbox is per-user and role-scoped. Unread entries drive the to-do badges on 首页, which gives every
user a reliable path to every notification with no dependency on a platform grant, a quota, or a category
eligibility that is outside the team's control.

`订阅消息` remains the only mechanism WeChat supports for outbound push — the legacy `模板消息` is retired and
arbitrary push is not a Mini Program capability, so neither word belongs in code or product copy. If outbound
push is added later, it layers **on top of** the catalogue below and changes nothing in it: the in-app entry
is still written first and is still the record.

## 2. Event catalogue

Every row writes exactly one in-app entry at trigger time.

| Code | Event | Recipient (role) | Trigger | Where it lands |
| --- | --- | --- | --- | --- |
| — | New 通知 published | parent + teacher (the notice audience) | Admin publishes a resource-centre or role 通知 | Entry in the 通知 list; to-do badge on 首页 |
| — | Submission approved | teacher (author) | Admin audit decision is Approve; the item enters the library | Entry; the item flips to published in the author's upload list |
| — | Submission rejected | teacher (author) | Admin audit decision is Reject, with a required reason | Entry carrying the reason. **The item does not return to draft** — rejection is terminal and resubmission of the same item is forbidden. The author creates a new item instead. |
| — | New co-construction task | teacher (selected participant) | Admin publishes a 共建任务 and selects the teacher | Entry; the task appears in the teacher to-do list with its deadline |
| — | New parent-child task | parent (of the targeted child or class) | Teacher publishes a 亲子任务 | Entry; the task appears in the parent to-do list with its deadline |
| — | Task feedback received | teacher (task owner) | Parent submits feedback, after moderation | Entry; completion progress updates on the teacher's task board |
| — | Garden moment published | parent (guardian of the moment's child) | Teacher publishes a 在园时光, after moderation | Entry; the moment appears in the parent's child-related feed |
| — | Evaluation published | parent (guardian of the child) | Teacher publishes a 月度评价 or a completed 学期评价 | Entry; the evaluation appears under the child's growth record |
| — | Audit pending | admin | A teacher submits a resource or case into `pending-audit` | The admin audit queue badge on 首页 and in the PC后台 |
| — | Child-profile correction decided | parent (the requesting guardian) | Admin rejects a correction request | Entry carrying the reason, sent to every current caretaker. **Approval sends nothing** — the record simply changes |
| **`n4`** | Growth-book collection reminder | parent (guardian of a child with an outstanding slot) | Teacher presses 提醒家长 on a section where the child has not submitted | Entry; the outstanding section appears in the parent's to-do list |
| **`n5`** | Growth book published | parent (every valid caretaker of the child) | A child's book reaches `b2` — published and opened | Entry; the book becomes readable in the parent client |

### Notes on the growth-book events

- **`n5` fires once per valid guardian, inside the same transaction that sets `b2`.** It must be idempotent on
  replay, and it must not fire for a child with zero recorded caretakers, nor for a child the teacher
  explicitly skipped during finalization — those children stay at `b1`.
- **`n4` is the teacher's only recourse for a missing submission.** The teacher cannot upload on the family's
  behalf; 代传, takeover and correction are all forbidden. Any product copy telling a parent that a teacher
  will cover a missing slot is wrong and must be removed.

## 3. Constraints

- **No notification for un-moderated content.** A garden-moment, feedback or evaluation notification fires
  only after the underlying UGC passes the content-moderation gate
  ([ADR-0005](adr/0005-mandatory-content-moderation.md)), so a notification can never point a parent at
  content that has not cleared moderation.
- **Minors-data care.** Notifications about a child go only to that child's guardians. Bodies avoid embedding
  sensitive 未成年人数据 and link into the access-controlled in-app view instead
  ([ADR-0009](adr/0009-minors-data-retention.md)).
- **Role scoping.** A parent's inbox never references staff modules
  ([APP-STRUCTURE.md](APP-STRUCTURE.md) role access).
- **Write the entry with the action.** The entry is written in the same change that ships the action, never
  retrofitted — see the definition of done in [DELIVERY.md](DELIVERY.md).

## 4. Why the in-app inbox was always the record / 为何站内通知始终是唯一记录

Retained from v0.1, because it explains why removing the outbound channel cost nothing.

A `订阅消息` is granted by the user one delivery at a time unless the account qualifies for a long-term
template, and that eligibility depends on the education 类目, which is still unconfirmed. The original design
therefore treated every outbound send as best-effort and required an in-app entry regardless: a user who
never accepted a `订阅消息` still had to be able to find every notification in the app.

Because the inbox was already the source of truth rather than a consolation prize, dropping the outbound
channel from v1 removed a compliance dependency and a quota risk without changing a single event definition.
If long-term eligibility is later confirmed, outbound push can be added on top of this catalogue without
revisiting it.

> 中文：`订阅消息` 为一次性授权，长期模板须视教育类目资质而定，该资质至今未确认。原设计因此始终要求写入站内条目，把 `订阅消息` 视为尽力而为。正因站内通知本就是唯一记录，v1 取消该外发通道并未改动任何事件定义，只是移除了一项合规依赖与配额风险；若日后确认长期资质，可在本目录之上叠加 `订阅消息`，无需重做。

## 5. Cross-references

- Access control and role scoping: [SECURITY.md](SECURITY.md).
- Definition of done, which requires the entry to ship with the action: [DELIVERY.md](DELIVERY.md).
- Content-moderation gate: [ADR-0005](adr/0005-mandatory-content-moderation.md).
- Open questions: [GRILLING.md](GRILLING.md).
