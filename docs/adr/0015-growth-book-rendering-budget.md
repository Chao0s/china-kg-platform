# ADR-0015: The growth book renders at screen resolution inside a bounded canvas budget

- **Status:** Accepted
- **Date:** 2026-08-19
- **Deciders:** Product owner, engineering lead
- **Module / 模块:** 成长册 (client rendering, both Mini Programs)

## Context / 背景
[F17](../../../hualong-backend/DECISIONS.md) removed every export, download and share path from the
成长册: the book exists only inside the Mini Program, composed and read on a phone. That decision quietly
made rendering an engineering constraint rather than a presentation detail, because the book is now the only
place the artefact ever exists — if it cannot be drawn on the device, it does not exist at all.

Three platform limits bound what can be drawn, and none of them were written down anywhere:

1. **Canvas 2D fails above 4096 px on either axis.** The failure is not a warning; the canvas is blank or the
   draw throws. An A4 page is 210 × 297 mm. At 300 dpi that is 2480 × 3508 px, already past the limit on the
   long edge before any device pixel ratio is applied. On a 3× phone the naive `width × dpr` arithmetic
   overshoots by a factor of two or more.
2. **The main package ceiling is 2 MB**, and the growth-book editor is the largest screen in either client.
   Anything the editor pulls in — a charting library, a layout engine, a font — competes with the whole rest
   of the app for that budget. See [PRD.md](../PRD.md) §12.
3. **The 12 layout packs ship inside the package**, not in the database, so artwork is a package-size line
   item that grows as the designer delivers.

The 五维雷达图 appears both on its own screen and inside the book, which is why
[the radar is drawn directly rather than with a charting library](../PRD.md) §9 — the same renderer has to
serve both surfaces, and §6.6 allows only one composer.

> 中文：F17 取消成长册的全部导出、下载与分享，册子只存在于小程序内，渲染因此从表现细节变成工程约束 ——
> 画不出来就等于不存在。三条平台限制此前无处登记：Canvas 2D 任一轴超过 4096 px 即失败（A4 按 300 dpi 已是
> 2480 × 3508 px，再乘设备像素比必然越界）；主包上限 2 MB，而成长册编辑器是两个客户端里最大的一屏；12 套
> 版式包随包体发布而非入库，是一项会持续增长的体积开销。五维雷达图同时出现在独立页与册子里，故只能有一套
> 绘制代码。

## Decision / 决策
The growth book renders at **screen resolution**, never print resolution, inside four explicit budgets.

1. **Render at the screen, cap the device pixel ratio.** The backing store is
   `min(cssWidth × min(devicePixelRatio, 2), 4096)` on each axis. Capping the ratio at 2 costs nothing a
   guardian can see on a phone-sized page and removes the entire class of blank-canvas failures on 3×
   devices. Print resolution is not a target — F17 removed the only consumer of it.
2. **Reuse a small pool of canvas nodes.** A book of up to 200 pages ([G29](../../../hualong-backend/db/GAPS.md))
   must not mount 200 canvases. Mount the visible page plus one neighbour on each side and redraw on
   navigation. Memory is bounded by the pool size, not by the book length.
3. **Serve every image widget a derivative sized to its own pixel box.** A widget occupying 320 × 240 CSS px
   receives a derivative at that box times the capped ratio, not the stored 2000 px original. The derivative
   size is computed in CI from the layout pack's own geometry, so the sizes cannot drift away from the
   layouts they serve. This is the only rule here that also cuts network cost and COS egress, which
   [DELIVERY.md](../DELIVERY.md) names as the real media cost driver.
4. **No charting or layout library enters the editor's package.** The radar is drawn directly. Any future
   candidate library is measured against the 2 MB main package before it is discussed on features.

> 中文：成长册按**屏幕分辨率**渲染，绝不按印刷分辨率，并遵守四条预算：后备缓冲取
> `min(cssWidth × min(devicePixelRatio, 2), 4096)`；复用少量画布节点（可见页 + 左右各一页），不为 200 页
> 各挂一个；每个图片组件下发按其自身像素框裁切的派生图，尺寸由 CI 从版式包几何算出；编辑器不引入任何图表
> 或排版库。

## Alternatives considered / 备选方案
- **Render at print resolution and keep an export path.** Rejected: F17 already removed export, so this pays
  the full memory and bandwidth cost of print output for an artefact nobody can take away. It also breaches
  the 4096 px limit on the long edge of an A4 page before any scaling.
- **Server-side rendering of pages to images.** Rejected: it reintroduces a server-held rendering of a child's
  book — a second copy of minors' data outside the access rules — and the instance uplink is 5 Mbps
  ([ADR-0014](0014-cloud-vendor-tencent.md)). It also breaks §6.6's single-composer rule.
- **Skyline as the render engine for the book only.** Not available as scoped: the render engine is an
  app-wide setting, not a per-page one. Any move to Skyline is an app-wide decision and belongs in
  [ADR-0007](0007-render-engine-and-animation.md), not here.
- **One canvas per page, mounted eagerly.** Rejected: 200 canvases exhaust memory long before page 200, and
  the failure mode is the app being killed rather than a visible error.

## Consequences / 影响
- The book is legible on a phone and cannot be printed at quality. That is a deliberate consequence of F17,
  restated here so nobody rediscovers it during layout review.
- The CI step that derives per-widget image sizes is new work and a new dependency of the layout packs: a
  pack that changes geometry changes the derivative sizes, so the two must be released together.
- Page navigation redraws rather than reveals. Redraw cost, not mount cost, becomes the thing to profile.
- A 3× device shows the same pixels as a 2× device. This is invisible at phone size and is the price of never
  hitting the 4096 px wall.
- The layout packs remain a package-size line item. This ADR bounds runtime memory, not bundle size; the
  latter is tracked in [DELIVERY.md](../DELIVERY.md).

> 中文：册子在手机上清晰可读，但不具备可打印品质 —— 这是 F17 的既定后果，在此重申以免版式评审时重新发现。
> CI 派生尺寸是新增工作，也是版式包的新依赖：几何一改，派生尺寸随之改，两者必须同批发布。翻页从「挂载」
> 变为「重绘」，需要观测的是重绘成本。3 倍屏与 2 倍屏呈现相同像素，这是永不触及 4096 px 上限的代价。

## Follow-ups / 后续
- Add the derivative-size CI step when the first real layout pack lands (0 of 12 released as of 2026-08-19).
- Record the measured main-package size of the editor screen once it exists, against the 2 MB ceiling.
- If Skyline is ever proposed, amend [ADR-0007](0007-render-engine-and-animation.md) app-wide rather than
  scoping it to the book.
