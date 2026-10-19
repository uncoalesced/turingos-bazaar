// src/ui.js — terminal output helpers (zero deps)
import { readSync } from 'node:fs';

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', white: '\x1b[37m',
};
const color = (k, s) => process.stdout.isTTY ? `${c[k]}${s}${c.reset}` : s;
export const ui = {
  ok: (m) => console.log(`  ${color('green', '✓')}  ${m}`),
  fail: (m) => console.error(`  ${color('red', '✗')}  ${m}`),
  warn: (m) => console.log(`  ${color('yellow', '⚠')}  ${m}`),
  info: (m) => console.log(`  ${color('cyan', '→')}  ${m}`),
  header: (t) => {
    console.log('');
    console.log(`  ${color('cyan', '╭' + '─'.repeat(44) + '╮')}`);
    const pad = Math.max(0, Math.floor((44 - t.length) / 2));
    console.log(`  ${color('cyan', '│')}${' '.repeat(pad)}${color('bold', t)}${' '.repeat(Math.max(0, 44 - pad - t.length))}${color('cyan', '│')}`);
    console.log(`  ${color('cyan', '╰' + '─'.repeat(44) + '╯')}`);
    console.log('');
  },
  label: (k, v) => console.log(`  ${color('dim', String(k).padEnd(22))} ${v}`),
  divider: () => console.log(`  ${color('dim', '─'.repeat(44))}`),
};
export function confirm(prompt) {
  if (!process.stdin.isTTY) return false;
  process.stderr.write(`  ${color('yellow', '?')}  ${prompt} [y/N] `);
  const buf = Buffer.alloc(1);
  let r = '';
  try {
    while (true) {
      const n = readSync(0, buf, 0, 1, null);
      if (n === 0) break;
      const ch = buf.toString('utf8', 0, n);
      if (ch === '\n') break;
      r += ch;
    }
  } catch { return false; }
  return /^y/i.test(r.trim());
}
export function input(prompt, def = '') {
  if (!process.stdin.isTTY) return def;
  process.stderr.write(`  ${color('cyan', prompt)}${def ? ` [${def}]` : ''}: `);
  const buf = Buffer.alloc(1);
  let r = '';
  try {
    while (true) {
      const n = readSync(0, buf, 0, 1, null);
      if (n === 0) break;
      const ch = buf.toString('utf8', 0, n);
      if (ch === '\n') break;
      r += ch;
    }
  } catch { return def; }
  return r.trim() || def;
}
export const colorize = color;
