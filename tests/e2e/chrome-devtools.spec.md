# E2E Smoke Runbook — chrome-devtools-mcp

A precise, **reusable** browser smoke test for (a) the GitHub Pages docs site
(`docs/index.html`) and (b) the **future** uni-app / Taro H5 build. It is driven
by the `chrome-devtools-mcp` tools available to Claude Code agents
(`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`). A human can replay every
step manually in Chrome DevTools; an agent can replay it verbatim. Run it **every
release** (and on every PR that touches `docs/` or the H5 build).

The lightweight, browserless companion to this runbook is
`tests/e2e/docs-site.e2e.mjs`, which runs in CI (`node --test tests/`) and catches
the cheap regressions (missing `lang`/`title`/`viewport`, broken local refs,
dangling anchors). Run the static proxy first; run this browser runbook before a
release or when the static proxy is insufficient (real rendering, console, perf,
a11y).

---

## 0. Targets

| Target | URL (local preview) | URL (published) |
| ------ | ------------------- | --------------- |
| Docs site | `http://localhost:8080/index.html` (serve `docs/`) | `https://<org>.github.io/<repo>/` |
| H5 build (future) | `http://localhost:5173/` (uni-app/Taro `dev:h5`) | per deployment |

Serve the docs locally with any static server from the repo root, e.g.
`npx http-server docs -p 8080` or `python -m http.server 8080 -d docs`.

| Knowledge-graph dashboard | `http://127.0.0.1:5173/?token=<TOKEN>` (from `npm run graph`) | n/a (local viewer) |

---

## 0b. Knowledge-graph dashboard (REQUIRED after `/understand-anything:understand`)

The dashboard is external plugin code served by Vite; it fails to render if the selected
plugin's `@understand-anything/core` package is not built (Vite then throws
`Failed to resolve import "@understand-anything/core/schema"`). Booting the server is NOT
proof — always verify it actually RENDERS.

1. **Automated guard first (deterministic, no browser):** `node --test tests/e2e/dashboard-smoke.mjs`.
   It selects the same plugin the launcher uses (latest, built) and asserts every core import
   resolves to a built file. The launcher (`npm run graph`) runs the same check and refuses to
   start a broken dashboard.
2. **Browser smoke:** start `npm run graph`, copy the printed `Dashboard URL: …?token=…`.
   - `new_page(url)` with the FULL tokenized URL.
   - `list_console_messages(types:["error","warn"])` → PASS if the only error is a favicon 404;
     FAIL on any `Failed to resolve import`, module 500, or React error.
   - `take_snapshot` → PASS if it shows the project heading (e.g. "china-kg-platform"), the layer
     count and layer nodes, and the Project Tour steps; FAIL if a Vite error overlay is present.
3. Stop the server (Ctrl+C, or kill the listener on the port).

---

## 1. Tool sequence (exact)

Run these in order. Each bullet names the MCP tool and the assertion it feeds.

1. **`new_page`** — open a fresh page/tab. Record the page id.
2. **`navigate_page`** `{ url: <target> }` — load the target URL. Wait for load.
3. **`take_snapshot`** — capture the accessibility/DOM snapshot. Use it to:
   - enumerate nav links (`<a href>`) and interactive controls;
   - confirm the project name renders (化龙 / Hualong / 电子资源平台).
4. **`take_screenshot`** — capture a full-page screenshot. Eyeball that **CJK text
   renders** (no tofu `□□□` boxes), layout is not collapsed, and nothing overflows.
5. **`list_console_messages`** — read the console. **Zero `error`-level messages.**
   `warning`/`info`/`debug` are allowed but should be reviewed.
6. For **each** nav/internal link found in step 3: **`navigate_page`** to its
   resolved URL (or **`click`** the element), then **`list_console_messages`** again
   and **`take_snapshot`** to confirm the destination loaded (HTTP-ok, has a title,
   no console errors). Every nav link must resolve — no 404, no blank page.
7. **`lighthouse_audit`** `{ categories: ["accessibility", "performance", "best-practices"] }`
   — capture the category scores.
8. **`performance_start_trace`** → reload the page → **`performance_stop_trace`**
   (or read LCP from the Lighthouse performance result) — capture **LCP**.
9. **`close_page`** — clean up the page/tab.

For the **H5 build**, additionally run step 4 at mobile emulation
(`resize_page`/`emulate` to ~390×844, DPR 3) to confirm the mobile layout, tap
targets, and CJK rendering on a phone-sized viewport.

---

## 2. PASS criteria

A release passes the smoke test only if **all** hold:

- [ ] **No console errors.** `list_console_messages` reports zero `error`-level
      entries on the landing page and on every visited nav destination.
- [ ] **All nav links resolve.** Every internal `<a href>` discovered in the
      snapshot navigates to a real page (title present, no 404, no console error).
- [ ] **Lighthouse accessibility ≥ 90.**
- [ ] **Lighthouse best-practices ≥ 90** (no mixed content; HTTPS where published).
- [ ] **LCP reasonable** — ≤ 2.5 s on the local preview (and on a fast connection
      for the published site). Investigate anything > 4 s.
- [ ] **CJK renders correctly** — Chinese text in the screenshot shows real glyphs,
      not tofu boxes; no obvious font-fallback breakage. Verify at desktop and
      (for H5) mobile widths.
- [ ] **Responsive** — page has a working `<meta name="viewport">` and does not
      overflow horizontally at 390 px width.

Record the Lighthouse scores and LCP in the release notes so trends are visible
release-over-release.

---

## 3. Failure triage

| Symptom | Likely cause | First check |
| ------- | ------------ | ----------- |
| Console error | broken script/asset path, CSP, mixed content | `list_network_requests` for 4xx/5xx; the failing request |
| Nav link 404 | renamed/missing file | re-run `tests/e2e/docs-site.e2e.mjs` (local-ref check) |
| a11y < 90 | missing alt text, low contrast, no landmarks | Lighthouse a11y audit details |
| High LCP | large hero image, render-blocking CSS/JS | `performance_analyze_insight` on the LCP insight |
| Tofu CJK | missing web font / no system CJK fallback | screenshot + computed `font-family` |

---

## 4. Reuse notes

- This runbook is **target-agnostic**: point step 2 at the docs URL today and at
  the H5 dev/preview URL once the app build lands. The tool sequence and PASS
  criteria do not change.
- Keep it idempotent: always `new_page` at the start and `close_page` at the end so
  repeated runs do not accumulate tabs.
- Treat the PASS checklist as the release gate's manual section; the automated
  section is `node --test tests/` (which includes `docs-site.e2e.mjs`).
