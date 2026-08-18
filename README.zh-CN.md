# 化龙镇中心幼儿园电子资源平台

> 面向公办幼儿园的两个微信小程序 + 一个 PC后台。**本仓库是规格、设计系统、术语契约与质量工具链**，用以约束应用代码；应用本身位于四个同级仓库。
>
> English version: [README.md](README.md)。

## 这是什么

平台为幼儿园提供一个可信赖、移动优先的统一入口，覆盖资源、案例、教研培训、党建管理、综合协调与家园社共育；内置审核流程、结构化幼儿评价（五维雷达图），以及在应用内阅读的每名幼儿成长册。平台服务三种角色——管理端、教师端、家长端——分布在**两个小程序**（教师端与家长端）与一个 **PC后台** 之上。本期不做管理端小程序：管理端通过教师端与 PC后台工作。家长端刻意只展示家园社共育相关内容。

完整规格见 **[docs/PRD.zh-CN.md](docs/PRD.zh-CN.md)**（简体中文）/ **[docs/PRD.md](docs/PRD.md)**（English）。

## 为什么先做“规格 + 工具链”仓库

技术栈选错或漏掉合规要求，回退代价高昂；缺少契约时，AI 协作也容易跑偏。因此在写任何功能代码之前，本仓库先固化需求、设计系统、术语，以及一道自动化闸门，让后续每一次改动都保持一致与合规。参见 [docs/adr/0001-repository-as-spec-and-harness-foundation.md](docs/adr/0001-repository-as-spec-and-harness-foundation.md)。

## 代码在哪里

本仓库负责治理，不含应用代码。应用位于工作区根目录下的四个同级仓库，均在 `github.com/Chao0s`：

| 仓库 | 承载内容 |
|---|---|
| `../hualong-backend` | 62 张表的权威结构、跨应用决策记录、缺口册 |
| `../hualong-teacher` | 教师端小程序（默认分支为 `master`） |
| `../hualong-parent` | 家长端小程序 |
| `../hualong-admin-pc` | PC后台 |

**基础设施已就绪：** 腾讯云实例运行 PostgreSQL 16，62 张表已全部落地并通过校验；COS 对象存储承载媒体；
域名的 ICP 备案进行中（[ADR-0014](docs/adr/0014-cloud-vendor-tencent.md)）。**API 层尚不存在**，是当前的关键路径。

## 仓库内容

| 路径 | 说明 |
|---|---|
| [docs/PRD.zh-CN.md](docs/PRD.zh-CN.md) · [docs/PRD.md](docs/PRD.md) | 产品需求文档（双语） |
| [docs/DESIGN.md](docs/DESIGN.md) | 设计系统骨架（从既有设计填入） |
| [docs/glossary.json](docs/glossary.json) · [CONTEXT.md](CONTEXT.md) | 规范双语术语（机器 + 人读） |
| [docs/SECURITY.md](docs/SECURITY.md) | 权限矩阵、服务端强制不变式、STRIDE 威胁表 |
| [docs/DELIVERY.md](docs/DELIVERY.md) | 外部依赖、关键路径、各里程碑完成定义 |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | 成功指标埋点与个性化契约 |
| [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) | 应用内通知目录 |
| [docs/DATA-DICTIONARY.md](docs/DATA-DICTIONARY.md) | 指向权威结构的指针，以及名册 CSV 模板 |
| [docs/GRILLING.md](docs/GRILLING.md) | 计划盘问与待向园方确认的开放问题 |
| [docs/HANDOFF.md](docs/HANDOFF.md) | 交接文档——当前状态、阻塞项、下一步 |
| [docs/research/wechat-miniprogram.md](docs/research/wechat-miniprogram.md) | 微信小程序平台调研（账号、SDK、合规） |
| [docs/adr/](docs/adr/) | 架构决策记录 |
| `harness/` | 质量闸门：术语校验、typewriter、设计/文案评审、代码审查 |
| `tests/` | 可复用测试（单元、完整性、端到端手册） |
| `.claude/agents/` | 项目评审子代理（设计/内容议事会、评审官、合规哨兵） |

## 快速开始

```bash
# 1. 安装（同时把 git 指向提交闸门）
npm install

# 2. 运行完整质量闸门（术语 + 文风 + 设计/文案评审 + 测试）
npm run gate

# 3. 常用命令
npm run lint:fix                 # 规范文档文风
npm run new -- adr "标题"        # 按文风脚手架生成 ADR
npm test                         # 运行测试
```

环境要求：**Node >= 18** 与 **Python 3**（缺少 Python 时评审会带警告跳过）。命令清单与约定见 [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md)。可视化浏览代码库：运行 `npm run graph`（Windows 可双击 `scripts/launch-knowledge-graph.bat`），打开基于 `.understand-anything/knowledge-graph.json` 的知识图谱面板。

## 质量闸门

每次改动在提交获批前都必须通过 `npm run gate`（由 `.githooks/pre-commit` 与 CI 强制执行）：

1. **术语校验**——用词须与 [docs/glossary.json](docs/glossary.json) 一致。
2. **typewriter 文风检查**——双语文风（中文全角标点、标题层级、不含制表符）。
3. **设计评审**——对设计产物执行华数五维评审。
4. **文案评审**——清晰度、双语一致、术语、语气。
5. **测试**——`node --test tests/`。

## 合规（必备项）

本平台是处理未成年人数据的公办幼儿园产品，以下事项关乎能否上线，均不可省略：所有用户内容须经内容安全校验、小程序备案、微信认证、教育类目/资质，以及未成年人数据保护（监护人同意、数据最小化、留存期限）。详见 [docs/research/wechat-miniprogram.md](docs/research/wechat-miniprogram.md) 与 [docs/adr/0005-mandatory-content-moderation.md](docs/adr/0005-mandatory-content-moderation.md)。

## 状态

PRD v0.3（2026-08-19）。技术栈已定：[ADR-0003](docs/adr/0003-client-framework.md)（原生小程序 + 专用 PC后台）为已接受；[ADR-0014](docs/adr/0014-cloud-vendor-tencent.md)（腾讯云）在云厂商与媒体存储两处取代 ADR-0004。法律主体已确认，ICP 备案进行中。

仍未完成：API 契约尚不存在，四个仓库均未写下应用代码，12 套成长册版式包已发布 0 套。既定的 2026-09-01 公开上线不可达，体验版试点成为该日期的主交付物。当前状态与下一步见 [docs/HANDOFF.md](docs/HANDOFF.md)；开放问题见 [docs/GRILLING.md](docs/GRILLING.md)。

## 许可

内部使用，未经幼儿园许可不得分发。
