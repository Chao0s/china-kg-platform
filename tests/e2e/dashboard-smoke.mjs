// tests/e2e/dashboard-smoke.mjs
//
// Catches the exact failure that slipped through before: the knowledge-graph dashboard
// failing to load because the selected understand-anything plugin's core package is not
// built, so `@understand-anything/core/schema` (and friends) do not resolve and Vite
// errors at transform time.
//
// This is a DETERMINISTIC, browserless check: it selects the same plugin the launcher
// would (latest cached version, preferring a built one) and asserts every
// `@understand-anything/core[/sub]` import in the dashboard resolves to a real built file.
// Skips gracefully when the plugin is not installed (e.g. CI without the plugin).

import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlugin, coreImportStatus } from '../../scripts/lib-resolve-core.mjs';

const plugin = findPlugin();

test('LINE dashboard: latest plugin is selected and its dashboard exists', { skip: plugin ? false : 'understand-anything plugin not installed' }, () => {
  assert.ok(plugin, 'a plugin with packages/dashboard should be found');
});

test('LINE dashboard: every @understand-anything/core import resolves to a built file', { skip: plugin ? false : 'understand-anything plugin not installed' }, () => {
  const st = coreImportStatus(plugin);
  assert.ok(st.specifiers.length >= 1, 'dashboard should import the core package');
  assert.deepEqual(
    st.missing, [],
    'unresolved core imports — the core package is not built. Run the launcher or:\n' +
    '  pnpm --filter @understand-anything/core build\nMissing:\n' +
    st.missing.map(m => `  ${m.specifier} -> ${m.expectedFile}`).join('\n'),
  );
});
