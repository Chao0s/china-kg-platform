# Tests / 测试

Automated test suite for the 化龙镇中心幼儿园电子资源平台 (Hualong Kindergarten
Electronic Resource Platform). The suite runs on the **Node built-in test runner**
(`node --test`), has **zero dependencies**, and is **Windows-safe** (Node >= 18).
The Python judges (design / wording) are exercised too, but skip cleanly if no
Python interpreter is on `PATH`.

## How to run

```bash
npm test                 # → node --test tests/   (the master-gate command)
node --test tests/       # same thing, run directly
node harness/gate.mjs    # full commit gate; runs the tests as one of its checks
node harness/code-review.mjs            # reusable static code review (see below)
node harness/code-review.mjs --json     # machine-readable findings
```

> **Why `tests/index.mjs` + `tests/package.json` exist.** On Node >= 23 a bare
> directory positional to `--test` is *import-resolved* rather than scanned
> (`ERR_UNSUPPORTED_DIR_IMPORT`). The commit gate calls `node --test tests/`
> verbatim, so `tests/package.json` (`"main": "index.mjs"`) makes the directory
> resolve to `tests/index.mjs`, which imports every test module. On older Node the
> `*.test.mjs` files are still discovered by directory scan. Do not delete these
> two files — they are what keeps `node --test tests/` green on modern Node.

## Layout

```
tests/
  index.mjs                      # aggregator entry (imports every test module)
  package.json                   # main: index.mjs (directory-import shim)
  .gitignore                     # ignores .tmp/
  fixtures/                      # tiny committed inputs for the harness/judges
  unit/
    harness.test.mjs             # glossary-check + typewriter CLIs (black-box)
    judges.test.mjs              # design_judge.py + wording_judge.py (skips w/o python)
    glossary-data.test.mjs       # docs/glossary.json integrity
  e2e/
    chrome-devtools.spec.md      # browser smoke-test runbook (manual / agent)
    docs-site.e2e.mjs            # CI static proxy for the docs-site e2e (no browser)
```

## What each test guards (test → project guarantee)

| Test file | Guards |
| --------- | ------ |
| `unit/harness.test.mjs` | The **terminology gate** and **house-style gate** actually fire. Confirms `glossary-check` passes clean prose, flags a forbidden variant (`家园共育`) as a P1, and does **not** false-positive on canonical terms that contain a forbidden substring (`党建管理` / `待办事项` / `订阅消息`) — i.e. the canonical-masking logic holds. Confirms `typewriter lint` flags half-width CJK punctuation (P2) and that `--fix` makes a re-lint clean, passes clean prose, and `new adr "X"` scaffolds the bilingual `ADR-NNNN: X` shape. |
| `unit/judges.test.mjs` | The two Python judges run and emit the documented JSON schema (`judge/overall/band/dimensions/findings/pass`, `overall ∈ [0,10]`). Their `--self-test` assertions pass. Skips gracefully if no `python`/`python3`/`py` is found. |
| `unit/glossary-data.test.mjs` | `docs/glossary.json` integrity — the single source of truth both `glossary-check.mjs` and `wording_judge.py` read. Catches data bugs that silently corrupt every terminology check: invalid JSON, missing `id/zh/en/category`, duplicate ids or `zh` values, a term listing its **own** canonical `zh` as a forbidden variant, and a `variants_forbidden` entry that is itself **another** term's canonical name. |
| `e2e/docs-site.e2e.mjs` | A browserless proxy for the docs-site smoke test: `docs/index.html` has `<html lang>`, a non-empty `<title>`, a `<meta name="viewport">`, references the project name, all **render-critical** local assets (CSS/JS/images/fonts/JSON) exist on disk, and every in-page `#anchor` resolves to a real `id`. Skips if `docs/index.html` does not exist yet. Links to not-yet-authored sibling Markdown docs are reported as a non-fatal warning (a missing prose doc is a content gap, not a render failure) — every nav link is hard-verified in the browser runbook below. |

## Fixtures

Kept deliberately tiny; each one isolates exactly one behaviour.

| Fixture | Used for |
| ------- | -------- |
| `clean.md` | glossary-check clean pass (only canonical terms). |
| `glossary-bad.md` | contains the forbidden variant `家园共育` → P1. |
| `glossary-canonical-mask.md` | canonical terms whose substrings are forbidden variants → must stay clean. |
| `typewriter-bad.md` | half-width CJK punctuation → P2, used for the `--fix` round-trip. |
| `typewriter-clean.md` | full-width punctuation, no heading skips → clean. |
| `sample.html` | small design fixture for `design_judge.py --json`. |
| `wording-sample.md` | small bilingual fixture for `wording_judge.py --json`. |

Tests that mutate a fixture (the `--fix` round-trip) copy it into `tests/.tmp/`
first and clean up afterwards. `tests/.tmp/` is git-ignored (`tests/.gitignore`).

## Browser e2e runbook (chrome-devtools-mcp)

`e2e/chrome-devtools.spec.md` is a precise, reusable runbook for smoke-testing the
GitHub Pages docs site **and** the future uni-app / Taro H5 build with the
`chrome-devtools-mcp` tools available to Claude Code agents
(`new_page → navigate_page → take_snapshot → take_screenshot →
list_console_messages → per-link navigation → lighthouse_audit →
performance_start_trace/stop_trace → close_page`). PASS criteria: **no console
errors**, **all nav links resolve**, **Lighthouse a11y ≥ 90**, **reasonable LCP**,
and **CJK renders** (no tofu boxes) at desktop and mobile widths. Run it every
release; the CI-runnable subset is `e2e/docs-site.e2e.mjs`.

## Reusable code-review check (`harness/code-review.mjs`)

A lightweight, dependency-free static reviewer wired for the **future** app source,
inspired by the `code-reviewer` skill. Run it **per change before commit**.

- **No-op today:** with no `src/` | `miniprogram/` | `app/` directory it prints
  `no application source yet — code review skipped (pass)` and exits 0.
- **Active once code lands:** scans `*.js/*.ts/*.wxs/*.vue/*.wxml` and emits
  P0–P3 findings; exits **1** on any **P0/P1**, else 0. `--json` for machine output.

What it enforces:

| Severity | Check |
| -------- | ----- |
| P0 | `eval(` usage; hardcoded secret literals (`AppSecret` / `api[_-]?key` / `access_token` = "…"). |
| P1 | hardcoded `http://` URLs (WeChat requires **https://**); **a user-content write path (db `add`/`insert`/`create`, `uploadFile`) in a file that never references `msgSecCheck` / `mediaCheckAsync`** — the project-critical content-moderation (内容安全) reminder mandated by the WeChat platform. |
| P2 | `console.log/.debug/.info` left in source; `TODO`/`FIXME`/`HACK`/`XXX` without an issue ref; loose equality (`==` / `!=`). |

Wire it into the pre-commit hook alongside `harness/gate.mjs` once the app source
directory exists.

## Deeper PR analysis — the `code-reviewer` skill

For heavier, language-aware review beyond this static check, use the
`code-reviewer` skill at
`C:\Users\Herman\.claude\skills\code-reviewer` (TypeScript / JavaScript / Python /
Swift / Kotlin / Go). It ships Python scripts:

- `scripts/code_quality_checker.py` — automated quality / best-practice analysis.
- `scripts/pr_analyzer.py` — pull-request-level analysis.
- `scripts/review_report_generator.py` — formatted review report generation.

`harness/code-review.mjs` is the always-on, zero-dependency gate; the skill is the
on-demand, in-depth reviewer for a PR.
