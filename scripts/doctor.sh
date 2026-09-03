#!/bin/sh
set -u

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
support_dir="$HOME/Library/Application Support/Beepster"
agent="$HOME/Library/LaunchAgents/org.beepster.gateway.plist"
failures=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }
warn() { printf 'WARN  %s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

[ "$(uname -s)" = Darwin ] && pass 'macOS host' || fail 'macOS is required for the companion'

if [ -x "$support_dir/bin/node" ]; then
  bundled_node_version=$("$support_dir/bin/node" --version 2>/dev/null || printf unknown)
  pass "Bundled gateway runtime $bundled_node_version"
elif have node; then
  node_major=$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || printf 0)
  [ "$node_major" -ge 20 ] && pass "Source gateway runtime $(node --version)" || fail 'Install the Connector DMG or Node.js 20 or newer'
else
  fail 'Bundled gateway runtime is missing; select Install or Repair in Beepster Connector'
fi

have swiftc && pass 'Swift compiler available for source development' || warn 'Swift compiler is not needed by the release Connector'
have openssl && pass 'OpenSSL available for source development' || warn 'OpenSSL is not needed by the release Connector'
[ -x "$support_dir/bin/beepster-keychain" ] && pass 'Keychain helper installed' || fail 'Run scripts/install-companion.sh'
if [ -x "/Applications/Beepster Connector.app/Contents/MacOS/beepster-connector" ] ||
   [ -x "$HOME/Applications/Beepster Connector.app/Contents/MacOS/beepster-connector" ]; then
  pass 'Beepster Connector app installed'
else
  warn 'Install Beepster Connector from the release DMG'
fi
contacts_helper="$support_dir/bin/Beepster Contacts.app/Contents/MacOS/beepster-contacts"
[ -x "$contacts_helper" ] && pass 'Contacts helper installed' || warn 'Run scripts/install-contact-helper.sh to show Apple contact names'
if [ -x "$contacts_helper" ]; then
  contacts_status_file=$(mktemp -t beepster-contacts-status)
  open -W -n "$support_dir/bin/Beepster Contacts.app" --args --status-file "$contacts_status_file" >/dev/null 2>&1 || true
  contacts_status=$(sed -n '1p' "$contacts_status_file" 2>/dev/null || true)
  rm -f "$contacts_status_file"
  [ "$contacts_status" = authorized ] && pass 'Read-only Contacts access granted' || warn 'Grant Beepster Contacts access to show Apple contact names'
fi
[ -f "$agent" ] && pass 'LaunchAgent installed' || fail 'Select Install or Repair in Beepster Connector'

if launchctl print "gui/$(id -u)/org.beepster.gateway" >/dev/null 2>&1; then
  pass 'Companion LaunchAgent loaded'
else
  fail 'Companion is not running; select Install or Repair in Beepster Connector'
fi

health=''
health_attempt=1
while [ "$health_attempt" -le 5 ]; do
  health=$(curl -fsS --max-time 4 http://127.0.0.1:8794/health 2>/dev/null || true)
  [ -n "$health" ] && break
  sleep 1
  health_attempt=$((health_attempt + 1))
done
case "$health" in
  *'"ok":true'*'"beeperConfigured":true'*) pass 'Local gateway healthy and Beeper token configured' ;;
  *'"ok":true'*) fail 'Gateway is running but its Beeper token is missing; select Set Beeper Token in the Connector' ;;
  *) fail 'Local gateway health check failed on 127.0.0.1:8794' ;;
esac

tailscale_bin=$(command -v tailscale 2>/dev/null || true)
if [ -z "$tailscale_bin" ] && [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]; then
  tailscale_bin=/Applications/Tailscale.app/Contents/MacOS/Tailscale
fi
if [ -n "$tailscale_bin" ]; then
  "$tailscale_bin" status >/dev/null 2>&1 && pass 'Tailscale connected' || fail 'Open Tailscale and connect this Mac'
  serve_status=$("$tailscale_bin" serve status 2>/dev/null || true)
  case "$serve_status" in
    *'127.0.0.1:8794'*|*'localhost:8794'*) pass 'Tailscale Serve forwards the Beepster gateway' ;;
    *) fail 'Select Start Private Route in Beepster Connector' ;;
  esac
else
  fail 'Tailscale is not installed or not on PATH'
fi

if [ "$failures" -eq 0 ]; then
  printf '\nBeepster is ready to pair. Use Show Pairing Code in the Connector.\n'
else
  printf '\n%d check(s) need attention. No credentials were displayed.\n' "$failures"
fi
exit "$failures"
