# ADR-0014: Cloud vendor is Tencent Cloud (supersedes the Alibaba choice in ADR-0004)

- **Status:** Accepted (supersedes [ADR-0004](0004-backend-cloudbase-vs-alibaba.md) on vendor and media storage)
- **Date:** 2026-08-19
- **Deciders:** Product owner, engineering lead
- **Module / 模块:** backend (compute, data, files, media, domain)

## Context / 背景
[ADR-0004](0004-backend-cloudbase-vs-alibaba.md) chose **Alibaba Cloud** — RDS for the relational store, OSS
for files, VOD/MPS for transcoding, an API on FC or ECS behind a 备案'd domain. That decision was never
executed. Everything actually provisioned is on **Tencent Cloud**, and the divergence has now hardened into
facts that are expensive to reverse: the ICP filing names a Tencent-hosted server resource, the domain is
delegated to DNSPod, and the database is live on a Tencent instance.

The backend repo has flagged the gap since the engine decision was taken and refused to treat it as settled:
`hualong-backend/CONTEXT.md` records that **D2 only closed the database engine, not the vendor or media
storage**, and states that the inconsistency still owes a new ADR. That same file also recommends Tencent COS
plus CI/VOD for media, which is the Tencent counterpart of the OSS + VOD roles ADR-0004 assigned to Alibaba.

Reversing to Alibaba now would mean refiling the ICP record against a different server resource, redelegating
the domain, and migrating a verified database and its media bucket — with a fixed launch date
([ADR-0008](0008-launch-timeline-and-pilot.md)) already unreachable on scope grounds.

> 中文：ADR-0004 选定阿里云（RDS + OSS + VOD + API），但从未落地；实际开通的全部资源均在腾讯云，且已固化：ICP 备案登记的是腾讯云服务器资源，域名托管在 DNSPod，数据库已在腾讯云实例上运行并通过校验。后端仓库自引擎决策起就标注：D2 只收口数据库引擎，未收口云厂商与媒体存储，此处仍欠一份新 ADR，并建议以腾讯云 COS + CI/VOD 承担阿里云 OSS + VOD 的角色。此时回退阿里云意味着重新备案、重新解析域名、迁移已验证的数据库与媒体桶，而上线日期本已不可达。

## Decision / 决策
Adopt **Tencent Cloud** as the platform vendor. ADR-0004's reasoning about *shape* still holds — a relational
source of truth, object storage for all files, managed media processing, a REST API behind a 备案'd HTTPS
domain — but the products are Tencent's:

| Role | ADR-0004 (Alibaba) | This ADR (Tencent) |
| --- | --- | --- |
| Compute | ECS / FC | **Lighthouse instance**, Ubuntu 24.04, Guangzhou |
| Relational store | RDS | **PostgreSQL 16 on the instance**, loopback only |
| Object storage | OSS | **COS**, standard product, private read/write |
| Media processing | VOD / MPS | **CI / VOD** when transcoding is needed |
| DNS | — | **DNSPod** |
| Content moderation | WeChat `security.*` | **unchanged** — see [ADR-0005](0005-mandatory-content-moderation.md) |

Two constraints ride with the decision:

1. **Media never transits the instance.** Its uplink is 5 Mbps, about 0.6 MB/s. Clients upload to and download
   from COS directly using short-lived pre-signed credentials; the instance issues credentials and stores
   metadata only. Measured instance-to-COS throughput over the same-region private network is roughly
   15–20 MB/s up and 85–94 MB/s down, and that traffic does not draw on the instance's monthly quota.
2. **The database is self-hosted, so backups are ours.** A managed instance was rejected on cost at this
   scale, which makes a nightly dump to COS with a tested restore a condition of the decision, not an
   optional extra.

> 中文：采用腾讯云。ADR-0004 关于架构形态的论证仍然成立——关系型唯一真相、对象存储承载全部文件、托管媒体处理、备案 HTTPS 域名下的 REST API——但产品换为腾讯云：轻量应用服务器承担计算，PostgreSQL 16 自建于该实例并仅监听回环，COS（标准产品）承担对象存储，需要转码时用 CI/VOD，域名解析用 DNSPod；内容安全仍用微信 `security.*`，不变。两条附带约束：其一，媒体不经过实例——上行仅 5 Mbps（约 0.6 MB/s），客户端凭短时预签名凭证直连 COS，实例只签发凭证与保存元数据；其二，数据库为自建，备份由我们负责，每日转储至 COS 并验证可还原是本决策的前提条件。

## Alternatives considered / 备选方案
1. **Execute ADR-0004 and migrate to Alibaba** — rejected. Nothing technical favours it now, and it would
   force refiling the ICP record, redelegating the domain, and migrating a verified database, against a
   schedule that is already over-committed.
2. **Keep ADR-0004 nominally and let practice diverge** — rejected. The divergence has already cost real time:
   a bucket was created under the wrong Tencent product because no document said which product to use.
3. **Managed database (TencentDB) instead of self-hosting** — rejected for v1. One kindergarten's metadata on a
   4-core / 8 GB instance does not justify a monthly managed-instance cost. Revisit if the tenant count grows;
   the migration path is a dump and restore.
4. **Lighthouse COS instead of standard COS** — rejected, and worth recording as a trap. Lighthouse has its own
   cut-down object-storage product. A bucket created there does not appear in the standard COS console and
   supports neither lifecycle rules nor CORS — and the console reports those missing features as a *permission*
   error, which misdirects diagnosis onto access policies. Create buckets from the standard COS console only.

## Consequences / 影响
- **Positive / 正面:** documents and infrastructure agree again; same-region private networking between the
  instance and COS is free and roughly two orders of magnitude faster than the public uplink; the ICP filing,
  DNS and compute sit with one vendor, so there is one support path and one bill.
- **Negative / 负面:** self-hosting the database moves availability, patching and backup onto the team; a single
  Lighthouse instance is a single point of failure with no built-in failover; single-AZ storage was chosen for
  cost and cannot be converted to multi-AZ in place.
- **Compliance / 合规:** unchanged in substance. Content moderation stays on the mandatory WeChat `security.*`
  calls ([ADR-0005](0005-mandatory-content-moderation.md)). The API must still sit behind a 备案'd HTTPS domain,
  and the filing is in progress against the legal subject settled in [ADR-0010](0010-legal-subject.md). Minors'
  media now rests in a private, server-side-encrypted bucket, which supports but does not by itself satisfy
  [ADR-0009](0009-minors-data-retention.md) — the retention period still needs sign-off.

## Follow-ups / 后续
- Mark [ADR-0004](0004-backend-cloudbase-vs-alibaba.md) as superseded by this ADR on vendor and media storage.
  Its relational-versus-document reasoning stands and is not reopened here.
- Correct `hualong-backend/CONTEXT.md`, which names the *Teacher Resources* server as the Hualong target host.
- Record the pre-signed upload flow in the API contract when that contract is written; it does not exist yet.
