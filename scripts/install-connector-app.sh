#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app_dir=${BEEPSTER_CONNECTOR_APP_DESTINATION:-"$HOME/Applications/Beepster Connector.app"}
build_arches=${BEEPSTER_CONNECTOR_ARCHES:-"$(uname -m)"}
node_version=${BEEPSTER_NODE_VERSION:-v24.15.0}
sign_identity=${BEEPSTER_CODESIGN_IDENTITY:--}
work_dir=$(mktemp -d -t beepster-connector-build)
trap 'rm -rf "$work_dir"' EXIT
staged_app="$work_dir/Beepster Connector.app"
resources="$staged_app/Contents/Resources"
executable="$staged_app/Contents/MacOS/beepster-connector"
icon_source="$project_dir/assets/brand/beepster-mark-512.png"

mkdir -p "$staged_app/Contents/MacOS" "$resources" "$work_dir/Beepster.iconset"
cp "$project_dir/mac/BeepsterConnector-Info.plist" "$staged_app/Contents/Info.plist"
cp -R "$project_dir/gateway" "$resources/gateway"
cp "$project_dir/LICENSE" "$resources/Beepster-LICENSE.txt"

build_swift() {
  source_file=$1
  frameworks=$2
  output_file=$3
  slices=''
  for build_arch in $build_arches; do
    slice="$work_dir/$(basename "$output_file").$build_arch"
    framework_flags=''
    for framework in $frameworks; do framework_flags="$framework_flags -framework $framework"; done
    # shellcheck disable=SC2086
    swiftc -target "$build_arch-apple-macosx13.0" $framework_flags "$source_file" -o "$slice"
    slices="$slices $slice"
  done
  if [ "$(printf '%s\n' $build_arches | wc -l | tr -d ' ')" -gt 1 ]; then
    # shellcheck disable=SC2086
    /usr/bin/lipo -create -output "$output_file" $slices
  else
    # shellcheck disable=SC2086
    cp $slices "$output_file"
  fi
}

node_runtime() {
  requested_arch=$1
  runtime_arch=$requested_arch
  expected_file=$requested_arch
  case "$requested_arch" in
    arm64) ;;
    x86_64|x64) runtime_arch=x64; expected_file=x86_64 ;;
    *) echo "Unsupported Mac architecture: $requested_arch" >&2; exit 1 ;;
  esac
  output_file="$resources/node-$runtime_arch"
  local_node=$(command -v node 2>/dev/null || true)
  if [ -n "$local_node" ] && [ "$(uname -m)" = "$expected_file" ] && file "$local_node" | rg -q "$expected_file"; then
    cp -c "$local_node" "$output_file" 2>/dev/null || cp "$local_node" "$output_file"
    local_license=$(CDPATH= cd -- "$(dirname "$local_node")/.." 2>/dev/null && pwd)/LICENSE
    versioned_license="/usr/local/n/versions/node/$(node -p 'process.versions.node')/LICENSE"
    if [ -f "$local_license" ]; then cp "$local_license" "$resources/Node-LICENSE.txt"
    elif [ -f "$versioned_license" ]; then cp "$versioned_license" "$resources/Node-LICENSE.txt"
    fi
    return
  fi
  archive="node-$node_version-darwin-$runtime_arch.tar.xz"
  archive_path="$work_dir/$archive"
  sums_path="$work_dir/SHASUMS256.txt"
  curl -fsS "https://nodejs.org/dist/$node_version/SHASUMS256.txt" -o "$sums_path"
  curl -fsS "https://nodejs.org/dist/$node_version/$archive" -o "$archive_path"
  expected=$(awk -v name="$archive" '$2 == name {print $1}' "$sums_path")
  actual=$(shasum -a 256 "$archive_path" | awk '{print $1}')
  [ -n "$expected" ] && [ "$actual" = "$expected" ] || { echo "Node runtime checksum failed for $archive" >&2; exit 1; }
  tar -xf "$archive_path" -C "$work_dir" \
    "node-$node_version-darwin-$runtime_arch/bin/node" \
    "node-$node_version-darwin-$runtime_arch/LICENSE"
  cp "$work_dir/node-$node_version-darwin-$runtime_arch/bin/node" "$output_file"
  cp "$work_dir/node-$node_version-darwin-$runtime_arch/LICENSE" "$resources/Node-LICENSE.txt"
}

for build_arch in $build_arches; do node_runtime "$build_arch"; done
build_swift "$project_dir/mac/BeepsterConnector.swift" 'AppKit Security' "$executable"
build_swift "$project_dir/mac/BeepsterKeychain.swift" Security "$resources/beepster-keychain"

contacts_app="$resources/Beepster Contacts.app"
mkdir -p "$contacts_app/Contents/MacOS"
cp "$project_dir/mac/BeepsterContacts-Info.plist" "$contacts_app/Contents/Info.plist"
build_swift "$project_dir/mac/BeepsterContacts.swift" 'AppKit Contacts CryptoKit' "$contacts_app/Contents/MacOS/beepster-contacts"

for icon_size in 16 32 128 256 512; do
  sips -z "$icon_size" "$icon_size" "$icon_source" --out "$work_dir/Beepster.iconset/icon_${icon_size}x${icon_size}.png" >/dev/null
  double_size=$((icon_size * 2))
  sips -z "$double_size" "$double_size" "$icon_source" --out "$work_dir/Beepster.iconset/icon_${icon_size}x${icon_size}@2x.png" >/dev/null
done
iconutil -c icns "$work_dir/Beepster.iconset" -o "$resources/Beepster.icns"

codesign --force --options runtime --entitlements "$project_dir/mac/BeepsterContacts.entitlements" \
  --sign "$sign_identity" "$contacts_app" >/dev/null
codesign --force --deep --options runtime --sign "$sign_identity" "$staged_app" >/dev/null
mkdir -p "$(dirname "$app_dir")"
previous_app="$work_dir/previous-connector.app"
if [ -e "$app_dir" ]; then mv "$app_dir" "$previous_app"; fi
if [ ! -e "$previous_app" ] && mv "$staged_app" "$app_dir"; then
  :
elif ! cp -R "$staged_app" "$app_dir"; then
  if [ -e "$previous_app" ]; then
    rm -rf "$app_dir"
    mv "$previous_app" "$app_dir"
  fi
  exit 1
fi
echo "Built Beepster Connector at $app_dir"
