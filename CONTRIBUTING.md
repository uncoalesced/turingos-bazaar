# turingos-bazaar contribution guide

## Adding a server

1. Edit `registry/registry.json` and append an entry to `servers`.
2. Follow the schema in `registry/schema.json`.
3. Run `npm run validate` and `npm test`.
4. Open a PR. CI validates the registry.

### Entry requirements

- `id` must be lowercase kebab-case and unique.
- `verified: true` only for servers you have run end-to-end.
- Provide `env` metadata for every required secret.
- Use `${VAR}` placeholders in `args` for runtime substitution (e.g. `${HOME}`).

## Development

```bash
npm install   # (no runtime deps; dev only)
npm test
npm run lint
npm run validate
npm run build:web
node bin/mcp-bazaar
```
