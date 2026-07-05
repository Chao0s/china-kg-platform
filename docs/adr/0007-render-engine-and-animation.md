# ADR-0007: Render engine (Skyline/WebView) and animation strategy

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Product owner, engineering lead
- **Module / 模块:** client (Mini Program), design system

## Context / 背景
A Mini Program is not browser HTML/JS: it renders WXML/WXSS in a separate render thread and runs JS in a
logic thread with **no DOM, no `window`, no `document`**. Web DOM animation libraries (GSAP, Framer Motion,
anime.js) therefore cannot run in the Mini Program — for native, uni-app, and Taro alike. We also must choose
a render engine (the classic WebView vs the modern Skyline).

> 中文：小程序并非浏览器 HTML/JS——逻辑层无 DOM/window/document，渲染层用 WXML/WXSS。GSAP、Framer Motion 等基于 DOM 的动画库无法在小程序中运行（原生、uni-app、Taro 皆然）。同时需选择渲染引擎（WebView 与 Skyline）。

## Decision / 决策
- **Render engine:** WebView is the default for compatibility; opt into **Skyline + worklet** on specific screens that need smooth gesture or complex animation.
- **Animation strategy:** tasteful and minimal for v1 — **WXSS transitions/keyframes**, the **`this.animate`** keyframe API, and **Skyline worklet** (`wx.worklet` / `applyAnimatedStyle`) where needed; the **五维雷达图** uses ec-canvas / ECharts. No Lottie in v1.
- **Web DOM animation libraries are restricted to the PC web admin** (real browser), never the Mini Program.

> 中文：渲染引擎默认 WebView，按需在特定页面启用 Skyline + worklet；动画策略 v1 求精简——WXSS、`this.animate`、必要时 Skyline worklet；五维雷达图用 ec-canvas/ECharts；v1 不引入 Lottie。基于 DOM 的动画库仅限 PC后台（网页端）使用。

## Alternatives considered / 备选方案
1. **Skyline-first everywhere** — best animation/perf, but min base-library version + not all components supported; needs a compatibility check. Reserved for opt-in.
2. **WebView only** — maximum compatibility but weaker animation ceiling.
3. **Use a web animation library** — impossible in the Mini Program runtime (no DOM).

## Consequences / 影响
- **Positive / 正面:** broad device compatibility now, a smooth path (Skyline worklet) when needed, no wasted effort chasing incompatible libraries.
- **Negative / 负面:** designers/devs must use Mini-Program-native motion, not web habits; mixed engines need testing on both paths.
- **Compliance / 合规:** none directly.
