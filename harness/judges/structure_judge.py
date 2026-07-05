#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""structure_judge.py -- structural-conformance judge for the China KG Platform.

Checks that the (future) application codebase strictly follows the agreed app
structure derived from the source Mermaid flowcharts. The contract lives in
harness/structure/app-structure.json (human mirror: docs/APP-STRUCTURE.md). Screen
ids mirror the Mermaid node ids 1:1 so conformance is traceable to the source flows.

What it does:
  1. Load the structural contract (app-structure.json). Missing -> exit 2.
  2. Locate an application page manifest among conformance.manifestCandidates.
       - None found -> current state (no app code yet). PASS, with a clear note
         and a reminder to (re)build the /understand-anything map. Mirrors the
         no-op-pass pattern of harness/code-review.mjs.
       - Found -> parse it. Supports uni-app pages.json and native app.json
         shapes; tolerates // and /* */ comments (uni-app allows them).
  3. Load harness/structure/route-map.json (screenId -> page path), if present.
       - Mapped screen whose path is missing from the manifest        -> P1.
       - Screen not yet mapped                                          -> P2.
  4. UGC moderation invariant: ugcWrite screens mapped to an existing page file
     that references neither msgSecCheck nor mediaCheckAsync             -> P1.
  5. Role-access invariant (best-effort, non-crashing): a parent-looking page
     mapped to a screen whose module is parent-forbidden                -> P1.
  6. Footer reminders: prints the contract invariants, the knowledge-graph note
     (or the /understand-anything reminder when absent).

CLI:
    python structure_judge.py [path] [--json] [--strict] [--self-test]

  path     optional; default = repo root (resolved from this script location).
  --json   emit a single JSON object instead of the human report.
  --strict pass also requires no P2.
  pass     = no P0 and no P1 (and no P2 when --strict).

Exit codes: 0 pass, 1 fail, 2 usage / IO error.
Pure standard library. Windows-safe (pathlib, explicit utf-8).
Deterministic: no clock, no network, no randomness.
"""

import argparse
import json
import os
import re
import sys
import tempfile
import shutil
from pathlib import Path

JUDGE_NAME = "structure"

# Repo root is two parents up from this script: harness/judges/ -> harness/ -> root.
SCRIPT_PATH = Path(__file__).resolve()
DEFAULT_ROOT = SCRIPT_PATH.parent.parent.parent

CONTRACT_REL = Path("harness") / "structure" / "app-structure.json"
ROUTE_MAP_REL = Path("harness") / "structure" / "route-map.json"
KNOWLEDGE_GRAPH_REL = Path(".understand-anything") / "knowledge-graph.json"

UNDERSTAND_REMINDER = (
    "Run /understand-anything:understand to (re)build "
    ".understand-anything/knowledge-graph.json so the structural judge can compare "
    "the codebase map against app-structure.json."
)

# Page source file extensions tried near a route path for the moderation check.
PAGE_EXTS = (".js", ".ts", ".vue", ".wxml")
# Source roots a page path might be rooted under.
SOURCE_PREFIXES = ("", "src", "miniprogram", "app")

SEV_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


# --------------------------------------------------------------------------- #
# Finding model
# --------------------------------------------------------------------------- #
def finding(severity, title, file, fix):
    return {"severity": severity, "title": title, "file": file, "fix": fix}


# --------------------------------------------------------------------------- #
# IO helpers
# --------------------------------------------------------------------------- #
def read_text(path):
    """Read a file as UTF-8 (errors replaced). Return None if unreadable."""
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)


def strip_json_comments(text):
    """Remove // line comments and /* */ block comments so JSON-with-comments
    (uni-app pages.json tolerates these) parses. String literals are preserved;
    a // inside a "..." string is not treated as a comment."""
    # Remove block comments first.
    text = _BLOCK_COMMENT.sub("", text)
    out = []
    in_str = False
    escaped = False
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if in_str:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_str = False
            i += 1
            continue
        if ch == '"':
            in_str = True
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n and text[i + 1] == "/":
            # Skip to end of line.
            j = text.find("\n", i)
            if j == -1:
                break
            i = j
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def load_json_file(path):
    """Load a JSON (with-comments tolerant) file. Returns (data, error)."""
    text = read_text(path)
    if text is None:
        return None, "unreadable"
    try:
        return json.loads(strip_json_comments(text)), None
    except json.JSONDecodeError as exc:
        return None, "invalid JSON: %s" % exc


# --------------------------------------------------------------------------- #
# Manifest parsing
# --------------------------------------------------------------------------- #
def collect_manifest_pages(data):
    """Return a sorted set of declared page paths from a uni-app pages.json or a
    native app.json. Supports top-level `pages` plus sub-package shapes:
      uni-app : subPackages | subpackages -> [{root, pages:[{path}|str]}]
      native  : subpackages | subPackages -> [{root, pages:[str]}]
    Each page entry may be a string or an object with a `path` field."""
    paths = set()

    def page_path(entry):
        if isinstance(entry, str):
            return entry.strip()
        if isinstance(entry, dict):
            p = entry.get("path")
            if isinstance(p, str):
                return p.strip()
        return None

    def join_root(root, p):
        root = (root or "").strip().strip("/")
        p = (p or "").strip()
        if root:
            return root + "/" + p.lstrip("/")
        return p

    for entry in (data.get("pages") or []):
        p = page_path(entry)
        if p:
            paths.add(p)

    for key in ("subPackages", "subpackages"):
        for pkg in (data.get(key) or []):
            if not isinstance(pkg, dict):
                continue
            root = pkg.get("root", "")
            for entry in (pkg.get("pages") or []):
                p = page_path(entry)
                if p:
                    paths.add(join_root(root, p))

    return paths


def find_manifest(root, candidates):
    """Return (relative_path_str, data) for the first existing, parseable
    manifest among candidates, or (None, None)."""
    for rel in candidates:
        fp = root / rel
        if fp.is_file():
            data, err = load_json_file(fp)
            if err is None and isinstance(data, dict):
                return rel.replace("\\", "/") if isinstance(rel, str) else str(Path(rel)).replace("\\", "/"), data
    return None, None


# --------------------------------------------------------------------------- #
# Page source lookup (for the moderation check)
# --------------------------------------------------------------------------- #
def find_page_source(root, page_path):
    """Try to locate a real source file for a route path. WeChat / uni-app pages
    are folders or file stems; we try <prefix>/<path><ext> and
    <prefix>/<path>/index<ext>. Returns a Path or None."""
    page_path = page_path.strip().lstrip("/")
    candidates = []
    for prefix in SOURCE_PREFIXES:
        base = (root / prefix / page_path) if prefix else (root / page_path)
        for ext in PAGE_EXTS:
            candidates.append(Path(str(base) + ext))
            candidates.append(base / ("index" + ext))
    for c in candidates:
        try:
            if c.is_file():
                return c
        except OSError:
            continue
    return None


MODERATION_RE = re.compile(r"msgSecCheck|mediaCheckAsync", re.IGNORECASE)


def references_moderation(path):
    text = read_text(path)
    if text is None:
        return True  # cannot read -> do not falsely flag
    return bool(MODERATION_RE.search(text))


# --------------------------------------------------------------------------- #
# Core judging
# --------------------------------------------------------------------------- #
def judge(root, strict=False):
    """Run the structural conformance checks. Returns a result dict."""
    root = Path(root)
    findings = []
    notes = []
    reminders = []

    contract_fp = root / CONTRACT_REL
    if not contract_fp.is_file():
        raise IOError("structural contract not found: %s" % contract_fp)

    contract, err = load_json_file(contract_fp)
    if err is not None or not isinstance(contract, dict):
        raise IOError("could not parse structural contract (%s): %s"
                      % (contract_fp, err or "not an object"))

    screens = contract.get("screens") or []
    invariants = contract.get("invariants") or []
    conformance = contract.get("conformance") or {}
    role_access = contract.get("roleAccess") or {}
    candidates = conformance.get("manifestCandidates") or []

    # Module -> id lookups for the role-access heuristic.
    screen_by_id = {}
    for sc in screens:
        if isinstance(sc, dict) and sc.get("id"):
            screen_by_id[sc["id"]] = sc

    # --- 2. Locate the page manifest --------------------------------------- #
    manifest_rel, manifest_data = find_manifest(root, candidates)

    if manifest_data is None:
        # No application source yet. PASS with skip note + reminder.
        notes.append(
            "no application source/page manifest yet — structural conformance "
            "skipped (active once the mini app exists)")
        reminders.append(UNDERSTAND_REMINDER)
        result = _assemble(root, contract, [], notes, reminders, invariants,
                           manifest_rel=None, manifest_pages=set(),
                           strict=strict, skipped=True)
        return result

    manifest_pages = collect_manifest_pages(manifest_data)
    notes.append("page manifest found: %s (%d declared page path(s))"
                 % (manifest_rel, len(manifest_pages)))

    # --- 3. Route-map cross-check ------------------------------------------ #
    route_map_fp = root / ROUTE_MAP_REL
    route_map = {}
    if route_map_fp.is_file():
        rm, rm_err = load_json_file(route_map_fp)
        if rm_err is None and isinstance(rm, dict):
            route_map = {k: v for k, v in rm.items()
                         if not str(k).startswith("_") and isinstance(v, str)}
        else:
            findings.append(finding(
                "P2", "route-map.json present but unreadable (%s)" % (rm_err or "not an object"),
                str(ROUTE_MAP_REL).replace("\\", "/"),
                "Fix route-map.json so it is a JSON object of screenId -> page path."))
    else:
        notes.append("route-map.json not present — all screens reported as unmapped")

    rm_rel = str(ROUTE_MAP_REL).replace("\\", "/")
    for sc in screens:
        if not isinstance(sc, dict):
            continue
        sid = sc.get("id")
        zh = sc.get("zh", "")
        if not sid:
            continue
        if sid in route_map:
            page = route_map[sid]
            if page not in manifest_pages:
                findings.append(finding(
                    "P1",
                    "required screen %s (%s) maps to %s which is missing from the page manifest"
                    % (sid, zh, page),
                    manifest_rel,
                    "add the page or correct route-map.json"))
        else:
            findings.append(finding(
                "P2",
                "screen %s (%s) not yet mapped to a route" % (sid, zh),
                rm_rel,
                "add %s to harness/structure/route-map.json once its page exists" % sid))

    # --- 4. UGC moderation invariant --------------------------------------- #
    for sc in screens:
        if not isinstance(sc, dict) or not sc.get("ugcWrite"):
            continue
        sid = sc.get("id")
        zh = sc.get("zh", "")
        page = route_map.get(sid)
        if not page or page not in manifest_pages:
            continue  # not mapped to an existing page -> nothing to inspect yet
        src = find_page_source(root, page)
        if src is None:
            continue  # cannot locate the file -> skip silently (code-review covers it)
        if not references_moderation(src):
            findings.append(finding(
                "P1",
                "UGC-write screen %s (%s) has no content-moderation call" % (sid, zh),
                str(src.relative_to(root)).replace("\\", "/"),
                "route writes through security.msgSecCheck / security.mediaCheckAsync (ADR-0005)"))

    # --- 5. Role-access invariant (best-effort heuristic) ------------------ #
    parent_forbidden = set(
        ((role_access.get("parent") or {}).get("forbiddenModules") or []))
    if parent_forbidden:
        for sid, page in route_map.items():
            try:
                if "parent" not in str(page).lower():
                    continue
                sc = screen_by_id.get(sid)
                if not sc:
                    continue
                module = sc.get("module")
                if module in parent_forbidden:
                    findings.append(finding(
                        "P1",
                        "parent-surfaced route %s maps to screen %s whose module "
                        "'%s' is forbidden for the parent role" % (page, sid, module),
                        rm_rel,
                        "remove the parent route or re-map %s; parent must not reach %s"
                        % (sid, module)))
            except Exception:
                # Heuristic must never throw.
                continue

    return _assemble(root, contract, findings, notes, reminders, invariants,
                     manifest_rel=manifest_rel, manifest_pages=manifest_pages,
                     strict=strict, skipped=False)


def _assemble(root, contract, findings, notes, reminders, invariants,
              manifest_rel, manifest_pages, strict, skipped):
    """Compute knowledge-graph note, pass verdict, and pack the result."""
    root = Path(root)

    # --- 7. Knowledge-graph informational note ----------------------------- #
    kg_fp = root / KNOWLEDGE_GRAPH_REL
    if kg_fp.is_file():
        kg, kg_err = load_json_file(kg_fp)
        node_count = None
        if kg_err is None and isinstance(kg, dict):
            nodes = kg.get("nodes")
            if isinstance(nodes, list):
                node_count = sum(
                    1 for nd in nodes
                    if isinstance(nd, dict)
                    and (nd.get("type") == "file" or nd.get("kind") == "file"
                         or "file" in str(nd.get("type", "")).lower()))
                if node_count == 0:
                    node_count = len(nodes)
        if node_count is not None:
            notes.append(".understand-anything/knowledge-graph.json present "
                         "(~%d node(s)) — available for future cross-checks" % node_count)
        else:
            notes.append(".understand-anything/knowledge-graph.json present")
    else:
        if UNDERSTAND_REMINDER not in reminders:
            reminders.append(UNDERSTAND_REMINDER)

    # Stable ordering.
    findings.sort(key=lambda f: (SEV_ORDER.get(f["severity"], 9),
                                 f.get("file") or "", f.get("title") or ""))

    counts = {sev: 0 for sev in ("P0", "P1", "P2", "P3")}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    has_p0 = counts["P0"] > 0
    has_p1 = counts["P1"] > 0
    has_p2 = counts["P2"] > 0
    passed = (not has_p0) and (not has_p1) and (not (strict and has_p2))

    return {
        "judge": JUDGE_NAME,
        "pass": passed,
        "findings": findings,
        "summary": {
            "skipped": skipped,
            "manifest": manifest_rel,
            "manifestPages": len(manifest_pages),
            "screens": len(contract.get("screens") or []),
            "counts": counts,
            "strict": strict,
            "notes": notes,
            "reminders": reminders,
            "invariants": list(invariants),
        },
    }


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #
def print_report(result, root):
    s = result["summary"]
    print("=== Structure Judge ===  root: %s" % root)
    if s["manifest"]:
        print("page manifest: %s (%d declared page path(s)); contract screens: %d"
              % (s["manifest"], s["manifestPages"], s["screens"]))
    else:
        print("page manifest: none found; contract screens: %d" % s["screens"])

    for note in s["notes"]:
        print("note: %s" % note)

    fnds = result["findings"]
    print("Findings (%d):" % len(fnds))
    for f in fnds:
        print("  [%s] %s (%s)" % (f["severity"], f["title"], f["file"]))
        print("       fix: %s" % f["fix"])

    if s["invariants"]:
        print("")
        print("Structural invariants (reminders):")
        for inv in s["invariants"]:
            print("  - %s" % inv)

    if s["reminders"]:
        print("")
        for rem in s["reminders"]:
            print("reminder: %s" % rem)

    print("")
    c = s["counts"]
    print("Result: %s (P0=%d P1=%d P2=%d P3=%d, strict=%s)" % (
        "PASS" if result["pass"] else "FAIL",
        c["P0"], c["P1"], c["P2"], c["P3"],
        "on" if s["strict"] else "off"))


def emit_json(result):
    print(json.dumps(result, ensure_ascii=False))


# --------------------------------------------------------------------------- #
# Self-test
# --------------------------------------------------------------------------- #
def self_test():
    """Build a tiny synthetic contract + manifest + route-map in a temp dir and
    assert the three core behaviors. Prints OK and returns 0 on success."""
    base = Path(tempfile.mkdtemp(prefix="structure_judge_selftest_"))
    try:
        struct_dir = base / "harness" / "structure"
        src_pages = base / "src"
        struct_dir.mkdir(parents=True)
        src_pages.mkdir(parents=True)

        contract = {
            "version": "test",
            "roleAccess": {"parent": {"forbiddenModules": ["party-building"]}},
            "screens": [
                {"id": "Home", "zh": "首页", "module": "home", "ugcWrite": False},
                {"id": "UploadForm", "zh": "上传表单", "module": "home", "ugcWrite": True},
            ],
            "invariants": ["UGC writes must be moderated."],
            "conformance": {"manifestCandidates": ["src/pages.json", "pages.json"]},
        }
        (struct_dir / "app-structure.json").write_text(
            json.dumps(contract), encoding="utf-8")

        # ---- Case A: mapped-but-missing page -> P1 and pass=False --------- #
        # Manifest declares only Home; route-map also maps UploadForm to a page
        # that is NOT declared -> P1. The manifest carries // and /* */ comments
        # to exercise the comment-stripping path (uni-app tolerates them).
        manifest_with_comment = (
            '{\n'
            '  // uni-app allows comments\n'
            '  "pages": [ {"path": "pages/home/index"} ],\n'
            '  /* block comment */\n'
            '  "subPackages": []\n'
            '}\n')
        (src_pages / "pages.json").write_text(manifest_with_comment, encoding="utf-8")

        route_map_missing = {
            "_comment": "test",
            "Home": "pages/home/index",
            "UploadForm": "pages/upload/index",  # NOT in manifest -> P1
        }
        (struct_dir / "route-map.json").write_text(
            json.dumps(route_map_missing), encoding="utf-8")

        res_a = judge(base, strict=False)
        assert res_a["pass"] is False, "mapped-but-missing page should fail"
        assert any(f["severity"] == "P1" and "UploadForm" in f["title"]
                   for f in res_a["findings"]), "should emit a P1 for the missing page"

        # ---- Case B: fully-mapped manifest -> pass=True ------------------- #
        manifest_full = {
            "pages": [
                {"path": "pages/home/index"},
                {"path": "pages/upload/index"},
            ]
        }
        (src_pages / "pages.json").write_text(
            json.dumps(manifest_full), encoding="utf-8")
        # Give the UGC page a source file WITH a moderation call so no P1 fires.
        upload_dir = src_pages / "pages" / "upload"
        upload_dir.mkdir(parents=True)
        (upload_dir / "index.js").write_text(
            "wx.cloud.callFunction({name:'security'});"
            " // calls security.msgSecCheck before publishing\n",
            encoding="utf-8")
        route_map_full = {
            "_comment": "test",
            "Home": "pages/home/index",
            "UploadForm": "pages/upload/index",
        }
        (struct_dir / "route-map.json").write_text(
            json.dumps(route_map_full), encoding="utf-8")

        res_b = judge(base, strict=False)
        assert res_b["pass"] is True, "fully-mapped + moderated should pass; got %r" % (
            [f for f in res_b["findings"] if f["severity"] in ("P0", "P1")])

        # ---- Case C: no manifest -> pass=True with skip note ------------- #
        (src_pages / "pages.json").unlink()
        res_c = judge(base, strict=False)
        assert res_c["pass"] is True, "no manifest should pass"
        assert res_c["summary"]["skipped"] is True, "no manifest -> skipped flag"
        assert any("no application source" in n for n in res_c["summary"]["notes"]), \
            "no manifest should carry the skip note"
        assert any("understand-anything" in r for r in res_c["summary"]["reminders"]), \
            "no manifest should carry the /understand-anything reminder"

        print("OK")
        return 0
    finally:
        shutil.rmtree(base, ignore_errors=True)


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def build_parser():
    p = argparse.ArgumentParser(
        prog="structure_judge.py",
        description="Structural-conformance judge against harness/structure/app-structure.json.")
    p.add_argument("path", nargs="?", default=None,
                   help="Repo root to check (default: resolved from script location).")
    p.add_argument("--json", action="store_true",
                   help="Emit a single JSON object instead of the human report.")
    p.add_argument("--strict", action="store_true",
                   help="Also fail on any P2 finding.")
    p.add_argument("--self-test", action="store_true",
                   help="Run inline assertions on a synthetic repo and print OK.")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)

    if args.self_test:
        try:
            return self_test()
        except AssertionError as exc:
            print("SELF-TEST FAILED: %s" % exc, file=sys.stderr)
            return 1

    root = Path(args.path).resolve() if args.path else DEFAULT_ROOT
    if not root.exists():
        print("error: path not found: %s" % root, file=sys.stderr)
        return 2

    try:
        result = judge(root, strict=args.strict)
    except IOError as exc:
        print("error: %s" % exc, file=sys.stderr)
        return 2
    except OSError as exc:
        print("error: IO failure: %s" % exc, file=sys.stderr)
        return 2

    if args.json:
        emit_json(result)
    else:
        print_report(result, root)

    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
