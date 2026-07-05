# ADR-0005: Content moderation (内容安全) is a mandatory, non-bypassable gate on all UGC

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Product owner, engineering lead, compliance
- **Module / 模块:** cross-cutting (every UGC path)

## Context / 背景
This platform is saturated with user-generated content: teacher uploads (resources, cases, garden moments),
parent feedback (text/image/video), comments, evaluations, nicknames/avatars. WeChat platform rules
**require** every UGC item to pass official content-security checks before publication. Skipping this fails
review and, post-launch, exposes the kindergarten subject (主体) to suspension and legal liability — and the
content concerns minors.

> 中文：平台充满用户生成内容（教师上传、家长反馈、评论、评价、昵称头像）。微信平台强制要求所有 UGC 发布前通过内容安全校验；缺失将导致审核不通过，上线后更会使主体面临封禁与法律责任，且内容涉及未成年人。

## Decision / 决策
All UGC passes a **server-side moderation gate** (a 云函数 / backend service) before it becomes visible:
- **Text** → `security.msgSecCheck` (v2).
- **Image / video / audio** → `security.mediaCheckAsync` (v2, asynchronous; the sync `imgSecCheck` is deprecated). Content is held in a **"pending until pass"** state and only published on the async callback verdict.
- Nicknames, avatars, and comments are treated as UGC and pass the same gate.
The client must **never** publish UGC directly to a public collection; the write path goes through the gate.

> 中文：所有 UGC 在可见前必须经服务端内容安全闸门：文本用 `security.msgSecCheck`，图片/视频/音频用 `security.mediaCheckAsync`（异步，旧同步接口已弃用），“先挂起、回调通过后再发布”。昵称、头像、评论同样视为 UGC。客户端严禁直接写入公开集合。

## Alternatives considered / 备选方案
1. **Client-side only / skip** — rejected: violates platform rules; auto-reject; legal risk.
2. **Third-party moderation only (e.g. 阿里云内容安全)** — allowed as an *additional* layer, but does **not** replace the mandatory WeChat `security.*` calls.

## Consequences / 影响
- **Positive / 正面:** passes review; protects minors and the 主体; one enforced pattern.
- **Negative / 负面:** added latency and a pending state in UX; cost per check; async callback infrastructure.
- **Compliance / 合规:** core to PIPL + 未成年人网络保护条例 + WeChat 隐私保护指引. The reusable code-review check (`harness/code-review.mjs`) flags any UGC write path lacking a moderation call.
