// src/clients.js — MCP client detection + config read/write
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';

const HOME = homedir();
const isWin = platform() === 'win32';
const appData = process.env.APPDATA || join(HOME, 'AppData', 'Roaming');
const localAppData = process.env.LOCALAPPDATA || join(HOME, 'AppData', 'Local');

// Config file location per client. `format` describes the mcpServers container key.
export const CLIENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    configPath: () => join(HOME, '.claude.json'),
    serversKey: 'mcpServers',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configPath: () => join(HOME, '.cursor', 'mcp.json'),
    serversKey: 'mcpServers',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configPath: () => join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
    serversKey: 'mcpServers',
  },
  {
    id: 'continue',
    name: 'Continue',
    configPath: () => join(HOME, '.continue', 'config.json'),
    serversKey: 'mcpServers',
  },
  {
    id: 'cline',
    name: 'Cline',
    configPath: () => {
      // VS Code globalStorage (user-level) for the Cline extension
      const base = isWin ? join(appData, 'Code', 'User', 'globalStorage')
        : platform() === 'darwin' ? join(HOME, 'Library', 'Application Support', 'Code', 'User', 'globalStorage')
        : join(HOME, '.config', 'Code', 'User', 'globalStorage');
      return join(base, 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
    },
    serversKey: 'mcpServers',
  },
];

export function clientById(id) {
  return CLIENTS.find((c) => c.id === id) || null;
}

export function clientConfigPath(client) {
  return typeof client.configPath === 'function' ? client.configPath() : client.configPath;
}

export function isClientInstalled(client) {
  // "installed" = config file exists OR parent dir exists (client present)
  const p = clientConfigPath(client);
  if (existsSync(p)) return true;
  // heuristic: parent of config exists
  try { return existsSync(dirname(p)) && statSync(dirname(p)).isDirectory(); } catch { return false; }
}

export function detectedClients() {
  return CLIENTS.filter((c) => isClientInstalled(c));
}

export function readClientConfig(client) {
  const p = clientConfigPath(client);
  if (!existsSync(p)) return {};
  try {
    const raw = readFileSync(p, 'utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function atomicWrite(p, content) {
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, content, { mode: 0o600 });
  renameSync(tmp, p);
  try { chmodSafe(p); } catch {}
}

function chmodSafe(p) {
  // best-effort
}

export function writeClientConfig(client, config) {
  const p = clientConfigPath(client);
  atomicWrite(p, JSON.stringify(config, null, 2) + '\n');
  return p;
}

export function getClientServers(client) {
  const cfg = readClientConfig(client);
  return (cfg && typeof cfg[client.serversKey] === 'object' && cfg[client.serversKey]) || {};
}

export function setClientServer(client, id, entry) {
  const cfg = readClientConfig(client);
  if (!cfg || typeof cfg !== 'object') throw new Error('invalid config');
  if (!cfg[client.serversKey] || typeof cfg[client.serversKey] !== 'object') cfg[client.serversKey] = {};
  cfg[client.serversKey][id] = entry;
  writeClientConfig(client, cfg);
}

export function removeClientServer(client, id) {
  const cfg = readClientConfig(client);
  if (cfg && cfg[client.serversKey] && typeof cfg[client.serversKey] === 'object') {
    delete cfg[client.serversKey][id];
    writeClientConfig(client, cfg);
  }
}

export function hasClientServer(client, id) {
  return Object.prototype.hasOwnProperty.call(getClientServers(client), id);
}
