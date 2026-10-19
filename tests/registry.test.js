import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, getServer, searchServers, validateRegistry } from '../src/registry.js';

test('registry loads and has servers', () => {
  const r = loadRegistry();
  assert.ok(Array.isArray(r.servers));
  assert.ok(r.servers.length > 0);
});

test('getServer returns known id', () => {
  const s = getServer('github');
  assert.ok(s);
  assert.equal(s.id, 'github');
  assert.equal(s.runtime, 'npx');
});

test('getServer returns null for unknown', () => {
  assert.equal(getServer('nope-xyz'), null);
});

test('search finds by tag', () => {
  const res = searchServers('postgres');
  assert.ok(res.length >= 1);
  assert.ok(res.some(s => s.id === 'postgres'));
});

test('search ranks exact name higher', () => {
  const res = searchServers('github');
  assert.equal(res[0].id, 'github');
});

test('validateRegistry passes', () => {
  const r = loadRegistry();
  assert.deepEqual(validateRegistry(r), []);
});

test('validateRegistry catches duplicate ids', () => {
  const r = loadRegistry();
  const copy = JSON.parse(JSON.stringify(r));
  copy.servers.push({ ...copy.servers[0] });
  const errs = validateRegistry(copy);
  assert.ok(errs.some(e => /duplicate/.test(e)));
});

test('validateRegistry catches missing field', () => {
  const bad = { version: 1, servers: [{ id: 'x', name: 'X', description: 'd', category: 'other', runtime: 'npx' }] };
  // missing command
  const errs = validateRegistry(bad);
  assert.ok(errs.some(e => /command/.test(e)));
});
