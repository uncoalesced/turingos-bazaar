#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(root, 'web'), { recursive: true });
copyFileSync(join(root, 'registry', 'registry.json'), join(root, 'web', 'registry.json'));
console.log('Copied registry/registry.json -> web/registry.json');

// The OS fetches /v1/index.json and its detached /v1/index.json.sig from the
// published site and refuses an unsigned index, so both must be deployed.
const v1 = join(root, 'v1');
const webV1 = join(root, 'web', 'v1');
const files = ['index.json', 'index.json.sig'];
for (const f of files) {
  if (!existsSync(join(v1, f))) {
    console.error(`build-web: missing v1/${f}; run the index build + sign scripts first`);
    process.exit(1);
  }
}
mkdirSync(webV1, { recursive: true });
for (const f of files) {
  copyFileSync(join(v1, f), join(webV1, f));
  console.log(`Copied v1/${f} -> web/v1/${f}`);
}
