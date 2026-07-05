# WeChat dev plan — study answer and recommended path

> Direct answers to: (a) do we need to study the official WeChat docs site, and (b) how should we develop the
> mini app. Companion to [wechat-miniprogram.md](wechat-miniprogram.md) (platform facts) and
> [../adr/0003-client-framework.md](../adr/0003-client-framework.md) / [../adr/0004-backend-cloudbase-vs-alibaba.md](../adr/0004-backend-cloudbase-vs-alibaba.md).

## Q1. Is https://developers.weixin.qq.com/miniprogram/dev/framework/ (and component/ + api/) needed for study?

**Yes — it is the canonical, unavoidable reference.** The framework, component, and API docs define WXML/WXSS,
the page/app lifecycle, the built-in components, and every `wx.*` / `security.*` API this product depends on
(login, media upload, content moderation, subscribe messages, document preview). You cannot build or pass
review without them.

**But you do not need to scrape them.** context7 already mirrors all three sites (High reputation), so the
better way to consult and document references is to query context7 live (version-current) instead of crawling:

| Need | context7 library ID (verified) |
|---|---|
| Framework (dev/framework) | `/websites/developers_weixin_qq_miniprogram_dev_framework` |
| Components (dev/component) | `/websites/developers_weixin_qq_miniprogram_dev_component` |
| APIs (dev/api) | `/websites/developers_weixin_qq_miniprogram_dev_api` |
| Full site (all of dev/) | `/websites/developers_weixin_qq_miniprogram_dev` |
| TypeScript typings | `/wechat-miniprogram/api-typings` |

So: **`/crawlee` scraping is not required** for the official docs — context7 covers them. Reserve crawlee only
for pages context7 lacks (e.g. specific operations-console / 备案 procedure pages, if needed later).

## Q2. How should we develop the mini app? (recommended path)

**Yes to a cross-platform framework + serverless backend, with the official docs as the API reference.**

1. **Confirm the stack** (the only blocker): framework per [ADR-0003](../adr/0003-client-framework.md) (uni-app
   proposed) and backend per [ADR-0004](../adr/0004-backend-cloudbase-vs-alibaba.md) (CloudBase-first proposed,
   Alibaba-ready). Both await product-owner sign-off.
2. **Study, in order, via context7:** framework basics (app/page lifecycle, `pages.json`/`app.json`, routing,
   sub-packages) → components (view/form/media, scroll-view, the canvas for the five-dimension radar) → APIs
   you need first: `wx.login` + `code2session`, `chooseMedia`/upload, `security.msgSecCheck` /
   `security.mediaCheckAsync` (moderation), 订阅消息, `wx.openDocument`. Pull each through context7 as you build.
3. **Scaffold against the structure:** create pages to match [../APP-STRUCTURE.md](../APP-STRUCTURE.md); populate
   `harness/structure/route-map.json` as each page lands so the structure judge can enforce conformance.
4. **Build the moderation gate first** (it is mandatory and cross-cutting — ADR-0005), then auth + roles, then
   the libraries and the audit lifecycle, then co-education, then the growth book.
5. **Refresh the map:** run `/understand-anything:understand` after code lands so the structure judge and
   reviewers compare the live codebase against the agreed structure.

## Bottom line
- Study the official docs: **yes** — but read them through context7 (no scraping).
- Build with a cross-platform framework (uni-app proposed) + CloudBase-first backend: **yes**, pending sign-off.
- Reference workflow: query context7 by the IDs above; record decisions as ADRs; keep pages aligned to APP-STRUCTURE.md.
