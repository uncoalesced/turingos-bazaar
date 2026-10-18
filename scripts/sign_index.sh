#!/usr/bin/env bash
# Engineered by uncoalesced
# scripts/sign_index.sh — Sign compiled Bazaar index with Ed25519 private key
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_FILE="${ROOT}/dist/v1/index.json"
SIG_FILE="${ROOT}/dist/v1/index.json.sig"
KEY_FILE="${ROOT}/keys/bazaar.key"
PUB_FILE="${ROOT}/keys/bazaar.pub"

if [[ ! -f "$INDEX_FILE" ]]; then
    echo "ERROR: $INDEX_FILE not found. Run scripts/build_index.sh first." >&2
    exit 1
fi

TMP_KEY=""
trap '[[ -n "$TMP_KEY" && -f "$TMP_KEY" ]] && rm -f "$TMP_KEY"' EXIT

if [[ -n "${BAZAAR_SIGNING_KEY:-}" ]]; then
    TMP_KEY="$(mktemp)"
    chmod 600 "$TMP_KEY"
    echo "$BAZAAR_SIGNING_KEY" > "$TMP_KEY"
    KEY_FILE="$TMP_KEY"
fi

if [[ ! -f "$KEY_FILE" ]]; then
    echo "WARN: No signing key found at $KEY_FILE and BAZAAR_SIGNING_KEY not set. Skipping signature." >&2
    exit 0
fi

echo "→ Signing $INDEX_FILE with Ed25519..."
openssl pkeyutl -sign -inkey "$KEY_FILE" -rawin -in "$INDEX_FILE" -out "$SIG_FILE"
mkdir -p "${ROOT}/v1"
cp "$SIG_FILE" "${ROOT}/v1/index.json.sig"

if [[ -f "$PUB_FILE" ]]; then
    openssl pkeyutl -verify -pubin -inkey "$PUB_FILE" -rawin -in "$INDEX_FILE" -sigfile "$SIG_FILE" >/dev/null
    echo "✓ Signature verified against $PUB_FILE"
fi

echo "✓ Created detached signature: $SIG_FILE and ${ROOT}/v1/index.json.sig"
