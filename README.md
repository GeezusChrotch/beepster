# Beepster

Beepster is a readable, reliable, open-source Beeper client for Pebble watches.

The first target is Pebble Time 2 (`emery`) at its native 200×228 resolution. Beepster does not
reuse PebBeep source code. It connects to Beeper through the official local Desktop API and keeps
the Beeper access token on the Mac gateway.

## Project principles

- Never show a blank screen: every network view has loading, empty, cached, and error states.
- Prefer a real contact name, with an honest handle fallback when no name is available.
- Use native-resolution, high-contrast text that follows Pebble's accessibility conventions.
- Never claim a reply was sent merely because it entered a queue.
- Keep Beeper credentials off the watch, phone-side JavaScript, source tree, and relay URL.
- Publish the complete watch, phone, and gateway source under the MIT license.

## Current status

Version 0.1 is the clean-room foundation:

- Native Emery watch build
- Explicit setup/loading/empty/error states
- Recent-chat and message-history protocol
- Private Mac gateway using the official Beeper Desktop API
- Contact-name normalization from participant data and Beeper's per-account contact list
- Semantic Classic, Dark, Ocean, and Contrast themes
- Pebble-native emoji preservation with safe fallbacks for unsupported emoji
- Keychain-backed macOS LaunchAgent companion with private HTTPS pairing
- Phone settings for theme, text size, and refresh interval
- Automated gateway tests and source checks

Reliable voice and canned replies are deliberately scheduled after the inbox path is stable. See
[ROADMAP.md](ROADMAP.md) and [docs/UX_REQUIREMENTS.md](docs/UX_REQUIREMENTS.md).

## Development

Requirements: Pebble SDK 4.33.1 or newer, Pebble Tool 5, and Node.js 20 or newer.

```sh
npm test
npm run build
npm run check
```

The gateway setup is described in [gateway/README.md](gateway/README.md). Do not put a Beeper token
in this repository or in the Pebble application bundle. Personal builds are ignored by Git because
they contain the user's private settings URL.

## Relationship to Beeper and Pebble

Beepster is an independent community project. It is not affiliated with, endorsed by, or sponsored
by Beeper, Automattic, Pebble, or Core Devices. Beeper and Pebble are trademarks of their respective
owners and are used only to describe compatibility.

## License

MIT. See [LICENSE](LICENSE).
