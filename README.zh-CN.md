# 化龙镇中心幼儿园电子资源平台

> 一款面向公办幼儿园的微信小程序 + PC 后台。**本仓库是规格、设计系统、术语契约与质量工具链**，是约束后续应用代码的基座。
>
> English version: [README.md](README.md)。

## 这是什么

平台为幼儿园提供一个可信赖、移动优先的统一入口，覆盖资源、案例、教研培训、党建管理、综合协调与家园社共育；内置审核流程、结构化幼儿评价（五维雷达图）与可导出的成长册。平台服务三种应用内角色——管理端、教师端、家长端——并配有 PC 后台。家长端刻意只展示家园社共育相关内容。

完整规格见 **[docs/PRD.zh-CN.md](docs/PRD.zh-CN.md)**（简体中文）/ **[docs/PRD.md](docs/PRD.md)**（English）。

## 为什么先做“规格 + 工具链”仓库

技术栈选错或漏掉合规要求，回退代价高昂；缺少契约时，AI 协作也容易跑偏。因此在写任何功能代码之前，本仓库先固化需求、设计系统、术语，以及一道自动化闸门，让后续每一次改动都保持一致与合规。参见 [docs/adr/0001-repository-as-spec-and-harness-foundation.md](docs/adr/0001-repository-as-spec-and-harness-foundation.md)。

## 仓库内容

| 路径 | 说明 |
|---|---|
| [docs/PRD.zh-CN.md](docs/PRD.zh-CN.md) · [docs/PRD.md](docs/PRD.md) | 产品需求文档（双语） |
| [docs/DESIGN.md](docs/DESIGN.md) | 设计系统骨架（从既有设计填入） |
| [docs/glossary.json](docs/glossary.json) · [CONTEXT.md](CONTEXT.md) | 规范双语术语（机器 + 人读） |
| [docs/GRILLING.md](docs/GRILLING.md) | 计划盘问与待向园方确认的开放问题 |
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

草稿 v0.1。客户端框架与后端**尚为建议、未最终拍板**——见 [ADR-0003](docs/adr/0003-client-framework.md) 与 [ADR-0004](docs/adr/0004-backend-cloudbase-vs-alibaba.md)。待向园方确认的开放问题见 [docs/GRILLING.md](docs/GRILLING.md)。

## 许可

内部使用，未经幼儿园许可不得分发。
