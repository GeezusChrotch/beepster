# Beepster 0.19.0 — Larger icons and clearer sender indicators

- Sender stripes are twice as wide: 6 pixels instead of 3, with message text width unchanged.
- Service icons are approximately 30% larger: 18 pixels instead of 14. Names have
  additional space beside the icons so they do not overlap.
- Chat emoji increase from 18 to 24 pixels; emoji replies increase from 20 to 26.
  Inline line heights and wrapping accommodate the larger artwork across themes.
- Bundled fallback emoji and downloaded emoji use matching sizes. Existing pairing,
  themes, custom buttons and saved replies are retained.

## Updating

Install [Organik Apps Pebble Connector 0.8.2 or newer](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest),
choose **Beepster → Set up service**, then reopen Beepster's phone settings. The
managed gateway must be refreshed as well as the Mac app to deliver 26-pixel emoji
replies. Install Beepster 0.19.0 from its watch-app listing or this release's PBW.

See the [installation guide](https://geezuschrotch.github.io/beepster/INSTALL).
Requires Pebble Time 2, macOS 14 or newer, Beeper Desktop and private Tailscale on
the Mac and paired phone. iPhone is the tested setup. Keep the Mac awake and Beeper
Desktop and the background gateway running.

## Validation and known limits

The owner installed and positively confirmed the pre-release candidate containing
these visual changes. This release is a version-restamped package, not another
physical-watch installation. Automated tests check larger atlas budgets, request
sizes, text/icon spacing and inline clipping across font heights; release build
and package privacy checks are separate gates.

All 0.18.0 limitations remain: bounded 12-conversation batches with brief transfer
pauses, static GIF previews, lighting-dependent display colors, and disabled
iMessage message deletion. Agent approvals remain optional and physical-button-only.

[Feedback and bug reports are welcome](https://github.com/GeezusChrotch/beepster/issues/new/choose).
Include versions, theme and reproduction steps; remove private messages, contacts,
credentials and network addresses before sharing screenshots or logs.
