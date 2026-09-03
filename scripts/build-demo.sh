#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$project_dir/local"
temp_dir=$(mktemp -d "$project_dir/local/.demobuild.XXXXXX")
trap 'rm -rf "$temp_dir"' EXIT
rsync -a --exclude .git --exclude build --exclude dist --exclude local --exclude backups --exclude '.lock-waf_*' "$project_dir/" "$temp_dir/"
perl -0pi -e 's/var DEMO_MODE = false;/var DEMO_MODE = true;/' "$temp_dir/src/pkjs/index.js"
rg -F 'var DEMO_MODE = true;' "$temp_dir/src/pkjs/index.js" >/dev/null
(cd "$temp_dir" && pebble build >/dev/null)
pbw_path=$(find "$temp_dir/build" -maxdepth 1 -type f -name '*.pbw' -print -quit)
test -n "$pbw_path"
cp "$pbw_path" "$project_dir/local/beepster-demo.pbw"
printf '%s\n' "$project_dir/local/beepster-demo.pbw"
