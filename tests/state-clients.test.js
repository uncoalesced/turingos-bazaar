import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('state: markInstalled/markUninstalled/isInstalled', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mb-'));
  process.env.MCP_BAZAAR_HOME = dir;
  // re-import after env set by dynamic import
  const st = await import('../src/state.js');
  st.markInstalled('github', { name: 'GitHub' });
  assert.equal(st.isInstalled('github'), true);
  assert.deepEqual(st.installedIds(), ['github']);
  st.markUninstalled('github');
  assert.equal(st.isInstalled('github'), false);
  rmSync(dir, { recursive: true, force: true });
  delete process.env.MCP_BAZAAR_HOME;
});

test('clients: CLIENTS has expected ids', async () => {
  const cl = await import('../src/clients.js');
  const ids = cl.CLIENTS.map(c => c.id);
  for (const id of ['claude-code','cursor','windsurf','continue','cline']) assert.ok(ids.includes(id));
  assert.equal(typeof cl.clientById('cursor').configPath, 'function');
});
