# Contributing

Bug reports and pull requests are welcome. Before submitting a change:

1. Keep credentials and personal message/contact data out of commits, fixtures, screenshots, and logs.
2. Preserve explicit loading, empty, offline, and failure states.
3. Add or update tests for gateway behavior.
4. Run `npm run check`.

For watch UI changes, verify the Emery emulator at 200×228 and describe any physical-watch testing
separately. Add a transport regression test when changing queueing, reply, pagination, theme, or
media behavior. Do not use real messages or contact data in fixtures or screenshots.

Accessibility and delivery correctness take priority over decorative density. A reply must not be
shown as sent until Beeper has accepted it, and a failed reply must remain recoverable.

See [Performance notes](docs/PERFORMANCE.md) before removing fonts, lowering message limits, or
changing preview transport; performance work must retain documented functionality.

For prerelease watch testing, build a personal PBW whose settings page points to your private
gateway, transfer it to the phone, and open it with the Pebble mobile app:

```sh
./scripts/build-personal.sh 'https://your-private-mac.ts.net/configure'
```

This developer-only flow requires the source toolchain. End users install the published watch app
from the Pebble Store and use the self-contained Connector DMG without Terminal.
