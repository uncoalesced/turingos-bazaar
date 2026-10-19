// src/runtimes.js — runtime install helpers
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ui } from './ui.js';

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: opts.stdio || 'pipe', encoding: 'utf8', ...opts });
}

export function hasCommand(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'pipe' });
  return r.status === 0;
}

export function checkRuntime(server) {
  switch (server.runtime) {
    case 'npx':
      if (!hasCommand('npm')) return 'npm not found (install Node.js)';
      return null;
    case 'pip':
      if (!hasCommand('pipx') && !hasCommand('pip3') && !hasCommand('python3')) return 'python3/pipx not found';
      return null;
    case 'cargo':
      if (!hasCommand('cargo')) return 'cargo not found';
      return null;
    case 'git':
      if (!hasCommand('git')) return 'git not found';
      return null;
    case 'docker':
      if (!hasCommand('docker')) return 'docker not found';
      return null;
    case 'binary':
      return null;
    default:
      return `unknown runtime ${server.runtime}`;
  }
}

export function installRuntime(server, installDir, opts = {}) {
  mkdirSync(installDir, { recursive: true });
  const rt = server.runtime;
  if (rt === 'npx') {
    // verify package resolvable (best-effort, non-fatal)
    if (server.package && hasCommand('npm')) {
      ui.info(`Checking npm package: ${server.package}`);
      const r = run('npm', ['view', server.package, 'version']);
      if (r.status !== 0) ui.warn(`Could not verify package ${server.package} (continuing)`);
      else ui.ok(`npm package found: ${server.package}`);
    }
    // write launcher
    const launcher = `#!/usr/bin/env bash\nexec npx -y ${shellQuote(server.package || server.command)} "$@"\n`;
    writeFileSync(join(installDir, 'run.sh'), launcher, { mode: 0o755 });
    chmodSync(join(installDir, 'run.sh'), 0o755);
    return true;
  }
  if (rt === 'pip') {
    const pkg = server.package;
    if (!pkg) return true;
    if (hasCommand('pipx')) {
      ui.info(`Installing with pipx: ${pkg}`);
      const r = run('pipx', ['install', '--force', pkg], { stdio: 'inherit' });
      if (r.status !== 0) { ui.warn('pipx install failed'); return false; }
      return true;
    }
    ui.warn('pipx not found; skipping local install (registration still works)');
    return true;
  }
  if (rt === 'cargo') {
    const pkg = server.package;
    if (!pkg) return true;
    if (!hasCommand('cargo')) return false;
    ui.info(`Installing cargo package: ${pkg}`);
    const r = run('cargo', ['install', pkg], { stdio: 'inherit' });
    return r.status === 0;
  }
  if (rt === 'git') {
    if (!server.repository) { ui.warn('No repository defined'); return true; }
    const cloneDir = join(installDir, 'source');
    const repoUrl = server.repository.includes('://') ? server.repository : `https://github.com/${server.repository}.git`;
    ui.info(`Cloning: ${repoUrl}`);
    if (existsSync(cloneDir)) {
      const r = run('git', ['-C', cloneDir, 'pull', '--quiet']);
      if (r.status !== 0) return false;
    } else {
      const r = run('git', ['clone', '--depth=1', '--quiet', repoUrl, cloneDir]);
      if (r.status !== 0) { ui.fail(`Clone failed: ${r.stderr}`); return false; }
    }
    // auto-build
    const dir = server.subdir ? join(cloneDir, server.subdir) : cloneDir;
    if (existsSync(join(dir, 'package.json'))) {
      ui.info('Running npm install...');
      run('npm', ['install', '--prefix', dir, '--silent'], { stdio: 'inherit' });
    } else if (existsSync(join(dir, 'requirements.txt'))) {
      ui.info('Creating venv...');
      run('python3', ['-m', 'venv', join(dir, '.venv')]);
      run(join(dir, '.venv', 'bin', 'pip'), ['install', '--quiet', '-r', join(dir, 'requirements.txt')]);
    } else if (existsSync(join(dir, 'Cargo.toml'))) {
      ui.info('Running cargo build --release...');
      run('cargo', ['build', '--release', '--manifest-path', join(dir, 'Cargo.toml')]);
    }
    ui.ok(`Cloned: ${server.repository}`);
    return true;
  }
  if (rt === 'docker') {
    ui.info('Docker runtime: registration only (run the image yourself).');
    return true;
  }
  if (rt === 'binary') {
    return true;
  }
  return true;
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

export function buildMcpEntry(server, envValues = {}) {
  // expand ${VAR} in args
  const envRequired = Object.keys(server.env || {}).filter((k) => server.env[k].required);
  const args = (server.args || []).map((a) => {
    let out = a;
    for (const v of ['HOME', ...envRequired]) {
      const pat = '${' + v + '}';
      if (out.includes(pat)) out = out.replaceAll(pat, process.env[v] || envValues[v] || '');
    }
    // also expand any env var present
    out = out.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_, name) => process.env[name] || envValues[name] || '');
    return out;
  });
  const env = {};
  for (const [k, meta] of Object.entries(server.env || {})) {
    const val = envValues[k] || process.env[k];
    if (val) env[k] = val;
  }
  const entry = { type: 'stdio', command: server.command, args };
  if (Object.keys(env).length) entry.env = env;
  return entry;
}
