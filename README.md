# Beepster

Use **Organik Apps Pebble Connector** for the coordinated Mac release: one free MIT app for
Notesy, Beepster, Reminderz and Pome. [Setup and migration](docs/UNIFIED_CONNECTOR.md).
Existing Beepster watch pairing is retained. Standalone connector details below describe the older
implementation and remain useful for source builds or rollback.

![Beepster](assets/store/beepster-header-1000x320.png)

Beepster is a readable, reliable, open-source Beeper client for Pebble Time 2. It brings recent
chats, complete message text, voice dictation, saved replies, themes, bitmap emoji, and inline
photo previews to the watch without putting a Beeper credential on the watch or phone.

Beepster supports touch navigation and configurable physical-button replies; tapping a chat message only focuses it. Download the watch app and signed, notarized Mac
Connector using the [installation guide](https://geezuschrotch.github.io/beepster/INSTALL).
Feedback is welcome: [share your experience or report a problem](https://github.com/GeezusChrotch/beepster/issues/new/choose).

## What you need

- A Pebble Time 2 (`emery`) paired with the Pebble mobile app
- A Mac that can remain online with Beeper Desktop running
- Tailscale on the Mac and phone, signed into the same private tailnet
- A dedicated Beeper Desktop API access token

No iMessage bridge such as `imsg` is required. Beeper Desktop supplies the supported messaging
networks; iMessage itself requires Beeper Desktop to run on macOS. The release Connector bundles
its gateway runtime, so end users do not need Terminal, Git, Node.js, or developer tools.
The Connector window can be closed after setup; its login background service continues running.

## Start here

- [Install Beepster](docs/INSTALL.md) — complete Mac, Tailscale, watch, and pairing walkthrough
- [Feedback and first-run checks](docs/FEEDBACK.md) — help improve Beepster safely
- [0.17.0 release notes](docs/RELEASE_NOTES_0.17.0.md) — smooth scrolling, refresh fixes, new shortcuts and known limitations
- [Hermes and OpenClaw setup](docs/AGENT_APPROVALS.md) — optional integrations and compatibility
- [Use Beepster](docs/USER_GUIDE.md) — controls, replies, themes, media, and limitations
- [Troubleshoot](docs/TROUBLESHOOTING.md) — symptom-based fixes and the private health checker
- [Privacy](PRIVACY.md) and [security model](SECURITY.md)
- [Contribute](CONTRIBUTING.md)

## Current capabilities

- Cursor-paginated access to the complete selected Beeper inboxes through a 30-chat rolling watch
  window, with persistent pinning, contact and sender-name normalization, and service icons
- Automatic linking of split Apple email/phone chats matched to one Mac Contacts record, with a
  user-controlled alias fallback
- Persistent service filtering, with all networks enabled by default
- Chronological history that opens on the newest message and pages up to 60 messages
- In-thread message text with continuous finger-following scrolling and fixed one-line button scrolling
- Phone-configurable press/hold actions and Double Back in both inbox and chat views
- Confirmed conversation archiving and per-user message deletion as configurable button actions
  (iMessage message deletion is temporarily disabled; iMessage conversation archiving still works)
- Voice dictation with confirmation and delivery tracking
- Up to eight text-or-emoji quick replies, followed by 15 user-chosen, reorderable bitmap emoji
- Static photo, GIF-poster, and video-poster previews, including Instagram media
- HTML cleanup for rich Instagram messages
- Six presets and saved custom themes using five font families and five sizes
- Twemoji bitmap rendering in chats, including multi-codepoint families, flags, and skin tones
- Explicit setup, loading, empty, timeout, offline, and retry states
- Self-contained, Keychain-backed Mac Connector with one-pass setup, combined phone pairing,
  end-to-end readiness checks, advanced repair controls, and idempotent reply transport
- Optional Hermes and OpenClaw approval controls in explicitly linked Telegram conversations,
  with request descriptions, highlighted choices and deliberate hold-center activation.
  Always approve is shown only when supported and requires additional confirmation.

Animated GIF playback and multiple attachments per message remain planned. See the
[roadmap](ROADMAP.md) and [UX requirements](docs/UX_REQUIREMENTS.md).

## Architecture

```text
Pebble watch (C)
    ⇅ AppMessage
PebbleKit JS on phone
    ⇅ private HTTPS with a narrow Beepster gateway credential
Beepster gateway on Mac
    ⇅ localhost with separate, Mac-only credentials
Beeper Desktop API          OpenClaw Gateway (optional approvals only)
```

The Mac gateway resolves contacts, sanitizes rich text, resizes media, tracks delivery, caches safe
fallbacks, and keeps the Beeper token in the macOS Keychain. The phone is a transport adapter; the
watch owns presentation and interaction state. See [Architecture](docs/ARCHITECTURE.md).

## Development

Requirements: macOS, Pebble SDK 4.33.1 or newer, Pebble Tool 5, and Node.js 20 or newer.

```sh
npm --prefix gateway ci
npm test
npm run build
npm run check
```

`npm run check` runs JavaScript syntax checks, the gateway/transport test suite, a credential scan, and a
complete Emery build. Personal builds are ignored by Git because they contain a private settings
URL. Release packaging instructions are in [Publishing](docs/PUBLISHING.md).

## Independence and license

Beepster is an independent community project. It is not affiliated with, endorsed by, or sponsored
by Beeper, Automattic, Pebble, or Core Devices. Beeper and Pebble are trademarks of their respective
owners and are used only to describe compatibility.

The complete watch, phone, gateway, setup page, and artwork source is available under the MIT
license. Bundled fonts retain their SIL Open Font License texts in `resources/fonts/licenses`.

## Thank you

Thank you to ChatGPT and Codex, especially ChatGPT 5.6 Sol and ChatGPT 6 Astra, and to the people at OpenAI who build these tools, for allowing a nerd with an idea to make cool stuff.

We also thank the developers and communities behind the apps, libraries, fonts and tools we build
on. [Full acknowledgments](ACKNOWLEDGMENTS.md).

## Consistent phone settings

The Pome-style tabbed settings and theme editor are described in [Phone settings](docs/SETTINGS.md).

## Touch menu selection

On a touch-capable watch, tap a different menu item to highlight it and read its scrolling title. Tap the highlighted item again to open or activate it; there is no need to tap quickly. Physical Select still activates the highlighted item.
Approval and denial controls ignore taps, including when highlighted. Use the physical buttons for those decisions.
