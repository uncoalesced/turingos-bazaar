#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(root, 'web'), { recursive: true });
copyFileSync(join(root, 'registry', 'registry.json'), join(root, 'web', 'registry.json'));
console.log('Copied registry/registry.json -> web/registry.json');
