#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
support_dir="$HOME/Library/Application Support/Beepster"
bin_dir="$support_dir/bin"
logs_dir="$support_dir/logs"
agent="$HOME/Library/LaunchAgents/org.beepster.gateway.plist"
mkdir -p "$bin_dir" "$logs_dir" "$(dirname "$agent")"
swiftc -framework Security "$project_dir/mac/BeepsterKeychain.swift" -o "$bin_dir/beepster-keychain"
gateway_token=$(openssl rand -hex 32)
pairing_code=$(jot -r 1 100000 999999)
printf %s "$gateway_token" | "$bin_dir/beepster-keychain" set gateway-token
printf %s "$pairing_code" | "$bin_dir/beepster-keychain" set pairing-code
unset gateway_token
node_path=$(command -v node)
sed -e "s|__NODE__|$node_path|g" -e "s|__PROJECT__|$project_dir|g" -e "s|__SUPPORT__|$support_dir|g" "$project_dir/mac/com.beepster.gateway.plist.template" > "$agent"
chmod 600 "$agent"
launchctl bootout "gui/$(id -u)/org.beepster.gateway" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$agent"
unset pairing_code
echo "Companion installed. Run scripts/show-pairing-code.sh when ready to pair."
echo "Add a dedicated Beeper token with scripts/set-beeper-token.sh"
