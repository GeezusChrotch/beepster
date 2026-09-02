#!/bin/sh
set -eu
helper="$HOME/Library/Application Support/Beepster/bin/beepster-keychain"
if [ ! -x "$helper" ]; then echo "Beepster companion is not installed" >&2; exit 1; fi
exec "$helper" get pairing-code
