#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
support_dir="$HOME/Library/Application Support/Beepster"
bin_dir="$support_dir/bin"
app="$bin_dir/Beepster Contacts.app"
helper="$app/Contents/MacOS/beepster-contacts"
mkdir -p "$app/Contents/MacOS"
cp "$project_dir/mac/BeepsterContacts-Info.plist" "$app/Contents/Info.plist"

swiftc -target "$(uname -m)-apple-macosx13.0" -framework AppKit -framework Contacts \
  "$project_dir/mac/BeepsterContacts.swift" -o "$helper"
codesign --force --deep --options runtime --entitlements "$project_dir/mac/BeepsterContacts.entitlements" \
  --sign - --identifier org.beepster.contacts "$app" >/dev/null 2>&1

printf 'Beepster needs read-only Contacts access to replace Apple message email addresses and phone numbers with names.\n'
open -W "$app" >/dev/null 2>&1 || true
status_file=$(mktemp -t beepster-contacts-status)
open -n "$app" --args --status-file "$status_file" >/dev/null 2>&1 || true
status_attempt=1
while [ "$status_attempt" -le 100 ] && [ ! -s "$status_file" ]; do
  sleep 0.05
  status_attempt=$((status_attempt + 1))
done
contacts_status=$(sed -n '1p' "$status_file" 2>/dev/null || true)
rm -f "$status_file"
if [ "$contacts_status" = authorized ]; then
  echo 'Contacts access granted.'
else
  echo 'Contacts access was not granted. Beepster will continue using Beeper-provided labels.' >&2
  echo 'You can enable it later in System Settings > Privacy & Security > Contacts.' >&2
fi
