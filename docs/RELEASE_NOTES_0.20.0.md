# Beepster 0.20.0 — Reactions and full-width media

- Reactions supplied by Beeper appear beneath their message, grouped by sender
  with bitmap emojis and a matching sender stripe, including Apple Messages.
- Photos, GIFs and video thumbnails fill the available chat width without changing
  their proportions. Larger images scroll with the message. Smaller-buffer retries
  fix large-photo failures on memory-constrained watches.
- Supported GIF files play short, reduced-detail loops. This update fixes missing
  GIF metadata detection, interrupted previews and animation scheduling. Neighboring
  text no longer cancels the selected photo or GIF.
- YouTube links can show a thumbnail. Expired Beeper thumbnail files fall back to
  the same video's constrained public thumbnail. No video playback is included.
- Media-only messages no longer show a misleading no-text error. Tap a failed
  preview to retry. Apple Messages permission failures explain how to enable access.

## Update both components

Install [Organik Apps Pebble Connector 0.9.0 or newer](https://github.com/GeezusChrotch/organik-pebble-connector/releases/latest)
first. Choose **Beepster → Set up service** to refresh the managed gateway, then
reopen Beepster's phone settings. Install this release's PBW using the Pebble phone
app, or update through the watch-app listing when its matching version is available.
Pairing, themes, button assignments and saved replies are retained.

For protected Apple Messages photos/GIFs, use the Connector's optional **Allow
attachment access** step. Enable the highlighted background component in macOS
Full Disk Access, then **Restart and recheck**. The attachment readiness light checks
the actual gateway process. This cannot be enabled automatically by the Connector.

See the [installation guide](https://geezuschrotch.github.io/beepster/INSTALL).
Requires Pebble Time 2, macOS 14 or newer, Beeper Desktop and private Tailscale on
the Mac and paired phone. iPhone is the tested setup. Keep the Mac awake and Beeper
Desktop, Tailscale and the background gateway running; the Connector window may close.

## Privacy and limits

GIF conversion and photo resizing happen locally. When a YouTube thumbnail is not
available locally, the Mac requests it from `i.ytimg.com`; that service sees the video
ID and Mac public IP, not Beeper credentials or message contents. **Hide links**
disables these link cards. See [Privacy](../PRIVACY.md).

GIFs are previews, not full video: up to six sampled frames, approximately four
frames per second, normally covering the first 1.5 seconds. Unsupported or large
GIFs and video-based GIFs use a still/poster. Low watch memory can reduce resolution
or frame count, or fall back to a still. Only one attachment per message is supported.
Reactions depend on Beeper metadata; overflow is indicated rather than silently lost.
iMessage message deletion remains disabled; conversation archiving still works.
Agent approvals remain optional and physical-button-only. Inbox batches remain bounded.

## Validation status

The cumulative code passed 220 automated tests, including native C sanitizer tests
for packet bounds, animation, low-memory fallback, and full-width layout across
font sizes. Emulator screenshots reproduced the prior large-photo failure and
verified its correction, bottom scrolling, and distinct GIF frames. Actual previews
were also verified through the running Mac gateway after user-granted media access.

The pre-release full-width build installed successfully on the owner's watch, but
the final photo/GIF behavior has not been explicitly confirmed on physical hardware.
Earlier failed media candidates are superseded. Reactions received positive owner
feedback. This release is version-restamped and packaged separately; successful
installation is not a claim of complete hardware validation.

[Feedback and bug reports are welcome](https://github.com/GeezusChrotch/beepster/issues/new/choose).
Include app/Connector versions, theme and reproduction steps. Remove private messages,
contacts, credentials and network addresses from screenshots and logs.
