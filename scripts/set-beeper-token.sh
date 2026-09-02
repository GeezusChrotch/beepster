#!/bin/sh
set -eu

helper="$HOME/Library/Application Support/Beepster/bin/beepster-keychain"
if [ ! -x "$helper" ]; then echo "Install the Beepster companion first" >&2; exit 1; fi
restore_echo() { stty echo 2>/dev/null || true; }
trap restore_echo EXIT INT TERM
printf "Paste the dedicated Beeper Desktop API token (input hidden): " >&2
stty -echo
IFS= read -r beeper_token
stty echo
printf '\n' >&2
if [ -z "$beeper_token" ]; then echo "No token supplied" >&2; exit 1; fi
printf %s "$beeper_token" | "$helper" set beeper-access-token
unset beeper_token
launchctl kickstart -k "gui/$(id -u)/org.beepster.gateway"
echo "Token stored in Keychain and companion restarted."
