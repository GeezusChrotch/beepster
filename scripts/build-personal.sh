#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then echo "usage: $0 https://private-host:port/configure" >&2; exit 64; fi
settings_url=$1
case "$settings_url" in https://*/configure) ;; *) echo "settings URL must use private HTTPS and end in /configure" >&2; exit 64;; esac
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$project_dir/local"
temp_dir=$(mktemp -d "$project_dir/local/.buildtmp.XXXXXX")
trap 'rm -rf "$temp_dir"' EXIT
rsync -a --exclude .git --exclude build --exclude local --exclude backups --exclude '.lock-waf_*' "$project_dir/" "$temp_dir/"
BEEPSTER_SETTINGS_URL="$settings_url" perl -0pi -e 's/var DEFAULT_SETTINGS_URL = '\''\'';/"var DEFAULT_SETTINGS_URL = '\''" . $ENV{BEEPSTER_SETTINGS_URL} . "'\'';"/e' "$temp_dir/src/pkjs/index.js"
(cd "$temp_dir" && pebble build >/dev/null)
pbw_path=$(find "$temp_dir/build" -maxdepth 1 -type f -name '*.pbw' -print -quit)
if [ -z "$pbw_path" ] || [ ! -f "$pbw_path" ]; then echo "personal PBW was not produced" >&2; exit 1; fi
cp "$pbw_path" "$project_dir/local/beepster-personal.pbw"
echo "$project_dir/local/beepster-personal.pbw"
