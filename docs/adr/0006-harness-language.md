# ADR-0006: Harness language — Node hooks + Python judges

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Engineering lead
- **Module / 模块:** harness

## Context / 背景
The quality harness needs git/editor hooks, a terminology checker, a house-style tool (typewriter), design
& wording judges, and a test gate. Two toolchains are in play: the Mini Program ecosystem is **Node/npm**,
while the reusable `code-reviewer` skill ships **Python** scripts.

> 中文：质量工具链需要钩子、术语校验、文风工具、设计/文案评审与测试闸门。Node 是小程序生态主链，而 `code-reviewer` 技能自带 Python 脚本。

## Decision / 决策
**Mixed:** **Node (ESM)** for hooks, glossary checker, typewriter, the gate runner, and tests (`node --test`);
**Python (stdlib only)** for the design and wording judges. The Node gate (`harness/gate.mjs`) shells out to
the Python judges, so contributors run one command (`npm run gate`). Both languages are dependency-free to
keep setup trivial and CI fast.

> 中文：混合方案——Node(ESM) 负责钩子、术语校验、typewriter、闸门与测试；Python（仅标准库）负责设计与文案评审。Node 闸门调用 Python 评审，贡献者只需 `npm run gate`。两者均零依赖。

## Alternatives considered / 备选方案
1. **All Node** — rejected: would not reuse the `code-reviewer` Python heritage; rewriting judges adds work.
2. **All Python** — rejected: a second runtime separate from the MP/npm toolchain for hooks and tests.

## Consequences / 影响
- **Positive / 正面:** each tool uses its natural runtime; one entry command; no third-party installs.
- **Negative / 负面:** CI needs both Node and Python; the gate degrades gracefully (judges skipped) if Python is absent, with a warning.
- **Compliance / 合规:** none directly; the wording judge enforces the bilingual + glossary contract that compliance copy depends on.
