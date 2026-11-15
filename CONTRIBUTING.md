# Contributing to the TuringOS Bazaar

## Adding a server

There are two catalogues (see the README). A new server normally goes in both.

1. **Registry** (CLI and web): append an entry to `servers` in `registry/registry.json`,
   following `registry/schema.json`.
2. **Signed index** (TuringOS): add `entries/mcp/<id>-mcp.json`, following
   `schema/bazaar-entry.schema.json`. Pin the upstream `version` and set `install.sha256`
   to the SHA-256 of the release archive.
3. Run `npm run validate` and `npm test`.
4. Rebuild the index: `./scripts/build_index.sh`. A maintainer signs it; do not commit
   `v1/index.json.sig` from a fork.
5. Open a PR. CI validates the registry, builds the index and runs the tests.

### Entry requirements

- `id` is lowercase kebab-case and unique.
- `verified: true` only for servers you have run end to end.
- List every required secret (`env` in the registry, `env_required` in the signed entry).
- Use `${VAR}` placeholders in `args` for runtime substitution, for example `${HOME}`.
- Set `requires.turingos` only if the server needs a newer TuringOS than 1.3.

## Development

```bash
npm install   # no runtime dependencies; dev only
npm test
npm run lint
npm run validate
npm run build:web
node bin/mcp-bazaar
```

## The web catalogue

`web/` is static. It uses the TuringOS design language: `web/tokens.css` is a copy of
`assets/design-language/tokens.css` from the TuringOS repo, and the Timeless fonts are
bundled under `web/fonts/`. Keep new styles on those tokens; do not add new hues.
