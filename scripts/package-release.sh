#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=$(node -p "require('$project_dir/package.json').version")
case "$version" in
  *.*.0) ;;
  *) echo 'Pebble Store releases must use a major.minor.0 version' >&2; exit 1 ;;
esac

cd "$project_dir"
npm run check

test "$(sips -g pixelWidth resources/images/beepster-menu-icon.png | awk '/pixelWidth/{print $2}')" = 25
test "$(sips -g pixelHeight resources/images/beepster-menu-icon.png | awk '/pixelHeight/{print $2}')" = 25
unzip -p build/beepster.pbw pebble-js-app.js | rg -F 'https://geezuschrotch.github.io/beepster/setup/' >/dev/null
if unzip -p build/beepster.pbw | rg -a -n 'BEEPER_ACCESS_TOKEN|BEEPSTER_GATEWAY_TOKEN|\.ts\.net' >/dev/null; then
  echo 'Release bundle contains a credential marker or private tailnet address' >&2
  exit 1
fi

mkdir -p dist
artifact="dist/beepster-$version.pbw"
cp build/beepster.pbw "$artifact"
shasum -a 256 "$artifact" > dist/SHA256SUMS
printf '%s\n' "$artifact"
cat dist/SHA256SUMS
