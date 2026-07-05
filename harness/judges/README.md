# Harness Judges

Two deterministic, standard-library-only Python 3 judges used by the Node commit
gate. Each scores an input file or directory on five 0-10 dimensions, prints a
scored report (or JSON), and returns an exit code the gate can branch on.

- `design_judge.py` — design-quality judge (adapts the huashu-design 5-dimension
  critique rubric into deterministic heuristics over HTML / WXSS / CSS / Markdown).
- `wording_judge.py` — documentation copy-quality + bilingual (EN / 简体中文)
  consistency judge over Markdown docs.

Both are pure standard library (no `pip install`), run on Windows (paths via
`os.path` / `pathlib`, files always read as UTF-8), and are **deterministic** —
no randomness, no network, no clock.

---

## CLI contract (identical for both)

```
python harness/judges/design_judge.py  <path> [--json] [--threshold N] [--strict] [--self-test]
python harness/judges/wording_judge.py <path> [--json] [--threshold N] [--strict] [--self-test] [--glossary PATH]
```

| Flag           | Meaning |
| -------------- | ------- |
| `<path>`       | A file **or** directory. Directories recurse over relevant files (design: `*.html *.htm *.wxss *.css *.md`; wording: `*.md *.markdown`). |
| _(default)_    | Print a human-readable scored report to stdout. |
| `--json`       | Emit a single JSON object to stdout instead of the report. |
| `--threshold N`| Overall pass threshold (default `6.0`). |
| `--strict`     | Also fail on any **P1** finding. |
| `--self-test`  | Run inline assertions on synthetic strings, print `OK`, exit 0 (or exit 2 on failure). Ignores `<path>`. |
| `--glossary P` | _(wording only)_ Override the glossary path. |

**Pass rule:** `pass = overall >= threshold AND no P0 findings` (and, with
`--strict`, no P1 findings either).

**Exit codes:** `0` pass · `1` fail · `2` usage / IO error (missing path, no
`<path>` given, IO failure, or a failed `--self-test`).

### JSON shape

```json
{
  "judge": "design",
  "overall": 5.66,
  "band": "needs-improvement",
  "dimensions": [{"name": "...", "score": 6.5, "rationale": "..."}],
  "findings": [
    {"severity": "P1", "title": "...", "file": "bad.css", "line": 1, "fix": "..."}
  ],
  "pass": false
}
```

`judge` is `"design"` or `"wording"`. Findings are sorted by severity
(P0 → P3), then file, then line — deterministic ordering for stable diffs.

### Human report shape

```
=== Design Judge ===  file/dir: <path>
Overall: X.X/10  [BAND]
Dimensions:
  - <name>: X/10 — <rationale>
Findings (N):
  [P1] <title> (file:line)
       fix: <concrete fix>
Result: PASS|FAIL (threshold N, strict=on/off)
```

### Quality bands

`8-10` excellent · `6-7.9` good · `4-5.9` needs-improvement · `<4` inadequate.
Overall = arithmetic mean of the five dimension scores.

### Finding severities

`P0` = ⚠️ Critical · `P1` = ⚡ Important · `P2`/`P3` = 💡 Polish.

---

## `design_judge.py`

Five dimensions (each 0-10, overall = mean). Each failed heuristic lowers the
relevant dimension and emits a finding with a concrete fix. When a file type
cannot be assessed for a dimension, that dimension is given a neutral `7` with a
"not assessable" note.

1. **Philosophy Alignment** — design declares/uses a coherent system. Flags
   absence of design tokens / CSS custom properties (`--x:`), and tokens declared
   but never referenced via `var()`.
2. **Visual Hierarchy** — headline:body type-size ratio should be `>= 2.5x`;
   wants 3-4 distinct type tiers. Flags weak contrast, too few / too many tiers.
   Falls back to `<h1>..<h6>` depth for HTML without explicit sizes.
3. **Craft Quality** — 8pt spacing adherence (flags arbitrary px like `13` / `27`
   that are not multiples of 4/8); palette size `<= ~4` primaries (flags > 8
   distinct hex colors); `<= 2` font families. Also absorbs CJK rule penalties.
4. **Functionality** — interactive touch targets `>= 44x44` (flags smaller
   width/height near button/link/nav/tab/icon context); CTA presence in HTML
   (`<button>` / `<a>`); body font-size sanity.
5. **Originality (anti-AI-slop)** — downranks on: purple→pink→blue full-screen
   gradients, emoji-as-icon decoration (🚀 ⚡ ✨ 🎯 …), generic Inter / Roboto /
   Arial / Helvetica used as a **display** face, rounded-card + left-border-accent
   template, and bento-grid overuse.

**Chinese-text rules** (checked in CSS / WXSS, fold into Craft & Functionality):
- CJK `line-height >= 1.7` (flags `< 1.6`) → P1.
- body `font-size >= 14px` (mobile / WXSS / rpx ≥ 16px to avoid iOS zoom) → P1.
- section titles `>= 24px` on large screens → P3.

`rpx` is normalized as `~0.5px` (750-width design canvas); `rem`/`em` as `*16px`;
`pt` as `*96/72`.

---

## `wording_judge.py`

Five dimensions (each 0-10, overall = mean). Code fences and inline code are
stripped before linting so code samples are not penalized.

1. **Clarity** — flags overly long sentences (EN `> 40` words; 中文 `> 80` 字
   per sentence), passive-voice-heavy prose, and hedging / filler words
   (`just` / `really` / `basically` / `simply` / `very` …).
2. **Bilingual parallelism** — a doc is treated as bilingual when its filename
   contains `.zh-CN` (also `zh-cn` / `zh_cn`) **or** it mixes EN + 中文. For such
   docs it checks that both an English and a 简体中文 side exist, and that their
   heading counts are comparable. Flags a missing translation (P1) or an
   unbalanced structure (P2). Monolingual docs get a neutral `7` + note.
3. **Terminology consistency** — loads the glossary from
   `docs/glossary.json` (schema
   `{"terms":[{"id","zh","en","variants_forbidden":[...]}]}`); flags any use of a
   forbidden variant (P1) and English text that uses a term's wrong casing (P2).
   **If the glossary is missing or invalid, this dimension is skipped with a
   neutral `7` + note.** Override the path with `--glossary`.
4. **Punctuation / format** — in 中文 text, flags half-width `, . ! ? ( ) : ;`
   where full-width `， 。 ！ ？ （ ） ： ；` are expected (P2); flags trailing
   whitespace (P3) and tab characters (P2). Numeric `.` (e.g. `1.5`) is exempt.
5. **Tone / house-style** — flags marketing fluff / AI-slop
   (`revolutionary`, `seamless`, `cutting-edge`, `game-changing`, …;
   `赋能` overuse, `颠覆`, `无缝`, `在当今…时代`, …) and emoji in body prose.

> The glossary is **not** committed by default. Create `docs/glossary.json` to
> activate dimension 3; until then the judge reports it as "not assessable".

---

## `structure_judge.py`

A **structural-conformance** judge (not a scored 0-10 judge). It checks that the
future application codebase strictly follows the agreed app structure derived
from the source Mermaid flowcharts. The contract is
`harness/structure/app-structure.json` (human mirror: `docs/APP-STRUCTURE.md`);
screen ids mirror the Mermaid node ids 1:1 so every finding is traceable to the
source flows. It blocks on drift and reminds on gaps.

```
python harness/judges/structure_judge.py [path] [--json] [--strict] [--self-test]
```

| Flag          | Meaning |
| ------------- | ------- |
| `[path]`      | Repo root to check. **Optional** — defaults to the repo root resolved from the script location (`harness/judges/` → two parents up), not `cwd`. |
| _(default)_   | Print a human-readable structural report to stdout. |
| `--json`      | Emit a single JSON object (shape below). |
| `--strict`    | Also fail on any **P2** finding. |
| `--self-test` | Build a synthetic contract + manifest + route-map in a temp dir, assert behavior, print `OK`, exit 0 (exit 1 on assertion failure). |

**Pass rule:** `pass = no P0 and no P1` (and, with `--strict`, no P2 either).
**Exit codes:** `0` pass · `1` fail · `2` usage / IO error (missing or unparseable
contract, missing path).

### JSON shape

```json
{
  "judge": "structure",
  "pass": true,
  "findings": [
    {"severity": "P1", "title": "...", "file": "...", "fix": "..."}
  ],
  "summary": {
    "skipped": false, "manifest": "src/pages.json", "manifestPages": 12,
    "screens": 60, "counts": {"P0": 0, "P1": 0, "P2": 60, "P3": 0},
    "strict": false, "notes": ["..."], "reminders": ["..."], "invariants": ["..."]
  }
}
```

Findings are sorted by severity (P0 → P3), then file, then title.

### Behavior

1. Loads `harness/structure/app-structure.json`. Missing / unparseable → exit 2.
2. Locates a page manifest among `conformance.manifestCandidates`. Supports
   uni-app `pages.json` and native `app.json` (top-level `pages` plus
   `subPackages` / `subpackages`); tolerates `//` and `/* */` comments.
   - **No manifest** → current state (no app code yet): **PASS** with a skip note
     (`no application source/page manifest yet — structural conformance skipped`)
     and the `/understand-anything:understand` reminder. Mirrors the no-op-pass
     pattern of `harness/code-review.mjs`.
3. Cross-checks `harness/structure/route-map.json` (screenId → page path):
   mapped-but-missing page → **P1**; unmapped screen → **P2**.
4. **UGC moderation invariant** — a `ugcWrite` screen mapped to an existing page
   file that references neither `msgSecCheck` nor `mediaCheckAsync` → **P1**
   (ADR-0005). If the file cannot be located, it is skipped silently
   (`code-review.mjs` covers the general case).
5. **Role-access invariant** (best-effort, never throws) — a parent-looking route
   mapped to a parent-forbidden module → **P1**.
6. Always prints the contract `invariants` as reminders, plus a knowledge-graph
   note (node count if `.understand-anything/knowledge-graph.json` exists, else
   the `/understand-anything:understand` reminder).

The route-map (`harness/structure/route-map.json`) is the bridge between contract
screen ids and real page routes. It ships empty (only `_comment` / `_example`), so
today the judge reports every screen as "not yet mapped" (P2, non-blocking).

---

## Self-test

Each script ships inline assertions on synthetic strings, runnable without any
repo files:

```bash
python "harness/judges/design_judge.py"    --self-test   # prints OK, exit 0
python "harness/judges/wording_judge.py"   --self-test   # prints OK, exit 0
python "harness/judges/structure_judge.py" --self-test   # prints OK, exit 0
```

The commit gate / test gate can shell out to `--self-test` to confirm the judges
themselves still work before trusting their verdicts.

---

## Robustness notes

- **Empty directory** → no files assessed; every dimension neutral `7`, `pass`
  depends on threshold (`7 >= 6` ⇒ pass by default).
- **Binary files** are detected (NUL bytes, invalid UTF-8, or a high control-char
  ratio) and skipped. UTF-8 multibyte text (CJK) is correctly treated as text.
- **Missing path** → message on stderr, exit `2`.
- **No `<path>` and no `--self-test`** → message on stderr, exit `2`.
- All file reads are explicit UTF-8 (with `errors="replace"` fallback).
