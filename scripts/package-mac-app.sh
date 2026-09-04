#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=$(node -p "require('$project_dir/package.json').version")
work_dir=$(mktemp -d -t beepster-mac-release)
stage="$work_dir/disk"
app="$stage/Beepster Connector.app"
dmg="$project_dir/dist/Beepster-Connector-$version.dmg"
previous_dmg="$work_dir/previous.dmg"
cleanup() {
  if [ -f "$previous_dmg" ] && [ ! -f "$dmg" ]; then mv "$previous_dmg" "$dmg"; fi
  rm -rf "$work_dir"
}
trap cleanup EXIT
mkdir -p "$stage" "$project_dir/dist"
if [ -f "$dmg" ]; then mv "$dmg" "$previous_dmg"; fi

BEEPSTER_CONNECTOR_APP_DESTINATION="$app" \
BEEPSTER_CONNECTOR_ARCHES='arm64 x86_64' \
  "$project_dir/scripts/install-connector-app.sh"
test -x "$app/Contents/MacOS/beepster-connector"
test -x "$app/Contents/Resources/beepster-keychain"
test -x "$app/Contents/Resources/Beepster Contacts.app/Contents/MacOS/beepster-contacts"
test -x "$app/Contents/Resources/node-arm64"
test -x "$app/Contents/Resources/node-x64"
test -f "$app/Contents/Resources/Beepster-LICENSE.txt"
test -f "$app/Contents/Resources/Node-LICENSE.txt"
test -f "$app/Contents/Resources/gateway/src/cli.js"
test -f "$app/Contents/Resources/gateway/assets/emoji/emoji-catalog.json"
test -f "$app/Contents/Resources/gateway/assets/emoji/emoji-atlas-24.png"
test -f "$app/Contents/Resources/gateway/assets/emoji/emoji-atlas-24.raw"
file "$app/Contents/MacOS/beepster-connector" | rg -q 'arm64.*x86_64|x86_64.*arm64'
file "$app/Contents/Resources/node-arm64" | rg -q 'arm64'
file "$app/Contents/Resources/node-x64" | rg -q 'x86_64'
if rg -a -n 'https://[A-Za-z0-9.-]+\.ts\.net' "$app/Contents/Resources/gateway"; then
  echo 'Private Tailscale address found in Connector resources.' >&2
  exit 1
fi
if rg -a -l '/Users/|/home/' \
  "$app/Contents/MacOS/beepster-connector" \
  "$app/Contents/Resources/beepster-keychain" \
  "$app/Contents/Resources/Beepster Contacts.app/Contents/MacOS/beepster-contacts"; then
  echo 'Absolute local filesystem path found in Connector executables.' >&2
  exit 1
fi
codesign --verify --deep --strict "$app"
ln -s /Applications "$stage/Applications"
hdiutil create -quiet -volname "Beepster Connector" -srcfolder "$stage" -ov -format UDZO "$dmg"

if [ -n "${BEEPSTER_NOTARY_PROFILE:-}" ]; then
  if [ -z "${BEEPSTER_CODESIGN_IDENTITY:-}" ]; then
    echo 'BEEPSTER_CODESIGN_IDENTITY is required when notarizing a release.' >&2
    exit 1
  fi
  codesign --force --timestamp --sign "$BEEPSTER_CODESIGN_IDENTITY" "$dmg"
  xcrun notarytool submit "$dmg" --keychain-profile "$BEEPSTER_NOTARY_PROFILE" --wait
  xcrun stapler staple "$dmg"
  xcrun stapler validate "$dmg"
else
  echo 'Development DMG created without Apple notarization; do not publish it.' >&2
fi

(
  cd "$(dirname "$dmg")"
  shasum -a 256 "$(basename "$dmg")" > "$(basename "$dmg").sha256"
)
echo "$dmg"
cat "$dmg.sha256"
