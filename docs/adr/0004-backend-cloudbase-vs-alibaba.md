# ADR-0004: Backend platform — Alibaba Cloud (RDS + OSS + VOD + API)

- **Status:** Accepted (chose Alibaba Cloud over WeChat CloudBase)
- **Date:** 2026-06-18
- **Deciders:** Product owner, engineering lead
- **Module / 模块:** backend (data, files, media, API, auth)

## What WeChat 云开发 / CloudBase is / 什么是云开发
**云开发 (CloudBase)** is Tencent's serverless backend built into the Mini Program: 云数据库 (a document /
NoSQL store), 云函数 (Node functions, with `openid` auto-injected), and 云存储 (object storage). It is the
fastest path and avoids domain 备案 for the core, but its database is document-oriented (not relational) and
heavy media transcoding in serverless functions is constrained.

> 中文：云开发是腾讯内置于小程序的 Serverless 后端：云数据库（文档/NoSQL）、云函数（自动注入 openid）、云存储。最快且核心免域名备案，但数据库为文档型（非关系型），且在云函数中做重度媒体转码受限。

## Context / 背景
This product needs a **relational** model (children↔classes↔parents↔teachers, audits, evaluations,
reporting), **object storage** for many files (photos, docs, videos), **managed video transcoding** (lean,
compatible output without DIY ffmpeg), and **REST API endpoints** that both the native Mini Program and the
dedicated web admin call. Files are stored in object storage with only metadata + URLs in the database.

> 中文：本产品需要关系型模型（幼儿↔班级↔家长↔教师、审核、评价、报表）、海量文件的对象存储（照片/文档/视频）、托管视频转码（无需自建 ffmpeg 即得精简兼容输出），以及原生小程序与独立PC后台共同调用的 REST API。文件存对象存储，数据库仅存元数据与 URL。

## Decision / 决策
Adopt **Alibaba Cloud (阿里云)**:
- **RDS** (MySQL/PostgreSQL) — the relational source of truth.
- **OSS** — object storage for all files (resumable/multipart upload; on-the-fly image processing).
- **VOD / MPS** — managed video transcoding (H.264/HLS) + image processing; no self-run ffmpeg.
- **API on FC (serverless) or ECS** — REST endpoints over a 备案'd HTTPS domain, consumed by the Mini Program and the web admin; implement `wx.login → code2session` here.
- **CDN** for media delivery.
- **Content moderation** stays WeChat `security.*` (mandatory), optionally plus 阿里云内容安全.

> 中文：采用阿里云：RDS 关系型为唯一真相；OSS 对象存储承载全部文件（断点续传/分片上传、图片实时处理）；VOD/MPS 托管视频转码与图片处理，免自建 ffmpeg；API 部署于 FC（Serverless）或 ECS，经备案 HTTPS 域名暴露 REST 端点，供小程序与PC后台调用，并在此实现 code2session；CDN 分发媒体；内容安全仍用微信 security.*（强制），可叠加阿里云内容安全。

## Alternatives considered / 备选方案
| Option | Why not chosen |
|---|---|
| **WeChat CloudBase** | Fastest, but document DB (no true relational) and constrained serverless video transcoding clash with the stated needs. |
| **Hybrid (CloudBase + Alibaba)** | More moving parts for little gain; the native client can call any 备案'd HTTPS API directly, so CloudBase is not needed for auth. |

## Consequences / 影响
- **Positive / 正面:** relational integrity + reporting; professional media pipeline; one REST API for both clients; full control/portability.
- **Negative / 负面:** more ops than serverless — you build and run the API, configure RDS/OSS/VOD, and must 备案 the API domain (adds to the timeline, [ADR-0008](0008-launch-timeline-and-pilot.md)).
- **Compliance / 合规:** WeChat `security.*` moderation is mandatory regardless of backend ([ADR-0005](0005-mandatory-content-moderation.md)); minors'-data handling per [ADR-0009](0009-minors-data-retention.md).
