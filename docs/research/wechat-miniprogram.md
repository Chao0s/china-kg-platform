# WeChat Mini Program （微信小程序） Platform Research

> **Project context:** 化龙镇中心幼儿园电子资源平台 — a kindergarten electronic-resource platform delivered as a WeChat Mini Program with three in-app roles (admin 管理端 / teacher 教师端 / parent 家长端） plus a PC backend (PC后台）. The app is media-heavy: photos, videos, text, PPT/PDF/attachments, resource libraries, case libraries, growth records, five-dimension radar evaluations, notices, audits/approval flows, task boards, and exportable growth books （成长册）.
>
> **Research date:** 2026-06-18. All facts below are sourced to official WeChat docs (developers.weixin.qq.com / cloud.weixin.qq.com) or government sources where possible, with URLs cited inline. Where a fact comes from a community/secondary source it is marked as such — verify against the live official doc before relying on it, as WeChat changes limits and rules frequently.

---

## 0. TL;DR — the decisions that matter most

1. **Register as a 政府/事业单位 (government / public institution) subject**, not 个人。 A public kindergarten （公办幼儿园） is a 事业单位； this requires **mandatory WeChat 认证 (300 CNY/year)** and unlocks the full API surface (WeChat Pay, more members, advanced interfaces). The kindergarten itself (or its supervising 教育局） must be the 主体。 Do **not** build this on an 个人 (personal) account — personal accounts cannot be certified, are feature-limited, and an education platform for minors should sit under an institutional subject for compliance. ([account types](https://developers.weixin.qq.com/miniprogram/introduction/))
2. **小程序备案 (ICP filing) is mandatory.** Since **2023-09-01** no new Mini Program can go live without completing 备案； existing ones had to file by **2024-03-31**. Budget time for this — it involves 工信部 SMS verification (from 12381) and telecom-bureau review. ([WeChat filing notice](https://developers.weixin.qq.com/community/develop/article/doc/0008ae6038c8a86fee2036e1c66c13))
3. **Content moderation （内容安全） is NOT optional.** Every UGC entry point — parent/teacher text, comments, uploaded photos, videos, audio, even avatars and nicknames — **must** be passed through `security.msgSecCheck` (text) and `security.mediaCheckAsync` (image/audio/video). Skipping this is a hard审核 rejection and an ongoing compliance/legal risk. The old synchronous `security.imgSecCheck` is deprecated; use the async v2 APIs. ([content security 2.0](https://developers.weixin.qq.com/community/minihome/doc/000082ca04c0188b858c8f84f56801))
4. **Recommended stack:** **uni-app (Vue 3) or Taro (React)** for the client (so the same codebase yields the WeChat Mini Program **and** an H5/PC build for the PC后台）, plus **WeChat 云开发 / CloudBase** as the serverless backend （云数据库 + 云函数 + 云存储）. This is the lowest-ops path for a small kindergarten team. See §7.
5. **Education + minors compliance:** PIPL （个人信息保护法）, the 未成年人网络保护条例 (effective 2024-01-01), and WeChat's own 隐私保护指引 all apply. Children's photos = sensitive/minors' data → needs guardian consent, a declared privacy policy, and minimization. See §6.

---

## 1. Account & Registration

### 1.1 Subject （主体） types

WeChat Mini Programs are registered against a **subject type （帐号主体）**. The main types: ([official intro](https://developers.weixin.qq.com/miniprogram/introduction/), [community Q&A](https://developers.weixin.qq.com/community/develop/doc/283404d688cff44684042a2e62a0af19))

| Subject type | Who it's for | Certification （认证） | Notes for this project |
|---|---|---|---|
| **个人 (Individual)** | 18+ with PRC ID, verified WeChat | **Cannot be certified** | Feature-limited; ~15 project/experience members; no WeChat Pay. **Not suitable** for an institutional education app handling minors' data. |
| **企业 (Enterprise)** | Companies, branches, brands | Bank-transfer verify (free) **or** WeChat认证 (300 CNY) | Full features when certified. |
| **个体工商户 (Sole proprietor)** | Registered individual businesses | As enterprise | N/A for a public kindergarten. |
| **政府 (Government)** | Government agencies, **public institutions/事业单位**, administrative bodies | **WeChat认证 mandatory (300 CNY)** | **Most likely correct type for 公办幼儿园。** Certification required before many features unlock. |
| **媒体 (Media)** | Press, TV, radio, news agencies | WeChat认证 mandatory | N/A. |
| **其他组织 (Other organizations)** | Non-profits, social orgs | WeChat认证 mandatory | Fallback if the kindergarten cannot file under 政府/事业单位。 |

### 1.2 Which type for a public kindergarten?

- A **公办幼儿园 (public kindergarten)** is a **事业单位 (public institution)**, which registers under the **政府** subject family (covers 机关、事业单位、行政机构）. It must use **WeChat 认证** （打款验证 / bank-transfer verify is generally only for 企业）; government/institution subjects must go through WeChat认证 to verify identity, and certain features stay locked until认证 passes. ([account types](https://developers.weixin.qq.com/miniprogram/introduction/))
- A **民办幼儿园 (private kindergarten)** would typically register as **企业** (or 其他组织 if non-profit).
- **Who can be the 主体 （法人/responsible party):** the kindergarten's own legal entity (with its 统一社会信用代码 / 事业单位法人证书） and its 法定代表人 （园长 or as recorded). If the kindergarten lacks an independent legal-person status, the supervising **教育局 / 镇政府** may need to be the registering subject. **Open question to confirm with the kindergarten's admin office.**

### 1.3 Costs

| Item | Cost | Frequency |
|---|---|---|
| Mini Program account registration | Free | One-time |
| **WeChat 认证 （微信认证）** — required for 政府/事业单位 | **300 CNY** | **Annual** (re-verified yearly) |
| AppID | Free (issued on registration) | — |
| ICP 备案 (via WeChat) | Free through WeChat's filing service | One-time per Mini Program |
| Server / domain (only if self-hosting) | Varies | Recurring |
| 云开发 CloudBase | Free tier available; paid from ~19.9 CNY/mo | Monthly (see §3) |

Sources: certification fee 300 CNY ([account types](https://developers.weixin.qq.com/miniprogram/introduction/)); confirmed across community guides.

### 1.4 AppID & 认证 verification

- On registration you receive an **AppID** (unique Mini Program identifier) and an **AppSecret** (server credential — keep secret).
- **主体认证 (subject verification):** government/institution subjects must complete **微信认证** — submit the org's qualification docs （事业单位法人证书 / 统一社会信用代码）, 法人 info, and an authorization letter; WeChat (via a third-party verifier) confirms identity. Until认证 passes, parts of the platform (e.g. WeChat Pay, some open interfaces) are unavailable. ([account types](https://developers.weixin.qq.com/miniprogram/introduction/))

### 1.5 小程序备案 (ICP filing) — MANDATORY

Per the 工信部 (MIIT) notice of **2023-08-04** and WeChat's implementation: ([WeChat 备案 notice](https://developers.weixin.qq.com/community/develop/article/doc/0008ae6038c8a86fee2036e1c66c13), [must file before listing](https://developers.weixin.qq.com/community/develop/article/doc/00060696d3c0a851fc30af38761013), [ICP filing guide](https://developers.weixin.qq.com/community/develop/doc/0004865a038420ad21891a20651409))

- **New Mini Programs:** must complete 备案 **before going live**, effective **2023-09-01**.
- **Existing Mini Programs:** had to file by **2024-03-31**; non-compliant ones were delisted starting **2024-04-01**.
- **Process (5 stages):** (1) submit filing info in WeChat's 备案 system → (2) WeChat platform preliminary review → (3) **工信部 SMS verification** (sent from **12381**; must be completed on the MIIT site within **24 hours** or the filing auto-rejects) → (4) 通信管理局 (telecom bureau) review → (5) filing success. ([SMS verification detail](https://zhuanlan.zhihu.com/p/685555677))
- WeChat provides 备案 / 变更 / 注销 services in-platform, so a separate ICP host is not strictly required when using 云开发。 ([WeChat filing notice](https://developers.weixin.qq.com/community/develop/article/doc/0008ae6038c8a86fee2036e1c66c13))
- Legal basis: 反电信网络诈骗法， 互联网信息服务管理办法， 非经营性互联网信息服务备案管理办法。

> **Plan for this:** 备案 can take days to a few weeks. Do it early; it gates go-live.

---

## 2. Frameworks / Development Options

The client must run as a WeChat Mini Program. The project **also needs a PC后台 (admin)** — so a framework that compiles to **both Mini Program and H5/Web** removes duplicate work.

### 2.1 Options compared

| | **Native (WXML/WXSS/JS/WXS)** | **Taro (React)** | **uni-app (Vue 2/3)** |
|---|---|---|---|
| Language | WXML + WXSS + JS + WXS | React (JSX/TSX) | Vue (SFC) |
| Compiles to WeChat MP | Yes (native) | Yes | Yes |
| Other MP platforms （支付宝/抖音/百度/QQ) | No | Yes | Yes |
| **H5 / Web (for PC后台 reuse)** | **No** | **Yes** | **Yes** |
| App (iOS/Android) | No | Yes (React Native) | Yes |
| Latest stable | Bundled w/ base library | **Taro 4.x** (React core; Vue 2/3 supported) | uni-app (Vue 3); **uni-app x** is the new compiled-native variant |
| Ecosystem | WeChat-official, most stable, best perf | JD-maintained, large | DCloud-maintained, huge in CN, strong tooling (HBuilderX) |
| Best fit here | Pure WeChat-only, max stability/perf | Team already knows React | Team knows Vue; fastest CN onboarding |

Sources: [Taro intro](https://docs.taro.zone/en/docs/) · [Taro release notes](https://docs.taro.zone/en/docs/version) · [Taro cross-platform](https://docs.taro.zone/en/docs/envs) · [Mini Program Academy: Taro](https://mp.ac.cn/en/frameworks/taro).

### 2.2 Pros/cons for THIS project

- **Native:** Best performance and the most reliable access to brand-new WeChat APIs (no wrapper lag). **But** zero PC/H5 reuse — you'd build the PC后台 separately. Good if the PC后台 is a fully separate web admin anyway.
- **Taro (React):** One React codebase → Mini Program + H5 (usable for the PC后台） + RN. Excellent if the dev team is React-fluent. Watch for occasional lag wrapping the very newest WeChat-only APIs (you may drop to native calls).
- **uni-app (Vue):** The most popular cross-platform choice in China, strong docs in Chinese, HBuilderX tooling, large component/plugin market (uni_modules), and the same codebase yields the WeChat MP + an H5 admin. Best if the team is Vue-oriented and wants the smoothest Chinese-language ecosystem.

> **Recommendation:** **uni-app (Vue 3)** or **Taro (React)** depending on team skill, specifically so the **PC后台 can be an H5 build of the same codebase** (or at least share components/business logic). Both are mature and battle-tested for media-heavy CN apps. See §7.

---

## 3. Backend Options

### 3.1 云开发 / CloudBase (serverless) vs. self-hosted

| | **WeChat 云开发 / CloudBase** | **Custom backend (self-hosted)** |
|---|---|---|
| Components | 云数据库 (MongoDB-like), 云函数 (Node.js), 云存储 (object storage), 云调用 | Your server + DB + object storage + load balancer + ops |
| Ops burden | **Minimal** — no server/scaling/patching | You manage everything |
| Domain 备案 + HTTPS | **Not needed** for 云开发 calls (SDK uses WeChat channel) | **Required:** ICP-filed domain, HTTPS cert, whitelisted in MP backend |
| Auth integration | **openid auto-injected** into 云函数 — no manual code2session needed | You implement `wx.login` → `code2session` yourself |
| Cost | Free tier + ~19.9 CNY/mo base + pay-as-you-go | Server + bandwidth + cert + ops time |
| Best for | **Small teams, fast MVP, low ops** | Heavy compute, existing infra, complex integrations |

Sources: [云开发 overview](https://cloud.weixin.qq.com/cloudbase) · [云开发 capabilities](https://developers.weixin.qq.com/minigame/dev/wxcloud/basis/capabilities.html) · [云函数](https://developers.weixin.qq.com/minigame/dev/wxcloud/guide/functions.html) · [自建 vs 云开发 community write-up](https://developers.weixin.qq.com/community/develop/article/doc/00060ccc0243c05e48c90ce7356013).

**CloudBase pricing (verify on the calculator before committing):** "基础套餐 + 按量付费" model. New users get a free experience environment (~6 months) equivalent to the base tier; since 2025-02-19 each Mini Program account with no cloud env can create one free cloud env (free while the Mini Program is unpublished). Base套餐 ~**19.9 CNY/mo**, then pay-as-you-go above quota. ([计费说明](https://developers.weixin.qq.com/minigame/dev/wxcloud/billing/price.html) · [配额说明](https://developers.weixin.qq.com/minigame/dev/wxcloud/billing/quota.html) · [price calculator](https://cloud.weixin.qq.com/cloudbase/price)).

> **Caveat for media-heavy apps:** 云存储 egress/storage and 云函数 invocations are metered. For a kindergarten with lots of photos/videos, **monitor 云存储 bandwidth costs** — these can grow. Mitigate with image compression on upload, video thumbnails, and CDN. If costs balloon, a hybrid (CloudBase for logic + a cheaper OSS bucket via custom backend) is possible.

### 3.2 Login / identity flow

**Self-hosted flow** ([traditional flow](https://developers.weixin.qq.com/community/develop/article/doc/00060ccc0243c05e48c90ce7356013)):
1. Client calls **`wx.login()`** → gets a temporary **`code`**.
2. Client sends `code` to your server.
3. Server calls **`auth.code2Session`** (`https://api.weixin.qq.com/sns/jscode2session`) with AppID + AppSecret + code → returns **`openid`**, **`session_key`**, and (if bound to a WeChat 开放平台 account) **`unionid`**.
4. Server issues your own session token.

**云开发 flow:** when the client calls a 云函数， WeChat **auto-injects the caller's `openid`** into the function context (`cloud.getWXContext()`), so you do **not** manually run code2session for basic identity — this is a major simplification. ([云开发 vs 自建](https://developers.weixin.qq.com/community/develop/article/doc/00060ccc0243c05e48c90ce7356013))

- **`openid`** = unique per user **per Mini Program**.
- **`unionid`** = unique per user **across all apps under the same 开放平台 主体** (use if the kindergarten also has an Official Account / other apps and needs a shared user identity).

> **Recommendation:** **云开发 / CloudBase** for this project — it removes 备案-of-a-domain, server ops, and the manual auth dance, which is exactly what a small kindergarten team needs.

---

## 4. SDKs / APIs needed for this app's features

> All client APIs are under the `wx.*` namespace; server/HTTP APIs are under `api.weixin.qq.com` or callable via 云开发 云调用。

### 4.1 Login & user identity

| Need | API / component | Notes |
|---|---|---|
| Login code | **`wx.login()`** | Returns `code`; exchange server-side. ([flow](https://developers.weixin.qq.com/community/develop/article/doc/00060ccc0243c05e48c90ce7356013)) |
| openid/unionid | **`auth.code2Session`** (server) | Or auto-injected via 云函数。 |
| User profile | **`wx.getUserProfile()`** | Avatar/nickname now via the avatar/nickname filling component for new apps. |
| **Phone number** | **`<button open-type="getPhoneNumber" bindgetphonenumber="...">`** → server **`phonenumber.getPhoneNumber`** | New flow (base lib ≥ 2.21.2): callback returns a **`code`** (valid 5 min, single use); exchange it server-side via `POST https://api.weixin.qq.com/wxa/business/getuserphonenumber`. **Costs 0.03 CNY per successful call since 2023-08-28** (1000 free quota), **but government / education / public-medical / non-profit subjects are exempt (free)** — relevant here. ([phone component](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html) · [server API](https://developers.weixin.qq.com/miniprogram/dev/server/API/user-info/phone-number/api_getphonenumber.html)) |

### 4.2 File / media upload

| Need | API | Limits |
|---|---|---|
| Pick image/video | **`wx.chooseMedia()`** | Returns **temporary** file paths; supports `sizeType` (original/compressed), `mediaType` (image/video), count. ([chooseMedia](https://developers.weixin.qq.com/miniprogram/dev/api/media/video/wx.chooseMedia.html)) |
| Pick message file (PPT/PDF/docs) | **`wx.chooseMessageFile()`** | Pick files forwarded from WeChat chats. |
| Upload (self-host) | **`wx.uploadFile()`** | Single upload **≤ 10 MB** (community-reported limit). ([uploadFile limit](https://developers.weixin.qq.com/community/develop/doc/0004e8b4a708d0c4930dd179b56400)) |
| Upload （云开发） | **`wx.cloud.uploadFile()`** | `cloudPath` (remote name) + `filePath` (local temp path); stores in 云存储。 For very large media (>100 MB), compress or chunk. ([CloudBase upload](https://docs.cloudbase.net/recipes/add-file-upload-wechat-miniprogram)) |
| Temp → persistent | 云存储 / `FileSystemManager.saveFile` | `wx.chooseMedia` paths are temporary (lost on restart) — must upload to persist. |

> **Important:** `chooseMedia` temp files are ephemeral; always upload to 云存储 (or your OSS) immediately. Compress images client-side (`sizeType: ['compressed']`) to cut storage/bandwidth — critical for a photo-heavy kindergarten app.

### 4.3 Media playback

| Need | Component / API |
|---|---|
| Video | **`<video>`** component (poster, controls, autoplay), or **`wx.createVideoContext()`** |
| Audio | **`<audio>`** is deprecated → use **`wx.createInnerAudioContext()`** / `InnerAudioContext` |
| Image preview | **`wx.previewImage()`** (full-screen swipe gallery) |
| Live (optional) | `live-player` / `live-pusher` (needs class qualification) |

### 4.4 Content security / moderation （内容安全） — **MANDATORY for UGC**

WeChat **requires** all user-generated content to pass moderation before publish/display. This is enforced at审核 time and on an ongoing basis. ([content security 2.0 announcement](https://developers.weixin.qq.com/community/minihome/doc/000082ca04c0188b858c8f84f56801) · [接入 UGC to 内容安全](https://developers.weixin.qq.com/community/minihome/doc/000ca499e88fd83b65f208fcc66c00))

| API | Checks | Status & notes |
|---|---|---|
| **`security.msgSecCheck`** | **Text** (comments, titles, descriptions, names, nicknames) | Use **v2** (`version: 2`). v1.0 stopped updating 2021-09. In v2, `errcode:0/ok` only means *request* succeeded — you must read the **`result`/`detail`** fields to decide pass/risky/block. For UGC scenes you **must pass the real user `openid`** (user active within ~2 h). Limits: ~4000 calls/min/appId, 2,000,000/day. ([msgSecCheck](https://developers.weixin.qq.com/community/develop/doc/0002023cb844386bca4389dd866800) · [quota](https://developers.weixin.qq.com/community/develop/doc/00028c78670118ffe934f2e9766800)) |
| **`security.mediaCheckAsync`** | **Images, audio, video** (async) | **The required path for media now.** Pass `media_url`, `media_type`, `version: 2`, `scene`, and `openid`. Result returns **asynchronously via 消息推送** (your server's message-receive endpoint / 云函数）, not in the HTTP response. Limits: ~2000 calls/min/appId, 200,000/day. |
| **`security.imgSecCheck`** (sync) | Images (sync) | **Deprecated** in favor of `mediaCheckAsync` — do not build new flows on it. ([imgSecCheck deprecation thread](https://developers.weixin.qq.com/community/develop/doc/000cee99fec91086c72d707e15b800)) |

**What must be checked (per WeChat):** *all* UGC entry points — user-typed text, **comment text and images**, uploaded **photos/videos/audio**, **avatars**, **nicknames**. "未检测 UGC 模块将导致整体合规判断不通过" — missing any UGC module causes the overall compliance check to **fail**. ([UGC 接入](https://developers.weixin.qq.com/community/minihome/doc/000ca499e88fd83b65f208fcc66c00))

> **Compliance consequence if skipped:** 审核 rejection (cannot publish); after launch, illegal content surfacing → Mini Program suspension/封禁， and legal liability for the 主体 under content-management regulations. For an app where **parents upload children's photos**, robust moderation is both a WeChat rule and a child-protection necessity.
>
> **Architecture pattern:** On every upload/comment, run `msgSecCheck`(text) + `mediaCheckAsync`(media) in a 云函数 *before* marking content "published/visible." Hold media in a "pending" state until the async callback returns "pass." Wire the async result endpoint (message push / 云函数 trigger).

### 4.5 Subscribe messages （订阅消息） — notices, task & approval reminders

Template messages （模板消息） were **discontinued 2020-01-10**; use **订阅消息**. ([subscribe message guide](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html))

| Need | API |
|---|---|
| Get a template ID | Configure in mp.weixin.qq.com → 订阅消息 → pick from 公共模板库 (or apply). Long-term templates are only open to specific categories. |
| Ask user to subscribe | **`wx.requestSubscribeMessage({ tmplIds: [...] })`** — shows the opt-in dialog; user can "always allow." |
| Send (server) | **`subscribeMessage.send`** (`api.weixin.qq.com/cgi-bin/message/subscribe/send`) |

- **一次性 (one-time):** one push per authorization — flexible, but re-prompt each time. Good for ad-hoc "approval result," "new notice," "task assigned."
- **长期 (long-term):** subscribe once → many pushes; **only open to specific categories** (may not apply to a kindergarten). Confirm eligibility.
- Daily send caps: ~10,000,000/day (or 30M if WeChat-Pay-enabled). ([subscribe guide](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html))

> **Pattern:** For notices/task/approval reminders, use **一次性订阅** and re-request consent at natural touchpoints (e.g. when a teacher posts a notice, prompt the parent to subscribe to that notice's result). To send N reminders, collect N authorizations.

### 4.6 Charts — five-dimension radar （五维雷达图）

| Option | Notes |
|---|---|
| **echarts-for-weixin (ec-canvas)** | Official Apache ECharts wrapper for WeChat MP. Copy the `ec-canvas` component into your project; supports radar (`type: 'radar'`) with custom `indicator`. Uses Canvas 2D when base lib ≥ 2.9.0. Best general-purpose choice; rich radar support. ([repo](https://github.com/ecomfe/echarts-for-weixin) · [ECharts in MP practice](https://developers.weixin.qq.com/community/develop/article/doc/000ec2223a43881b1eb0e644b61c13)) |
| **AntV F2 (f2-canvas)** | Mobile-first, smaller; supports radar. Good if you want a lighter footprint. |

> Perf tip: ≤ 5 canvas charts per page; reuse the canvas/chart instance and update data instead of recreating. Both libraries work under uni-app/Taro via their respective wrappers.

### 4.7 Document / PDF preview & export

| Need | API |
|---|---|
| Open/preview a document | **`wx.openDocument({ filePath, fileType })`** — supports **doc, docx, xls, xlsx, ppt, pptx, pdf**. ([openDocument](https://developers.weixin.qq.com/miniprogram/dev/api/file/wx.openDocument.html)) |
| Download first | **`wx.downloadFile()`** — single download **≤ 50 MB** (community-reported; older builds up to 200 MB; verify). Returns a temp path → pass to `openDocument`. ([downloadFile size](https://developers.weixin.qq.com/community/develop/doc/00066aa8bb4e980e3098ed9ec51000)) |
| File system | **`wx.getFileSystemManager()`** → `FileSystemManager` (read/write/save/unzip local files). ([FileSystemManager](https://developers.weixin.qq.com/miniprogram/dev/api/file/wx.getFileSystemManager.html)) |

**Exporting the 成长册 (growth book) to PDF/image:**
- **In-app image export:** render the page/cards to a canvas and **`wx.canvasToTempFilePath()`** → save with **`wx.saveImageToPhotosAlbum()`**. Good for single-page/photo growth cards.
- **Multi-page PDF （成长册）:** best generated **server-side** （云函数 + a PDF library, e.g. headless render / pdfkit / puppeteer-style on a server) → store in 云存储 → deliver to the client via `downloadFile` + `openDocument`, or push a download link. The Mini Program client has no native multi-page PDF generator, so do heavy PDF composition on the backend.

### 4.8 Data export / download records

- For admin/PC后台 exports (rosters, evaluation data, audit logs): generate the file (xlsx/csv/pdf) **server-side / in the PC admin H5**, store in 云存储/OSS, and provide a download link. Within the Mini Program, deliver via `downloadFile` + `openDocument`.
- Log download/export actions (who/when/what) in 云数据库 for audit trails — relevant given children's data.

---

## 5. Key platform limits & rules

### 5.1 Package size

| Limit | Value | Source |
|---|---|---|
| Main package （主包） | **≤ 2 MB** | [size discussion](https://developers.weixin.qq.com/community/develop/doc/00064e611bc670794d5f10fd45f400) |
| Single subpackage （单个分包） | **≤ 2 MB** | same |
| **Total (all packages)** | **≤ 30 MB** (≤ 20 MB if built by a 第三方服务商/service provider) | same |
| Subpackage preload | ≤ 2 MB | same |

> **Implication:** Code only — **media never ships in the package**; it lives in 云存储/OSS and is fetched at runtime. Use **分包 (subpackaging)** to split the 3 role areas (admin/teacher/parent) so each role's code loads on demand and the 主包 stays under 2 MB. ([performance guide](https://developers.weixin.qq.com/community/develop/doc/00040e5a0846706e893dcc24256009))

### 5.2 Domain whitelist & HTTPS

All network calls go only to **pre-configured domains** set in the MP backend: ([网络 ability](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html) · [域名管理](https://developers.weixin.qq.com/doc/oplatform/developers/basic_func/domain.html))

- **request合法域名** (`wx.request`), **uploadFile合法域名** (`wx.uploadFile`), **downloadFile合法域名** (`wx.downloadFile`), **socket合法域名** (`wx.connectSocket`), and **业务域名** (for `web-view`).
- **HTTPS only** — no plain HTTP, no IP addresses, no `localhost`.
- Each domain must be **ICP-备案'd**; a newly-filed domain can only be configured **after 24 h**.
- 业务域名 requires placing a verification file at the domain root.
- Local dev can bypass via "不校验合法域名/TLS/HTTPS证书" in DevTools (dev only). ([2025 domain guide](https://blog.csdn.net/u012210662/article/details/149384843))

> **Using 云开发 avoids most of this** — 云开发 SDK calls don't need domain whitelisting. You only need domains if you call your own server or load external pages in `web-view`.

### 5.3 Review （审核） & common rejection reasons

Common rejections relevant to a UGC/education app: ([avoid-rejection guide](https://web.softunis.com/1281.html))

- **类目 mismatch** — declared service category doesn't match actual function.
- **UGC not connected to 内容安全** — missing moderation on any UGC entry (see §4.4).
- **Missing 资质** for the chosen education category (see §5.4).
- **Privacy non-compliance** — no/incorrect 隐私保护指引， calling privacy APIs without consent (see §6).
- **Illegal/inappropriate content**, broken pages, misleading info, incomplete features in the submitted demo.
- Account info inconsistent with 主体。

### 5.4 类目 (category) requirements

Service categories are declared in the MP backend; some need **资质 (qualification docs)**. ([service category & subject requirements](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/cityservice/CategoryAndSubjectRequirements.html) · [education qualification thread](https://developers.weixin.qq.com/community/develop/doc/00006ca5200f68a4baa0f47c961c00))

- **教育 categories** vary: a simple 题库/info tool may need no special资质， but **在线视频课程 / 教育平台** categories typically require **办学许可证** and possibly 广播电视节目制作 qualifications.
- For a kindergarten's **internal resource & growth platform** (not selling courses to the public), the most fitting category is likely **教育 → 学校/教育信息服务** type; as a 政府/事业单位 主体 you generally provide the 办学/事业单位 credentials.
- **Action:** in the MP backend, check the exact category list under 教育 and the documents each demands, then match to the kindergarten's available credentials. **Confirm before submission** — wrong category = rejection.

---

## 6. Compliance for minors / education in China

This is a high-stakes area because **parents upload children's photos/videos** — children's data is **sensitive personal information** and minors' data has extra protection.

### 6.1 Legal framework

- **个人信息保护法 (PIPL)** — children's personal info (under 14) is **sensitive personal information**; processing requires **separate consent from a parent/guardian** and a dedicated processing rule. ([贝远 compliance note](https://www.beiyuanlawyer.com/beiyuanlvsuo/research/1e5a6a75-07ad-4214-a724-e7a998a154ae.html))
- **未成年人网络保护条例** — adopted 2023-09-20, **effective 2024-01-01**; providers primarily serving children under 14 must strictly comply with PIPL + 未成年人保护法 + 儿童个人信息网络保护规定 with dedicated compliance work. ([gov.cn](https://www.gov.cn/zhengce/content/202310/content_6911288.htm) · [CAC](https://www.cac.gov.cn/2023-10/24/c_1699806932316206.htm))
- **WeChat 用户隐私保护指引** — developers handling personal info must **declare collected data types in the MP backend** and **prompt users to read & agree to the privacy policy via a popup** before calling privacy APIs (e.g. `wx.getUserProfile`, `wx.chooseMedia`, `getPhoneNumber`, location). Enforced since **2023-10-17**; non-compliant apps get **error 112** or lose privacy-API access entirely. Mechanisms: `wx.getPrivacySetting()`, `<button open-type="agreePrivacyAuthorization">`, `wx.onNeedPrivacyAuthorization()`. ([WeChat privacy guide](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html))

### 6.2 Practical compliance checklist for this app

- [ ] **Register/configure a 隐私保护指引** in the MP backend declaring every data type collected (photos, videos, phone, names, etc.) and show the consent popup before any privacy API.
- [ ] **Obtain explicit guardian consent** for collecting/displaying children's photos/videos (separate, informed consent — not buried in a general ToS). Provide a dedicated **儿童个人信息保护规则 / 监护人须知**.
- [ ] **Data minimization** — collect only what the platform needs; avoid storing more children's images than necessary; set retention limits.
- [ ] **Access control** — strictly scope who sees a child's data (a parent should see only their own child; teachers only their class). Enforce in 云函数 with openid-based authorization.
- [ ] **Content moderation** on all uploads (§4.4) — also protects children from inappropriate content.
- [ ] **Audit logging** of access/export of children's data (supports the platform's own audit/approval features and legal accountability).
- [ ] **Security** — encrypt sensitive data at rest where feasible; never expose AppSecret client-side; secure the PC后台 with role-based auth.
- [ ] **Education 类目 资质** — supply the kindergarten's 办学/事业单位 credentials as required by the chosen category (§5.4).

---

## 7. Recommended tech-stack decision

### 7.1 The recommendation

| Layer | Choice | Rationale |
|---|---|---|
| **Subject / account** | **政府 / 事业单位** subject, **WeChat认证 (300 CNY/yr)**; kindergarten (or 教育局） as 主体 | Required for an institutional education app handling minors; unlocks full APIs; phone-number API exempt from per-call fees for education/government subjects. |
| **Client framework** | **uni-app (Vue 3)** *or* **Taro (React)** — pick by team skill | Single codebase → WeChat Mini Program **+ H5 build for the PC后台**, avoiding a separate admin app. Mature, large CN ecosystems. |
| **Backend** | **WeChat 云开发 / CloudBase** （云数据库 + 云函数 + 云存储） | Lowest ops for a small team: no server, no domain-备案， openid auto-injected, integrated storage. Monitor media bandwidth costs. |
| **Auth** | `wx.login` (auto openid via 云函数） + phone-number component | Simple, compliant identity; phone for account binding/roles. |
| **Moderation** | `security.msgSecCheck` (text v2) + `security.mediaCheckAsync` (media v2) in 云函数， pre-publish gating | Mandatory; "pending until pass" pattern. |
| **Notifications** | 订阅消息 （一次性） via `wx.requestSubscribeMessage` + `subscribeMessage.send` | Template messages are gone; one-time is the realistic path. |
| **Charts** | echarts-for-weixin (ec-canvas), radar type | Best radar support for the 五维 evaluation. |
| **Docs/export** | `downloadFile` + `openDocument` for preview; **server-side （云函数） PDF generation** for 成长册； `canvasToTempFilePath` for image cards | MP can't compose multi-page PDFs client-side. |
| **Packaging** | 主包 < 2 MB; **分包 per role** (admin/teacher/parent); media in 云存储 | Stay within 2 MB/30 MB limits; on-demand load. |

### 7.2 If the team strongly prefers maximum stability / WeChat-only

Use **Native** for the Mini Program and build the **PC后台 as a separate web app** (any web stack) talking to CloudBase via the 云开发 HTTP API or a thin custom backend. Trade-off: two codebases, but max native API fidelity.

### 7.3 What to set up BEFORE coding

1. **Register the Mini Program** under the correct 政府/事业单位 主体； obtain **AppID/AppSecret**; complete **WeChat认证**.
2. **Start 小程序备案** immediately (it gates go-live; 工信部 SMS within 24 h).
3. In the MP backend: **declare 服务类目** (education) with required **资质**, and **configure the 隐私保护指引** (declare all collected data types).
4. **Decide & confirm**: who is the legal 主体， which education 类目， whether 长期订阅 is available to you.
5. Set up **CloudBase environment** (free tier to start) and the **云函数** project; design **云数据库** collections (users/roles, classes, resources, cases, growth records, evaluations, notices, tasks, audit logs) and **云存储** structure (per-class/per-child folders with access rules).
6. Stand up the **content-moderation 云函数** (msgSecCheck + mediaCheckAsync + async result handler) early — it's load-bearing for compliance and审核。
7. Scaffold the client with **uni-app or Taro**, configure **分包** for the three roles, and verify an **H5 build** works for the PC后台。

### 7.4 Docs to study next (official)

- Mini Program intro & account types — https://developers.weixin.qq.com/miniprogram/introduction/
- 备案 notice — https://developers.weixin.qq.com/community/develop/article/doc/0008ae6038c8a86fee2036e1c66c13
- 云开发 getting started — https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html
- 内容安全 2.0 — https://developers.weixin.qq.com/community/minihome/doc/000082ca04c0188b858c8f84f56801
- 订阅消息 — https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
- 手机号组件 — https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html
- 隐私保护指引 — https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html
- 服务类目与主体资质 — https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/cityservice/CategoryAndSubjectRequirements.html
- 网络/域名 — https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
- chooseMedia — https://developers.weixin.qq.com/miniprogram/dev/api/media/video/wx.chooseMedia.html
- openDocument — https://developers.weixin.qq.com/miniprogram/dev/api/file/wx.openDocument.html
- echarts-for-weixin — https://github.com/ecomfe/echarts-for-weixin
- Taro docs — https://docs.taro.zone/

---

## 8. Recommendations & open questions

### Recommendations (summary)

1. **Account:** Register as **政府/事业单位**, do **WeChat认证 (300 CNY/yr)**, complete **备案** before launch. Kindergarten or 教育局 as 主体。
2. **Stack:** **uni-app (Vue 3) or Taro (React)** client (→ Mini Program + H5 PC后台） + **CloudBase** serverless backend.
3. **Non-negotiable compliance:** **content moderation on every UGC entry** (`msgSecCheck` + `mediaCheckAsync`), a **declared 隐私保护指引**, and **guardian consent + minimization** for children's data.
4. **Architecture:** media in 云存储 (compressed/thumbnailed), 分包 per role, server-side PDF for 成长册， 一次性订阅消息 for reminders, ec-canvas for the 五维雷达图。

### Open questions (confirm with the kindergarten / 教育局）

1. **Legal 主体：** Does the kindergarten have independent 事业单位法人 status (and 统一社会信用代码） to register itself, or must the 教育局/镇政府 be the 主体？
2. **Education 类目：** Which exact 服务类目 fits an internal resource/growth platform, and which **资质** documents does it demand? (Verify in the live MP backend.)
3. **长期订阅消息：** Is the kindergarten's category eligible for long-term subscribe messages, or must everything be 一次性？
4. **Media cost ceiling:** Expected volume of photos/videos — does CloudBase 云存储 bandwidth/storage stay within budget, or is a hybrid OSS needed?
5. **UnionID:** Will there be a companion Official Account / other app needing shared identity (drives openid vs unionid design)?
6. **Data residency / retention:** Define retention periods and deletion workflow for children's media to satisfy minimization.
7. **PC后台 scope:** Is the PC后台 an H5 build of the same codebase, or a fully separate web admin? (Affects framework reuse value.)

> **Caveat:** WeChat changes limits, fees, and rules frequently. Re-verify every numeric limit (package sizes, upload/download caps, quotas, prices) and every 资质/类目 requirement against the live official docs at submission time. Community-sourced figures above are flagged as such.
