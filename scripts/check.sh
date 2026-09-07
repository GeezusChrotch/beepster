#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

node --check "$project_dir/src/pkjs/index.js"
node --check "$project_dir/gateway/src/beeper-client.js"
node --check "$project_dir/gateway/src/contact-resolver.js"
node --check "$project_dir/gateway/src/emoji.js"
node --check "$project_dir/gateway/src/emoji-assets.js"
node --check "$project_dir/gateway/src/image-preview.js"
node --check "$project_dir/gateway/src/pebble-image.cjs"
node --check "$project_dir/gateway/src/html-to-text.js"
node --check "$project_dir/gateway/src/openclaw-client.js"
node --check "$project_dir/gateway/src/openclaw-telegram.js"
node --check "$project_dir/gateway/src/openclaw-telegram-compat.js"
node --check "$project_dir/gateway/src/openclaw-device-auth.js"
node --check "$project_dir/gateway/src/agent-approvals.js"
node --check "$project_dir/gateway/src/agent-settings.js"
node --check "$project_dir/gateway/src/agent-setup.js"
node --check "$project_dir/gateway/src/hermes-client.js"
python3 "$project_dir/gateway/test/hermes-bridge_test.py"
node --check "$project_dir/gateway/src/server.js"
node --check "$project_dir/scripts/build-emoji-assets.mjs"
node --check "$project_dir/scripts/build-watch-emoji-defaults.mjs"
if [ "$(uname -s)" = Darwin ]; then
  swiftc -target "$(uname -m)-apple-macosx13.0" -framework AppKit -framework Security -typecheck "$project_dir/mac/BeepsterConnector.swift"
  plutil -lint "$project_dir/mac/BeepsterConnector-Info.plist" "$project_dir/mac/BeepsterContacts-Info.plist" >/dev/null
fi
npm --prefix "$project_dir/gateway" test

if rg -n --hidden \
  -g '!build/**' -g '!gateway/node_modules/**' -g '!.git/**' -g '!.env.example' \
  '(BEEPER_ACCESS_TOKEN|BEEPSTER_GATEWAY_TOKEN)=[A-Za-z0-9_-]{16,}|Authorization: Bearer [A-Za-z0-9_-]{16,}' \
  "$project_dir"; then
  echo "Potential credential committed to source" >&2
  exit 1
fi

pebble build

test -f "$project_dir/build/beepster.pbw"
echo "Beepster checks passed"
