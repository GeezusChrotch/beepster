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

if have node; then
  node_major=$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || printf 0)
  [ "$node_major" -ge 20 ] && pass "Node.js $(node --version)" || fail 'Node.js 20 or newer is required'
else
  fail 'Node.js is not installed'
fi

have swiftc && pass 'Swift compiler available' || fail 'Install Xcode Command Line Tools: xcode-select --install'
have openssl && pass 'OpenSSL available' || fail 'OpenSSL is required to create the gateway credential'
[ -x "$support_dir/bin/beepster-keychain" ] && pass 'Keychain helper installed' || fail 'Run scripts/install-companion.sh'
contacts_helper="$support_dir/bin/Beepster Contacts.app/Contents/MacOS/beepster-contacts"
[ -x "$contacts_helper" ] && pass 'Contacts helper installed' || warn 'Run scripts/install-contact-helper.sh to show Apple contact names'
if [ -x "$contacts_helper" ]; then
  contacts_status=$("$contacts_helper" --status 2>/dev/null || true)
  [ "$contacts_status" = authorized ] && pass 'Read-only Contacts access granted' || warn 'Grant Beepster Contacts access to show Apple contact names'
fi
[ -f "$agent" ] && pass 'LaunchAgent installed' || fail 'Run scripts/install-companion.sh'

if launchctl print "gui/$(id -u)/org.beepster.gateway" >/dev/null 2>&1; then
  pass 'Companion LaunchAgent loaded'
else
  fail 'Companion is not running; reinstall it or run launchctl kickstart -k gui/$(id -u)/org.beepster.gateway'
fi

health=$(curl -fsS --max-time 4 http://127.0.0.1:8794/health 2>/dev/null || true)
case "$health" in
  *'"ok":true'*'"beeperConfigured":true'*) pass 'Local gateway healthy and Beeper token configured' ;;
  *'"ok":true'*) fail 'Gateway is running but its Beeper token is missing; run scripts/set-beeper-token.sh' ;;
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
    *) fail 'Run: tailscale serve --bg 8794' ;;
  esac
else
  fail 'Tailscale is not installed or not on PATH'
fi

if [ "$failures" -eq 0 ]; then
  printf '\nBeepster is ready to pair. Run scripts/show-pairing-code.sh.\n'
else
  printf '\n%d check(s) need attention. No credentials were displayed.\n' "$failures"
fi
exit "$failures"
