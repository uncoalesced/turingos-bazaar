#!/usr/bin/env bash
# Engineered by uncoalesced
# scripts/build_index.sh — Compiles TuringOS Bazaar catalog entries into v1/index.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/dist/v1"
OUTPUT_INDEX="${DIST_DIR}/index.json"

mkdir -p "$DIST_DIR"

echo "==> Compiling Bazaar catalog index..."

if command -v jq &>/dev/null; then
    # Standard Linux / CI execution using pure bash + jq
    ENTRIES_JSON="{}"
    COUNT=0

    while IFS= read -r entry_file; do
        [[ -f "$entry_file" ]] || continue

        if ! jq empty "$entry_file" 2>/dev/null; then
            echo "ERROR: Malformed JSON in $entry_file" >&2
            exit 1
        fi

        key=$(jq -r '.id // empty' "$entry_file")
        type=$(jq -r '.type // empty' "$entry_file")
        name=$(jq -r '.name // empty' "$entry_file")
        version=$(jq -r '.version // empty' "$entry_file")
        runtime=$(jq -r '.install.runtime // empty' "$entry_file")
        sha256=$(jq -r '.install.sha256 // empty' "$entry_file")

        if [[ -z "$key" || -z "$type" || -z "$name" || -z "$version" || -z "$runtime" || -z "$sha256" ]]; then
            echo "ERROR: Missing required fields in $entry_file" >&2
            exit 1
        fi

        if [[ ! "$sha256" =~ ^[a-f0-9]{64}$ ]]; then
            echo "ERROR: Invalid SHA-256 hash in $entry_file: $sha256" >&2
            exit 1
        fi

        ENTRIES_JSON=$(jq --arg k "$key" --slurpfile doc "$entry_file" \
            '.[$k] = $doc[0]' <<< "$ENTRIES_JSON")
        
        COUNT=$((COUNT + 1))
        echo "  [OK] ($type) $key @ $version"
    done < <(find "${REPO_ROOT}/entries" -mindepth 2 -maxdepth 2 -name "*.json" | sort)

    GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    jq -n \
        --arg gen "$GENERATED_AT" \
        --argjson entries "$ENTRIES_JSON" \
        '{
            version: 1,
            generated_at: $gen,
            entries: $entries
        }' > "$OUTPUT_INDEX"

elif command -v node &>/dev/null; then
    # Node fallback for dev environments where jq is not installed
    export REPO_ROOT="${REPO_ROOT}"
    export DIST_DIR="${DIST_DIR}"
    export OUTPUT_INDEX="${OUTPUT_INDEX}"
    node - <<'EOF'
const fs = require('fs');
const path = require('path');

const repoRoot = process.env.REPO_ROOT;
const distDir = process.env.DIST_DIR;
const outputIndex = process.env.OUTPUT_INDEX;
const entriesDir = path.join(repoRoot, 'entries');

const entries = {};
let count = 0;

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            walk(full);
        } else if (item.isFile() && item.name.endsWith('.json')) {
            const raw = fs.readFileSync(full, 'utf8');
            const data = JSON.parse(raw);
            const key = data.id;
            const type = data.type;
            const name = data.name;
            const version = data.version;
            const install = data.install || {};
            const runtime = install.runtime;
            const sha256 = install.sha256;

            if (!key || !type || !name || !version || !runtime || !sha256) {
                console.error(`ERROR: Missing required fields in ${full}`);
                process.exit(1);
            }
            if (!/^[a-f0-9]{64}$/.test(sha256)) {
                console.error(`ERROR: Invalid SHA-256 hash in ${full}: ${sha256}`);
                process.exit(1);
            }
            entries[key] = data;
            count++;
            console.log(`  [OK] (${type}) ${key} @ ${version}`);
        }
    }
}

walk(entriesDir);

const index = {
    version: 1,
    generated_at: new Date().toISOString(),
    entries: entries
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputIndex, JSON.stringify(index, null, 2), 'utf8');
EOF

else
    echo "ERROR: Neither jq nor node found to build bazaar index." >&2
    exit 1
fi

mkdir -p "${REPO_ROOT}/v1"
cp -f "$OUTPUT_INDEX" "${REPO_ROOT}/v1/index.json"

echo "==> Index successfully built:"
echo "    - $OUTPUT_INDEX"
echo "    - ${REPO_ROOT}/v1/index.json"
