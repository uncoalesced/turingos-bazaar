// src/state.js — installed-server tracking
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const STATE_DIR = process.env.MCP_BAZAAR_HOME || join(homedir(), '.mcp-bazaar');
const STATE_FILE = join(STATE_DIR, 'installed.json');

export function stateDir() { return STATE_DIR; }
export function stateFile() { return STATE_FILE; }

export function loadState() {
  if (!existsSync(STATE_FILE)) return { installed: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) || { installed: {} }; }
  catch { return { installed: {} }; }
}

export function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}

export function markInstalled(id, meta = {}) {
  const state = loadState();
  state.installed = state.installed || {};
  state.installed[id] = { ...meta, at: new Date().toISOString() };
  saveState(state);
}

export function markUninstalled(id) {
  const state = loadState();
  if (state.installed) delete state.installed[id];
  saveState(state);
}

export function isInstalled(id) {
  const state = loadState();
  return !!(state.installed && state.installed[id]);
}

export function installedIds() {
  const state = loadState();
  return Object.keys((state && state.installed) || {});
}
