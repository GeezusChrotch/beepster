#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app_dir="$HOME/Applications/Beepster Connector.app"
executable="$app_dir/Contents/MacOS/beepster-connector"
icon_source="$project_dir/assets/brand/beepster-mark-512.png"
icon_work=$(mktemp -d -t beepster-icon)
trap 'rm -rf "$icon_work"' EXIT

mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources" "$icon_work/Beepster.iconset"
cp "$project_dir/mac/BeepsterConnector-Info.plist" "$app_dir/Contents/Info.plist"
for icon_size in 16 32 128 256 512; do
  sips -z "$icon_size" "$icon_size" "$icon_source" --out "$icon_work/Beepster.iconset/icon_${icon_size}x${icon_size}.png" >/dev/null
  double_size=$((icon_size * 2))
  sips -z "$double_size" "$double_size" "$icon_source" --out "$icon_work/Beepster.iconset/icon_${icon_size}x${icon_size}@2x.png" >/dev/null
done
iconutil -c icns "$icon_work/Beepster.iconset" -o "$app_dir/Contents/Resources/Beepster.icns"
swiftc -target "$(uname -m)-apple-macosx13.0" -framework AppKit \
  "$project_dir/mac/BeepsterConnector.swift" -o "$executable"
codesign --force --deep --sign - --identifier org.beepster.connector "$app_dir" >/dev/null
echo "Installed Beepster Connector in $HOME/Applications."
