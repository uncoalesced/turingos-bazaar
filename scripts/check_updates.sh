#!/usr/bin/env bash
# Engineered by uncoalesced
# scripts/check_updates.sh — Monitor upstream releases for Bazaar entries and update manifests
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPDATED_COUNT=0
SUMMARY_FILE="${ROOT}/update_summary.md"
rm -f "$SUMMARY_FILE"

echo "==> Checking upstream releases for Bazaar catalog entries..."

for entry_file in "${ROOT}"/entries/*/*.json; do
    [[ -f "$entry_file" ]] || continue

    id=$(jq -r '.id' "$entry_file")
    runtime=$(jq -r '.install.runtime // empty' "$entry_file")
    package=$(jq -r '.install.package // empty' "$entry_file")
    current_version=$(jq -r '.version // .install.version // empty' "$entry_file")

    if [[ "$runtime" == "npx" && -n "$package" ]]; then
        echo "→ Checking $id ($package)..."
        npm_info=$(npm view "$package" version dist.tarball --json 2>/dev/null || echo "{}")
        latest_version=$(jq -r '.version // empty' <<< "$npm_info")
        tarball_url=$(jq -r '."dist.tarball" // empty' <<< "$npm_info")

        if [[ -z "$latest_version" || -z "$tarball_url" ]]; then
            echo "  [SKIP] Could not fetch npm metadata for $package"
            continue
        fi

        if [[ "$latest_version" != "$current_version" ]]; then
            echo "  [UPDATE FOUND] $id: $current_version -> $latest_version"
            tmp_tarball="$(mktemp)"
            if curl --silent --fail --location "$tarball_url" -o "$tmp_tarball"; then
                new_sha256=$(sha256sum "$tmp_tarball" | awk '{print $1}')
                rm -f "$tmp_tarball"

                updated_json=$(jq \
                    --arg ver "$latest_version" \
                    --arg hash "$new_sha256" \
                    '.version = $ver | .install.version = $ver | .install.sha256 = $hash' \
                    "$entry_file")
                echo "$updated_json" > "$entry_file"

                UPDATED_COUNT=$(( UPDATED_COUNT + 1 ))
                echo "- **${id}**: bumped \`${current_version}\` -> \`${latest_version}\` (SHA-256: \`${new_sha256:0:16}...\`)" >> "$SUMMARY_FILE"
                echo "  ✓ Updated $entry_file"
            else
                rm -f "$tmp_tarball" 2>/dev/null || true
                echo "  [WARN] Failed to download tarball for $package@$latest_version"
            fi
        else
            echo "  [UP-TO-DATE] $id is on latest release ($current_version)"
        fi
    fi
done

if (( UPDATED_COUNT > 0 )); then
    echo "==> Recompiling index after $UPDATED_COUNT updates..."
    "${ROOT}/scripts/build_index.sh"
    if [[ -x "${ROOT}/scripts/sign_index.sh" ]]; then
        "${ROOT}/scripts/sign_index.sh" || true
    fi
    echo "==> Done. $UPDATED_COUNT entries updated."
else
    echo "==> All entries are up to date."
fi
