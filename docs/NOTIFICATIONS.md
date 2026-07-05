# NOTIFICATIONS.md — 订阅消息 (Subscribe message) event catalogue

- **Status:** Build-ready spec (derived from [PRD.md](PRD.md) §6 / §7.3, [GRILLING.md](GRILLING.md) item F)
- **Date:** 2026-06-18
- **Scope:** Every user-facing notification event, its recipient role, what triggers it, the channel it uses,
  and its mandatory fallback.

## 1. Mechanism decision

WeChat notifications on this platform use **`订阅消息` (Subscribe message)** — the per-user, consent-based
mechanism. It is the only supported path: the legacy `模板消息` mechanism is retired and arbitrary `推送` is
not a Mini Program capability, so those words must not appear in code or product copy (Avoid: `模板消息`,
`推送`). See [glossary.json](glossary.json) `subscribe-message`.

Two facts shape the whole catalogue:

- **One-time-subscribe is realistic; long-term eligibility is OPEN.** A `订阅消息` is granted by the user one
  delivery at a time unless the account qualifies for a long-term template, and that eligibility depends on
  the education `类目` and is unconfirmed ([GRILLING.md](GRILLING.md) item F). We design for the one-time
  case and treat any long-term grant as a bonus.
- **Therefore every notification MUST have an in-app inbox fallback.** Because a `订阅消息` may not be granted
  (the user declined, the one-time grant was already consumed, or the quota is exhausted), the canonical
  record of every notification is an in-app inbox entry inside the relevant `Notice` / to-do surface. The
  `订阅消息` is a best-effort nudge layered on top; the inbox is the source of truth. A user who never
  accepts a `订阅消息` must still be able to find every notification in-app.

## 2. Event catalogue

Channel column: "`订阅消息` + inbox" means attempt a `订阅消息` when a grant is available and always write the
in-app inbox entry. Fallback column states what happens when no `订阅消息` is sent.

| Event | Recipient (role) | Trigger | Channel | Fallback when no 订阅消息 granted |
|---|---|---|---|---|
| New `Notice` published | parent + teacher (audience of the notice) | Admin publishes a resource-center or role `Notice` | `订阅消息` + inbox | Inbox entry in the `Notice` list; surfaced as a to-do badge on `Home` |
| Submission approved | teacher (author) | Admin `Audit` decision = `Approve`; item enters the library | `订阅消息` + inbox | Inbox entry; the item's status flips to published in the author's upload list |
| Submission rejected | teacher (author) | Admin `Audit` decision = `Reject` with required reason | `订阅消息` + inbox | Inbox entry carrying the reason; item returns to `Draft` for revision in the upload list |
| New co-construction task | teacher (selected participant) | Admin publishes a `Co-construction task` and selects the teacher | `订阅消息` + inbox | Inbox entry; task appears in the teacher to-do list with its deadline |
| New parent-child task | parent (of the targeted child / class) | Teacher publishes a `Parent-child task` to a class or child | `订阅消息` + inbox | Inbox entry; task appears in the parent to-do list with its deadline |
| Task feedback received | teacher (task owner) | Parent submits feedback on a `Parent-child task` (after moderation) | `订阅消息` + inbox | Inbox entry; completion progress updates on the teacher's task board |
| Garden moment published | parent (guardian of the moment's child / class) | Teacher publishes a `Garden moment` (after moderation) | `订阅消息` + inbox | Inbox entry; the moment appears in the parent's child-related feed |
| Evaluation published | parent (guardian of the child) | Teacher publishes a `Monthly evaluation` or a completed `Term evaluation` | `订阅消息` + inbox | Inbox entry; evaluation appears under the child's growth record |
| Audit pending | admin | A teacher submits a resource or case into `pending-audit` | In-app admin queue (primary) + optional `订阅消息` | The admin audit queue badge on `Home` and in the `PC backend`; a `订阅消息` to admins is best-effort only |

## 3. Subscribe-message constraints and risk

- **Ask at the moment of intent.** Because a one-time grant covers a single delivery, request the `订阅消息`
  authorisation right where the user takes the related action (for example, ask a parent to subscribe to
  task replies just after they accept a `Parent-child task`), so the grant is fresh when the event fires.
- **Quota and eligibility are a known risk.** The number of `订阅消息` deliveries is bounded by what each
  user has granted, and long-term subscription depends on category eligibility that is still
  open ([GRILLING.md](GRILLING.md) item F). Build assuming grants are scarce: never rely on a `订阅消息`
  arriving, and never put information *only* in a `订阅消息`.
- **Content rules apply.** A `订阅消息` body must match an approved template and stay within WeChat content
  limits; the human-readable detail always lives in the in-app inbox entry, which the `订阅消息` links to.
- **No `订阅消息` for un-moderated content.** A garden moment, feedback, or evaluation notification fires only
  after the underlying UGC passes the content-moderation gate ([ADR-0005](adr/0005-mandatory-content-moderation.md)),
  so a notification can never point a parent at content that has not cleared moderation.
- **Minors-data care.** Notifications about a child are sent only to that child's guardians; bodies avoid
  embedding sensitive `未成年人数据` and link into the access-controlled in-app view instead
  ([ADR-0009](adr/0009-minors-data-retention.md)).

## 4. Inbox fallback contract

- The in-app inbox is per-user and role-scoped; a parent's inbox never references staff modules
  ([APP-STRUCTURE.md](APP-STRUCTURE.md) role access).
- Every event in §2 writes exactly one inbox entry at trigger time, independent of whether the `订阅消息`
  send succeeds, so delivery failure degrades the experience (no push nudge) but never loses the message.
- Unread inbox entries drive the to-do badges on `Home`, giving a reliable, grant-free path to every
  notification.
