# Beepster 0.16.0 — Two-step touch and consistent settings

- Tap a different row to highlight it and read its scrolling title. Tap the
  highlighted row again to activate; no quick double-tap is required.
- Activate an ordinary message to dictate a reply, then review the confirmation.
- Swipe to scroll. Existing physical buttons and custom bindings remain available.
- Hermes/OpenClaw requests and approval choices ignore taps, including when
  highlighted. Use physical buttons for decisions; Always still needs confirmation.
- Phone settings now share Setup, Themes, Shortcuts and Replies tabs, with color
  palette, preview and saved-theme controls. Pairing and existing settings are retained.

## Update and setup

Install Beepster 0.16.0 and [Organik Apps Pebble Connector 0.5.0 or newer](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest).
Enable touch on supported firmware under Settings → Display → Touch, and wake
the watch before tapping. See the [settings guide](https://github.com/GeezusChrotch/beepster/blob/main/docs/SETTINGS.md)
and [agent guide](https://github.com/GeezusChrotch/beepster/blob/main/docs/AGENT_APPROVALS.md).

Hermes and OpenClaw are optional and require explicit session/chat links. OpenClaw
change-card text compatibility is guarded for version 2026.9.1; unsupported
versions fail closed. Sent means delivery, not proof the agent applied a change.

## Validation and limitations

The installed two-step candidate was accepted by the owner before release. This
release preserves its watch code; the version-stamped rebuild changes version
metadata and package checksum. It is not a separate full hardware regression run.
Source tests, the watch build and public-package privacy checks are run separately.

Requires Pebble Time 2, a Mac running Beeper Desktop, and private Tailscale access.
iPhone is the tested phone setup. Static attachment previews only; iMessage
message deletion remains disabled, while conversation archiving remains available.

[Feedback and bug reports are welcome](https://github.com/GeezusChrotch/beepster/issues).
Include versions and reproduction steps, but remove private messages, contact
details, credentials and private network addresses before sharing logs/screenshots.
