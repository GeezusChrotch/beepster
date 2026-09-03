#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
support_dir="$HOME/Library/Application Support/Beepster"
bin_dir="$support_dir/bin"
app="$bin_dir/Beepster Contacts.app"
helper="$app/Contents/MacOS/beepster-contacts"
mkdir -p "$app/Contents/MacOS"
cp "$project_dir/mac/BeepsterContacts-Info.plist" "$app/Contents/Info.plist"

swiftc -target "$(uname -m)-apple-macosx13.0" -framework Contacts \
  "$project_dir/mac/BeepsterContacts.swift" -o "$helper"
codesign --force --deep --sign - --identifier org.beepster.contacts "$app" >/dev/null 2>&1

printf 'Beepster needs read-only Contacts access to replace Apple message email addresses and phone numbers with names.\n'
open -W "$app" >/dev/null 2>&1 || true
if [ "$("$helper" --status 2>/dev/null || true)" = authorized ]; then
  echo 'Contacts access granted.'
else
  echo 'Contacts access was not granted. Beepster will continue using Beeper-provided labels.' >&2
  echo 'You can enable it later in System Settings > Privacy & Security > Contacts.' >&2
fi
