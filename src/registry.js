// src/registry.js — load and query registry/registry.json
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
export const REGISTRY_PATH = process.env.MCP_BAZAAR_REGISTRY || join(PKG_ROOT, 'registry', 'registry.json');

let cache = null;
export function loadRegistry(path = REGISTRY_PATH) {
  if (cache && path === REGISTRY_PATH) return cache;
  if (!existsSync(path)) throw new Error(`Registry not found: ${path}`);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || !Array.isArray(raw.servers)) throw new Error('Invalid registry: missing servers array');
  const data = { version: raw.version, updated: raw.updated, servers: raw.servers };
  if (path === REGISTRY_PATH) cache = data;
  return data;
}

export function allServers(path) {
  return loadRegistry(path).servers;
}

export function getServer(id, path) {
  return allServers(path).find((s) => s.id === id) || null;
}

export function categories(path) {
  const set = new Set(allServers(path).map((s) => s.category));
  return [...set].sort();
}

function score(s, q) {
  q = q.toLowerCase();
  let n = 0;
  if (s.id.toLowerCase().includes(q)) n += 5;
  if (s.name.toLowerCase().includes(q)) n += 4;
  if (s.description.toLowerCase().includes(q)) n += 2;
  for (const t of s.tags || []) if (t.toLowerCase().includes(q)) n += 3;
  if (s.category.toLowerCase().includes(q)) n += 2;
  if (s.author && s.author.toLowerCase().includes(q)) n += 1;
  return n;
}

export function searchServers(query, path) {
  if (!query) return allServers(path);
  const q = query.trim().toLowerCase();
  return allServers(path)
    .map((s) => ({ s, n: score(s, q) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.s.name.localeCompare(b.s.name))
    .map((x) => x.s);
}

export function filterByCategory(cat, path) {
  if (!cat) return allServers(path);
  return allServers(path).filter((s) => s.category === cat);
}

export function featured(path) {
  return allServers(path).filter((s) => s.featured);
}

export function validateRegistry(data) {
  const errors = [];
  if (!data || typeof data !== 'object') { errors.push('registry must be object'); return errors; }
  if (!Number.isInteger(data.version) || data.version < 1) errors.push('version must be positive integer');
  if (!Array.isArray(data.servers) || data.servers.length === 0) errors.push('servers must be non-empty array');
  const ids = new Set();
  (data.servers || []).forEach((s, i) => {
    const p = `servers[${i}]`;
    if (!s || typeof s !== 'object') { errors.push(`${p}: must be object`); return; }
    for (const f of ['id', 'name', 'description', 'category', 'runtime', 'command']) {
      if (!s[f] || typeof s[f] !== 'string') errors.push(`${p}: missing/invalid ${f}`);
    }
    if (s.id) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(s.id)) errors.push(`${p}: invalid id "${s.id}"`);
      if (ids.has(s.id)) errors.push(`${p}: duplicate id "${s.id}"`);
      ids.add(s.id);
    }
    const cats = ['developer-tools', 'data', 'web', 'productivity', 'ai', 'communication', 'storage', 'other'];
    if (s.category && !cats.includes(s.category)) errors.push(`${p}: unknown category "${s.category}"`);
    const rts = ['npx', 'pip', 'cargo', 'git', 'docker', 'binary'];
    if (s.runtime && !rts.includes(s.runtime)) errors.push(`${p}: unknown runtime "${s.runtime}"`);
    if (s.args && !Array.isArray(s.args)) errors.push(`${p}: args must be array`);
    if (s.tags && (!Array.isArray(s.tags) || new Set(s.tags).size !== s.tags.length)) errors.push(`${p}: tags must be unique array`);
    if (s.env && typeof s.env !== 'object') errors.push(`${p}: env must be object`);
    if (s.env) for (const [k, v] of Object.entries(s.env)) {
      if (!v || typeof v.description !== 'string') errors.push(`${p}.env.${k}: missing description`);
    }
    if (s.homepage) { try { new URL(s.homepage); } catch { errors.push(`${p}: invalid homepage URL`); } }
  });
  return errors;
}
