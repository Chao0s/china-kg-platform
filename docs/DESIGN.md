# Design System: 化龙镇中心幼儿园电子资源平台 / Hualong Kindergarten Electronic Resource Platform

> **状态 / Status:** 结构骨架 · STRUCTURE SCAFFOLD — fill in from the existing design.
>
> This file follows the `design-md` skill's output structure (Visual Theme & Atmosphere → Color Palette &
> Roles → Typography → Component Stylings → Layout). Every value below is a **placeholder `<…>`**. Replace
> placeholders with values **extracted from the existing design**. Keep the house rule: write **descriptive,
> natural language** and put the **exact token in parentheses** — e.g. "Gently curved corners (`radius: 16px`)",
> "Warm Apricot (`#E8924A`)". Do not leave a hex code without a descriptive name, or a descriptive name
> without its value.
>
> 本文件遵循 `design-md` 技能的输出结构，所有取值均为占位符 `<…>`，请从既有设计中提取后填入；坚持“自然语言描述 + 括号内精确取值”的写法。
>
> When filled, this file becomes the **single source of truth** for the design judge
> (`harness/judges/design_judge.py`) and for prompting any UI generation. The provisional palette currently
> used by `docs/index.html` is a placeholder and should be reconciled to the values you enter here.

---

## 0. Design Tokens (machine-facing) / 设计令牌

> Fill this table first; the rest of the document describes these tokens in words. Keep names stable —
> components and the judge reference them.

| Token | Value `<fill>` | Role / 用途 |
|---|---|---|
| `--color-primary` | `<#______>` | <primary actions / brand / 主操作、品牌> |
| `--color-secondary` | `<#______>` | <links, calm accents / 链接、次要强调> |
| `--color-accent` | `<#______>` | <sparing highlights / 少量点缀> |
| `--color-ink` | `<#______>` | <primary text / 正文文字> |
| `--color-muted` | `<#______>` | <secondary text / 次要文字> |
| `--color-surface` | `<#______>` | <page background / 页面底色> |
| `--color-card` | `<#______>` | <card background / 卡片底色> |
| `--color-line` | `<#______>` | <hairline borders / 分隔线> |
| `--color-success` / `--color-warning` / `--color-danger` | `<#__>` / `<#__>` / `<#__>` | <semantic states / 语义状态> |
| `--font-display` | `<family>` | <headings (Latin) / 标题> |
| `--font-zh` | `<family>` | <Chinese UI / 中文界面> |
| `--font-body` | `<stack>` | <body text / 正文> |
| `--space-1 … --space-8` | `<8/16/24/32/48/64…>` | <8pt spacing scale / 8 点间距栅格> |
| `--radius-card` / `--radius-button` / `--radius-input` | `<16px>` / `<999px>` / `<12px>` | <corner geometry / 圆角> |
| `--shadow-soft` | `<0 2px 8px …>` | <elevation / 阴影层级> |

---

## 1. Visual Theme & Atmosphere / 视觉主题与气质

> Describe the mood, density, and aesthetic philosophy in evocative adjectives. This anchors the design
> judge's "Philosophy Alignment" dimension.

- **Atmosphere / 气质:** `<e.g. warm, friendly, trustworthy, calm, clean — a kindergarten parents trust; NOT garish rainbow>`
- **Density / 密度:** `<airy / balanced / dense>` — `<why, for which audience (parents on phones, teachers, admins)>`
- **Design philosophy / 设计哲学:** `<one or two sentences naming the guiding principle>`

## 2. Color Palette & Roles / 色彩与角色

> For each color: Descriptive Name + (`#hex`) + functional role. Keep the system to **≤ 4 core colors +
> neutrals** (Craft dimension). Note dark-mode handling if any.

- **`<Descriptive Name>` (`<#______>`)** — `<role>`.
- … (repeat per color)
- **Contrast / 对比度:** confirm WCAG AA — normal text ≥ 4.5:1, large text ≥ 3:1. `<note any pairings to avoid>`

## 3. Typography Rules / 字体规则

> Headings vs body, weights, and — critically for this product — **Chinese-text rules**.

- **Display / 标题字体:** `<family + weights>` — `<character/voice>`. (Avoid Inter/Roboto/Arial as the display face.)
- **Chinese / 中文字体:** `<family>` (e.g. Noto Sans SC / 思源黑体) — `<weights>`.
- **Body / 正文:** `<stack>`, size `<≥16px>`, **CJK line-height `<≥1.7>`** (the judge flags < 1.6).
- **Hierarchy / 层级:** headline:body ratio `<≥2.5×>`; tiers — H1 `<px>`, H2 `<px>`, H3 `<px>`, body `<px>`, caption `<px>`.
- **Line length / 行宽:** `<40–70 漢字 per line>`; punctuation: full-width 中文标点（，。！？：；）。

## 4. Component Stylings / 组件样式

> Shape, color assignment, and behaviour per component. Add Mini-Program-specific components as needed.

- **Buttons / 按钮:** `<shape (pill?), fill/outline, primary vs secondary color, pressed/disabled states, min hit target ≥44×44>`.
- **Cards / Containers / 卡片:** `<corner radius, background, shadow depth, padding on the 8pt scale>`.
- **Inputs / Forms / 表单:** `<stroke style, background, focus ring, error state>`.
- **Navigation / 导航:** `<tab bar (parent vs teacher vs admin), top nav, back behaviour>`.
- **Lists & feeds / 列表与信息流:** `<resource cards, case cards, notice rows, garden-moment cards>`.
- **Media / 媒体:** `<image grid, video player, file/attachment chips, upload progress>`.
- **Data viz / 数据可视化:** `<five-dimension radar chart (五维雷达图) colors, axis, labels — ec-canvas/ECharts theme>`.
- **Status & badges / 状态与徽标:** `<draft / pending audit / approved / rejected — color + label>`.
- **Empty / loading / error states / 空态·加载·错误:** `<illustration policy (no AI-slop SVG people), copy tone>`.

## 5. Layout Principles / 布局原则

> Whitespace strategy, margins, grid, and responsive behaviour. Mobile-first (WeChat) + a wider PC backend.

- **Grid / 栅格:** `<columns, gutters, safe areas; rpx usage for Mini Program>`.
- **Spacing / 间距:** 8pt scale only (`<8/16/24/32/48/64>`); whitespace target `<40–60%>`.
- **Responsive / 响应式:** `<Mini Program phone widths; H5/PC backend breakpoints if uni-app/Taro reuse>`.
- **Density per role / 分端密度:** parent client `<airy, few choices>`; teacher/admin `<denser, task-oriented>`.

## 6. Motion & Interaction / 动效与交互 (optional)

- **Transitions / 转场:** `<page push/pop, sheet, fade — durations, easing>`.
- **Feedback / 反馈:** `<tap feedback, toast, loading skeletons>`.
- **Reduce-motion / 减弱动效:** `<honor system setting>`.

## 7. Accessibility & Inclusivity / 无障碍与包容性

- Touch targets ≥ 44×44; contrast AA; legible CJK sizes for older guardians; clear focus order;
  meaningful alt text; never convey state by color alone. `<fill specifics from the existing design>`

---

### Fill checklist / 填写清单
- [ ] Section 0 token table complete (every `<…>` replaced)
- [ ] Each color has Name + hex + role; palette ≤ 4 core + neutrals
- [ ] Display face is distinctive (not Inter/Roboto/Arial); CJK line-height ≥ 1.7
- [ ] All spacing on the 8pt scale
- [ ] `docs/index.html` provisional palette reconciled to Section 0
- [ ] `npm run judge:design` passes after filling
