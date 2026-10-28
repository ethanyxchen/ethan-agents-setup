#!/bin/bash
set -euo pipefail
source="$(cd "$(dirname "$0")" && pwd)/drive.swift"
cache="${XDG_CACHE_HOME:-$HOME/.cache}/profile-mac-app"
binary="$cache/drive-$(shasum -a 256 "$source" | cut -c1-16)"
if [ ! -x "$binary" ]; then
  mkdir -p "$cache"
  swiftc -O -o "$binary" "$source" >&2
fi
echo "$binary"
