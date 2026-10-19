// src/install.js — install + register orchestration
import { ui, confirm } from './ui.js';
import { getServer } from './registry.js';
import { checkRuntime, installRuntime, buildMcpEntry } from './runtimes.js';
import { detectedClients, clientById, clientConfigPath, setClientServer, removeClientServer, hasClientServer } from './clients.js';
import { markInstalled, markUninstalled, isInstalled, stateDir } from './state.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function resolveTargets(opts) {
  if (opts.allClients) return detectedClients();
  if (opts.client) {
    const c = clientById(opts.client);
    if (!c) { ui.fail(`Unknown client: ${opts.client}`); return null; }
    return [c];
  }
  // default: all detected; if none detected, claude-code
  const det = detectedClients();
  if (det.length === 0) {
    const cc = clientById('claude-code');
    return [cc];
  }
  return det;
}

export async function install(id, opts = {}) {
  const server = getServer(id);
  if (!server) { ui.fail(`Unknown server: ${id}`); return false; }
  ui.header(`Installing: ${server.name}`);

  // env check
  const missing = [];
  for (const [k, meta] of Object.entries(server.env || {})) {
    if (meta.required && !process.env[k]) missing.push(k);
  }
  if (missing.length) {
    ui.warn('Missing required environment variables:');
    for (const k of missing) console.log(`    ${k}  (not set)`);
    console.log('');
    ui.info(`Add them to ${join(process.env.HOME || '', '.mcp-bazaar', 'env')} or export them.`);
    if (!opts.yes) {
      const ok = confirm('Continue install anyway?');
      if (!ok) { ui.info('Aborted.'); return false; }
    }
  }

  const targets = resolveTargets(opts);
  if (!targets) return false;

  // runtime check
  const rtErr = checkRuntime(server);
  if (rtErr) { ui.warn(rtErr); if (!opts.yes && !confirm('Continue anyway?')) return false; }

  const installDir = join(stateDir(), 'servers', id);
  if (!opts.dryRun) mkdirSync(installDir, { recursive: true });

  const envValues = {};

  // runtime install
  ui.info(`Runtime: ${server.runtime}`);
  if (!opts.dryRun) {
    const ok = installRuntime(server, installDir, opts);
    if (!ok) { ui.fail(`Installation failed for: ${id}`); return false; }
  }

  // build entry
  const entry = buildMcpEntry(server, envValues);

  // register
  for (const client of targets) {
    if (opts.dryRun) {
      ui.info(`[dry-run] would register ${id} in ${client.name} (${clientConfigPath(client)})`);
      continue;
    }
    try {
      setClientServer(client, id, entry);
      ui.ok(`Registered in ${client.name}: ${clientConfigPath(client)}`);
    } catch (e) {
      ui.fail(`Failed to register in ${client.name}: ${e.message}`);
    }
  }

  if (!opts.dryRun) {
    markInstalled(id, { name: server.name, runtime: server.runtime, clients: targets.map((c) => c.id) });
    ui.ok(`${server.name} installed`);
  } else {
    ui.info('[dry-run] install state not recorded');
  }
  console.log('');
  ui.info('New sessions pick it up automatically.');
  return true;
}

export async function uninstall(id, opts = {}) {
  const server = getServer(id);
  const name = server ? server.name : id;
  const targets = opts.allClients ? detectedClients() : (opts.client ? [clientById(opts.client)].filter(Boolean) : detectedClients());
  // also handle clients where it exists
  const allClients = detectedClients();
  const toClean = (opts.client || opts.allClients) ? targets : allClients;

  ui.header(`Uninstalling: ${name}`);
  for (const client of toClean) {
    if (hasClientServer(client, id)) {
      if (opts.dryRun) { ui.info(`[dry-run] would remove ${id} from ${client.name}`); continue; }
      removeClientServer(client, id);
      ui.ok(`Removed from ${client.name}`);
    }
  }
  if (!opts.dryRun) {
    markUninstalled(id);
    ui.ok(`${name} uninstalled`);
  }
  return true;
}
