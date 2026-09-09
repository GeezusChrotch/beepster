# Beepster 0.21.0 — Safer dictation and stable conversation position

## What changed

- Fixed status labels retaining temporary phone-message buffers. Labels now own
  their text, so later redraws cannot read an expired error/status string.
- Dictation ignores duplicate starts and attempts during an in-flight reply,
  handles start failures, and copies the transcript before returning to the SDK.
  Sending begins on a later event-loop turn. A transcript cannot be sent to a
  different conversation if navigation changes the active recipient.
- Conversation refresh/read traffic pauses while dictating. Diagnostic logs
  include result codes and free memory, not transcript text.
- Background/unread-badge refreshes retain the selected conversation and its
  on-screen position, even when rows reorder or unread labels change height.
- Unread-count changes are correctly detected. With the updated gateway, showing
  the newest conversation messages marks read through the last real message
  delivered to that view. Older-history fetches and agent approval cards do not
  themselves mark a chat read; newer arrivals are not blindly marked read.

This is cumulative: 0.20.0 bitmap reactions, full-width photos, short GIF loops,
YouTube thumbnails, themes and configurable buttons remain included.

## Compatibility and installation

The watch-side dictation and list-position fixes work with released
[Organik Apps Pebble Connector 0.8.7](https://github.com/GeezusChrotch/organik-pebble-connector/releases/tag/v0.8.7)
or a compatible newer Connector. Install the versioned PBW through the Pebble phone
app, or update from the watch-app listing once its matching version is available.
Pairing, themes, saved replies and button settings are retained.

**Automatic mark-as-read requires an updated gateway.** Public Connector 0.8.7
does not include the new `/v1/chats/:id/read` route. Its normal messaging remains
usable, but do not expect this new read-sync feature from that release. The source
gateway in this release includes the route for self-hosted installations. The
forthcoming Mac App Store Connector is not yet a publicly available dependency;
do not download an unrelated or unpublished test build to obtain this feature.

Requires Pebble Time 2, Beeper Desktop, a running Mac gateway and private Tailscale
on the Mac and paired phone. Cellular is supported for normal use with Tailscale;
the LAN developer-install route instead requires local network connectivity.
See the [installation guide](https://geezuschrotch.github.io/beepster/INSTALL).

## Validation and known limits

The pre-release candidate passed 238 JavaScript tests, five Hermes integration
tests, and a watch build. Extracted C tests under address/undefined-behavior
sanitizers cover copied status/transcript lifetimes, duplicate callbacks, cancelled
and failed dictation, recipient changes, read boundaries and list-position anchors.

Final release checks passed 239 JavaScript tests and five Hermes tests. The added
older-gateway 404 test confirms no watch error, automatic retry timer, or incorrect
unread-count clearing. Compared with the installed candidate, phone JavaScript,
watch resources, and executable code/data are identical; only version/build metadata
and packaging changed. Development source maps are excluded from the public PBW.

That candidate installed successfully. The owner confirmed read status working,
then successful dictation on the cumulative safety build, and reported Beepster
was good. Intermittent crash resolution remains provisional: a successful attempt
does not prove the crash can never recur. This version-restamped public package
has not been separately installed or exhaustively hardware-tested.

GIFs remain short sampled previews with low-memory still fallback, not video
playback. iMessage message deletion remains disabled; conversation archiving works.
Hermes/OpenClaw integrations remain optional and require separate compatible agent
setup; experimental Store transport source is not a claim of validated fresh-Mac
onboarding or a currently available Mac App Store release.

Read receipts may propagate according to Beeper and the messaging service's
settings. See [Privacy](../PRIVACY.md).

[Feedback is welcome](https://github.com/GeezusChrotch/beepster/issues/new/choose).
For a crash, include the approximate time, action, theme and app/Connector versions.
Remove private messages, contact information, credentials and network addresses.
