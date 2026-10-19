#!/usr/bin/env node
import { loadRegistry, validateRegistry } from '../src/registry.js';

const data = loadRegistry();
const errs = validateRegistry(data);
if (errs.length) {
  console.error(`✗ ${errs.length} validation error(s):`);
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ Registry valid: ${data.servers.length} servers`);
