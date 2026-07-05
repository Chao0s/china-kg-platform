#!/usr/bin/env node
// build-kg-demo.mjs — Build a SELF-CONTAINED static knowledge-graph demo (graph + browsable source)
// for hosting (here.now / any static host). No dev server / localhost needed.
//
// The understand-anything demo build deliberately disables the code viewer (it expects the
// local dev server's /file-content.json endpoint). This script:
//   1. temporarily patches the dashboard's CodeViewer so demo mode reads a bundled snapshot,
//   2. builds the demo (base ./) with THIS repo's 简体中文 knowledge-graph.json,
//   3. restores the dashboard source (plugin cache left pristine),
//   4. writes the graph + a per-file source snapshot into dist/files/<path>.json.
//
// Output: <dashboard>/dist  (publish that dir). Re-run any time after /understand-anything:understand.
// Usage: node scripts/build-kg-demo.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPlugin } from './lib-resolve-core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = findPlugin();
if (!PLUGIN) { console.error('[demo] understand-anything plugin not found'); process.exit(1); }
const DASH = path.join(PLUGIN, 'packages', 'dashboard');
const COMP = path.join(DASH, 'src', 'components');
const GRAPH = path.join(REPO, '.understand-anything', 'knowledge-graph.json');
if (!fs.existsSync(GRAPH)) { console.error('[demo] no knowledge-graph.json — run /understand-anything:understand first'); process.exit(1); }

const LANG = { '.mjs': 'javascript', '.cjs': 'javascript', '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx', '.py': 'python', '.json': 'json', '.md': 'markdown', '.markdown': 'markdown', '.css': 'css', '.wxss': 'css', '.html': 'markup', '.wxml': 'markup', '.yml': 'yaml', '.yaml': 'yaml', '.sh': 'bash', '.txt': 'text', '.csv': 'text', '.gitignore': 'text', '.gitattributes': 'text' };
const BINARY = new Set(['.docx', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.pdf', '.zip']);

// Patch table: each plugin-cache file gets demo-only edits that are reverted after the build.
// All edits are single-line, CRLF-agnostic, first-occurrence exact-string replacements.
// CodeViewer enables the bundled source snapshot; the rest localize chrome that the
// upstream dashboard never wired to i18n (LayerClusterNode/PortalNode have no useI18n,
// CustomNode renders raw graph enums). Display-only — graph data is untouched, so the
// English-keyed color/filter logic still works.
const PATCHES = [
  {
    path: path.join(COMP, 'CodeViewer.tsx'),
    edits: [
      // (a) neutralize the demo-mode early "source only on local server" return.
      ['if (accessToken === "__demo__") {', 'if (false && accessToken === "__demo__") {'],
      // (b) in demo mode, read a static per-file JSON snapshot instead of the dev-server endpoint.
      ['const params = new URLSearchParams({ token, path: filePath });',
       'if (token === "__demo__") return "./files/" + encodeURI(filePath) + ".json"; const params = new URLSearchParams({ token, path: filePath });'],
    ],
    verify: ['false && accessToken', '"./files/"'],
  },
  {
    // Overview layer bubbles — the default landing view.
    path: path.join(COMP, 'LayerClusterNode.tsx'),
    edits: [
      ['            Layer', '            层'],
      ['{data.aggregateComplexity}',
       '{(({ simple: "简单", moderate: "中等", complex: "复杂" }) as Record<string, string>)[data.aggregateComplexity] ?? data.aggregateComplexity}'],
      ['{data.searchMatchCount} match{data.searchMatchCount !== 1 ? "es" : ""}', '{data.searchMatchCount} 匹配'],
      ['{data.fileCount} file{data.fileCount !== 1 ? "s" : ""}', '{data.fileCount} 文件'],
      ['Click to explore →', '点击浏览 →'],
    ],
    verify: ['            层', '匹配', '文件', '点击浏览'],
  },
  {
    // Cross-layer portal nodes.
    path: path.join(COMP, 'PortalNode.tsx'),
    edits: [
      ['{data.connectionCount} connection{data.connectionCount !== 1 ? "s" : ""}', '{data.connectionCount} 连接'],
    ],
    verify: ['连接'],
  },
  {
    // Drill-in node cards — type badge + complexity render raw graph enums.
    path: path.join(COMP, 'CustomNode.tsx'),
    edits: [
      // 12-space indent anchors the JSX badge on its own line — bare `{data.nodeType}`
      // would first match the `${data.nodeType}` inside a console.warn template (dead code).
      ['            {data.nodeType}',
       '            {(({ file: "文件", function: "函数", class: "类", module: "模块", concept: "概念", config: "配置", document: "文档", service: "服务", table: "表", endpoint: "端点", pipeline: "管线", schema: "架构", resource: "资源", domain: "领域", flow: "流程", step: "步骤" }) as Record<string, string>)[data.nodeType] ?? data.nodeType}'],
      ['{data.complexity}',
       '{(({ simple: "简单", moderate: "中等", complex: "复杂" }) as Record<string, string>)[data.complexity] ?? data.complexity}'],
    ],
    verify: ['"端点"', '"中等"'],
  },
  {
    // Path Finder modal (the "P" tool) — no useI18n at all; fully hardcoded English.
    // 14-space anchors avoid the matching {/* From Node */} / {/* To Node */} JSX comments;
    // the 12-space "Close" anchor avoids the many `onClose` identifiers.
    path: path.join(COMP, 'PathFinderModal.tsx'),
    edits: [
      ['Dependency Path Finder', '依赖路径查找'],
      ['Find the shortest path between two nodes in the dependency graph.', '查找依赖图中两个节点之间的最短路径。'],
      ['              From Node', '              起始节点'],
      ['              To Node', '              目标节点'],
      ['Select a node...', '选择节点…', { all: true }],
      // Each option renders `{node.name} ({node.type})` in both selects — localize the type tag.
      ['({node.type})',
       '({(({ file: "文件", function: "函数", class: "类", module: "模块", concept: "概念", config: "配置", document: "文档", service: "服务", table: "表", endpoint: "端点", pipeline: "管线", schema: "架构", resource: "资源", domain: "领域", flow: "流程", step: "步骤" }) as Record<string, string>)[node.type] ?? node.type})',
       { all: true }],
      ['{searching ? "Searching..." : "Find Path"}', '{searching ? "搜索中…" : "查找路径"}'],
      ['No path found between these nodes.', '未找到这两个节点之间的路径。'],
      ['Path Found ({path.length} nodes)', '找到路径（共 {path.length} 个节点）'],
      ['            Close', '            关闭'],
    ],
    verify: ['依赖路径查找', '查找路径', '关闭', '选择节点'],
  },
  {
    // File explorer hover tooltip — mixed-English template literal.
    path: path.join(COMP, 'FileExplorer.tsx'),
    edits: [
      ['${entry.path} - double-click to open', '${entry.path} - 双击打开'],
    ],
    verify: ['双击打开'],
  },
  {
    // Learn-panel section headings — hardcoded, not wired to t.
    path: path.join(COMP, 'LearnPanel.tsx'),
    edits: [
      ['Language Lesson', '语言讲解'],
      ['Referenced Components', '引用的组件'],
    ],
    verify: ['语言讲解', '引用的组件'],
  },
  {
    // Node-type filter buttons (App toolbar) — visible label is Chinese (t.*), but the
    // hover tooltip is a hardcoded English template.
    path: path.join(DASH, 'src', 'App.tsx'),
    edits: [
      ['${nodeTypeFilters[cat.key] !== false ? "Hide" : "Show"} ${cat.label} nodes',
       '${nodeTypeFilters[cat.key] !== false ? "隐藏" : "显示"} ${cat.label} 节点'],
    ],
    verify: ['${cat.label} 节点'],
  },
  {
    // Filter panel toggle — hardcoded English hover tooltip.
    path: path.join(COMP, 'FilterPanel.tsx'),
    edits: [
      ['Filter graph (F)', '筛选图谱 (F)'],
    ],
    verify: ['筛选图谱'],
  },
  {
    // Diff overlay toggle — button label is hardcoded English ("Diff ON/OFF").
    path: path.join(COMP, 'DiffToggle.tsx'),
    edits: [
      ['Diff {diffMode && hasDiff ? "ON" : "OFF"}', '差异 {diffMode && hasDiff ? "开" : "关"}'],
    ],
    verify: ['差异'],
  },
];

// Read originals, apply edits, verify shape — abort (cache untouched) on any mismatch.
const originals = new Map();
for (const p of PATCHES) {
  const src = fs.readFileSync(p.path, 'utf8');
  originals.set(p.path, src);
  let out = src;
  for (const [from, to, opts = {}] of p.edits) {
    // Each target must be unambiguous. Default: exactly 1 site — >1 means a substring
    // collision (e.g. `{data.nodeType}` inside `${data.nodeType}`, or a label that also
    // appears in a JSX comment) that would patch the wrong line. `{ all: true }` opts into
    // replacing every occurrence (e.g. a repeated `Select a node...` option) and needs >=1.
    const n = out.split(from).length - 1;
    if (opts.all ? n < 1 : n !== 1) {
      console.error(`[demo] expected ${opts.all ? '>=1' : 'exactly 1'} match in ${path.basename(p.path)} but found ${n}: ${JSON.stringify(from).slice(0, 90)}`);
      console.error('[demo] component shape changed; aborting to avoid a broken / half-English build.');
      process.exit(2);
    }
    out = opts.all ? out.split(from).join(to) : out.replace(from, to);
  }
  for (const marker of p.verify ?? []) {
    if (!out.includes(marker)) { console.error(`[demo] post-patch verify failed in ${path.basename(p.path)}: ${marker}`); process.exit(2); }
  }
  p.patched = out;
}

let buildOk = false;
try {
  for (const p of PATCHES) fs.writeFileSync(p.path, p.patched, 'utf8');
  console.log(`[demo] patched ${PATCHES.length} components (code viewer + 简体中文 chrome); building demo…`);
  const r = spawnSync('npx', ['vite', 'build', '--config', 'vite.config.demo.ts', '--base=./'], {
    cwd: DASH, encoding: 'utf8', shell: process.platform === 'win32',
    env: { ...process.env, VITE_GRAPH_URL: './knowledge-graph.json', VITE_CONFIG_URL: './config.json' },
    stdio: 'inherit',
  });
  buildOk = r.status === 0;
} finally {
  for (const [fp, src] of originals) fs.writeFileSync(fp, src, 'utf8'); // always restore the plugin cache
  console.log('[demo] restored patched components.');
}
if (!buildOk) { console.error('[demo] vite build failed'); process.exit(1); }

const DIST = path.join(DASH, 'dist');
// graph
fs.copyFileSync(GRAPH, path.join(DIST, 'knowledge-graph.json'));
// config (drives the UI language — outputLanguage: "zh" -> Simplified-Chinese shell)
const CFG = path.join(REPO, '.understand-anything', 'config.json');
fs.writeFileSync(path.join(DIST, 'config.json'),
  fs.existsSync(CFG) ? fs.readFileSync(CFG, 'utf8') : '{"outputLanguage":"zh"}', 'utf8');
// per-file source snapshot
const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
const seen = new Set();
let written = 0, skipped = 0;
for (const node of graph.nodes) {
  const fp = node.filePath;
  if (!fp || seen.has(fp)) continue;
  seen.add(fp);
  const ext = path.extname(fp).toLowerCase();
  const out = path.join(DIST, 'files', fp + '.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let content, language = LANG[ext] || 'text';
  if (BINARY.has(ext)) { content = '(binary file — not shown)'; language = 'text'; }
  else {
    try { content = fs.readFileSync(path.join(REPO, fp), 'utf8'); }
    catch { content = '(file not found in snapshot)'; }
  }
  const payload = { path: fp, language, content, sizeBytes: Buffer.byteLength(content), lineCount: content.split('\n').length };
  fs.writeFileSync(out, JSON.stringify(payload), 'utf8');
  written++;
}
console.log(`[demo] snapshot: ${written} files written, ${skipped} skipped`);
console.log('[demo] DONE. Publish this dir:');
console.log(DIST);
